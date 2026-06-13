const macTrayIconPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAARGVYSWZNTQAqAAAACAABh2kABAAAAAEAAAAaAAAAAAADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAASoAMABAAAAAEAAAASAAAAAJqpslUAAAHJaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA2LjAuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj42NDwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj42NDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgohBDnEAAABkUlEQVQ4EbWSMU7DQBBF/+zaDihQUEFoQLRcgT5FjoCEqDkCBRJ34AT0iCoF1NwD0YAAiQIRJbG9O/yxSBG8QUSCkSyvx/bb//8s8EclizibN5ddYK2L0dcXXT4+Y/R81J915n5NgnrDq52gcSjw26gBCQ6CDKjwiCCDp8PBwxyFD3zbLq2x5/LVfUwjxHUg4oAycF1sYFru8Y/fgTDNo6lA7YKGcC4hiGhxJuo8QhHbWy9QhDprrEjVoK5RFvQnp0DuCU5x0tYygjQSVqGjQW6lFoFkHVHPfjLWNMgUuSZc5e5ZT6LZVIrKkFVJZwtAE6rxNiWCTIFNjbBmcmEZkGUUcyh3lwbkm7uBNC4BsoyYCRUZiLZMkTImJag0u+1KnqPZ1OZAM2vMKlWLQdxdLNjAjEyVXciR1UtYwzgHmrBpDTzZhGhV05r/ArY1JRXx7DinHaDJZHKnFOFk/QA8i7GcmrRWpZuheEPpXnVcX4zfV/rjj6Jva5T+1Yf8rUX5oSG7J/db39/vH7+wx/H9Z30CP1KlygOOnA4AAAAASUVORK5CYII=";

type TrayIconSourceOptions = {
  devIconPath: string;
  isPackaged: boolean;
  packagedIconPath: string;
  platform: NodeJS.Platform;
};

export type TrayIconSource =
  | {
      kind: "dataUrl";
      value: string;
    }
  | {
      kind: "path";
      value: string;
    };

export function getTrayIconSource({
  devIconPath,
  isPackaged,
  packagedIconPath,
  platform,
}: TrayIconSourceOptions): TrayIconSource {
  if (platform === "darwin") {
    return {
      kind: "dataUrl",
      value: macTrayIconPngDataUrl,
    };
  }

  return {
    kind: "path",
    value: isPackaged ? packagedIconPath : devIconPath,
  };
}
