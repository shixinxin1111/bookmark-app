import { contextBridge, ipcRenderer } from "electron";

type BookmarkWindowMode = "normal" | "floating" | "miniFloating";

type BookmarkWindowState = {
  mode: BookmarkWindowMode;
};

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
  getMode: () =>
    ipcRenderer.invoke(
      "bookmark-window:get-mode",
    ) as Promise<BookmarkWindowState>,
  setMode: (mode: BookmarkWindowMode) =>
    ipcRenderer.invoke(
      "bookmark-window:set-mode",
      mode,
    ) as Promise<BookmarkWindowState>,
  onModeChange: (callback: (state: BookmarkWindowState) => void) => {
    const listener = (
      _: Electron.IpcRendererEvent,
      state: BookmarkWindowState,
    ) => {
      callback(state);
    };

    ipcRenderer.on("bookmark-window:mode-changed", listener);

    return () => {
      ipcRenderer.removeListener("bookmark-window:mode-changed", listener);
    };
  },
});

contextBridge.exposeInMainWorld("bookmarkStore", {
  list: () =>
    ipcRenderer.invoke("bookmark-store:list") as Promise<BookmarkCategory[]>,
  createCategory: (input: BookmarkCategoryFormValues) =>
    ipcRenderer.invoke(
      "bookmark-store:create-category",
      input,
    ) as Promise<BookmarkCategory[]>,
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
