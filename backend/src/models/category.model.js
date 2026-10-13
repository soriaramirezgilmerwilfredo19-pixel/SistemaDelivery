const { query } = require('../config/database');

async function list() {
  const { rows } = await query('SELECT * FROM categories ORDER BY name');
  return rows;
}

module.exports = { list };
