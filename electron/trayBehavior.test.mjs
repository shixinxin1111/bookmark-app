import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

test("tray click does not register the system context menu", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.equal(mainSource.includes("setContextMenu"), false);
});

test("tray keeps the system menu on right click", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /tray\.on\("right-click"/);
  assert.match(mainSource, /popUpContextMenu/);
});

test("tray right-click menu can open the floating tray window", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /label: "打开悬浮窗"/);
  assert.match(mainSource, /click: \(\) => \{\s*toggleTrayWindow\(\);\s*\}/);
});

test("tray click toggle is guarded from blur event ordering", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /let isTrayWindowOpen = false/);
  assert.match(mainSource, /let isTrayMouseDown = false/);
  assert.match(mainSource, /let wasTrayWindowOpenOnMouseDown = false/);
  assert.match(mainSource, /tray\.on\("mouse-down"/);
  assert.match(mainSource, /wasTrayWindowOpenOnMouseDown =\s*wasTrayWindowOpenOnMouseDown \|\| isTrayWindowOpen/);
  assert.match(mainSource, /if \(isTrayWindowOpen \|\| wasTrayWindowOpenOnMouseDown\) \{\s*hideTrayWindow\(\{ force: true \}\);[\s\S]*return;\s*}\s*showTrayWindow/);
  assert.match(mainSource, /setIgnoreDoubleClickEvents\(true\)/);
});

test("macOS menu tracking preserves tray click intent before mouse-down", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /NSMenuDidBeginTrackingNotification/);
  assert.match(mainSource, /if \(isCursorInTrayBounds\(\)\) \{\s*wasTrayWindowOpenOnMouseDown =\s*wasTrayWindowOpenOnMouseDown \|\| isTrayWindowOpen;\s*}\s*hideTrayWindow\(\{ force: true \}\);/);
});

test("tray click cancels pending auto-hide before toggling", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /let trayAutoHideTimer/);
  assert.match(mainSource, /function scheduleTrayWindowAutoHide/);
  assert.match(mainSource, /isCursorInTrayBounds/);
  assert.match(mainSource, /if \(isCursorInTrayBounds\(\)\) \{\s*return;\s*}/);
  assert.match(mainSource, /trayWindow\.on\("blur", \(\) => \{\s*scheduleTrayWindowAutoHide\(\);\s*\}\);/);
  assert.match(mainSource, /function toggleTrayWindow[\s\S]*cancelPendingTrayAutoHide\(\);[\s\S]*if \(isTrayWindowOpen \|\| wasTrayWindowOpenOnMouseDown\)/);
});

test("tray mouse-down isolates the tray click from pending auto-hide", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /function markTrayMouseDown\(\) \{\s*cancelPendingTrayAutoHide\(\);/);
  assert.doesNotMatch(mainSource, /trayMouseDownTimer = setTimeout\(\(\) => \{\s*clearTrayMouseDown\(\);\s*}, 0\);/);
  assert.match(mainSource, /trayMouseDownTimer = setTimeout\(\(\) => \{\s*clearTrayMouseDown\(\);\s*}, 500\);/);
});

test("tray auto-hide uses the next event turn instead of a visible delay", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /setTimeout\(\(\) => \{\s*trayAutoHideTimer = null;\s*hideTrayWindow\(\);\s*}, 0\)/);
});

test("tray right-click closes an open menu instead of reopening it", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /let isTrayMenuOpen = false/);
  assert.match(mainSource, /let lastTrayMenuClosedAt = 0/);
  assert.match(mainSource, /trayMenu\.on\("menu-will-show"/);
  assert.match(mainSource, /trayMenu\.on\("menu-will-close"/);
  assert.match(mainSource, /if \(isTrayMenuOpen\) \{\s*tray\?\.closeContextMenu\(\);\s*return;\s*}/);
  assert.match(mainSource, /Date\.now\(\) - lastTrayMenuClosedAt < 250/);
});

test("macOS menu bar tracking hides the floating tray window", async () => {
  const mainSource = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /NSMenuDidBeginTrackingNotification/);
  assert.match(mainSource, /hideTrayWindow/);
});
