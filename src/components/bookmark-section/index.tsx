import { useCallback } from "react";
import { Button } from "@arco-design/web-react";
import {
  IconDelete,
  IconDragDotVertical,
  IconEdit,
  IconPlus,
} from "@arco-design/web-react/icon";
import { useDroppable } from "@dnd-kit/react";
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
  const {
    handleRef,
    isDragging,
    ref: categoryRef,
  } = useSortable({
    accept: "category",
    data: {
      categoryId: category.id,
      kind: "category",
    },
    disabled: category.isDefault,
    group: "categories",
    id: `category:${category.id}`,
    index: categoryIndex,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
    type: "category",
  });
  const { isDropTarget, ref: categoryDropRef } = useDroppable({
    accept: "site",
    data: {
      categoryId: category.id,
      kind: "category-drop",
    },
    id: `category-drop:${category.id}`,
  });
  const setSectionRef = useCallback(
    (element: HTMLElement | null) => {
      categoryRef(element);
      categoryDropRef(element);
    },
    [categoryDropRef, categoryRef],
  );

  return (
    <section
      ref={setSectionRef}
      className={classNames(styles.section, isDragging && styles.dragging)}
    >
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          {category.isDefault ? null : (
            <Button
              aria-label={`拖拽排序 ${category.name}`}
              className={styles.dragHandle}
              htmlType="button"
              icon={<IconDragDotVertical />}
              ref={handleRef}
              size="mini"
              type="text"
            />
          )}
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

      <div className={classNames(styles.grid, isDropTarget && styles.gridOver)}>
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
      </div>
    </section>
  );
}
