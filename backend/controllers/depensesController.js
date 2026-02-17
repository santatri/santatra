const { pool } = require('../db');

// Récupérer toutes les dépenses avec info centre
const getDepenses = async (req, res) => {
  try {
    const { centre_id } = req.query;
    let query = `SELECT d.*, c.nom as centre_nom FROM depenses d LEFT JOIN centres c ON d.centre_id = c.id WHERE 1=1`;
    const params = [];
    if (centre_id) {
      params.push(centre_id);
      query += ` AND d.centre_id = $1`;
    }
    query += ' ORDER BY d.date_depense DESC';
    const result = await pool.query(query, params);

    const rows = result.rows.map(r => ({
      ...r,
      centres: { nom: r.centre_nom }
    }));
    res.json(rows);
  } catch (err) {
    console.error('Erreur getDepenses:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des dépenses' });
  }
};

// Récupérer une dépense par ID
const getDepenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.*, c.nom as centre_nom FROM depenses d LEFT JOIN centres c ON d.centre_id = c.id WHERE d.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Non trouvé' });
    const row = result.rows[0];
    res.json({ ...row, centres: { nom: row.centre_nom } });
  } catch (err) {
    console.error('Erreur getDepenseById:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer une dépense
const createDepense = async (req, res) => {
  try {
    const { centre_id, user_id, type_depense, description, montant, date_depense } = req.body;
    const date = date_depense || new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `INSERT INTO depenses (centre_id, user_id, type_depense, description, montant, date_depense) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [centre_id, user_id, type_depense, description, montant, date]
    );
    const row = result.rows[0];
    const centreRes = await pool.query('SELECT nom FROM centres WHERE id = $1', [centre_id]);
    res.status(201).json({ ...row, centres: { nom: centreRes.rows[0]?.nom || '' } });
  } catch (err) {
    console.error('Erreur createDepense:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la création' });
  }
};

// Mettre à jour une dépense
const updateDepense = async (req, res) => {
  try {
    const { id } = req.params;
    const { centre_id, type_depense, description, montant, date_depense } = req.body;
    const check = await pool.query('SELECT * FROM depenses WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Non trouvé' });
    const result = await pool.query(
      `UPDATE depenses SET centre_id = $1, type_depense = $2, description = $3, montant = $4, date_depense = $5 WHERE id = $6 RETURNING *`,
      [centre_id, type_depense, description, montant, date_depense, id]
    );
    const row = result.rows[0];
    const centreRes = await pool.query('SELECT nom FROM centres WHERE id = $1', [centre_id]);
    res.json({ ...row, centres: { nom: centreRes.rows[0]?.nom || '' } });
  } catch (err) {
    console.error('Erreur updateDepense:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' });
  }
};

// Supprimer une dépense
const deleteDepense = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM depenses WHERE id = $1', [id]);
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur deleteDepense:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
  }
};

module.exports = { getDepenses, getDepenseById, createDepense, updateDepense, deleteDepense };
