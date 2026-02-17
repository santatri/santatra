import React, { useState, useEffect, useCallback, useMemo } from "react";
// Use backend Node.js API instead of Supabase directly
import { useAuth } from "../context/authContext";
import { isFormationFinishedByDate } from '../utils/formationUtils';
import { FaSearch, FaPlus, FaTimes, FaChevronDown, FaChevronUp, FaMoneyBillWave, FaGraduationCap, FaSpinner, FaExclamationTriangle, FaCheckCircle, FaChartBar, FaBuilding, FaBook } from "react-icons/fa";
import RefreshButton from '../components/RefreshButton';
import { API_URL } from '../config';

const generateMoisFormation = (dateInscription, duree) => {
  const dureeFloat = parseFloat(duree);
  if (dureeFloat <= 0.25) return ["Frais de semaine"];
  if (dureeFloat <= 0.5) return ["Frais de formation (2 semaines)"];
  if (dureeFloat <= 0.75) return ["Frais de formation (3 semaines)"];
  if (dureeFloat === 1.5) return ["Frais de formation (1.5 mois)"];
  const months = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
  const start = new Date(dateInscription);
  let list = [];
  const nombreMois = Math.ceil(dureeFloat);
  for (let i = 0; i < nombreMois; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    list.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
  }
  return list;
};

