const { pool } = require('../db');

// Récupérer tous les étudiants avec leurs inscriptions
const getEtudiants = async (req, res) => {
  try {
    const user = req.user || null;

    let query = `
      SELECT 
        e.id,
        e.nom,
        e.prenom,
        e.matricule,
        e.email,
        e.telephone,
        e.centre_id,
        e.statut,
        e.created_at,
        c.nom as centre_nom,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'statut', i.statut,
              'date_inscription', i.date_inscription,
              'formations', json_build_object(
                'id', f.id,
                'nom', f.nom,
                'duree', f.duree
              )
            )
          ) FILTER (WHERE i.id IS NOT NULL), '[]'
        ) as inscriptions
      FROM etudiants e
      LEFT JOIN centres c ON e.centre_id = c.id
      LEFT JOIN inscriptions i ON e.id = i.etudiant_id
      LEFT JOIN formations f ON i.formation_id = f.id
    `;

    const params = [];
    let paramCount = 1;

    // Filtre par centre si l'utilisateur est gérant
    if (user && user.role === 'gerant') {
      query += ` WHERE e.centre_id = $${paramCount}`;
      params.push(user.centre_id);
      paramCount++;
    }

    query += ` GROUP BY e.id, c.id, e.created_at
               ORDER BY e.nom, e.prenom`;

    const result = await pool.query(query, params);

    // Calculer le statut global pour chaque étudiant
    const etudiantsAvecStatut = result.rows.map(etudiant => {
      const inscriptions = etudiant.inscriptions || [];
      let globalStatus = 'fini'; // Par défaut

      if (inscriptions.some(insc => insc.statut === 'actif')) {
        globalStatus = 'actif';
      } else if (inscriptions.some(insc => insc.statut === 'quitte')) {
        globalStatus = 'quitte';
      }

      return {
        ...etudiant,
        statut: globalStatus,
        centre_id: parseInt(etudiant.centre_id)
      };
    });

    res.json(etudiantsAvecStatut);
  } catch (err) {
    console.error('Erreur getEtudiants:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des étudiants' });
  }
};

// Récupérer les détails d'un étudiant
const getEtudiantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || null;

    // Vérifier l'accès si gérant
    if (user && user.role === 'gerant') {
      const accessCheck = await pool.query(
        'SELECT centre_id FROM etudiants WHERE id = $1',
        [id]
      );

      if (accessCheck.rows.length === 0 || accessCheck.rows[0].centre_id !== user.centre_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
    }

    // Récupérer l'étudiant
    const etudiantQuery = `
      SELECT 
        e.*,
        c.nom as centre_nom
      FROM etudiants e
      LEFT JOIN centres c ON e.centre_id = c.id
      WHERE e.id = $1
    `;

    const etudiantResult = await pool.query(etudiantQuery, [id]);

    if (etudiantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    const etudiant = etudiantResult.rows[0];

    // Récupérer les inscriptions avec formations et paiements
    const inscriptionsQuery = `
      SELECT 
        i.*,
        f.nom as formation_nom,
        f.duree as formation_duree,
        f.frais_mensuel,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'mois_paye', p.mois_paye,
              'type_paiement', p.type_paiement,
              'montant', p.montant,
              'date_paiement', p.date_paiement
            )
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as paiements
      FROM inscriptions i
      LEFT JOIN formations f ON i.formation_id = f.id
      LEFT JOIN paiements p ON i.id = p.inscription_id
      WHERE i.etudiant_id = $1
      GROUP BY i.id, f.id
      ORDER BY i.date_inscription DESC
    `;

    const inscriptionsResult = await pool.query(inscriptionsQuery, [id]);
    const inscriptions = inscriptionsResult.rows;

    // Calculer le statut global
    const inscriptionsArray = inscriptions || [];
    let globalStatus = 'fini';

    if (inscriptionsArray.some(insc => insc.statut === 'actif')) {
      globalStatus = 'actif';
    } else if (inscriptionsArray.some(insc => insc.statut === 'quitte')) {
      globalStatus = 'quitte';
    }

    // Mettre à jour le statut dans la base de données
    await pool.query(
      'UPDATE etudiants SET statut = $1 WHERE id = $2',
      [globalStatus, id]
    );

    etudiant.statut = globalStatus;

    res.json({
      etudiant,
      inscriptions: inscriptions.map(insc => ({
        ...insc,
        formations: {
          id: insc.formation_id,
          nom: insc.formation_nom,
          duree: insc.formation_duree,
          frais_mensuel: insc.frais_mensuel
        },
        paiements: insc.paiements
      }))
    });
  } catch (err) {
    console.error('Erreur getEtudiantDetails:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des détails' });
  }
};

