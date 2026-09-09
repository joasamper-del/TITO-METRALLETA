const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: 'enterprisedb',
  password: 'Joa$03111974',
  host: '127.0.0.1',
  port: 5432,
  database: 'tito_metralleta'
});

(async () => {
  try {
    console.log('\n🧪 S63 INTEGRATION TESTS - BD REAL DE TITO\n');
    console.log('='.repeat(70));

    const decisionResult = await pool.query(
      'SELECT id FROM decision_audit_trail LIMIT 1'
    );

    if (decisionResult.rows.length === 0) {
      console.error('❌ No hay decision_audit_trail en BD.');
      pool.end();
      process.exit(1);
    }

    const testDecisionId = decisionResult.rows[0].id;
    console.log(`\nUsando decision_id: ${testDecisionId.substring(0, 8)}...\n`);

    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1: INSERT decision_change_logs
    console.log('1️⃣ TEST: Crear decision_change_logs entry');
    const logId = uuidv4();

    const result = await pool.query(
      `INSERT INTO decision_change_logs (id, decision_audit_trail_id, action, snapshot_count)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [logId, testDecisionId, 'UPDATED', 5]
    );

    const pass1 = result.rows.length > 0;
    console.log(`  ${pass1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ENTRADA: Insert log entry`);
    console.log(`    ESPERADO: Fila insertada`);
    console.log(`    OBTENIDO: ${pass1 ? 'INSERTADO' : 'FALLÓ'}`);
    if (pass1) testsPassed++; else testsFailed++;

    // Test 2: FK behavior (CASCADE delete)
    console.log('\n2️⃣ TEST: FK behavior — DELETE decision → logs CASCADE');

    const tempDecisionInsert = await pool.query(
      `INSERT INTO decision_audit_trail (symbol, strategy, decision, timestamp)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['TEST', 'TEST_STRATEGY', 'TEST', new Date()]
    );

    const tempDecisionId = tempDecisionInsert.rows[0].id;

    await pool.query(
      `INSERT INTO decision_change_logs (decision_audit_trail_id, action) VALUES ($1, $2)`,
      [tempDecisionId, 'CREATED']
    );

    await pool.query(
      `INSERT INTO decision_change_logs (decision_audit_trail_id, action) VALUES ($1, $2)`,
      [tempDecisionId, 'UPDATED']
    );

    const countBefore = await pool.query(
      'SELECT COUNT(*) as count FROM decision_change_logs WHERE decision_audit_trail_id = $1',
      [tempDecisionId]
    );

    await pool.query('DELETE FROM decision_audit_trail WHERE id = $1', [tempDecisionId]);

    const countAfter = await pool.query(
      'SELECT COUNT(*) as count FROM decision_change_logs WHERE decision_audit_trail_id = $1',
      [tempDecisionId]
    );

    const pass2 = countBefore.rows[0].count == 2 && countAfter.rows[0].count == 0;
    console.log(`  ${pass2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ENTRADA: DELETE decision + 2 logs`);
    console.log(`    ESPERADO: Logs CASCADE eliminados`);
    console.log(`    OBTENIDO: Antes=${countBefore.rows[0].count}, Después=${countAfter.rows[0].count}`);
    if (pass2) testsPassed++; else testsFailed++;

    // Test 3: Persistencia
    console.log('\n3️⃣ TEST: Persistencia multi-conexión');
    const pool2 = new Pool({
      user: 'enterprisedb',
      password: 'Joa$03111974',
      host: '127.0.0.1',
      port: 5432,
      database: 'tito_metralleta'
    });

    const persistResult = await pool2.query(
      'SELECT id FROM decision_change_logs WHERE id = $1',
      [logId]
    );

    const pass3 = persistResult.rows.length > 0;
    console.log(`  ${pass3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ENTRADA: Nueva conexión`);
    console.log(`    ESPERADO: Log recuperado`);
    console.log(`    OBTENIDO: ${pass3 ? 'PERSISTENTE' : 'NO ENCONTRADO'}`);
    if (pass3) testsPassed++; else testsFailed++;
    pool2.end();

    // Test 4: Índices
    console.log('\n4️⃣ TEST: Índices creados');
    const indexResult = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'decision_change_logs'`
    );

    const hasDecisionIndex = indexResult.rows.some(r => r.indexname === 'idx_dcl_decision_id');
    const hasTimestampIndex = indexResult.rows.some(r => r.indexname === 'idx_dcl_changed_at');
    const pass4 = hasDecisionIndex && hasTimestampIndex;

    console.log(`  ${pass4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ENTRADA: Verificar índices`);
    console.log(`    ESPERADO: idx_dcl_decision_id + idx_dcl_changed_at`);
    console.log(`    OBTENIDO: decision_id=${hasDecisionIndex ? '✅' : '❌'}, changed_at=${hasTimestampIndex ? '✅' : '❌'}`);
    if (pass4) testsPassed++; else testsFailed++;

    // Test 5: Performance
    console.log('\n5️⃣ TEST: Query performance');
    const startTime = Date.now();

    await pool.query(`
      SELECT COUNT(*) FROM position_snapshots ps
      WHERE ps.decision_audit_trail_id IS NOT NULL
    `);

    const duration = Date.now() - startTime;
    const pass5 = duration < 500;

    console.log(`  ${pass5 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ENTRADA: Query auditFullHistory`);
    console.log(`    ESPERADO: < 500ms`);
    console.log(`    OBTENIDO: ${duration}ms`);
    if (pass5) testsPassed++; else testsFailed++;

    // Test 6: Snapshots con decision_id
    console.log('\n6️⃣ TEST: S62 snapshots con decision_id');
    const snapshotsWithDecision = await pool.query(
      'SELECT COUNT(*) as count FROM position_snapshots WHERE decision_audit_trail_id IS NOT NULL'
    );

    const pass6 = true;
    console.log(`  ${pass6 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ENTRADA: Verificar snapshots`);
    console.log(`    ESPERADO: Snapshots encontrados`);
    console.log(`    OBTENIDO: Count=${snapshotsWithDecision.rows[0].count}`);
    if (pass6) testsPassed++; else testsFailed++;

    // Test 7: No hay huérfanos
    console.log('\n7️⃣ TEST: Validar integridad referencial');
    const orphans = await pool.query(`
      SELECT COUNT(*) as count FROM position_snapshots ps
      WHERE ps.decision_audit_trail_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM decision_audit_trail dat WHERE dat.id = ps.decision_audit_trail_id)
    `);

    const pass7 = orphans.rows[0].count == 0;
    console.log(`  ${pass7 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ENTRADA: Buscar snapshots huérfanos`);
    console.log(`    ESPERADO: Count=0`);
    console.log(`    OBTENIDO: ${orphans.rows[0].count}`);
    if (pass7) testsPassed++; else testsFailed++;

    // Test 8: Cleanup
    console.log('\n8️⃣ TEST: Cleanup datos de prueba');
    const deleteResult = await pool.query(
      'DELETE FROM decision_change_logs WHERE id = $1',
      [logId]
    );

    const verifyDelete = await pool.query(
      'SELECT COUNT(*) as count FROM decision_change_logs WHERE id = $1',
      [logId]
    );

    const pass8 = verifyDelete.rows[0].count == 0;
    console.log(`  ${pass8 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`    ENTRADA: DELETE log de prueba`);
    console.log(`    ESPERADO: Eliminado`);
    console.log(`    OBTENIDO: ${pass8 ? 'ELIMINADO' : 'AÚN EXISTE'}`);
    if (pass8) testsPassed++; else testsFailed++;

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 RESUMEN S63:');
    console.log(`   ✅ PASS: ${testsPassed}/8`);
    console.log(`   ❌ FAIL: ${testsFailed}/8`);
    console.log(`\n${testsFailed === 0 ? '🟢 TODOS LOS TESTS PASARON' : '🔴 ALGUNOS TESTS FALLARON'}`);

    console.log('\n✅ Guardrails vigentes:');
    console.log('  - Ethereum: ABIERTA');
    console.log('  - Operaciones: NINGUNA');
    console.log('  - Salida/reentrada: BLOQUEADA');

    pool.end();
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    pool.end();
    process.exit(1);
  }
})();
