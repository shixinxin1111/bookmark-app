import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { BookmarkManager } from "@/components/bookmark-manager";
import { FloatingBookmarks } from "@/components/floating-bookmarks";
import { Titlebar } from "@/components/titlebar";
import { useBookmarks } from "@/hooks/use-bookmarks";

/**
 * App 是 Bookmark 桌面应用的渲染进程根组件。
 */
export function App() {
  const bookmarks = useBookmarks();
  const isTrayView = useMemo(
    () => new URLSearchParams(window.location.search).get("view") === "tray",
    [],
  );

  return (
    <AppShell
      isCompact={isTrayView}
      titlebar={
        <Titlebar
          metric={`${bookmarks.favoriteCount} 个网址`}
          view={isTrayView ? "tray" : "main"}
        />
      }
    >
      {isTrayView ? (
        <FloatingBookmarks favoriteSites={bookmarks.favoriteSites} />
      ) : (
        <BookmarkManager {...bookmarks} />
      )}
    </AppShell>
  );
}