// Créer un étudiant
const createEtudiant = async (req, res) => {
  try {
    const { nom, prenom, matricule, telephone, email, centre_id, date_creation } = req.body;
    console.debug('createEtudiant body:', req.body);
    const user = req.user || null;

    const today = new Date().toISOString().split('T')[0];
    const creationDate = date_creation || today;
    let finalMatricule = matricule;

    // Validation initiale (matricule facultatif si date_creation est aujourd'hui)
    if (!nom || !prenom) {
      return res.status(400).json({ message: 'Nom et prénom sont obligatoires' });
    }

    if (!finalMatricule && creationDate !== today) {
      return res.status(400).json({ message: 'Le matricule est obligatoire pour une inscription à une date passée' });
    }

    // Déterminer le centre_id
    let centreId;
    if (user && user.role === 'gerant') {
      centreId = user.centre_id;
    } else if (centre_id) {
      centreId = parseInt(centre_id);
    } else {
      return res.status(400).json({ message: 'Le centre est obligatoire' });
    }

    // Vérifier si le centre existe et récupérer son nom
    const centreCheck = await pool.query(
      'SELECT nom FROM centres WHERE id = $1',
      [centreId]
    );

    if (centreCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Le centre sélectionné n\'existe pas' });
    }

    const centreNom = centreCheck.rows[0].nom.replace(/\s+/g, ''); // Supprimer les espaces pour le matricule

    // Génération automatique du matricule si nécessaire
    if (!finalMatricule && creationDate === today) {
      const year = new Date().getFullYear();

      // Compter les étudiants du centre pour l'année en cours
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM etudiants 
         WHERE centre_id = $1 
         AND EXTRACT(YEAR FROM created_at) = $2`,
        [centreId, year]
      );

      const count = parseInt(countResult.rows[0].count);
      const sequence = (count + 1).toString().padStart(3, '0');
      finalMatricule = `CFPM-${year}-${sequence}-${centreNom}`;
    }

    // Insérer l'étudiant
    const result = await pool.query(
      `INSERT INTO etudiants (nom, prenom, matricule, email, telephone, centre_id, statut, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, 'actif', $7) 
       RETURNING id, nom, prenom, matricule, email, telephone, centre_id, statut, created_at`,
      [nom, prenom, finalMatricule, email || null, telephone || null, centreId, creationDate === today ? new Date() : creationDate]
    );

    console.debug('createEtudiant result:', result.rows[0]);

    res.status(201).json({
      message: 'Étudiant créé avec succès',
      etudiant: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur createEtudiant:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'étudiant' });
  }
};

// Mettre à jour un étudiant
const updateEtudiant = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, matricule, telephone, email, centre_id } = req.body;
    console.debug('updateEtudiant body:', req.params, req.body);
    const user = req.user || null;

    // Vérifier si l'étudiant existe
    const etudiantCheck = await pool.query(
      'SELECT * FROM etudiants WHERE id = $1',
      [id]
    );

    if (etudiantCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // Vérifier l'accès si gérant
    if (user && user.role === 'gerant') {
      if (etudiantCheck.rows[0].centre_id !== user.centre_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
    }

    // Validation
    if (!nom || !prenom || !matricule) {
      return res.status(400).json({ message: 'Nom, prénom et matricule sont obligatoires' });
    }

    // Déterminer le centre_id
    let centreId;
    if (user && user.role === 'gerant') {
      centreId = user.centre_id;
    } else if (centre_id) {
      centreId = parseInt(centre_id);
    } else {
      centreId = etudiantCheck.rows[0].centre_id;
    }

    // Mettre à jour l'étudiant
    const result = await pool.query(
      `UPDATE etudiants 
       SET nom = $1, prenom = $2, matricule = $3, email = $4, telephone = $5, centre_id = $6 
       WHERE id = $7 
       RETURNING id, nom, prenom, matricule, email, telephone, centre_id, statut, created_at`,
      [nom, prenom, matricule, email || null, telephone || null, centreId, id]
    );

    console.debug('updateEtudiant result:', result.rows[0]);

    res.json({
      message: 'Étudiant mis à jour avec succès',
      etudiant: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur updateEtudiant:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'étudiant' });
  }
};

// Supprimer un étudiant
const deleteEtudiant = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || null;

    // Vérifier si l'étudiant existe
    const etudiantCheck = await pool.query(
      'SELECT * FROM etudiants WHERE id = $1',
      [id]
    );

    if (etudiantCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // Vérifier l'accès si gérant
    if (user && user.role === 'gerant') {
      if (etudiantCheck.rows[0].centre_id !== user.centre_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
    }

    // Vérifier si l'étudiant a des inscriptions
    const inscriptionsCheck = await pool.query(
      'SELECT COUNT(*) FROM inscriptions WHERE etudiant_id = $1',
      [id]
    );

    if (parseInt(inscriptionsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: 'Impossible de supprimer cet étudiant car il a des inscriptions associées'
      });
    }

    // Supprimer l'étudiant
    await pool.query('DELETE FROM etudiants WHERE id = $1', [id]);

    res.json({ message: 'Étudiant supprimé avec succès' });
  } catch (err) {
    console.error('Erreur deleteEtudiant:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'étudiant' });
  }
};

// Rechercher des étudiants
const searchEtudiants = async (req, res) => {
  try {
    const { search, centre, statut } = req.query;
    const user = req.user || null;

    let query = `
      SELECT 
        e.*,
        c.nom as centre_nom,
        COALESCE(
          (SELECT 
            CASE 
              WHEN COUNT(i.id) = 0 THEN 'fini'
              WHEN SUM(CASE WHEN i.statut = 'actif' THEN 1 ELSE 0 END) > 0 THEN 'actif'
              WHEN SUM(CASE WHEN i.statut = 'quitte' THEN 1 ELSE 0 END) > 0 THEN 'quitte'
              ELSE 'fini'
            END
           FROM inscriptions i 
           WHERE i.etudiant_id = e.id
          ), 'fini'
        ) as statut
      FROM etudiants e
      LEFT JOIN centres c ON e.centre_id = c.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Filtre par centre
    if (user && user.role === 'gerant') {
      query += ` AND e.centre_id = $${paramCount}`;
      params.push(user.centre_id);
      paramCount++;
    } else if (centre) {
      query += ` AND e.centre_id = $${paramCount}`;
      params.push(parseInt(centre));
      paramCount++;
    }

    // Filtre par statut (calculé)
    if (statut) {
      const statutConditions = {
        'actif': ` AND EXISTS (SELECT 1 FROM inscriptions i WHERE i.etudiant_id = e.id AND i.statut = 'actif')`,
        'quitte': ` AND EXISTS (SELECT 1 FROM inscriptions i WHERE i.etudiant_id = e.id AND i.statut = 'quitte')`,
        'fini': ` AND NOT EXISTS (SELECT 1 FROM inscriptions i WHERE i.etudiant_id = e.id AND i.statut IN ('actif', 'quitte'))`
      };

      if (statutConditions[statut]) {
        query += statutConditions[statut];
      }
    }

    // Filtre par recherche
    if (search) {
      query += ` AND (
        e.nom ILIKE $${paramCount} OR
        e.prenom ILIKE $${paramCount} OR
        e.matricule ILIKE $${paramCount} OR
        e.telephone ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY e.nom, e.prenom`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur searchEtudiants:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la recherche des étudiants' });
  }
};

module.exports = {
  getEtudiants,
  getEtudiantDetails,
  createEtudiant,
  updateEtudiant,
  deleteEtudiant,
  searchEtudiants
};