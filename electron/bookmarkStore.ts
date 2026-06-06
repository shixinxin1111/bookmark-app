import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const UNCATEGORIZED_CATEGORY_ID = "uncategorized";
export const UNCATEGORIZED_CATEGORY_NAME = "未分类";

export type BookmarkSite = {
  id: string;
  logoUrl: string;
  title: string;
  domain: string;
  note: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export type BookmarkCategory = {
  id: string;
  name: string;
  sites: BookmarkSite[];
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
};

export type BookmarkCategoryInput = {
  name: string;
};

export type BookmarkSiteInput = {
  logoUrl: string;
  title: string;
  domain: string;
  note: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBookmarkSite(value: unknown): value is BookmarkSite {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.logoUrl === "string" &&
    typeof value.title === "string" &&
    typeof value.domain === "string" &&
    typeof value.note === "string" &&
    typeof value.isFavorite === "boolean" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

function isBookmarkCategory(value: unknown): value is BookmarkCategory {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.sites) &&
    value.sites.every(isBookmarkSite) &&
    typeof value.isDefault === "boolean" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

export function validateBookmarksFile(value: unknown): BookmarkCategory[] {
  if (!Array.isArray(value) || !value.every(isBookmarkCategory)) {
    throw new Error("书签数据文件格式不正确，请检查本地 bookmarks.json。");
  }

  return ensureUncategorizedCategory(value);
}

export function normalizeBookmarkDomain(domain: string) {
  const trimmedDomain = domain.trim();

  if (!trimmedDomain) {
    return "";
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(trimmedDomain)) {
    return trimmedDomain;
  }

  return `https://${trimmedDomain}`;
}

function assertHttpUrl(urlValue: string, errorMessage: string) {
  try {
    const url = new URL(urlValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(errorMessage);
    }
  } catch {
    throw new Error(errorMessage);
  }
}

export function normalizeCategoryInput(
  input: BookmarkCategoryInput,
): BookmarkCategoryInput {
  const name = input.name.trim();

  if (!name) {
    throw new Error("分类名称不能为空。");
  }

  return { name };
}

export function normalizeSiteInput(input: BookmarkSiteInput): BookmarkSiteInput {
  const normalizedInput = {
    logoUrl: input.logoUrl.trim(),
    title: input.title.trim(),
    domain: normalizeBookmarkDomain(input.domain),
    note: input.note.trim(),
  };

  if (!normalizedInput.title) {
    throw new Error("网站标题不能为空。");
  }

  if (!normalizedInput.domain) {
    throw new Error("网站域名不能为空。");
  }

  assertHttpUrl(normalizedInput.domain, "网站域名必须是有效的 http/https 地址。");

  if (normalizedInput.logoUrl) {
    assertHttpUrl(normalizedInput.logoUrl, "图标链接必须是有效的 http/https 地址。");
  }

  return normalizedInput;
}

export function ensureUncategorizedCategory(
  categories: BookmarkCategory[],
): BookmarkCategory[] {
  const now = Date.now();
  const uncategorized = categories.find(
    (category) => category.id === UNCATEGORIZED_CATEGORY_ID,
  );
  const regularCategories = categories.filter(
    (category) => category.id !== UNCATEGORIZED_CATEGORY_ID,
  );

  return [
    ...regularCategories.map((category) => ({
      ...category,
      isDefault: false,
    })),
    {
      id: UNCATEGORIZED_CATEGORY_ID,
      name: UNCATEGORIZED_CATEGORY_NAME,
      sites: uncategorized?.sites ?? [],
      isDefault: true,
      createdAt: uncategorized?.createdAt ?? now,
      updatedAt: uncategorized?.updatedAt ?? now,
    },
  ];
}

function createInitialCategories() {
  return ensureUncategorizedCategory([]);
}

function findCategory(categories: BookmarkCategory[], categoryId: string) {
  return categories.find((category) => category.id === categoryId);
}

function removeSiteFromCategory(
  categories: BookmarkCategory[],
  categoryId: string,
  siteId: string,
) {
  let removedSite: BookmarkSite | undefined;

  const nextCategories = categories.map((category) => {
    if (category.id !== categoryId) {
      return category;
    }

    return {
      ...category,
      sites: category.sites.filter((site) => {
        if (site.id !== siteId) {
          return true;
        }

        removedSite = site;
        return false;
      }),
      updatedAt: Date.now(),
    };
  });

  return { nextCategories, removedSite };
}

function insertSiteIntoCategory(
  categories: BookmarkCategory[],
  categoryId: string,
  site: BookmarkSite,
  overSiteId?: string,
) {
  let didInsert = false;
  const now = Date.now();

  const nextCategories = categories.map((category) => {
    if (category.id !== categoryId) {
      return category;
    }

    const nextSites = [...category.sites];
    const overIndex = overSiteId
      ? nextSites.findIndex((candidate) => candidate.id === overSiteId)
      : -1;
    nextSites.splice(overIndex >= 0 ? overIndex : nextSites.length, 0, {
      ...site,
      updatedAt: now,
    });
    didInsert = true;

    return {
      ...category,
      sites: nextSites,
      updatedAt: now,
    };
  });

  if (!didInsert) {
    throw new Error("没有找到目标分类。");
  }

  return nextCategories;
}

export function createBookmarkStore(bookmarksFilePath: string) {
  let writeQueue: Promise<unknown> = Promise.resolve();

  async function readBookmarks() {
    try {
      const fileContent = await readFile(bookmarksFilePath, "utf8");
      return validateBookmarksFile(JSON.parse(fileContent));
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return createInitialCategories();
      }

      throw error;
    }
  }

  async function writeBookmarks(categories: BookmarkCategory[]) {
    const normalizedCategories = ensureUncategorizedCategory(categories);

    await mkdir(path.dirname(bookmarksFilePath), { recursive: true });
    await writeFile(
      bookmarksFilePath,
      `${JSON.stringify(normalizedCategories, null, 2)}\n`,
      "utf8",
    );
    return normalizedCategories;
  }

  async function withBookmarkWrite<T>(operation: () => Promise<T>) {
    const run = writeQueue.then(operation, operation);
    writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    list: readBookmarks,
    createCategory(input: BookmarkCategoryInput) {
      return withBookmarkWrite(async () => {
        const normalizedInput = normalizeCategoryInput(input);
        const now = Date.now();
        const categories = await readBookmarks();

        return writeBookmarks([
          ...categories.filter(
            (category) => category.id !== UNCATEGORIZED_CATEGORY_ID,
          ),
          {
            id: randomUUID(),
            name: normalizedInput.name,
            sites: [],
            isDefault: false,
            createdAt: now,
            updatedAt: now,
          },
          ...categories.filter(
            (category) => category.id === UNCATEGORIZED_CATEGORY_ID,
          ),
        ]);
      });
    },
    updateCategory(categoryId: string, input: BookmarkCategoryInput) {
      return withBookmarkWrite(async () => {
        if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
          throw new Error("默认分类不允许编辑。");
        }

        const normalizedInput = normalizeCategoryInput(input);
        const categories = await readBookmarks();
        let didUpdate = false;
        const now = Date.now();
        const nextCategories = categories.map((category) => {
          if (category.id !== categoryId) {
            return category;
          }

          didUpdate = true;
          return {
            ...category,
            name: normalizedInput.name,
            updatedAt: now,
          };
        });

        if (!didUpdate) {
          throw new Error("没有找到要更新的分类。");
        }

        return writeBookmarks(nextCategories);
      });
    },
    deleteCategory(categoryId: string, deleteSites: boolean) {
      return withBookmarkWrite(async () => {
        if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
          throw new Error("默认分类不允许删除。");
        }

        const categories = await readBookmarks();
        const targetCategory = findCategory(categories, categoryId);

        if (!targetCategory) {
          throw new Error("没有找到要删除的分类。");
        }

        const nextCategories = categories.filter(
          (category) => category.id !== categoryId,
        );

        if (deleteSites || targetCategory.sites.length === 0) {
          return writeBookmarks(nextCategories);
        }

        const now = Date.now();
        return writeBookmarks(
          nextCategories.map((category) => {
            if (category.id !== UNCATEGORIZED_CATEGORY_ID) {
              return category;
            }

            return {
              ...category,
              sites: [...category.sites, ...targetCategory.sites],
              updatedAt: now,
            };
          }),
        );
      });
    },
    createSite(categoryId: string, input: BookmarkSiteInput) {
      return withBookmarkWrite(async () => {
        const normalizedInput = normalizeSiteInput(input);
        const categories = await readBookmarks();
        let didCreate = false;
        const now = Date.now();
        const nextCategories = categories.map((category) => {
          if (category.id !== categoryId) {
            return category;
          }

          didCreate = true;
          return {
            ...category,
            sites: [
              ...category.sites,
              {
                id: randomUUID(),
                ...normalizedInput,
                isFavorite: false,
                createdAt: now,
                updatedAt: now,
              },
            ],
            updatedAt: now,
          };
        });

        if (!didCreate) {
          throw new Error("没有找到要添加网站的分类。");
        }

        return writeBookmarks(nextCategories);
      });
    },
    updateSite(categoryId: string, siteId: string, input: BookmarkSiteInput) {
      return withBookmarkWrite(async () => {
        const normalizedInput = normalizeSiteInput(input);
        const categories = await readBookmarks();
        let didUpdate = false;
        const now = Date.now();
        const nextCategories = categories.map((category) => {
          if (category.id !== categoryId) {
            return category;
          }

          return {
            ...category,
            sites: category.sites.map((site) => {
              if (site.id !== siteId) {
                return site;
              }

              didUpdate = true;
              return {
                ...site,
                ...normalizedInput,
                updatedAt: now,
              };
            }),
            updatedAt: now,
          };
        });

        if (!didUpdate) {
          throw new Error("没有找到要更新的网站。");
        }

        return writeBookmarks(nextCategories);
      });
    },
    deleteSite(categoryId: string, siteId: string) {
      return withBookmarkWrite(async () => {
        const categories = await readBookmarks();
        const { nextCategories, removedSite } = removeSiteFromCategory(
          categories,
          categoryId,
          siteId,
        );

        if (!removedSite) {
          throw new Error("没有找到要删除的网站。");
        }

        return writeBookmarks(nextCategories);
      });
    },
    toggleSiteFavorite(categoryId: string, siteId: string) {
      return withBookmarkWrite(async () => {
        const categories = await readBookmarks();
        let didUpdate = false;
        const now = Date.now();
        const nextCategories = categories.map((category) => {
          if (category.id !== categoryId) {
            return category;
          }

          return {
            ...category,
            sites: category.sites.map((site) => {
              if (site.id !== siteId) {
                return site;
              }

              didUpdate = true;
              return {
                ...site,
                isFavorite: !site.isFavorite,
                updatedAt: now,
              };
            }),
            updatedAt: now,
          };
        });

        if (!didUpdate) {
          throw new Error("没有找到要收藏的网站。");
        }

        return writeBookmarks(nextCategories);
      });
    },
    moveCategory(activeCategoryId: string, overCategoryId: string) {
      return withBookmarkWrite(async () => {
        if (
          activeCategoryId === UNCATEGORIZED_CATEGORY_ID ||
          overCategoryId === UNCATEGORIZED_CATEGORY_ID
        ) {
          throw new Error("默认分类必须保留在末尾。");
        }

        const categories = await readBookmarks();
        const activeIndex = categories.findIndex(
          (category) => category.id === activeCategoryId,
        );
        const overIndex = categories.findIndex(
          (category) => category.id === overCategoryId,
        );

        if (activeIndex < 0 || overIndex < 0) {
          throw new Error("没有找到要排序的分类。");
        }

        const nextCategories = [...categories];
        const [activeCategory] = nextCategories.splice(activeIndex, 1);
        nextCategories.splice(overIndex, 0, activeCategory);

        return writeBookmarks(nextCategories);
      });
    },
    moveSite(
      activeSiteId: string,
      fromCategoryId: string,
      toCategoryId: string,
      overSiteId?: string,
    ) {
      return withBookmarkWrite(async () => {
        const categories = await readBookmarks();
        const { nextCategories, removedSite } = removeSiteFromCategory(
          categories,
          fromCategoryId,
          activeSiteId,
        );

        if (!removedSite) {
          throw new Error("没有找到要排序的网站。");
        }

        return writeBookmarks(
          insertSiteIntoCategory(
            nextCategories,
            toCategoryId,
            removedSite,
            overSiteId,
          ),
        );
      });
    },
  };
}
