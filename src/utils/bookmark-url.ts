/**
 * normalizeBookmarkDomain 将用户输入的域名整理为可打开的 http/https URL。
 */
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

/**
 * isValidBookmarkUrl 判断输入能否被浏览器作为 http/https 链接打开。
 */
export function isValidBookmarkUrl(domain: string) {
  try {
    const url = new URL(normalizeBookmarkDomain(domain));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * getLogoFallback 为无图标网站生成稳定的首字兜底文案。
 */
export function getLogoFallback(title: string, domain: string) {
  const source = title.trim() || domain.replace(/^https?:\/\//i, "").trim();
  return source.slice(0, 1).toUpperCase() || "B";
}
