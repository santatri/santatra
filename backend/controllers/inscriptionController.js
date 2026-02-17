const { pool } = require('../db');

// Récupérer toutes les inscriptions
exports.getAllInscriptions = async (req, res) => {
  try {
    const { centre_id, formation_id, statut, page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        i.*,
        e.nom as etudiant_nom, e.prenom as etudiant_prenom, e.telephone, e.matricule, 
        e.statut as etudiant_statut, e.centre_id,
        f.nom as formation_nom, f.duree, f.frais_mensuel,
        c.nom as centre_nom
      FROM inscriptions i
      JOIN etudiants e ON i.etudiant_id = e.id
      JOIN formations f ON i.formation_id = f.id
      JOIN centres c ON e.centre_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Filtres
    if (centre_id) {
      query += ` AND e.centre_id = $${paramCount}`;
      params.push(centre_id);
      paramCount++;
    }

    if (formation_id) {
      query += ` AND i.formation_id = $${paramCount}`;
      params.push(formation_id);
      paramCount++;
    }

    if (statut) {
      query += ` AND i.statut = $${paramCount}`;
      params.push(statut);
      paramCount++;
    }

    // Recherche
    if (search) {
      query += ` AND (e.nom ILIKE $${paramCount} OR e.prenom ILIKE $${paramCount} OR e.matricule ILIKE $${paramCount} OR f.nom ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Compte total
    const countQuery = `SELECT COUNT(*) FROM (${query}) as total`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Pagination et tri
    query += ` ORDER BY i.date_inscription DESC, e.nom, e.prenom LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Récupérer les paiements pour chaque inscription
    const inscriptionsWithPayments = await Promise.all(result.rows.map(async (row) => {
      const paiementsQuery = await pool.query(
        'SELECT * FROM paiements WHERE inscription_id = $1 ORDER BY date_paiement DESC',
        [row.id]
      );

      // Normalize row to keep frontend compatibility with previous Supabase shape
      const normalized = {
        ...row,
        etudiants: {
          id: row.etudiant_id,
          nom: row.etudiant_nom,
          prenom: row.etudiant_prenom,
          telephone: row.telephone,
          matricule: row.matricule,
          statut: row.etudiant_statut,
          centre_id: row.centre_id
        },
        formations: {
          id: row.formation_id,
          nom: row.formation_nom,
          duree: row.duree,
          frais_mensuel: row.frais_mensuel
        },
        paiements: paiementsQuery.rows
      };

      return normalized;
    }));

    res.json({
      success: true,
      data: inscriptionsWithPayments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des inscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Récupérer une inscription par ID
exports.getInscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        i.*,
        e.nom as etudiant_nom, e.prenom as etudiant_prenom, e.telephone, e.matricule, 
        e.statut as etudiant_statut, e.centre_id,
        f.nom as formation_nom, f.duree, f.frais_mensuel,
        c.nom as centre_nom
      FROM inscriptions i
      JOIN etudiants e ON i.etudiant_id = e.id
      JOIN formations f ON i.formation_id = f.id
      JOIN centres c ON e.centre_id = c.id
      WHERE i.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inscription non trouvée'
      });
    }

    const paiementsQuery = await pool.query('SELECT * FROM paiements WHERE inscription_id = $1 ORDER BY date_paiement DESC', [id]);

    const row = result.rows[0];
    const normalized = {
      ...row,
      etudiants: {
        id: row.etudiant_id,
        nom: row.etudiant_nom,
        prenom: row.etudiant_prenom,
        telephone: row.telephone,
        matricule: row.matricule,
        statut: row.etudiant_statut,
        centre_id: row.centre_id
      },
      formations: {
        id: row.formation_id,
        nom: row.formation_nom,
        duree: row.duree,
        frais_mensuel: row.frais_mensuel
      },
      paiements: paiementsQuery.rows
    };

    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Créer une nouvelle inscription
exports.createInscription = async (req, res) => {
  try {
    const { etudiant_id, formation_id, date_inscription } = req.body;

    // Validation
    if (!etudiant_id || !formation_id) {
      return res.status(400).json({
        success: false,
        message: 'L\'étudiant et la formation sont obligatoires'
      });
    }

    // Vérifier si l'étudiant existe
    const etudiantCheck = await pool.query(
      'SELECT * FROM etudiants WHERE id = $1',
      [etudiant_id]
    );

    if (etudiantCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Étudiant non trouvé'
      });
    }

    // Vérifier si la formation existe
    const formationCheck = await pool.query(
      'SELECT * FROM formations WHERE id = $1',
      [formation_id]
    );

    if (formationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Formation non trouvée'
      });
    }

    // Créer l'inscription
    const result = await pool.query(
      `INSERT INTO inscriptions 
       (etudiant_id, formation_id, date_inscription, statut) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        etudiant_id,
        formation_id,
        date_inscription || new Date().toISOString().split('T')[0],
        'actif'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Inscription créée avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Mettre à jour une inscription (champs autorisés : statut, formation_id, date_inscription, droits_inscription_paye)
exports.updateInscription = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['statut', 'formation_id', 'date_inscription', 'droits_inscription_paye'];

    // Vérifier si l'inscription existe
    const inscriptionCheck = await pool.query('SELECT * FROM inscriptions WHERE id = $1', [id]);
    if (inscriptionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inscription non trouvée' });
    }

    // Préparer la mise à jour dynamiquement
    const updates = [];
    const params = [];
    let idx = 1;
    for (const key of Object.keys(req.body)) {
      if (!allowedFields.includes(key)) continue;
      updates.push(`${key} = $${idx}`);
      params.push(req.body[key]);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun champ modifiable fourni' });
    }

    const query = `UPDATE inscriptions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    res.json({ success: true, message: 'Inscription mise à jour avec succès', data: result.rows[0] });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'inscription:", error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Supprimer une inscription
exports.deleteInscription = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'inscription existe
    const inscriptionCheck = await pool.query(
      'SELECT * FROM inscriptions WHERE id = $1',
      [id]
    );

    if (inscriptionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inscription non trouvée'
      });
    }

    // Supprimer les paiements associés
    await pool.query('DELETE FROM paiements WHERE inscription_id = $1', [id]);

    // Supprimer l'inscription
    await pool.query('DELETE FROM inscriptions WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Inscription supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Obtenir les statistiques
exports.getStats = async (req, res) => {
  try {
    const { centre_id } = req.query;
    const today = new Date().toISOString().split('T')[0];

    // Statistiques par centre
    let statsQuery = `
      SELECT 
        c.id, c.nom,
        COUNT(DISTINCT e.id) as total_etudiants,
        COUNT(DISTINCT i.id) as total_inscriptions,
        SUM(CASE WHEN i.date_inscription = $1 THEN 1 ELSE 0 END) as nouveaux_aujourdhui,
        SUM(CASE WHEN i.statut = 'actif' THEN 1 ELSE 0 END) as inscriptions_actives,
        SUM(CASE WHEN i.statut = 'fini' THEN 1 ELSE 0 END) as inscriptions_terminees,
        SUM(CASE WHEN i.statut = 'quitte' THEN 1 ELSE 0 END) as inscriptions_quittees
      FROM centres c
      LEFT JOIN etudiants e ON c.id = e.centre_id
      LEFT JOIN inscriptions i ON e.id = i.etudiant_id
    `;

    const params = [today];
    let paramCount = 2;

    if (centre_id) {
      statsQuery += ` WHERE c.id = $${paramCount}`;
      params.push(centre_id);
    }

    statsQuery += ` GROUP BY c.id, c.nom ORDER BY c.nom`;

    const statsResult = await pool.query(statsQuery, params);

    // Statistiques par formation
    const formationsStatsQuery = `
      SELECT 
        f.id, f.nom, f.duree, f.frais_mensuel,
        COUNT(i.id) as total_inscriptions,
        SUM(CASE WHEN i.date_inscription = $1 THEN 1 ELSE 0 END) as nouveaux_aujourdhui,
        SUM(CASE WHEN i.statut = 'actif' THEN 1 ELSE 0 END) as actives,
        SUM(CASE WHEN i.statut = 'fini' THEN 1 ELSE 0 END) as terminees
      FROM formations f
      LEFT JOIN inscriptions i ON f.id = i.formation_id
      GROUP BY f.id, f.nom, f.duree, f.frais_mensuel
      ORDER BY total_inscriptions DESC
    `;

    const formationsStatsResult = await pool.query(formationsStatsQuery, [today]);

    res.json({
      success: true,
      data: {
        parCentre: statsResult.rows,
        parFormation: formationsStatsResult.rows,
        totalGeneraux: {
          nouveauxAujourdhui: statsResult.rows.reduce((sum, row) => sum + parseInt(row.nouveaux_aujourdhui || 0), 0),
          total: statsResult.rows.reduce((sum, row) => sum + parseInt(row.total_inscriptions || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};