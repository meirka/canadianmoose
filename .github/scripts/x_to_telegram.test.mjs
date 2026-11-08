import assert from "node:assert/strict";
import test from "node:test";

import {
    buildTelegramMessage,
    getUnseenStandalonePosts,
    isStandalonePost,
    nitterDescriptionToTelegramHtml,
    parsePosts,
} from "./x_to_telegram.mjs";

function item({ id, title, description = "", user = "cndlos" }) {
    return `
        <item>
            <title><![CDATA[${title}]]></title>
            <dc:creator>@${user}</dc:creator>
            <guid isPermaLink="false">${id}</guid>
            <link>https://x.com/${user}/status/${id}</link>
            ${description ? `<description><![CDATA[${description}]]></description>` : ""}
        </item>`;
}

test("keeps standalone posts and filters Nitter replies and reposts", () => {
    const posts = parsePosts(`
        <rss><channel>
            ${item({ id: "2090785001767858324", title: "Самостоятельная публикация" })}
            ${item({ id: "2090789439299596479", title: "R to @someone: ответ" })}
            ${item({
                id: "2063852171473436806",
                title: "RT by @cndlos: репост",
                user: "chaimaster",
            })}
        </channel></rss>`);

    assert.deepEqual(posts.filter(isStandalonePost), [
        { id: "2090785001767858324", text: "Самостоятельная публикация" },
    ]);
});

test("matches Nitter type prefixes case-insensitively", () => {
    assert.equal(isStandalonePost({ text: "rt BY @cndlos: repost" }), false);
    assert.equal(isStandalonePost({ text: "r TO @someone: reply" }), false);
    assert.equal(isStandalonePost({ text: "Обычный пост" }), true);
});

test("selects the first standalone post after replies and the reported repost", () => {
    const posts = [
        { id: "2090785001767858324", text: "Самостоятельная публикация" },
        { id: "2090789439299596479", text: "R to @someone: первый ответ" },
        { id: "2090789724554170768", text: "R to @someone: второй ответ" },
        { id: "2063852171473436806", text: "RT by @cndlos: репост chaimaster" },
        { id: "1898104397822906857", text: "Последняя обработанная публикация" },
    ];

    assert.deepEqual(getUnseenStandalonePosts(posts, "1898104397822906857"), {
        unseenCount: 4,
        posts: [{ id: "2090785001767858324", text: "Самостоятельная публикация" }],
    });
});

test("returns every new standalone post from oldest to newest", () => {
    const posts = [
        { id: "105", text: "Третий самостоятельный пост" },
        { id: "104", text: "R to @someone: ответ" },
        { id: "103", text: "Второй самостоятельный пост" },
        { id: "102", text: "RT by @cndlos: репост" },
        { id: "101", text: "Первый самостоятельный пост" },
        { id: "100", text: "Последняя обработанная публикация" },
    ];

    assert.deepEqual(getUnseenStandalonePosts(posts, "100").posts, [
        { id: "101", text: "Первый самостоятельный пост" },
        { id: "103", text: "Второй самостоятельный пост" },
        { id: "105", text: "Третий самостоятельный пост" },
    ]);
});

test("keeps tweet line breaks, links and supported formatting from the RSS description", () => {
    const [post] = parsePosts(`
        <rss><channel>
            ${item({
                id: "123",
                title: "Первая строка Вторая ссылка <не тег>",
                description: '<p><strong>Первая строка</strong><br>Вторая <a href="https://example.com/?a=1&amp;b=2">ссылка</a> &lt;не тег&gt;</p><img src="ignored.jpg">',
            })}
        </channel></rss>`);

    assert.deepEqual(post, {
        id: "123",
        text: "Первая строка Вторая ссылка <не тег>",
        html: '<b>Первая строка</b>\nВторая <a href="https://example.com/?a=1&amp;b=2">ссылка</a> &lt;не тег&gt;',
    });
});

test("does not duplicate line breaks added by the Nitter RSS template", () => {
    const original = `Тестировщик заходит в бар и заказывает:

кружку пива,
2 кружки пива,
0 кружек пива,
999999999 кружек пива,
ящерицу в стакане,
–1 кружку пива,
qwertyuip кружек пива.

Первый реальный клиент заходит в бар и спрашивает, где туалет. Бар вспыхивает пламенем, все погибают`;
    const description = `<p>${original.replaceAll("\n", "<br>\n")}</p>`;

    assert.equal(nitterDescriptionToTelegramHtml(description), original);
});

test("drops unsafe and unsupported HTML from Nitter descriptions", () => {
    assert.equal(
        nitterDescriptionToTelegramHtml(
            '<p>Текст <script>alert(1)</script> <a href="javascript:alert(1)">ссылка</a></p>',
        ),
        "Текст alert(1) ссылка",
    );
});

test("turns local Nitter profile links back into public X links", () => {
    assert.equal(
        nitterDescriptionToTelegramHtml(
            '<p>Привет, <a href="http://127.0.0.1:8080/someone">@someone</a></p>',
        ),
        'Привет, <a href="https://x.com/someone">@someone</a>',
    );
});

test("builds a Telegram HTML message and keeps its tags balanced when truncated", () => {
    const postUrl = "https://x.com/cndlos/status/123";
    const message = buildTelegramMessage({ html: `<b>${"я".repeat(5000)}</b>` }, postUrl);

    assert.equal(message.endsWith(`</b>\n\n${postUrl}`), true);
    assert.equal(message.replace(/<[^>]+>/g, "").length, 4096);
});

test("counts astral emoji as two UTF-16 code units for Telegram's limit", () => {
    const postUrl = "https://x.com/cndlos/status/123";
    const message = buildTelegramMessage({ html: "😀".repeat(5000) }, postUrl);

    assert.equal(message.length <= 4096, true);
    assert.equal(message.length > 4093, true);
});
