import { describe, it, expect } from "vitest";
import { ExtensionRegistry } from "./ExtensionRegistry";
import { defineTitoExtension } from "./createExtension";
import type { ExtensionContext, TitoExtension } from "./types";

function testExtension(id: string, log: string[]): TitoExtension {
  return defineTitoExtension({
    manifest: {
      id, name: id, version: "0.1.0", sdkVersion: "0.1.0",
      capabilities: ["analytics"], description: `extensión de prueba ${id}`,
    },
    async initialize() {
      log.push(`init:${id}`);
    },
    async healthCheck() {
      return { status: "healthy" };
    },
    async shutdown() {
      log.push(`shutdown:${id}`);
    },
  });
}

function testContext(): ExtensionContext {
  return {
    services: {
      logger: { info() {}, warn() {}, error() {} },
      now: () => new Date().toISOString(),
      publish: async () => {},
    },
    config: {},
  };
}

describe("ExtensionRegistry", () => {
  it("register + get devuelve la misma extensión", () => {
    const registry = new ExtensionRegistry();
    const ext = testExtension("tito.test", []);
    registry.register(ext);
    expect(registry.get("tito.test")).toBe(ext);
  });

  it("rechaza registrar dos veces el mismo manifest.id", () => {
    const registry = new ExtensionRegistry();
    registry.register(testExtension("tito.test", []));
    expect(() => registry.register(testExtension("tito.test", []))).toThrow(
      "Extension already registered: tito.test",
    );
  });

  it("get lanza si el id no está registrado", () => {
    const registry = new ExtensionRegistry();
    expect(() => registry.get("no-existe")).toThrow("Extension not found: no-existe");
  });

  it("list devuelve todas las extensiones registradas", () => {
    const registry = new ExtensionRegistry();
    const a = testExtension("a", []);
    const b = testExtension("b", []);
    registry.register(a);
    registry.register(b);
    expect(registry.list()).toEqual([a, b]);
  });

  it("initializeAll llama initialize en cada extensión con el contexto de la factory", async () => {
    const log: string[] = [];
    const registry = new ExtensionRegistry();
    registry.register(testExtension("a", log));
    registry.register(testExtension("b", log));
    await registry.initializeAll(() => testContext());
    expect(log).toEqual(["init:a", "init:b"]);
  });

  it("shutdownAll apaga en orden inverso al de registro", async () => {
    const log: string[] = [];
    const registry = new ExtensionRegistry();
    registry.register(testExtension("a", log));
    registry.register(testExtension("b", log));
    registry.register(testExtension("c", log));
    await registry.shutdownAll();
    expect(log).toEqual(["shutdown:c", "shutdown:b", "shutdown:a"]);
  });
});
