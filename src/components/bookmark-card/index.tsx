import { useState } from "react";
import { Button, Message, Tooltip } from "@arco-design/web-react";
import {
  IconDelete,
  IconDragDotVertical,
  IconEdit,
  IconStar,
  IconStarFill,
} from "@arco-design/web-react/icon";
import { Feedback } from "@dnd-kit/dom";
import { useSortable } from "@dnd-kit/react/sortable";
import type { BookmarkSite } from "@/types/bookmark";
import { getBookmarkLinkApi, getErrorMessage } from "@/utils/api";
import { getLogoFallback } from "@/utils/bookmark-url";
import { classNames } from "@/utils/class-name";
import styles from "./index.module.css";

type BookmarkCardProps = {
  categoryId: string;
  site: BookmarkSite;
  siteIndex: number;
  onDelete(): Promise<unknown> | void;
  onEdit(): void;
  onToggleFavorite(): Promise<unknown> | void;
};

/**
 * BookmarkCard 渲染单个网站卡片，包含拖拽、打开、收藏、编辑和删除入口。
 */
export function BookmarkCard({
  categoryId,
  site,
  siteIndex,
  onDelete,
  onEdit,
  onToggleFavorite,
}: BookmarkCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { handleRef, isDragging, ref } = useSortable({
    accept: "site",
    data: {
      categoryId,
      group: categoryId,
      kind: "site",
      siteId: site.id,
    },
    group: categoryId,
    id: site.id,
    index: siteIndex,
    plugins: [Feedback.configure({ feedback: "clone" })],
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
    type: "site",
  });

  async function handleOpenSite() {
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

  return (
    <article
      ref={ref}
      className={classNames(
        styles.card,
        site.isFavorite && styles.favoriteCard,
        isDragging && styles.dragging,
      )}
    >
      <Button
        aria-label={`拖拽排序 ${site.title}`}
        className={styles.dragHandle}
        htmlType="button"
        icon={<IconDragDotVertical />}
        ref={handleRef}
        size="mini"
        type="text"
      />

      <Tooltip content={site.note || site.domain}>
        <button
          className={styles.main}
          type="button"
          onClick={() => void handleOpenSite()}
        >
          <span className={styles.logo}>
            {site.logoUrl && !imageFailed ? (
              <img
                alt=""
                src={site.logoUrl}
                onError={() => setImageFailed(true)}
              />
            ) : (
              getLogoFallback(site.title, site.domain)
            )}
          </span>
          <span className={styles.info}>
            <span className={styles.title}>{site.title}</span>
          </span>
        </button>
      </Tooltip>

      <div className={styles.actions}>
        <Button
          aria-label={site.isFavorite ? "取消收藏" : "收藏网站"}
          className={styles.favorite}
          htmlType="button"
          icon={site.isFavorite ? <IconStarFill /> : <IconStar />}
          size="mini"
          status="warning"
          type="text"
          onClick={() => void onToggleFavorite()}
        />
        <Button
          aria-label="编辑网站"
          htmlType="button"
          icon={<IconEdit />}
          size="mini"
          type="text"
          onClick={onEdit}
        />
        <Button
          aria-label="删除网站"
          htmlType="button"
          icon={<IconDelete />}
          size="mini"
          status="danger"
          type="text"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void onDelete();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        />
      </div>
    </article>
  );
}
