const { pool } = require('../db');

// Lister tous les droits
exports.getAllDroits = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM droits_inscription ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erreur récupération droits:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Récupérer un droit par id
exports.getDroitById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM droits_inscription WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Droit non trouvé' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur récupération droit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Créer un nouveau droit
exports.createDroit = async (req, res) => {
  try {
    const { montant } = req.body;
    if (montant == null) return res.status(400).json({ success: false, message: 'Le montant est requis' });
    const result = await pool.query(
      'INSERT INTO droits_inscription (montant) VALUES ($1) RETURNING *',
      [montant]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur création droit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre à jour un droit
exports.updateDroit = async (req, res) => {
  try {
    const { id } = req.params;
    const { montant } = req.body;
    if (montant == null) return res.status(400).json({ success: false, message: 'Le montant est requis' });
    const result = await pool.query(
      'UPDATE droits_inscription SET montant = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [montant, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Droit non trouvé' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur mise à jour droit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Supprimer un droit
exports.deleteDroit = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM droits_inscription WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Droit non trouvé' });
    res.json({ success: true, message: 'Droit supprimé' });
  } catch (error) {
    console.error('Erreur suppression droit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
