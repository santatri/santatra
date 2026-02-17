import { supabase } from '../api/supabaseClient';

// Fonction utilitaire pour générer les mois (identique à celle des Inscriptions)
const generateMoisFormation = (dateInscription, duree) => {
  const dureeFloat = parseFloat(duree);

  // Cas spéciaux pour les courtes durées
  if (dureeFloat <= 0.25) return ["Frais de semaine"];
  if (dureeFloat <= 0.5) return ["Frais de formation (2 semaines)"];
  if (dureeFloat <= 0.75) return ["Frais de formation (3 semaines)"];
  if (dureeFloat === 1.5) return ["Frais de formation (1.5 mois)"];

  const months = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
  const start = new Date(dateInscription);
  let list = [];
  const nombreMois = Math.ceil(dureeFloat); // Arrondir au supérieur pour couvrir la durée
  for (let i = 0; i < nombreMois; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    list.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
  }
  return list;
};

// Fonction pour normaliser les mois (ex: "Janvier 2023" -> "Janv 2023")
const normalizeMoisStr = (str) => {
  if (!str) return "";
  const parts = str.trim().split(/\s+/);
  if (parts.length < 2) return str; // Pas de format attendu

  let [mois, annee] = parts;
  mois = mois.toLowerCase();

  // Mapping des mois complets vers abrégés
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

  const moisNormalise = mapping[mois] || parts[0]; // Fallback au premier mot si pas trouvé
  // Assurer que la première lettre est majuscule
  const moisCapitalized = moisNormalise.charAt(0).toUpperCase() + moisNormalise.slice(1);
  return `${moisCapitalized} ${annee}`;
};

