import { Button } from "@arco-design/web-react";
import {
  IconDelete,
  IconDragDotVertical,
  IconEdit,
  IconPlus,
} from "@arco-design/web-react/icon";
import { CollisionPriority } from "@dnd-kit/abstract";
import { useSortable } from "@dnd-kit/react/sortable";
import { BookmarkCard } from "@/components/bookmark-card";
import type { BookmarkCategory, BookmarkSite } from "@/types/bookmark";
import { classNames } from "@/utils/class-name";
import styles from "./index.module.css";

type BookmarkSectionProps = {
  category: BookmarkCategory;
  categoryIndex: number;
  onAddSite(categoryId: string): void;
  onDeleteCategory(category: BookmarkCategory): void;
  onDeleteSite(categoryId: string, siteId: string): Promise<unknown> | void;
  onEditCategory(category: BookmarkCategory): void;
  onEditSite(category: BookmarkCategory, site: BookmarkSite): void;
  onToggleSiteFavorite(
    categoryId: string,
    siteId: string,
  ): Promise<unknown> | void;
};

/**
 * BookmarkSection 渲染单个分类区块和分类下的网站网格。
 */
export function BookmarkSection({
  category,
  categoryIndex,
  onAddSite,
  onDeleteCategory,
  onDeleteSite,
  onEditCategory,
  onEditSite,
  onToggleSiteFavorite,
}: BookmarkSectionProps) {
  const { handleRef, isDragging, ref } = useSortable({
    accept: ["column", "site"],
    collisionPriority: CollisionPriority.Low,
    data: {
      categoryId: category.id,
      kind: "site-list",
    },
    id: category.id,
    index: categoryIndex,
    type: "column",
  });

  return (
    <section
      ref={ref}
      className={classNames(styles.section, isDragging && styles.dragging)}
    >
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <Button
            aria-label={`拖拽排序 ${category.name}`}
            className={styles.dragHandle}
            htmlType="button"
            icon={<IconDragDotVertical />}
            ref={handleRef}
            size="mini"
            type="text"
          />
          <div className={styles.heading}>
            <h2 className={styles.title}>{category.name}</h2>
            <span className={styles.count}>{category.sites.length} 个网站</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            htmlType="button"
            icon={<IconPlus />}
            size="mini"
            type="text"
            onClick={() => onAddSite(category.id)}
          >
            添加网站
          </Button>
          {category.isDefault ? null : (
            <>
              <Button
                htmlType="button"
                icon={<IconEdit />}
                size="mini"
                type="text"
                onClick={() => onEditCategory(category)}
              >
                编辑
              </Button>
              <Button
                htmlType="button"
                icon={<IconDelete />}
                size="mini"
                status="danger"
                type="text"
                onClick={() => onDeleteCategory(category)}
              >
                删除
              </Button>
            </>
          )}
        </div>
      </header>

      <div className={styles.grid}>
        {category.sites.map((site, siteIndex) => (
          <BookmarkCard
            categoryId={category.id}
            key={site.id}
            site={site}
            siteIndex={siteIndex}
            onDelete={() => onDeleteSite(category.id, site.id)}
            onEdit={() => onEditSite(category, site)}
            onToggleFavorite={() => onToggleSiteFavorite(category.id, site.id)}
          />
        ))}
        {category.sites.length === 0 ? (
          <div
            className={classNames(
              styles.emptyDropZone,
              isDragging && styles.gridOver,
            )}
          >
            拖拽网站到这里
          </div>
        ) : null}
      </div>
    </section>
  );
}
