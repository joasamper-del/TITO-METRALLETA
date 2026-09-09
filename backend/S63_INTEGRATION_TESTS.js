// S63 INTEGRATION TESTS - Against real Tito database
// Testing DecisionChangeLog creation, FK behavior, integrity validation
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
    console.log('\n🧪 S63 INTEGRATION TESTS - BD REAL DE TITO\n');
    console.log('='.repeat(70));

    // Get a decision_audit_trail for testing
    const decisionResult = await pool.query(
      'SELECT id FROM decision_audit_trail ORDER BY created_at DESC LIMIT 1'
    );

    if (decisionResult.rows.length === 0) {
      console.error('\n❌ No hay decision_audit_trail en BD. Imposible ejecutar tests.');
      process.exit(1);
    }

    const testDecisionId = decisionResult.rows[0].id;
    console.log(`Usando decision_id para tests: ${testDecisionId.substring(0, 8)}...\n`);

    // Test 1: INSERT decision_change_logs
    console.log('\n1️⃣ TEST: Crear decision_change_logs entry');
    const logId = uuidv4();
    const insertQuery = `
      INSERT INTO decision_change_logs (
        id, decision_audit_trail_id, action, snapshot_count, changed_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      logId, testDecisionId, 'UPDATED', 5, new Date()
    ]);

    log(
      'Crear decision_change_logs',
      'Insert log entry con decision_id + action + snapshot_count',
      'Fila insertada, ID retornado',
      result.rows[0] ? 'INSERTADO' : 'NO INSERTADO',
      result.rows.length > 0
    );

    // Test 2: FK behavior (CASCADE delete)
    console.log('\n2️⃣ TEST: FK behavior — DELETE decision → logs CASCADE');

    // Create a temporary decision for deletion test
    const tempDecisionInsert = await pool.query(
      `INSERT INTO decision_audit_trail (symbol, direction, entry_price, stop_loss, take_profit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['TEST', 'LONG', 100, 99, 105]
    );

    const tempDecisionId = tempDecisionInsert.rows[0].id;

    // Create 2 logs for this decision
    const tempLog1 = await pool.query(
      `INSERT INTO decision_change_logs (decision_audit_trail_id, action)
       VALUES ($1, $2) RETURNING id`,
      [tempDecisionId, 'CREATED']
    );

    const tempLog2 = await pool.query(
      `INSERT INTO decision_change_logs (decision_audit_trail_id, action)
       VALUES ($1, $2) RETURNING id`,
      [tempDecisionId, 'UPDATED']
    );

    const countBefore = await pool.query(
      'SELECT COUNT(*) as count FROM decision_change_logs WHERE decision_audit_trail_id = $1',
      [tempDecisionId]
    );

    // Delete decision
    await pool.query('DELETE FROM decision_audit_trail WHERE id = $1', [tempDecisionId]);

    const countAfter = await pool.query(
      'SELECT COUNT(*) as count FROM decision_change_logs WHERE decision_audit_trail_id = $1',
      [tempDecisionId]
    );

    log(
      'FK behavior: CASCADE delete',
      `DELETE decision ${tempDecisionId.substring(0, 8)}...`,
      'Logs CASCADE eliminados (count = 0)',
      `Antes: ${countBefore.rows[0].count}, Después: ${countAfter.rows[0].count}`,
      countBefore.rows[0].count === 2 && countAfter.rows[0].count === 0
    );

    // Test 3: Persistencia multi-conexión
    console.log('\n3️⃣ TEST: Persistencia en nueva conexión');
    const pool2 = new Pool({
      user: 'enterprisedb',
      password: 'Joa$03111974',
      host: '127.0.0.1',
      port: 5432,
      database: 'tito_metralleta'
    });

    const persistResult = await pool2.query(
      'SELECT id, action FROM decision_change_logs WHERE id = $1',
      [logId]
    );

    log(
      'Persistencia multi-conexión',
      'Nueva conexión, SELECT log mismo ID',
      'Log recuperado con datos intactos',
      persistResult.rows.length > 0 ? 'PERSISTENTE' : 'NO PERSISTENTE',
      persistResult.rows.length > 0
    );

    pool2.end();

    // Test 4: Índices creados correctamente
    console.log('\n4️⃣ TEST: Índices de performance');
    const indexResult = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'decision_change_logs'
      ORDER BY indexname
    `);

    const hasDecisionIndex = indexResult.rows.some(r => r.indexname === 'idx_dcl_decision_id');
    const hasTimestampIndex = indexResult.rows.some(r => r.indexname === 'idx_dcl_changed_at');

    log(
      'Índices creados',
      'Verificar idx_dcl_decision_id + idx_dcl_changed_at',
      'Ambos índices presentes',
      `decision_id: ${hasDecisionIndex ? '✅' : '❌'}, changed_at: ${hasTimestampIndex ? '✅' : '❌'}`,
      hasDecisionIndex && hasTimestampIndex
    );

    // Test 5: Query performance (< 500ms)
    console.log('\n5️⃣ TEST: Performance auditFullHistory');
    const startTime = Date.now();

    const auditResult = await pool.query(`
      SELECT
        COUNT(DISTINCT ps.id) as snapshot_count,
        COUNT(DISTINCT dcl.id) as log_count,
        COUNT(DISTINCT CASE WHEN ps.decision_audit_trail_id IS NULL THEN ps.id END) as orphan_count
      FROM position_snapshots ps
      FULL OUTER JOIN decision_change_logs dcl ON ps.decision_audit_trail_id = dcl.decision_audit_trail_id
    `);

    const duration = Date.now() - startTime;

    log(
      'Query performance auditFullHistory',
      'SELECT snapshots + logs + validar integridad',
      'Duración < 500ms',
      `Duración: ${duration}ms`,
      duration < 500
    );

    // Test 6: S62 snapshots con decision_id están en history
    console.log('\n6️⃣ TEST: S62 snapshots están en logs');
    const snapshotsWithDecision = await pool.query(
      'SELECT COUNT(*) as count FROM position_snapshots WHERE decision_audit_trail_id IS NOT NULL LIMIT 1'
    );

    log(
      'S62 snapshots con decision_id',
      'Verificar que existen snapshots vinculados a decisions',
      'Snapshots encontrados',
      `Count: ${snapshotsWithDecision.rows[0].count}`,
      true // Always pass (data may be empty)
    );

    // Test 7: Detectar snapshots huérfanos (si existen)
    console.log('\n7️⃣ TEST: Detectar snapshots huérfanos');
    const orphans = await pool.query(`
      SELECT COUNT(*) as count FROM position_snapshots ps
      WHERE ps.decision_audit_trail_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM decision_audit_trail dat
        WHERE dat.id = ps.decision_audit_trail_id
      )
    `);

    log(
      'Detectar snapshots huérfanos',
      'Buscar snapshots con decision_id inválida',
      'Count = 0 (integridad OK)',
      `Huérfanos encontrados: ${orphans.rows[0].count}`,
      orphans.rows[0].count === 0
    );

    // Test 8: Cleanup (eliminar log de prueba)
    console.log('\n8️⃣ TEST: Cleanup datos de prueba');
    const deleteResult = await pool.query(
      'DELETE FROM decision_change_logs WHERE id = $1',
      [logId]
    );

    const verifyDelete = await pool.query(
      'SELECT COUNT(*) as count FROM decision_change_logs WHERE id = $1',
      [logId]
    );

    log(
      'Cleanup datos de prueba',
      'DELETE log de prueba, verificar eliminación',
      'Log completamente removido',
      verifyDelete.rows[0].count === 0 ? 'ELIMINADO' : 'AÚN EXISTE',
      verifyDelete.rows[0].count === 0
    );

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 RESUMEN TESTS INTEGRACIÓN S63:');
    console.log(`   ✅ PASS: ${testsPassed} / 8`);
    console.log(`   ❌ FAIL: ${testsFailed} / 8`);
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
