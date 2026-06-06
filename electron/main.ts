import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
  type Display,
  type Rectangle,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createBookmarkStore,
  type BookmarkCategoryInput,
  type BookmarkSiteInput,
} from "./bookmarkStore.js";
import { fetchBookmarkMetadata } from "./bookmarkMetadata.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rendererUrl = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";
const rendererPath = path.join(currentDir, "../renderer/index.html");
const preloadPath = path.join(currentDir, "preload.js");
const devTrayIconPath = path.join(process.cwd(), "public/favicon.svg");
const packagedTrayIconPath = path.join(currentDir, "../renderer/favicon.svg");

type BookmarkWindowMode = "normal" | "floating" | "miniFloating";

type BookmarkWindowState = {
  mode: BookmarkWindowMode;
};

const normalWindowSize = {
  width: 1000,
  height: 720,
  minWidth: 850,
  minHeight: 520,
};

const floatingWindowSize = {
  expanded: {
    width: 390,
    height: 600,
  },
  collapsed: {
    width: 260,
    height: 42,
  },
};

const visibleWindowBackground = "#f4f1ea";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

let currentWindowState: BookmarkWindowState = {
  mode: "normal",
};

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function broadcastWindowState() {
  mainWindow?.webContents.send(
    "bookmark-window:mode-changed",
    currentWindowState,
  );
}

function setWindowButtonVisible(window: BrowserWindow, visible: boolean) {
  if (process.platform === "darwin") {
    window.setWindowButtonVisibility(visible);
  }
}

function getSafeTopRightAnchoredBounds(
  display: Display,
  currentBounds: Rectangle,
  size: { width: number; height: number },
) {
  const { workArea } = display;
  // Keeps the titlebar action area stable when window modes use different sizes.
  const currentRight = currentBounds.x + currentBounds.width;

  return {
    x: clamp(
      currentRight - size.width,
      workArea.x,
      workArea.x + workArea.width - size.width,
    ),
    y: clamp(
      currentBounds.y,
      workArea.y,
      workArea.y + workArea.height - size.height,
    ),
    width: size.width,
    height: size.height,
  };
}

function applyFloatingWindow(
  mode: Extract<BookmarkWindowMode, "floating" | "miniFloating">,
) {
  if (!mainWindow) {
    return currentWindowState;
  }

  const window = mainWindow;
  const currentBounds = window.getBounds();
  const display = screen.getDisplayMatching(currentBounds);
  const size =
    mode === "floating"
      ? floatingWindowSize.expanded
      : floatingWindowSize.collapsed;

  currentWindowState = {
    mode,
  };

  window.setAlwaysOnTop(true, "floating");
  window.setResizable(false);
  window.setBackgroundColor(visibleWindowBackground);
  window.setOpacity(1);
  window.setMinimumSize(size.width, size.height);
  setWindowButtonVisible(window, false);
  window.setBounds(getSafeTopRightAnchoredBounds(display, currentBounds, size));
  window.show();
  window.focus();
  broadcastWindowState();
  return currentWindowState;
}

function applyWindowMode(mode: BookmarkWindowMode) {
  if (!mainWindow) {
    return currentWindowState;
  }

  const window = mainWindow;
  const currentBounds = window.getBounds();
  const display = screen.getDisplayMatching(currentBounds);

  if (mode === "floating" || mode === "miniFloating") {
    return applyFloatingWindow(mode);
  }

  currentWindowState = {
    mode: "normal",
  };
  window.setAlwaysOnTop(false);
  window.setResizable(true);
  window.setBackgroundColor(visibleWindowBackground);
  window.setOpacity(1);
  window.setMinimumSize(normalWindowSize.minWidth, normalWindowSize.minHeight);
  setWindowButtonVisible(window, true);
  window.setBounds(
    getSafeTopRightAnchoredBounds(display, currentBounds, {
      width: normalWindowSize.width,
      height: normalWindowSize.height,
    }),
  );
  window.show();
  window.focus();
  broadcastWindowState();
  return currentWindowState;
}

function registerWindowIpc() {
  ipcMain.handle("bookmark-window:get-mode", () => currentWindowState);
  ipcMain.handle("bookmark-window:set-mode", (_, mode: BookmarkWindowMode) =>
    applyWindowMode(mode),
  );
}

