# 书签管理开发计划

## 概要

本次开发把当前 `Hello World` 占位页替换为完整书签管理能力，覆盖三种窗口形态：

- 主窗：按“分类名 + 网站列表”自上而下展示；支持创建、编辑、删除分类，创建、编辑、删除网站，按域名自动读取网站标题、图标和描述，分类排序，网站跨分类拖拽排序。
- 悬浮窗：只平铺展示已收藏网站，不显示分类。
- 迷你悬浮窗：只显示已收藏网址数量。

数据以本地桌面端体验为主，参考 `/Users/bytedance/Desktop/App/todo-list-app` 的实现，由 Electron 主进程把分类、网站、排序与收藏状态持久化到 `app.getPath("userData")/bookmarks.json`，渲染层只通过预加载脚本暴露的受控 API 访问数据。链接跳转同样通过 Electron 预加载脚本暴露的受控 API 调用主进程 `shell.openExternal`，从系统默认浏览器打开。

## 当前状态分析

- `src/app/index.tsx` 当前只组合 `AppShell`、`Titlebar`、`HelloWorld` 和 `useWindowState`，没有书签数据或业务 UI。
- `src/components/hello-world/index.tsx` 是占位内容，可以从 `App` 中移除引用；文件本身可保留但不再使用。
- `src/components/app-shell/index.tsx` 已负责普通窗口、悬浮窗、迷你悬浮窗根布局；迷你态当前不渲染 children，只显示标题栏，适合把数量展示放入 `Titlebar`。
- `src/components/titlebar/index.tsx` 当前迷你态展示硬编码 `Hello World`，需要改为接收可选 metric 文案，例如 `3 个网址`。
- `src/hooks/use-window-state.tsx` 已同步 Electron 窗口模式，业务页面可直接根据 `windowState.mode` 分流渲染。
- `electron/main.ts` 目前只注册窗口模式 IPC，没有书签数据存储和外链打开能力；需要新增书签存储 IPC 与 `shell.openExternal` IPC。
- `electron/main.ts` 也没有本地读取网站标题、图标和描述的能力；需要新增主进程网址信息读取能力，避免渲染层直接请求网页时遇到跨域限制。
- `electron/preload.ts` 和 `src/global.d.ts` 只暴露 `bookmarkWindow`，需要新增受控的 `bookmarkStore`、`bookmarkMetadata` 与 `bookmarkLink.openExternal(url)`。
- `src/main.tsx` 已全量引入 Arco 样式；表单、弹窗、按钮、提示浮层可直接使用 `@arco-design/web-react`。
- `package.json` 目前没有拖拽排序库和网页元信息解析库；需要新增 `@dnd-kit/core`、`@dnd-kit/sortable` 和 `link-preview-js`。项目已有 `src/utils/class-name.ts`，新组件继续使用现有 `classNames` 工具，不再新增 `classnames` 依赖。

## 修改方案

### 1. 依赖

修改 `package.json` 并更新 `pnpm-lock.yaml`：

- 新增 `@dnd-kit/core`：提供拖拽上下文、传感器、碰撞检测。
- 新增 `@dnd-kit/sortable`：提供分类和网站排序能力。
- 新增 `link-preview-js`：在 Electron 主进程根据网址读取网页公开元信息，用于自动填充网站名称、描述和图片。
- 不新增 `classnames`：继续使用现有 `src/utils/class-name.ts` 中的 `classNames` 组合样式类名。

选择 `dnd-kit` 的原因：支持 React 组件化拖拽、可访问性较好、跨容器拖拽排序实现清晰，能同时覆盖“分类排序”和“网站跨分类移动”两个需求。

不选择 `react-dnd` 的原因：它更偏底层拖拽能力，通常还需要搭配后端适配包，例如 `react-dnd-html5-backend`，分类排序和跨分类网站排序都要自己补较多排序逻辑，并不能真正减少实现复杂度。

不选择 `react-beautiful-dnd` 的原因：官方包已停止维护，后续 React 版本兼容风险更高。即使换成社区维护的 `@hello-pangea/dnd` 可以减少直接依赖数量，它的模型也更偏列表拖拽；本次网站卡片需要网格平铺和跨分类移动，`dnd-kit` 更贴合。

`@dnd-kit/utilities` 不预设排除。如果它提供了合适的转换样式方法，例如可直接处理 `useSortable()` 返回的 `transform`，可以作为直接依赖安装并使用；如果最终只需要极少量样式拼接，也可以从 `transform` 和 `transition` 手动拼出 CSS，例如 `translate3d(...)`。

