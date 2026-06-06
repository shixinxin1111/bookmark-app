import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchBookmarkMetadataFromContent,
} from "../dist/main/bookmarkMetadata.js";

test("从静态 HTML 中提取标题、描述和图标", async () => {
  const metadata = await fetchBookmarkMetadataFromContent(
    `
      <html>
        <head>
          <meta property="og:title" content="Example Title" />
          <meta property="og:description" content="Example Description" />
          <meta property="og:image" content="https://example.com/cover.png" />
        </head>
      </html>
    `,
    "https://example.com/page",
  );

  assert.equal(metadata.title, "Example Title");
  assert.equal(metadata.description, "Example Description");
  assert.equal(metadata.logoUrl, "https://example.com/cover.png");
});

test("相对图标路径补全为绝对路径", async () => {
  const metadata = await fetchBookmarkMetadataFromContent(
    `
      <html>
        <head>
          <title>Relative Icon</title>
          <link rel="icon" href="/favicon.png" />
        </head>
      </html>
    `,
    "https://example.com/docs/index.html",
  );

  assert.equal(metadata.logoUrl, "https://example.com/favicon.png");
});

test("缺少图标时兜底到 /favicon.ico", async () => {
  const metadata = await fetchBookmarkMetadataFromContent(
    `
      <html>
        <head>
          <title>No Icon</title>
        </head>
      </html>
    `,
    "https://example.com/docs",
  );

  assert.equal(metadata.logoUrl, "https://example.com/favicon.ico");
});

test("非 http/https 网址会被拒绝", async () => {
  await assert.rejects(
    () => fetchBookmarkMetadataFromContent("<html></html>", "file:///tmp/a.html"),
    /只支持读取 http\/https 网站信息/,
  );
});
