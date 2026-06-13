import { Button, Message } from "@arco-design/web-react";
import { IconDesktop, IconLink } from "@arco-design/web-react/icon";
import { getBookmarkWindowApi, getErrorMessage } from "@/utils/api";
import { classNames } from "@/utils/class-name";
import styles from "./index.module.css";

type TitlebarProps = {
  metric?: string;
  view: "main" | "tray";
};

/**
 * Titlebar 渲染桌面窗口顶部拖拽栏。
 */
export function Titlebar({ metric, view }: TitlebarProps) {
  const isTrayView = view === "tray";

  async function expandToMainWindow() {
    const bookmarkWindow = getBookmarkWindowApi();

    if (!bookmarkWindow) {
      Message.error("窗口控制能力暂不可用，无法打开主窗口。");
      return;
    }

    try {
      await bookmarkWindow.showMainWindow();
    } catch (error) {
      Message.error(getErrorMessage(error, "主窗口打开失败。"));
    }
  }

  return (
    <div className={classNames(styles.titlebar, isTrayView && styles.compact)}>
      <span className={styles.brand}>
        <IconLink className={styles.brandIcon} aria-hidden="true" />
        Bookmark
        {isTrayView ? (
          <span className={styles.metric}>{metric ?? "0 个网址"}</span>
        ) : null}
      </span>

      {isTrayView ? (
        <div className={styles.actions}>
          <Button
            aria-label="打开主窗口"
            className={styles.actionButton}
            htmlType="button"
            icon={<IconDesktop />}
            size="mini"
            title="打开主窗口"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void expandToMainWindow()}
          />
        </div>
      ) : null}
    </div>
  );
}