### 2. 数据类型与常量

新增 `src/types/bookmark.ts`：

- `BookmarkSite`：
  - `id: string`
  - `logoUrl: string`
  - `title: string`
  - `domain: string`
  - `note: string`
  - `isFavorite: boolean`
  - `createdAt: number`
  - `updatedAt: number`
- `BookmarkCategory`：
  - `id: string`
  - `name: string`
  - `sites: BookmarkSite[]`
  - `isDefault: boolean`
  - `createdAt: number`
  - `updatedAt: number`
- `BookmarkFormValues`：网站创建/编辑表单值，只包含 `logoUrl`、`title`、`domain`、`note`。
- `BookmarkCategoryFormValues`：分类创建/编辑表单值，只包含 `name`。

新增 `src/constants/bookmark.ts`：

- `UNCATEGORIZED_CATEGORY_ID = "uncategorized"`。
- `UNCATEGORIZED_CATEGORY_NAME = "未分类"`。
- 初始化数据包含一个不可删除的 `未分类` 分类。

### 3. 主进程书签存储与网址工具

新增 `electron/bookmarkStore.ts`：

- 使用 `node:fs/promises` 读取和写入 JSON 文件，文件路径由 `electron/main.ts` 传入：`path.join(app.getPath("userData"), "bookmarks.json")`。
- 使用 `node:crypto` 的 `randomUUID()` 生成分类和网站 id，避免渲染层承担持久化细节。
- `validateBookmarksFile(value)`：校验本地 JSON 文件结构；结构错误时抛出清晰错误，提示检查本地 `bookmarks.json`。
- `normalizeCategoryInput(input)`：裁剪分类名称并校验非空。
- `normalizeSiteInput(input)`：裁剪 `logoUrl`、`title`、`domain`、`note`，校验标题和域名非空，并把域名规范化为可打开的 http/https URL。
- `ensureUncategorizedCategory(categories)`：保证“未分类”永远存在，且位于分类列表末尾。
- `createBookmarkStore(bookmarksFilePath)` 暴露 `list`、`createCategory`、`updateCategory`、`deleteCategory`、`createSite`、`updateSite`、`deleteSite`、`toggleSiteFavorite`、`moveCategory`、`moveSite`。
- 写操作使用与 `todo-list-app/electron/todoStore.ts` 相同的 `writeQueue` 串行化模式，避免并发写入覆盖。
- 文件不存在时返回只包含默认“未分类”的初始数据；文件存在但结构损坏时不静默覆盖，直接抛错并交给渲染层 `Message.error` 展示。
- 存储文件写入时使用 `JSON.stringify(categories, null, 2)` 并追加换行，保持可读性和与 todo 应用一致的格式。

新增 `electron/bookmarkStore.test.mjs`：

- 覆盖文件不存在时返回默认“未分类”。
- 覆盖新增网站会裁剪输入、补齐域名协议并持久化。
- 覆盖损坏文件会抛出格式错误。
- 覆盖并发写入通过队列串行化，不丢数据。

新增 `src/utils/bookmark-url.ts`：

- `normalizeBookmarkDomain(domain)`：去掉首尾空格；如果用户只填 `example.com`，打开时补齐为 `https://example.com`。
- `isValidBookmarkUrl(domain)`：基于标准 `URL` 判断 http/https URL 是否有效。
- `getLogoFallback(title, domain)`：图标为空或加载失败时显示标题/域名首字母。
- 该工具只服务渲染层表单即时校验和界面兜底；最终持久化前的权威校验仍放在 `electron/bookmarkStore.ts`。

### 4. 本地网址信息读取

新增 `electron/bookmarkMetadata.ts`：

- `fetchBookmarkMetadata(domain)`：接收用户输入的域名，规范化为 http/https 网址后在主进程调用 `link-preview-js` 请求页面。
- 读取响应后的最终地址，返回 `resolvedUrl`，用于处理重定向后的真实网址。
- 通过 `link-preview-js` 获取页面标题、描述和图片，并映射为 `title`、`description`、`logoUrl`。
- `logoUrl` 优先使用 `link-preview-js` 返回的图片；找不到图标时，兜底使用最终地址同源的 `/favicon.ico`。
- 不接入后端，不接入智能生成能力，不引入外部图标服务；描述只来自网页公开元信息，不做智能生成。
- 设置请求超时，限制只允许 http/https，尽量沿用 `link-preview-js` 的内容读取限制，避免异常网页拖慢应用。
- 请求失败、页面不可访问或元信息缺失时返回空字段，由用户继续手动填写。
- 本期不自行维护 HTML 元信息解析规则；如果后续准确率不足，再评估是否补充 favicon 专用解析或更完整的元信息解析方案。

