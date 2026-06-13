import assert from "node:assert/strict";
import test from "node:test";

import { getTrayIconSource } from "../dist/main/trayIcon.js";

test("macOS tray icon uses a PNG data URL instead of SVG", () => {
  const source = getTrayIconSource({
    devIconPath: "/app/public/favicon.svg",
    isPackaged: false,
    packagedIconPath: "/app/dist/renderer/favicon.svg",
    platform: "darwin",
  });

  assert.equal(source.kind, "dataUrl");
  assert.match(source.value, /^data:image\/png;base64,/);
  assert.doesNotMatch(source.value, /^data:image\/svg\+xml/);
});

test("non-macOS tray icon keeps using the environment-specific file path", () => {
  assert.deepEqual(
    getTrayIconSource({
      devIconPath: "/app/public/favicon.svg",
      isPackaged: false,
      packagedIconPath: "/app/dist/renderer/favicon.svg",
      platform: "win32",
    }),
    {
      kind: "path",
      value: "/app/public/favicon.svg",
    },
  );

  assert.deepEqual(
    getTrayIconSource({
      devIconPath: "/app/public/favicon.svg",
      isPackaged: true,
      packagedIconPath: "/app/dist/renderer/favicon.svg",
      platform: "linux",
    }),
    {
      kind: "path",
      value: "/app/dist/renderer/favicon.svg",
    },
  );
});
