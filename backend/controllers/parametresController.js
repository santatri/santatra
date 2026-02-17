const { pool } = require('../db');
const { spawn } = require('child_process');

// Récupérer les étudiants éligibles à la suppression
exports.getEtudiantsToDelete = async (req, res) => {
  try {
    // Récupérer les étudiants avec leurs inscriptions
    const query = `
      SELECT 
        e.id,
        e.nom,
        e.prenom,
        e.statut,
        e.centre_id,
        json_agg(
          json_build_object(
            'id', i.id,
            'statut', i.statut,
            'date_inscription', i.date_inscription
          )
        ) as inscriptions
      FROM etudiants e
      LEFT JOIN inscriptions i ON e.id = i.etudiant_id
      GROUP BY e.id, e.nom, e.prenom, e.statut, e.centre_id
    `;

    const result = await pool.query(query);
    let etudiants = result.rows;

    // Filtrer les étudiants éligibles à la suppression
    const eligible = etudiants.filter(etudiant => {
      // Fonction pour calculer le statut global
      const calculateStatus = (inscriptions) => {
        if (!inscriptions || inscriptions.length === 0) return 'inconnu';
        if (inscriptions.some(i => i.statut === 'actif')) return 'actif';
        if (inscriptions.some(i => i.statut === 'quitte')) return 'quitte';
        if (inscriptions.some(i => i.statut === 'fini')) return 'fini';
        return 'inconnu';
      };

      const globalStatus = calculateStatus(etudiant.inscriptions);

      // Ne peut pas supprimer si l'étudiant a une inscription active
      if (globalStatus === 'actif') return false;

      // Vérifier la condition temporelle : plus d'un an et demi depuis la première inscription
      if (!etudiant.inscriptions || etudiant.inscriptions.length === 0) return false;

      const dateInscription = new Date(etudiant.inscriptions[0].date_inscription);
      if (isNaN(dateInscription)) return false;

      const diffDays = Math.ceil(
        (new Date() - dateInscription) / (1000 * 60 * 60 * 24)
      );
      const unAnEtDemi = 365 + 182.5; // 548 jours

      return diffDays > unAnEtDemi;
    });

    res.json(eligible);
  } catch (error) {
    console.error('Erreur récupération étudiants:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Supprimer un étudiant complètement (en cascade)
exports.deleteEtudiantCompletely = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { etudiantId } = req.params;

    // 1️⃣ Récupérer toutes les inscriptions
    const inscriptionsRes = await client.query(
      'SELECT id FROM inscriptions WHERE etudiant_id = $1',
      [etudiantId]
    );

    const inscriptions = inscriptionsRes.rows;

    // 2️⃣ Supprimer les paiements liés à ces inscriptions
    if (inscriptions && inscriptions.length > 0) {
      const inscriptionIds = inscriptions.map(i => i.id);
      await client.query(
        'DELETE FROM paiements WHERE inscription_id = ANY($1)',
        [inscriptionIds]
      );
    }

    // 3️⃣ Supprimer les livres étudiants
    await client.query(
      'DELETE FROM livres_etudiants WHERE etudiant_id = $1',
      [etudiantId]
    );

    // 4️⃣ Supprimer les inscriptions
    await client.query(
      'DELETE FROM inscriptions WHERE etudiant_id = $1',
      [etudiantId]
    );

    // 5️⃣ Supprimer l'étudiant
    const deleteRes = await client.query(
      'DELETE FROM etudiants WHERE id = $1',
      [etudiantId]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Étudiant supprimé avec succès' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur suppression étudiant:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

// Supprimer plusieurs étudiants
exports.deleteEtudiantsMultiple = async (req, res) => {
  const client = await pool.connect();
  try {
    const { etudiantIds } = req.body;

    if (!etudiantIds || !Array.isArray(etudiantIds) || etudiantIds.length === 0) {
      return res.status(400).json({ error: 'Liste d\'étudiants requise' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const etudiantId of etudiantIds) {
      try {
        await client.query('BEGIN');

        // 1️⃣ Récupérer toutes les inscriptions
        const inscriptionsRes = await client.query(
          'SELECT id FROM inscriptions WHERE etudiant_id = $1',
          [etudiantId]
        );

        const inscriptions = inscriptionsRes.rows;

        // 2️⃣ Supprimer les paiements
        if (inscriptions && inscriptions.length > 0) {
          const inscriptionIds = inscriptions.map(i => i.id);
          await client.query(
            'DELETE FROM paiements WHERE inscription_id = ANY($1)',
            [inscriptionIds]
          );
        }

        // 3️⃣ Supprimer les livres étudiants
        await client.query(
          'DELETE FROM livres_etudiants WHERE etudiant_id = $1',
          [etudiantId]
        );

        // 4️⃣ Supprimer les inscriptions
        await client.query(
          'DELETE FROM inscriptions WHERE etudiant_id = $1',
          [etudiantId]
        );

        // 5️⃣ Supprimer l'étudiant
        await client.query(
          'DELETE FROM etudiants WHERE id = $1',
          [etudiantId]
        );

        await client.query('COMMIT');
        successCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erreur suppression étudiant ${etudiantId}:`, err);
        errorCount++;
        errors.push({ etudiantId, error: err.message });
      }
    }

    res.json({
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      message: errorCount === 0
        ? `${successCount} étudiant(s) supprimé(s) avec succès`
        : `${successCount} étudiant(s) supprimé(s), ${errorCount} erreur(s)`
    });
  } catch (error) {
    console.error('Erreur suppression multiple:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

// Exporter la base de données
exports.exportDatabase = (req, res) => {
  try {
    const fileName = `backup_${new Date().toISOString().split('T')[0]}.sql`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const pgDump = spawn('pg_dump', [
      '-h', process.env.PGHOST || 'localhost',
      '-U', process.env.PGUSER || 'postgres',
      '-p', process.env.PGPORT || '5432',
      process.env.PGDATABASE || 'ge_cfpm'
    ], {
      env: { PGPASSWORD: process.env.PGPASSWORD }
    });

    pgDump.stdout.pipe(res);

    pgDump.stderr.on('data', (data) => {
      console.error(`pg_dump stderr: ${data}`);
    });

    pgDump.on('close', (code) => {
      if (code !== 0) {
        console.error(`pg_dump process exited with code ${code}`);
        if (!res.headersSent) {
          res.status(500).send('Erreur lors de l\'exportation');
        }
      }
    });

    pgDump.on('error', (err) => {
      console.error('Failed to start pg_dump:', err);
      if (!res.headersSent) {
        res.status(500).send('Erreur lors du démarrage de l\'exportation');
      }
    });

  } catch (error) {
    console.error('Erreur export base de données:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};
