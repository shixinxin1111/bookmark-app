type BookmarkWindowMode = "normal" | "floating" | "miniFloating";

type BookmarkWindowState = {
  mode: BookmarkWindowMode;
};

type BookmarkWindowApi = {
  /**
   * getMode 读取主进程记录的当前窗口形态，用于渲染层初始化同步。
   */
  getMode(): Promise<BookmarkWindowState>;
  /**
   * setMode 请求主进程切换窗口形态，实际窗口尺寸由主进程裁决。
   */
  setMode(mode: BookmarkWindowMode): Promise<BookmarkWindowState>;
  /**
   * onModeChange 订阅主进程形态变化，返回取消订阅函数。
   */
  onModeChange(callback: (state: BookmarkWindowState) => void): () => void;
};

interface Window {
  bookmarkWindow?: BookmarkWindowApi;
}
