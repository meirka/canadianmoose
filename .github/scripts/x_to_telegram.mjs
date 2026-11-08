// Zero-dependency Node 20+ notifier for X -> Telegram via a local Nitter RSS feed.
// The first run records the newest post without publishing old history.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const USERNAME = process.env.X_USERNAME;
const NITTER_RSS = process.env.NITTER_RSS;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const STATE_DIR = ".github/state";
const STATE_FILE = path.join(STATE_DIR, "last_tweet_id.txt");
const MAX_RSS_BYTES = 2 * 1024 * 1024;

function ensureStateDir() {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

function readLastId() {
    return fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, "utf8").trim() : "";
}

function writeLastId(id) {
    ensureStateDir();
    fs.writeFileSync(STATE_FILE, id, "utf8");
}

async function sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(fn, attempts = 3, delayMs = 500) {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < attempts - 1) await sleep(delayMs * (attempt + 1));
        }
    }
    throw lastError;
}

async function readTextWithLimit(response, maxBytes) {
    const contentLength = Number.parseInt(response.headers.get("content-length") || "", 10);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new Error(`RSS response is too large: ${contentLength} bytes`);
    }
    if (!response.body) return "";

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytesRead = 0;
    let text = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        if (bytesRead > maxBytes) {
            await reader.cancel();
            throw new Error(`RSS response exceeds ${maxBytes} bytes`);
        }
        text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
}

async function fetchText(url, timeoutMs = 15_000) {
    return retry(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                headers: { "User-Agent": "x-tg-actions/1.0" },
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Fetch failed ${response.status}`);
            return await readTextWithLimit(response, MAX_RSS_BYTES);
        } finally {
            clearTimeout(timeout);
        }
    });
}

function decodeXml(value) {
    return String(value)
        .replace(/^<!\[CDATA\[|]]>$/g, "")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&lt;', "<")
        .replaceAll('&gt;', ">")
        .replaceAll('&amp;', "&");
}

function escapeTelegramHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function getRawTag(tag, xml) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (!match) return "";
    return match[1].trim().replace(/^<!\[CDATA\[|]]>$/g, "");
}

function getTag(tag, xml) {
    return decodeXml(getRawTag(tag, xml));
}

const TELEGRAM_TAGS = new Map([
    ["a", "a"],
    ["b", "b"],
    ["strong", "b"],
    ["i", "i"],
    ["em", "i"],
    ["u", "u"],
    ["ins", "u"],
    ["s", "s"],
    ["strike", "s"],
    ["del", "s"],
    ["code", "code"],
    ["pre", "pre"],
    ["blockquote", "blockquote"],
]);
const HTML_TOKENS = /<[^>]*>|[^<]+/g;
const TELEGRAM_HTML_TOKENS = /<[^>]+>|&(?:amp|lt|gt|quot);|[\s\S]/gu;

function normalizeLink(value) {
    try {
        const url = new URL(decodeXml(value).trim());
        if (!["http:", "https:"].includes(url.protocol)) return "";
        if (["127.0.0.1", "localhost"].includes(url.hostname)) {
            return `https://x.com${url.pathname}${url.search}${url.hash}`;
        }
        return url.href;
    } catch {
        return "";
    }
}

function parseHtmlTag(token) {
    const match = token.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
    if (!match) return null;
    const source = match[2].toLowerCase();
    return {
        closing: Boolean(match[1]),
        source,
        telegram: TELEGRAM_TAGS.get(source),
    };
}

export function nitterDescriptionToTelegramHtml(description) {
    const tweetHtml = String(description)
        .match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]
        ?.replace(/<br\s*\/?>\r?\n/gi, "<br>");
    if (!tweetHtml) return "";

    const stack = [];
    let result = "";
    for (const token of tweetHtml.match(HTML_TOKENS) || []) {
        if (!token.startsWith("<")) {
            result += escapeTelegramHtml(decodeXml(token));
            continue;
        }

        const tag = parseHtmlTag(token);
        if (!tag) continue;
        if (tag.source === "br" && !tag.closing) {
            result += "\n";
            continue;
        }
        if (!tag.telegram) continue;
        if (tag.closing) {
            if (stack.at(-1) === tag.telegram) {
                result += `</${stack.pop()}>`;
            }
            continue;
        }

        if (tag.telegram === "a") {
            const hrefMatch = token.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const href = normalizeLink(hrefMatch?.[1] ?? hrefMatch?.[2] ?? "");
            if (!href) continue;
            result += `<a href="${escapeTelegramHtml(href)}">`;
        } else {
            result += `<${tag.telegram}>`;
        }
        stack.push(tag.telegram);
    }

    return (result + stack.reverse().map((tag) => `</${tag}>`).join("")).trim();
}

