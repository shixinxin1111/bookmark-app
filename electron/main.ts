import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  systemPreferences,
  Tray,
  type Rectangle,
} from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import {
  createBookmarkStore,
  type BookmarkCategory,
  type BookmarkCategoryInput,
  type BookmarkSiteInput,
} from "./bookmarkStore.js";
import { fetchBookmarkMetadata } from "./bookmarkMetadata.js";
import { getTrayIconSource } from "./trayIcon.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rendererUrl = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";
const rendererPath = path.join(currentDir, "../renderer/index.html");
const preloadPath = path.join(currentDir, "preload.js");
const devTrayIconPath = path.join(process.cwd(), "public/favicon.svg");
const packagedTrayIconPath = path.join(currentDir, "../renderer/favicon.svg");

const normalWindowSize = {
  width: 1000,
  height: 720,
  minWidth: 850,
  minHeight: 520,
};

const trayWindowSize = {
  width: 390,
  height: 600,
};

const visibleWindowBackground = "#f4f1ea";

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let bookmarkStore: ReturnType<typeof createBookmarkStore> | null = null;
let isHidingForMinimize = false;
let isTrayWindowOpen = false;
let isTrayMouseDown = false;
let wasTrayWindowOpenOnMouseDown = false;
let trayMouseDownTimer: ReturnType<typeof setTimeout> | null = null;
let trayAutoHideTimer: ReturnType<typeof setTimeout> | null = null;
let isTrayMenuOpen = false;
let lastTrayMenuClosedAt = 0;

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getTrayWindowBounds(
  anchorBounds: Rectangle,
  size: { width: number; height: number },
) {
  const display = screen.getDisplayMatching(anchorBounds);
  const { workArea } = display;
  const openBelow = anchorBounds.y < workArea.y + workArea.height / 2;
  const preferredX =
    anchorBounds.x + Math.round((anchorBounds.width - size.width) / 2);
  const preferredY = openBelow
    ? anchorBounds.y + anchorBounds.height + 8
    : anchorBounds.y - size.height - 8;

  return {
    x: clamp(preferredX, workArea.x, workArea.x + workArea.width - size.width),
    y: clamp(
      preferredY,
      workArea.y,
      workArea.y + workArea.height - size.height,
    ),
    width: size.width,
    height: size.height,
  };
}

