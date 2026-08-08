// Persistencia del buzón de alertas de TradingView. web/data/alerts.json (gitignored).
// Solo servidor. La lógica pura (parseo, validación, filtrado) vive en `alert.ts`.
//
// Es un buzón, no un log eterno: se guardan las últimas MAX_ALERTS y las viejas se
// descartan, para que un webhook público no pueda llenar el disco.

import { promises as fs } from "fs";
import path from "path";
import type { TradingViewAlert } from "./alert";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "alerts.json");
const MAX_ALERTS = 500;

export interface StoredAlerts {
  updatedAt: string;
  items: TradingViewAlert[];
}

const EMPTY: StoredAlerts = { updatedAt: "", items: [] };

export async function loadAlerts(): Promise<StoredAlerts> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredAlerts;
    return Array.isArray(parsed.items) ? { ...EMPTY, ...parsed } : EMPTY;
  } catch {
    return EMPTY; // aún no ha llegado ninguna alerta
  }
}

async function saveAlerts(items: TradingViewAlert[]): Promise<StoredAlerts> {
  const payload: StoredAlerts = { updatedAt: new Date().toISOString(), items };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

/** Añade una alerta al buzón, recortando a las MAX_ALERTS más recientes. */
export async function appendAlert(alert: TradingViewAlert): Promise<StoredAlerts> {
  const stored = await loadAlerts();
  const items = [...stored.items, alert].slice(-MAX_ALERTS);
  return saveAlerts(items);
}
