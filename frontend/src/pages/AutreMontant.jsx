import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/authContext';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiDollarSign,
  FiFilter,
  FiCalendar,
  FiHome,
  FiUser,
  FiSearch,
  FiX,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
  FiCreditCard,
  FiTag
} from 'react-icons/fi';
import SearchableSelect from '../components/SearchableSelect';

const AutreMontant = () => {
  const { user } = useAuth();

  // États principaux
  const [types, setTypes] = useState([]);
  const [centres, setCentres] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [montants, setMontants] = useState([]);

  // Navigation
  const [activeTab, setActiveTab] = useState('montants');

  // Recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCentre, setFilterCentre] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEtudiant, setFilterEtudiant] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Formulaires
  const [formData, setFormData] = useState({
    type: { code: '', libelle: '', description: '' },
    montant: {
      type_montant_id: '',
      centre_id: user?.role === 'gerant' ? user.centre_id : '',
      etudiant_id: '',
      montant: '',
      reference: '',
      commentaire: '',
      date_paiement: new Date().toISOString().split('T')[0],
      send_email: true
    }
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    moyenne: 0
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, centresRes, etudiantsRes, montantsRes] = await Promise.all([
        axios.get(`${API_URL}/api/types-montants`),
        axios.get(`${API_URL}/api/centres`),
        axios.get(`${API_URL}/api/etudiants`),
        axios.get(`${API_URL}/api/montants-autres`)
      ]);

      setTypes(typesRes.data);

      if (user?.role === 'gerant' && user?.centre_id) {
        const userCentreId = parseInt(user.centre_id);
        setCentres(centresRes.data.filter(c => c.id === userCentreId));
        setEtudiants(etudiantsRes.data.filter(e => e.centre_id === userCentreId));
        const filteredMontants = montantsRes.data.filter(m => m.centre_id === userCentreId);
        setMontants(filteredMontants);
        setFilterCentre(userCentreId.toString());
        calculateStats(filteredMontants);
      } else {
        setCentres(centresRes.data);
        setEtudiants(etudiantsRes.data);
        setMontants(montantsRes.data);
        calculateStats(montantsRes.data);
      }
    } catch (err) {
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.reduce((sum, m) => sum + (parseFloat(m.montant) || 0), 0);
    const count = data.length;
    const moyenne = count > 0 ? total / count : 0;

    setStats({
      total,
      count,
      moyenne
    });
  };

  // Handlers
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      if (activeTab === 'types') {
        if (editingId) {
          await axios.put(`${API_URL}/api/types-montants/${editingId}`, formData.type);
        } else {
          await axios.post(`${API_URL}/api/types-montants`, formData.type);
        }
      } else {
        const submissionData = { ...formData.montant };
        if (user?.role === 'gerant' && user?.centre_id) {
          submissionData.centre_id = user.centre_id;
        }

        if (editingId) {
          await axios.put(`${API_URL}/api/montants-autres/${editingId}`, submissionData);
        } else {
          await axios.post(`${API_URL}/api/montants-autres`, submissionData);
        }
      }

      fetchData();
      resetForm();
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (selectedItem.type === 'type') {
        await axios.delete(`${API_URL}/api/types-montants/${selectedItem.id}`);
      } else {
        await axios.delete(`${API_URL}/api/montants-autres/${selectedItem.id}`);
      }
      fetchData();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err) {
      console.error('Erreur suppression:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: { code: '', libelle: '', description: '' },
      montant: {
        type_montant_id: '',
        centre_id: user?.role === 'gerant' ? user.centre_id : '',
        etudiant_id: '',
        montant: '',
        reference: '',
        commentaire: '',
        date_paiement: new Date().toISOString().split('T')[0],
        send_email: true
      }
    });
    setEditingId(null);
    setShowForm(false);
    setFormMode('create');
  };

  const openEditForm = (item, type) => {
    if (type === 'type') {
      setFormData(prev => ({
        ...prev,
        type: { code: item.code, libelle: item.libelle, description: item.description || '' }
      }));
      setActiveTab('types');
    } else {
      setFormData(prev => ({
        ...prev,
        montant: {
          type_montant_id: item.type_montant_id || item.type_montant,
          centre_id: item.centre_id || (user?.role === 'gerant' ? user.centre_id : ''),
          etudiant_id: item.etudiant_id || '',
          montant: item.montant,
          reference: item.reference || '',
          commentaire: item.commentaire || '',
          date_paiement: item.date_paiement ?
            new Date(item.date_paiement).toISOString().split('T')[0] :
            new Date().toISOString().split('T')[0]
        }
      }));
      setActiveTab('montants');
    }

    setEditingId(item.id);
    setFormMode('edit');
    setShowForm(true);
  };

  // Filtrage
  const filteredMontants = useMemo(() => {
    return montants.filter(montant => {
      const matchesSearch = searchTerm === '' ||
        montant.type_montant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        montant.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        montant.commentaire?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        montant.etudiant?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCentre = filterCentre === '' || montant.centre_id === parseInt(filterCentre);
      const matchesType = filterType === '' || montant.type_montant_id === parseInt(filterType);
      const matchesEtudiant = filterEtudiant === '' || montant.etudiant_id === parseInt(filterEtudiant);

      const matchesDate = !dateRange.start || !dateRange.end ||
        (new Date(montant.date_paiement) >= new Date(dateRange.start) &&
          new Date(montant.date_paiement) <= new Date(dateRange.end));

      return matchesSearch && matchesCentre && matchesType && matchesEtudiant && matchesDate;
    });
  }, [montants, searchTerm, filterCentre, filterType, filterEtudiant, dateRange]);

  // Formateurs
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' Ar';
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setFilterEtudiant('');
    setDateRange({ start: '', end: '' });
    if (user?.role !== 'gerant') {
      setFilterCentre('');
    }
  };

  // Étudiants filtrés par centre (pour le gérant)
  const filteredEtudiants = useMemo(() => {
    if (user?.role === 'gerant' && user?.centre_id) {
      return etudiants.filter(e => e.centre_id === parseInt(user.centre_id));
    }
    return etudiants;
  }, [etudiants, user]);

  // Étudiants filtrés pour le formulaire (dépend du centre sélectionné)
  const formEtudiants = useMemo(() => {
    let list = etudiants;

    // Si gérant, restreint à son centre
    if (user?.role === 'gerant' && user?.centre_id) {
      list = list.filter(e => e.centre_id === parseInt(user.centre_id));
    }
    // Si centre sélectionné dans le formulaire
    else if (formData.montant.centre_id) {
      list = list.filter(e => e.centre_id === parseInt(formData.montant.centre_id));
    }

    return list;
  }, [etudiants, user, formData.montant.centre_id]);

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      {/* Header compact */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FiCreditCard className="text-blue-600" />
              Paiements Autres
            </h1>
            <p className="text-xs text-gray-500">{user?.role === 'gerant' ? 'Gérant' : (user?.role === 'dir' ? 'Direction' : 'Administrateur')}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchData}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Actualiser"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-1"
            >
              <FiPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          </div>
        </div>

        {/* Tabs compacts */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('montants')}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1 ${activeTab === 'montants' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <FiDollarSign className="w-3.5 h-3.5" />
            Paiements
            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded ${activeTab === 'montants' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
              {montants.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1 ${activeTab === 'types' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <FiTag className="w-3.5 h-3.5" />
            Types
            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded ${activeTab === 'types' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
              {types.length}
            </span>
          </button>
        </div>
      </div>

      {/* Stats mini */}
      {activeTab === 'montants' && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white border border-gray-200 rounded-lg p-2">
            <p className="text-xs text-gray-500 font-medium">Total</p>
            <p className="text-sm font-bold text-blue-600">{formatCurrency(stats.total)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-2">
            <p className="text-xs text-gray-500 font-medium">Nombre</p>
            <p className="text-sm font-bold text-gray-800">{stats.count}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-2">
            <p className="text-xs text-gray-500 font-medium">Moyenne</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(stats.moyenne)}</p>
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres compacts */}
      <div className="bg-white border border-gray-200 rounded-lg p-2 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <FiFilter className="w-4 h-4" />
          </button>
        </div>

        {/* Filtres dépliables */}
        {showFilters && (
          <div className="border-t pt-2 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  {types.map(t => (
                    <option key={t.id} value={t.id}>{t.libelle}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Centre</label>
                <select
                  value={filterCentre}
                  onChange={e => setFilterCentre(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  disabled={user?.role === 'gerant'}
                >
                  <option value="">Tous</option>
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Étudiant</label>
                <select
                  value={filterEtudiant}
                  onChange={e => setFilterEtudiant(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  {filteredEtudiants.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.prenom} {e.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Période</label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Début"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {filteredMontants.length} résultat{filteredMontants.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire compact */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900 text-sm">
              {formMode === 'edit' ? 'Modifier' : 'Nouveau'} {activeTab === 'montants' ? 'paiement' : 'type'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {activeTab === 'montants' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <SearchableSelect
                      label="Type *"
                      placeholder="Sélectionner un type..."
                      options={types.map(t => ({ value: t.id, label: t.libelle }))}
                      value={formData.montant.type_montant_id}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        montant: { ...prev.montant, type_montant_id: value }
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Montant *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.montant.montant}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        montant: { ...prev.montant, montant: e.target.value }
                      }))}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                    <input
                      type="date"
                      value={formData.montant.date_paiement}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        montant: { ...prev.montant, date_paiement: e.target.value }
                      }))}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <SearchableSelect
                      label="Centre"
                      placeholder="Sélectionner un centre..."
                      options={centres.map(c => ({ value: c.id, label: c.nom }))}
                      value={formData.montant.centre_id}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        montant: { ...prev.montant, centre_id: value }
                      }))}
                      disabled={user?.role === 'gerant'}
                    />
                  </div>

                  <div>
                    <SearchableSelect
                      label="Étudiant"
                      placeholder="Rechercher un étudiant..."
                      options={formEtudiants.map(e => ({ value: e.id, label: `${e.prenom} ${e.nom}` }))}
                      value={formData.montant.etudiant_id}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        montant: { ...prev.montant, etudiant_id: value }
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
                    <input
                      type="text"
                      placeholder="Réf..."
                      value={formData.montant.reference}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        montant: { ...prev.montant, reference: e.target.value }
                      }))}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Commentaire</label>
                  <textarea
                    placeholder="Commentaire..."
                    value={formData.montant.commentaire}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      montant: { ...prev.montant, commentaire: e.target.value }
                    }))}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows="2"
                  />
                </div>


                {formMode === 'create' && (
                  <div className="flex items-center mt-2">
                    <input
                      id="send_email"
                      type="checkbox"
                      checked={formData.montant.send_email}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        montant: { ...prev.montant, send_email: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="send_email" className="ml-2 block text-xs text-gray-700 cursor-pointer select-none">
                      Envoyer un e-mail de confirmation
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
                    <input
                      type="text"
                      placeholder="Ex: FORMAT"
                      value={formData.type.code}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        type: { ...prev.type, code: e.target.value }
                      }))}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Libellé *</label>
                    <input
                      type="text"
                      placeholder="Ex: Frais de formation"
                      value={formData.type.libelle}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        type: { ...prev.type, libelle: e.target.value }
                      }))}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    placeholder="Description..."
                    value={formData.type.description}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      type: { ...prev.type, description: e.target.value }
                    }))}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                disabled={loading}
              >
                {loading ? '...' : (formMode === 'edit' ? 'Mettre à jour' : 'Enregistrer')}
              </button>
            </div>
          </form>
        </div >
      )}

      {/* Liste des éléments */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* En-tête de la liste */}
        <div className="px-3 py-2 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">
              {activeTab === 'montants' ? 'Liste des paiements' : 'Types de paiements'}
            </span>
            <span className="text-xs text-gray-500">
              {activeTab === 'montants' ? filteredMontants.length : types.length} élément(s)
            </span>
          </div>
        </div>

        {/* Liste des paiements */}
        {loading ? (
          <div className="py-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : activeTab === 'montants' ? (
          filteredMontants.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiCreditCard className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Aucun paiement trouvé</p>
              {searchTerm || filterType || filterCentre || filterEtudiant || dateRange.start ? (
                <button
                  onClick={resetFilters}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              ) : null}
            </div>
          ) : (
            <div className="divide-y">
              {filteredMontants.map(montant => (
                <div key={montant.id} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                          {montant.type_montant}
                        </span>
                        {montant.reference && (
                          <span className="text-xs text-gray-500 truncate">{montant.reference}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <FiHome className="w-3 h-3" />
                          {montant.centre}
                        </span>
                        {montant.etudiant && (
                          <span className="flex items-center gap-1">
                            <FiUser className="w-3 h-3" />
                            {montant.etudiant}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          {formatDate(montant.date_paiement)}
                        </span>
                      </div>
                      {montant.commentaire && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{montant.commentaire}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                        {formatCurrency(parseFloat(montant.montant))}
                      </span>
                      {(user?.role === 'admin' || user?.role === 'dir') && (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => openEditForm(montant, 'montant')}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Modifier"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem({ id: montant.id, type: 'montant' });
                              setShowDeleteModal(true);
                            }}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Liste des types */
          types.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiTag className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Aucun type de paiement</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
              {types.map(type => (
                <div key={type.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{type.libelle}</h4>
                      <code className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {type.code}
                      </code>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditForm(type, 'type')}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Modifier"
                        >
                          <FiEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem({ id: type.id, type: 'type' });
                            setShowDeleteModal(true);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Supprimer"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {type.description && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{type.description}</p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal de suppression */}
      {
        showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 max-w-xs w-full">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiTrash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Confirmer la suppression</h3>
                <p className="text-sm text-gray-500">Cette action est irréversible.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? '...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AutreMontant;