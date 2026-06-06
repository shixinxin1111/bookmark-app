import { contextBridge, ipcRenderer } from "electron";

type BookmarkWindowMode = "normal" | "floating" | "miniFloating";

type BookmarkWindowState = {
  mode: BookmarkWindowMode;
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
