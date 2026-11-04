const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../backend/node_modules/pg'));
require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../backend/.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT id, email, role FROM users LIMIT 15', (err, res) => {
  if (err) console.error(err);
  else console.table(res.rows);
  pool.end();
});
