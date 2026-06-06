import { lookup } from "node:dns/promises";
import { getLinkPreview, getPreviewFromContent } from "link-preview-js";
import { normalizeBookmarkDomain } from "./bookmarkStore.js";

export type BookmarkMetadata = {
  title: string;
  description: string;
  logoUrl: string;
  resolvedUrl: string;
};

type LinkPreviewResult = Awaited<ReturnType<typeof getLinkPreview>>;

function assertHttpUrl(urlValue: string) {
  const url = new URL(urlValue);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("只支持读取 http/https 网站信息。");
  }

  return url;
}

function getStringArrayItem(value: unknown) {
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
}

function toAbsoluteUrl(value: string, baseUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function getFallbackFavicon(urlValue: string) {
  const url = new URL(urlValue);
  return `${url.origin}/favicon.ico`;
}

export function mapBookmarkMetadata(
  preview: LinkPreviewResult,
  fallbackUrl: string,
): BookmarkMetadata {
  const resolvedUrl =
    "url" in preview && typeof preview.url === "string"
      ? preview.url
      : fallbackUrl;
  const title =
    "title" in preview && typeof preview.title === "string"
      ? preview.title
      : "";
  const description =
    "description" in preview && typeof preview.description === "string"
      ? preview.description
      : "";
  const imageUrl = toAbsoluteUrl(
    "images" in preview ? getStringArrayItem(preview.images) : "",
    resolvedUrl,
  );
  const faviconUrl = toAbsoluteUrl(
    getStringArrayItem(preview.favicons),
    resolvedUrl,
  );

  return {
    title,
    description,
    logoUrl: imageUrl || faviconUrl || getFallbackFavicon(resolvedUrl),
    resolvedUrl,
  };
}

/**
 * fetchBookmarkMetadataFromContent 供测试静态 HTML 解析路径使用。
 */
export async function fetchBookmarkMetadataFromContent(
  html: string,
  urlValue: string,
) {
  const normalizedUrl = normalizeBookmarkDomain(urlValue);
  assertHttpUrl(normalizedUrl);
  const preview = await getPreviewFromContent({
    data: html,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
    url: normalizedUrl,
  });

  return mapBookmarkMetadata(preview, normalizedUrl);
}

export async function fetchBookmarkMetadata(domain: string) {
  const normalizedUrl = normalizeBookmarkDomain(domain);
  assertHttpUrl(normalizedUrl);

  const preview = await getLinkPreview(normalizedUrl, {
    followRedirects: "follow",
    headers: {
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Bookmark/1.0 Safari/537.36",
    },
    resolveDNSHost: async (urlValue) => {
      const address = await lookup(new URL(urlValue).hostname);
      return address.address;
    },
    timeout: 5000,
  });

  return mapBookmarkMetadata(preview, normalizedUrl);
}
