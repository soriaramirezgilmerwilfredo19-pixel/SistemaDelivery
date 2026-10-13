const fs = require('fs');
const path = require('path');

const { assertConfig } = require('../config');
const { getPool, closePool } = require('../config/database');

async function migrate() {
  assertConfig();
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const pool = getPool();
  console.log('Aplicando esquema...');
  await pool.query(sql);
  console.log('Esquema aplicado correctamente.');
  await closePool();
}

migrate().catch((err) => {
  console.error('Error al migrar:', err.message);
  process.exit(1);
});
