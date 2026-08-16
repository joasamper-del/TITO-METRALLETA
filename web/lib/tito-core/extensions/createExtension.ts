// Espejo de sdk/tito-internal-sdk/src/extensions/createExtension.ts. Helper de tipado —
// no hace nada en runtime, solo obliga a que el objeto que le pasen cumpla TitoExtension.

import type { TitoExtension } from "./types";

export function defineTitoExtension<T extends TitoExtension>(extension: T): T {
  return extension;
}
