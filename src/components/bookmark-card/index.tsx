import { useState } from "react";
import { Button, Message, Modal, Tooltip } from "@arco-design/web-react";
import {
  IconDelete,
  IconDragDotVertical,
  IconEdit,
  IconStar,
  IconStarFill,
} from "@arco-design/web-react/icon";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BookmarkSite } from "@/types/bookmark";
import { getBookmarkLinkApi, getErrorMessage } from "@/utils/api";
import { getLogoFallback } from "@/utils/bookmark-url";
import { classNames } from "@/utils/class-name";
import styles from "./index.module.css";

type BookmarkCardProps = {
  categoryId: string;
  site: BookmarkSite;
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
  onDelete,
  onEdit,
  onToggleFavorite,
}: BookmarkCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `site:${categoryId}:${site.id}`,
      data: {
        categoryId,
        kind: "site",
        siteId: site.id,
      },
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

  function handleDelete() {
    Modal.confirm({
      title: "删除网站",
      content: `确认删除「${site.title}」吗？`,
      okText: "确认删除",
      cancelText: "取消",
      onOk: () => onDelete(),
    });
  }

  return (
    <article
      ref={setNodeRef}
      className={classNames(
        styles.card,
        site.isFavorite && styles.favoriteCard,
        isDragging && styles.dragging,
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Button
        {...attributes}
        {...listeners}
        aria-label={`拖拽排序 ${site.title}`}
        className={styles.dragHandle}
        htmlType="button"
        icon={<IconDragDotVertical />}
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
          className={classNames(site.isFavorite && styles.favorite)}
          htmlType="button"
          icon={site.isFavorite ? <IconStarFill /> : <IconStar />}
          size="mini"
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
          onClick={handleDelete}
        />
      </div>
    </article>
  );
}
