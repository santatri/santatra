import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from '../context/authContext';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSearch, FaUndo, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { API_URL } from '../config';

// Composant réutilisable : champ de recherche avec suggestions (amélioré)
const SearchableSelect = ({ options, value, onChange, placeholder, required = false }) => {
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const opt = options.find(o => o.value === value);
    return opt ? opt.label : '';
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const handleSelect = (opt) => {
    onChange(opt.value);
    setSearch(opt.label);
    setShowSuggestions(false);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    setShowSuggestions(true);
    if (e.target.value === '') {
      onChange('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value && selectedLabel && !search) {
      setSearch(selectedLabel);
    }
  }, [value, selectedLabel, search]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition shadow-sm bg-white/50 backdrop-blur-sm"
        required={required}
        autoComplete="off"
      />
      {showSuggestions && filteredOptions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto backdrop-blur-sm">
          {filteredOptions.map(opt => (
            <li
              key={opt.value}
              onClick={() => handleSelect(opt)}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm transition-colors"
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
      {showSuggestions && filteredOptions.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-500">
          Aucun résultat
        </div>
      )}
    </div>
  );
};

const Examen = () => {
  const [examens, setExamens] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPaiementForm, setShowPaiementForm] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [editingPaiementId, setEditingPaiementId] = useState(null);
  const [editPaiementDate, setEditPaiementDate] = useState("");
  const [activeTab, setActiveTab] = useState('paiements');
  const [showFilters, setShowFilters] = useState(false); // pour mobile
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    nom: '',
    montant: '',
    session: '',
    date_examen: ''
  });

  const [paiementData, setPaiementData] = useState({
    inscription_id: '',
    examen_id: '',
    date_paiement: ''
  });

  // Initialiser la date du jour quand le formulaire de paiement s'ouvre
  useEffect(() => {
    if (showPaiementForm) {
      const today = new Date().toISOString().split('T')[0];
      setPaiementData(prev => ({ ...prev, date_paiement: today }));
    }
  }, [showPaiementForm]);

  // ========== FILTRES ET PAGINATION ==========
  const [examenFilterNom, setExamenFilterNom] = useState('');
  const [examenFilterSession, setExamenFilterSession] = useState('');
  const [examenCurrentPage, setExamenCurrentPage] = useState(1);
  const examenItemsPerPage = 20;

  const [paiementFilterEtudiant, setPaiementFilterEtudiant] = useState('');
  const [paiementFilterCentre, setPaiementFilterCentre] = useState('');
  const [paiementFilterFormation, setPaiementFilterFormation] = useState('');
  const [paiementFilterExamenId, setPaiementFilterExamenId] = useState('');
  const [paiementDateDebut, setPaiementDateDebut] = useState('');
  const [paiementDateFin, setPaiementDateFin] = useState('');
  const [paiementCurrentPage, setPaiementCurrentPage] = useState(1);
  const paiementItemsPerPage = 20;

  // ===================== Fetch =====================
  const fetchExamens = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/examens`);
      const data = await res.json();
      setExamens(data.data || data);
    } catch (error) {
      console.error(error);
      setMessage('Erreur lors du chargement des examens');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaiements = async () => {
    try {
      const res = await fetch(`${API_URL}/api/examens/paiements`);
      const data = await res.json();
      setPaiements(data.data || data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchInscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/inscriptions?limit=1000`);
      const data = await res.json();
      let allInscriptions = data.data || [];
      if (user && user.role === 'gerant') {
        allInscriptions = allInscriptions.filter(ins => ins.etudiants && ins.etudiants.centre_id === user.centre_id);
      }
      setInscriptions(allInscriptions);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchExamens();
    fetchPaiements();
    fetchInscriptions();
  }, []);

  // ===================== Handlers =====================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaiementChange = (field, value) => {
    setPaiementData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (examen) => {
    setFormData({
      nom: examen.nom,
      montant: examen.montant,
      session: examen.session,
      date_examen: examen.date_examen
    });
    setEditingId(examen.id);
    setShowForm(true);
    setActiveTab('examens');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nom || !formData.montant || !formData.date_examen) {
      setMessage('Tous les champs sont requis');
      return;
    }
    try {
      setLoadingAction(true);
      const payload = {
        nom: formData.nom,
        montant: parseFloat(formData.montant),
        session: formData.session,
        date_examen: formData.date_examen
      };
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `${API_URL}/api/examens/${editingId}` 
        : `${API_URL}/api/examens`;

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setMessage(editingId ? 'Examen mis à jour' : 'Examen créé');
      setFormData({ nom: '', montant: '', session: '', date_examen: '' });
      setEditingId(null);
      setShowForm(false);
      fetchExamens();
    } catch (error) {
      console.error(error);
      setMessage('Erreur lors de l\'opération');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet examen ?')) return;
    try {
      setLoadingAction(true);
      await fetch(`${API_URL}/api/examens/${id}`, { method: 'DELETE' });
      setMessage('Examen supprimé');
      fetchExamens();
    } catch (error) {
      console.error(error);
      setMessage('Erreur suppression');
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePaiementSubmit = async (e) => {
    e.preventDefault();
    if (!paiementData.inscription_id || !paiementData.examen_id || !paiementData.date_paiement) {
      setMessage('Tous les champs de paiement sont requis');
      return;
    }
    const dejaPaye = paiements.some(p => p.inscription_id === parseInt(paiementData.inscription_id) && p.examen_id === parseInt(paiementData.examen_id));
    if (dejaPaye) {
      setMessage('Ce droit d\'examen a déjà été payé pour cette inscription.');
      return;
    }
    try {
      setLoadingAction(true);
      const response = await fetch(`${API_URL}/api/examens/paiements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscription_id: parseInt(paiementData.inscription_id),
          examen_id: parseInt(paiementData.examen_id),
          date_paiement: paiementData.date_paiement,
          send_email: true
        })
      });
      if (!response.ok) {
        const err = await response.json();
        setMessage(err.error || 'Erreur lors de l\'enregistrement du paiement');
        return;
      }
      setMessage('Paiement enregistré');
      setPaiementData({ inscription_id: '', examen_id: '', date_paiement: '' });
      setShowPaiementForm(false);
      fetchPaiements();
    } catch (error) {
      console.error(error);
      setMessage('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setLoadingAction(false);
    }
  };

  // ========== FILTRES ET PAGINATION (EXAMENS) ==========
  const examenSessions = useMemo(() => {
    const sessions = examens.map(e => e.session).filter(Boolean);
    return [...new Set(sessions)];
  }, [examens]);

  const filteredExamens = useMemo(() => {
    return examens.filter(ex => {
      if (examenFilterNom && !ex.nom.toLowerCase().includes(examenFilterNom.toLowerCase())) return false;
      if (examenFilterSession && ex.session !== examenFilterSession) return false;
      return true;
    });
  }, [examens, examenFilterNom, examenFilterSession]);

  const totalExamenPages = Math.ceil(filteredExamens.length / examenItemsPerPage);
  const paginatedExamens = useMemo(() => {
    const start = (examenCurrentPage - 1) * examenItemsPerPage;
    return filteredExamens.slice(start, start + examenItemsPerPage);
  }, [filteredExamens, examenCurrentPage, examenItemsPerPage]);

  useEffect(() => {
    setExamenCurrentPage(1);
  }, [examenFilterNom, examenFilterSession]);

  // ========== FILTRES ET PAGINATION (PAIEMENTS) ==========
  const centresList = useMemo(() => {
    const centres = paiements.map(p => p.centre_nom).filter(Boolean);
    return [...new Set(centres)];
  }, [paiements]);

  const formationsList = useMemo(() => {
    const formations = paiements.map(p => p.formation_nom).filter(Boolean);
    return [...new Set(formations)];
  }, [paiements]);

  const filteredPaiements = useMemo(() => {
    return paiements.filter(p => {
      if (paiementFilterEtudiant) {
        const fullName = `${p.etudiant_nom} ${p.etudiant_prenom}`.toLowerCase();
        if (!fullName.includes(paiementFilterEtudiant.toLowerCase())) return false;
      }
      if (paiementFilterCentre && p.centre_nom !== paiementFilterCentre) return false;
      if (paiementFilterFormation && p.formation_nom !== paiementFilterFormation) return false;
      if (paiementFilterExamenId && p.examen_id !== parseInt(paiementFilterExamenId)) return false;
      if (paiementDateDebut && new Date(p.date_paiement) < new Date(paiementDateDebut)) return false;
      if (paiementDateFin && new Date(p.date_paiement) > new Date(paiementDateFin)) return false;
      return true;
    });
  }, [paiements, paiementFilterEtudiant, paiementFilterCentre, paiementFilterFormation, paiementFilterExamenId, paiementDateDebut, paiementDateFin]);

  const totalPaiementPages = Math.ceil(filteredPaiements.length / paiementItemsPerPage);
  const paginatedPaiements = useMemo(() => {
    const start = (paiementCurrentPage - 1) * paiementItemsPerPage;
    return filteredPaiements.slice(start, start + paiementItemsPerPage);
  }, [filteredPaiements, paiementCurrentPage, paiementItemsPerPage]);

  useEffect(() => {
    setPaiementCurrentPage(1);
  }, [paiementFilterEtudiant, paiementFilterCentre, paiementFilterFormation, paiementFilterExamenId, paiementDateDebut, paiementDateFin]);

  const resetPaiementFilters = () => {
    setPaiementFilterEtudiant('');
    setPaiementFilterCentre('');
    setPaiementFilterFormation('');
    setPaiementFilterExamenId('');
    setPaiementDateDebut('');
    setPaiementDateFin('');
  };

  // Options pour les SearchableSelect
  const inscriptionOptions = useMemo(() => {
    return inscriptions.map(ins => ({
      value: ins.id,
      label: `${ins.id} - ${ins.etudiants?.nom || ''} ${ins.etudiants?.prenom || ''} / ${ins.formations?.nom || ''}`
    }));
  }, [inscriptions]);

  const examenOptions = useMemo(() => {
    return examens.map(ex => ({
      value: ex.id,
      label: `${ex.nom} (${ex.session || '?'}) - ${parseFloat(ex.montant).toLocaleString('fr-FR')} Ar`
    }));
  }, [examens]);

  const centreOptions = useMemo(() => {
    return centresList.map(c => ({ value: c, label: c }));
  }, [centresList]);

  const formationOptions = useMemo(() => {
    return formationsList.map(f => ({ value: f, label: f }));
  }, [formationsList]);

  const sessionOptions = useMemo(() => {
    return examenSessions.map(s => ({ value: s, label: s }));
  }, [examenSessions]);

  // Calcul du total des montants des paiements (tableau de bord)
  const totalMontantPaiements = useMemo(() => {
    return filteredPaiements.reduce((sum, p) => {
      const montant = examens.find(e => e.id === p.examen_id)?.montant;
      return sum + (montant ? parseFloat(montant) : 0);
    }, 0);
  }, [filteredPaiements, examens]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 md:p-6">
      {/* En-tête avec titre et onglets */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Examens & Paiements</h1>
        
        <div className="flex border-b border-gray-200/80">
          <button
            onClick={() => setActiveTab('examens')}
            className={`py-2 px-4 font-medium text-sm md:text-base focus:outline-none transition-all relative ${
              activeTab === 'examens'
                ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 after:rounded-t-full'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Examens
          </button>
          <button
            onClick={() => setActiveTab('paiements')}
            className={`py-2 px-4 font-medium text-sm md:text-base focus:outline-none transition-all relative ${
              activeTab === 'paiements'
                ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 after:rounded-t-full'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Paiements
          </button>
        </div>
      </div>

      {/* Message flash */}
      {message && (
        <div className={`mb-4 p-4 rounded-xl text-sm flex items-center justify-between shadow-sm ${
          message.includes('Erreur') 
            ? 'bg-red-50 text-red-800 border border-red-200' 
            : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-gray-500 hover:text-gray-700 p-1">
            <FaTimes />
          </button>
        </div>
      )}

      {/* ========== ONGLET EXAMENS ========== */}
      {activeTab === 'examens' && (
        <div>
          {user && user.role === 'admin' && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-3 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <FaPlus /> <span>Nouvel examen</span>
              </button>
            </div>
          )}

          {user && user.role === 'admin' && showForm && (
            <div ref={formRef} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 mb-6 p-5 md:p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingId ? 'Modifier l\'examen' : 'Nouvel examen'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="Nom de l'examen"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/50"
                  required
                />
                <input
                  name="montant"
                  value={formData.montant}
                  onChange={handleInputChange}
                  placeholder="Montant (Ar)"
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/50"
                  required
                />
                <input
                  name="session"
                  value={formData.session}
                  onChange={handleInputChange}
                  placeholder="Session (ex: 2025)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/50"
                />
                <input
                  name="date_examen"
                  value={formData.date_examen}
                  onChange={handleInputChange}
                  type="date"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/50"
                  required
                />
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loadingAction}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {loadingAction ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtres examens */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200 p-4 mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-between w-full text-left font-medium text-gray-700"
            >
              <span className="flex items-center gap-2"><FaSearch className="text-gray-400" /> Filtrer les examens</span>
              {showFilters ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            <div className={`${showFilters ? 'block' : 'hidden'} md:block mt-3 md:mt-0`}>
              <h3 className="hidden md:flex font-medium text-gray-700 mb-3 items-center gap-2">
                <FaSearch className="text-gray-400" /> Filtrer les examens
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Rechercher par nom"
                  value={examenFilterNom}
                  onChange={(e) => setExamenFilterNom(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/50"
                />
                <SearchableSelect
                  options={sessionOptions}
                  value={examenFilterSession}
                  onChange={setExamenFilterSession}
                  placeholder="Rechercher une session"
                />
              </div>
              <button
                onClick={() => { setExamenFilterNom(''); setExamenFilterSession(''); }}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <FaUndo /> Réinitialiser les filtres
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Liste des examens</h2>
            {filteredExamens.length === 0 ? (
              <p className="text-center py-8 text-gray-400 bg-white/80 rounded-2xl border border-gray-200">Aucun examen ne correspond aux filtres</p>
            ) : (
              paginatedExamens.map(examen => (
                <div
                  key={examen.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-900 text-lg">{examen.nom}</h4>
                    <p className="text-sm text-gray-600">
                      {examen.session} • {new Date(examen.date_examen).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-green-600 font-bold text-lg">{parseFloat(examen.montant).toLocaleString('fr-FR')} Ar</p>
                  </div>
                  {user && user.role === 'admin' && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleEdit(examen)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Modifier"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(examen.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors"
                        title="Supprimer"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {totalExamenPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button
                  onClick={() => setExamenCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={examenCurrentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  Précédent
                </button>
                <span className="text-sm text-gray-600">
                  Page {examenCurrentPage} sur {totalExamenPages}
                </span>
                <button
                  onClick={() => setExamenCurrentPage(prev => Math.min(prev + 1, totalExamenPages))}
                  disabled={examenCurrentPage === totalExamenPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== ONGLET PAIEMENTS ========== */}
      {activeTab === 'paiements' && (
        <div>
          {/* Tableau de bord admin : total montant */}
          {user && user.role === 'admin' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 shadow-sm">
              <span className="font-semibold text-blue-800 text-lg">Total encaissé (filtres actifs) :</span>
              <span className="font-bold text-2xl text-blue-900">{totalMontantPaiements.toLocaleString('fr-FR')} Ar</span>
            </div>
          )}
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowPaiementForm(!showPaiementForm)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-5 py-3 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <FaPlus /> <span>Nouveau paiement</span>
            </button>
          </div>

          {showPaiementForm && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 mb-6 p-5 md:p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Nouveau paiement</h3>
              <form onSubmit={handlePaiementSubmit} className="space-y-4">
                <SearchableSelect
                  options={inscriptionOptions}
                  value={paiementData.inscription_id}
                  onChange={(val) => handlePaiementChange('inscription_id', val)}
                  placeholder="Rechercher une inscription (ID, nom, formation...)"
                  required
                />
                <SearchableSelect
                  options={examenOptions}
                  value={paiementData.examen_id}
                  onChange={(val) => handlePaiementChange('examen_id', val)}
                  placeholder="Rechercher un examen"
                  required
                />
                <input
                  type="date"
                  name="date_paiement"
                  value={paiementData.date_paiement}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 cursor-not-allowed"
                  required
                />
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loadingAction}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {loadingAction ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaiementForm(false)}
                    className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtres paiements */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200 p-4 mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-between w-full text-left font-medium text-gray-700"
            >
              <span className="flex items-center gap-2"><FaSearch className="text-gray-400" /> Filtrer les paiements</span>
              {showFilters ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            <div className={`${showFilters ? 'block' : 'hidden'} md:block mt-3 md:mt-0`}>
              <h3 className="hidden md:flex font-medium text-gray-700 mb-3 items-center gap-2">
                <FaSearch className="text-gray-400" /> Filtrer les paiements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Étudiant (nom ou prénom)"
                  value={paiementFilterEtudiant}
                  onChange={(e) => setPaiementFilterEtudiant(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/50"
                />
                <SearchableSelect
                  options={centreOptions}
                  value={paiementFilterCentre}
                  onChange={setPaiementFilterCentre}
                  placeholder="Rechercher un centre"
                />
                <SearchableSelect
                  options={formationOptions}
                  value={paiementFilterFormation}
                  onChange={setPaiementFilterFormation}
                  placeholder="Rechercher une formation"
                />
                <SearchableSelect
                  options={examenOptions}
                  value={paiementFilterExamenId}
                  onChange={setPaiementFilterExamenId}
                  placeholder="Rechercher un examen"
                />
                <input
                  type="date"
                  placeholder="Date début"
                  value={paiementDateDebut}
                  onChange={(e) => setPaiementDateDebut(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/50"
                />
                <input
                  type="date"
                  placeholder="Date fin"
                  value={paiementDateFin}
                  onChange={(e) => setPaiementDateFin(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/50"
                />
              </div>
              <button
                onClick={resetPaiementFilters}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <FaUndo /> Réinitialiser les filtres
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-5">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Paiements des droits d'examen</h3>
            {filteredPaiements.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Aucun paiement ne correspond aux filtres</p>
            ) : (
              <>
                {/* Version Desktop : Tableau */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100/80 border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Étudiant</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Centre</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Formation</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Examen</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Session</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Date paiement</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Montant</th>
                        {user && user.role === 'admin' && <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPaiements.map((p, idx) => (
                        <tr key={p.id || idx} className="border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">{p.etudiant_nom} {p.etudiant_prenom}</td>
                          <td className="px-4 py-3">{p.centre_nom}</td>
                          <td className="px-4 py-3">{p.formation_nom}</td>
                          <td className="px-4 py-3">{examens.find(e => e.id === p.examen_id)?.nom || p.examen_id}</td>
                          <td className="px-4 py-3">{examens.find(e => e.id === p.examen_id)?.session || ''}</td>
                          <td className="px-4 py-3">
                            {editingPaiementId === p.id ? (
                              <input
                                type="date"
                                value={editPaiementDate}
                                onChange={e => setEditPaiementDate(e.target.value)}
                                className="border border-gray-200 rounded-lg px-2 py-1 w-32 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                              />
                            ) : (
                              p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : ''
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {examens.find(e => e.id === p.examen_id)?.montant
                              ? parseFloat(examens.find(e => e.id === p.examen_id).montant).toLocaleString('fr-FR') + ' Ar'
                              : ''}
                          </td>
                          {user && user.role === 'admin' && (
                            <td className="px-4 py-3">
                              {editingPaiementId === p.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    className="text-green-600 hover:text-green-800 font-medium"
                                    onClick={async () => {
                                      setLoadingAction(true);
                                      const resp = await fetch(`${API_URL}/api/examens/paiements/${p.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ date_paiement: editPaiementDate })
                                      });
                                      if (resp.ok) {
                                        setMessage('Paiement modifié');
                                        setEditingPaiementId(null);
                                        fetchPaiements();
                                      } else {
                                        const err = await resp.json();
                                        setMessage(err.error || 'Erreur modification paiement');
                                      }
                                      setLoadingAction(false);
                                    }}
                                  >
                                    Valider
                                  </button>
                                  <button
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={() => setEditingPaiementId(null)}
                                  >
                                    Annuler
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingPaiementId(p.id);
                                      setEditPaiementDate(p.date_paiement ? p.date_paiement.slice(0, 10) : "");
                                    }}
                                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                                    title="Modifier"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (window.confirm('Supprimer ce paiement ?')) {
                                        setLoadingAction(true);
                                        await fetch(`${API_URL}/api/examens/paiements/${p.id}`, { method: 'DELETE' });
                                        setMessage('Paiement supprimé');
                                        fetchPaiements();
                                        setLoadingAction(false);
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                    title="Supprimer"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Version Mobile : Cartes */}
                <div className="md:hidden space-y-3">
                  {paginatedPaiements.map((p, idx) => (
                    <div key={p.id || idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{p.etudiant_nom} {p.etudiant_prenom}</p>
                          <p className="text-xs text-gray-500">{p.centre_nom} • {p.formation_nom}</p>
                        </div>
                        {user && user.role === 'admin' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingPaiementId(p.id);
                                setEditPaiementDate(p.date_paiement ? p.date_paiement.slice(0, 10) : "");
                              }}
                              className="text-blue-600 p-2"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('Supprimer ce paiement ?')) {
                                  setLoadingAction(true);
                                  await fetch(`${API_URL}/api/examens/paiements/${p.id}`, { method: 'DELETE' });
                                  setMessage('Paiement supprimé');
                                  fetchPaiements();
                                  setLoadingAction(false);
                                }
                              }}
                              className="text-red-600 p-2"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Examen:</span>
                          <p className="font-medium">{examens.find(e => e.id === p.examen_id)?.nom || p.examen_id}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Session:</span>
                          <p>{examens.find(e => e.id === p.examen_id)?.session || ''}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Date paiement:</span>
                          {editingPaiementId === p.id ? (
                            <input
                              type="date"
                              value={editPaiementDate}
                              onChange={e => setEditPaiementDate(e.target.value)}
                              className="border border-gray-200 rounded-lg px-2 py-1 w-full text-sm"
                            />
                          ) : (
                            <p>{p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : ''}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500">Montant:</span>
                          <p className="font-bold text-green-600">
                            {examens.find(e => e.id === p.examen_id)?.montant
                              ? parseFloat(examens.find(e => e.id === p.examen_id).montant).toLocaleString('fr-FR') + ' Ar'
                              : ''}
                          </p>
                        </div>
                      </div>
                      {editingPaiementId === p.id && (
                        <div className="flex gap-2 mt-3">
                          <button
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm"
                            onClick={async () => {
                              setLoadingAction(true);
                              const resp = await fetch(`${API_URL}/api/examens/paiements/${p.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ date_paiement: editPaiementDate })
                              });
                              if (resp.ok) {
                                setMessage('Paiement modifié');
                                setEditingPaiementId(null);
                                fetchPaiements();
                              } else {
                                const err = await resp.json();
                                setMessage(err.error || 'Erreur modification paiement');
                              }
                              setLoadingAction(false);
                            }}
                          >
                            Valider
                          </button>
                          <button
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm"
                            onClick={() => setEditingPaiementId(null)}
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {totalPaiementPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-4">
                    <button
                      onClick={() => setPaiementCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={paiementCurrentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                    >
                      Précédent
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {paiementCurrentPage} sur {totalPaiementPages}
                    </span>
                    <button
                      onClick={() => setPaiementCurrentPage(prev => Math.min(prev + 1, totalPaiementPages))}
                      disabled={paiementCurrentPage === totalPaiementPages}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Examen;