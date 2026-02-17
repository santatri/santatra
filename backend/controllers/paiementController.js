const { pool } = require('../db');
const mailController = require('./mailController');

const DIRECTION_EMAIL = process.env.EMAIL_DIRECTION || process.env.DIRECTION_EMAIL || process.env.EMAIL_USER || null;

// Créer un paiement
exports.createPaiement = async (req, res) => {
  try {
    const { inscription_id, type_paiement, montant, mois_paye, date_paiement, livre_id, send_email } = req.body;

    // Vérifier l'inscription
    const inscriptionCheck = await pool.query(
      `SELECT i.*, f.frais_mensuel
       FROM inscriptions i
       JOIN formations f ON i.formation_id = f.id
       WHERE i.id = $1`,
      [inscription_id]
    );

    if (inscriptionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const inscription = inscriptionCheck.rows[0];

    // Utiliser la date fournie ou la date actuelle
    const finalDatePaiement = date_paiement || new Date().toISOString();

    // Vérifications spécifiques selon le type de paiement
    if (type_paiement === 'droits') {
      // Vérifier si les droits sont déjà payés
      const droitsExist = await pool.query(
        'SELECT id FROM paiements WHERE inscription_id = $1 AND type_paiement = $2',
        [inscription_id, 'droits']
      );

      if (droitsExist.rows.length > 0) {
        return res.status(400).json({ error: 'Les droits d\'inscription sont déjà payés' });
      }

      // Créer le paiement des droits
      const result = await pool.query(
        `INSERT INTO paiements 
         (inscription_id, type_paiement, montant, date_paiement) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [inscription_id, type_paiement, montant, finalDatePaiement]
      );

      // Mettre à jour l'inscription
      await pool.query(
        'UPDATE inscriptions SET droits_inscription_paye = true WHERE id = $1',
        [inscription_id]
      );

      // Envoi des mails (non bloquant pour la réponse) - SEULEMENT SI send_email est true
      if (send_email !== false) {
        (async () => {
          try {
            const det = await pool.query(
              `SELECT e.prenom, e.nom, e.email, c.nom as centre_nom, f.nom as formation_nom
               FROM inscriptions i
               JOIN etudiants e ON i.etudiant_id = e.id
               LEFT JOIN centres c ON e.centre_id = c.id
               JOIN formations f ON i.formation_id = f.id
               WHERE i.id = $1`,
              [inscription_id]
            );

            const info = det.rows[0] || {};
            const montantStr = Number(montant).toLocaleString('fr-FR');

            if (info.email) {
              try {
                await mailController.sendMailInternal({
                  to: info.email,
                  subject: 'Confirmation paiement',
                  text: `Bonjour ${info.prenom} ${info.nom},

                  Nous vous confirmons la bonne réception de votre paiement d'un montant de ${montantStr} Ar, effectué au titre de ${type_paiement}.

                  Centre : ${info.centre_nom}
                  Formation : ${info.formation_nom}

                  Nous vous remercions pour votre confiance et restons à votre disposition pour toute information complémentaire.

                  Cordialement,
                  La Direction de CFPM de Madagascar`

                });
              } catch (err) {
                console.error('Erreur envoi mail étudiant (droits):', err.message || err);
              }
            }

            if (DIRECTION_EMAIL) {
              try {
                await mailController.sendMailInternal({
                  to: DIRECTION_EMAIL,
                  subject: 'Paiement effectué',
                  text: `Notification de paiement

                  Un paiement a été effectué avec succès avec les informations suivantes :

                  Étudiant : ${info.prenom} ${info.nom}
                  Centre : ${info.centre_nom}
                  Formation : ${info.formation_nom}
                  Type de paiement : ${type_paiement}
                  Montant : ${montantStr} Ar

                  Merci de procéder aux vérifications et à la mise à jour des registres correspondants.

                  Cordialement,
                  Système de gestion`

                });
              } catch (err) {
                console.error('Erreur envoi mail direction (droits):', err.message || err);
              }
            }
          } catch (err) {
            console.error('Erreur récupération infos pour mail (droits):', err.message || err);
          }
        })();
      }

      return res.status(201).json(result.rows[0]);
    }

    // Paiement de mensualité
    if (type_paiement === 'formation') {
      if (!mois_paye) {
        return res.status(400).json({ error: 'Le mois à payer est requis' });
      }

      // Vérifier le montant total déjà payé pour ce mois
      const paiementsMois = await pool.query(
        `SELECT COALESCE(SUM(montant), 0) as total_paye 
         FROM paiements 
         WHERE inscription_id = $1 AND type_paiement = 'formation' AND mois_paye = $2`,
        [inscription_id, mois_paye]
      );

      const totalPaye = parseFloat(paiementsMois.rows[0].total_paye);
      const fraisMensuel = inscription.frais_mensuel || 0;
      const resteAPayer = fraisMensuel - totalPaye;

      if (montant > resteAPayer) {
        return res.status(400).json({
          error: `Montant trop élevé. Reste à payer: ${resteAPayer.toLocaleString()} Ar`
        });
      }

      // Créer le paiement
      const result = await pool.query(
        `INSERT INTO paiements 
         (inscription_id, type_paiement, montant, mois_paye, date_paiement) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [inscription_id, type_paiement, montant, mois_paye, finalDatePaiement]
      );

      // Envoi des mails (non bloquant pour la réponse) - SEULEMENT SI send_email est true
      if (send_email !== false) {
        (async () => {
          try {
            const det = await pool.query(
              `SELECT e.prenom, e.nom, e.email, c.nom as centre_nom, f.nom as formation_nom
               FROM inscriptions i
               JOIN etudiants e ON i.etudiant_id = e.id
               LEFT JOIN centres c ON e.centre_id = c.id
               JOIN formations f ON i.formation_id = f.id
               WHERE i.id = $1`,
              [inscription_id]
            );

            const info = det.rows[0] || {};
            const montantStr = Number(montant).toLocaleString('fr-FR');

            if (info.email) {
              try {
                await mailController.sendMailInternal({
                  to: info.email,
                  subject: 'Confirmation paiement',
                  text: `Bonjour ${info.prenom} ${info.nom},\nNous confirmons la réception de votre paiement de ${montantStr} Ar pour ${type_paiement}.\nCentre : ${info.centre_nom}\nFormation : ${info.formation_nom}\nMerci pour votre confiance.\nLa Direction`
                });
              } catch (err) {
                console.error('Erreur envoi mail étudiant (formation):', err.message || err);
              }
            }

            if (DIRECTION_EMAIL) {
              try {
                await mailController.sendMailInternal({
                  to: DIRECTION_EMAIL,
                  subject: 'Paiement effectué',
                  text: `Paiement effectué :\nÉtudiant : ${info.prenom} ${info.nom}\nCentre : ${info.centre_nom}\nFormation : ${info.formation_nom}\nType de paiement : ${type_paiement}\nMontant : ${montantStr} Ar`
                });
              } catch (err) {
                console.error('Erreur envoi mail direction (formation):', err.message || err);
              }
            }
          } catch (err) {
            console.error('Erreur récupération infos pour mail (formation):', err.message || err);
          }
        })();
      }

      res.status(201).json(result.rows[0]);
    }

    // Paiement de livre
    if (type_paiement === 'livre') {
      if (!livre_id) return res.status(400).json({ error: 'Le livre_id est requis pour un paiement de type livre' });

      // Vérifier que le livre existe et appartient à la formation
      const livreCheck = await pool.query(
        'SELECT * FROM livres WHERE id = $1',
        [livre_id]
      );
      if (livreCheck.rows.length === 0) return res.status(404).json({ error: 'Livre non trouvé' });

      const livre = livreCheck.rows[0];
      if (livre.formation_id !== inscription.formation_id) {
        // Le livre ne correspond pas à la formation de l'inscription
        return res.status(400).json({ error: 'Le livre ne correspond pas à la formation de cette inscription' });
      }

      // Vérifier si l'étudiant a déjà acheté ce livre
      const deja = await pool.query(
        'SELECT id FROM livres_etudiants WHERE etudiant_id = $1 AND livre_id = $2',
        [inscription.etudiant_id, livre_id]
      );
      if (deja.rows.length > 0) {
        return res.status(400).json({ error: 'Le livre a déjà été payé/acheté par cet étudiant' });
      }

      // Insérer le paiement
      const result = await pool.query(
        `INSERT INTO paiements (inscription_id, type_paiement, montant, date_paiement) VALUES ($1,$2,$3,$4) RETURNING *`,
        [inscription_id, type_paiement, montant, date_paiement || new Date().toISOString()]
      );

      // Insérer dans livres_etudiants
      await pool.query(
        `INSERT INTO livres_etudiants (etudiant_id, livre_id, date_achat) VALUES ($1, $2, $3)`,
        [inscription.etudiant_id, livre_id, (date_paiement || new Date().toISOString()).slice(0, 10)]
      );

      // Vérifier si tous les livres de la formation sont payés => mettre à jour inscriptions.livre_paye
      const livresForFormation = await pool.query(
        'SELECT id FROM livres WHERE formation_id = $1',
        [inscription.formation_id]
      );
      const livreIds = livresForFormation.rows.map(r => r.id);

      if (livreIds.length > 0) {
        const owned = await pool.query(
          `SELECT COUNT(DISTINCT livre_id) as cnt FROM livres_etudiants WHERE etudiant_id = $1 AND livre_id = ANY($2)`,
          [inscription.etudiant_id, livreIds]
        );
        const ownedCount = parseInt(owned.rows[0].cnt || 0, 10);
        if (ownedCount >= livreIds.length) {
          await pool.query('UPDATE inscriptions SET livre_paye = true WHERE id = $1', [inscription_id]);
        }
      }

      // Envoi mail (non bloquant) - SEULEMENT SI send_email est true
      if (send_email !== false) {
        (async () => {
          try {
            const det = await pool.query(
              `SELECT e.prenom, e.nom, e.email, c.nom as centre_nom, f.nom as formation_nom
               FROM inscriptions i
               JOIN etudiants e ON i.etudiant_id = e.id
               LEFT JOIN centres c ON e.centre_id = c.id
               JOIN formations f ON i.formation_id = f.id
               WHERE i.id = $1`,
              [inscription_id]
            );
            const info = det.rows[0] || {};
            const montantStr = Number(montant).toLocaleString('fr-FR');
            const livreNom = livre.nom || '';
            if (info.email) {
              try {
                await mailController.sendMailInternal({
                  to: info.email,
                  subject: 'Confirmation achat livre',
                  text: `Bonjour ${info.prenom} ${info.nom},\n\nNous confirmons la réception de votre paiement de ${montantStr} Ar pour le livre : ${livreNom}.\nFormation : ${info.formation_nom}\n\nCordialement.`
                });
              } catch (err) {
                console.error('Erreur envoi mail étudiant (livre):', err.message || err);
              }
            }
            if (DIRECTION_EMAIL) {
              try {
                await mailController.sendMailInternal({
                  to: DIRECTION_EMAIL,
                  subject: 'Achat livre effectué',
                  text: `Achat livre :\nÉtudiant : ${info.prenom} ${info.nom}\nFormation : ${info.formation_nom}\nLivre : ${livreNom}\nMontant : ${montantStr} Ar`
                });
              } catch (err) {
                console.error('Erreur envoi mail direction (livre):', err.message || err);
              }
            }
          } catch (err) {
            console.error('Erreur récupération infos pour mail (livre):', err.message || err);
          }
        })();
      }

      return res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Erreur création paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Paiement groupé de plusieurs mois
exports.createPaiementGroup = async (req, res) => {
  try {
    const { inscription_id, mois_list, date_paiement, send_email } = req.body;

    // Vérifier l'inscription
    const inscriptionCheck = await pool.query(
      `SELECT i.*, f.frais_mensuel
       FROM inscriptions i
       JOIN formations f ON i.formation_id = f.id
       WHERE i.id = $1`,
      [inscription_id]
    );

    if (inscriptionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const inscription = inscriptionCheck.rows[0];
    const paiementsBatch = [];
    const fraisMensuel = inscription.frais_mensuel || 0;

    // Utiliser la date fournie ou la date actuelle
    const finalDatePaiement = date_paiement || new Date().toISOString();

    // Pour chaque mois, calculer le reste à payer
    for (const mois of mois_list) {
      const paiementsMois = await pool.query(
        `SELECT COALESCE(SUM(montant), 0) as total_paye 
         FROM paiements 
         WHERE inscription_id = $1 AND type_paiement = 'formation' AND mois_paye = $2`,
        [inscription_id, mois]
      );

      const totalPaye = parseFloat(paiementsMois.rows[0].total_paye);
      const resteAPayer = fraisMensuel - totalPaye;

      if (resteAPayer > 0) {
        paiementsBatch.push({
          inscription_id,
          type_paiement: 'formation',
          montant: resteAPayer,
          mois_paye: mois,
          date_paiement: finalDatePaiement
        });
      }
    }

    if (paiementsBatch.length === 0) {
      return res.status(400).json({ error: 'Aucun montant à payer' });
    }

    // Insérer tous les paiements
    const results = [];
    for (const paiement of paiementsBatch) {
      const result = await pool.query(
        `INSERT INTO paiements 
         (inscription_id, type_paiement, montant, mois_paye, date_paiement) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [paiement.inscription_id, paiement.type_paiement, paiement.montant,
        paiement.mois_paye, paiement.date_paiement]
      );
      results.push(result.rows[0]);
    }

    // Envoi des mails résumé (non bloquant) - SEULEMENT SI send_email est true
    if (send_email !== false) {
      (async () => {
        try {
          const det = await pool.query(
            `SELECT e.prenom, e.nom, e.email, c.nom as centre_nom, f.nom as formation_nom
           FROM inscriptions i
           JOIN etudiants e ON i.etudiant_id = e.id
           LEFT JOIN centres c ON e.centre_id = c.id
           JOIN formations f ON i.formation_id = f.id
           WHERE i.id = $1`,
            [inscription_id]
          );

          const info = det.rows[0] || {};
          const montantTotal = results.reduce((s, r) => s + (Number(r.montant) || 0), 0);
          const montantTotalStr = Number(montantTotal).toLocaleString('fr-FR');
          const detailsLines = results.map(r => `${r.mois_paye} : ${Number(r.montant).toLocaleString('fr-FR')} Ar`).join('\n');

          if (info.email) {
            try {
              await mailController.sendMailInternal({
                to: info.email,
                subject: 'Confirmation paiement',
                text: `Bonjour ${info.prenom} ${info.nom},\nNous confirmons la réception de votre paiement de ${montantTotalStr} Ar pour les mensualités suivantes:\n${detailsLines}\nCentre : ${info.centre_nom}\nFormation : ${info.formation_nom}\nMerci pour votre confiance.\nLa Direction`
              });
            } catch (err) {
              console.error('Erreur envoi mail étudiant (batch):', err.message || err);
            }
          }

          if (DIRECTION_EMAIL) {
            try {
              await mailController.sendMailInternal({
                to: DIRECTION_EMAIL,
                subject: 'Paiement effectué',
                text: `Paiement effectué :\nÉtudiant : ${info.prenom} ${info.nom}\nCentre : ${info.centre_nom}\nFormation : ${info.formation_nom}\nType de paiement : formation (paiement groupé)\nMontant total : ${montantTotalStr} Ar\nDétails :\n${detailsLines}`
              });
            } catch (err) {
              console.error('Erreur envoi mail direction (batch):', err.message || err);
            }
          }
        } catch (err) {
          console.error('Erreur récupération infos pour mail (batch):', err.message || err);
        }
      })();
    }

    res.status(201).json({
      message: `${results.length} paiements créés avec succès`,
      paiements: results
    });
  } catch (error) {
    console.error('Erreur paiement groupé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer les paiements d'une inscription
exports.getPaiementsByInscription = async (req, res) => {
  try {
    const { inscriptionId } = req.params;

    // Vérifier l'inscription
    const inscriptionCheck = await pool.query(
      'SELECT id FROM inscriptions WHERE id = $1',
      [inscriptionId]
    );

    if (inscriptionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    // Récupérer les paiements
    const result = await pool.query(
      `SELECT * FROM paiements WHERE inscription_id = $1 ORDER BY date_paiement DESC`,
      [inscriptionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération paiements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer le dernier montant des droits d'inscription
exports.getLatestDroits = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM droits_inscription ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur récupération droits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer les retards de paiement de formation
exports.getRetardsPaiement = async (req, res) => {
  try {
    const { centre_id } = req.query;

    let query = `
      SELECT 
        i.id as inscription_id,
        i.etudiant_id,
        i.date_inscription,
        i.droits_inscription_paye,
        e.id as etudiant_id_check,
        e.nom,
        e.prenom,
        e.matricule,
        e.telephone,
        e.statut,
        e.centre_id,
        c.nom as centre_nom,
        c.adresse as centre_adresse,
        f.nom as formation_nom,
        f.duree,
        f.frais_mensuel
      FROM inscriptions i
      JOIN etudiants e ON i.etudiant_id = e.id
      LEFT JOIN centres c ON e.centre_id = c.id
      JOIN formations f ON i.formation_id = f.id
      WHERE i.statut != 'quitte' AND e.statut = 'actif'
    `;

    const params = [];
    if (centre_id) {
      params.push(centre_id);
      query += ` AND e.centre_id = $${params.length}`;
    }

    query += ` ORDER BY i.date_inscription DESC`;

    const result = await pool.query(query, params);
    const inscriptions = result.rows;

    // Fetch paiements for all inscriptions
    const insIds = inscriptions.map(i => i.inscription_id);
    if (insIds.length === 0) {
      return res.json([]);
    }

    const paiementsResult = await pool.query(
      `SELECT * FROM paiements WHERE inscription_id = ANY($1)`,
      [insIds]
    );
    const paiementsMap = {};
    paiementsResult.rows.forEach(p => {
      if (!paiementsMap[p.inscription_id]) {
        paiementsMap[p.inscription_id] = [];
      }
      paiementsMap[p.inscription_id].push(p);
    });

    // Helper: generate months from inscription date and duration
    const generateMoisFormation = (dateInscription, duree) => {
      const dureeFloat = parseFloat(duree);
      if (dureeFloat <= 0.25) return ["Frais de semaine"];
      if (dureeFloat <= 0.5) return ["Frais de formation (2 semaines)"];
      if (dureeFloat <= 0.75) return ["Frais de formation (3 semaines)"];
      if (dureeFloat === 1.5) return ["Frais de formation (1.5 mois)"];

      const months = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
      const start = new Date(dateInscription);
      const list = [];
      const nombreMois = Math.ceil(dureeFloat);
      for (let i = 0; i < nombreMois; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        list.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
      }
      return list;
    };

    const normalizeMoisStr = (str) => {
      if (!str) return "";
      const parts = str.trim().split(/\s+/);
      if (parts.length < 2) return str;
      let [mois, annee] = parts;
      mois = mois.toLowerCase();
      const mapping = {
        "janvier": "Janv", "janv": "Janv", "jan": "Janv",
        "février": "Fév", "fevrier": "Fév", "fév": "Fév", "fev": "Fév",
        "mars": "Mars", "mar": "Mars",
        "avril": "Avr", "avr": "Avr",
        "mai": "Mai",
        "juin": "Juin",
        "juillet": "Juil", "juil": "Juil",
        "août": "Août", "aout": "Août", "aou": "Août",
        "septembre": "Sept", "sept": "Sept",
        "octobre": "Oct", "oct": "Oct",
        "novembre": "Nov", "nov": "Nov",
        "décembre": "Déc", "decembre": "Déc", "déc": "Déc", "dec": "Déc"
      };
      const moisNormalise = mapping[mois] || parts[0];
      const moisCapitalized = moisNormalise.charAt(0).toUpperCase() + moisNormalise.slice(1);
      return `${moisCapitalized} ${annee}`;
    };

    const retards = [];
    const aujourd = new Date();

    inscriptions.forEach(insc => {
      const moisFormation = generateMoisFormation(insc.date_inscription, insc.duree);
      const paiementsFormation = (paiementsMap[insc.inscription_id] || []).filter(p =>
        p.type_paiement === 'formation'
      );

      const moisPayes = moisFormation.filter(mois => {
        const moisNorm = normalizeMoisStr(mois);
        const paiementsCeMois = paiementsFormation.filter(p => {
          const pMoisNorm = normalizeMoisStr(p.mois_paye);
          return pMoisNorm === moisNorm;
        });
        const totalPaye = paiementsCeMois.reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
        return totalPaye >= (insc.frais_mensuel || 0);
      });

      const premierMoisNonPaye = moisFormation.find(mois => !moisPayes.includes(mois));

      if (premierMoisNonPaye) {
        let dateLimitePaiement;
        if (premierMoisNonPaye.startsWith("Frais de formation")) {
          const start = new Date(insc.date_inscription);
          dateLimitePaiement = new Date(start.getFullYear(), start.getMonth() + 1, 5, 23, 59, 59);
        } else {
          const [moisStr, anneeStr] = premierMoisNonPaye.split(' ');
          const moisIndex = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"].indexOf(moisStr);
          const annee = parseInt(anneeStr);
          dateLimitePaiement = new Date(annee, moisIndex + 1, 5, 23, 59, 59);
        }

        // DEBUG
        if (insc.etudiant_id === 2) {
          console.log(`DEBUG ${insc.nom}:`, {
            premiere_mois_non_paye: premierMoisNonPaye,
            date_limite: dateLimitePaiement.toISOString(),
            aujourd_hui: aujourd.toISOString(),
            est_en_retard: aujourd > dateLimitePaiement,
            mois_formation: moisFormation,
            mois_payes: moisPayes,
            paiements_formation: paiementsFormation
          });
        }

        if (aujourd > dateLimitePaiement) {
          const joursRetard = Math.floor((aujourd - dateLimitePaiement) / (1000 * 60 * 60 * 24));
          retards.push({
            etudiant_id: insc.etudiant_id,
            inscription_id: insc.inscription_id,
            nom: insc.nom,
            prenom: insc.prenom,
            matricule: insc.matricule,
            telephone: insc.telephone,
            centre_nom: insc.centre_nom,
            centre_adresse: insc.centre_adresse,
            formation_nom: insc.formation_nom,
            duree: insc.duree,
            frais_mensuel: insc.frais_mensuel,
            date_inscription: insc.date_inscription,
            date_limite_paiement: dateLimitePaiement.toISOString().split('T')[0],
            jours_retard: joursRetard,
            mois_en_retard: premierMoisNonPaye,
            tous_les_mois: moisFormation,
            mois_payes: moisPayes,
            paiements: paiementsFormation
          });
        }
      }
    });

    const sorted = retards.sort((a, b) => b.jours_retard - a.jours_retard);
    res.json(sorted);
  } catch (error) {
    console.error('Erreur getRetardsPaiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer tous les paiements (avec inscriptions, étudiants et formations jointes)
exports.getAllPaiements = async (req, res) => {
  try {
    const { centre_id, formation_id, start_date, end_date } = req.query;

    let query = `
      SELECT p.*, i.id as inscription_id, i.etudiant_id, i.formation_id, i.date_inscription,
             json_build_object('id', e.id, 'nom', e.nom, 'prenom', e.prenom, 'centre_id', e.centre_id, 'statut', e.statut) as etudiants,
             json_build_object('id', f.id, 'nom', f.nom) as formations
      FROM paiements p
      LEFT JOIN inscriptions i ON p.inscription_id = i.id
      LEFT JOIN etudiants e ON i.etudiant_id = e.id
      LEFT JOIN formations f ON i.formation_id = f.id
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    if (centre_id) {
      query += ` AND e.centre_id = $${idx}`;
      params.push(centre_id);
      idx++;
    }

    if (formation_id) {
      query += ` AND i.formation_id = $${idx}`;
      params.push(formation_id);
      idx++;
    }

    if (start_date) {
      query += ` AND p.date_paiement >= $${idx}`;
      params.push(start_date);
      idx++;
    }

    if (end_date) {
      query += ` AND p.date_paiement <= $${idx}`;
      params.push(end_date);
      idx++;
    }

    query += ' ORDER BY p.date_paiement DESC, p.id DESC';

    const result = await pool.query(query, params);

    // Normalize rows so frontend can access p.inscriptions.* like before
    const normalized = result.rows.map(r => ({
      ...r,
      inscriptions: {
        id: r.inscription_id,
        etudiant_id: r.etudiant_id,
        formation_id: r.formation_id,
        date_inscription: r.date_inscription,
        etudiants: r.etudiants,
        formations: r.formations
      }
    }));

    res.json(normalized);
  } catch (error) {
    console.error('Erreur récupération paiements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer les données du dashboard montants (montants du mois prochain)
exports.getDashboardMontants = async (req, res) => {
  try {
    const userCentreId = req.query.centre_id ? parseInt(req.query.centre_id) : null;

    // Calculer la date cible (mois prochain)
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    // 1. Récupérer les centres
    let centresQuery = 'SELECT * FROM centres ORDER BY nom ASC';
    const centresResult = await pool.query(centresQuery);
    let centresData = centresResult.rows;

    // 2. Filtrer les données par centre_id si fourni
    if (userCentreId) {
      centresData = centresData.filter(c => c.id === userCentreId);
    }

    const centreIds = centresData.map(c => c.id);

    // 3. Récupérer les étudiants actifs
    let etudiantsQuery = `
      SELECT * FROM etudiants 
      WHERE centre_id = ANY($1) AND statut = 'actif'
    `;
    const etudiantsResult = await pool.query(etudiantsQuery, [centreIds]);
    const etudiantsData = etudiantsResult.rows;
    const etudiantIds = etudiantsData.map(e => e.id);

    // 4. Récupérer les inscriptions actives des étudiants
    let inscriptionsQuery = `
      SELECT i.*, f.frais_mensuel, f.duree, f.nom as formation_nom
      FROM inscriptions i
      JOIN formations f ON i.formation_id = f.id
      WHERE i.etudiant_id = ANY($1) 
        AND i.statut NOT IN ('fini', 'quitte')
    `;
    const inscriptionsResult = await pool.query(inscriptionsQuery, [etudiantIds]);
    const inscriptionsData = inscriptionsResult.rows;

    // 5. Récupérer tous les paiements
    let paiementsQuery = `
      SELECT * FROM paiements 
      WHERE inscription_id = ANY($1)
    `;
    const inscriptionIds = inscriptionsData.map(i => i.id);
    let paiementsData = [];
    if (inscriptionIds.length > 0) {
      const paiementsResult = await pool.query(paiementsQuery, [inscriptionIds]);
      paiementsData = paiementsResult.rows;
    }

    // Fonction pour vérifier si un paiement correspond à la date cible
    function paymentMatchesTarget(p) {
      if (!p) return false;
      if (p.mois_paye) {
        const parsed = parseMonthYearFromString(p.mois_paye);
        if (parsed) return parsed.month === targetMonth + 1 && parsed.year === targetYear;
      }
      if (p.date_paiement) {
        const d = new Date(p.date_paiement);
        if (!isNaN(d.getTime())) {
          return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        }
      }
      return false;
    }

    // Fonction pour vérifier si une formation est active
    function formationActive(inscription, duree) {
      if (!inscription || !duree) return false;
      if (inscription.statut === 'fini' || inscription.statut === 'quitte') {
        return false;
      }

      const debut = new Date(inscription.date_inscription);
      const fin = new Date(debut);
      const dureeFloat = parseFloat(duree);
      const moisEntiers = Math.floor(dureeFloat);
      const joursDecimaux = Math.round((dureeFloat - moisEntiers) * 30);
      fin.setMonth(fin.getMonth() + moisEntiers);
      fin.setDate(fin.getDate() + joursDecimaux);

      const finDeMoisProchain = new Date(targetYear, targetMonth + 1, 0);
      return fin > finDeMoisProchain;
    }

    // Calculer les totaux par centre
    const centresMontants = centresData.map(centre => {
      const etudiantsCentre = etudiantsData.filter(
        e => e.centre_id === centre.id && e.statut === 'actif'
      );

      let totalDû = 0;
      const formationDetails = {};

      etudiantsCentre.forEach(et => {
        const inscriptionsEt = inscriptionsData.filter(
          ins => ins.etudiant_id === et.id
        );

        inscriptionsEt.forEach(ins => {
          if (!formationActive(ins, ins.duree)) return;

          const paiementPourIns = paiementsData.find(
            p =>
              p.inscription_id === ins.id &&
              String(p.type_paiement).toLowerCase() === 'formation'
          );
          const dejaPaye = paiementPourIns
            ? paymentMatchesTarget(paiementPourIns)
            : false;

          const fraisMensuel = Number(ins.frais_mensuel) || 0;

          if (!dejaPaye) totalDû += fraisMensuel;

          if (!formationDetails[ins.formation_id]) {
            formationDetails[ins.formation_id] = {
              id: ins.formation_id,
              nom: ins.formation_nom,
              fraisUnitaire: fraisMensuel,
              nbInscrits: 0,
              totalDû: 0
            };
          }

          formationDetails[ins.formation_id].nbInscrits += 1;
          if (!dejaPaye)
            formationDetails[ins.formation_id].totalDû += fraisMensuel;
        });
      });

      return {
        ...centre,
        totalDû,
        formationDetails: Object.values(formationDetails),
        nbEtudiantsActifs: etudiantsCentre.length
      };
    });

    // Calculer le total général
    const totalGeneral = centresMontants.reduce(
      (sum, c) => sum + c.totalDû,
      0
    );
    const nbEtudiantsActifsTotal = etudiantsData.length;

    res.json({
      centres: centresMontants,
      totalGeneral,
      nbEtudiantsActifsTotal,
      targetMonth: targetMonth + 1,
      targetYear,
      moisFormat: targetDate.toLocaleString('fr-FR', {
        month: 'long',
        year: 'numeric'
      })
    });
  } catch (error) {
    console.error('Erreur dashboard montants:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Fonction utilitaire pour parser les dates avec mois
function parseMonthYearFromString(s) {
  if (!s) return null;
  const str = String(s).trim().toLowerCase();
  const monthsMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    janvier: 1,
    février: 2,
    fevrier: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    août: 8,
    aout: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    décembre: 12,
    decembre: 12
  };
  const monthNameMatch = str.match(/([a-zéûôàê]+)\s+(\d{4})/i);
  if (monthNameMatch) {
    const name = monthNameMatch[1]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const year = Number(monthNameMatch[2]);
    const key = name.toLowerCase();
    for (const [k, v] of Object.entries(monthsMap)) {
      const kn = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (kn.toLowerCase() === key) return { month: v, year };
    }
  }
  return null;
}