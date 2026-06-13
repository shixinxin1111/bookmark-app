/**
 * getBookmarkWindowApi 读取 preload 暴露给渲染进程的窗口控制 API。
 *
 * 返回值可能为空，组件调用时需要保留降级提示，避免在非 Electron
 * 环境或 preload 注入失败时直接抛错。
 */
export function getBookmarkWindowApi() {
  return window.bookmarkWindow;
}

/**
 * getBookmarkStoreApi 读取 preload 暴露的书签持久化 API。
 */
export function getBookmarkStoreApi() {
  return window.bookmarkStore;
}

/**
 * getBookmarkMetadataApi 读取 preload 暴露的网址信息读取 API。
 */
export function getBookmarkMetadataApi() {
  return window.bookmarkMetadata;
}

/**
 * getBookmarkLinkApi 读取 preload 暴露的外部链接打开 API。
 */
export function getBookmarkLinkApi() {
  return window.bookmarkLink;
}

/**
 * getErrorMessage 将未知错误转换为用户可展示的兜底文案。
 *
 * 只有标准 Error 且 message 非空时才透出原始信息，否则返回调用方提供的
 * 业务上下文文案。
 */
export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
