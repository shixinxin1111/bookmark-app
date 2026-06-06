import { AppShell } from "@/components/app-shell";
import { HelloWorld } from "@/components/hello-world";
import { Titlebar } from "@/components/titlebar";
import { useWindowState } from "@/hooks/use-window-state";

/**
 * App 是 Bookmark 桌面应用的渲染进程根组件。
 *
 * 当前阶段只保留三种窗口形态切换能力，具体书签管理功能后续再接入。
 */
export function App() {
  const { changeWindowMode, isBusy, windowState } = useWindowState();

  const isFloating = windowState.mode !== "normal";
  const isFloatingCollapsed = windowState.mode === "miniFloating";

  return (
    <AppShell
      isFloating={isFloating}
      isFloatingCollapsed={isFloatingCollapsed}
      titlebar={
        <Titlebar
          isBusy={isBusy}
          isFloating={isFloating}
          isFloatingCollapsed={isFloatingCollapsed}
          windowMode={windowState.mode}
          onWindowModeChange={(mode) => void changeWindowMode(mode)}
        />
      }
    >
      <HelloWorld />
    </AppShell>
  );
}
