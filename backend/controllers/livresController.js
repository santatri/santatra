const { pool } = require('../db');

// Récupérer tous les livres
const getLivres = async (req, res) => {
  try {
    const { formation_id } = req.query;

    let query = `
      SELECT 
        l.id,
        l.formation_id,
        l.nom,
        l.prix,
        l.created_at,
        f.nom as formation_nom
      FROM livres l
      LEFT JOIN formations f ON l.formation_id = f.id
    `;

    const params = [];
    let paramCount = 1;

    if (formation_id) {
      query += ` WHERE l.formation_id = $${paramCount}`;
      params.push(formation_id);
      paramCount++;
    }

    query += ` ORDER BY l.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des livres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer un livre par ID
const getLivreDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        l.id,
        l.formation_id,
        l.nom,
        l.prix,
        l.created_at,
        f.nom as formation_nom
      FROM livres l
      LEFT JOIN formations f ON l.formation_id = f.id
      WHERE l.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Livre non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Créer un nouveau livre
const createLivre = async (req, res) => {
  try {
    const { formation_id, nom, prix } = req.body;

    // Validation
    if (!formation_id || !nom || prix === undefined || prix === null) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Validation du prix NUMERIC NOT NULL
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum < 0) {
      return res.status(400).json({ error: 'Le prix doit être un nombre positif (NUMERIC)' });
    }

    // Vérifier que la formation existe
    const formationCheck = await pool.query(
      'SELECT id FROM formations WHERE id = $1',
      [formation_id]
    );

    if (formationCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Formation non trouvée' });
    }

    const query = `
      INSERT INTO livres (formation_id, nom, prix)
      VALUES ($1, $2, $3)
      RETURNING id, formation_id, nom, prix, created_at
    `;

    const result = await pool.query(query, [formation_id, nom, prixNum]);

    res.status(201).json({
      message: 'Livre créé avec succès',
      livre: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création du livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Mettre à jour un livre
const updateLivre = async (req, res) => {
  try {
    const { id } = req.params;
    const { formation_id, nom, prix } = req.body;

    // Vérifier que le livre existe
    const livreCheck = await pool.query(
      'SELECT id FROM livres WHERE id = $1',
      [id]
    );

    if (livreCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Livre non trouvé' });
    }

    // Construire la requête dynamiquement
    let query = 'UPDATE livres SET ';
    const params = [];
    let paramCount = 1;

    if (formation_id !== undefined) {
      // Vérifier que la formation existe
      const formationCheck = await pool.query(
        'SELECT id FROM formations WHERE id = $1',
        [formation_id]
      );

      if (formationCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Formation non trouvée' });
      }

      query += `formation_id = $${paramCount}, `;
      params.push(formation_id);
      paramCount++;
    }

    if (nom !== undefined) {
      query += `nom = $${paramCount}, `;
      params.push(nom);
      paramCount++;
    }

    if (prix !== undefined) {
      const prixNum = parseFloat(prix);
      if (isNaN(prixNum) || prixNum < 0) {
        return res.status(400).json({ error: 'Le prix doit être un nombre positif (NUMERIC)' });
      }
      query += `prix = $${paramCount}, `;
      params.push(prixNum);
      paramCount++;
    }

    // Supprimer la dernière virgule et l'espace
    query = query.slice(0, -2);

    query += ` WHERE id = $${paramCount}
      RETURNING id, formation_id, nom, prix, created_at`;
    params.push(id);

    const result = await pool.query(query, params);

    res.json({
      message: 'Livre mis à jour avec succès',
      livre: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Supprimer un livre
const deleteLivre = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le livre existe
    const livreCheck = await pool.query(
      'SELECT id FROM livres WHERE id = $1',
      [id]
    );

    if (livreCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Livre non trouvé' });
    }

    await pool.query('DELETE FROM livres WHERE id = $1', [id]);

    res.json({ message: 'Livre supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du livre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer les livres par formation
const getLivresByFormation = async (req, res) => {
  try {
    const { formation_id } = req.params;
    const { etudiant_id } = req.query;

    // Vérifier que la formation existe
    const formationCheck = await pool.query(
      'SELECT id FROM formations WHERE id = $1',
      [formation_id]
    );

    if (formationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    const query = `
      SELECT 
        id,
        formation_id,
        nom,
        prix,
        created_at
      FROM livres
      WHERE formation_id = $1
      ORDER BY nom ASC, id ASC
    `;

    const result = await pool.query(query, [formation_id]);
    let rows = result.rows;

    // Si on fournit un etudiant_id en query, marquer les livres déjà achetés
    if (etudiant_id) {
      const livreIds = rows.map(r => r.id);
      if (livreIds.length > 0) {
        const ownedRes = await pool.query(
          `SELECT livre_id, date_achat FROM livres_etudiants WHERE etudiant_id = $1 AND livre_id = ANY($2)`,
          [etudiant_id, livreIds]
        );
        const ownedMap = {};
        ownedRes.rows.forEach(o => { ownedMap[o.livre_id] = o.date_achat });
        rows = rows.map(r => ({ ...r, achete: !!ownedMap[r.id], date_achat: ownedMap[r.id] || null }));
      } else {
        rows = rows.map(r => ({ ...r, achete: false, date_achat: null }));
      }
    }

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des livres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Rechercher des livres
const searchLivres = async (req, res) => {
  try {
    const { nom, formation_id } = req.query;

    let query = 'SELECT * FROM livres WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (nom) {
      query += ` AND LOWER(nom) LIKE LOWER($${paramCount})`;
      params.push(`%${nom}%`);
      paramCount++;
    }

    if (formation_id) {
      query += ` AND formation_id = $${paramCount}`;
      params.push(formation_id);
      paramCount++;
    }

    query += ` ORDER BY nom ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la recherche de livres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  getLivres,
  getLivreDetails,
  createLivre,
  updateLivre,
  deleteLivre,
  getLivresByFormation,
  searchLivres
};