新增 `electron/bookmarkMetadata.test.mjs`：

- 覆盖从静态 HTML 中提取标题、描述和图标。
- 覆盖相对图标路径补全为绝对路径。
- 覆盖缺少图标时兜底到 `/favicon.ico`。
- 覆盖非 http/https 网址会被拒绝。

### 5. 书签状态钩子

新增 `src/hooks/use-bookmarks.tsx`：

- 初始化时通过 `getBookmarkStoreApi().list()` 从主进程读取分类数据。
- 每次分类/网站变化都调用预加载脚本暴露的 `bookmarkStore` 方法，由主进程完成读写并返回最新分类列表。
- 钩子内维护 `categories`、`loading`，并用 `Message.error` 处理运行时异常。
- 暴露：
  - `categories`
  - `favoriteSites`
  - `favoriteCount`
  - `createCategory(values)`
  - `updateCategory(categoryId, values)`
  - `deleteCategory(categoryId, deleteSites)`
  - `createSite(categoryId, values)`
  - `updateSite(categoryId, siteId, values)`
  - `deleteSite(categoryId, siteId)`
  - `toggleSiteFavorite(categoryId, siteId)`
  - `moveCategory(activeCategoryId, overCategoryId)`
  - `moveSite(activeSiteId, fromCategoryId, toCategoryId, overSiteId?)`
- 所有会修改数据的方法返回 `Promise<BookmarkCategory[] | undefined>`，成功后同步更新本地 React 状态，失败时保留当前界面数据。
- 删除分类规则：
  - `未分类` 不允许删除。
  - 删除普通分类并选择“删除子网站”：分类和其中网站一起删除。
  - 删除普通分类并选择“不删除子网站”：分类删除，子网站追加移动到 `未分类`。
- 创建网站默认 `isFavorite = false`；收藏只通过网站卡片星标切换。
- 分类重名处理：不强制唯一，但空白名不允许；如后续需要唯一校验再加。

### 6. Electron 数据、网址信息与外部链接能力

修改 `electron/main.ts`：

- 从 `electron` 增加导入 `shell`。
- 从 `./bookmarkStore.js` 导入 `createBookmarkStore`、`BookmarkCategoryInput`、`BookmarkSiteInput`。
- 从 `./bookmarkMetadata.js` 导入 `fetchBookmarkMetadata`。
- 新增 `registerBookmarkStoreIpc()`，创建 `createBookmarkStore(path.join(app.getPath("userData"), "bookmarks.json"))`。
- 注册：
  - `bookmark-store:list`
  - `bookmark-store:create-category`
  - `bookmark-store:update-category`
  - `bookmark-store:delete-category`
  - `bookmark-store:create-site`
  - `bookmark-store:update-site`
  - `bookmark-store:delete-site`
  - `bookmark-store:toggle-site-favorite`
  - `bookmark-store:move-category`
  - `bookmark-store:move-site`
- 新增 `registerBookmarkMetadataIpc()`，注册 `bookmark-metadata:fetch`。
- 新增 `registerLinkIpc()`，注册 `bookmark-link:open-external`。
- 主进程校验 URL 必须是 `http:` 或 `https:`，否则抛错。
- `app.whenReady()` 中同时注册窗口 IPC、书签存储 IPC、网址信息 IPC 和链接 IPC。

修改 `electron/preload.ts`：

- 新增 `bookmarkStore`，内部调用对应的 `bookmark-store:*` 通信通道。
- 新增 `bookmarkMetadata.fetch(domain)`，内部调用 `ipcRenderer.invoke("bookmark-metadata:fetch", domain)`。
- 新增 `bookmarkLink.openExternal(url)`，内部调用 `ipcRenderer.invoke("bookmark-link:open-external", url)`。

修改 `src/global.d.ts`：

- 新增 `BookmarkStoreApi` 类型。
- 新增 `BookmarkMetadataApi` 类型。
- 新增 `BookmarkLinkApi` 类型。
- `Window` 上增加 `bookmarkStore?: BookmarkStoreApi`、`bookmarkMetadata?: BookmarkMetadataApi` 与 `bookmarkLink?: BookmarkLinkApi`。

