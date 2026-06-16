import { contextBridge, ipcRenderer } from "electron";
const bookmarkStoreDidChangeChannel = "bookmark-store:did-change";

type BookmarkSite = {
  id: string;
  logoUrl: string;
  title: string;
  domain: string;
  note: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
};

type BookmarkCategory = {
  id: string;
  name: string;
  sites: BookmarkSite[];
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
};

type BookmarkFormValues = {
  logoUrl: string;
  title: string;
  domain: string;
  note: string;
};

type BookmarkCategoryFormValues = {
  name: string;
};

type BookmarkMetadata = {
  title: string;
  description: string;
  logoUrl: string;
  resolvedUrl: string;
};

/**
 * preload 是 Electron 主进程和 React 渲染层之间的安全桥入口。
 * 这里只暴露受控能力，不把 ipcRenderer 原始对象传给渲染层。
 */
contextBridge.exposeInMainWorld("bookmarkWindow", {
  showMainWindow: () =>
    ipcRenderer.invoke("bookmark-window:show-main-window") as Promise<void>,
});

contextBridge.exposeInMainWorld("bookmarkStore", {
  list: () =>
    ipcRenderer.invoke("bookmark-store:list") as Promise<BookmarkCategory[]>,
  createCategory: (input: BookmarkCategoryFormValues) =>
    ipcRenderer.invoke("bookmark-store:create-category", input) as Promise<
      BookmarkCategory[]
    >,
  updateCategory: (categoryId: string, input: BookmarkCategoryFormValues) =>
    ipcRenderer.invoke(
      "bookmark-store:update-category",
      categoryId,
      input,
    ) as Promise<BookmarkCategory[]>,
  deleteCategory: (categoryId: string, deleteSites: boolean) =>
    ipcRenderer.invoke(
      "bookmark-store:delete-category",
      categoryId,
      deleteSites,
    ) as Promise<BookmarkCategory[]>,
  createSite: (categoryId: string, input: BookmarkFormValues) =>
    ipcRenderer.invoke(
      "bookmark-store:create-site",
      categoryId,
      input,
    ) as Promise<BookmarkCategory[]>,
  updateSite: (categoryId: string, siteId: string, input: BookmarkFormValues) =>
    ipcRenderer.invoke(
      "bookmark-store:update-site",
      categoryId,
      siteId,
      input,
    ) as Promise<BookmarkCategory[]>,
  deleteSite: (categoryId: string, siteId: string) =>
    ipcRenderer.invoke(
      "bookmark-store:delete-site",
      categoryId,
      siteId,
    ) as Promise<BookmarkCategory[]>,
  toggleSiteFavorite: (categoryId: string, siteId: string) =>
    ipcRenderer.invoke(
      "bookmark-store:toggle-site-favorite",
      categoryId,
      siteId,
    ) as Promise<BookmarkCategory[]>,
  moveCategory: (activeCategoryId: string, overCategoryId: string) =>
    ipcRenderer.invoke(
      "bookmark-store:move-category",
      activeCategoryId,
      overCategoryId,
    ) as Promise<BookmarkCategory[]>,
  moveSite: (
    activeSiteId: string,
    fromCategoryId: string,
    toCategoryId: string,
    overSiteId?: string,
  ) =>
    ipcRenderer.invoke(
      "bookmark-store:move-site",
      activeSiteId,
      fromCategoryId,
      toCategoryId,
      overSiteId,
    ) as Promise<BookmarkCategory[]>,
  onDidChange: (listener: (categories: BookmarkCategory[]) => void) => {
    const wrappedListener = (
      _event: unknown,
      categories: BookmarkCategory[],
    ) => {
      listener(categories);
    };

    ipcRenderer.on(bookmarkStoreDidChangeChannel, wrappedListener);

    return () => {
      ipcRenderer.removeListener(
        bookmarkStoreDidChangeChannel,
        wrappedListener,
      );
    };
  },
});

contextBridge.exposeInMainWorld("bookmarkMetadata", {
  fetch: (domain: string) =>
    ipcRenderer.invoke(
      "bookmark-metadata:fetch",
      domain,
    ) as Promise<BookmarkMetadata>,
});

contextBridge.exposeInMainWorld("bookmarkLink", {
  openExternal: (url: string) =>
    ipcRenderer.invoke("bookmark-link:open-external", url) as Promise<void>,
});
