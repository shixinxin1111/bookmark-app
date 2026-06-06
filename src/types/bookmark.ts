export type BookmarkSite = {
  id: string;
  logoUrl: string;
  title: string;
  domain: string;
  note: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export type BookmarkCategory = {
  id: string;
  name: string;
  sites: BookmarkSite[];
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
};

export type BookmarkFormValues = {
  logoUrl: string;
  title: string;
  domain: string;
  note: string;
};

export type BookmarkCategoryFormValues = {
  name: string;
};

export type BookmarkMetadata = {
  title: string;
  description: string;
  logoUrl: string;
  resolvedUrl: string;
};
