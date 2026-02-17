const { pool } = require('../db');

// Récupérer toutes les références de dépenses obligatoires avec info centre
const getDepensesObligatoires = async (req, res) => {
  try {
    const { centre_id } = req.query;
    let query = `SELECT d.*, c.nom as centre_nom FROM depenses_obligatoires d LEFT JOIN centres c ON d.centre_id = c.id WHERE 1=1`;
    const params = [];
    if (centre_id) {
      params.push(centre_id);
      query += ` AND d.centre_id = $1`;
    }
    query += ' ORDER BY d.created_at DESC';
    const result = await pool.query(query, params);

    const rows = result.rows.map(r => ({
      ...r,
      centres: { nom: r.centre_nom }
    }));

    res.json(rows);
  } catch (err) {
    console.error('Erreur getDepensesObligatoires:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération' });
  }
};

// Créer
const createDepenseObligatoire = async (req, res) => {
  try {
    const { centre_id, montant, mois } = req.body;
    const moisVal = mois || new Date().toISOString().slice(0,7);
    const result = await pool.query(
      `INSERT INTO depenses_obligatoires (centre_id, montant, mois) VALUES ($1, $2, $3) RETURNING *`,
      [centre_id, montant, moisVal]
    );
    const row = result.rows[0];
    const centreRes = await pool.query('SELECT nom FROM centres WHERE id = $1', [centre_id]);
    res.status(201).json({ ...row, centres: { nom: centreRes.rows[0]?.nom || '' } });
  } catch (err) {
    console.error('Erreur createDepenseObligatoire:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la création' });
  }
};

// Mettre à jour
const updateDepenseObligatoire = async (req, res) => {
  try {
    const { id } = req.params;
    const { centre_id, montant } = req.body;
    const check = await pool.query('SELECT * FROM depenses_obligatoires WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Non trouvé' });
    const result = await pool.query(
      'UPDATE depenses_obligatoires SET centre_id = $1, montant = $2 WHERE id = $3 RETURNING *',
      [centre_id, montant, id]
    );
    const row = result.rows[0];
    const centreRes = await pool.query('SELECT nom FROM centres WHERE id = $1', [centre_id]);
    res.json({ ...row, centres: { nom: centreRes.rows[0]?.nom || '' } });
  } catch (err) {
    console.error('Erreur updateDepenseObligatoire:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' });
  }
};

// Supprimer
const deleteDepenseObligatoire = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM depenses_obligatoires WHERE id = $1', [id]);
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur deleteDepenseObligatoire:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
  }
};

module.exports = {
  getDepensesObligatoires,
  createDepenseObligatoire,
  updateDepenseObligatoire,
  deleteDepenseObligatoire
};
