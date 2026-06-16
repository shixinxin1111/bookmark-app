import { useEffect, useMemo, useState } from "react";
import { Message } from "@arco-design/web-react";
import { initialBookmarkCategories } from "@/constants/bookmark";
import type {
  BookmarkCategory,
  BookmarkCategoryFormValues,
  BookmarkFormValues,
} from "@/types/bookmark";
import { getBookmarkStoreApi, getErrorMessage } from "@/utils/api";

type BookmarkWriteOperation = (
  bookmarkStore: BookmarkStoreApi,
) => Promise<BookmarkCategory[]>;

/**
 * useBookmarks 负责同步 Electron 主进程持久化的书签数据。
 */
export function useBookmarks() {
  const [categories, setCategories] = useState<BookmarkCategory[]>(
    initialBookmarkCategories,
  );
  const [loading, setLoading] = useState(() => Boolean(getBookmarkStoreApi()));

  useEffect(() => {
    let isMounted = true;
    const bookmarkStore = getBookmarkStoreApi();

    if (!bookmarkStore) {
      Message.error("书签存储能力暂不可用。");

      return () => {
        isMounted = false;
      };
    }

    const unsubscribe = bookmarkStore.onDidChange((nextCategories) => {
      if (isMounted) {
        setCategories(nextCategories);
      }
    });

    void bookmarkStore
      .list()
      .then((nextCategories) => {
        if (isMounted) {
          setCategories(nextCategories);
        }
      })
      .catch((error) => {
        if (isMounted) {
          Message.error(getErrorMessage(error, "书签数据读取失败。"));
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const favoriteSites = useMemo(
    () =>
      categories.flatMap((category) =>
        category.sites.filter((site) => site.isFavorite),
      ),
    [categories],
  );
  const favoriteCount = favoriteSites.length;

  async function runBookmarkWrite(operation: BookmarkWriteOperation) {
    const bookmarkStore = getBookmarkStoreApi();

    if (!bookmarkStore) {
      Message.error("书签存储能力暂不可用。");
      return undefined;
    }

    try {
      const nextCategories = await operation(bookmarkStore);
      setCategories(nextCategories);
      return nextCategories;
    } catch (error) {
      Message.error(getErrorMessage(error, "书签数据保存失败。"));
      return undefined;
    }
  }

  return {
    categories,
    favoriteCount,
    favoriteSites,
    loading,
    createCategory(values: BookmarkCategoryFormValues) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.createCategory(values),
      );
    },
    updateCategory(categoryId: string, values: BookmarkCategoryFormValues) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.updateCategory(categoryId, values),
      );
    },
    deleteCategory(categoryId: string, deleteSites: boolean) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.deleteCategory(categoryId, deleteSites),
      );
    },
    createSite(categoryId: string, values: BookmarkFormValues) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.createSite(categoryId, values),
      );
    },
    updateSite(categoryId: string, siteId: string, values: BookmarkFormValues) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.updateSite(categoryId, siteId, values),
      );
    },
    deleteSite(categoryId: string, siteId: string) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.deleteSite(categoryId, siteId),
      );
    },
    toggleSiteFavorite(categoryId: string, siteId: string) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.toggleSiteFavorite(categoryId, siteId),
      );
    },
    moveCategory(activeCategoryId: string, overCategoryId: string) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.moveCategory(activeCategoryId, overCategoryId),
      );
    },
    moveSite(
      activeSiteId: string,
      fromCategoryId: string,
      toCategoryId: string,
      overSiteId?: string,
    ) {
      return runBookmarkWrite((bookmarkStore) =>
        bookmarkStore.moveSite(
          activeSiteId,
          fromCategoryId,
          toCategoryId,
          overSiteId,
        ),
      );
    },
  };
}
