/**
 * Script para verificar operaciones guardadas en PostgreSQL
 */

require('dotenv').config();
const { createConnection } = require('typeorm');
const path = require('path');

async function checkDatabase() {
  const AppDataSource = new (require('typeorm').DataSource)({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://enterprisedb:@localhost:5432/tito_metralleta',
    entities: [path.join(__dirname, 'dist/**/*.entity.js')],
    synchronize: false,
  });

  try {
    await AppDataSource.initialize();
    console.log('\n✅ Conectado a PostgreSQL\n');

    // Operaciones de hoy
    const opportunities = await AppDataSource.query(`
      SELECT
        id,
        symbol,
        strategy,
        decision,
        confidence,
        risk,
        created_at
      FROM opportunities
      WHERE DATE(created_at) = CAST(NOW() AS DATE)
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log('📊 OPERACIONES DE HOY:');
    console.log('='.repeat(100));

    opportunities.forEach((row, index) => {
      const time = new Date(row.created_at).toLocaleTimeString('es-ES');
      const decisionEmoji = row.decision === 'operar' ? '✅' : row.decision === 'esperar' ? '⏳' : '❌';
      console.log(`${index + 1}. [${time}] ${row.symbol} │ ${decisionEmoji} ${row.decision.padEnd(9)} │ ${row.strategy.padEnd(20)} │ Conf: ${String(row.confidence).padStart(3)}% │ Riesgo: ${row.risk}`);
    });

    console.log('='.repeat(100));
    console.log(`Total de operaciones hoy: ${opportunities.length}\n`);

    // Resumen por símbolo
    const summary = await AppDataSource.query(`
      SELECT
        symbol,
        COUNT(*) as total,
        COUNT(CASE WHEN decision = 'operar' THEN 1 END) as operate,
        COUNT(CASE WHEN decision = 'esperar' THEN 1 END) as wait,
        COUNT(CASE WHEN decision = 'no_operar' THEN 1 END) as no_operate
      FROM opportunities
      WHERE DATE(created_at) = CAST(NOW() AS DATE)
      GROUP BY symbol
      ORDER BY total DESC
    `);

    console.log('📈 RESUMEN POR SÍMBOLO:');
    console.log('-'.repeat(100));
    summary.forEach(row => {
      console.log(`${row.symbol.padEnd(6)} │ Total: ${String(row.total).padStart(2)} │ ✅ Operar: ${String(row.operate).padStart(2)} │ ⏳ Esperar: ${String(row.wait).padStart(2)} │ ❌ No: ${String(row.no_operate).padStart(2)}`);
    });

    console.log('-'.repeat(100));
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await AppDataSource.destroy();
  }
}

checkDatabase();