const Inscriptions = () => {
  const [inscriptions, setInscriptions] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [formations, setFormations] = useState([]);
  const [centres, setCentres] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [montantDroitsGlobal, setMontantDroitsGlobal] = useState(50000);
  const [loading, setLoading] = useState(false);
  const [processingButtons, setProcessingButtons] = useState([]);
  const [validationMessage, setValidationMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [selectedInscription, setSelectedInscription] = useState(null);
  const [dropdownEtudiant, setDropdownEtudiant] = useState(false);
  const [dropdownFormation, setDropdownFormation] = useState(false);
  const [searchEtudiant, setSearchEtudiant] = useState("");
  const [searchFormation, setSearchFormation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCentre, setSelectedCentre] = useState("");
  const [selectedFormation, setSelectedFormation] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const [showStats, setShowStats] = useState(false);
  const API_BASE = `${API_URL}/api`;

  const [stats, setStats] = useState({
    parCentre: [],
    totalGeneraux: { nouveauxAujourdhui: 0, anciens: 0, total: 0 }
  });
  const [formData, setFormData] = useState({
    etudiant_id: "",
    formation_id: "",
    date_inscription: new Date().toISOString().split('T')[0]
  });
  const [livresFormation, setLivresFormation] = useState([]);
  const [loadingLivres, setLoadingLivres] = useState(false);

  // États pour la date de paiement personnalisée
  const [datePaiementDroits, setDatePaiementDroits] = useState(new Date().toISOString().split('T')[0]);
  const [datePaiementMensualite, setDatePaiementMensualite] = useState(new Date().toISOString().split('T')[0]);
  const [datePaiementLivre, setDatePaiementLivre] = useState(new Date().toISOString().split('T')[0]);

  // État pour la sélection multiple des mois
  const [selectedMonths, setSelectedMonths] = useState(new Set());

  // État pour la modification de formation (Admin)
  const [isEditingFormation, setIsEditingFormation] = useState(false);
  const [newFormationId, setNewFormationId] = useState("");

  // État pour activer/désactiver l'envoi d'emails (Admin)
  const [emailEnabled, setEmailEnabled] = useState(true);

  const { user } = useAuth();

  // Fonction pour obtenir le montant des droits (toujours le même)
  const getMontantDroits = () => {
    return montantDroitsGlobal;
  };

  const calculateStats = useCallback(() => {
    if (!inscriptions.length || !centres.length || !formations.length) return;
    const today = new Date().toISOString().split('T')[0];
    const statsParCentre = centres.map(centre => {
      const inscriptionsCentre = inscriptions.filter(ins => ins.etudiants?.centre_id === centre.id);
      if (inscriptionsCentre.length === 0) return null;
      const formationsDetails = formations.map(formation => {
        const inscriptionsFormation = inscriptionsCentre.filter(ins => ins.formation_id === formation.id);
        if (inscriptionsFormation.length === 0) return null;
        const nouveaux = inscriptionsFormation.filter(ins => ins.date_inscription === today).length;
        return { id: formation.id, nom: formation.nom, total: inscriptionsFormation.length, nouveaux, anciens: inscriptionsFormation.length - nouveaux };
      }).filter(f => f !== null);
      const totalCentre = inscriptionsCentre.length;
      const nouveauxCentre = inscriptionsCentre.filter(ins => ins.date_inscription === today).length;
      return { id: centre.id, nom: centre.nom, total: totalCentre, nouveaux: nouveauxCentre, anciens: totalCentre - nouveauxCentre, formations: formationsDetails };
    }).filter(centre => centre !== null);
    const totalInscriptions = inscriptions.length;
    const nouveauxAujourdhui = inscriptions.filter(ins => ins.date_inscription === today).length;
    setStats({ parCentre: statsParCentre, totalGeneraux: { nouveauxAujourdhui, anciens: totalInscriptions - nouveauxAujourdhui, total: totalInscriptions } });
  }, [inscriptions, centres, formations]);

  useEffect(() => { calculateStats(); }, [calculateStats]);

  const startProcessing = (key) => setProcessingButtons(prev => prev.includes(key) ? prev : [...prev, key]);
  const stopProcessing = (key) => setProcessingButtons(prev => prev.filter(k => k !== key));
  const showValidationMessage = (type, text) => {
    setValidationMessage({ type, text });
    setTimeout(() => setValidationMessage({ type: '', text: '' }), 3000);
  };

  useEffect(() => { if (user && user.role === 'gerant') setSelectedCentre(user.centre_id || ""); }, [user]);
  useEffect(() => {
    const handleClickOutside = () => { setDropdownEtudiant(false); setDropdownFormation(false); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const updateFinishedInscriptions = useCallback(async (inscriptions, formations) => {
    try {
      const updates = [];
      for (const inscription of inscriptions) {
        if (inscription.statut === 'fini') continue;
        const formation = formations.find(f => f.id === inscription.formation_id);
        if (!formation) continue;
        if (isFormationFinishedByDate(inscription.date_inscription, formation.duree)) {
          updates.push({ id: inscription.id, statut: 'fini' });
        }
      }
      if (updates.length > 0) {
        for (const update of updates) {
          try {
            await fetch(`${API_BASE}/inscriptions/${update.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ statut: update.statut })
            });
          } catch (e) {
            console.error('Erreur updateFinishedInscriptions (fetch):', e);
          }
        }
      }
    } catch (error) { console.error('Erreur updateFinishedInscriptions:', error); }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Inscriptions (backend renvoie l'ensemble des inscriptions avec paiements)
      const insRes = await fetch(`${API_BASE}/inscriptions`);
      const insJson = await insRes.json();
      const insc = (insJson && insJson.data) ? insJson.data : [];

      // Etudiants (filtré côté frontend si nécessaire)
      let etUrl = `${API_BASE}/etudiants`;
      const etRes = await fetch(etUrl);
      const etds = etRes.ok ? await etRes.json() : [];

      const frRes = await fetch(`${API_BASE}/formations`);
      const frms = frRes.ok ? await frRes.json() : [];

      const ctRes = await fetch(`${API_BASE}/centres`);
      const cts = ctRes.ok ? await ctRes.json() : [];

      // Récupérer le dernier montant des droits si disponible
      const droitsRes = await fetch(`${API_BASE}/paiements/droits`);
      const droitsJson = droitsRes.ok ? await droitsRes.json() : null;

      const inscriptionsFiltered = (insc || []).filter(i => {
        if (!user || user.role !== 'gerant') return true;
        return i.centre_id === user.centre_id || (i.etudiant_centre_id && i.etudiant_centre_id === user.centre_id) || (i.etudiants && i.etudiants.centre_id === user.centre_id);
      });

      await updateFinishedInscriptions(inscriptionsFiltered, frms || []);
      setInscriptions(inscriptionsFiltered);
      setEtudiants(etds || []);
      setFormations(frms || []);
      setCentres(cts || []);

      // Agréger paiements depuis les inscriptions
      const allPaiements = [];
      (inscriptionsFiltered || []).forEach(ins => { if (ins.paiements) allPaiements.push(...ins.paiements); });
      setPaiements(allPaiements || []);

      if (droitsJson && droitsJson.data && droitsJson.data.montant) {
        setMontantDroitsGlobal(parseFloat(droitsJson.data.montant));
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
      showValidationMessage('error', 'Erreur lors du chargement des données');
    } finally { setLoading(false); }
  }, [user, updateFinishedInscriptions]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Charger les livres de la formation sélectionnée (et marquer si achetés par l'étudiant)
  useEffect(() => {
    const fetchLivres = async () => {
      if (!selectedInscription) return setLivresFormation([]);
      setLoadingLivres(true);
      try {
        const url = `${API_BASE}/livres/formation/${selectedInscription.formation_id}?etudiant_id=${selectedInscription.etudiant_id}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Erreur récupération livres');
        let data = await res.json();

        // Filtrage spécifique : Masquer les livres avec "1" dans le nom pour la PREMIÈRE inscription de l'étudiant
        if (selectedInscription.etudiant_id) {
          // Trouver toutes les inscriptions de cet étudiant
          const studentInscriptions = inscriptions.filter(i => i.etudiant_id === selectedInscription.etudiant_id);
          // Trier par date d'inscription (et ID pour stabilité)
          studentInscriptions.sort((a, b) => {
            const dateA = new Date(a.date_inscription);
            const dateB = new Date(b.date_inscription);
            return dateA - dateB || a.id - b.id;
          });

          // Si c'est la première inscription
          if (studentInscriptions.length > 0 && studentInscriptions[0].id === selectedInscription.id) {
            data = (data || []).filter(l => !l.nom.includes('1'));
          }
        }

        console.log('Livres affichés:', data);
        setLivresFormation(data || []);
      } catch (err) {
        console.error('Erreur fetch livres:', err);
        setLivresFormation([]);
      } finally {
        setLoadingLivres(false);
      }
    };
    fetchLivres();
  }, [selectedInscription, inscriptions]);

  const handleUpdateFormation = async () => {
    if (!newFormationId || newFormationId === selectedInscription.formation_id) {
      setIsEditingFormation(false);
      return;
    }

    if (!window.confirm("⚠️ Attention : Changer la formation peut affecter les montants dus et l'historique des paiements.\nÊtes-vous sûr de vouloir continuer ?")) {
      return;
    }

    const key = 'update-formation';
    startProcessing(key);

    try {
      const res = await fetch(`${API_BASE}/inscriptions/${selectedInscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation_id: newFormationId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erreur serveur');
      }

      showValidationMessage('success', 'Formation modifiée avec succès !');
      setIsEditingFormation(false);

      // Mettre à jour l'inscription sélectionnée localement pour refléter le changement immédiatement
      const newFormation = formations.find(f => f.id == newFormationId);
      setSelectedInscription(prev => ({
        ...prev,
        formation_id: newFormationId,
        formations: newFormation
      }));

      fetchData();
    } catch (error) {
      console.error("Erreur modification formation:", error);
      showValidationMessage('error', `Erreur: ${error.message}`);
    } finally {
      stopProcessing(key);
    }
  };

  const inscriptionsAppliquees = useMemo(() => {
    return (inscriptions || []).filter(i => {
      if (selectedCentre && String(selectedCentre) !== "") {
        if (!i.etudiants || String(i.etudiants.centre_id) !== String(selectedCentre)) return false;
      }
      if (selectedFormation && String(selectedFormation) !== "") {
        if (String(i.formation_id) !== String(selectedFormation)) return false;
      }
      return true;
    });
  }, [inscriptions, selectedCentre, selectedFormation]);

  const etudiantsAvecInscriptions = useMemo(() => {
    const grouped = {};
    inscriptionsAppliquees.forEach(inscription => {
      const etudiantId = inscription.etudiant_id;
      if (!grouped[etudiantId]) grouped[etudiantId] = { etudiant: inscription.etudiants, inscriptions: [] };
      grouped[etudiantId].inscriptions.push(inscription);
    });

    const result = Object.values(grouped).map(group => {
      group.inscriptions.sort((a, b) => new Date(b.date_inscription) - new Date(a.date_inscription));

      const activeCount = group.inscriptions.filter(insc => insc.statut === 'actif').length;
      const finishedCount = group.inscriptions.filter(insc => insc.statut === 'fini').length;
      const quitCount = group.inscriptions.filter(insc => insc.statut === 'quitte').length;
      const inscriptionStatuses = group.inscriptions.map(insc => insc.statut);
      let globalStatus = 'fini';
      if (inscriptionStatuses.includes('actif')) globalStatus = 'actif';
      else if (inscriptionStatuses.includes('quitte')) globalStatus = 'quitte';

      return {
        ...group,
        activeFormations: activeCount,
        finishedFormations: finishedCount,
        quitFormations: quitCount,
        globalStatus
      };
    });

    result.sort((a, b) => {
      const nameA = `${a.etudiant?.nom || ''} ${a.etudiant?.prenom || ''}`.toLowerCase();
      const nameB = `${b.etudiant?.nom || ''} ${b.etudiant?.prenom || ''}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [inscriptionsAppliquees]);

  const etudiantsFiltres = useMemo(() => {
    if (!searchTerm) return etudiantsAvecInscriptions;
    return etudiantsAvecInscriptions.filter(etudiantGroup =>
      `${etudiantGroup.etudiant.nom} ${etudiantGroup.etudiant.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      etudiantGroup.inscriptions.some(inscription => inscription.formations.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [etudiantsAvecInscriptions, searchTerm]);

  const totalInscriptions = useMemo(() => (inscriptionsAppliquees || []).length, [inscriptionsAppliquees]);
  const filteredInscriptions = useMemo(() => {
    if (!searchTerm) return (inscriptions || []).length;
    const q = searchTerm.toLowerCase();
    return (inscriptions || []).filter(i => {
      const name = `${i.etudiants?.nom || ''} ${i.etudiants?.prenom || ''}`.toLowerCase();
      const formationName = (i.formations?.nom || '').toLowerCase();
      return name.includes(q) || formationName.includes(q);
    }).length;
  }, [inscriptions, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEtudiants = etudiantsFiltres.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(etudiantsFiltres.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const toggleStudentExpansion = (etudiantId) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(etudiantId)) newExpanded.delete(etudiantId);
    else newExpanded.add(etudiantId);
    setExpandedStudents(newExpanded);
  };

  const etudiantsFiltresForm = etudiants.filter(etudiant => {
    const matchesSearch = `${etudiant.nom} ${etudiant.prenom}`.toLowerCase().includes(searchEtudiant.toLowerCase());
    if (user?.role === 'gerant') {
      return matchesSearch && etudiant.centre_id === user.centre_id;
    }
    return matchesSearch;
  });
  const formationsFiltrees = formations.filter(formation => formation.nom.toLowerCase().includes(searchFormation.toLowerCase()));

  const handleCreate = async () => {
    if (!formData.etudiant_id || !formData.formation_id || !formData.date_inscription) { showValidationMessage('warning', 'Veuillez remplir tous les champs'); return; }
    if (user && user.role === 'gerant') {
      const etu = etudiants.find(e => e.id === formData.etudiant_id || e.id === parseInt(formData.etudiant_id));
      if (!etu || etu.centre_id !== user.centre_id) { showValidationMessage('error', 'Vous ne pouvez pas inscrire un étudiant hors de votre centre.'); return; }
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etudiant_id: formData.etudiant_id, formation_id: formData.formation_id, date_inscription: formData.date_inscription })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showValidationMessage('error', `Erreur lors de l'ajout: ${err.message || 'Erreur serveur'}`);
        return;
      }
      setFormData({ etudiant_id: "", formation_id: "", date_inscription: new Date().toISOString().split('T')[0] });
      setSearchEtudiant(""); setSearchFormation(""); setShowForm(false); fetchData();
      showValidationMessage('success', 'Inscription créée avec succès!');
    } catch (error) { showValidationMessage('error', `Erreur: ${error.message}`); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette inscription ?")) return;
    setLoading(true);
    try {
      const insRes = await fetch(`${API_BASE}/inscriptions/${id}`);
      const insJson = await insRes.json();
      const inscription = insJson && insJson.data ? insJson.data : null;
      if (inscription && user && user.role === 'gerant') {
        const etuCentre = inscription.etudiants?.centre_id;
        if (!etuCentre || etuCentre !== user.centre_id) { showValidationMessage('error', 'Vous ne pouvez pas supprimer une inscription hors de votre centre.'); return; }
      }
      if (inscription) {
        const delRes = await fetch(`${API_BASE}/inscriptions/${id}`, { method: 'DELETE' });
        if (!delRes.ok) throw new Error('Erreur suppression');
      }
      setSelectedInscription(null); setSelectedMonths(new Set()); fetchData();
      showValidationMessage('success', 'Inscription supprimée avec succès!');
    } catch (error) { showValidationMessage('error', `Erreur lors de la suppression: ${error.message}`); } finally { setLoading(false); }
  };

  const selectEtudiant = (etudiant) => {
    setFormData({ ...formData, etudiant_id: etudiant.id });
    setSearchEtudiant(`${etudiant.nom} ${etudiant.prenom}`);
    setDropdownEtudiant(false);
  };

  const selectFormation = (formation) => {
    setFormData({ ...formData, formation_id: formation.id });
    setSearchFormation(formation.nom);
    setDropdownFormation(false);
  };

  const canPayStudent = (etudiant) => etudiant.statut !== 'quitte';

  const studentsWithDroits = useMemo(() => {
    const set = new Set();
    (paiements || []).forEach((p) => {
      if (p.type_paiement === 'droits') {
        const insc = (inscriptions || []).find(i => i.id === p.inscription_id);
        if (insc?.etudiant_id) set.add(insc.etudiant_id);
      }
    });
    return set;
  }, [paiements, inscriptions]);

  // Fonction simplifiée pour payer les droits en un clic avec date personnalisée
  const payerDroitsSimple = async (inscription, datePaiementCustom = null) => {
    const montant = getMontantDroits();

    // Utiliser la date personnalisée si fournie, sinon date du jour
    const dateAPayer = datePaiementCustom || new Date().toISOString().split('T')[0];

    // Vérifications
    if (studentsWithDroits.has(inscription.etudiant_id) || inscription.droits_inscription_paye) {
      showValidationMessage('warning', 'Cet étudiant a déjà payé les droits d\'inscription.');
      return false;
    }

    if (!canPayStudent(inscription.etudiants)) {
      showValidationMessage('error', 'Impossible de payer pour un étudiant avec le statut "Quitté"');
      return false;
    }

    if (inscription.statut === 'fini') {
      showValidationMessage('error', 'Impossible de payer les droits d\'une formation terminée');
      return false;
    }

    if (inscription.statut === 'quitte') {
      showValidationMessage('error', 'Impossible de payer les droits d\'une formation quittée');
      return false;
    }

    // Vérifier si la formation est terminée
    if (isFormationFinishedByDate(inscription.date_inscription, inscription.formations.duree)) {
      if (!window.confirm("⚠️ La période programmée de cette formation est déjà terminée.\nVoulez-vous quand même enregistrer le paiement des droits d'inscription ?")) {
        return false;
      }
    }

    // Confirmation avec le montant
    if (!window.confirm(`Confirmez-vous le paiement des droits d'inscription ?\n\nÉtudiant: ${inscription.etudiants.nom} ${inscription.etudiants.prenom}\nFormation: ${inscription.formations.nom}\nMontant: ${montant.toLocaleString()} Ar\nDate: ${dateAPayer}`)) {
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/paiements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscription_id: inscription.id, type_paiement: 'droits', montant, date_paiement: dateAPayer, send_email: emailEnabled })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showValidationMessage('error', `Erreur lors du paiement: ${err.error || err.message || 'Erreur serveur'}`);
        return false;
      }

      showValidationMessage('success', `Droits d'inscription payés avec succès pour le ${dateAPayer}!`);
      fetchData();
      return true;
    } catch (error) {
      showValidationMessage('error', `Erreur lors du paiement: ${error.message}`);
      return false;
    }
  };

  // Fonction pour payer les mensualités avec date personnalisée
  const payerMois = async (ins, mois, montantAPayer, datePaiementCustom = null) => {
    if (!canPayStudent(ins.etudiants)) {
      showValidationMessage('error', 'Impossible de payer pour un étudiant avec le statut "Quitté"');
      return false;
    }
    if (ins.statut === 'fini') {
      showValidationMessage('error', 'Impossible de payer les frais d\'une formation terminée');
      return false;
    }
    if (ins.statut === 'quitte') {
      showValidationMessage('error', 'Impossible de payer les frais d\'une formation quittée');
      return false;
    }

    const paiementsCeMois = paiements.filter(p => p.inscription_id === ins.id && p.type_paiement === 'formation' && p.mois_paye === mois);
    const totalDejaPaye = paiementsCeMois.reduce((sum, p) => sum + (p.montant || 0), 0);
    const fraisMensuel = ins.formations.frais_mensuel || 0;
    const resteAPayer = fraisMensuel - totalDejaPaye;

    if (resteAPayer <= 0) {
      showValidationMessage('warning', `Le mois ${mois} est déjà entièrement payé`);
      return false;
    }
    if (montantAPayer > resteAPayer) {
      showValidationMessage('warning', `Le montant dépasse le reste à payer (${resteAPayer.toLocaleString()} Ar)`);
      return false;
    }
    if (montantAPayer <= 0) {
      showValidationMessage('warning', `Le montant doit être supérieur à 0`);
      return false;
    }

    if (isFormationFinishedByDate(ins.date_inscription, ins.formations.duree)) {
      if (!window.confirm("⚠️ La période programmée de cette formation est déjà terminée.\nVoulez-vous quand même enregistrer ce paiement de mensualité ?")) return false;
    }

    // Future month check
    const [moisStr, anneeStr] = mois.split(' ');
    if (anneeStr) {
      const moisIndex = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"].indexOf(moisStr);
      if (moisIndex !== -1) {
        const dateMois = new Date(parseInt(anneeStr), moisIndex, 1);
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);
        if (dateMois > aujourdhui) {
          if (!window.confirm(`⚠️ Le mois ${mois} est dans le futur.\nSouhaitez-vous tout de même enregistrer ce paiement anticipé ?`)) return false;
        }
      }
    }

    // Utiliser la date personnalisée si fournie, sinon date du jour
    const dateAPayer = datePaiementCustom || new Date().toISOString().split('T')[0];

    if (!window.confirm(`Confirmez-vous le paiement ?\n\nÉtudiant: ${ins.etudiants.nom} ${ins.etudiants.prenom}\nFormation: ${ins.formations.nom}\nMois: ${mois}\nMontant: ${montantAPayer.toLocaleString()} Ar\nDate: ${dateAPayer}`)) return false;

    try {
      const res = await fetch(`${API_BASE}/paiements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscription_id: ins.id, type_paiement: 'formation', montant: montantAPayer, mois_paye: mois, date_paiement: dateAPayer, send_email: emailEnabled })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showValidationMessage('error', `Erreur lors du paiement: ${err.error || err.message || 'Erreur serveur'}`);
        return false;
      }
      showValidationMessage('success', `Paiement de ${montantAPayer.toLocaleString()} Ar pour ${mois} enregistré pour le ${dateAPayer}!`);
      return true;
    } catch (error) {
      showValidationMessage('error', `Erreur lors du paiement: ${error.message}`);
      return false;
    }
  };

  // Fonction pour payer un livre
  const payerLivre = async (inscription, livre, datePaiementCustom = null) => {
    if (!canPayStudent(inscription.etudiants)) { showValidationMessage('error', 'Impossible de payer pour un étudiant avec le statut "Quitté"'); return false; }
    if (inscription.statut === 'fini' || inscription.statut === 'quitte') { showValidationMessage('error', 'Impossible de payer for cette inscription'); return false; }

    const montant = Number(livre.prix) || 0;
    const dateAPayer = datePaiementCustom || new Date().toISOString().split('T')[0];

    if (!window.confirm(`Confirmez-vous l'achat du livre "${livre.nom}" pour ${montant.toLocaleString()} Ar ?\n\nÉtudiant: ${inscription.etudiants.nom} ${inscription.etudiants.prenom}\nDate: ${dateAPayer}`)) return false;

    const key = `livre-${inscription.id}-${livre.id}`;
    startProcessing(key);
    try {
      const res = await fetch(`${API_BASE}/paiements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscription_id: inscription.id,
          type_paiement: 'livre',
          montant,
          livre_id: livre.id,
          date_paiement: dateAPayer,
          send_email: emailEnabled
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showValidationMessage('error', `Erreur lors du paiement: ${err.error || err.message || 'Erreur serveur'}`);
        return false;
      }
      const created = await res.json();
      const dateAchat = (created.date_paiement || new Date().toISOString()).slice(0, 10);

      // Mettre à jour l'état local des livres pour refléter l'achat immédiatement
      setLivresFormation(prev => prev.map(l2 => l2.id === livre.id ? { ...l2, achete: true, date_achat: dateAchat } : l2));

      // Ajouter le paiement localement (optimistic update) pour UI paiements/historique
      setPaiements(prev => [created, ...(prev || [])]);
      setInscriptions(prev => prev.map(i => i.id === inscription.id ? { ...i, paiements: [created, ...(i.paiements || [])] } : i));
      setSelectedInscription(prev => prev ? { ...prev, paiements: [created, ...(prev.paiements || [])] } : prev);

      showValidationMessage('success', `Livre "${livre.nom}" payé (${montant.toLocaleString()} Ar)`);
      // Re-synchroniser en arrière-plan pour garantir la cohérence
      setTimeout(() => fetchData(), 800);
      return true;
    } catch (error) {
      showValidationMessage('error', `Erreur lors du paiement: ${error.message}`);
      return false;
    } finally {
      stopProcessing(key);
    }
  };

  const toggleMonthSelection = (mois, montantRestant) => {
    const newSelected = new Set(selectedMonths);
    if (newSelected.has(mois)) {
      newSelected.delete(mois);
    } else {
      newSelected.add(mois);
    }
    setSelectedMonths(newSelected);
  };

  const payerPlusieursMois = async () => {
    if (selectedMonths.size === 0) return;

    const moisList = Array.from(selectedMonths);
    // Trier les mois chronologiquement si possible (optionnel mais mieux pour l'affichage)

    let totalAmount = 0;
    const paiementsBatch = [];
    const dateAPayer = (user?.role === 'admin' || user?.role === 'dir') ? datePaiementMensualite : new Date().toISOString().split('T')[0];

    // Calculer le total et préparer les données
    for (const mois of moisList) {
      const paiementsCeMois = paiements.filter(p => p.inscription_id === selectedInscription.id && p.type_paiement === 'formation' && p.mois_paye === mois);
      const totalDejaPaye = paiementsCeMois.reduce((sum, p) => sum + (p.montant || 0), 0);
      const fraisMensuel = selectedInscription.formations.frais_mensuel || 0;
      const resteAPayer = fraisMensuel - totalDejaPaye;

      if (resteAPayer > 0) {
        totalAmount += resteAPayer;
        paiementsBatch.push({
          inscription_id: selectedInscription.id,
          type_paiement: "formation",
          montant: resteAPayer,
          mois_paye: mois,
          date_paiement: dateAPayer
        });
      }
    }

    if (paiementsBatch.length === 0) {
      showValidationMessage('warning', 'Aucun montant à payer pour la sélection.');
      return;
    }

    if (!window.confirm(`Confirmez-vous le paiement groupé ?\n\nÉtudiant: ${selectedInscription.etudiants.nom} ${selectedInscription.etudiants.prenom}\nNombre de mois: ${paiementsBatch.length}\nTotal: ${totalAmount.toLocaleString()} Ar\nDate: ${dateAPayer}`)) {
      return;
    }

    const key = 'batch-payment';
    startProcessing(key);

    try {
      const res = await fetch(`${API_BASE}/paiements/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscription_id: selectedInscription.id, mois_list: moisList, date_paiement: dateAPayer, send_email: emailEnabled })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Erreur serveur');
      }

      showValidationMessage('success', `Paiement groupé de ${totalAmount.toLocaleString()} Ar enregistré avec succès !`);
      setSelectedMonths(new Set());
      fetchData();
    } catch (error) {
      console.error("Erreur paiement groupé:", error);
      showValidationMessage('error', `Erreur lors du paiement groupé: ${error.message}`);
    } finally {
      stopProcessing(key);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-6xl mx-auto">
        {/* MESSAGE DE VALIDATION */}
        {validationMessage.type && (
          <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-3 rounded-lg shadow-lg max-w-md animate-fade-in ${validationMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : validationMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
            <div className="flex items-center gap-2">
              {validationMessage.type === 'success' && <FaCheckCircle className="text-green-500" />}
              {validationMessage.type === 'error' && <FaExclamationTriangle className="text-red-500" />}
              {validationMessage.type === 'warning' && <FaExclamationTriangle className="text-yellow-500" />}
              <span className="text-sm font-medium">{validationMessage.text}</span>
              <button onClick={() => setValidationMessage({ type: '', text: '' })} className="ml-auto text-gray-400 hover:text-gray-600"><FaTimes className="w-3 h-3" /></button>
            </div>
          </div>
        )}

        {/* HEADER AVEC RECHERCHE */}
        <div className="mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-800">Inscriptions</h1>
              <p className="text-gray-600 text-xs">{totalInscriptions} inscription{totalInscriptions !== 1 ? 's' : ''}{searchTerm && ` (${filteredInscriptions} filtré${filteredInscriptions !== 1 ? 's' : ''})`}</p>
            </div>
            <div className="flex gap-2">
              <RefreshButton onClick={fetchData} loading={loading} />
              {(user?.role === 'admin' || user?.role === 'dir') && (
                <button
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className={`${emailEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'} text-white px-3 py-2 rounded-lg shadow-lg transition duration-200 flex items-center gap-1 text-xs`}
                  title={emailEnabled ? "Emails activés - Cliquer pour désactiver" : "Emails désactivés - Cliquer pour activer"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{emailEnabled ? 'ON' : 'OFF'}</span>
                </button>
              )}
              <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition duration-200"><FaPlus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input type="text" placeholder="Rechercher un étudiant ou une formation..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition duration-150"><FaTimes className="w-3 h-3" /></button>}
          </div>
        </div>

        {/* FILTRES CENTRE / FORMATION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
          <div className="flex gap-2 w-full">
            {user?.role !== 'gerant' && (
              <select value={selectedCentre} onChange={(e) => { setSelectedCentre(e.target.value); setCurrentPage(1); }} className="p-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">Tous les centres</option>
                {centres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            )}
            <select value={selectedFormation} onChange={(e) => { setSelectedFormation(e.target.value); setCurrentPage(1); }} className="p-2 border border-gray-300 rounded-lg text-sm bg-white flex-1">
              <option value="">Toutes les formations</option>
              {formations.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
            {(selectedCentre || selectedFormation) && (
              <button onClick={() => { setSelectedCentre(user && user.role === 'gerant' ? user.centre_id || '' : ''); setSelectedFormation(''); setCurrentPage(1); }} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm">Effacer</button>
            )}
          </div>
        </div>

        {/* FORMULAIRE MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-semibold text-gray-800">Nouvelle Inscription</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700"><FaTimes className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-3 space-y-3">
                {/* DROPDOWN ÉTUDIANT */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Étudiant</label>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <input type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer text-sm" placeholder="Rechercher un étudiant..." value={searchEtudiant} onChange={(e) => setSearchEtudiant(e.target.value)} onFocus={() => setDropdownEtudiant(true)} />
                  </div>
                  {dropdownEtudiant && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      {etudiantsFiltresForm.map(etudiant => (
                        <div key={etudiant.id} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0" onClick={() => selectEtudiant(etudiant)}>
                          <div className="font-medium text-gray-900 text-sm">{etudiant.nom} {etudiant.prenom}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* DROPDOWN FORMATION */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Formation</label>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <input type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer text-sm" placeholder="Rechercher une formation..." value={searchFormation} onChange={(e) => setSearchFormation(e.target.value)} onFocus={() => setDropdownFormation(true)} />
                  </div>
                  {dropdownFormation && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      {formationsFiltrees.map(formation => (
                        <div key={formation.id} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0" onClick={() => selectFormation(formation)}>
                          <div className="font-medium text-gray-900 text-sm">{formation.nom}</div>
                          <div className="text-xs text-gray-500">{formation.duree} mois • {formation.frais_mensuel?.toLocaleString()} Ar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* DATE */}
                {user?.role !== 'gerant' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" value={formData.date_inscription} onChange={e => setFormData({ ...formData, date_inscription: e.target.value })} />
                  </div>
                )}
                <button onClick={handleCreate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded-lg font-medium transition duration-200 text-sm">{loading ? "Création..." : "Créer l'inscription"}</button>
              </div>
            </div>
          </div>
        )}

        {/* DETAILS INSCRIPTION MODAL */}
        {selectedInscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[95vh] overflow-y-auto">
              <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-semibold text-gray-800">{selectedInscription.etudiants.nom} {selectedInscription.etudiants.prenom}</h2>
                    {/* Modification de formation (Admin seulement) */}
                    {isEditingFormation ? (
                      <div className="mt-1 flex items-center gap-2">
                        <select
                          value={newFormationId}
                          onChange={(e) => setNewFormationId(e.target.value)}
                          className="text-xs border border-gray-300 rounded p-1 max-w-[200px]"
                        >
                          {formations.map(f => (
                            <option key={f.id} value={f.id}>{f.nom}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleUpdateFormation}
                          disabled={processingButtons.includes('update-formation')}
                          className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                          title="Enregistrer"
                        >
                          {processingButtons.includes('update-formation') ? <FaSpinner className="animate-spin w-3 h-3" /> : <FaCheckCircle className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setIsEditingFormation(false)}
                          className="bg-gray-400 text-white p-1 rounded hover:bg-gray-500"
                          title="Annuler"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-gray-600 text-xs">{selectedInscription.formations.nom}</p>
                        {(user?.role === 'admin' || user?.role === 'dir') && (
                          <button
                            onClick={() => {
                              setNewFormationId(selectedInscription.formation_id);
                              setIsEditingFormation(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Modifier la formation"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        )}
                      </div>
                    )}
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${selectedInscription.statut === 'actif' ? 'bg-blue-100 text-blue-800' : selectedInscription.statut === 'quitte' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {selectedInscription.statut === 'actif' ? 'Actif' : selectedInscription.statut === 'quitte' ? 'Quitté' : 'Terminé'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {user?.role !== 'gerant' && (
                      <button onClick={() => handleDelete(selectedInscription.id)} className="text-red-600 hover:text-red-800 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    )}
                    <button onClick={() => { setSelectedInscription(null); setSelectedMonths(new Set()); setIsEditingFormation(false); }} className="text-gray-500 hover:text-gray-700"><FaTimes className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* DROITS D'INSCRIPTION - VERSION SIMPLIFIÉE */}
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center"><FaMoneyBillWave className="mr-1 text-yellow-600" />Droits d'Inscription</h3>
                  </div>
                  {(studentsWithDroits.has(selectedInscription.etudiant_id) || selectedInscription.droits_inscription_paye) ? (
                    (() => {
                      const paiementDroits = paiements.find(p => p.inscription_id === selectedInscription.id && p.type_paiement === 'droits');
                      return (
                        <div>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            ✓ Payé {paiementDroits?.montant ? `(${paiementDroits.montant.toLocaleString()} Ar)` : ''}
                          </span>
                          {paiementDroits?.date_paiement && (
                            <p className="text-xs text-gray-500 mt-1">Date: {new Date(paiementDroits.date_paiement).toLocaleDateString('fr-FR')}</p>
                          )}
                        </div>
                      );
                    })()
                  ) : canPayStudent(selectedInscription.etudiants) && selectedInscription.statut !== 'fini' && selectedInscription.statut !== 'quitte' ? (
                    (() => {
                      const key = `droits-${selectedInscription.id}`;
                      const processing = processingButtons.includes(key);
                      const montantDroits = getMontantDroits();

                      return (
                        <div className="space-y-2">
                          {/* Champ de date pour admin */}
                          {(user?.role === 'admin' || user?.role === 'dir') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1 admin-label">Date de paiement</label>
                              <input
                                type="date"
                                value={datePaiementDroits}
                                onChange={(e) => setDatePaiementDroits(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm date-input-admin"
                              />
                            </div>
                          )}

                          <div className="text-center p-2 bg-white border border-yellow-200 rounded">
                            <div className="text-xs text-gray-600 mb-1">Montant des droits</div>
                            <div className="text-xl font-bold text-yellow-700">{montantDroits.toLocaleString()} Ar</div>
                          </div>
                          <button
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded font-medium transition duration-200 flex items-center justify-center disabled:opacity-50"
                            onClick={async () => {
                              startProcessing(key);
                              try {
                                // Pour admin, utiliser la date choisie, sinon date du jour
                                const dateAPayer = (user?.role === 'admin' || user?.role === 'dir') ? datePaiementDroits : null;
                                await payerDroitsSimple(selectedInscription, dateAPayer);
                                // Réinitialiser la date après paiement
                                if (user?.role === 'admin' || user?.role === 'dir') {
                                  setDatePaiementDroits(new Date().toISOString().split('T')[0]);
                                }
                              } finally {
                                stopProcessing(key);
                              }
                            }}
                            disabled={processing}
                          >
                            {processing ? <FaSpinner className="animate-spin mr-2" /> : null}
                            Payer les droits
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs">Non payé (Statut: {selectedInscription.statut})</span>
                  )}
                </div>

                {/* MENSUALITÉS */}
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center"><FaMoneyBillWave className="mr-1 text-blue-600" />Mensualités</h3>
                    {selectedMonths.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700">{selectedMonths.size} mois sélec.</span>
                        <button
                          onClick={payerPlusieursMois}
                          disabled={processingButtons.includes('batch-payment')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center shadow-sm"
                        >
                          {processingButtons.includes('batch-payment') ? <FaSpinner className="animate-spin mr-1" /> : null}
                          Payer tout
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {generateMoisFormation(selectedInscription.date_inscription, selectedInscription.formations.duree).map((mois, index) => {
                      const paiementsCeMois = paiements.filter(p => {
                        const pMoisNorm = (p.mois_paye || '').trim().toLowerCase();
                        const moisNorm = mois.trim().toLowerCase();
                        let match = pMoisNorm === moisNorm && p.inscription_id === selectedInscription.id && p.type_paiement === 'formation';

                        // RETRO-COMPATIBILITÉ
                        if (!match && mois.startsWith("Frais de formation")) {
                          const start = new Date(selectedInscription.date_inscription);
                          const months = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
                          const moisStandard = `${months[start.getMonth()]} ${start.getFullYear()}`;
                          if (pMoisNorm === moisStandard.toLowerCase() && p.inscription_id === selectedInscription.id && p.type_paiement === 'formation') {
                            match = true;
                          }
                        }
                        return match;
                      });
                      const totalPaye = paiementsCeMois.reduce((sum, p) => sum + (p.montant || 0), 0);
                      const fraisMensuel = selectedInscription.formations.frais_mensuel || 0;
                      const resteAPayer = Math.max(0, fraisMensuel - totalPaye);
                      const estPaye = resteAPayer === 0;
                      const estPartiel = totalPaye > 0 && totalPaye < fraisMensuel;
                      const key = `paiement-${selectedInscription.id}-${mois}`;
                      const processing = processingButtons.includes(key);

                      return (
                        <div key={index} className="bg-white border border-gray-200 rounded p-2">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              {!estPaye && canPayStudent(selectedInscription.etudiants) && selectedInscription.statut !== 'fini' && selectedInscription.statut !== 'quitte' && (
                                <input
                                  type="checkbox"
                                  checked={selectedMonths.has(mois)}
                                  onChange={() => toggleMonthSelection(mois, resteAPayer)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                />
                              )}
                              <span className="text-sm font-medium text-gray-700">{mois}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${estPaye ? 'bg-green-100 text-green-800' : estPartiel ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {estPaye ? 'Payé' : estPartiel ? `Reste: ${resteAPayer.toLocaleString()} Ar` : 'Non payé'}
                            </span>
                          </div>

                          {/* Affichage des dates de paiement si payé */}
                          {estPaye || estPartiel ? (
                            <div className="text-xs text-gray-500 mb-2">
                              {paiementsCeMois.map((p, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{p.montant.toLocaleString()} Ar</span>
                                  <span>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div className={`h-1.5 rounded-full ${estPaye ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min((totalPaye / fraisMensuel) * 100, 100)}%` }}></div>
                          </div>
                          {!estPaye && canPayStudent(selectedInscription.etudiants) && selectedInscription.statut !== 'fini' && selectedInscription.statut !== 'quitte' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  id={`montant-${key}`}
                                  defaultValue={resteAPayer}
                                  className="w-24 p-1 border border-gray-300 rounded text-xs"
                                  placeholder="Montant"
                                />

                                {/* Champ de date pour admin */}
                                {(user?.role === 'admin' || user?.role === 'dir') && (
                                  <input
                                    type="date"
                                    id={`date-${key}`}
                                    defaultValue={datePaiementMensualite}
                                    onChange={(e) => setDatePaiementMensualite(e.target.value)}
                                    className="p-1 border border-gray-300 rounded text-xs w-28 date-input-admin"
                                  />
                                )}

                                <button
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                  onClick={async () => {
                                    const input = document.getElementById(`montant-${key}`);
                                    const montant = parseInt(input.value);
                                    if (!montant || montant <= 0) return;

                                    // Pour admin, utiliser la date choisie, sinon date du jour
                                    let dateAPayer = null;
                                    if (user?.role === 'admin' || user?.role === 'dir') {
                                      dateAPayer = datePaiementMensualite;
                                    }

                                    startProcessing(key);
                                    try {
                                      const success = await payerMois(selectedInscription, mois, montant, dateAPayer);
                                      if (success) {
                                        setTimeout(() => fetchData(), 500);
                                      }
                                    } finally {
                                      stopProcessing(key);
                                    }
                                  }}
                                  disabled={processing}
                                >
                                  {processing ? <FaSpinner className="animate-spin mr-1" /> : null} Payer
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LIVRES DE LA FORMATION */}
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center"><FaBook className="mr-1 text-indigo-600" />Livres ({livresFormation ? livresFormation.length : 0})</h3>
                    {loadingLivres && <div className="text-xs text-gray-500">Chargement...</div>}
                  </div>

                  {/* Champ de date pour admin */}
                  {(user?.role === 'admin' || user?.role === 'dir') && (livresFormation && livresFormation.some(l => !l.achete)) && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1 admin-label">Date de paiement (Livres)</label>
                      <input
                        type="date"
                        value={datePaiementLivre}
                        onChange={(e) => setDatePaiementLivre(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm date-input-admin"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {(!livresFormation || livresFormation.length === 0) ? (
                      <div className="text-xs text-gray-500">Aucun livre pour cette formation</div>
                    ) : (
                      livresFormation.map(l => {
                        const key = `livre-${selectedInscription.id}-${l.id}`;
                        const processing = processingButtons.includes(key);
                        return (
                          <div key={l.id} className="bg-white border border-gray-200 rounded p-2 flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-700">{l.nom}</div>
                              <div className="text-xs text-gray-500">{(Number(l.prix) || 0).toLocaleString()} Ar</div>
                            </div>
                            <div className="text-right">
                              {l.achete ? (
                                <div className="text-xs text-green-700">✓ Acheté{l.date_achat ? ` (${new Date(l.date_achat).toLocaleDateString('fr-FR')})` : ''}</div>
                              ) : (
                                <button
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs flex items-center"
                                  onClick={async () => {
                                    startProcessing(key);
                                    try {
                                      const dateAPayer = (user?.role === 'admin' || user?.role === 'dir') ? datePaiementLivre : null;
                                      await payerLivre(selectedInscription, l, dateAPayer);
                                    } finally {
                                      stopProcessing(key);
                                    }
                                  }}
                                  disabled={processing}
                                >
                                  {processing ? <FaSpinner className="animate-spin mr-1" /> : null} Payer
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* STATUT INSCRIPTION */}
                <div className="bg-gray-50 rounded p-3">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center"><FaGraduationCap className="mr-1 text-blue-600" />Statut de l'Inscription</h3>
                  <div className="flex gap-2">
                    {['actif', 'quitte', 'fini'].map(statut => {
                      const key = `statut-${selectedInscription.id}-${statut}`;
                      const processing = processingButtons.includes(key);
                      const isCurrent = selectedInscription.statut === statut;
                      const isFinished = selectedInscription.statut === 'fini';
                      const isFiniButton = statut === 'fini';
                      return (
                        <button
                          key={statut}
                          className={`px-3 py-1 rounded text-xs font-medium transition duration-200 flex items-center justify-center min-w-[60px] ${isCurrent ? 'bg-blue-600 text-white' : isFinished || isFiniButton ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          onClick={async () => {
                            if (isCurrent || isFinished || isFiniButton) return;
                            startProcessing(key);
                            try {
                              const res = await fetch(`${API_BASE}/inscriptions/${selectedInscription.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ statut })
                              });
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err.error || err.message || 'Erreur serveur');
                              }
                              // Mettre à jour immédiatement l'état local pour refléter le changement
                              setInscriptions(prev => prev.map(i => i.id === selectedInscription.id ? { ...i, statut } : i));
                              setSelectedInscription(prev => prev ? { ...prev, statut } : prev);
                              showValidationMessage('success', `Statut changé en ${statut}`);
                              // Garder fetchData pour synchroniser côté serveur si besoin
                              setTimeout(() => fetchData(), 500);
                            } catch (error) {
                              console.error('Erreur:', error);
                              showValidationMessage('error', 'Erreur lors du changement de statut');
                            } finally {
                              stopProcessing(key);
                            }
                          }}
                          disabled={processing || isFinished || isFiniButton}
                          title={isFinished ? 'Impossible de changer le statut d\'une formation terminée' : isFiniButton ? 'Le statut "Terminé" est défini automatiquement' : ''}
                        >
                          {processing ? <FaSpinner className="animate-spin mr-1" /> : null} {statut === 'actif' ? 'Actif' : statut === 'quitte' ? 'Quitté' : 'Terminé'}
                        </button>
                      );
                    })}
                  </div>
                  {selectedInscription.statut === 'fini' && <p className="text-xs text-gray-500 mt-2">⚠️ Le statut "Terminé" est définitif et ne peut plus être modifié</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LISTE DES ÉTUDIANTS */}
        <div className="space-y-2">
          {currentEtudiants.map((etudiantGroup) => (
            <div key={etudiantGroup.etudiant.id} className="bg-white rounded-lg shadow-xs border border-gray-200">
              {/* EN-TÊTE ÉTUDIANT */}
              <div className="p-3 cursor-pointer hover:bg-gray-50 transition duration-150" onClick={() => toggleStudentExpansion(etudiantGroup.etudiant.id)}>
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-800">{etudiantGroup.etudiant.nom} {etudiantGroup.etudiant.prenom}</h3>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${etudiantGroup.globalStatus === 'actif' ? 'bg-green-100 text-green-800' : etudiantGroup.globalStatus === 'quitte' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{etudiantGroup.globalStatus || 'Non défini'}</span>
                    </div>
                    <p className="text-gray-600 text-xs">
                      {etudiantGroup.inscriptions.length} formation{etudiantGroup.inscriptions.length !== 1 ? 's' : ''}
                      {etudiantGroup.inscriptions.length > 1 && <span className="ml-1">({etudiantGroup.activeFormations} actif{etudiantGroup.activeFormations !== 1 ? 's' : ''}, {etudiantGroup.finishedFormations} terminé{etudiantGroup.finishedFormations !== 1 ? 's' : ''}, {etudiantGroup.quitFormations} quitté{etudiantGroup.quitFormations !== 1 ? 's' : ''})</span>}
                    </p>
                  </div>

                  {/* DROITS D'INSCRIPTION AFFICHÉS DIRECTEMENT */}
                  <div className="flex flex-col items-end gap-1">

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{expandedStudents.has(etudiantGroup.etudiant.id) ? <FaChevronUp /> : <FaChevronDown />}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORMATIONS (AFFICHÉES SI EXPANDÉ) */}
              {expandedStudents.has(etudiantGroup.etudiant.id) && (
                <div className="border-t border-gray-200">
                  {etudiantGroup.inscriptions.map((inscription) => (
                    <div key={inscription.id} className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition duration-150 cursor-pointer" onClick={() => {
                      setSelectedInscription(inscription);
                      // Réinitialiser les dates pour cette inscription
                      if (user?.role === 'admin' || user?.role === 'dir') {
                        setDatePaiementDroits(new Date().toISOString().split('T')[0]);
                        setDatePaiementMensualite(new Date().toISOString().split('T')[0]);
                        setDatePaiementLivre(new Date().toISOString().split('T')[0]);
                      }
                    }}>
                      <div className="flex justify-between items-start bg-blue-200">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 mb-1">{inscription.formations.nom}</h4>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${(studentsWithDroits.has(inscription.etudiant_id) || inscription.droits_inscription_paye) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {(studentsWithDroits.has(inscription.etudiant_id) || inscription.droits_inscription_paye) ? '✓ Droits payés' : '! Droits impayés'}
                            </span>
                            <span className="text-xs text-gray-500">{inscription.formations.duree} mois</span>
                          </div>
                          <p className="text-gray-600 text-xs">Inscrit le {new Date(inscription.date_inscription).toLocaleDateString('fr-FR')}</p>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${inscription.statut === 'actif' ? 'bg-blue-100 text-blue-800' : inscription.statut === 'quitte' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                              {inscription.statut === 'actif' ? 'Actif' : inscription.statut === 'quitte' ? 'Quitté' : 'Terminé'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500 ml-2">
                          <div className="text-purple-600 font-medium">{inscription.formations.frais_mensuel?.toLocaleString()} Ar/mois</div>
                          {/* Bouton rapide pour payer les droits si non payés */}
                          {!(studentsWithDroits.has(inscription.etudiant_id) || inscription.droits_inscription_paye) &&
                            canPayStudent(etudiantGroup.etudiant) &&
                            inscription.statut === 'actif' && (
                              <button
                                className="mt-1 -yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs transition duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInscription(inscription);
                                  // Réinitialiser les dates bgpour cette inscription
                                  if (user?.role === 'admin' || user?.role === 'dir') {
                                    setDatePaiementDroits(new Date().toISOString().split('T')[0]);
                                    setDatePaiementMensualite(new Date().toISOString().split('T')[0]);
                                    setDatePaiementLivre(new Date().toISOString().split('T')[0]);
                                  }
                                }}
                              >
                                Payer droits
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600">Page {currentPage} sur {totalPages} • {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, etudiantsFiltres.length)} sur {etudiantsFiltres.length}</div>
            <div className="flex space-x-1">
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="px-2 py-1 border border-gray-300 rounded text-xs bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Précédent</button>
              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="px-2 py-1 border border-gray-300 rounded text-xs bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Suivant</button>
            </div>
          </div>
        )}

        {/* ÉTAT VIDE */}
        {!loading && etudiantsFiltres.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2"><svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">{searchTerm ? "Aucun résultat" : "Aucune inscription"}</h3>
            <p className="text-gray-500 text-xs mb-3">{searchTerm ? "Aucun étudiant ne correspond à votre recherche" : "Appuyez sur + pour créer une inscription"}</p>
            {searchTerm && <button onClick={() => setSearchTerm('')} className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium text-xs"><FaTimes className="mr-1" />Effacer la recherche</button>}
          </div>
        )}

        {/* INDICATEUR DE CHARGEMENT */}
        {loading && <div className="fixed bottom-3 right-3 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs">Chargement...</div>}

        <style jsx>{`
          @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fade-in 0.3s ease-out; }
          
          .date-input-admin {
            border-color: #4f46e5;
            background-color: #f8fafc;
          }
          
          .admin-label {
            color: #4f46e5;
            font-weight: 600;
          }
        `}</style>
      </div>
    </div>
  );
};

export default Inscriptions;