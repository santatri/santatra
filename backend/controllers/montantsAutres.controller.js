const { pool } = require('../db');
const mailController = require('./mailController');

const DIRECTION_EMAIL = process.env.EMAIL_DIRECTION || process.env.DIRECTION_EMAIL || process.env.EMAIL_USER || null;

const createMontantAutre = async (req, res) => {
  const {
    type_montant_id,
    centre_id,
    etudiant_id,
    montant,
    reference,
    commentaire,
    date_paiement,
    send_email
  } = req.body;

  try {
    // Validation
    if (!type_montant_id || !montant || !date_paiement) {
      return res.status(400).json({
        message: 'Type, montant et date de paiement sont obligatoires'
      });
    }

    // Vérifier si le type existe
    const typeCheck = await pool.query(
      'SELECT id FROM types_montants WHERE id = $1',
      [type_montant_id]
    );

    if (typeCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Type de montant invalide' });
    }

    // Vérifier si le centre existe (si fourni)
    if (centre_id) {
      const centreCheck = await pool.query(
        'SELECT id FROM centres WHERE id = $1',
        [centre_id]
      );
      if (centreCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Centre invalide' });
      }
    }

    // Vérifier si l'étudiant existe (si fourni)
    if (etudiant_id) {
      const etudiantCheck = await pool.query(
        'SELECT id FROM etudiants WHERE id = $1',
        [etudiant_id]
      );
      if (etudiantCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Étudiant invalide' });
      }
    }

    const result = await pool.query(
      `INSERT INTO montants_autres
      (type_montant_id, centre_id, etudiant_id, montant, reference, commentaire, date_paiement)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        type_montant_id,
        centre_id || null,
        etudiant_id || null,
        parseFloat(montant),
        reference || null,
        commentaire || null,
        date_paiement
      ]
    );

    // Envoi des mails (non bloquant)
    if (send_email !== false) {
      (async () => {
        try {
          // Récupérer les détails complets pour l'email
          const detailsQuery = `
            SELECT 
              tm.libelle as type_libelle,
              c.nom as centre_nom,
              e.nom as etudiant_nom, e.prenom as etudiant_prenom, e.email as etudiant_email
            FROM types_montants tm
            LEFT JOIN centres c ON c.id = $1
            LEFT JOIN etudiants e ON e.id = $2
            WHERE tm.id = $3
          `;

          const detailsRes = await pool.query(detailsQuery, [
            centre_id || null,
            etudiant_id || null,
            type_montant_id
          ]);

          const info = detailsRes.rows[0];

          if (!info) return;


          // Récupérer les formations de l'étudiant
          let formationsStr = 'Non spécifié';
          if (etudiant_id) {
            const formationsQuery = `
              SELECT DISTINCT f.nom
              FROM inscriptions i
              JOIN formations f ON i.formation_id = f.id
              WHERE i.etudiant_id = $1 AND i.statut != 'quitte'
            `;
            const formationsRes = await pool.query(formationsQuery, [etudiant_id]);
            if (formationsRes.rows.length > 0) {
              formationsStr = formationsRes.rows.map(r => r.nom).join(', ');
            }
          }

          const montantStr = Number(montant).toLocaleString('fr-FR');
          const typeLabel = info.type_libelle;
          const etudiantLabel = info.etudiant_nom ? `${info.etudiant_prenom} ${info.etudiant_nom}` : 'Non spécifié';
          const centreLabel = info.centre_nom || 'Non spécifié';

          // Email à l'étudiant
          if (info.etudiant_email) {
            try {
              await mailController.sendMailInternal({
                to: info.etudiant_email,
                subject: 'Confirmation paiement',
                text: `Bonjour ${info.etudiant_prenom} ${info.etudiant_nom},
                
                Nous confirmons la réception de votre paiement :
                Type : ${typeLabel}
                Montant : ${montantStr} Ar
                Centre : ${centreLabel}
                Formation(s) : ${formationsStr}
                ${commentaire ? `Note : ${commentaire}` : ''}
                
                Merci pour votre confiance.
                
                Cordialement,
                La Direction`
              });
            } catch (err) {
              console.error('Erreur envoi mail étudiant (autre montant):', err.message || err);
            }
          }

          // Email à la direction
          if (DIRECTION_EMAIL) {
            try {
              await mailController.sendMailInternal({
                to: DIRECTION_EMAIL,
                subject: 'Nouveau paiement (Autre)',
                text: `Nouveau paiement enregistré :
                
                Type : ${typeLabel}
                Montant : ${montantStr} Ar
                Étudiant : ${etudiantLabel}
                Centre : ${centreLabel}
                Formation(s) : ${formationsStr}
                Référence : ${reference || '-'}
                Commentaire : ${commentaire || '-'}
                
                Cordialement,
                Système de gestion`
              });
            } catch (err) {
              console.error('Erreur envoi mail direction (autre montant):', err.message || err);
            }
          }

        } catch (err) {
          console.error('Erreur préparation mails (autre montant):', err);
        }
      })();
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur création montant:', err);
    res.status(500).json({
      message: 'Erreur enregistrement paiement',
      error: err.message
    });
  }
};

const getMontantsAutres = async (req, res) => {
  const { centre_id, start_date, end_date } = req.query;
  try {
    let query = `
      SELECT 
        ma.id,
        ma.montant,
        ma.date_paiement,
        ma.reference,
        ma.commentaire,
        ma.centre_id,
        ma.type_montant_id,
        ma.etudiant_id,
        COALESCE(tm.libelle, 'Type inconnu') AS type_montant,
        COALESCE(c.nom, 'Non spécifié') AS centre,
        COALESCE(CONCAT(e.nom, ' ', e.prenom), 'Non spécifié') AS etudiant
      FROM montants_autres ma
      LEFT JOIN types_montants tm ON ma.type_montant_id = tm.id
      LEFT JOIN centres c ON ma.centre_id = c.id
      LEFT JOIN etudiants e ON ma.etudiant_id = e.id
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    if (centre_id) {
      query += ` AND ma.centre_id = $${idx}`;
      params.push(centre_id);
      idx++;
    }

    if (start_date) {
      query += ` AND ma.date_paiement >= $${idx}`;
      params.push(start_date);
      idx++;
    }

    if (end_date) {
      query += ` AND ma.date_paiement <= $${idx}`;
      params.push(end_date);
      idx++;
    }

    query += ` ORDER BY ma.date_paiement DESC, ma.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération montants:', err);
    res.status(500).json({
      message: 'Erreur récupération paiements',
      error: err.message
    });
  }
};

const getMontantAutreById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        ma.*,
        tm.libelle AS type_montant,
        c.nom AS centre_nom,
        CONCAT(e.nom, ' ', e.prenom) AS etudiant_nom
      FROM montants_autres ma
      LEFT JOIN types_montants tm ON ma.type_montant_id = tm.id
      LEFT JOIN centres c ON ma.centre_id = c.id
      LEFT JOIN etudiants e ON ma.etudiant_id = e.id
      WHERE ma.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur récupération montant:', err);
    res.status(500).json({
      message: 'Erreur récupération paiement',
      error: err.message
    });
  }
};

const updateMontantAutre = async (req, res) => {
  const { id } = req.params;
  const {
    type_montant_id,
    centre_id,
    etudiant_id,
    montant,
    reference,
    commentaire,
    date_paiement
  } = req.body;

  try {
    // Vérifier si le montant existe
    const check = await pool.query(
      'SELECT id FROM montants_autres WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    const result = await pool.query(
      `UPDATE montants_autres
       SET type_montant_id = $1,
           centre_id = $2,
           etudiant_id = $3,
           montant = $4,
           reference = $5,
           commentaire = $6,
           date_paiement = $7
       WHERE id = $8
       RETURNING *`,
      [
        type_montant_id,
        centre_id || null,
        etudiant_id || null,
        parseFloat(montant),
        reference || null,
        commentaire || null,
        date_paiement,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur mise à jour montant:', err);
    res.status(500).json({
      message: 'Erreur mise à jour paiement',
      error: err.message
    });
  }
};

const deleteMontantAutre = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM montants_autres WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    res.json({ message: 'Paiement supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression montant:', err);
    res.status(500).json({
      message: 'Erreur suppression paiement',
      error: err.message
    });
  }
};

module.exports = {
  createMontantAutre,
  getMontantsAutres,
  getMontantAutreById,
  updateMontantAutre,
  deleteMontantAutre
};