const { pool } = require('../db');

const createTypeMontant = async (req, res) => {
  const { code, libelle, description } = req.body;

  try {
    // Validation
    if (!code || !libelle) {
      return res.status(400).json({ 
        message: 'Code et libellé sont obligatoires' 
      });
    }

    // Vérifier si le code existe déjà
    const existing = await pool.query(
      'SELECT id FROM types_montants WHERE code = $1',
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Ce code existe déjà' });
    }

    const result = await pool.query(
      `INSERT INTO types_montants (code, libelle, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [code, libelle, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur création type:', err);
    res.status(500).json({ 
      message: 'Erreur création type montant',
      error: err.message 
    });
  }
};

const getAllTypesMontants = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM types_montants ORDER BY libelle ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération types:', err);
    res.status(500).json({ 
      message: 'Erreur récupération types montants',
      error: err.message 
    });
  }
};

const getTypeMontantById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM types_montants WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Type montant non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur récupération type:', err);
    res.status(500).json({ 
      message: 'Erreur récupération type montant',
      error: err.message 
    });
  }
};

const updateTypeMontant = async (req, res) => {
  const { id } = req.params;
  const { code, libelle, description } = req.body;

  try {
    // Vérifier si le type existe
    const check = await pool.query(
      'SELECT id FROM types_montants WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Type montant non trouvé' });
    }

    // Vérifier si le nouveau code existe déjà (pour un autre type)
    if (code) {
      const existing = await pool.query(
        'SELECT id FROM types_montants WHERE code = $1 AND id != $2',
        [code, id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ message: 'Ce code est déjà utilisé' });
      }
    }

    const result = await pool.query(
      `UPDATE types_montants 
       SET code = COALESCE($1, code),
           libelle = COALESCE($2, libelle),
           description = COALESCE($3, description)
       WHERE id = $4
       RETURNING *`,
      [code, libelle, description, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur mise à jour type:', err);
    res.status(500).json({ 
      message: 'Erreur mise à jour type montant',
      error: err.message 
    });
  }
};

const deleteTypeMontant = async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier si le type existe
    const check = await pool.query(
      'SELECT id FROM types_montants WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Type montant non trouvé' });
    }

    // Vérifier si le type est utilisé dans montants_autres
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM montants_autres WHERE type_montant_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Impossible de supprimer : ce type est utilisé dans des paiements' 
      });
    }

    const result = await pool.query(
      'DELETE FROM types_montants WHERE id = $1 RETURNING id',
      [id]
    );

    res.json({ message: 'Type montant supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression type:', err);
    res.status(500).json({ 
      message: 'Erreur suppression type montant',
      error: err.message 
    });
  }
};

module.exports = {
  createTypeMontant,
  getAllTypesMontants,
  getTypeMontantById,
  updateTypeMontant,
  deleteTypeMontant
};