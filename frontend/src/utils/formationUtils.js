// Utils pour déterminer si une formation est terminée en fonction de la date d'inscription et de la durée
export const isFormationFinishedByDate = (dateInscription, duree) => {
  if (!dateInscription || !duree) return false;
  try {
    const start = new Date(dateInscription);
    // Calculer la durée en mois décimaux
    const dureeFloat = parseFloat(duree);
    // Ajouter les mois entiers
    const moisEntiers = Math.floor(dureeFloat);
    // Ajouter les jours pour la partie décimale (approximation : 1 mois = 30 jours)
    const joursDecimaux = Math.round((dureeFloat - moisEntiers) * 30);
    const endDate = new Date(start.getFullYear(), start.getMonth() + moisEntiers, start.getDate() + joursDecimaux);
    const now = new Date();
    return now >= endDate;
  } catch (e) {
    return false;
  }
};

// Option utilitaire pour extraire un objet {monthIndex, year} depuis un label 'Mars 2025'
export const parseMoisLabel = (moisLabel) => {
  if (!moisLabel) return null;
  const months = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
  const [moisStr, anneeStr] = moisLabel.split(' ');
  const moisIndex = months.indexOf(moisStr);
  if (moisIndex === -1 || !anneeStr) return null;
  return { moisIndex, annee: parseInt(anneeStr, 10) };
};
