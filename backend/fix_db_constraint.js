const { pool } = require('./db');

async function fixConstraint() {
    try {
        console.log('Attaching new role to constraint...');

        // First, let's look at the existing constraint if possible (optional)
        // But we know it's users_role_check from the error message.

        // Drop the old constraint and add the new one
        await pool.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check;
      
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'gerant', 'dir'));
    `);

        console.log('✅ Base de données mise à jour avec succès !');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur lors de la mise à jour de la base de données:', err);
        process.exit(1);
    }
}

fixConstraint();
