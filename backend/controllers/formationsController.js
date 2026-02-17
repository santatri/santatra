const { pool } = require('../db');

// Récupérer toutes les formations
const getFormations = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM formations ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur getFormations:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des formations' });
  }
};

// Créer une formation
const createFormation = async (req, res) => {
  try {
    const { nom, duree, frais_mensuel } = req.body;

    // Validation
    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom de la formation est obligatoire' });
    }

    if (!duree || duree <= 0) {
      return res.status(400).json({ message: 'La durée doit être supérieure à 0' });
    }

    if (!frais_mensuel || frais_mensuel < 0) {
      return res.status(400).json({ message: 'Les frais mensuels sont invalides' });
    }

    // Vérifier si la formation existe déjà
    const check = await pool.query(
      'SELECT * FROM formations WHERE nom = $1',
      [nom.trim()]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ message: 'Une formation avec ce nom existe déjà' });
    }

    // Insérer la formation
    const result = await pool.query(
      `INSERT INTO formations (nom, duree, frais_mensuel) 
       VALUES ($1, $2, $3) 
       RETURNING id, nom, duree, frais_mensuel, created_at`,
      [nom.trim(), parseFloat(duree), parseFloat(frais_mensuel)]
    );

    res.status(201).json({
      message: 'Formation créée avec succès',
      formation: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur createFormation:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la formation' });
  }
};

// Mettre à jour une formation
const updateFormation = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, duree, frais_mensuel } = req.body;

    // Validation
    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom de la formation est obligatoire' });
    }

    if (!duree || duree <= 0) {
      return res.status(400).json({ message: 'La durée doit être supérieure à 0' });
    }

    if (!frais_mensuel || frais_mensuel < 0) {
      return res.status(400).json({ message: 'Les frais mensuels sont invalides' });
    }

    // Vérifier si la formation existe
    const formationCheck = await pool.query(
      'SELECT * FROM formations WHERE id = $1',
      [id]
    );

    if (formationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Formation non trouvée' });
    }

    // Vérifier si une autre formation a le même nom
    const nameCheck = await pool.query(
      'SELECT * FROM formations WHERE nom = $1 AND id != $2',
      [nom.trim(), id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Une autre formation a déjà ce nom' });
    }

    // Mettre à jour la formation (la table `formations` n'a pas de colonne updated_at)
    const result = await pool.query(
      `UPDATE formations 
       SET nom = $1, duree = $2, frais_mensuel = $3
       WHERE id = $4 
       RETURNING id, nom, duree, frais_mensuel, created_at`,
      [nom.trim(), parseFloat(duree), parseFloat(frais_mensuel), id]
    );

    res.json({
      message: 'Formation mise à jour avec succès',
      formation: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur updateFormation:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la formation' });
  }
};

// Supprimer une formation
const deleteFormation = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si la formation existe
    const formationCheck = await pool.query(
      'SELECT * FROM formations WHERE id = $1',
      [id]
    );

    if (formationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Formation non trouvée' });
    }

    // Vérifier si la formation est utilisée par des étudiants ou autres
    // (À adapter selon vos relations)
    // const checkUsage = await pool.query(
    //   'SELECT COUNT(*) FROM inscriptions WHERE formation_id = $1',
    //   [id]
    // );
    // 
    // if (parseInt(checkUsage.rows[0].count) > 0) {
    //   return res.status(400).json({ 
    //     message: 'Impossible de supprimer cette formation car elle est associée à des inscriptions' 
    //   });
    // }

    // Supprimer la formation
    await pool.query('DELETE FROM formations WHERE id = $1', [id]);

    res.json({ message: 'Formation supprimée avec succès' });
  } catch (err) {
    console.error('Erreur deleteFormation:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la formation' });
  }
};

module.exports = {
  getFormations,
  createFormation,
  updateFormation,
  deleteFormation
};