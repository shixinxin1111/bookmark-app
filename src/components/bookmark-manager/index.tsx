import { useMemo, useState } from "react";
import { Button, Modal, Spin } from "@arco-design/web-react";
import { IconFolderAdd, IconLink, IconStar } from "@arco-design/web-react/icon";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { BookmarkFormModal } from "@/components/bookmark-form-modal";
import { BookmarkSection } from "@/components/bookmark-section";
import { CategoryFormModal } from "@/components/category-form-modal";
import type {
  BookmarkCategory,
  BookmarkCategoryFormValues,
  BookmarkFormValues,
  BookmarkSite,
} from "@/types/bookmark";
import styles from "./index.module.css";

type BookmarkManagerProps = {
  categories: BookmarkCategory[];
  favoriteCount: number;
  loading: boolean;
  createCategory(
    values: BookmarkCategoryFormValues,
  ): Promise<BookmarkCategory[] | undefined>;
  createSite(
    categoryId: string,
    values: BookmarkFormValues,
  ): Promise<BookmarkCategory[] | undefined>;
  deleteCategory(
    categoryId: string,
    deleteSites: boolean,
  ): Promise<BookmarkCategory[] | undefined>;
  deleteSite(
    categoryId: string,
    siteId: string,
  ): Promise<BookmarkCategory[] | undefined>;
  moveCategory(
    activeCategoryId: string,
    overCategoryId: string,
  ): Promise<BookmarkCategory[] | undefined>;
  moveSite(
    activeSiteId: string,
    fromCategoryId: string,
    toCategoryId: string,
    overSiteId?: string,
  ): Promise<BookmarkCategory[] | undefined>;
  toggleSiteFavorite(
    categoryId: string,
    siteId: string,
  ): Promise<BookmarkCategory[] | undefined>;
  updateCategory(
    categoryId: string,
    values: BookmarkCategoryFormValues,
  ): Promise<BookmarkCategory[] | undefined>;
  updateSite(
    categoryId: string,
    siteId: string,
    values: BookmarkFormValues,
  ): Promise<BookmarkCategory[] | undefined>;
};

type CategoryModalState = {
  mode: "create" | "edit";
  category?: BookmarkCategory;
};

type SiteModalState = {
  mode: "create" | "edit";
  categoryId: string;
  site?: BookmarkSite;
};

type DeleteSiteState = {
  categoryId: string;
  site: BookmarkSite;
};

type DragData =
  | { kind: "category"; categoryId: string }
  | { kind: "category-drop"; categoryId: string }
  | { kind: "site"; categoryId: string; siteId: string };

function getDragData(event: DragEndEvent) {
  return {
    active: event.operation.source?.data as DragData | undefined,
    over: event.operation.target?.data as DragData | undefined,
  };
}

/**
 * BookmarkManager 渲染普通主窗的完整书签管理界面。
 */
