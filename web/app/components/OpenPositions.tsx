"use client";

import { useEffect, useState } from "react";

interface Position {
  symbol: string;
  qty: number;
  avgFillPrice: number | null;
  currentPrice: number;
  positionValue: number;
  pnlDollars: number;
  pnlPercent: number;
  assetClass: string;
  entryTime: string;
  status: string;
}

export function OpenPositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchPositions = async () => {
    try {
      const res = await fetch("/api/positions");
      const data = await res.json();
      setPositions(data.positions || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching positions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && positions.length === 0) {
    return <div className="p-4 text-gray-600">Cargando posiciones...</div>;
  }

  if (positions.length === 0) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800">✅ Sin posiciones abiertas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">📊 POSICIONES ABIERTAS</h3>
        <span className="text-xs text-gray-500">Actualizado: {lastUpdate}</span>
      </div>

      {positions.map((pos) => (
        <div
          key={pos.symbol}
          className="border border-gray-300 rounded-lg p-4 bg-white"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Header */}
            <div className="col-span-2 flex justify-between items-center border-b pb-2 mb-2">
              <div>
                <p className="font-bold text-lg">{pos.symbol}</p>
                <p className="text-xs text-gray-600 uppercase">{pos.assetClass}</p>
              </div>
              <div className="text-right">
                <p
                  className={`font-bold text-lg ${
                    pos.pnlPercent >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {pos.pnlPercent >= 0 ? "+" : ""}
                  {pos.pnlPercent.toFixed(2)}%
                </p>
                <p
                  className={`text-sm ${
                    pos.pnlDollars >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {pos.pnlDollars >= 0 ? "+$" : "-$"}
                  {Math.abs(pos.pnlDollars).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <p className="text-xs text-gray-600">Cantidad</p>
              <p className="font-mono text-sm">{pos.qty.toFixed(8)}</p>
            </div>

            {/* Precio Entrada */}
            <div>
              <p className="text-xs text-gray-600">Precio Entrada</p>
              <p className="font-mono text-sm">
                ${pos.avgFillPrice ? pos.avgFillPrice.toFixed(2) : "N/A"}
              </p>
            </div>

            {/* Precio Actual */}
            <div>
              <p className="text-xs text-gray-600">Precio Actual</p>
              <p className="font-mono text-sm font-bold">
                ${pos.currentPrice.toFixed(2)}
              </p>
            </div>

            {/* Valor Posición */}
            <div>
              <p className="text-xs text-gray-600">Valor Posición</p>
              <p className="font-mono text-sm">${pos.positionValue.toFixed(2)}</p>
            </div>

            {/* Stop Loss */}
            <div>
              <p className="text-xs text-gray-600">Stop Loss</p>
              <p className="font-mono text-sm text-red-600">
                ${(pos.avgFillPrice ? pos.avgFillPrice * 0.97 : 0).toFixed(2)}
              </p>
            </div>

            {/* Take Profit */}
            <div>
              <p className="text-xs text-gray-600">Take Profit</p>
              <p className="font-mono text-sm text-green-600">
                ${(pos.avgFillPrice ? pos.avgFillPrice * 1.05 : 0).toFixed(2)}
              </p>
            </div>

            {/* Hora de Entrada */}
            <div className="col-span-2">
              <p className="text-xs text-gray-600">Entrada</p>
              <p className="font-mono text-xs">
                {new Date(pos.entryTime).toLocaleString()}
              </p>
            </div>

            {/* Estado */}
            <div className="col-span-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                {pos.status}
              </span>
            </div>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-500 text-center mt-4">
        ⏱️ Se actualiza automáticamente cada 5 segundos
      </p>
    </div>
  );
}
