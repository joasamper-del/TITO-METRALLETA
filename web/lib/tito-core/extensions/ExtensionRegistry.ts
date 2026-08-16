// Espejo de sdk/tito-internal-sdk/src/registry/ExtensionRegistry.ts. Registro en memoria
// del ciclo de vida de extensiones (register → initializeAll → ... → shutdownAll). No
// persiste nada a disco — vive mientras vive el proceso, igual que en el SDK.

import type { ExtensionContext, TitoExtension } from "./types";

export class ExtensionRegistry {
  private readonly extensions = new Map<string, TitoExtension>();

  register(extension: TitoExtension): void {
    if (this.extensions.has(extension.manifest.id)) {
      throw new Error(`Extension already registered: ${extension.manifest.id}`);
    }
    this.extensions.set(extension.manifest.id, extension);
  }

  get(id: string): TitoExtension {
    const extension = this.extensions.get(id);
    if (!extension) throw new Error(`Extension not found: ${id}`);
    return extension;
  }

  list(): TitoExtension[] {
    return [...this.extensions.values()];
  }

  async initializeAll(contextFactory: (id: string) => ExtensionContext): Promise<void> {
    for (const extension of this.extensions.values()) {
      await extension.initialize(contextFactory(extension.manifest.id));
    }
  }

  /** Orden inverso al de registro — la última extensión inicializada es la primera en apagarse. */
  async shutdownAll(): Promise<void> {
    for (const extension of [...this.extensions.values()].reverse()) {
      await extension.shutdown();
    }
  }
}