export function BookmarkManager({
  categories,
  favoriteCount,
  loading,
  createCategory,
  createSite,
  deleteCategory,
  deleteSite,
  moveCategory,
  moveSite,
  toggleSiteFavorite,
  updateCategory,
  updateSite,
}: BookmarkManagerProps) {
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>();
  const [siteModal, setSiteModal] = useState<SiteModalState>();
  const [deleteCategoryTarget, setDeleteCategoryTarget] =
    useState<BookmarkCategory>();
  const [deleteSiteTarget, setDeleteSiteTarget] = useState<DeleteSiteState>();
  const siteCount = useMemo(
    () =>
      categories.reduce((count, category) => count + category.sites.length, 0),
    [categories],
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = getDragData(event);

    if (!active || !over || event.canceled) {
      return;
    }

    if (event.operation.source?.id === event.operation.target?.id) {
      return;
    }

    const transition = event.suspend();

    if (active.kind === "category" && over.kind === "category") {
      void moveCategory(active.categoryId, over.categoryId).then(
        transition.resume,
        transition.abort,
      );
      return;
    }

    if (active.kind !== "site") {
      transition.abort();
      return;
    }

    if (over.kind === "site") {
      void moveSite(
        active.siteId,
        active.categoryId,
        over.categoryId,
        over.siteId,
      ).then(transition.resume, transition.abort);
      return;
    }

    if (over.kind === "category-drop") {
      void moveSite(active.siteId, active.categoryId, over.categoryId).then(
        transition.resume,
        transition.abort,
      );
      return;
    }

    transition.abort();
  }

  async function handleCategorySubmit(values: BookmarkCategoryFormValues) {
    const result = categoryModal?.category
      ? await updateCategory(categoryModal.category.id, values)
      : await createCategory(values);

    if (result) {
      setCategoryModal(undefined);
    }
  }

  async function handleSiteSubmit(values: BookmarkFormValues) {
    if (!siteModal) {
      return;
    }

    const result = siteModal.site
      ? await updateSite(siteModal.categoryId, siteModal.site.id, values)
      : await createSite(siteModal.categoryId, values);

    if (result) {
      setSiteModal(undefined);
    }
  }

  async function handleDeleteCategory(deleteSites: boolean) {
    if (!deleteCategoryTarget) {
      return;
    }

    const result = await deleteCategory(deleteCategoryTarget.id, deleteSites);

    if (result) {
      setDeleteCategoryTarget(undefined);
    }
  }

  async function handleDeleteSite() {
    if (!deleteSiteTarget) {
      return;
    }

    const result = await deleteSite(
      deleteSiteTarget.categoryId,
      deleteSiteTarget.site.id,
    );

    if (result) {
      setDeleteSiteTarget(undefined);
    }
  }

  return (
    <div className={styles.manager}>
      <header className={styles.hero}>
        <div className={styles.heading}>
          <h1 className={styles.title}>书签管理</h1>
        </div>

        <div className={styles.stats}>
          <span>
            <strong>{categories.length}</strong>
            分类
          </span>
          <span>
            <IconLink />
            <strong>{siteCount}</strong>
            网站
          </span>
          <span>
            <IconStar />
            <strong>{favoriteCount}</strong>
            收藏
          </span>
        </div>
      </header>

      <Spin block loading={loading} className={styles.body}>
        <DragDropProvider onDragEnd={(event) => void handleDragEnd(event)}>
          <div className={styles.sections}>
            {categories.map((category, categoryIndex) => (
              <BookmarkSection
                category={category}
                categoryIndex={categoryIndex}
                key={category.id}
                onAddSite={(categoryId) =>
                  setSiteModal({ mode: "create", categoryId })
                }
                onDeleteCategory={setDeleteCategoryTarget}
                onDeleteSite={(categoryId, siteId) => {
                  const site = category.sites.find(
                    (candidate) => candidate.id === siteId,
                  );

                  if (site) {
                    setDeleteSiteTarget({ categoryId, site });
                  }
                }}
                onEditCategory={(nextCategory) =>
                  setCategoryModal({
                    mode: "edit",
                    category: nextCategory,
                  })
                }
                onEditSite={(nextCategory, site) =>
                  setSiteModal({
                    mode: "edit",
                    categoryId: nextCategory.id,
                    site,
                  })
                }
                onToggleSiteFavorite={toggleSiteFavorite}
              />
            ))}
          </div>
        </DragDropProvider>
      </Spin>

      <Button
        className={styles.createCategory}
        htmlType="button"
        icon={<IconFolderAdd />}
        type="primary"
        onClick={() => setCategoryModal({ mode: "create" })}
      >
        创建分类
      </Button>

      <CategoryFormModal
        initialValues={
          categoryModal?.category
            ? { name: categoryModal.category.name }
            : undefined
        }
        mode={categoryModal?.mode ?? "create"}
        visible={Boolean(categoryModal)}
        onCancel={() => setCategoryModal(undefined)}
        onSubmit={handleCategorySubmit}
      />

      <BookmarkFormModal
        initialValues={
          siteModal?.site
            ? {
                logoUrl: siteModal.site.logoUrl,
                title: siteModal.site.title,
                domain: siteModal.site.domain,
                note: siteModal.site.note,
              }
            : undefined
        }
        mode={siteModal?.mode ?? "create"}
        visible={Boolean(siteModal)}
        onCancel={() => setSiteModal(undefined)}
        onSubmit={handleSiteSubmit}
      />

      <Modal
        title="删除分类"
        visible={Boolean(deleteCategoryTarget)}
        footer={
          <div className={styles.deleteFooter}>
            <Button onClick={() => setDeleteCategoryTarget(undefined)}>
              取消
            </Button>
            <Button onClick={() => void handleDeleteCategory(false)}>
              不删除子网站
            </Button>
            <Button
              status="danger"
              type="primary"
              onClick={() => void handleDeleteCategory(true)}
            >
              删除子网站
            </Button>
          </div>
        }
        onCancel={() => setDeleteCategoryTarget(undefined)}
      >
        删除「{deleteCategoryTarget?.name}」后，可以选择把子网站移动到未分类，
        或一起删除。
      </Modal>

      <Modal
        title="删除网站"
        visible={Boolean(deleteSiteTarget)}
        footer={
          <div className={styles.deleteFooter}>
            <Button onClick={() => setDeleteSiteTarget(undefined)}>取消</Button>
            <Button
              status="danger"
              type="primary"
              onClick={() => void handleDeleteSite()}
            >
              确认删除
            </Button>
          </div>
        }
        onCancel={() => setDeleteSiteTarget(undefined)}
      >
        确认删除「{deleteSiteTarget?.site.title}」吗？
      </Modal>
    </div>
  );
}
