require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT id, email, "fullName", role FROM users WHERE role = \'CUSTOMER\' OR email ILIKE \'%customer%\'')
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
  })
  .catch(err => {
    console.error(err);
    pool.end();
  });
