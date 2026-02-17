import React, { useEffect, useState, useMemo } from 'react';
import {
  FaDollarSign,
  FaChartLine,
  FaDownload,
  FaFilter,
  FaSync,
  FaChevronDown,
  FaChevronRight,
  FaMoneyBillWave,
  FaUniversity,
  FaTable,
  FaFileExcel,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEye,
  FaTimes
} from 'react-icons/fa';
import { API_URL } from '../config';
import { useAuth } from '../context/authContext'; // Importer le contexte d'authentification

const PaiementsTous = () => {
  const { user } = useAuth(); // Récupérer l'utilisateur connecté

  const [paiements, setPaiements] = useState([]);
  const [autresPaiements, setAutresPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [centres, setCentres] = useState([]);
  const [selectedCentre, setSelectedCentre] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedFormation, setSelectedFormation] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date_paiement', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // State pour filtre centre recherchable
  const [showCentresDropdown, setShowCentresDropdown] = useState(false);
  const [searchCentreInput, setSearchCentreInput] = useState("");

  const filteredCentresOptions = useMemo(() => {
    return [
      { id: 'all', nom: "Tous les centres" },
      ...centres.filter(c => (c.nom || "").toLowerCase().includes(searchCentreInput.toLowerCase()))
    ];
  }, [centres, searchCentreInput]);

  const API_BASE = `${API_URL}/api`;

  // Récupérer les centres avec filtrage selon le rôle
  const fetchCentres = async () => {
    try {
      const res = await fetch(`${API_BASE}/centres`);
      if (res.ok) {
        const data = await res.json();

        // Si l'utilisateur est gérant, ne récupérer que son centre
        if (user?.role === 'gerant' && user?.centre_id) {
          const userCentreId = parseInt(user.centre_id);
          const userCentre = data.find(c => c.id === userCentreId);
          if (userCentre) {
            setCentres([userCentre]);
            setSelectedCentre(userCentreId.toString()); // Pré-sélectionner son centre
          } else {
            setCentres([]);
          }
        } else {
          setCentres(data);
        }
      }
    } catch (error) {
      console.error('Erreur chargement centres:', error);
    }
  };

  // Récupérer les paiements avec filtrage selon le rôle
  const fetchPaiements = async () => {
    try {
      const params = new URLSearchParams();

      // Si l'utilisateur est gérant, forcer le filtre sur son centre
      if (user?.role === 'gerant' && user?.centre_id) {
        params.append('centre_id', user.centre_id);
      } else if (selectedCentre !== 'all') {
        params.append('centre_id', selectedCentre);
      }

      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);

      const url = `${API_BASE}/paiements${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPaiements(data);
        return data;
      }
      return [];
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
      return [];
    }
  };

  // Récupérer les autres paiements avec filtrage selon le rôle
  const fetchAutresPaiements = async () => {
    try {
      const params = new URLSearchParams();

      // Si l'utilisateur est gérant, forcer le filtre sur son centre
      if (user?.role === 'gerant' && user?.centre_id) {
        params.append('centre_id', user.centre_id);
      } else if (selectedCentre !== 'all') {
        params.append('centre_id', selectedCentre);
      }

      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);

      const url = `${API_BASE}/montants-autres${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAutresPaiements(data);
        return data;
      }
      return [];
    } catch (error) {
      console.error('Erreur chargement autres paiements:', error);
      return [];
    }
  };

  // Charger toutes les données
  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPaiements(),
        fetchAutresPaiements()
      ]);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialisation
  useEffect(() => {
    fetchCentres();
  }, [user]); // Recharger quand l'utilisateur change

  useEffect(() => {
    loadData();
  }, [selectedCentre, dateRange, user]); // Ajouter user aux dépendances

  // Formater les valeurs
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' Ar';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  // Fusionner et préparer toutes les données
  const allData = useMemo(() => {
    const formattedPaiements = paiements.map(p => ({
      ...p,
      type: 'formation',
      type_label: 'Paiement Formation',
      id_str: `P-${p.id}`,
      sous_type: p.type_paiement,
      beneficiaire: p.inscriptions?.etudiants
        ? `${p.inscriptions.etudiants.prenom} ${p.inscriptions.etudiants.nom}`
        : 'Non spécifié',
      centre: centres.find(c => c.id === p.inscriptions?.etudiants?.centre_id)?.nom || '-',
      centre_id: p.inscriptions?.etudiants?.centre_id,
      searchable: `${p.type_paiement} ${p.inscriptions?.etudiants?.prenom || ''} ${p.inscriptions?.etudiants?.nom || ''} ${p.mois_paye || ''}`.toLowerCase()
    }));

    const formattedAutres = autresPaiements.map(p => ({
      ...p,
      type: 'autre',
      type_label: 'Autre Paiement',
      id_str: `A-${p.id}`,
      sous_type: p.type_montant,
      beneficiaire: p.etudiant || 'Non spécifié',
      centre: p.centre || '-',
      centre_id: p.centre_id,
      searchable: `${p.type_montant || ''} ${p.etudiant || ''} ${p.reference || ''} ${p.commentaire || ''}`.toLowerCase()
    }));

    return [...formattedPaiements, ...formattedAutres];
  }, [paiements, autresPaiements, centres]);

  // Extraire les types de formation uniques
  const formationTypes = useMemo(() => {
    const types = new Set();
    paiements.forEach(p => {
      if (p.type_paiement) types.add(p.type_paiement);
    });
    autresPaiements.forEach(p => {
      if (p.type_montant) types.add(p.type_montant);
    });
    return Array.from(types).sort();
  }, [paiements, autresPaiements]);

  // Filtrer et trier les données
  const filteredAndSortedData = useMemo(() => {
    let result = allData;

    // Filtre par type (formation/autre)
    if (selectedType !== 'all') {
      result = result.filter(item => item.type === selectedType);
    }

    // Filtre par type de formation
    if (selectedFormation !== 'all') {
      result = result.filter(item => item.sous_type === selectedFormation);
    }

    // Filtre par centre (sauf pour les gérants qui n'ont qu'un seul centre)
    if (selectedCentre !== 'all' && user?.role !== 'gerant') {
      result = result.filter(item => item.centre_id == selectedCentre);
    }

    // Recherche
    if (searchTerm) {
      result = result.filter(item =>
        item.searchable.includes(searchTerm.toLowerCase()) ||
        item.beneficiaire.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.centre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tri
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'montant') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else if (sortConfig.key === 'date_paiement') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortConfig.key === 'beneficiaire' || sortConfig.key === 'centre') {
          aValue = aValue?.toString().toLowerCase() || '';
          bValue = bValue?.toString().toLowerCase() || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [allData, selectedType, selectedFormation, selectedCentre, searchTerm, sortConfig, user]);

  // Calculer les statistiques BASÉES SUR LES DONNÉES FILTRÉES
  const filteredStats = useMemo(() => {
    const formationData = filteredAndSortedData.filter(item => item.type === 'formation');
    const autresData = filteredAndSortedData.filter(item => item.type === 'autre');

    const totalFormation = formationData.reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
    const totalAutres = autresData.reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
    const totalGeneral = totalFormation + totalAutres;

    const countFormation = formationData.length;
    const countAutres = autresData.length;

    return {
      totalFormation,
      totalAutres,
      totalGeneral,
      countFormation,
      countAutres
    };
  }, [filteredAndSortedData]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  // Gestion du tri
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc'
      ? <FaSortUp className="ml-1 text-blue-600" />
      : <FaSortDown className="ml-1 text-blue-600" />;
  };

  // Afficher les détails d'un autre paiement
  const handleViewDetails = (item) => {
    if (item.type === 'autre') {
      setSelectedDetail(item);
      setShowDetailModal(true);
    }
  };

  // Fermer le modal de détails
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDetail(null);
  };

  // Téléchargement Excel
  const downloadExcel = () => {
    const headers = ['Type', 'Sous-type', 'Bénéficiaire', 'Centre', 'Montant', 'Date', 'Référence', 'Commentaire'];
    const wsData = [
      headers,
      ...filteredAndSortedData.map(item => [
        item.type_label,
        item.sous_type || '',
        item.beneficiaire || '',
        item.centre || '',
        parseFloat(item.montant) || 0,
        formatDate(item.date_paiement),
        item.reference || item.mois_paye || '',
        item.commentaire || ''
      ])
    ];

    const htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <title>Export Paiements</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #f8f9fa; font-weight: bold; padding: 8px; border: 1px solid #dee2e6; }
          td { padding: 6px; border: 1px solid #dee2e6; }
          .total { font-weight: bold; background-color: #e9ecef; }
        </style>
      </head>
      <body>
        <h2>Export des Paiements</h2>
        <p>Date d'export: ${new Date().toLocaleDateString('fr-FR')}</p>
        <p>Période: ${formatDate(dateRange.start)} au ${formatDate(dateRange.end)}</p>
        <p>Total: ${formatCurrency(filteredStats.totalGeneral)}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${filteredAndSortedData.map(item => `
              <tr>
                <td>${item.type_label}</td>
                <td>${item.sous_type || ''}</td>
                <td>${item.beneficiaire || ''}</td>
                <td>${item.centre || ''}</td>
                <td>${formatCurrency(item.montant)}</td>
                <td>${formatDate(item.date_paiement)}</td>
                <td>${item.reference || item.mois_paye || ''}</td>
                <td>${item.commentaire || ''}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="4">TOTAL</td>
              <td>${formatCurrency(filteredAndSortedData.reduce((sum, item) => sum + (parseFloat(item.montant) || 0), 0))}</td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paiements_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSelectedType('all');
    setSelectedFormation('all');
    // Si l'utilisateur est gérant, ne pas réinitialiser le centre
    if (user?.role !== 'gerant') {
      setSelectedCentre('all');
    }
    setSearchTerm('');
    setSearchCentreInput('');
    setDateRange({
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des paiements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header compact */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Paiements</h1>
            <p className="text-gray-600 text-sm">
              {user?.role === 'gerant'
                ? `Gestion des transactions - ${centres[0]?.nom || 'Votre centre'}`
                : 'Gestion des transactions'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FaFilter className="mr-2" />
              Filtres
              {showFilters ? <FaChevronDown className="ml-2" /> : <FaChevronRight className="ml-2" />}
            </button>
            <button
              onClick={downloadExcel}
              className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FaFileExcel className="mr-2" />
              Export Excel
            </button>
            <button
              onClick={loadData}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FaSync className="mr-2" />
            </button>
          </div>
        </div>

        {/* Statistiques compactes BASÉES SUR LES FILTRES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Formation</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(filteredStats.totalFormation)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{filteredStats.countFormation} paiements</p>
                <div className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  Moyenne: {formatCurrency(filteredStats.countFormation > 0 ? filteredStats.totalFormation / filteredStats.countFormation : 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Autres</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(filteredStats.totalAutres)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{filteredStats.countAutres} paiements</p>
                <div className="text-xs text-green-500 bg-green-50 px-2 py-1 rounded">
                  Moyenne: {formatCurrency(filteredStats.countAutres > 0 ? filteredStats.totalAutres / filteredStats.countAutres : 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Total Général</p>
                <p className="text-xl font-bold">{formatCurrency(filteredStats.totalGeneral)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/80">{filteredStats.countFormation + filteredStats.countAutres} total</p>
                <div className="text-xs bg-white/20 px-2 py-1 rounded">Période sélectionnée</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres dépliables */}
        {showFilters && (
          <div className="bg-white rounded-lg border p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Filtres avancés</h3>
              <button
                onClick={resetFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Réinitialiser
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Recherche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Nom, centre, référence..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">Tous les types</option>
                  <option value="formation">Formation</option>
                  <option value="autre">Autres</option>
                </select>
              </div>

              {/* Type de formation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de paiement</label>
                <select
                  value={selectedFormation}
                  onChange={(e) => setSelectedFormation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">Tous les types</option>
                  {formationTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Centre - Désactivé pour les gérants */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centre
                  {user?.role === 'gerant' && (
                    <span className="ml-2 text-xs text-green-600">(Votre centre)</span>
                  )}
                </label>
                <div
                  className={`relative cursor-pointer ${user?.role === 'gerant' ? 'opacity-60 pointer-events-none' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCentresDropdown(!showCentresDropdown);
                  }}
                >
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white pr-8"
                    placeholder="Choisir un centre..."
                    disabled={user?.role === 'gerant'}
                    value={selectedCentre === 'all' ? searchCentreInput : (centres.find(c => String(c.id) === String(selectedCentre))?.nom || "")}
                    onChange={(e) => {
                      setSearchCentreInput(e.target.value);
                      if (selectedCentre !== 'all') setSelectedCentre('all');
                      setShowCentresDropdown(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <FaChevronDown size={10} />
                  </div>
                </div>

                {showCentresDropdown && user?.role !== 'gerant' && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
                    {filteredCentresOptions.length > 0 ? (
                      filteredCentresOptions.map((c) => (
                        <div
                          key={c.id}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${String(selectedCentre) === String(c.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                          onClick={() => {
                            setSelectedCentre(String(c.id));
                            setSearchCentreInput(c.id === 'all' ? "" : c.nom);
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

                {/* Mask for dropdown */}
                {showCentresDropdown && (
                  <div
                    className="fixed inset-0 z-40 outline-none"
                    onClick={() => setShowCentresDropdown(false)}
                  />
                )}
              </div>

              {/* Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-end">
                <button
                  onClick={loadData}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Appliquer les filtres
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tableau principal */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* En-tête du tableau */}
        <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <span className="font-medium text-gray-700">
              {filteredAndSortedData.length} paiements
            </span>
            <span className="text-sm text-gray-500 ml-2">
              ({paginatedData.length} affichés)
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Page {currentPage} sur {totalPages}
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center">
                    Type
                    {getSortIcon('type')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sous_type')}
                >
                  <div className="flex items-center">
                    Sous-type
                    {getSortIcon('sous_type')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('beneficiaire')}
                >
                  <div className="flex items-center">
                    Bénéficiaire
                    {getSortIcon('beneficiaire')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('centre')}
                >
                  <div className="flex items-center">
                    Centre
                    {getSortIcon('centre')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('montant')}
                >
                  <div className="flex items-center">
                    Montant
                    {getSortIcon('montant')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date_paiement')}
                >
                  <div className="flex items-center">
                    Date
                    {getSortIcon('date_paiement')}
                  </div>
                </th>
                <th className="py-3 px-4 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${item.type === 'formation'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                        }`}>
                        {item.type_label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600">{item.sous_type || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{item.beneficiaire}</div>
                      <div className="text-xs text-gray-500">{item.id_str}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600">{item.centre}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-green-600">
                      {formatCurrency(item.montant)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(item.date_paiement)}
                    </td>
                    <td className="py-3 px-4">
                      {/* SEULEMENT pour les autres paiements */}
                      {item.type === 'autre' ? (
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="text-blue-600 hover:text-blue-800 text-sm p-1 hover:bg-blue-50 rounded"
                          title="Voir les détails"
                        >
                          <FaEye />
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm p-1" title="Détails non disponibles">
                          <FaEye />
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">
                    Aucun paiement trouvé avec les filtres actuels
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Précédent
              </button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded ${currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Résumé du filtre */}
      {(selectedType !== 'all' || selectedFormation !== 'all' || selectedCentre !== 'all' || searchTerm) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-blue-700">Filtres actifs:</span>
              {selectedType !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  Type: {selectedType === 'formation' ? 'Formation' : 'Autres'}
                  <button onClick={() => setSelectedType('all')} className="ml-1">
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {selectedFormation !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  Paiement: {selectedFormation}
                  <button onClick={() => setSelectedFormation('all')} className="ml-1">
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {selectedCentre !== 'all' && user?.role !== 'gerant' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  Centre: {centres.find(c => c.id == selectedCentre)?.nom}
                  <button onClick={() => setSelectedCentre('all')} className="ml-1">
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {user?.role === 'gerant' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                  Centre: {centres[0]?.nom || 'Votre centre'}
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  Recherche: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="ml-1">
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Tout effacer
            </button>
          </div>
        </div>
      )}

      {/* Modal de détails pour les autres paiements */}
      {showDetailModal && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Détails du paiement</h3>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedDetail.type_label}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sous-type</p>
                  <p className="font-medium">{selectedDetail.sous_type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bénéficiaire</p>
                  <p className="font-medium">{selectedDetail.beneficiaire}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Centre</p>
                  <p className="font-medium">{selectedDetail.centre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Montant</p>
                  <p className="font-medium text-green-600">{formatCurrency(selectedDetail.montant)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(selectedDetail.date_paiement)}</p>
                </div>
              </div>

              {selectedDetail.reference && (
                <div>
                  <p className="text-sm text-gray-500">Référence</p>
                  <p className="font-medium">{selectedDetail.reference}</p>
                </div>
              )}

              {selectedDetail.commentaire && (
                <div>
                  <p className="text-sm text-gray-500">Commentaire</p>
                  <p className="font-medium">{selectedDetail.commentaire}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">ID</p>
                <p className="font-medium text-gray-400 text-sm">{selectedDetail.id_str}</p>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaiementsTous;