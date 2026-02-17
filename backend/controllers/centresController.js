const { pool } = require('../db');

// Récupérer tous les centres
const getCentres = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM centres ORDER BY nom'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur getCentres:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des centres' });
  }
};

// Créer un centre
const createCentre = async (req, res) => {
  try {
    const { nom, adresse } = req.body;

    // Validation
    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom du centre est obligatoire' });
    }

    // Vérifier si le centre existe déjà
    const check = await pool.query(
      'SELECT * FROM centres WHERE nom = $1',
      [nom.trim()]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ message: 'Un centre avec ce nom existe déjà' });
    }

    // Insérer le centre
    const result = await pool.query(
      `INSERT INTO centres (nom, adresse) 
       VALUES ($1, $2) 
       RETURNING id, nom, adresse, created_at`,
      [nom.trim(), adresse || null]
    );

    res.status(201).json({
      message: 'Centre créé avec succès',
      centre: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur createCentre:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la création du centre' });
  }
};

// Mettre à jour un centre
const updateCentre = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, adresse } = req.body;

    // Validation
    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom du centre est obligatoire' });
    }

    // Vérifier si le centre existe
    const centreCheck = await pool.query(
      'SELECT * FROM centres WHERE id = $1',
      [id]
    );

    if (centreCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Centre non trouvé' });
    }

    // Vérifier si un autre centre a le même nom
    const nameCheck = await pool.query(
      'SELECT * FROM centres WHERE nom = $1 AND id != $2',
      [nom.trim(), id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Un autre centre a déjà ce nom' });
    }

    // Mettre à jour le centre (la table `centres` n'a pas de colonne updated_at)
    const result = await pool.query(
      `UPDATE centres 
       SET nom = $1, adresse = $2
       WHERE id = $3 
       RETURNING id, nom, adresse, created_at`,
      [nom.trim(), adresse || null, id]
    );

    res.json({
      message: 'Centre mis à jour avec succès',
      centre: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur updateCentre:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du centre' });
  }
};

// Supprimer un centre
const deleteCentre = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le centre existe
    const centreCheck = await pool.query(
      'SELECT * FROM centres WHERE id = $1',
      [id]
    );

    if (centreCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Centre non trouvé' });
    }

    // Vérifier si le centre est utilisé par des utilisateurs
    const usersCheck = await pool.query(
      'SELECT COUNT(*) FROM users WHERE centre_id = $1',
      [id]
    );

    if (parseInt(usersCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Impossible de supprimer ce centre car il est associé à des utilisateurs' 
      });
    }

    // Supprimer le centre
    await pool.query('DELETE FROM centres WHERE id = $1', [id]);

    res.json({ message: 'Centre supprimé avec succès' });
  } catch (err) {
    console.error('Erreur deleteCentre:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du centre' });
  }
};

// Rechercher des centres
const searchCentres = async (req, res) => {
  try {
    const { query } = req.query;
    
    let result;
    if (query) {
      result = await pool.query(
        `SELECT * FROM centres 
         WHERE nom ILIKE $1 OR adresse ILIKE $1 
         ORDER BY nom`,
        [`%${query}%`]
      );
    } else {
      result = await pool.query('SELECT * FROM centres ORDER BY nom');
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Erreur searchCentres:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la recherche' });
  }
};

module.exports = {
  getCentres,
  createCentre,
  updateCentre,
  deleteCentre,
  searchCentres
};