function truncateTelegramHtml(html, maxCharacters) {
    const stack = [];
    let characters = 0;
    let result = "";

    for (const token of String(html).match(TELEGRAM_HTML_TOKENS) || []) {
        if (token.startsWith("<")) {
            const tag = parseHtmlTag(token);
            if (tag?.closing) stack.pop();
            else if (tag?.telegram) stack.push(tag.telegram);
            result += token;
            continue;
        }
        const tokenCharacters = token.startsWith("&") ? decodeXml(token).length : token.length;
        if (characters + tokenCharacters > maxCharacters) break;
        result += token;
        characters += tokenCharacters;
    }

    return result + stack.reverse().map((tag) => `</${tag}>`).join("");
}

export function parsePosts(xml) {
    const posts = [];
    for (const match of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
        const item = match[0];
        const link = getTag("link", item);
        const guid = getTag("guid", item);
        const id = /^\d+$/.test(guid) ? guid : link.match(/\/status\/(\d+)/)?.[1];
        if (!id) continue;
        const text = getTag("title", item).trim();
        const html = nitterDescriptionToTelegramHtml(getRawTag("description", item));
        posts.push(html ? { id, text, html } : { id, text });
    }
    return posts;
}

export function isStandalonePost(post) {
    return !/^(?:RT by @|R to @)/i.test(String(post.text || ""));
}

export function getUnseenStandalonePosts(posts, lastId) {
    const lastIndex = posts.findIndex((post) => post.id === lastId);
    if (lastIndex < 0) {
        throw new Error("Last seen post is outside the RSS feed; refusing to skip history");
    }

    const unseen = posts.slice(0, lastIndex).reverse();
    return {
        unseenCount: unseen.length,
        posts: unseen.filter(isStandalonePost),
    };
}

function canonicalPostUrl(id) {
    return `https://x.com/${USERNAME}/status/${id}`;
}

export function buildTelegramMessage(post, postUrl) {
    const suffix = `\n\n${postUrl}`;
    const body = post.html || escapeTelegramHtml(post.text || "");
    const maxBodyCharacters = 4096 - suffix.length;
    const text = truncateTelegramHtml(body, maxBodyCharacters);
    return text ? `${text}${suffix}` : postUrl;
}

async function postToTelegram(post) {
    const postUrl = canonicalPostUrl(post.id);
    const body = new URLSearchParams({
        chat_id: CHAT_ID,
        text: buildTelegramMessage(post, postUrl),
        parse_mode: "HTML",
        link_preview_options: JSON.stringify({ is_disabled: false, url: postUrl }),
    });
    await retry(async () => {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            body,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) {
            throw new Error(`Telegram error ${response.status} ${data?.description || ""}`.trim());
        }
    });
}

async function main() {
    const missing = [
        ["X_USERNAME", USERNAME],
        ["NITTER_RSS", NITTER_RSS],
        ["TELEGRAM_BOT_TOKEN", BOT_TOKEN],
        ["TELEGRAM_CHAT_ID", CHAT_ID],
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);

    const posts = parsePosts(await fetchText(NITTER_RSS));
    if (!posts.length) throw new Error("Nitter RSS returned no posts");

    const lastId = readLastId();
    if (!lastId) {
        writeLastId(posts[0].id);
        console.log(`Initialized at post ${posts[0].id}`);
        return;
    }

    const { unseenCount, posts: standalonePosts } = getUnseenStandalonePosts(posts, lastId);
    for (const post of standalonePosts) {
        await postToTelegram(post);
        writeLastId(post.id);
        console.log(`Sent post ${post.id}`);
    }

    if (unseenCount && !standalonePosts.length) {
        writeLastId(posts[0].id);
        console.log(`Skipped ${unseenCount} replies/reposts`);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error.stack || error.message || String(error));
        process.exitCode = 1;
    });
}
