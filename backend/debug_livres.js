
const { Pool } = require('pg');
require('dotenv').config();

 
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
    try {
        console.log('--- Books with "1" in name ---');
        const res = await pool.query(`
      SELECT l.id, l.nom, l.formation_id, f.nom as formation_nom 
      FROM livres l 
      JOIN formations f ON l.formation_id = f.id
      WHERE l.nom LIKE '%1%'
    `);
        console.table(res.rows);

        console.log('--- All Formations ---');
        const fRes = await pool.query('SELECT id, nom FROM formations');
        console.table(fRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
