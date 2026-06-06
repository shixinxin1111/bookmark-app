import type { BookmarkCategory } from "@/types/bookmark";

export const UNCATEGORIZED_CATEGORY_ID = "uncategorized";
export const UNCATEGORIZED_CATEGORY_NAME = "未分类";

export const initialBookmarkCategories: BookmarkCategory[] = [
  {
    id: UNCATEGORIZED_CATEGORY_ID,
    name: UNCATEGORIZED_CATEGORY_NAME,
    sites: [],
    isDefault: true,
    createdAt: 0,
    updatedAt: 0,
  },
];
