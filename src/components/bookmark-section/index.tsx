import { Button, Empty } from "@arco-design/web-react";
import {
  IconDelete,
  IconDragDotVertical,
  IconEdit,
  IconPlus,
} from "@arco-design/web-react/icon";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookmarkCard } from "@/components/bookmark-card";
import type { BookmarkCategory, BookmarkSite } from "@/types/bookmark";
import { classNames } from "@/utils/class-name";
import styles from "./index.module.css";

type BookmarkSectionProps = {
  category: BookmarkCategory;
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
  onAddSite,
  onDeleteCategory,
  onDeleteSite,
  onEditCategory,
  onEditSite,
  onToggleSiteFavorite,
}: BookmarkSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `category:${category.id}`,
    data: {
      categoryId: category.id,
      kind: "category",
    },
    disabled: category.isDefault,
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `category-drop:${category.id}`,
    data: {
      categoryId: category.id,
      kind: "category-drop",
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={classNames(styles.section, isDragging && styles.dragging)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          {category.isDefault ? null : (
            <Button
              {...attributes}
              {...listeners}
              aria-label={`拖拽排序 ${category.name}`}
              className={styles.dragHandle}
              htmlType="button"
              icon={<IconDragDotVertical />}
              size="mini"
              type="text"
            />
          )}
          <div>
            <h2 className={styles.title}>{category.name}</h2>
            <span className={styles.count}>{category.sites.length} 个网站</span>
          </div>
        </div>

        {category.isDefault ? null : (
          <div className={styles.actions}>
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
          </div>
        )}
      </header>

      <SortableContext
        items={category.sites.map((site) => `site:${category.id}:${site.id}`)}
        strategy={rectSortingStrategy}
      >
        <div
          ref={setDroppableRef}
          className={classNames(styles.grid, isOver && styles.gridOver)}
        >
          {category.sites.map((site) => (
            <BookmarkCard
              categoryId={category.id}
              key={site.id}
              site={site}
              onDelete={() => onDeleteSite(category.id, site.id)}
              onEdit={() => onEditSite(category, site)}
              onToggleFavorite={() => onToggleSiteFavorite(category.id, site.id)}
            />
          ))}

          {category.sites.length === 0 ? (
            <Empty
              className={styles.empty}
              description="这个分类还没有网站"
            />
          ) : null}
        </div>
      </SortableContext>

      <Button
        className={styles.addSite}
        htmlType="button"
        icon={<IconPlus />}
        type="outline"
        onClick={() => onAddSite(category.id)}
      >
        添加网站
      </Button>
    </section>
  );
}
