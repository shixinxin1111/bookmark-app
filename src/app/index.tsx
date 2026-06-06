import { AppShell } from "@/components/app-shell";
import { BookmarkManager } from "@/components/bookmark-manager";
import { FloatingBookmarks } from "@/components/floating-bookmarks";
import { Titlebar } from "@/components/titlebar";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useWindowState } from "@/hooks/use-window-state";

/**
 * App 是 Bookmark 桌面应用的渲染进程根组件。
 */
export function App() {
  const bookmarks = useBookmarks();
  const { changeWindowMode, isBusy, windowState } = useWindowState();

  const isFloating = windowState.mode !== "normal";
  const isFloatingCollapsed = windowState.mode === "miniFloating";
  const content =
    windowState.mode === "floating" ? (
      <FloatingBookmarks favoriteSites={bookmarks.favoriteSites} />
    ) : (
      <BookmarkManager {...bookmarks} />
    );

  return (
    <AppShell
      isFloating={isFloating}
      isFloatingCollapsed={isFloatingCollapsed}
      titlebar={
        <Titlebar
          isBusy={isBusy}
          isFloating={isFloating}
          isFloatingCollapsed={isFloatingCollapsed}
          metric={`${bookmarks.favoriteCount} 个网址`}
          windowMode={windowState.mode}
          onWindowModeChange={(mode) => void changeWindowMode(mode)}
        />
      }
    >
      {content}
    </AppShell>
  );
}