修改 `src/utils/api.ts`：

- 新增 `getBookmarkStoreApi()`。
- 新增 `getBookmarkMetadataApi()`。
- 新增 `getBookmarkLinkApi()`。

### 7. 主窗组件

新增 `src/components/bookmark-manager/index.tsx` 与 `index.module.css`：

- 作为普通主窗内容入口。
- 顶部可放简洁标题和统计信息：分类数、网站数、已收藏数。
- 中间按分类顺序渲染分类区块。
- 底部固定或自然流式显示“创建分类”按钮。
- 管理分类弹窗、网站弹窗、删除确认弹窗的可见状态。
- 使用 `DndContext` + `SortableContext`：
  - 分类区块使用独立可排序标识。
  - 网站 id 使用组合 key，例如 `site:${categoryId}:${siteId}`，拖拽结束时解析来源分类和目标分类。
  - “添加网站”按钮不纳入可排序列表项，不能被拖拽。

新增 `src/components/bookmark-section/index.tsx` 与 `index.module.css`：

- 渲染单个分类：
  - 分类名前显示拖拽锚点按钮。
  - 分类名仅显示名称。
  - 操作区提供编辑、删除。
  - `未分类` 隐藏删除按钮，仅允许编辑名称时保持为系统默认名，计划中不提供编辑默认分类名称，避免破坏兜底语义。
- 分类下方渲染网站卡片列表。
- 最后一项为“添加网站”按钮，不参与拖拽排序。

新增 `src/components/bookmark-card/index.tsx` 与 `index.module.css`：

- 渲染网站：
  - 前置拖拽锚点。
  - 图标：优先显示 `logoUrl`，失败时显示兜底文案。
  - 标题：显示 `title`。
  - 提示浮层：鼠标悬浮显示 `note`；`note` 为空时显示域名。
  - 点击卡片主体调用外部浏览器打开域名。
  - 操作区提供星标收藏、编辑、删除。
- 删除网站使用确认弹窗，确认后直接删除。
- 操作按钮采用无内边距文本按钮，按钮间距固定 8px。

### 8. 表单和弹窗

新增 `src/components/category-form-modal/index.tsx`：

- 使用 Arco `Modal` + `Form` + `Input`。
- 创建/编辑共用一个弹窗，通过 `mode` 和 `initialValues` 区分。
- 字段：
  - `name`：必填，去除首尾空白后提交。
- 不使用 `validateTrigger={[]}` 和 `requiredSymbol={false}`。

新增 `src/components/bookmark-form-modal/index.tsx`：

- 使用 Arco `Modal` + `Form` + `Input`。
- 创建/编辑共用一个弹窗，通过 `mode` 和 `initialValues` 区分。
- 字段：
  - `logoUrl`：选填，校验为空或合法 http/https URL。
  - `title`：必填。
  - `domain`：必填，提交前归一化；校验必须能转成 http/https URL。
  - `note`：选填，使用 `Input.TextArea`。
- 域名输入框旁提供“自动获取”按钮，点击后调用 `getBookmarkMetadataApi().fetch(domain)`。
- 自动获取成功后只填充当前为空的字段：标题、图标链接、提示信息；用户已经手动填写的内容不被覆盖。
- 自动获取失败时使用 `Message.error` 提示，不阻断用户手动填写。
- 不加入收藏字段，收藏只在网站卡片星标处理。
- 表单提交失败时使用 Arco Form 自带校验提示；运行时异常统一 `Message.error`。

删除确认：

- 网站删除：`Modal.confirm` 或受控确认弹窗，按钮为取消/确认删除。
- 分类删除：使用受控 `Modal` 自定义底部区域，提供三个按钮：
  - 取消
  - 不删除子网站
  - 删除子网站

### 9. 悬浮窗与迷你悬浮窗

新增 `src/components/floating-bookmarks/index.tsx` 与 `index.module.css`：

- 只接收 `favoriteSites`。
- 不展示分类。
- 平铺展示网站图标 + 标题。
- 点击从默认浏览器打开。
- 空状态显示“暂无收藏网址”。

修改 `src/app/index.tsx`：

- 移除 `HelloWorld` 引用。
- 使用 `useBookmarks()`。
- `windowState.mode === "normal"` 时渲染 `BookmarkManager`。
- `windowState.mode === "floating"` 时渲染 `FloatingBookmarks`。
- `windowState.mode === "miniFloating"` 时 `AppShell` 不渲染 children，数量由 `Titlebar` metric 展示。
- 给 `Titlebar` 传入 `metric={`${favoriteCount} 个网址`}`。

