"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
// Generar datos sintéticos para prueba
function generateTestData() {
    const bars = [];
    let price = 450; // SPY ~$450
    let date = new Date("2026-07-30T09:30:00Z");
    for (let i = 0; i < 100; i++) {
        const change = (Math.random() - 0.5) * 2; // ±1% cambio
        const close = price + change;
        const high = Math.max(price, close) + Math.abs(change) * 0.5;
        const low = Math.min(price, close) - Math.abs(change) * 0.5;
        bars.push({
            timestamp: date.toISOString(),
            open: price,
            high: high,
            low: low,
            close: close,
            volume: Math.floor(50000000 + Math.random() * 100000000), // 50M-150M
        });
        price = close;
        date = new Date(date.getTime() + 60000); // +1 min
    }
    return bars;
}
function generateVIXData(len) {
    const bars = [];
    let vixValue = 25;
    let date = new Date("2026-07-30T09:30:00Z");
    for (let i = 0; i < len; i++) {
        const change = (Math.random() - 0.5) * 5;
        vixValue = Math.max(10, Math.min(80, vixValue + change));
        bars.push({
            timestamp: date.toISOString(),
            value: vixValue,
        });
        date = new Date(date.getTime() + 60000);
    }
    return bars;
}
const spyData = generateTestData();
const qqqData = generateTestData();
const vixData = generateVIXData(spyData.length);
fs.writeFileSync("historical_SPY.json", JSON.stringify({ bars: spyData }, null, 2));
fs.writeFileSync("historical_QQQ.json", JSON.stringify({ bars: qqqData }, null, 2));
fs.writeFileSync("historical_VIX.json", JSON.stringify({ bars: vixData }, null, 2));
console.log("✅ Test data generated:");
console.log(`   - historical_SPY.json (${spyData.length} bars)`);
console.log(`   - historical_QQQ.json (${qqqData.length} bars)`);
console.log(`   - historical_VIX.json (${vixData.length} bars)\n`);
