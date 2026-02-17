import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/authContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import RefreshButton from '../components/RefreshButton';
import { API_URL } from '../config';

export default function StatsPage() {
  const [stats, setStats] = useState({
    totalEtudiants: 0,
    actifs: 0,
    quittes: 0,
    finis: 0,
    parCentre: [],
    parFormation: [],
    totalPaiements: 0,
    jour: 0,
    semaine: 0,
    mois: 0,
    annee: 0,
    nouvellesInscriptionsJour: 0,
    nouvellesInscriptionsSemaine: 0,
    nouvellesInscriptionsMois: 0,
    nouvellesInscriptionsAnnee: 0,
    parType: [],
    montantParCentre: [],
    montantParFormation: [],
    etudiantsParFormation: [],
    caMensuel: [],
    evolutionInscriptionsActivesMensuel: []
  });
  const API_BASE = `${API_URL}/api`

  const [formations, setFormations] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCentreId, setUserCentreId] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [userCentreName, setUserCentreName] = useState("");
  const [paiementsHistory, setPaiementsHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('centres');

  const [filtreCentre, setFiltreCentre] = useState("");
  const [filtreFormation, setFiltreFormation] = useState("");
  const [granularity, setGranularity] = useState('month'); // 'day' | 'week' | 'month'
  const [filterStatus, setFilterStatus] = useState(''); // '', 'inscrit','actif','quitte','fini'

  // Pagination & recherche pour historiques
  const [itemsPerPage] = useState(10);

  // Paiements table
  const [paiementsPage, setPaiementsPage] = useState(1);
  const [paiementsSearch, setPaiementsSearch] = useState("");
  const [paiementsSearchLocal, setPaiementsSearchLocal] = useState(""); // local state for input
  const [paiementsFilterType, setPaiementsFilterType] = useState("");

  const [paiementsFilterCentre, setPaiementsFilterCentre] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  // Local states for validation
  const [paiementsFilterTypeLocal, setPaiementsFilterTypeLocal] = useState("");
  const [paiementsFilterCentreLocal, setPaiementsFilterCentreLocal] = useState("");
  const [dateDebutLocal, setDateDebutLocal] = useState("");
  const [dateFinLocal, setDateFinLocal] = useState("");


  // Filters UI states for stats
  const [showCentresDropdown, setShowCentresDropdown] = useState(false);
  const [searchCentreInput, setSearchCentreInput] = useState("");
  const [showFormationsDropdown, setShowFormationsDropdown] = useState(false);
  const [searchFormationInput, setSearchFormationInput] = useState("");

  // Filters UI states for Payment History
  const [showPaiementsCentresDropdown, setShowPaiementsCentresDropdown] = useState(false);
  const [searchPaiementsCentreInput, setSearchPaiementsCentreInput] = useState("");
  const [showPaiementsFormationsDropdown, setShowPaiementsFormationsDropdown] = useState(false);
  const [searchPaiementsFormationInput, setSearchPaiementsFormationInput] = useState("");
  const [paiementsFilterFormation, setPaiementsFilterFormation] = useState(""); // State for actual selected formation
  const [paiementsFilterFormationLocal, setPaiementsFilterFormationLocal] = useState(""); // Local selectable state

  // Filters UI states for Period section
  const [showPeriodCentresDropdown, setShowPeriodCentresDropdown] = useState(false);

  const filteredCentresOptions = useMemo(() => {
    return [
      { id: "", nom: "Tous les centres" },
      ...centres.filter(c => (c.nom || "").toLowerCase().includes(searchCentreInput.toLowerCase()))
    ];
  }, [centres, searchCentreInput]);

  const filteredFormationsOptions = useMemo(() => {
    return [
      { id: "", nom: "Toutes les formations" },
      ...formations.filter(f => (f.nom || "").toLowerCase().includes(searchFormationInput.toLowerCase()))
    ];
  }, [formations, searchFormationInput]);

  const filteredPaiementsCentresOptions = useMemo(() => {
    return [
      { id: "", nom: "Tous les centres" },
      ...centres.filter(c => (c.nom || "").toLowerCase().includes(searchPaiementsCentreInput.toLowerCase()))
    ];
  }, [centres, searchPaiementsCentreInput]);

  const filteredPaiementsFormationsOptions = useMemo(() => {
    return [
      { id: "", nom: "Toutes les formations" },
      ...formations.filter(f => (f.nom || "").toLowerCase().includes(searchPaiementsFormationInput.toLowerCase()))
    ];
  }, [formations, searchPaiementsFormationInput]);

  useEffect(() => {
    // user comes from AuthContext
  }, []);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setUserCentreId(user.centre_id || null);
      setUserRole(user.role || "");
      if (user.role === 'gerant' && user.centre_id) {
        setFiltreCentre(String(user.centre_id));
        setPaiementsFilterCentre(String(user.centre_id));
        setPaiementsFilterCentreLocal(String(user.centre_id));
      }
    }
  }, [user]);

  const getStats = useCallback(async () => {
    setLoading(true);
    try {
      const safeNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const formatMois = (ym) => {
        const [y, m] = ym.split('-');
        return `${m}/${y}`;
      };

      // Helper pour normaliser mois_paye au format YYYY-MM
      const normalizeMoisPaye = (moisPayeStr) => {
        if (!moisPayeStr) return null;
        moisPayeStr = String(moisPayeStr).trim();

        // Si déjà au format YYYY-MM, retourner
        if (/^\d{4}-\d{2}$/.test(moisPayeStr)) return moisPayeStr;

        // Format "Janvier 2026", "February 2026", etc.
        const mois = {
          'janvier': '01', 'february': '02', 'février': '02',
          'mars': '03', 'march': '03', 'avril': '04', 'april': '04',
          'mai': '05', 'may': '05', 'juin': '06', 'june': '06',
          'juillet': '07', 'july': '07', 'août': '08', 'august': '08',
          'septembre': '09', 'september': '09', 'octobre': '10', 'october': '10',
          'novembre': '11', 'november': '11', 'décembre': '12', 'december': '12'
        };

        const parts = moisPayeStr.toLowerCase().split(/\s+/);
        const monthName = parts[0];
        const year = parts[1];
        const monthNum = mois[monthName];

        if (monthNum && year && /^\d{4}$/.test(year)) {
          return `${year}-${monthNum}`;
        }
        return null;
      };

      // Date du jour pour distinguer nouvelles vs anciennes inscriptions
      const today = new Date().toISOString().slice(0, 10);
      const currentMonthFormatted = new Date().toISOString().slice(0, 7); // YYYY-MM

      let shouldFilterByCentre = false;
      let centreFilterId = null;
      if (userRole === 'gerant' && userCentreId) {
        shouldFilterByCentre = true;
        centreFilterId = userCentreId;
      } else if (filtreCentre) {
        shouldFilterByCentre = true;
        centreFilterId = parseInt(filtreCentre);
      }

      // Fetch centres
      const respCentres = await fetch(`${API_BASE}/centres`);
      if (!respCentres.ok) throw new Error('Erreur récupération centres');
      const centres = await respCentres.json();

      // Fetch formations
      const respForm = await fetch(`${API_BASE}/formations`);
      if (!respForm.ok) throw new Error('Erreur récupération formations');
      const formations = await respForm.json();

      // Fetch etudiants
      const respEtus = await fetch(`${API_BASE}/etudiants`);
      if (!respEtus.ok) throw new Error('Erreur récupération étudiants');
      const etudiants = await respEtus.json();

      // Fetch inscriptions (get many by setting limit high)
      const insUrl = `${API_BASE}/inscriptions?limit=10000${shouldFilterByCentre ? `&centre_id=${centreFilterId}` : ''}`;
      const respInsc = await fetch(insUrl);
      if (!respInsc.ok) throw new Error('Erreur récupération inscriptions');
      const insJson = await respInsc.json();
      const inscriptions = Array.isArray(insJson) ? insJson : (insJson.data || []);

      // Fetch paiements (joined)
      const paiementsUrl = `${API_BASE}/paiements${shouldFilterByCentre ? `?centre_id=${centreFilterId}` : ''}`;
      const respPaiements = await fetch(paiementsUrl);
      if (!respPaiements.ok) throw new Error('Erreur récupération paiements');
      const paiements = await respPaiements.json();

      setPaiementsHistory(paiements || []);

      const totalEtudiants = inscriptions.length;

      // Calculer les stats basées sur les inscriptions
      const actifs = inscriptions.filter(i => i.statut === "actif").length;
      const quittes = inscriptions.filter(i => i.statut === "quitte").length;
      const finis = inscriptions.filter(i => i.statut === "fini").length;

      // Filtrer uniquement les inscriptions actives
      const inscriptionsActives = inscriptions.filter(ins => ins.statut === "actif");

      // Statistiques par centre avec distinction nouvelles/anciennes (UNIQUEMENT ACTIFS)
      const centreMap = {};
      const centreNouvellesMap = {};
      const centreAnciennesMap = {};

      inscriptionsActives.forEach((ins) => {
        const etu = etudiants.find(e => e.id === ins.etudiant_id);
        if (!etu) return;

        const centreId = etu.centre_id;
        if (centreId != null) {
          centreMap[centreId] = (centreMap[centreId] || 0) + 1;

          // Vérifier si l'inscription est nouvelle en fonction du mois de formation
          // Une inscription est "nouvelle" pour le mois de formation courant si date_inscription est ce mois
          const inscriptionDate = ins.date_inscription ? ins.date_inscription.split('T')[0] : null;
          const inscriptionMonth = inscriptionDate ? inscriptionDate.substring(0, 7) : null;
          const isNew = inscriptionMonth === currentMonthFormatted;

          if (isNew) {
            centreNouvellesMap[centreId] = (centreNouvellesMap[centreId] || 0) + 1;
          } else {
            centreAnciennesMap[centreId] = (centreAnciennesMap[centreId] || 0) + 1;
          }
        }
      });

      const parCentre = Object.entries(centreMap).map(([centreId, count]) => {
        const centre = centres.find(c => c.id == centreId);
        const nouvelles = centreNouvellesMap[centreId] || 0;
        const anciennes = centreAnciennesMap[centreId] || 0;

        return {
          id: Number(centreId),
          nom: centre ? centre.nom : `Centre ${centreId}`,
          inscriptions: count,
          nouvelles,
          anciennes
        };
      });

      // Statistiques par formation avec distinction nouvelles/anciennes (UNIQUEMENT ACTIFS)
      const formationMap = {};
      const formationNouvellesMap = {};
      const formationAnciennesMap = {};

      inscriptionsActives.forEach(i => {
        const fid = i.formation_id;
        formationMap[fid] = (formationMap[fid] || 0) + 1;

        // Vérifier si l'inscription est nouvelle en fonction du mois de formation
        const inscriptionDate = i.date_inscription ? i.date_inscription.split('T')[0] : null;
        const inscriptionMonth = inscriptionDate ? inscriptionDate.substring(0, 7) : null;
        const isNew = inscriptionMonth === currentMonthFormatted;

        if (isNew) {
          formationNouvellesMap[fid] = (formationNouvellesMap[fid] || 0) + 1;
        } else {
          formationAnciennesMap[fid] = (formationAnciennesMap[fid] || 0) + 1;
        }
      });

      const parFormation = Object.entries(formationMap).map(([fid, count]) => {
        const formation = formations.find(f => f.id == fid);
        const nouvelles = formationNouvellesMap[fid] || 0;
        const anciennes = formationAnciennesMap[fid] || 0;

        return {
          id: Number(fid),
          nom: formation ? formation.nom : `Formation ${fid}`,
          inscriptions: count,
          nouvelles,
          anciennes
        };
      });

      const totalPaiements = paiements.reduce((s, p) => s + safeNumber(p.montant), 0);

      const startWeek = new Date(); startWeek.setDate(startWeek.getDate() - 7);
      const weekStr = startWeek.toISOString().slice(0, 10);
      const startMonth = new Date(); startMonth.setDate(1);
      const monthStr = startMonth.toISOString().slice(0, 10);
      const startYear = new Date().getFullYear();

      // Convertir les dates de paiement au format YYYY-MM-DD pour comparaison fiable
      // Convertir en heure locale pour comparer correctement
      const jour = paiements.filter(p => {
        if (!p.date_paiement) return false;
        const dateUTC = new Date(p.date_paiement);
        const localDate = new Date(dateUTC.getTime() - dateUTC.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return localDate === today;
      }).reduce((s, p) => s + safeNumber(p.montant), 0);

      const semaine = paiements.filter(p => {
        if (!p.date_paiement) return false;
        const dateUTC = new Date(p.date_paiement);
        const localDate = new Date(dateUTC.getTime() - dateUTC.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return localDate && localDate >= weekStr;
      }).reduce((s, p) => s + safeNumber(p.montant), 0);

      const mois = paiements.filter(p => {
        if (!p.date_paiement) return false;
        const dateUTC = new Date(p.date_paiement);
        const localDate = new Date(dateUTC.getTime() - dateUTC.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return localDate && localDate >= monthStr;
      }).reduce((s, p) => s + safeNumber(p.montant), 0);

      const annee = paiements.filter(p => {
        if (!p.date_paiement) return false;
        const dateUTC = new Date(p.date_paiement);
        const paiementYear = dateUTC.getFullYear();
        return paiementYear === startYear;
      }).reduce((s, p) => s + safeNumber(p.montant), 0);

      // Calculer le nombre de nouvelles inscriptions par période
      const nouvellesInscriptionsJour = inscriptionsActives.filter(ins => {
        if (!ins.date_inscription) return false;
        const dateUTC = new Date(ins.date_inscription);
        const localDate = new Date(dateUTC.getTime() - dateUTC.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return localDate === today;
      }).length;

      const nouvellesInscriptionsSemaine = inscriptionsActives.filter(ins => {
        if (!ins.date_inscription) return false;
        const dateUTC = new Date(ins.date_inscription);
        const localDate = new Date(dateUTC.getTime() - dateUTC.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return localDate && localDate >= weekStr;
      }).length;

      const nouvellesInscriptionsMois = inscriptionsActives.filter(ins => {
        if (!ins.date_inscription) return false;
        const dateUTC = new Date(ins.date_inscription);
        const localDate = new Date(dateUTC.getTime() - dateUTC.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return localDate && localDate >= monthStr;
      }).length;

      const nouvellesInscriptionsAnnee = inscriptionsActives.filter(ins => {
        if (!ins.date_inscription) return false;
        const dateUTC = new Date(ins.date_inscription);
        const inscriptionYear = dateUTC.getFullYear();
        return inscriptionYear === startYear;
      }).length;

      const typeMap = {};
      paiements.forEach(p => {
        const t = p.type_paiement || 'autre';
        typeMap[t] = (typeMap[t] || 0) + safeNumber(p.montant);
      });
      const parType = Object.entries(typeMap).map(([type, montant]) => ({
        type, montant, count: paiements.filter(p => p.type_paiement === type).length
      }));

      // Montant par centre avec distinction nouvelles/anciennes (UNIQUEMENT ACTIFS)
      const montantParCentreMap = {};
      const montantParCentreNouvellesMap = {};
      const montantParCentreAnciennesMap = {};

      // Filtrer les paiements des étudiants actifs seulement
      const paiementsActifs = paiements.filter(p => {
        const ins = p.inscriptions;
        const etu = ins ? etudiants.find(e => e.id === ins.etudiant_id) : null;
        return etu && etu.statut === "actif";
      });

      paiementsActifs.forEach(p => {
        const ins = p.inscriptions;
        const etu = ins ? etudiants.find(e => e.id === ins.etudiant_id) : null;
        if (!etu) return;

        const centreId = etu.centre_id;
        if (centreId != null) {
          montantParCentreMap[centreId] = (montantParCentreMap[centreId] || 0) + safeNumber(p.montant);

          // Vérifier si l'inscription est nouvelle en fonction du mois de formation
          const inscriptionDate = ins && ins.date_inscription ? ins.date_inscription.split('T')[0] : null;
          const inscriptionMonth = inscriptionDate ? inscriptionDate.substring(0, 7) : null;
          const isNew = inscriptionMonth === currentMonthFormatted;

          if (isNew) {
            montantParCentreNouvellesMap[centreId] = (montantParCentreNouvellesMap[centreId] || 0) + safeNumber(p.montant);
          } else {
            montantParCentreAnciennesMap[centreId] = (montantParCentreAnciennesMap[centreId] || 0) + safeNumber(p.montant);
          }
        }
      });

      const montantParCentre = Object.entries(montantParCentreMap).map(([centreId, montant]) => {
        const centre = centres.find(c => c.id == centreId);
        const inscriptionsCount = centreMap[centreId] || 0;
        const nouvellesInscriptions = centreNouvellesMap[centreId] || 0;
        const anciennesInscriptions = centreAnciennesMap[centreId] || 0;
        const montantNouvelles = montantParCentreNouvellesMap[centreId] || 0;
        const montantAnciennes = montantParCentreAnciennesMap[centreId] || 0;

        return {
          id: Number(centreId),
          nom: centre ? centre.nom : `Centre ${centreId}`,
          montant,
          inscriptions: inscriptionsCount,
          nouvellesInscriptions,
          anciennesInscriptions,
          montantNouvelles,
          montantAnciennes,
          montantParInscription: inscriptionsCount > 0 ? montant / inscriptionsCount : 0
        };
      });

      // Montant par formation avec distinction nouvelles/anciennes (UNIQUEMENT ACTIFS)
      const montantParFormationMap = {};
      const montantParFormationNouvellesMap = {};
      const montantParFormationAnciennesMap = {};

      paiementsActifs.forEach(p => {
        const ins = p.inscriptions;
        if (ins && ins.formation_id != null) {
          const fid = ins.formation_id;
          montantParFormationMap[fid] = (montantParFormationMap[fid] || 0) + safeNumber(p.montant);

          // Vérifier si l'inscription est nouvelle en fonction du mois de formation
          const inscriptionDate = ins.date_inscription ? ins.date_inscription.split('T')[0] : null;
          const inscriptionMonth = inscriptionDate ? inscriptionDate.substring(0, 7) : null;
          const isNew = inscriptionMonth === currentMonthFormatted;

          if (isNew) {
            montantParFormationNouvellesMap[fid] = (montantParFormationNouvellesMap[fid] || 0) + safeNumber(p.montant);
          } else {
            montantParFormationAnciennesMap[fid] = (montantParFormationAnciennesMap[fid] || 0) + safeNumber(p.montant);
          }
        }
      });

      const montantParFormation = Object.entries(montantParFormationMap).map(([fid, montant]) => {
        const formation = formations.find(f => f.id == fid);
        const inscriptionsCount = formationMap[fid] || 0;
        const nouvellesInscriptions = formationNouvellesMap[fid] || 0;
        const anciennesInscriptions = formationAnciennesMap[fid] || 0;
        const montantNouvelles = montantParFormationNouvellesMap[fid] || 0;
        const montantAnciennes = montantParFormationAnciennesMap[fid] || 0;

        return {
          id: Number(fid),
          nom: formation ? formation.nom : `Formation ${fid}`,
          montant,
          inscriptions: inscriptionsCount,
          nouvellesInscriptions,
          anciennesInscriptions,
          montantNouvelles,
          montantAnciennes,
          montantParInscription: inscriptionsCount > 0 ? montant / inscriptionsCount : 0
        };
      });

      const etudiantsParFormationMap = {};
      inscriptionsActives.forEach(ins => {
        const fid = ins.formation_id;
        if (!etudiantsParFormationMap[fid]) etudiantsParFormationMap[fid] = new Set();
        etudiantsParFormationMap[fid].add(ins.etudiant_id);
      });
      const etudiantsParFormation = Object.entries(etudiantsParFormationMap).map(([fid, setIds]) => {
        const formation = formations.find(f => f.id == fid);
        return { id: Number(fid), nom: formation ? formation.nom : `Formation ${fid}`, etudiants: setIds.size, actifs: setIds.size };
      });

      const caMensuelMap = {};
      paiements.forEach(p => {
        // Utiliser mois_paye normalisé pour le CA mensuel
        const normMois = normalizeMoisPaye(p.mois_paye);
        if (normMois) {
          caMensuelMap[normMois] = (caMensuelMap[normMois] || 0) + safeNumber(p.montant);
        } else if (p.date_paiement) {
          // Fallback sur date_paiement si mois_paye n'existe pas
          const mois = p.date_paiement.toString().substring(0, 7);
          caMensuelMap[mois] = (caMensuelMap[mois] || 0) + safeNumber(p.montant);
        }
      });
      const caMensuel = Object.entries(caMensuelMap).map(([mois, montant]) => ({
        mois: formatMois(mois),
        montant,
        count: paiements.filter(p => {
          const normMois = normalizeMoisPaye(p.mois_paye);
          return normMois === mois || (p.date_paiement && p.date_paiement.startsWith(mois));
        }).length
      })).sort((a, b) => a.mois.localeCompare(b.mois));

      // Évolution des inscriptions actives par mois
      const evolutionInscriptionsActivesMensuelMap = {};
      inscriptionsActives.forEach(ins => {
        if (ins.date_inscription) {
          const mois = ins.date_inscription.substring(0, 7); // YYYY-MM
          if (!evolutionInscriptionsActivesMensuelMap[mois]) evolutionInscriptionsActivesMensuelMap[mois] = 0;
          evolutionInscriptionsActivesMensuelMap[mois] += 1;
        }
      });
      const evolutionInscriptionsActivesMensuel = Object.entries(evolutionInscriptionsActivesMensuelMap).map(([mois, count]) => ({
        mois: formatMois(mois),
        count
      })).sort((a, b) => a.mois.localeCompare(b.mois));

      // Calculer le cumulatif
      let cumulative = 0;
      evolutionInscriptionsActivesMensuel.forEach(item => {
        cumulative += item.count;
        item.count = cumulative;
      });

      // --- Nouveaux agrégats : inscriptions par jour / semaine / mois (tous statuts)
      const dayMap = {};
      const weekMap = {};
      const monthMap = {};

      const toLocalDateStr = (iso) => {
        try {
          const d = new Date(iso);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          return local.toISOString().slice(0, 10);
        } catch {
          return null;
        }
      };

      const getWeekStart = (dateStr) => {
        const d = new Date(dateStr);
        const day = d.getDay(); // 0 (Sun) - 6 (Sat)
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // monday
        const monday = new Date(d);
        monday.setDate(diff);
        return monday.toISOString().slice(0, 10);
      };

      inscriptions.forEach(ins => {
        if (!ins.date_inscription) return;
        const localDate = toLocalDateStr(ins.date_inscription);
        if (!localDate) return;

        const dayKey = localDate; // YYYY-MM-DD
        const weekKey = getWeekStart(localDate); // YYYY-MM-DD (monday)
        const monthKey = localDate.substring(0, 7); // YYYY-MM

        const centreId = ins.centre_id || ins.centre || ins.centre_id === 0 ? ins.centre_id : (ins.etudiant_centre_id || null);
        const formationId = ins.formation_id || null;

        const status = ins.statut || 'null';
        const makeKey = (g, period, c, f, s) => `${g}|${period}|${c || 'null'}|${f || 'null'}|${s || 'null'}`;

        // day
        const dk = makeKey('day', dayKey, centreId, formationId, status);
        dayMap[dk] = (dayMap[dk] || 0) + 1;

        // week
        const wk = makeKey('week', weekKey, centreId, formationId, status);
        weekMap[wk] = (weekMap[wk] || 0) + 1;

        // month
        const mk = makeKey('month', monthKey, centreId, formationId, status);
        monthMap[mk] = (monthMap[mk] || 0) + 1;
      });

      const buildArrayFromMap = (map, gran) => Object.entries(map).map(([k, count]) => {
        const parts = k.split('|'); // [g, period, centre, formation, status]
        const period = parts[1];
        const cid = parts[2] === 'null' ? null : Number(parts[2]);
        const fid = parts[3] === 'null' ? null : Number(parts[3]);
        const status = parts[4] === 'null' ? null : parts[4];
        const centreObj = centres.find(c => c.id === cid) || null;
        const formationObj = formations.find(f => f.id === fid) || null;
        const periodLabel = gran === 'month' ? `${period.substring(5, 7)}/${period.substring(0, 4)}` : (gran === 'week' ? `Semaine début ${period}` : period);
        return {
          granularity: gran,
          period,
          periodLabel,
          centreId: cid,
          centreName: centreObj ? centreObj.nom : (cid ? `Centre ${cid}` : 'Tous'),
          formationId: fid,
          formationName: formationObj ? formationObj.nom : (fid ? `Formation ${fid}` : 'Tous'),
          status,
          count
        };
      });

      const inscriptionsByDay = buildArrayFromMap(dayMap, 'day').sort((a, b) => a.period.localeCompare(b.period));
      const inscriptionsByWeek = buildArrayFromMap(weekMap, 'week').sort((a, b) => a.period.localeCompare(b.period));
      const inscriptionsByMonth = buildArrayFromMap(monthMap, 'month').sort((a, b) => a.period.localeCompare(b.period));

      // evolution series (total per period)
      const seriesFrom = (arr, gran) => {
        const grouped = {};
        arr.forEach(item => { grouped[item.period] = (grouped[item.period] || 0) + item.count; });
        return Object.entries(grouped).map(([period, count]) => ({ period, periodLabel: gran === 'month' ? `${period.substring(5, 7)}/${period.substring(0, 4)}` : (gran === 'week' ? `Semaine ${period}` : period), count })).sort((a, b) => a.period.localeCompare(b.period));
      };

      const evolutionDay = seriesFrom(inscriptionsByDay, 'day');
      const evolutionWeek = seriesFrom(inscriptionsByWeek, 'week');
      const evolutionMonth = seriesFrom(inscriptionsByMonth, 'month');

      setStats({
        totalEtudiants,
        actifs,
        quittes,
        finis,
        parCentre,
        parFormation,
        totalPaiements,
        jour,
        semaine,
        mois,
        annee,
        nouvellesInscriptionsJour,
        nouvellesInscriptionsSemaine,
        nouvellesInscriptionsMois,
        nouvellesInscriptionsAnnee,
        parType,
        montantParCentre,
        montantParFormation,
        etudiantsParFormation,
        caMensuel,
        inscriptionsByPeriod: {
          day: inscriptionsByDay,
          week: inscriptionsByWeek,
          month: inscriptionsByMonth
        },
        evolutionByGranularity: {
          day: evolutionDay,
          week: evolutionWeek,
          month: evolutionMonth
        }
      });
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    } finally {
      setLoading(false);
    }
  }, [userRole, userCentreId, filtreCentre]);

  function getTypeLabel(type) {
    const labels = {
      'droits': 'Droits Inscription',
      'formation': 'Formation',
      'livre': 'Livres',
      'badge': 'Badges',
      'polo': 'Polos'
    };
    return labels[type] || type;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  }

  const getFormations = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/formations`);
      if (!resp.ok) throw new Error('Erreur récup formations');
      const data = await resp.json();
      setFormations(data || []);
    } catch (err) {
      console.error('getFormations error', err);
      setFormations([]);
    }
  }, []);

  const getCentres = useCallback(async () => {
    try {
      let url = `${API_BASE}/centres`;
      if (userRole === 'gerant' && userCentreId) url += `?id=${userCentreId}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Erreur récup centres');
      const data = await resp.json();
      setCentres(data || []);
      // set user centre name if applicable
      if (userRole === 'gerant' && userCentreId) {
        const found = (data || []).find(c => String(c.id) === String(userCentreId));
        if (found) setUserCentreName(found.nom || '');
      }
    } catch (err) {
      console.error('getCentres error', err);
      setCentres([]);
    }
  }, [userRole, userCentreId]);

  useEffect(() => {
    if (userRole !== "") {
      getStats();
      getFormations();
      getCentres();
    }
  }, [userRole, filtreCentre, filtreFormation, getStats, getFormations, getCentres]);

  const paiementTypes = useMemo(() => {
    const s = new Set();
    (paiementsHistory || []).forEach(p => { if (p.type_paiement) s.add(p.type_paiement); });
    return Array.from(s);
  }, [paiementsHistory]);

  const paiementsFiltered = useMemo(() => {
    console.log("Filtering paiements. DateDebut:", dateDebut, "DateFin:", dateFin);
    let arr = (paiementsHistory || []).slice().sort((a, b) => (b.date_paiement || '').localeCompare(a.date_paiement || ''));
    arr = arr.filter(p => {
      if (paiementsFilterType && String(paiementsFilterType) !== "") {
        if (String(p.type_paiement) !== String(paiementsFilterType)) return false;
      }
      if (paiementsFilterCentre && String(paiementsFilterCentre) !== "") {
        const centreId = p.inscriptions?.etudiants?.centre_id;
        if (String(centreId) !== String(paiementsFilterCentre)) return false;
      }
      if (paiementsFilterFormation && String(paiementsFilterFormation) !== "") {
        const formationId = p.inscriptions?.formation_id;
        if (String(formationId) !== String(paiementsFilterFormation)) return false;
      }
      if (filtreFormation && String(filtreFormation) !== "") {
        const formationId = p.inscriptions?.formation_id;
        if (String(formationId) !== String(filtreFormation)) return false;
      }
      if (!paiementsSearch) return true;
      const q = paiementsSearch.toLowerCase();

      if ((p.montant || '').toString().toLowerCase().includes(q)) return true;
      if ((p.type_paiement || '').toLowerCase().includes(q)) return true;

      const etudiant = p.inscriptions?.etudiants;
      if (etudiant) {
        const nomComplet = `${etudiant.prenom || ''} ${etudiant.nom || ''}`.toLowerCase();
        if (nomComplet.includes(q)) return true;
      }

      const formation = p.inscriptions?.formations;
      if (formation && (formation.nom || '').toLowerCase().includes(q)) return true;

      if ((p.inscription_id || '').toString().toLowerCase().includes(q)) return true;
      if ((p.date_paiement || '').toLowerCase().includes(q)) return true;

      return false;
    });

    // Filter by date range
    if (dateDebut) {
      arr = arr.filter(p => {
        if (!p.date_paiement) return false;
        const dateUTC = new Date(p.date_paiement);
        const localDate = new Date(dateUTC.getTime() - dateUTC.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return localDate >= dateDebut;
      });
    }
    if (dateFin) {
      arr = arr.filter(p => {
        if (!p.date_paiement) return false;
        const dateUTC = new Date(p.date_paiement);
        const localDate = new Date(dateUTC.getTime() - dateUTC.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return localDate <= dateFin;
      });
    }

    return arr;
  }, [paiementsHistory, paiementsSearch, paiementsFilterType, paiementsFilterCentre, filtreFormation, dateDebut, dateFin]);

  const paiementsTotalPages = Math.max(1, Math.ceil((paiementsFiltered || []).length / itemsPerPage));
  const paiementsPageSafe = Math.min(Math.max(1, paiementsPage), paiementsTotalPages);
  const paiementsPaged = (paiementsFiltered || []).slice((paiementsPageSafe - 1) * itemsPerPage, paiementsPageSafe * itemsPerPage);

  // Calcul des indices de départ et de fin pour la pagination
  const startIndex = (paiementsPageSafe - 1) * itemsPerPage + 1;
  const endIndex = Math.min(paiementsPageSafe * itemsPerPage, paiementsFiltered.length);

  // Build chart data from computed aggregates applying filters (centre, formation, status)
  const periodRows = (stats.inscriptionsByPeriod && stats.inscriptionsByPeriod[granularity]) || [];
  const filteredPeriodRows = periodRows.filter(row => {
    if (filtreCentre && String(filtreCentre) !== '') {
      if (String(row.centreId) !== String(filtreCentre)) return false;
    } else if (userRole === 'gerant' && userCentreId) {
      if (String(row.centreId) !== String(userCentreId)) return false;
    }
    if (filtreFormation && String(filtreFormation) !== '') {
      if (String(row.formationId) !== String(filtreFormation)) return false;
    }
    if (filterStatus && String(filterStatus) !== '') {
      if (String(row.status || '') !== String(filterStatus)) return false;
    }
    return true;
  });

  const chartMap = {};
  filteredPeriodRows.forEach(r => { chartMap[r.period] = (chartMap[r.period] || 0) + r.count; });
  const chartData = Object.entries(chartMap).map(([period, count]) => ({
    period,
    periodLabel: granularity === 'month' ? `${period.substring(5, 7)}/${period.substring(0, 4)}` : (granularity === 'week' ? `Semaine ${period}` : period),
    count
  })).sort((a, b) => a.period.localeCompare(b.period));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Tableau de Bord
            </h1>
            {userRole === 'gerant' && userCentreName && (
              <p className="text-sm text-blue-600 mt-1">
                Centre: {userCentreName}
              </p>
            )}
          </div>
          <RefreshButton onClick={getStats} loading={loading} />
        </div>

        {userRole !== 'gerant' && (
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filtres</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Filtre Centre Recherchable */}
              <div className="flex-1 relative">
                <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">Centre</label>
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCentresDropdown(!showCentresDropdown);
                    setShowFormationsDropdown(false);
                  }}
                >
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 pr-8"
                    placeholder="Rechercher un centre..."
                    value={filtreCentre === "" ? searchCentreInput : (centres.find(c => String(c.id) === String(filtreCentre))?.nom || "")}
                    onChange={(e) => {
                      setSearchCentreInput(e.target.value);
                      if (filtreCentre !== "") setFiltreCentre("");
                      setShowCentresDropdown(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {showCentresDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {filteredCentresOptions.length > 0 ? (
                      filteredCentresOptions.map((c) => (
                        <div
                          key={c.id}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${String(filtreCentre) === String(c.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                          onClick={() => {
                            setFiltreCentre(c.id === "" ? "" : String(c.id));
                            setSearchCentreInput(c.id === "" ? "" : c.nom);
                            setShowCentresDropdown(false);
                          }}
                        >
                          {c.nom}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500 italic">Aucun centre trouvé</div>
                    )}
                  </div>
                )}
              </div>

              {/* Filtre Formation Recherchable */}
              <div className="flex-1 relative">
                <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">Formation</label>
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFormationsDropdown(!showFormationsDropdown);
                    setShowCentresDropdown(false);
                  }}
                >
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 pr-8"
                    placeholder="Rechercher une formation..."
                    value={filtreFormation === "" ? searchFormationInput : (formations.find(f => String(f.id) === String(filtreFormation))?.nom || "")}
                    onChange={(e) => {
                      setSearchFormationInput(e.target.value);
                      if (filtreFormation !== "") setFiltreFormation("");
                      setShowFormationsDropdown(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {showFormationsDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {filteredFormationsOptions.length > 0 ? (
                      filteredFormationsOptions.map((f) => (
                        <div
                          key={f.id}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${String(filtreFormation) === String(f.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                          onClick={() => {
                            setFiltreFormation(f.id === "" ? "" : String(f.id));
                            setSearchFormationInput(f.id === "" ? "" : f.nom);
                            setShowFormationsDropdown(false);
                          }}
                        >
                          {f.nom}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500 italic">Aucune formation trouvée</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Click mask to close dropdowns */}
            {(showCentresDropdown || showFormationsDropdown) && (
              <div
                className="fixed inset-0 z-40 outline-none"
                onClick={() => {
                  setShowCentresDropdown(false);
                  setShowFormationsDropdown(false);
                }}
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90">Étudiants Actifs</p>
                <p className="text-xl font-bold mt-1">{stats.actifs}</p>
              </div>
            </div>
            <div className="flex justify-between mt-3 text-xs text-blue-200">
              <span>Total: {stats.totalEtudiants}</span>
              <span>Finis: {stats.finis}</span>
              <span>Quittés: {stats.quittes}</span>
            </div>
          </div>

          {userRole !== 'gerant' && userRole !== 'dir' && (
            <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Entrées Total (CA)</p>
                  <p className="text-xl font-bold mt-1">{(stats.totalPaiements || 0).toLocaleString()} Ar</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Chiffre d'Affaires par Période</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Aujourd'hui", value: stats.jour, color: "from-green-500 to-green-600", newInscriptions: stats.nouvellesInscriptionsJour },
              { label: "Par semaine", value: stats.semaine, color: "from-blue-500 to-blue-600", newInscriptions: stats.nouvellesInscriptionsSemaine },
              { label: "Mois", value: stats.mois, color: "from-purple-500 to-purple-600", newInscriptions: stats.nouvellesInscriptionsMois },
              { label: "Année", value: stats.annee, color: "from-orange-500 to-orange-600", newInscriptions: stats.nouvellesInscriptionsAnnee },
            ].filter(item => {
              if (userRole === 'gerant' || userRole === 'dir') {
                return item.label === "Aujourd'hui" || item.label === "Par semaine";
              }
              return true;
            }).map((s, i) => (
              <div key={i} className={`bg-gradient-to-br ${s.color} text-white p-3 rounded-lg text-center`}>
                <p className="text-xs opacity-90">{s.label}</p>
                <p className="text-sm font-bold mt-1">{s.value.toLocaleString()} Ar</p>
                <p className="text-xs opacity-75 mt-2">+{s.newInscriptions} inscriptions</p>
              </div>
            ))}
          </div>
        </div>

        {userRole !== 'gerant' && userRole !== 'dir' && (
          <div className="space-y-6 mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Répartition des Paiements</h3>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.parType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="type" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'Nombre') return [value, 'Nombre'];
                        return [`${Number(value).toLocaleString()} Ar`, 'Montant'];
                      }}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="montant" name="Montant (Ar)" fill="#4F46E5" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { id: 'centres', name: 'Centres' },
                { id: 'formations', name: 'Formations' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-4">
            {activeTab === 'centres' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Détail par Centre (Étudiants Actifs Seulement)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Actifs</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nouvelles</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Anciennes</th>
                        {userRole !== 'gerant' && userRole !== 'dir' && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CA Total</th>}
                        {/* <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CA/Étudiant</th> */}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {stats.montantParCentre.map((centre) => (
                        <tr key={centre.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{centre.nom}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{centre.inscriptions}</td>
                          <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                            {centre.nouvellesInscriptions}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {centre.anciennesInscriptions}
                          </td>
                          {userRole !== 'gerant' && userRole !== 'dir' && <td className="px-4 py-3 text-sm text-gray-900 text-right">{centre.montant.toLocaleString()} Ar</td>}
                          {/* <td className="px-4 py-3 text-sm text-gray-900 text-right">{Math.round(centre.montantParInscription).toLocaleString()} Ar</td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'formations' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Détail par Formation (Étudiants Actifs Seulement)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formation</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Actifs</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nouvelles</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Anciennes</th>
                        {userRole !== 'gerant' && userRole !== 'dir' && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CA Total</th>}
                        {/* <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CA/Inscription</th> */}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {stats.montantParFormation.map((formation) => (
                        <tr key={formation.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{formation.nom}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formation.inscriptions}</td>
                          <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                            {formation.nouvellesInscriptions}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {formation.anciennesInscriptions}
                          </td>
                          {userRole !== 'gerant' && userRole !== 'dir' && <td className="px-4 py-3 text-sm text-gray-900 text-right">{formation.montant.toLocaleString()} Ar</td>}
                          {/* <td className="px-4 py-3 text-sm text-gray-900 text-right">{Math.round(formation.montantParInscription).toLocaleString()} Ar</td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Inscriptions par période</h3>
              <div className="flex items-center gap-3">
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value)}
                  className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="day">Jour</option>
                  <option value="week">Semaine</option>
                  <option value="month">Mois</option>
                </select>

                <div className="relative">
                  <div
                    className="relative cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPeriodCentresDropdown(!showPeriodCentresDropdown);
                    }}
                  >
                    <input
                      type="text"
                      className="p-2 border border-gray-200 rounded-lg text-sm bg-white pr-8 w-40"
                      placeholder="Centre..."
                      disabled={userRole === 'gerant' && !!userCentreId}
                      value={filtreCentre === "" ? searchCentreInput : (centres.find(c => String(c.id) === String(filtreCentre))?.nom || "")}
                      onChange={(e) => {
                        setSearchCentreInput(e.target.value);
                        if (filtreCentre !== "") setFiltreCentre("");
                        setShowPeriodCentresDropdown(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  {showPeriodCentresDropdown && !(userRole === 'gerant' && !!userCentreId) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
                      {filteredCentresOptions.length > 0 ? (
                        filteredCentresOptions.map((c) => (
                          <div
                            key={c.id}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${String(filtreCentre) === String(c.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                            onClick={() => {
                              setFiltreCentre(c.id === "" ? "" : String(c.id));
                              setSearchCentreInput(c.id === "" ? "" : c.nom);
                              setShowPeriodCentresDropdown(false);
                            }}
                          >
                            {c.nom}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">Aucun centre trouvé</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mask for period section dropdown */}
                {showPeriodCentresDropdown && (
                  <div
                    className="fixed inset-0 z-40 outline-none"
                    onClick={() => setShowPeriodCentresDropdown(false)}
                  />
                )}

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Tous statuts</option>
                  <option value="inscrit">Inscrit</option>
                  <option value="actif">Actif</option>
                  <option value="quitte">Quitté</option>
                  <option value="fini">Fini</option>
                </select>

                <button onClick={getStats} className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Rafraîchir</button>
              </div>
            </div>

            <div className="p-4">
              <div className="h-56 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Inscriptions']} />
                    <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formation</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {((stats.inscriptionsByPeriod && stats.inscriptionsByPeriod[granularity]) || [])
                      .filter(row => {
                        if (filtreCentre && String(filtreCentre) !== '') {
                          if (String(row.centreId) !== String(filtreCentre)) return false;
                        }
                        if (filtreFormation && String(filtreFormation) !== '') {
                          if (String(row.formationId) !== String(filtreFormation)) return false;
                        }
                        if (filterStatus && String(filterStatus) !== '') {
                          if (String(row.status || '') !== String(filterStatus)) return false;
                        }
                        return true;
                      })
                      .map((row, idx) => (
                        <tr key={`${row.period}-${row.centreId}-${row.formationId}-${row.status || 'all'}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{row.periodLabel}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.centreName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.formationName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Historique des Paiements</h3>
            </div>

            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={paiementsSearchLocal}
                    onChange={(e) => setPaiementsSearchLocal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setPaiementsSearch(paiementsSearchLocal);
                        setPaiementsPage(1);
                      }
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                  <button
                    onClick={() => {
                      setPaiementsSearch(paiementsSearchLocal);
                      setPaiementsFilterType(paiementsFilterTypeLocal);
                      setPaiementsFilterCentre(paiementsFilterCentreLocal);
                      setPaiementsFilterFormation(paiementsFilterFormationLocal);
                      setDateDebut(dateDebutLocal);
                      setDateFin(dateFinLocal);
                      setPaiementsPage(1);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Rechercher
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    value={paiementsFilterTypeLocal}
                    onChange={(e) => setPaiementsFilterTypeLocal(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Tous types</option>
                    {paiementTypes.map(t => (
                      <option key={t} value={t}>{getTypeLabel(t)}</option>
                    ))}
                  </select>

                  {/* Searchable Centre Filter for History */}
                  <div className="relative">
                    <div
                      className="relative cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPaiementsCentresDropdown(!showPaiementsCentresDropdown);
                        setShowPaiementsFormationsDropdown(false);
                      }}
                    >
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white pr-8"
                        placeholder="Filtrer par centre..."
                        disabled={userRole === 'gerant'}
                        value={paiementsFilterCentreLocal === "" ? searchPaiementsCentreInput : (centres.find(c => String(c.id) === String(paiementsFilterCentreLocal))?.nom || "")}
                        onChange={(e) => {
                          setSearchPaiementsCentreInput(e.target.value);
                          if (paiementsFilterCentreLocal !== "") setPaiementsFilterCentreLocal("");
                          setShowPaiementsCentresDropdown(true);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>

                    {showPaiementsCentresDropdown && userRole !== 'gerant' && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
                        {filteredPaiementsCentresOptions.length > 0 ? (
                          filteredPaiementsCentresOptions.map((c) => (
                            <div
                              key={c.id}
                              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${String(paiementsFilterCentreLocal) === String(c.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                              onClick={() => {
                                setPaiementsFilterCentreLocal(c.id === "" ? "" : String(c.id));
                                setSearchPaiementsCentreInput(c.id === "" ? "" : c.nom);
                                setShowPaiementsCentresDropdown(false);
                              }}
                            >
                              {c.nom}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 italic">Aucun centre trouvé</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Searchable Formation Filter for History */}
                  <div className="relative">
                    <div
                      className="relative cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPaiementsFormationsDropdown(!showPaiementsFormationsDropdown);
                        setShowPaiementsCentresDropdown(false);
                      }}
                    >
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white pr-8"
                        placeholder="Filtrer par formation..."
                        value={paiementsFilterFormationLocal === "" ? searchPaiementsFormationInput : (formations.find(f => String(f.id) === String(paiementsFilterFormationLocal))?.nom || "")}
                        onChange={(e) => {
                          setSearchPaiementsFormationInput(e.target.value);
                          if (paiementsFilterFormationLocal !== "") setPaiementsFilterFormationLocal("");
                          setShowPaiementsFormationsDropdown(true);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>

                    {showPaiementsFormationsDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
                        {filteredPaiementsFormationsOptions.length > 0 ? (
                          filteredPaiementsFormationsOptions.map((f) => (
                            <div
                              key={f.id}
                              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${String(paiementsFilterFormationLocal) === String(f.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                              onClick={() => {
                                setPaiementsFilterFormationLocal(f.id === "" ? "" : String(f.id));
                                setSearchPaiementsFormationInput(f.id === "" ? "" : f.nom);
                                setShowPaiementsFormationsDropdown(false);
                              }}
                            >
                              {f.nom}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 italic">Aucune formation trouvée</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Click mask specialized for history filters */}
                {(showPaiementsCentresDropdown || showPaiementsFormationsDropdown) && (
                  <div
                    className="fixed inset-0 z-40 outline-none"
                    onClick={() => {
                      setShowPaiementsCentresDropdown(false);
                      setShowPaiementsFormationsDropdown(false);
                    }}
                  />
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
                    <input
                      type="date"
                      value={dateDebutLocal}
                      onChange={(e) => setDateDebutLocal(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
                    <input
                      type="date"
                      value={dateFinLocal}
                      onChange={(e) => setDateFinLocal(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois payé</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Étudiant</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formation</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paiementsPaged.map((p) => {
                    const etudiant = p.inscriptions?.etudiants;
                    const formation = p.inscriptions?.formations;
                    const centreId = etudiant?.centre_id;
                    const centre = centres.find(c => c.id === centreId);

                    // Formater le mois payé pour les paiements de formation
                    let moisPaye = '-';
                    if (p.type_paiement === 'formation' && p.mois_paye) {
                      moisPaye = p.mois_paye;
                    }

                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm text-gray-700">{formatDate(p.date_paiement)}</td>
                        <td className="px-3 py-3 text-sm text-gray-700">{Number(p.montant).toLocaleString()} Ar</td>
                        <td className="px-3 py-3 text-sm text-gray-700">{getTypeLabel(p.type_paiement)}</td>
                        <td className="px-3 py-3 text-sm text-gray-700">
                          {moisPaye}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700">
                          {etudiant ? `${etudiant.prenom || ''} ${etudiant.nom || ''}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700">
                          {formation ? formation.nom : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700">
                          {centre ? centre.nom : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  Affichage {startIndex} à {endIndex} sur {paiementsFiltered.length} éléments
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPaiementsPage(Math.max(1, paiementsPage - 1))}
                    disabled={paiementsPage === 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <span className="text-xs text-gray-700">
                    Page {paiementsPageSafe} sur {paiementsTotalPages}
                  </span>
                  <button
                    onClick={() => setPaiementsPage(Math.min(paiementsTotalPages, paiementsPage + 1))}
                    disabled={paiementsPage === paiementsTotalPages}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div >
    </div >
  );
}