修改 `src/components/titlebar/index.tsx`：

- 新增 `metric?: string`。
- 迷你态展示 `metric`，不再展示硬编码 `Hello World`。

### 10. 样式

样式全部使用 CSS Modules，遵循现有文件夹组织：

- `src/components/bookmark-manager/index.module.css`
- `src/components/bookmark-section/index.module.css`
- `src/components/bookmark-card/index.module.css`
- `src/components/floating-bookmarks/index.module.css`

设计方向：

- 主窗使用卡片化分区，保留现有暖色背景。
- 分类区块有清晰标题栏和轻量边框。
- 网站卡片适合网格平铺；窄宽度下自动收缩。
- 拖拽锚点使用语义图标，例如 `IconDragDotVertical` 或 Arco 可用拖拽相关图标。
- 收藏使用星标图标，未收藏与已收藏状态视觉清晰。
- 所有可点击区域设置 `-webkit-app-region: no-drag`，避免和 Electron 窗口拖拽冲突。

## 假设与决策

- `未分类` 是系统兜底分类，不允许删除；其网站可以删除。
- 删除普通分类选择“不删除子网站”时，子网站移动到 `未分类`。
- 网站创建/编辑表单只包含用户指定的四项：图标链接、标题、域名、提示信息。
- 自动获取只作为辅助能力，最终仍允许用户手动编辑图标链接、标题、域名、提示信息。
- 网址描述不做智能生成，只读取网页公开元信息；缺失时保留为空。
- 收藏状态不进入创建/编辑表单，只能在网站卡片通过星标切换。
- 创建网站默认未收藏，因此不会自动出现在悬浮窗。
- 悬浮窗显示所有已收藏网站，按当前分类顺序和分类内网站顺序拍平。
- 迷你悬浮窗显示已收藏网站数量。
- 分类排序不允许把“添加分类”按钮作为拖拽项；网站排序不允许把“添加网站”按钮作为拖拽项。
- 本次不引入后端或数据库，使用 Electron 主进程写入 `userData/bookmarks.json` 的方式本地持久化，符合当前 Electron 本地桌面应用阶段，也与 `/Users/bytedance/Desktop/App/todo-list-app` 的数据存储方式保持一致。
- 渲染层不直接读写 `localStorage` 或本地文件，数据能力统一走预加载脚本暴露的 `bookmarkStore`。
- 本地数据文件结构损坏时不自动覆盖，避免误删用户数据；由界面展示错误提示，用户可手动处理 `bookmarks.json`。
- 域名打开统一走默认浏览器，渲染层不使用 `<a target>` 直接打开。
- 表单遵守用户偏好：不使用 `validateTrigger={[]}` 和 `requiredSymbol={false}`。

## 验证步骤

执行实现后需要验证：

1. `pnpm install`：安装新增依赖并更新锁文件。
2. `pnpm build:main`：先构建 Electron 主进程，确保 `electron/bookmarkStore.ts` 可被测试文件引用。
3. `node --test electron/bookmarkStore.test.mjs`：确认书签本地 JSON 存储的读取、写入、校验和并发写入行为正确。
4. `node --test electron/bookmarkMetadata.test.mjs`：确认本地网址信息读取的标题、描述、图标和异常处理行为正确。
5. `pnpm typecheck`：确认渲染进程和 Electron 主进程类型通过。
6. `pnpm build`：确认主进程和 Vite 渲染进程构建通过。
7. 手动运行 `pnpm dev` 验证核心交互：
   - 主窗展示默认 `未分类`。
   - 可以新增、编辑、删除普通分类。
   - 删除普通分类时三个选项行为正确。
   - 可以新增、编辑、删除网站。
   - 域名和标题必填，图标和提示信息选填。
   - 输入域名后点击“自动获取”，可以回填标题、图标和提示信息；获取失败时仍可手动填写。
   - 分类可拖拽排序。
   - 网站可在分类内排序，也可拖到其他分类。
   - 添加分类/添加网站按钮不可拖拽。
   - 网站星标后出现在悬浮窗，取消星标后消失。
   - 迷你悬浮窗显示已收藏网址数量。
   - 点击网站从系统默认浏览器打开。
   - 刷新或重启应用后，分类、网站、排序和收藏状态保留。
   - 退出应用后重新启动，`app.getPath("userData")/bookmarks.json` 中的数据仍能正确恢复。
