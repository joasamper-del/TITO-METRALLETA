const { Pool } = require('pg');

const pool = new Pool({
  user: 'enterprisedb',
  password: '',
  host: 'localhost',
  port: 5432,
  database: 'tito_metralleta',
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        symbol,
        strategy,
        decision,
        confidence,
        risk,
        analysis->>'score' as score,
        created_at
      FROM opportunities
      WHERE DATE(created_at) = CAST(NOW() AS DATE)
      ORDER BY created_at DESC
      LIMIT 20;
    `);

    console.log('\n📊 OPERACIONES DE HOY:');
    console.log('='.repeat(80));
    result.rows.forEach(row => {
      const time = new Date(row.created_at).toLocaleTimeString('es-ES');
      const decisionEmoji = row.decision === 'operar' ? '✅' : row.decision === 'esperar' ? '⏳' : '❌';
      console.log(`${time} │ ${row.symbol} │ ${decisionEmoji} ${row.decision.toUpperCase()} │ Conf: ${row.confidence}% │ Riesgo: ${row.risk}`);
    });

    console.log('='.repeat(80));
    console.log(`Total de operaciones hoy: ${result.rows.length}\n`);

    // Específicamente SPY
    const spyResult = await pool.query(`
      SELECT
        COUNT(*) as total_spy,
        SUM(CASE WHEN decision = 'operar' THEN 1 ELSE 0 END) as operate_count,
        SUM(CASE WHEN decision = 'esperar' THEN 1 ELSE 0 END) as wait_count,
        SUM(CASE WHEN decision = 'no_operar' THEN 1 ELSE 0 END) as no_operate_count
      FROM opportunities
      WHERE symbol = 'SPY'
      AND DATE(created_at) = CAST(NOW() AS DATE);
    `);

    const spy = spyResult.rows[0];
    console.log('📈 SPY - RESUMEN DE SEÑALES:');
    console.log(`  Total: ${spy.total_spy}`);
    console.log(`  ✅ Operar: ${spy.operate_count || 0}`);
    console.log(`  ⏳ Esperar: ${spy.wait_count || 0}`);
    console.log(`  ❌ No Operar: ${spy.no_operate_count || 0}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