function registerBookmarkStoreIpc() {
  const bookmarkStore = createBookmarkStore(
    path.join(app.getPath("userData"), "bookmarks.json"),
  );

  ipcMain.handle("bookmark-store:list", () => bookmarkStore.list());
  ipcMain.handle(
    "bookmark-store:create-category",
    (_, input: BookmarkCategoryInput) => bookmarkStore.createCategory(input),
  );
  ipcMain.handle(
    "bookmark-store:update-category",
    (_, categoryId: string, input: BookmarkCategoryInput) =>
      bookmarkStore.updateCategory(categoryId, input),
  );
  ipcMain.handle(
    "bookmark-store:delete-category",
    (_, categoryId: string, deleteSites: boolean) =>
      bookmarkStore.deleteCategory(categoryId, deleteSites),
  );
  ipcMain.handle(
    "bookmark-store:create-site",
    (_, categoryId: string, input: BookmarkSiteInput) =>
      bookmarkStore.createSite(categoryId, input),
  );
  ipcMain.handle(
    "bookmark-store:update-site",
    (_, categoryId: string, siteId: string, input: BookmarkSiteInput) =>
      bookmarkStore.updateSite(categoryId, siteId, input),
  );
  ipcMain.handle(
    "bookmark-store:delete-site",
    (_, categoryId: string, siteId: string) =>
      bookmarkStore.deleteSite(categoryId, siteId),
  );
  ipcMain.handle(
    "bookmark-store:toggle-site-favorite",
    (_, categoryId: string, siteId: string) =>
      bookmarkStore.toggleSiteFavorite(categoryId, siteId),
  );
  ipcMain.handle(
    "bookmark-store:move-category",
    (_, activeCategoryId: string, overCategoryId: string) =>
      bookmarkStore.moveCategory(activeCategoryId, overCategoryId),
  );
  ipcMain.handle(
    "bookmark-store:move-site",
    (
      _,
      activeSiteId: string,
      fromCategoryId: string,
      toCategoryId: string,
      overSiteId?: string,
    ) =>
      bookmarkStore.moveSite(
        activeSiteId,
        fromCategoryId,
        toCategoryId,
        overSiteId,
      ),
  );
}

function registerBookmarkMetadataIpc() {
  ipcMain.handle("bookmark-metadata:fetch", (_, domain: string) =>
    fetchBookmarkMetadata(domain),
  );
}

function registerLinkIpc() {
  ipcMain.handle("bookmark-link:open-external", async (_, urlValue: string) => {
    const url = new URL(urlValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("只支持打开 http/https 链接。");
    }

    await shell.openExternal(url.toString());
  });
}

function createTray() {
  if (tray) {
    return tray;
  }

  const trayIconPath = app.isPackaged ? packagedTrayIconPath : devTrayIconPath;
  const trayIcon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(trayIcon);
  tray.setToolTip("Bookmark");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "显示主窗口",
        click: () => {
          applyWindowMode("normal");
        },
      },
      {
        label: "显示悬浮窗",
        click: () => {
          applyWindowMode("floating");
        },
      },
      {
        label: "显示迷你悬浮窗",
        click: () => {
          applyWindowMode("miniFloating");
        },
      },
      { type: "separator" },
      {
        label: "退出应用",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );

  tray.on("click", () => {
    applyWindowMode("normal");
  });

  return tray;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: normalWindowSize.width,
    height: normalWindowSize.height,
    minWidth: normalWindowSize.minWidth,
    minHeight: normalWindowSize.minHeight,
    title: "Bookmark",
    transparent: false,
    backgroundColor: visibleWindowBackground,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: {
      x: 16,
      y: 13,
    },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  createTray();

  mainWindow.on("close", (event) => {
    if (!isQuitting && currentWindowState.mode !== "normal") {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (app.isPackaged) {
    void mainWindow.loadFile(rendererPath);
    return;
  }

  void mainWindow.loadURL(rendererUrl);
}

app.whenReady().then(() => {
  registerWindowIpc();
  registerBookmarkStoreIpc();
  registerBookmarkMetadataIpc();
  registerLinkIpc();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      return;
    }

    mainWindow?.show();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});