export const paiementService = {
  // Récupérer les étudiants en retard de paiement de formation
  getRetardsPaiementFormation: async (user = null) => {
    try {
      // Récupérer toutes les inscriptions actives avec leurs formations et paiements
      let query = supabase
        .from('inscriptions')
        .select(`
          id,
          etudiant_id,
          date_inscription,
          droits_inscription_paye,
          etudiants(
            id,
            nom,
            prenom,
            matricule,
            telephone,
            statut,
            centre_id,
            centres(nom, adresse)
          ),
          formations(
            nom,
            duree,
            frais_mensuel
          ),
          paiements(
            type_paiement,
            mois_paye,
            date_paiement,
            montant
          )
        `)
        .eq('etudiants.statut', 'actif')
        .neq('statut', 'quitte');

      // Si l'utilisateur est un gérant, restreindre aux inscriptions de son centre
      if (user && user.role === 'gerant') {
        query = query.eq('etudiants.centre_id', user.centre_id);
      }

      const { data: inscriptions, error } = await query;

      if (error) throw error;

      const aujourdhui = new Date();
      const retards = [];

      inscriptions.forEach(inscription => {
        if (!inscription.etudiants || !inscription.formations) return;

        // Générer les mois de formation (comme dans la page Inscriptions)
        const moisFormation = generateMoisFormation(
          inscription.date_inscription,
          inscription.formations.duree
        );

        // Récupérer les mois déjà payés
        const paiementsFormation = inscription.paiements?.filter(p =>
          p.type_paiement === 'formation'
        ) || [];

        // Un mois est considéré comme payé SEULEMENT si le total payé >= frais mensuel
        const moisPayes = moisFormation.filter(mois => {
          // On compare les mois normalisés
          const moisNormalise = normalizeMoisStr(mois);

          const paiementsCeMois = paiementsFormation.filter(p => {
            const pMoisNorm = normalizeMoisStr(p.mois_paye);
            let match = pMoisNorm === moisNormalise;

            // RETRO-COMPATIBILITÉ : Si le label est "Frais de formation...", on vérifie aussi si le mois standard (ex: "Janv 2023") a été payé
            if (!match && mois.startsWith("Frais de formation")) {
              const start = new Date(inscription.date_inscription);
              const months = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
              const moisStandard = `${months[start.getMonth()]} ${start.getFullYear()}`;
              const moisStandardNorm = normalizeMoisStr(moisStandard);

              if (pMoisNorm === moisStandardNorm) {
                match = true;
                console.log(`[DEBUG] Retro-compatibilité: '${mois}' validé par paiement '${p.mois_paye}'`);
              }
            }

            return match;
          });

          const totalPaye = paiementsCeMois.reduce((sum, p) => sum + (p.montant || 0), 0);
          const estPaye = totalPaye >= (inscription.formations.frais_mensuel || 0);

          return estPaye;
        });

        // Trouver le premier mois non payé
        const premierMoisNonPaye = moisFormation.find(mois =>
          !moisPayes.includes(mois)
        );

        if (premierMoisNonPaye) {
          let dateLimitePaiement;

          if (premierMoisNonPaye.startsWith("Frais de formation")) {
            // Pour les courtes durées, la date limite est la fin du mois de l'inscription
            const start = new Date(inscription.date_inscription);
            dateLimitePaiement = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
          } else {
            // Parse le mois (ex: "Janv 2023")
            const [moisStr, anneeStr] = premierMoisNonPaye.split(' ');
            const moisIndex = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"].indexOf(moisStr);
            const annee = parseInt(anneeStr);
            // La date limite est la fin du mois concerné
            dateLimitePaiement = new Date(annee, moisIndex + 1, 0, 23, 59, 59);
          }

          // Vérifier si la date limite est dépassée
          if (aujourdhui > dateLimitePaiement) {
            const joursRetard = Math.floor(
              (aujourdhui - dateLimitePaiement) / (1000 * 60 * 60 * 24)
            );

            retards.push({
              etudiant_id: inscription.etudiant_id,
              inscription_id: inscription.id,
              nom: inscription.etudiants.nom,
              prenom: inscription.etudiants.prenom,
              matricule: inscription.etudiants.matricule,
              telephone: inscription.etudiants.telephone,
              centre_nom: inscription.etudiants.centres?.nom,
              centre_adresse: inscription.etudiants.centres?.adresse,
              formation_nom: inscription.formations.nom,
              duree: inscription.formations.duree,
              frais_mensuel: inscription.formations.frais_mensuel,
              date_inscription: inscription.date_inscription,
              date_limite_paiement: dateLimitePaiement.toISOString().split('T')[0],
              jours_retard: joursRetard,
              mois_en_retard: premierMoisNonPaye,
              tous_les_mois: moisFormation,
              mois_payes: moisPayes,
              paiements: inscription.paiements || [] // Ajout des paiements pour le filtrage UI
            });
          }
        }
      });

      // Trier par retard le plus important
      return retards.sort((a, b) => b.jours_retard - a.jours_retard);

    } catch (error) {
      console.error('Erreur lors de la récupération des retards formation:', error);
      return [];
    }
  },

  // Récupérer les détails complets d'un étudiant en retard
  getDetailsEtudiantRetard: async (etudiantId, inscriptionId, user = null) => {
    try {
      const { data: inscription, error } = await supabase
        .from('inscriptions')
        .select(`
          *,
          etudiants(*, centres(*)),
          formations(*),
          paiements(*)
        `)
        .eq('id', inscriptionId)
        .eq('etudiant_id', etudiantId)
        .single();

      if (error) throw error;

      // Si l'utilisateur est un gérant, vérifier que l'inscription appartient à son centre
      if (user && user.role === 'gerant') {
        const etuCentreId = inscription?.etudiants?.centre_id ?? null;
        if (etuCentreId !== user.centre_id) {
          // Ne pas exposer les détails d'un autre centre
          return null;
        }
      }

      // Générer les mois et déterminer le retard
      const moisFormation = generateMoisFormation(
        inscription.date_inscription,
        inscription.formations.duree
      );

      const paiementsFormation = inscription.paiements?.filter(p =>
        p.type_paiement === 'formation'
      ) || [];

      // Un mois est considéré comme payé SEULEMENT si le total payé >= frais mensuel
      const moisPayes = moisFormation.filter(mois => {
        // On compare les mois normalisés
        const moisNormalise = normalizeMoisStr(mois);

        const paiementsCeMois = paiementsFormation.filter(p => {
          const pMoisNorm = normalizeMoisStr(p.mois_paye);
          let match = pMoisNorm === moisNormalise;

          // RETRO-COMPATIBILITÉ
          if (!match && mois.startsWith("Frais de formation")) {
            const start = new Date(inscription.date_inscription);
            const months = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
            const moisStandard = `${months[start.getMonth()]} ${start.getFullYear()}`;
            const moisStandardNorm = normalizeMoisStr(moisStandard);

            if (pMoisNorm === moisStandardNorm) {
              match = true;
            }
          }
          return match;
        });

        const totalPaye = paiementsCeMois.reduce((sum, p) => sum + (p.montant || 0), 0);
        return totalPaye >= (inscription.formations.frais_mensuel || 0);
      });
      const premierMoisNonPaye = moisFormation.find(mois => !moisPayes.includes(mois));

      if (!premierMoisNonPaye) return null;

      let dateLimitePaiement;
      if (premierMoisNonPaye.startsWith("Frais de formation")) {
        const start = new Date(inscription.date_inscription);
        dateLimitePaiement = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      } else {
        const [moisStr, anneeStr] = premierMoisNonPaye.split(' ');
        const moisIndex = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"].indexOf(moisStr);
        const annee = parseInt(anneeStr);
        dateLimitePaiement = new Date(annee, moisIndex + 1, 0, 23, 59, 59);
      }

      const aujourdhui = new Date();
      const joursRetard = Math.floor(
        (aujourdhui - dateLimitePaiement) / (1000 * 60 * 60 * 24)
      );

      return {
        ...inscription.etudiants,
        ...inscription,
        // exposer explicitement l'id de l'inscription pour l'UI
        inscription_id: inscription.id,
        formation_nom: inscription.formations?.nom,
        duree: inscription.formations?.duree,
        frais_mensuel: inscription.formations?.frais_mensuel,
        centre_nom: inscription.etudiants.centres?.nom,
        centre_adresse: inscription.etudiants.centres?.adresse,
        date_inscription: inscription.date_inscription,
        date_limite_paiement: dateLimitePaiement.toISOString().split('T')[0],
        jours_retard: joursRetard,
        mois_en_retard: premierMoisNonPaye,
        tous_les_mois: moisFormation,
        mois_payes: moisPayes,
        paiements: inscription.paiements || []
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error);
      return null;
    }
  },

  // Vérifier les paiements de formation pour une inscription
  verifierPaiementsFormation: async (inscriptionId) => {
    try {
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .eq('inscription_id', inscriptionId)
        .eq('type_paiement', 'formation');

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Erreur lors de la vérification des paiements:', error);
      return [];
    }
  },

  // Enregistrer un paiement de formation
  enregistrerPaiementFormation: async (paiementData) => {
    try {
      const { data, error } = await supabase
        .from('paiements')
        .insert([{
          inscription_id: paiementData.inscription_id,
          type_paiement: 'formation',
          montant: paiementData.montant,
          mois_paye: paiementData.mois_paye,
          date_paiement: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du paiement formation:', error);
      throw error;
    }
  }
};