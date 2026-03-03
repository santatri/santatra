// Modifier un paiement d'examen (admin uniquement)
exports.updatePaiementExamen = async (req, res) => {
  const { paiementId } = req.params;
  const { date_paiement } = req.body;
  try {
    const result = await pool.query(
      'UPDATE paiement_examen SET date_paiement = $1 WHERE id = $2 RETURNING *',
      [date_paiement, paiementId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
// Supprimer un paiement d'examen (admin uniquement)
exports.deletePaiementExamen = async (req, res) => {
  const { paiementId } = req.params;
  try {
    const result = await pool.query('DELETE FROM paiement_examen WHERE id = $1 RETURNING *', [paiementId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }
    res.json({ success: true, message: 'Paiement supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
const { pool } = require('../db');

// Examens
exports.getAllExamens = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM examens ORDER BY date_examen DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.getExamenById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.createExamen = async (req, res) => {
  const { nom, montant, session, date_examen } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO examens (nom, montant, session, date_examen) VALUES ($1, $2, $3, $4) RETURNING *',
      [nom, montant, session, date_examen]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Paiements examens

// Paiements examens enrichis avec infos inscription, étudiant, centre, formation
exports.getAllPaiements = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pe.*, e.nom as etudiant_nom, e.prenom as etudiant_prenom, c.nom as centre_nom, f.nom as formation_nom
      FROM paiement_examen pe
      JOIN inscriptions i ON pe.inscription_id = i.id
      JOIN etudiants e ON i.etudiant_id = e.id
      JOIN formations f ON i.formation_id = f.id
      JOIN centres c ON e.centre_id = c.id
      ORDER BY pe.date_paiement DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Paiements d'examen pour une inscription donnée
exports.getPaiementsByInscription = async (req, res) => {
  const { inscriptionId } = req.params;
  try {
    const result = await pool.query(`
      SELECT pe.*, e.nom as etudiant_nom, e.prenom as etudiant_prenom, c.nom as centre_nom, f.nom as formation_nom
      FROM paiement_examen pe
      JOIN inscriptions i ON pe.inscription_id = i.id
      JOIN etudiants e ON i.etudiant_id = e.id
      JOIN formations f ON i.formation_id = f.id
      JOIN centres c ON e.centre_id = c.id
      WHERE pe.inscription_id = $1
      ORDER BY pe.date_paiement DESC
    `, [inscriptionId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const mailController = require('./mailController');
const pdfService = require('../services/pdfService');
const DIRECTION_EMAIL = process.env.EMAIL_DIRECTION || process.env.DIRECTION_EMAIL || process.env.EMAIL_USER || null;
exports.createPaiementExamen = async (req, res) => {
  const { inscription_id, examen_id, date_paiement } = req.body;
  try {
    // Vérifier si tous les frais de formation sont payés pour cette inscription
    // 1. Récupérer l'inscription et la formation
    const inscriptionResult = await pool.query('SELECT * FROM inscriptions WHERE id = $1', [inscription_id]);
    if (inscriptionResult.rows.length === 0) {
      return res.status(400).json({ error: "Inscription non trouvée" });
    }
    const inscription = inscriptionResult.rows[0];
    // 2. Récupérer la formation
    const formationResult = await pool.query('SELECT * FROM formations WHERE id = $1', [inscription.formation_id]);
    if (formationResult.rows.length === 0) {
      return res.status(400).json({ error: "Formation non trouvée" });
    }
    const formation = formationResult.rows[0];
    // 3. Calculer le montant total à payer
    const duree = parseFloat(formation.duree);
    const frais_mensuel = parseFloat(formation.frais_mensuel);
    const totalFrais = Math.ceil(duree) * frais_mensuel;
    // 4. Récupérer tous les paiements de cette inscription
    const paiementsResult = await pool.query('SELECT SUM(montant) as total_paye FROM paiements WHERE inscription_id = $1', [inscription_id]);
    const totalPaye = parseFloat(paiementsResult.rows[0].total_paye || 0);
    // 5. Vérifier si le total payé >= totalFrais
    if (totalPaye < totalFrais) {
      return res.status(403).json({ error: "Tous les frais de formation ne sont pas payés pour cette inscription." });
    }
    // 6. Insérer le paiement d'examen
    const result = await pool.query(
      'INSERT INTO paiement_examen (inscription_id, examen_id, date_paiement) VALUES ($1, $2, $3) RETURNING *',
      [inscription_id, examen_id, date_paiement]
    );
    // 7. Envoi des mails (non bloquant)
    (async () => {
      try {
        // Récupérer les infos pour l'email
        const etudiantResult = await pool.query(
          'SELECT e.prenom, e.nom, e.email, c.nom as centre_nom FROM inscriptions i JOIN etudiants e ON i.etudiant_id = e.id LEFT JOIN centres c ON e.centre_id = c.id WHERE i.id = $1',
          [inscription_id]
        );
        const etudiant = etudiantResult.rows[0] || {};
        const examenResult = await pool.query('SELECT nom, montant, session FROM examens WHERE id = $1', [examen_id]);
        const examen = examenResult.rows[0] || {};
        const montantStr = examen.montant ? Number(examen.montant).toLocaleString('fr-FR') : '';
        // Email à l'étudiant
        if (etudiant.email) {
          try {
            // Générer le PDF du reçu
            const pdfBuffer = await pdfService.generateReceiptBuffer({
              prenom: etudiant.prenom,
              nom: etudiant.nom,
              centre_nom: etudiant.centre_nom,
              formation_nom: formation.nom || '',
              type_paiement: 'examen',
              montant: examen.montant,
              date_paiement: date_paiement || new Date().toISOString(),
              designation: `${examen.nom} (${examen.session || ''})`
            });

            await mailController.sendMailInternal({
              to: etudiant.email,
              subject: 'Confirmation paiement examen',
              text: `Bonjour ${etudiant.prenom} ${etudiant.nom},\n\nNous confirmons la réception de votre paiement d'examen :\nExamen : ${examen.nom} (${examen.session || ''})\nMontant : ${montantStr} Ar\nCentre : ${etudiant.centre_nom}\n\nVeuillez trouver ci-joint votre reçu de paiement.\n\nMerci pour votre confiance.\nLa Direction`,
              attachments: [
                {
                  filename: 'Recu_Paiement_Examen.pdf',
                  content: pdfBuffer
                }
              ]
            });
          } catch (err) {
            console.error('Erreur envoi mail étudiant (examen):', err.message || err);
          }
        }
        // Email à la direction
        if (DIRECTION_EMAIL) {
          try {
            await mailController.sendMailInternal({
              to: DIRECTION_EMAIL,
              subject: 'Paiement examen effectué',
              text: `Paiement examen effectué :\nÉtudiant : ${etudiant.prenom} ${etudiant.nom}\nCentre : ${etudiant.centre_nom}\nExamen : ${examen.nom} (${examen.session || ''})\nMontant : ${montantStr} Ar`
            });
          } catch (err) {
            console.error('Erreur envoi mail direction (examen):', err.message || err);
          }
        }
      } catch (err) {
        console.error('Erreur récupération infos pour mail (examen):', err.message || err);
      }
    })();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
exports.updateExamen = async (req, res) => {
  const { id } = req.params;
  const { nom, montant, session, date_examen } = req.body;
  try {
    const result = await pool.query(
      'UPDATE examens SET nom=$1, montant=$2, session=$3, date_examen=$4 WHERE id=$5 RETURNING *',
      [nom, montant, session, date_examen, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
exports.deleteExamen = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM examens WHERE id=$1', [id]);
    res.json({ success: true, message: 'Examen supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
