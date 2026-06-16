type BookmarkSite = {
  id: string;
  logoUrl: string;
  title: string;
  domain: string;
  note: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
};

type BookmarkCategory = {
  id: string;
  name: string;
  sites: BookmarkSite[];
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
};

type BookmarkFormValues = {
  logoUrl: string;
  title: string;
  domain: string;
  note: string;
};

type BookmarkCategoryFormValues = {
  name: string;
};

type BookmarkMetadata = {
  title: string;
  description: string;
  logoUrl: string;
  resolvedUrl: string;
};

type BookmarkWindowApi = {
  /**
   * showMainWindow 从菜单栏弹出窗回到主窗口。
   */
  showMainWindow(): Promise<void>;
};

type BookmarkStoreApi = {
  /**
   * list 读取主进程持久化的全部书签分类。
   */
  list(): Promise<BookmarkCategory[]>;
  /**
   * createCategory 创建一个普通分类。
   */
  createCategory(
    input: BookmarkCategoryFormValues,
  ): Promise<BookmarkCategory[]>;
  /**
   * updateCategory 更新普通分类名称。
   */
  updateCategory(
    categoryId: string,
    input: BookmarkCategoryFormValues,
  ): Promise<BookmarkCategory[]>;
  /**
   * deleteCategory 删除普通分类，可选择是否同时删除子网站。
   */
  deleteCategory(
    categoryId: string,
    deleteSites: boolean,
  ): Promise<BookmarkCategory[]>;
  /**
   * createSite 在指定分类下创建网站。
   */
  createSite(
    categoryId: string,
    input: BookmarkFormValues,
  ): Promise<BookmarkCategory[]>;
  /**
   * updateSite 更新指定网站的表单字段。
   */
  updateSite(
    categoryId: string,
    siteId: string,
    input: BookmarkFormValues,
  ): Promise<BookmarkCategory[]>;
  /**
   * deleteSite 删除指定网站。
   */
  deleteSite(categoryId: string, siteId: string): Promise<BookmarkCategory[]>;
  /**
   * toggleSiteFavorite 切换网站收藏状态。
   */
  toggleSiteFavorite(
    categoryId: string,
    siteId: string,
  ): Promise<BookmarkCategory[]>;
  /**
   * moveCategory 调整普通分类顺序。
   */
  moveCategory(
    activeCategoryId: string,
    overCategoryId: string,
  ): Promise<BookmarkCategory[]>;
  /**
   * moveSite 调整网站在分类内或跨分类的顺序。
   */
  moveSite(
    activeSiteId: string,
    fromCategoryId: string,
    toCategoryId: string,
    overSiteId?: string,
  ): Promise<BookmarkCategory[]>;
  /**
   * onDidChange 订阅主进程广播的书签数据变更。
   */
  onDidChange(listener: (categories: BookmarkCategory[]) => void): () => void;
};

type BookmarkMetadataApi = {
  /**
   * fetch 从主进程读取网页公开元信息，避免渲染层直接跨域请求。
   */
  fetch(domain: string): Promise<BookmarkMetadata>;
};

type BookmarkLinkApi = {
  /**
   * openExternal 通过系统默认浏览器打开 http/https 链接。
   */
  openExternal(url: string): Promise<void>;
};

interface Window {
  bookmarkLink?: BookmarkLinkApi;
  bookmarkMetadata?: BookmarkMetadataApi;
  bookmarkStore?: BookmarkStoreApi;
  bookmarkWindow?: BookmarkWindowApi;
}
