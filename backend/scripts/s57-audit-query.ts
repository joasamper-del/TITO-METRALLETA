/**
 * S57 Forensic Audit - PostgreSQL Query Script
 * READ-ONLY: Auditing decisions from Friday 2026-09-05
 */

import { createConnection } from 'typeorm';
import { Opportunity } from './src/modules/database/entities/opportunity.entity';

async function runAudit() {
  const connection = await createConnection({
    type: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    username: 'enterprisedb',
    password: 'Joa$03111974',
    database: 'tito_metralleta',
    entities: [Opportunity],
    synchronize: false,
  });

  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          S57 FORENSIC AUDIT - FRIDAY 2026-09-05              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const opportunityRepository = connection.getRepository(Opportunity);

    // QUERY 1: Count opportunities from Friday
    console.log('📊 QUERY 1: Total Opportunities on Friday 2026-09-05');
    const fridayCount = await opportunityRepository
      .createQueryBuilder('opp')
      .where('DATE(opp."createdAt") = :date', { date: '2026-09-05' })
      .getCount();

    console.log(`   Count: ${fridayCount}\n`);

    if (fridayCount === 0) {
      console.log('   ⚠️  No records found for Friday 2026-09-05\n');
      return;
    }

    // QUERY 2: Decision breakdown
    console.log('📊 QUERY 2: Decision Breakdown');
    const decisions = await opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.decision', 'decision')
      .addSelect('COUNT(*)', 'count')
      .where('DATE(opp."createdAt") = :date', { date: '2026-09-05' })
      .groupBy('opp.decision')
      .getRawMany();

    decisions.forEach((d: any) => {
      console.log(`   ${d.decision}: ${d.count}`);
    });
    console.log();

    // QUERY 3: Strategies used
    console.log('📊 QUERY 3: Strategies Used');
    const strategies = await opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.strategy', 'strategy')
      .addSelect('COUNT(*)', 'count')
      .where('DATE(opp."createdAt") = :date', { date: '2026-09-05' })
      .groupBy('opp.strategy')
      .getRawMany();

    strategies.forEach((s: any) => {
      console.log(`   ${s.strategy}: ${s.count}`);
    });
    console.log();

    // QUERY 4: Risk gates breakdown
    console.log('📊 QUERY 4: Risk Distribution');
    const risks = await opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.risk', 'risk')
      .addSelect('COUNT(*)', 'count')
      .where('DATE(opp."createdAt") = :date', { date: '2026-09-05' })
      .groupBy('opp.risk')
      .getRawMany();

    risks.forEach((r: any) => {
      console.log(`   ${r.risk}: ${r.count}`);
    });
    console.log();

    // QUERY 5: Top 10 rejected signals (decision = ESPERAR or NO ENTRAR)
    console.log('📊 QUERY 5: Top 10 Rejected/Waiting Signals');
    const rejected = await opportunityRepository
      .createQueryBuilder('opp')
      .where('DATE(opp."createdAt") = :date', { date: '2026-09-05' })
      .andWhere('opp.decision IN (:...decisions)', { decisions: ['esperar', 'no entrar'] })
      .orderBy('opp."createdAt"', 'DESC')
      .take(10)
      .getMany();

    rejected.forEach((opp, idx) => {
      console.log(`\n   ${idx + 1}. ${opp.symbol} - ${opp.strategy}`);
      console.log(`      Decision: ${opp.decision} | Confidence: ${opp.confidence}%`);
      console.log(`      Risk: ${opp.risk} | Time: ${opp.createdAt.toISOString()}`);
      if (opp.notes) {
        console.log(`      Notes: ${opp.notes}`);
      }
    });
    console.log();

    // QUERY 6: Executed signals (decision = ENTRAR)
    console.log('📊 QUERY 6: Executed Signals (ENTRAR)');
    const executed = await opportunityRepository
      .createQueryBuilder('opp')
      .where('DATE(opp."createdAt") = :date', { date: '2026-09-05' })
      .andWhere('opp.decision = :decision', { decision: 'entrar' })
      .getMany();

    if (executed.length === 0) {
      console.log('   ❌ NO trades were executed on Friday\n');
    } else {
      console.log(`   ✅ ${executed.length} trades were initiated:\n`);
      executed.forEach((opp, idx) => {
        console.log(`   ${idx + 1}. ${opp.symbol} - ${opp.strategy}`);
        console.log(`      Entry: ${opp.entry} | Target: ${opp.target} | Stop: ${opp.stop}`);
        console.log(`      Confidence: ${opp.confidence}%\n`);
      });
    }

    // QUERY 7: Average confidence by decision
    console.log('📊 QUERY 7: Average Confidence by Decision');
    const avgConfidence = await opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.decision', 'decision')
      .addSelect('AVG(opp.confidence)', 'avgConfidence')
      .where('DATE(opp."createdAt") = :date', { date: '2026-09-05' })
      .groupBy('opp.decision')
      .getRawMany();

    avgConfidence.forEach((ac: any) => {
      console.log(`   ${ac.decision}: ${parseFloat(ac.avgConfidence).toFixed(1)}%`);
    });
    console.log();

  } catch (error) {
    console.error('❌ Error querying PostgreSQL:', error);
  } finally {
    await connection.close();
  }
}

runAudit().catch(console.error);
