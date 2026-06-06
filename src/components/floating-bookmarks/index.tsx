import { Message, Empty } from "@arco-design/web-react";
import type { BookmarkSite } from "@/types/bookmark";
import { getBookmarkLinkApi, getErrorMessage } from "@/utils/api";
import { getLogoFallback } from "@/utils/bookmark-url";
import styles from "./index.module.css";

type FloatingBookmarksProps = {
  favoriteSites: BookmarkSite[];
};

/**
 * FloatingBookmarks 渲染悬浮窗中的收藏网站平铺列表。
 */
export function FloatingBookmarks({ favoriteSites }: FloatingBookmarksProps) {
  async function handleOpenSite(site: BookmarkSite) {
    const bookmarkLink = getBookmarkLinkApi();

    if (!bookmarkLink) {
      Message.error("外部链接打开能力暂不可用。");
      return;
    }

    try {
      await bookmarkLink.openExternal(site.domain);
    } catch (error) {
      Message.error(getErrorMessage(error, "网站打开失败。"));
    }
  }

  if (favoriteSites.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <Empty description="暂无收藏网址" />
      </div>
    );
  }

  return (
    <div className={styles.floating}>
      {favoriteSites.map((site) => (
        <button
          className={styles.item}
          key={site.id}
          title={site.note || site.domain}
          type="button"
          onClick={() => void handleOpenSite(site)}
        >
          <span className={styles.logo}>
            {site.logoUrl ? (
              <img alt="" src={site.logoUrl} />
            ) : (
              getLogoFallback(site.title, site.domain)
            )}
          </span>
          <span className={styles.title}>{site.title}</span>
        </button>
      ))}
    </div>
  );
}
