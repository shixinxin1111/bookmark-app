import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  UNCATEGORIZED_CATEGORY_ID,
  createBookmarkStore,
} from "../dist/main/bookmarkStore.js";

async function withTempStore(run) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const bookmarksFilePath = path.join(tempDir, "bookmarks.json");

  try {
    await run(createBookmarkStore(bookmarksFilePath), bookmarksFilePath);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

test("文件不存在时返回默认未分类", async () => {
  await withTempStore(async (store) => {
    const categories = await store.list();

    assert.equal(categories.length, 1);
    assert.equal(categories[0].id, UNCATEGORIZED_CATEGORY_ID);
    assert.equal(categories[0].name, "未分类");
    assert.deepEqual(categories[0].sites, []);
  });
});

test("新增网站会裁剪输入、补齐协议并持久化", async () => {
  await withTempStore(async (store, bookmarksFilePath) => {
    const categories = await store.createSite(UNCATEGORIZED_CATEGORY_ID, {
      logoUrl: " https://example.com/icon.png ",
      title: " Example ",
      domain: " example.com ",
      note: " Note ",
    });
    const [site] = categories[0].sites;
    const fileCategories = JSON.parse(await readFile(bookmarksFilePath, "utf8"));

    assert.equal(site.title, "Example");
    assert.equal(site.domain, "https://example.com");
    assert.equal(site.logoUrl, "https://example.com/icon.png");
    assert.equal(site.note, "Note");
    assert.equal(fileCategories[0].sites[0].domain, "https://example.com");
  });
});

test("分类名称不能重复", async () => {
  await withTempStore(async (store) => {
    const [category] = await store.createCategory({
      name: " 工作 ",
    });

    await assert.rejects(
      () =>
        store.createCategory({
          name: "工作",
        }),
      /已存在同名分类/,
    );

    await assert.rejects(
      () =>
        store.updateCategory(category.id, {
          name: " 未分类 ",
        }),
      /已存在同名分类/,
    );
  });
});

test("网站标题和域名不能重复", async () => {
  await withTempStore(async (store) => {
    await store.createSite(UNCATEGORIZED_CATEGORY_ID, {
      logoUrl: "",
      title: " Example ",
      domain: " example.com ",
      note: "",
    });

    await assert.rejects(
      () =>
        store.createSite(UNCATEGORIZED_CATEGORY_ID, {
          logoUrl: "",
          title: "example",
          domain: "other.com",
          note: "",
        }),
      /已存在同名网站/,
    );

    await assert.rejects(
      () =>
        store.createSite(UNCATEGORIZED_CATEGORY_ID, {
          logoUrl: "",
          title: "Other",
          domain: "https://example.com/",
          note: "",
        }),
      /已存在相同网站域名/,
    );
  });
});

test("损坏文件会抛出格式错误", async () => {
  await withTempStore(async (store, bookmarksFilePath) => {
    await writeFile(bookmarksFilePath, '{"broken":true}', "utf8");

    await assert.rejects(
      () => store.list(),
      /书签数据文件格式不正确/,
    );
  });
});

test("并发写入通过队列串行化，不丢数据", async () => {
  await withTempStore(async (store) => {
    await Promise.all([
      store.createSite(UNCATEGORIZED_CATEGORY_ID, {
        logoUrl: "",
        title: "A",
        domain: "a.com",
        note: "",
      }),
      store.createSite(UNCATEGORIZED_CATEGORY_ID, {
        logoUrl: "",
        title: "B",
        domain: "b.com",
        note: "",
      }),
      store.createSite(UNCATEGORIZED_CATEGORY_ID, {
        logoUrl: "",
        title: "C",
        domain: "c.com",
        note: "",
      }),
    ]);

    const categories = await store.list();
    assert.deepEqual(
      categories[0].sites.map((site) => site.title).sort(),
      ["A", "B", "C"],
    );
  });
});
