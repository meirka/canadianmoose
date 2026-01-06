// .github/scripts/youtube_to_telegram.mjs
// Zero-deps, Node 18/20+
// Polls a YouTube Atom feed and posts *new* videos to Telegram.
// First run bootstraps state (no posts of old videos).

import fs from "node:fs";
import path from "node:path";

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const STATE_DIR = ".github/state";
const STATE_FILE = path.join(STATE_DIR, "last_video_id.txt");

// Safety: limit how many backlog items to post in one run
const MAX_POSTS = 1;

// ----- small utilities -----
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

function escapeHtml(s) {
    return String(s).replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
}

async function sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
}

// Retry helper with incremental backoff
async function retry(fn, attempts = 3, delayMs = 500) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            if (i < attempts - 1) await sleep(delayMs * (i + 1));
        }
    }
    throw lastErr;
}

async function fetchText(url, timeoutMs = 15_000) {
    return retry(async () => {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, {
                headers: { "User-Agent": "yt-tg-actions/1.0" },
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
            return await res.text();
        } finally {
            clearTimeout(t);
        }
    });
}

function canonicalVideoUrl(videoId) {
    // Works for Shorts and regular uploads; usually previews reliably.
    return `https://youtu.be/${videoId}`;
}

async function postToTelegram(title, url) {
    const api = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    // In HTML mode, everything that isn't markup must be escaped.
    const text = `<b>${escapeHtml(title || "New video")}</b>\n${escapeHtml(url)}`;

    const body = new URLSearchParams({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        // Deterministic preview control:
        link_preview_options: JSON.stringify({
            is_disabled: false,
            url,
        }),
    });

    await retry(async () => {
        const r = await fetch(api, { method: "POST", body });
        const data = await r.json().catch(() => null);

        if (!r.ok || !data?.ok) {
            throw new Error(`Telegram error ${r.status} ${data?.description || ""}`.trim());
        }
    });
}

// ----- minimal XML helpers (good enough for YouTube Atom) -----
function getEntries(xml) {
    const out = [];
    const re = /<entry\b[\s\S]*?<\/entry>/g;
    let m;
    while ((m = re.exec(xml))) out.push(m[0]);
    return out;
}

function getTag(tag, s) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const m = s.match(re);
    return m ? m[1].trim() : "";
}

function getVideoId(entryXml) {
    const yt = getTag("yt:videoId", entryXml);
    if (yt) return yt;

    const id = getTag("id", entryXml);
    return id ? id.split(":").pop() : "";
}
// --------------------------------------------------------------

async function main() {
    if (!CHANNEL_ID || !BOT_TOKEN || !CHAT_ID) {
        throw new Error("Missing env vars: YOUTUBE_CHANNEL_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID");
    }

    const xml = await fetchText(FEED);
    const entries = getEntries(xml);
    if (!entries.length) return;

    const latestId = getVideoId(entries[0]);
    if (!latestId) return;

    const lastId = readLastId();

    // Bootstrap: first run just records the current latest video
    if (!lastId) {
        writeLastId(latestId);
        return;
    }

    // Collect new entries since lastId (stop when we reach it), then post oldest → newest
    const toPost = [];
    for (const e of entries) {
        const vid = getVideoId(e);
        if (!vid) continue;
        if (vid === lastId) break;

        const title = getTag("title", e) || "New video";
        toPost.push({ vid, title });
    }
    toPost.reverse();

    // Cap backlog to avoid flooding after downtime
    const batch = toPost.slice(0, MAX_POSTS);

    for (const { vid, title } of batch) {
        const url = canonicalVideoUrl(vid);
        await postToTelegram(title, url);
        writeLastId(vid);
    }
}

main().catch((err) => {
    console.error(err.stack || err.message || String(err));
    process.exitCode = 1;
});
