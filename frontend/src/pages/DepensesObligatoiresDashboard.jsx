import { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { API_URL } from '../config';
import SearchableSelect from '../components/SearchableSelect';

export default function DepensesObligatoiresDashboard() {
  const [depensesCompare, setDepensesCompare] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ centre_id: "", montant: "", mois: "" });
  const [editId, setEditId] = useState(null);
  const [centres, setCentres] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filtreCentre, setFiltreCentre] = useState("");
  const [filtreMois, setFiltreMois] = useState("");
  const [activeCard, setActiveCard] = useState(null);

  // States for searchable filters
  const [showCentresDropdown, setShowCentresDropdown] = useState(false);
  const [searchCentreInput, setSearchCentreInput] = useState("");
  const [showMoisDropdown, setShowMoisDropdown] = useState(false);
  const [searchMoisInput, setSearchMoisInput] = useState("");

  // Pagination par mois
  const [moisPerPage] = useState(3);
  const [currentMoisPage, setCurrentMoisPage] = useState(1);
  const API_BASE = `${API_URL}/api`;

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'dir';
  const isGerant = user?.role === 'gerant';

  // Charger centres
  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const resp = await fetch(`${API_BASE}/centres`);
        if (!resp.ok) throw new Error('Erreur centres');
        const data = await resp.json();
        // If gerant, filter client-side
        const list = isGerant && user?.centre_id ? (data || []).filter(c => String(c.id) === String(user.centre_id)) : (data || []);
        setCentres(list);
      } catch (err) {
        console.error(err);
        setCentres([]);
      }
    };
    fetchCentres();
  }, [user, isGerant]);

  const calculerPourcentage = (montantTotal, montantOblig) => {
    if (montantOblig <= 0) return 0;
    const nbCaissex = Math.max(1, Math.ceil(montantTotal / montantOblig));
    return (montantTotal / (montantOblig * nbCaissex)) * 100;
  };

  // Fonction pour parser "Janvier 2026" ou "Janv 2026" en "2026-01"
  const parseMoisPaye = (moisPayeStr) => {
    if (!moisPayeStr) return null;
    const monthsMap = {
      // Formes complètes
      'janvier': '01',
      'février': '02',
      'fevrier': '02',
      'mars': '03',
      'avril': '04',
      'mai': '05',
      'juin': '06',
      'juillet': '07',
      'août': '08',
      'aout': '08',
      'septembre': '09',
      'octobre': '10',
      'novembre': '11',
      'décembre': '12',
      'decembre': '12',
      // Formes abrégées (comme reçues du backend)
      'janv': '01',
      'févr': '02',
      'fevr': '02',
      'fév': '02',
      'fev': '02',
      'avr': '04',
      'juil': '07',
      'sept': '09',
      'oct': '10',
      'nov': '11',
      'déc': '12',
      'dec': '12'
    };

    const parts = moisPayeStr.toLowerCase().trim().split(/\s+/);
    if (parts.length < 2) return null;

    const monthStr = parts[0];
    const yearStr = parts[1];
    const monthNum = monthsMap[monthStr];

    if (monthNum && yearStr && /^\d{4}$/.test(yearStr)) {
      return `${yearStr}-${monthNum}`;
    }
    return null;
  };

  // Charger données
  const fetchData = async () => {
    setLoading(true);
    try {
      // depenses_obligatoires
      const depObligResp = await fetch(`${API_BASE}/depenses_obligatoires${isGerant && user?.centre_id ? `?centre_id=${user.centre_id}` : ''}`);
      if (!depObligResp.ok) throw new Error('Erreur depenses_obligatoires');
      const depOblig = await depObligResp.json();

      // depenses
      const depensesResp = await fetch(`${API_BASE}/depenses`);
      if (!depensesResp.ok) throw new Error('Erreur depenses');
      const depenses = await depensesResp.json();

      // paiements (joined)
      const paiementsResp = await fetch(`${API_BASE}/paiements`);
      if (!paiementsResp.ok) throw new Error('Erreur paiements');
      const paiements = await paiementsResp.json();

      // etudiants
      const etudiantsResp = await fetch(`${API_BASE}/etudiants`);
      if (!etudiantsResp.ok) throw new Error('Erreur etudiants');
      const etudiants = await etudiantsResp.json();

      const etuMap = {};
      etudiants?.forEach((e) => { etuMap[e.id] = e.centre_id });
      const compareMap = {};

      depenses?.forEach((d) => {
        if (!d.date_depense) return;
        const mois = d.date_depense.slice(0, 7);
        const key = `${d.centre_id}-${mois}`;
        if (!compareMap[key]) compareMap[key] = { depensesTotal: 0, totalPaiements: 0 };
        compareMap[key].depensesTotal += Number(d.montant);
      });

      paiements?.forEach((p) => {
        const centre_id = etuMap[p.inscriptions?.etudiant_id];

        // 🔑 IMPORTANT: Utiliser mois_paye (le mois pour lequel on paie) 
        // au lieu de date_paiement (la date du paiement)
        let mois = null;
        if (p.mois_paye) {
          // p.mois_paye est au format "Janvier 2026" par exemple
          mois = parseMoisPaye(p.mois_paye);
        }
        // Fallback à la date de paiement si mois_paye n'existe pas
        if (!mois && p.date_paiement) {
          mois = p.date_paiement.slice(0, 7);
        }

        if (!mois || !centre_id) {
          return;
        }

        const key = `${centre_id}-${mois}`;
        if (!compareMap[key]) compareMap[key] = { depensesTotal: 0, totalPaiements: 0 };
        compareMap[key].totalPaiements += Number(p.montant);
      });

      const result = depOblig.map((dep) => {
        const key = `${dep.centre_id}-${dep.mois}`;
        const montantTotal = compareMap[key]?.totalPaiements || 0;
        const pourcentage = calculerPourcentage(montantTotal, dep.montant);

        const caissex = calculerRepartition(montantTotal, dep.montant);
        const fullCount = caissex.filter(c => c.estPlein).length;
        const sumNotFullPercent = caissex.filter(c => !c.estPlein).reduce((s, c) => s + (c.pourcentage || 0), 0);

        return {
          id: dep.id,
          centre: dep.centres?.nom,
          centre_id: dep.centre_id,
          mois: dep.mois,
          montantOblig: dep.montant,
          montantTotal,
          pourcentage,
          caissex,
          fullCount,
          sumNotFullPercent,
          created_at: dep.created_at
        };
      });

      const sortedResult = [...result].sort((a, b) => {
        if (a.mois > b.mois) return -1;
        if (a.mois < b.mois) return 1;
        if (a.pourcentage > b.pourcentage) return -1;
        if (a.pourcentage < b.pourcentage) return 1;
        if (a.created_at > b.created_at) return -1;
        if (a.created_at < b.created_at) return 1;
        return 0;
      });

      setDepensesCompare(sortedResult);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // CRUD Dépenses Obligatoires
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.centre_id || !form.montant || !form.mois) return;

    if (!isAdmin) {
      alert("❌ Seul l'administrateur peut effectuer cette action");
      return;
    }

    try {
      if (editId) {
        await fetch(`${API_BASE}/depenses_obligatoires/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ centre_id: parseInt(form.centre_id), montant: parseFloat(form.montant) })
        });
        setEditId(null);
      } else {
        const moisActuel = new Date().toISOString().slice(0, 7);
        await fetch(`${API_BASE}/depenses_obligatoires`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ centre_id: parseInt(form.centre_id), montant: parseFloat(form.montant), mois: moisActuel })
        });
      }
      setForm({ centre_id: "", montant: "", mois: "" });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert("❌ Seul l'administrateur peut effectuer cette action");
      return;
    }

    if (!confirm("Voulez-vous vraiment supprimer cette dépense obligatoire ?")) return;
    await fetch(`${API_BASE}/depenses_obligatoires/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleEdit = (dep) => {
    if (!isAdmin) {
      alert("❌ Seul l'administrateur peut modifier les données");
      return;
    }

    setForm({
      centre_id: dep.centre_id.toString(),
      montant: dep.montantOblig.toString(),
      mois: dep.mois
    });
    setEditId(dep.id);
    setShowForm(true);
  };

  const calculerRepartition = (montantTotal, reference) => {
    const caissex = [];
    let reste = montantTotal;
    let index = 1;

    while (reste > 0 && index <= 8) {
      const valeurcaisse = Math.min(reste, reference);
      const pourcentage = (valeurcaisse / reference) * 100;

      caissex.push({
        numero: index,
        valeur: valeurcaisse,
        estPlein: valeurcaisse === reference,
        pourcentage: pourcentage
      });
      reste -= valeurcaisse;
      index++;
    }

    return caissex;
  };

  const reinitialiserFiltres = () => {
    setFiltreCentre("");
    setFiltreMois("");
    setSearchCentreInput("");
    setSearchMoisInput("");
    setShowFilters(false);
  };

  // Grouper par mois
  const depensesParMois = depensesCompare.reduce((acc, dep) => {
    if (!acc[dep.mois]) {
      acc[dep.mois] = [];
    }

    const correspondCentre = !filtreCentre || dep.centre_id.toString() === filtreCentre;
    const correspondMois = !filtreMois || dep.mois === filtreMois;

    if (correspondCentre && correspondMois) {
      acc[dep.mois].push(dep);
    }

    return acc;
  }, {});

  Object.keys(depensesParMois).forEach(mois => {
    depensesParMois[mois].sort((a, b) => {
      // 1) Plus grand nombre de caisses entièrement remplies
      if ((a.fullCount || 0) > (b.fullCount || 0)) return -1;
      if ((a.fullCount || 0) < (b.fullCount || 0)) return 1;

      // 2) En cas d'égalité, comparer la somme des pourcentages des caisses non remplies
      if ((a.sumNotFullPercent || 0) > (b.sumNotFullPercent || 0)) return -1;
      if ((a.sumNotFullPercent || 0) < (b.sumNotFullPercent || 0)) return 1;

      // 3) Fallback: pourcentage global décroissant
      if (a.pourcentage > b.pourcentage) return -1;
      if (a.pourcentage < b.pourcentage) return 1;

      // 4) Dernier recours: par date de création
      if (a.created_at > b.created_at) return -1;
      if (a.created_at < b.created_at) return 1;
      return 0;
    });
  });

  const moisTries = Object.keys(depensesParMois).sort().reverse();

  // Pagination par mois
  const indexOfLastMois = currentMoisPage * moisPerPage;
  const indexOfFirstMois = indexOfLastMois - moisPerPage;
  const currentMois = moisTries.slice(indexOfFirstMois, indexOfLastMois);
  const totalMoisPages = Math.ceil(moisTries.length / moisPerPage);

  const compareRanking = (a, b) => {
    if ((a.fullCount || 0) > (b.fullCount || 0)) return -1;
    if ((a.fullCount || 0) < (b.fullCount || 0)) return 1;

    if ((a.sumNotFullPercent || 0) > (b.sumNotFullPercent || 0)) return -1;
    if ((a.sumNotFullPercent || 0) < (b.sumNotFullPercent || 0)) return 1;

    if (a.pourcentage > b.pourcentage) return -1;
    if (a.pourcentage < b.pourcentage) return 1;

    if (a.created_at > b.created_at) return -1;
    if (a.created_at < b.created_at) return 1;
    return 0;
  };

  const meilleurEntree = depensesCompare.length > 0 ? [...depensesCompare].sort(compareRanking)[0] : null;
  const meilleurPourcentage = meilleurEntree?.pourcentage || 0;
  const centreMeilleurPourcentage = meilleurEntree || null;

  const moisUniques = [...new Set(depensesCompare.map(dep => dep.mois))].sort().reverse();

  const CompactProgressBar = ({ percentage, value, isFull }) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <div className={`h-2 flex-1 rounded-full ${isFull ? 'bg-green-200' : 'bg-gray-200'} overflow-hidden`}>
            <div
              className={`h-full ${isFull ? 'bg-green-500' : 'bg-blue-500'} transition-all duration-300`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <div className="ml-2 text-xs font-medium whitespace-nowrap">
            {percentage.toFixed(0)}%
          </div>
        </div>
        <div className="text-xs text-gray-500 text-center">
          {Number(value).toLocaleString('fr-FR')} AR
        </div>
      </div>
    );
  };

  const handleAddClick = () => {
    if (!isAdmin) {
      alert("❌ Seul l'administrateur peut ajouter des données");
      return;
    }

    const moisActuel = new Date().toISOString().slice(0, 7);
    setForm({ centre_id: "", montant: "", mois: moisActuel });
    setEditId(null);
    setShowForm(!showForm);
  };

  const getPositionColor = (index) => {
    if (index === 0) return "bg-green-100 text-green-800 border-green-300";
    if (index === 1) return "bg-blue-100 text-blue-800 border-blue-300";
    if (index === 2) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Fonctions pour la pagination
  const nextMoisPage = () => {
    if (currentMoisPage < totalMoisPages) {
      setCurrentMoisPage(currentMoisPage + 1);
      setActiveCard(null);
    }
  };

  const prevMoisPage = () => {
    if (currentMoisPage > 1) {
      setCurrentMoisPage(currentMoisPage - 1);
      setActiveCard(null);
    }
  };

  const goToMoisPage = (pageNumber) => {
    setCurrentMoisPage(pageNumber);
    setActiveCard(null);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalMoisPages <= maxPagesToShow) {
      for (let i = 1; i <= totalMoisPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentMoisPage - Math.floor(maxPagesToShow / 2));
      const endPage = Math.min(totalMoisPages, startPage + maxPagesToShow - 1);

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header compact - Amélioré pour mobile */}
        <div className="mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Dépenses Obligatoires</h1>
              <p className="text-xs text-gray-500 mt-0.5">Tri par pourcentage décroissant (plus haut → plus bas)</p>
              <div className="mt-1 text-xs text-gray-600">
                {isAdmin ? "Administrateur - Tous droits" : isGerant ? "Gérant - Consultation seule" : "Consultation seule"}
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 flex-1 sm:flex-none"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">Filtres</span>
              </button>

              {isAdmin && (
                <button
                  onClick={handleAddClick}
                  className="px-2 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg flex items-center gap-1 transition-colors flex-1 sm:flex-none"
                >
                  <span>{showForm ? "✕" : "+"}</span>
                  <span className="hidden sm:inline">Ajouter</span>
                  <span className="sm:hidden">Nouveau</span>
                </button>
              )}
            </div>
          </div>

          {/* Formulaire compact - Amélioré pour mobile */}
          {showForm && isAdmin && (
            <div className="mt-3 bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                {editId ? "Modifier la référence" : "Nouvelle référence"}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Centre
                  </label>
                  <SearchableSelect
                    placeholder="Sélectionner"
                    options={centres.map(c => ({ value: c.id.toString(), label: c.nom }))}
                    value={form.centre_id}
                    onChange={(val) => setForm({ ...form, centre_id: val })}
                    className="w-full text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Montant (AR)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.montant}
                    onChange={(e) => setForm({ ...form, montant: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mois
                  </label>
                  <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded px-2 py-1.5 truncate">
                    {form.mois ? new Date(form.mois + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : 'Auto'}
                  </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-1 flex flex-col sm:flex-row gap-1 sm:items-end">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded transition-colors"
                  >
                    {editId ? "Modifier" : "Ajouter"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditId(null); }}
                    className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtres compacts - Amélioré pour mobile */}
          {showFilters && (
            <div className="mt-3 bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {/* Filtre Centre - Searchable */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Centre
                    </label>
                    <div
                      className="relative cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCentresDropdown(!showCentresDropdown);
                      }}
                    >
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white pr-8"
                        placeholder="Tous les centres..."
                        value={filtreCentre === '' ? searchCentreInput : (centres.find(c => String(c.id) === String(filtreCentre))?.nom || '')}
                        onChange={(e) => {
                          setSearchCentreInput(e.target.value);
                          if (filtreCentre !== '') setFiltreCentre('');
                          setShowCentresDropdown(true);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {showCentresDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
                        {[
                          { id: '', nom: "Tous les centres" },
                          ...centres.filter(c => (c.nom || "").toLowerCase().includes(searchCentreInput.toLowerCase()))
                        ].map((c) => (
                          <div
                            key={c.id || 'all'}
                            className={`px-3 py-2 text-xs sm:text-sm cursor-pointer transition-colors ${String(filtreCentre) === String(c.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                            onClick={() => {
                              setFiltreCentre(String(c.id));
                              setSearchCentreInput(c.id === '' ? "" : c.nom);
                              setShowCentresDropdown(false);
                            }}
                          >
                            {c.nom}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mask for dropdown */}
                    {showCentresDropdown && (
                      <div
                        className="fixed inset-0 z-40 outline-none"
                        onClick={() => setShowCentresDropdown(false)}
                      />
                    )}
                  </div>

                  {/* Filtre Mois - Searchable */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mois
                    </label>
                    <div
                      className="relative cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoisDropdown(!showMoisDropdown);
                      }}
                    >
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white pr-8"
                        placeholder="Tous les mois..."
                        value={filtreMois === '' ? searchMoisInput : (new Date(filtreMois + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }))}
                        onChange={(e) => {
                          setSearchMoisInput(e.target.value);
                          if (filtreMois !== '') setFiltreMois('');
                          setShowMoisDropdown(true);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {showMoisDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
                        {[
                          { value: '', label: "Tous les mois" },
                          ...moisUniques
                            .map(mois => ({
                              value: mois,
                              label: new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                            }))
                            .filter(m => m.label.toLowerCase().includes(searchMoisInput.toLowerCase()))
                        ].map((m) => (
                          <div
                            key={m.value || 'all'}
                            className={`px-3 py-2 text-xs sm:text-sm cursor-pointer transition-colors ${String(filtreMois) === String(m.value) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                            onClick={() => {
                              setFiltreMois(String(m.value));
                              setSearchMoisInput(m.value === '' ? "" : m.label);
                              setShowMoisDropdown(false);
                            }}
                          >
                            {m.label}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mask for dropdown */}
                    {showMoisDropdown && (
                      <div
                        className="fixed inset-0 z-40 outline-none"
                        onClick={() => setShowMoisDropdown(false)}
                      />
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-1 sm:items-end">
                    <button
                      onClick={reinitialiserFiltres}
                      className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded hover:bg-gray-50"
                    >
                      Réinitialiser
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded hover:bg-gray-50"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistiques rapides - Amélioré pour mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
            <div className="text-xs text-gray-500 truncate">Total références</div>
            <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {Object.values(depensesParMois).flat().length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
            <div className="text-xs text-gray-500 truncate">Mois actifs</div>
            <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {moisTries.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
            <div className="text-xs text-gray-500 truncate">Pourcentage moyen</div>
            <div className="text-base sm:text-lg font-bold text-blue-600 truncate">
              {Object.values(depensesParMois).flat().length > 0
                ? (Object.values(depensesParMois).flat().reduce((sum, d) => sum + d.pourcentage, 0) / Object.values(depensesParMois).flat().length).toFixed(1)
                : '0'}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
            <div className="text-xs text-gray-500 truncate">Meilleur</div>
            <div className="text-base sm:text-lg font-bold text-green-600 truncate">
              {centreMeilleurPourcentage ? centreMeilleurPourcentage.centre : '-'}
            </div>

          </div>
        </div>

        {/* Pagination des mois - Amélioré pour mobile */}
        {moisTries.length > moisPerPage && (
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200 mb-3 sm:mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs sm:text-sm text-gray-600">
                <span className="font-medium">Mois {indexOfFirstMois + 1}-{Math.min(indexOfLastMois, moisTries.length)}/{moisTries.length}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2">
                <button
                  onClick={prevMoisPage}
                  disabled={currentMoisPage === 1}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded flex items-center gap-1 ${currentMoisPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Précédent</span>
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => goToMoisPage(pageNumber)}
                      className={`w-7 h-7 flex items-center justify-center text-xs sm:text-sm rounded ${currentMoisPage === pageNumber ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <div className="sm:hidden text-xs text-gray-700 font-medium">
                  Page {currentMoisPage}
                </div>

                <button
                  onClick={nextMoisPage}
                  disabled={currentMoisPage === totalMoisPages}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded flex items-center gap-1 ${currentMoisPage === totalMoisPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des dépenses groupées par mois - CORRIGÉ POUR MOBILE */}
        {moisTries.length === 0 && !loading ? (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {depensesCompare.length === 0 ? "Aucune donnée" : "Aucun résultat"}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {depensesCompare.length === 0
                ? "Ajoutez une référence pour commencer"
                : "Ajustez vos filtres pour voir les résultats"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {currentMois.map((mois) => {
              const depensesDuMois = depensesParMois[mois];
              const totalMois = depensesDuMois.reduce((sum, d) => sum + d.montantTotal, 0);
              const pourcentageMoyenMois = depensesDuMois.reduce((sum, d) => sum + d.pourcentage, 0) / depensesDuMois.length;

              return (
                <div key={mois} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* En-tête du mois - Amélioré pour mobile */}
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium whitespace-nowrap">
                            {depensesDuMois.length} référence{depensesDuMois.length > 1 ? 's' : ''}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded whitespace-nowrap">
                            Moy: {pourcentageMoyenMois.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600 truncate">
                          {totalMois.toLocaleString('fr-FR')} AR
                        </div>
                        <div className="text-xs text-gray-500">Total collecté</div>
                      </div>
                    </div>
                  </div>

                  {/* Liste des dépenses du mois - CORRECTION PRINCIPALE POUR MOBILE */}
                  <div className="divide-y divide-gray-100">
                    {depensesDuMois.map((d, index) => {
                      const caissex = calculerRepartition(d.montantTotal, d.montantOblig);
                      const isActive = activeCard === d.id;
                      const positionColor = getPositionColor(index);

                      return (
                        <div
                          key={d.id}
                          className={`p-2 sm:p-3 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-green-50' : ''}`}
                        >
                          <div
                            className="cursor-pointer"
                            onClick={() => setActiveCard(isActive ? null : d.id)}
                          >
                            {/* Structure responsive améliorée */}
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                              {/* Contenu principal - Amélioré pour mobile */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-1">
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full border ${positionColor} flex-shrink-0 mt-0.5`}>
                                    #{index + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1 mb-1">
                                      <h3 className="font-medium text-gray-900 truncate text-sm">
                                        {d.centre}
                                      </h3>
                                      {index === 0 && (
                                        <span className="text-xs px-1 py-0.5 bg-green-500 text-white rounded whitespace-nowrap flex-shrink-0">
                                          🥇
                                        </span>
                                      )}
                                    </div>

                                    {/* Informations sur mobile - en colonne */}
                                    <div className="space-y-1 sm:hidden">
                                      <div className="text-xs text-gray-600">
                                        <span className="font-medium">Réf:</span> {Number(d.montantOblig).toLocaleString('fr-FR')} AR
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        <span className="font-medium">Col:</span> {Number(d.montantTotal).toLocaleString('fr-FR')} AR
                                      </div>
                                      <div className="text-xs">
                                        <span className={`font-medium ${caissex.length > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                                          {caissex.length} caisse{caissex.length > 1 ? 'x' : ''}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Informations sur desktop - en ligne */}
                                    <div className="hidden sm:flex flex-wrap gap-2 mt-1">
                                      <div className="text-sm text-gray-600">
                                        <span className="font-medium">Référence:</span> {Number(d.montantOblig).toLocaleString('fr-FR')} AR
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        <span className="font-medium">Collecté:</span> {Number(d.montantTotal).toLocaleString('fr-FR')} AR
                                      </div>
                                      <div className="text-sm">
                                        <span className={`font-medium ${caissex.length > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                                          {caissex.length} caisse{caissex.length > 1 ? 'x' : ''}
                                        </span>
                                        {caissex.filter(t => t.estPlein).length > 0 && (
                                          <span className="ml-2 text-green-600">
                                            ({caissex.filter(t => t.estPlein).length} complet{caissex.filter(t => t.estPlein).length > 1 ? 's' : ''})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Actions et pourcentage - VISIBLE SUR MOBILE */}
                              <div className="flex items-center justify-between sm:justify-end sm:items-start gap-2 sm:gap-3 mt-1 sm:mt-0">
                                {/* Pourcentage - Toujours visible */}
                                <div className="text-right">
                                  <div className={`text-sm font-bold ${d.pourcentage >= 90 ? 'text-green-600' :
                                    d.pourcentage >= 70 ? 'text-blue-600' :
                                      d.pourcentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                    {d.pourcentage.toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-500 hidden sm:block">Progression</div>
                                </div>

                                {/* Boutons d'action - VISIBLES SUR MOBILE */}
                                {isAdmin && (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEdit(d); }}
                                      className="text-blue-600 hover:text-blue-900 p-1"
                                      title="Modifier"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                                      className="text-red-600 hover:text-red-900 p-1"
                                      title="Supprimer"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )}

                                {/* Flèche pour déplier */}
                                <svg
                                  className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isActive ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>

                            {/* Barre de progression globale - Toujours visible */}
                            <div className="mt-2 sm:mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">Progression</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {d.pourcentage.toFixed(1)}%
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded hidden sm:inline ${d.pourcentage >= 90 ? 'bg-green-100 text-green-800' :
                                    d.pourcentage >= 70 ? 'bg-blue-100 text-blue-800' :
                                      d.pourcentage >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {d.pourcentage >= 90 ? 'Excellent' :
                                      d.pourcentage >= 70 ? 'Bon' :
                                        d.pourcentage >= 50 ? 'Moyen' : 'Faible'}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${d.pourcentage >= 90 ? 'bg-green-500' :
                                    d.pourcentage >= 70 ? 'bg-blue-500' :
                                      d.pourcentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                  style={{
                                    width: `${Math.min(d.pourcentage, 100)}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Contenu dépliable */}
                          {isActive && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              {/* caissex en grille responsive */}
                              <div className="mb-3">
                                <h4 className="text-xs font-medium text-gray-700 mb-2">Répartition détaillée</h4>
                                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {caissex.map((caisse) => (
                                    <div
                                      key={caisse.numero}
                                      className={`bg-white rounded-lg p-2 border ${caisse.estPlein ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-gray-700 truncate">
                                          caisse {caisse.numero}
                                        </span>
                                        <span className={`text-xs font-bold ${caisse.estPlein ? 'text-green-600' : 'text-blue-600'}`}>
                                          {caisse.pourcentage.toFixed(0)}%
                                        </span>
                                      </div>
                                      <CompactProgressBar
                                        percentage={caisse.pourcentage}
                                        value={caisse.valeur}
                                        isFull={caisse.estPlein}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination bas - Amélioré pour mobile */}
        {moisTries.length > moisPerPage && (
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200 mt-4 sm:mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Page {currentMoisPage} sur {totalMoisPages}
              </div>

              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <button
                  onClick={prevMoisPage}
                  disabled={currentMoisPage === 1}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded flex items-center gap-1 ${currentMoisPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Précédent</span>
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => goToMoisPage(pageNumber)}
                      className={`w-7 h-7 flex items-center justify-center text-xs sm:text-sm rounded ${currentMoisPage === pageNumber ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <div className="sm:hidden text-xs text-gray-700 font-medium px-2">
                  {currentMoisPage} / {totalMoisPages}
                </div>

                <button
                  onClick={nextMoisPage}
                  disabled={currentMoisPage === totalMoisPages}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded flex items-center gap-1 ${currentMoisPage === totalMoisPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Légende des positions - Amélioré pour mobile */}
        <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Légende :</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 text-xs">
            <div className="flex items-center">
              <span className="w-5 h-5 flex items-center justify-center bg-green-100 text-green-800 border border-green-300 rounded-full mr-1 sm:mr-2 text-xs flex-shrink-0">
                #1
              </span>
              <span className="text-gray-600 truncate">Meilleur</span>
            </div>
            <div className="flex items-center">
              <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-800 border border-blue-300 rounded-full mr-1 sm:mr-2 text-xs flex-shrink-0">
                #2
              </span>
              <span className="text-gray-600 truncate">2ème</span>
            </div>
            <div className="flex items-center">
              <span className="w-5 h-5 flex items-center justify-center bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full mr-1 sm:mr-2 text-xs flex-shrink-0">
                #3
              </span>
              <span className="text-gray-600 truncate">3ème</span>
            </div>
            <div className="flex items-center">
              <span className="w-5 h-5 flex items-center justify-center bg-gray-100 text-gray-800 border border-gray-300 rounded-full mr-1 sm:mr-2 text-xs flex-shrink-0">
                #N
              </span>
              <span className="text-gray-600 truncate">Autres</span>
            </div>
          </div>
          {isGerant && (
            <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-1.5 sm:p-2 rounded border border-yellow-200">
              ⚠️ Vous êtes en mode consultation seule. Seul l'administrateur peut modifier les données.
            </div>
          )}
        </div>

        {/* Pied de page - Amélioré pour mobile */}
        <div className="mt-3 sm:mt-4 text-center">
          <div className="inline-flex flex-wrap justify-center gap-2 sm:gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>≥ 90%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>70-89%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>50-69%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>&lt; 50%</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 px-2">
            Les dépenses sont triées par pourcentage de progression (du plus élevé au plus bas)
          </div>
        </div>
      </div>
    </div>
  );
}