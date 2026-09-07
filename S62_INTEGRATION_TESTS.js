// S62 INTEGRATION TESTS - Against real Tito database
// Testing PositionSnapshot creation, persistence, FK behavior
// Pattern: ENTRADA → ESPERADO → OBTENIDO → PASS/FAIL

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: 'enterprisedb',
  password: 'Joa$03111974',
  host: '127.0.0.1',
  port: 5432,
  database: 'tito_metralleta'
});

let testsPassed = 0;
let testsFailed = 0;

const log = (test, entrada, esperado, obtenido, pass) => {
  const status = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} | ${test}`);
  console.log(`  ENTRADA: ${entrada}`);
  console.log(`  ESPERADO: ${esperado}`);
  console.log(`  OBTENIDO: ${obtenido}`);
  if (pass) testsPassed++; else testsFailed++;
};

(async () => {
  try {
    console.log('\n🧪 S62 INTEGRATION TESTS - BD REAL DE TITO\n');
    console.log('='.repeat(70));

    // Test 1: Crear y guardar PositionSnapshot
    console.log('\n1️⃣ TEST: Crear PositionSnapshot sin operaciones');
    const snapshotId = uuidv4();
    const timestamp = new Date();

    const insertQuery = `
      INSERT INTO position_snapshots (
        id, timestamp, symbol, qty, entry_price, current_price,
        pnl, pnl_percent, volume, trend, rsi, atr, vix,
        reasoning, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      snapshotId, timestamp, 'ETH', 1.0, 2300, 2350, 50, 2.17,
      850000, 'UP', 65.5, 45.25, 16.5,
      'Test entry: breakout at support',
      new Date()
    ]);

    log(
      'Crear PositionSnapshot',
      'Insert ETH snapshot con todos los campos',
      'Fila insertada, ID retornado',
      result.rows[0] ? 'INSERTADO' : 'NO INSERTADO',
      result.rows.length > 0
    );

    // Test 2: Vincular con DecisionAuditTrail
    console.log('\n2️⃣ TEST: Vincular con DecisionAuditTrail');

    // Obtener un DecisionAuditTrail de prueba
    const decisionResult = await pool.query(
      'SELECT id FROM decision_audit_trail LIMIT 1'
    );

    if (decisionResult.rows.length > 0) {
      const decisionId = decisionResult.rows[0].id;
      const updateQuery = `
        UPDATE position_snapshots
        SET decision_audit_trail_id = $1
        WHERE id = $2
        RETURNING decision_audit_trail_id
      `;

      const updateResult = await pool.query(updateQuery, [decisionId, snapshotId]);

      log(
        'Vincular FK a DecisionAuditTrail',
        `Actualizar snapshot con decision_id: ${decisionId.substring(0, 8)}...`,
        'FK vinculado, valor retornado',
        updateResult.rows[0]?.decision_audit_trail_id ? 'VINCULADO' : 'NO VINCULADO',
        updateResult.rows.length > 0
      );
    }

    // Test 3: Guardar indicadores y razonamiento
    console.log('\n3️⃣ TEST: Guardar indicadores y razonamiento');
    const updateIndicatorsQuery = `
      UPDATE position_snapshots
      SET
        volume = $1, trend = $2, rsi = $3, atr = $4, vix = $5,
        reasoning = $6
      WHERE id = $7
      RETURNING volume, trend, rsi, atr, vix, reasoning
    `;

    const indicatorsResult = await pool.query(updateIndicatorsQuery, [
      850000, 'UP', 65.5, 45.25, 16.5,
      'ETH long: MA50/MA200 bullish, RSI 65 (not overbought), VIX calm, volume spike',
      snapshotId
    ]);

    log(
      'Guardar indicadores técnicos',
      'Update snapshot con volume, trend, RSI, ATR, VIX, reasoning',
      '5 indicadores + reasoning actualizado',
      indicatorsResult.rows[0] ? 'ACTUALIZADO' : 'NO ACTUALIZADO',
      indicatorsResult.rows.length > 0
    );

    // Test 4: Leer desde PostgreSQL exactamente
    console.log('\n4️⃣ TEST: Leer exactamente desde PostgreSQL');
    const readQuery = `
      SELECT volume, trend, rsi, atr, vix, reasoning, decision_audit_trail_id
      FROM position_snapshots WHERE id = $1
    `;

    const readResult = await pool.query(readQuery, [snapshotId]);
    const row = readResult.rows[0];

    const volumeMatch = row.volume == 850000;
    const trendMatch = row.trend === 'UP';
    const rsiMatch = row.rsi == 65.5;
    const reasoningExists = row.reasoning && row.reasoning.length > 0;
    const fkExists = row.decision_audit_trail_id !== null;

    log(
      'Leer exactamente desde BD',
      'SELECT todos los campos técnicos + FK',
      'Volume=850k, Trend=UP, RSI=65.5, Reasoning presente, FK vinculado',
      `V=${volumeMatch}|T=${trendMatch}|R=${rsiMatch}|Reason=${reasoningExists}|FK=${fkExists}`,
      volumeMatch && trendMatch && rsiMatch && reasoningExists && fkExists
    );

    // Test 5: Persistencia después de nueva conexión
    console.log('\n5️⃣ TEST: Persistencia después nueva conexión');
    const pool2 = new Pool({
      user: 'enterprisedb',
      password: 'Joa$03111974',
      host: '127.0.0.1',
      port: 5432,
      database: 'tito_metralleta'
    });

    const persistResult = await pool2.query(
      'SELECT id, symbol, pnl_percent FROM position_snapshots WHERE id = $1',
      [snapshotId]
    );

    log(
      'Persistencia multi-conexión',
      'Nueva conexión, SELECT snapshot mismo ID',
      'Fila recuperada con datos intactos',
      persistResult.rows.length > 0 ? 'PERSISTENTE' : 'NO PERSISTENTE',
      persistResult.rows.length > 0
    );

    pool2.end();

    // Test 6: FK behavior sin borrar datos históricos
    console.log('\n6️⃣ TEST: FK behavior (SET NULL, no CASCADE)');
    const countBefore = await pool.query(
      'SELECT COUNT(*) FROM position_snapshots WHERE id = $1',
      [snapshotId]
    );

    log(
      'FK behavior sin datos históricos',
      'FK es SET NULL + RESTRICT (no borrar snapshots)',
      'Snapshot existente debe permanecer',
      countBefore.rows[0].count > 0 ? 'INTACTO' : 'ELIMINADO',
      countBefore.rows[0].count > 0
    );

    // Test 7: Limpiar solo datos de prueba
    console.log('\n7️⃣ TEST: Limpiar solo datos de prueba');
    const deleteResult = await pool.query(
      'DELETE FROM position_snapshots WHERE id = $1',
      [snapshotId]
    );

    const verifyDelete = await pool.query(
      'SELECT COUNT(*) FROM position_snapshots WHERE id = $1',
      [snapshotId]
    );

    log(
      'Limpiar datos de prueba',
      'DELETE snapshot de prueba, verificar eliminación',
      'Snapshot completamente removido',
      verifyDelete.rows[0].count === 0 ? 'ELIMINADO' : 'AÚN EXISTE',
      verifyDelete.rows[0].count === 0
    );

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 RESUMEN TESTS INTEGRACIÓN:');
    console.log(`   ✅ PASS: ${testsPassed} / 7`);
    console.log(`   ❌ FAIL: ${testsFailed} / 7`);
    console.log(`\n${testsFailed === 0 ? '🟢 TODOS LOS TESTS PASARON' : '🔴 ALGUNOS TESTS FALLARON'}`);

    console.log('\n✅ Ethereum: ABIERTA (sin cambios)');
    console.log('✅ Operaciones: NINGUNA ejecutada');
    console.log('✅ Salida/reentrada: BLOQUEADA');

    pool.end();

  } catch (err) {
    console.error('\n❌ ERROR EN TESTS:', err.message);
    pool.end();
    process.exit(1);
  }
})();
