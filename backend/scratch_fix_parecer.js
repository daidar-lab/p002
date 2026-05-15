import pool from './src/config/db.js';

async function fixParecer() {
  try {
    await pool.query(`
      ALTER TABLE audit_quality.rhes RENAME COLUMN data_parecer TO parecer_data;
    `);
    console.log('Renamed data_parecer to parecer_data');
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

fixParecer();