function expandBounds(bounds: Rectangle, padding: number) {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function isPointInBounds(point: { x: number; y: number }, bounds: Rectangle) {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function isCursorInTrayBounds() {
  if (!tray) {
    return false;
  }

  const cursorPoint = screen.getCursorScreenPoint();
  const trayBounds = expandBounds(tray.getBounds(), 8);

  return isPointInBounds(cursorPoint, trayBounds);
}

function getWindowUrl(view: "main" | "tray") {
  const url = app.isPackaged
    ? new URL(pathToFileURL(rendererPath).toString())
    : new URL(rendererUrl);

  if (view === "tray") {
    url.searchParams.set("view", "tray");
  }

  return url.toString();
}

function loadWindow(window: BrowserWindow, view: "main" | "tray") {
  return window.loadURL(getWindowUrl(view));
}

function createTrayIcon() {
  const iconSource = getTrayIconSource({
    devIconPath: devTrayIconPath,
    isPackaged: app.isPackaged,
    packagedIconPath: packagedTrayIconPath,
    platform: process.platform,
  });
  const trayIcon =
    iconSource.kind === "dataUrl"
      ? nativeImage.createFromDataURL(iconSource.value)
      : nativeImage.createFromPath(iconSource.value);

  if (process.platform === "darwin") {
    trayIcon.setTemplateImage(true);
  }

  return trayIcon;
}

function listFavoriteSites(categories: BookmarkCategory[]) {
  return categories.flatMap((category) =>
    category.sites.filter((site) => site.isFavorite),
  );
}

async function updateTrayIndicator() {
  if (!tray || !bookmarkStore) {
    return;
  }

  const favoriteCount = listFavoriteSites(await bookmarkStore.list()).length;

  tray.setToolTip(
    favoriteCount > 0 ? `Bookmark（${favoriteCount} 个收藏）` : "Bookmark",
  );

  if (process.platform === "darwin") {
    tray.setTitle(favoriteCount > 0 ? String(favoriteCount) : "");
  }
}

function markTrayMouseDown() {
  cancelPendingTrayAutoHide();
  isTrayMouseDown = true;
  wasTrayWindowOpenOnMouseDown =
    wasTrayWindowOpenOnMouseDown || isTrayWindowOpen;

  if (trayMouseDownTimer) {
    clearTimeout(trayMouseDownTimer);
  }

  trayMouseDownTimer = setTimeout(() => {
    clearTrayMouseDown();
  }, 500);
}

function clearTrayMouseDown() {
  isTrayMouseDown = false;
  wasTrayWindowOpenOnMouseDown = false;

  if (!trayMouseDownTimer) {
    return;
  }

  clearTimeout(trayMouseDownTimer);
  trayMouseDownTimer = null;
}

function cancelPendingTrayAutoHide() {
  if (!trayAutoHideTimer) {
    return;
  }

  clearTimeout(trayAutoHideTimer);
  trayAutoHideTimer = null;
}

function scheduleTrayWindowAutoHide() {
  cancelPendingTrayAutoHide();

  if (isCursorInTrayBounds()) {
    return;
  }

  trayAutoHideTimer = setTimeout(() => {
    trayAutoHideTimer = null;
    hideTrayWindow();
  }, 0);
}

function hideTrayWindow({ force = false }: { force?: boolean } = {}) {
  if (force) {
    cancelPendingTrayAutoHide();
  }

  if (!force && isTrayMouseDown) {
    return;
  }

  if (trayWindow?.isVisible()) {
    trayWindow.hide();
  }

  isTrayWindowOpen = false;
}

function ensureMainWindow() {
  if (!mainWindow) {
    createMainWindow();
  }

  return mainWindow;
}

function showMainWindow() {
  const window = ensureMainWindow();

  if (!window) {
    return;
  }

  hideTrayWindow({ force: true });

  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
}

function positionTrayWindow(anchorBounds?: Rectangle) {
  if (!trayWindow) {
    return;
  }

  const referenceBounds = anchorBounds ?? tray?.getBounds();

  if (!referenceBounds) {
    return;
  }

  trayWindow.setBounds(getTrayWindowBounds(referenceBounds, trayWindowSize));
}

function createTrayWindow() {
  if (trayWindow) {
    return trayWindow;
  }

  trayWindow = new BrowserWindow({
    width: trayWindowSize.width,
    height: trayWindowSize.height,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    movable: false,
    show: false,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hiddenInMissionControl: true,
    backgroundColor: visibleWindowBackground,
    roundedCorners: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  trayWindow.on("blur", () => {
    scheduleTrayWindowAutoHide();
  });

  trayWindow.on("closed", () => {
    trayWindow = null;
  });

  void loadWindow(trayWindow, "tray");
  return trayWindow;
}

function showTrayWindow(anchorBounds?: Rectangle) {
  const window = createTrayWindow();

  positionTrayWindow(anchorBounds);
  window.show();
  isTrayWindowOpen = true;
  window.focus();
}

function toggleTrayWindow(anchorBounds?: Rectangle) {
  cancelPendingTrayAutoHide();

  if (isTrayWindowOpen || wasTrayWindowOpenOnMouseDown) {
    hideTrayWindow({ force: true });
    clearTrayMouseDown();
    return;
  }

  showTrayWindow(anchorBounds);
  clearTrayMouseDown();
}

function registerMenuBarTracking() {
  if (process.platform !== "darwin") {
    return;
  }

  systemPreferences.subscribeLocalNotification(
    "NSMenuDidBeginTrackingNotification",
    () => {
      if (isCursorInTrayBounds()) {
        wasTrayWindowOpenOnMouseDown =
          wasTrayWindowOpenOnMouseDown || isTrayWindowOpen;
      }

      hideTrayWindow({ force: true });
    },
  );
}

function registerWindowIpc() {
  ipcMain.handle("bookmark-window:show-main-window", () => {
    showMainWindow();
  });
}

function registerBookmarkStoreIpc() {
  bookmarkStore = createBookmarkStore(
    path.join(app.getPath("userData"), "bookmarks.json"),
  );
  const store = bookmarkStore;

  const withTrayRefresh = async (
    updater: () => Promise<BookmarkCategory[]>,
  ) => {
    const nextCategories = await updater();
    await updateTrayIndicator();
    return nextCategories;
  };

  ipcMain.handle("bookmark-store:list", () => store.list());
  ipcMain.handle(
    "bookmark-store:create-category",
    (_, input: BookmarkCategoryInput) =>
      withTrayRefresh(() => store.createCategory(input)),
  );
  ipcMain.handle(
    "bookmark-store:update-category",
    (_, categoryId: string, input: BookmarkCategoryInput) =>
      withTrayRefresh(() => store.updateCategory(categoryId, input)),
  );
  ipcMain.handle(
    "bookmark-store:delete-category",
    (_, categoryId: string, deleteSites: boolean) =>
      withTrayRefresh(() => store.deleteCategory(categoryId, deleteSites)),
  );
  ipcMain.handle(
    "bookmark-store:create-site",
    (_, categoryId: string, input: BookmarkSiteInput) =>
      withTrayRefresh(() => store.createSite(categoryId, input)),
  );
  ipcMain.handle(
    "bookmark-store:update-site",
    (_, categoryId: string, siteId: string, input: BookmarkSiteInput) =>
      withTrayRefresh(() => store.updateSite(categoryId, siteId, input)),
  );
  ipcMain.handle(
    "bookmark-store:delete-site",
    (_, categoryId: string, siteId: string) =>
      withTrayRefresh(() => store.deleteSite(categoryId, siteId)),
  );
  ipcMain.handle(
    "bookmark-store:toggle-site-favorite",
    (_, categoryId: string, siteId: string) =>
      withTrayRefresh(() => store.toggleSiteFavorite(categoryId, siteId)),
  );
  ipcMain.handle(
    "bookmark-store:move-category",
    (_, activeCategoryId: string, overCategoryId: string) =>
      withTrayRefresh(() =>
        store.moveCategory(activeCategoryId, overCategoryId),
      ),
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
      withTrayRefresh(() =>
        store.moveSite(activeSiteId, fromCategoryId, toCategoryId, overSiteId),
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

  tray = new Tray(createTrayIcon());
  if (process.platform === "darwin") {
    tray.setIgnoreDoubleClickEvents(true);
  }

  const trayMenu = Menu.buildFromTemplate([
    {
      label: "打开悬浮窗",
      click: () => {
        toggleTrayWindow();
      },
    },
    {
      label: "显示主窗口",
      click: () => {
        showMainWindow();
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
  ]);

  trayMenu.on("menu-will-show", () => {
    isTrayMenuOpen = true;
    hideTrayWindow({ force: true });
  });

  trayMenu.on("menu-will-close", () => {
    isTrayMenuOpen = false;
    lastTrayMenuClosedAt = Date.now();
  });

  tray.on("mouse-down", () => {
    markTrayMouseDown();
  });

  tray.on("click", (_, bounds) => {
    toggleTrayWindow(bounds);
  });

  tray.on("right-click", () => {
    cancelPendingTrayAutoHide();

    if (isTrayMenuOpen) {
      tray?.closeContextMenu();
      return;
    }

    if (Date.now() - lastTrayMenuClosedAt < 250) {
      return;
    }

    tray?.popUpContextMenu(trayMenu);
  });

  void updateTrayIndicator();
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

  mainWindow.on("hide", () => {
    if (!isQuitting || !isHidingForMinimize) {
      return;
    }

    isHidingForMinimize = false;
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    if (mainWindow?.isMinimized()) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on("minimize", (() => {
    isHidingForMinimize = true;
    mainWindow?.hide();
  }) as () => void);

  mainWindow.on("show", () => {
    isHidingForMinimize = false;
    hideTrayWindow();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void loadWindow(mainWindow, "main");
}

app.whenReady().then(() => {
  registerWindowIpc();
  registerBookmarkStoreIpc();
  registerBookmarkMetadataIpc();
  registerLinkIpc();
  registerMenuBarTracking();
  createMainWindow();

  app.on("activate", () => {
    showMainWindow();
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
