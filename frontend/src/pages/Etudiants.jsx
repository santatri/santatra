import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from "../context/authContext";
import {
  FaUserGraduate, FaPlus, FaEdit, FaTrash, FaEye, FaTimes,
  FaBuilding, FaMoneyBillWave, FaGraduationCap,
  FaSearch, FaChevronLeft, FaChevronRight, FaPhone,
  FaCalendar, FaFilter, FaSort,
  FaCheck, FaClock, FaExclamationTriangle, FaList,
  FaSpinner, FaIdCard, FaSyncAlt
} from 'react-icons/fa';
import { API_URL } from '../config';

// Fonction utilitaire pour recherche "ressemblante" (fuzzy search)
const fuzzyMatch = (str1, str2) => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Match exact ou contient
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Fuzzy match: chaque caractère de s2 existe dans s1 dans le même ordre
  let j = 0;
  for (let i = 0; i < s1.length && j < s2.length; i++) {
    if (s1[i] === s2[j]) j++;
  }
  return j === s2.length;
};

// Fonction utilitaire pour formater la durée
const formatDuree = (duree) => {
  if (duree === 0.25) return "1 semaine";
  if (duree === 0.5) return "2 semaines";
  if (duree === 1.5) return "1 mois et demi";
  const mois = Math.floor(duree);
  const semaines = Math.round((duree - mois) * 4);
  if (semaines === 0) return `${mois} mois`;
  if (mois === 0) return `${semaines} semaine${semaines > 1 ? 's' : ''}`;
  return `${mois} mois et ${semaines} semaine${semaines > 1 ? 's' : ''}`;
};

// Fonction utilitaire pour vérifier si une formation est finie
const isFormationFinishedByDate = (dateInscription, duree) => {
  if (!dateInscription || !duree) return false;

  const dateStart = new Date(dateInscription);
  const dateEnd = new Date(dateStart);
  dateEnd.setMonth(dateEnd.getMonth() + duree);

  return new Date() > dateEnd;
};

// Composant RefreshButton intégré
const RefreshButton = ({ onClick, loading = false, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg font-medium transition duration-200 shadow-sm text-xs ${className}`}
      title="Rafraîchir"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800"></div>
      ) : (
        <FaSyncAlt className="mr-1" />
      )}
      <span className="hidden sm:inline">Rafraîchir</span>
    </button>
  );
};

// Fonction pour générer les mois de formation
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

const Etudiants = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [detailEtudiant, setDetailEtudiant] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [selectedCentre, setSelectedCentre] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [sortBy, setSortBy] = useState('nom');
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'gerant' && user.centre_id) {
      setSelectedCentre(user.centre_id.toString());
    }
  }, [user]);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    matricule: '',
    email: '',
    telephone: '',
    centre_id: '',
    date_creation: new Date().toISOString().split('T')[0],
  });

  // Charger les données
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Charger les étudiants
      const etudiantsRes = await fetch(`${API_URL}/api/etudiants`);
      if (!etudiantsRes.ok) {
        throw new Error('Erreur lors du chargement des étudiants');
      }
      const etudiantsData = await etudiantsRes.json();
      setEtudiants(etudiantsData);

      // Charger les centres
      const centresRes = await fetch(`${API_URL}/api/centres`);
      if (centresRes.ok) {
        const centresData = await centresRes.json();
        setCentres(centresData);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      setMessage('❌ Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrer et trier les étudiants
  const filteredEtudiants = etudiants.filter(etudiant => {
    if (!searchTerm) {
      // Si pas de recherche, montrer tous les étudiants
      const matchesCentre = !selectedCentre || etudiant.centre_id === parseInt(selectedCentre);
      const matchesStatut = !selectedStatut || etudiant.statut === selectedStatut;
      return matchesCentre && matchesStatut;
    }

    const matchesSearch =
      fuzzyMatch(etudiant.nom, searchTerm) ||
      fuzzyMatch(etudiant.prenom, searchTerm) ||
      fuzzyMatch(etudiant.matricule || '', searchTerm) ||
      (etudiant.telephone && etudiant.telephone.includes(searchTerm));

    const matchesCentre = !selectedCentre || etudiant.centre_id === parseInt(selectedCentre);
    const matchesStatut = !selectedStatut || etudiant.statut === selectedStatut;

    return matchesSearch && matchesCentre && matchesStatut;
  });

  // Trier les étudiants
  const sortedEtudiants = [...filteredEtudiants].sort((a, b) => {
    switch (sortBy) {
      case 'nom':
        return a.nom.localeCompare(b.nom);
      case 'prenom':
        return a.prenom.localeCompare(b.prenom);
      case 'statut':
        return (a.statut || '').localeCompare(b.statut || '');
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedEtudiants.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEtudiants = sortedEtudiants.slice(indexOfFirstItem, indexOfLastItem);

  // Réinitialiser la pagination quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCentre, selectedStatut]);

  // Générer les numéros de page
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 3;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 1);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('');
    if (!(user && user.role === 'gerant')) {
      setSelectedCentre('');
    }
    setSelectedStatut('');
    setSortBy('nom');
    setCurrentPage(1);
  };

  // Obtenir le nom du centre
  const getCentreName = (centre_id) => {
    const centre = centres.find((c) => c.id === centre_id);
    return centre ? centre.nom : '-';
  };

  // Ouvrir les détails d'un étudiant
  const openEtudiantDetail = async (etudiant) => {
    try {
      setLoadingDetailsId(etudiant.id);
      setDetailLoading(true);
      setDetailEtudiant(null);

      const response = await fetch(`${API_URL}/api/etudiants/${etudiant.id}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails');
      }

      const data = await response.json();
      setDetailEtudiant({
        etudiant: data.etudiant,
        inscriptions: data.inscriptions || [],
        paiements: data.inscriptions.flatMap(insc => insc.paiements || [])
      });
    } catch (error) {
      console.error('Erreur chargement détails étudiant:', error);
      setMessage('❌ Erreur chargement détails');
    } finally {
      setDetailLoading(false);
      setLoadingDetailsId(null);
    }
  };

  // Ajouter ou modifier un étudiant
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const { nom, prenom, matricule, telephone, email, centre_id } = formData;
    const isToday = formData.date_creation === new Date().toISOString().split('T')[0];
    const isNew = !editingId;

    if (!nom || !prenom || (!matricule && (!isNew || !isToday)) || !centre_id) {
      setMessage(`⚠️ Nom, prénom${(!isNew || !isToday) ? ', matricule' : ''} et centre sont obligatoires`);
      return;
    }

    try {
      let response;
      const studentData = {
        nom,
        prenom,
        matricule: matricule || null,
        email: email || null,
        telephone: telephone || null,
        centre_id: parseInt(centre_id),
        date_creation: formData.date_creation || new Date().toISOString().split('T')[0]
      };

      if (editingId) {
        // Mise à jour
        response = await fetch(`${API_URL}/api/etudiants/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(studentData)
        });
      } else {
        // Création
        response = await fetch(`${API_URL}/api/etudiants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(studentData)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'opération');
      }

      setMessage(`✅ ${data.message}`);
      setFormData({
        nom: '',
        prenom: '',
        matricule: '',
        telephone: '',
        centre_id: '',
        date_creation: new Date().toISOString().split('T')[0],
      });
      setEditingId(null);
      setShowForm(false);
      fetchData();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  // Modifier un étudiant
  const handleEdit = (etudiant) => {
    setFormData({
      nom: etudiant.nom,
      prenom: etudiant.prenom,
      matricule: etudiant.matricule || '',
      email: etudiant.email || '',
      telephone: etudiant.telephone || '',
      centre_id: etudiant.centre_id ? etudiant.centre_id.toString() : '',
      date_creation: etudiant.created_at ? new Date(etudiant.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setEditingId(etudiant.id);
    setShowForm(true);
  };

  // Annuler l'édition/ajout
  const handleCancel = () => {
    setFormData({
      nom: '',
      prenom: '',
      matricule: '',
      email: '',
      telephone: '',
      centre_id: '',
      date_creation: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Supprimer un étudiant
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/etudiants/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression');
      }

      setMessage('✅ Étudiant supprimé avec succès');
      fetchData();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-xs">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-2 px-1">
      <div className="max-w-7xl mx-auto">
        {/* Header compact */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div>
            <h1 className="text-sm font-bold text-gray-900 flex items-center">
              <FaUserGraduate className="mr-1 text-blue-600 text-xs" />
              Étudiants
            </h1>
            <p className="text-gray-600 text-[10px]">
              {sortedEtudiants.length} étudiant{sortedEtudiants.length !== 1 ? 's' : ''}
              {(selectedCentre || selectedStatut || searchTerm) && ' filtré(s)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton onClick={fetchData} loading={loading} />
            <button
              onClick={() => {
                if (user && user.role === 'gerant' && user.centre_id) {
                  setFormData(prev => ({ ...prev, centre_id: user.centre_id.toString() }));
                }
                setShowForm(true);
              }}
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition duration-200 shadow-sm"
            >
              <FaPlus className="mr-0.5 text-[10px]" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Recherche et Filtres */}
        <div className="space-y-1.5 mb-2 px-1">
          {/* Barre de recherche */}
          <div className="relative">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-6 pr-6 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition duration-150 p-0.5"
              >
                <FaTimes className="w-2 h-2" />
              </button>
            )}
          </div>

          {/* Filtres et Tri */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Filtre par Centre */}
            <div className="relative">
              <FaBuilding className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]" />
              <select
                value={selectedCentre}
                onChange={(e) => setSelectedCentre(e.target.value)}
                disabled={user && user.role === 'gerant'}
                className={`w-full pl-6 pr-4 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs appearance-none bg-white ${user && user.role === 'gerant' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Tous les centres</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par Statut */}
            <div className="relative">
              <FaFilter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]" />
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className="w-full pl-6 pr-4 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs appearance-none bg-white"
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="quitte">Quitté</option>
                <option value="fini">Formation finie</option>
              </select>
            </div>
          </div>

          {/* Tri */}
          <div className="relative">
            <FaSort className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-6 pr-4 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs appearance-none bg-white"
            >
              <option value="nom">Tri: Nom</option>
              <option value="prenom">Tri: Prénom</option>
              <option value="statut">Tri: Statut</option>
            </select>
          </div>

          {/* Bouton reset filtres */}
          {(selectedCentre || selectedStatut || searchTerm) && (
            <div className="flex justify-center">
              <button
                onClick={resetFilters}
                className="inline-flex items-center text-gray-600 hover:text-gray-800 text-[10px] font-medium transition duration-150"
              >
                <FaTimes className="mr-0.5 text-[8px]" />
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Message Alert compact */}
        {message && (
          <div className={`mb-2 mx-1 p-1.5 rounded text-xs ${message.includes('❌')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : message.includes('⚠️')
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
              : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
            <div className="flex items-center">
              {message.includes('❌') && <FaTimes className="mr-1 flex-shrink-0 text-[10px]" />}
              {message.includes('✅') && <FaUserGraduate className="mr-1 flex-shrink-0 text-[10px]" />}
              <span className="text-[11px]">{message}</span>
            </div>
          </div>
        )}

        {/* Form Modal compact */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-1 z-50">
            <div className="bg-white rounded shadow-lg w-full max-w-sm max-h-[85vh] overflow-y-auto">
              <div className="p-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-gray-900 flex items-center">
                    <FaUserGraduate className="mr-1 text-blue-600 text-[10px]" />
                    {editingId ? 'Modifier' : 'Nouvel étudiant'}
                  </h2>
                  <button
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-gray-600 transition duration-150 p-0.5"
                  >
                    <FaTimes className="w-2 h-2" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-2 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                      placeholder="Nom"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                      placeholder="Prénom"
                      required
                    />
                  </div>
                </div>

                {user?.role !== 'gerant' && (
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      Date de création *
                    </label>
                    <input
                      type="date"
                      value={formData.date_creation}
                      onChange={(e) => setFormData({ ...formData, date_creation: e.target.value })}
                      className="w-full px-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                    N° Matricule {formData.date_creation === new Date().toISOString().split('T')[0] ? "(Auto-généré si vide)" : "*"}
                  </label>
                  <input
                    type="text"
                    value={formData.matricule}
                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                    className="w-full px-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                    placeholder={formData.date_creation === new Date().toISOString().split('T')[0] ? "Laisser vide pour auto-générer" : "Ex: ETU-001"}
                    required={formData.date_creation !== new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                    placeholder="+261 ..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                    placeholder="exemple@email.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                    Centre *
                  </label>
                  <select
                    value={formData.centre_id}
                    onChange={(e) => setFormData({ ...formData, centre_id: e.target.value })}
                    disabled={user && user.role === 'gerant'}
                    className={`w-full px-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs ${user && user.role === 'gerant' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    required
                  >
                    <option value="">Choisir centre</option>
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-1 pt-1 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2 rounded transition duration-200 shadow-sm text-xs"
                  >
                    <FaUserGraduate className="mr-0.5 text-[10px]" />
                    {editingId ? 'Modifier' : 'Ajouter'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-medium py-1 px-2 border border-gray-300 rounded transition duration-200 text-xs"
                  >
                    <FaTimes className="mr-0.5 text-[10px]" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Liste compacte des étudiants */}
        {currentEtudiants.length > 0 && (
          <div className="space-y-1">
            {currentEtudiants.map((e) => (
              <div key={e.id} className="bg-white rounded shadow-xs border border-gray-200 p-1.5">
                {/* Ligne 1: Nom + Statut */}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-gray-900 truncate">
                      {e.nom} {e.prenom}
                    </h3>
                  </div>
                  <span className={`ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium ${e.statut === 'actif'
                    ? 'bg-green-100 text-green-800'
                    : e.statut === 'quitte'
                      ? 'bg-yellow-100 text-yellow-800'
                      : e.statut === 'fini'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                    {e.statut === 'fini' && <FaCheck className="mr-0.5 text-[8px]" />}
                    {e.statut || 'Non défini'}
                  </span>
                </div>

                {/* Ligne 2: Informations compactes */}
                <div className="flex items-center justify-between text-[10px] text-gray-600 mb-1.5">
                  <div className="flex items-center space-x-2">
                    {e.matricule && (
                      <div className="flex items-center">
                        <FaIdCard className="mr-0.5 text-[8px]" />
                        <span className="truncate max-w-[80px]">{e.matricule}</span>
                      </div>
                    )}
                    {e.telephone && (
                      <div className="flex items-center">
                        <FaPhone className="mr-0.5 text-[8px]" />
                        <span>{e.telephone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <FaBuilding className="mr-0.5 text-[8px]" />
                    <span className="truncate max-w-[60px]">{getCentreName(e.centre_id)}</span>
                  </div>
                </div>

                {/* Ligne 3: Actions compactes */}
                <div className="flex justify-between pt-1 border-t border-gray-200">
                  <button
                    onClick={() => openEtudiantDetail(e)}
                    disabled={loadingDetailsId === e.id}
                    className="flex-1 inline-flex items-center justify-center text-blue-600 hover:text-blue-800 font-medium text-[10px] py-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingDetailsId === e.id ? (
                      <>
                        <FaSpinner className="mr-0.5 text-[8px] animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <FaEye className="mr-0.5 text-[8px]" />
                        Détails
                      </>
                    )}
                  </button>
                  <div className="w-px bg-gray-300"></div>
                  <button
                    onClick={() => handleEdit(e)}
                    className="flex-1 inline-flex items-center justify-center text-yellow-600 hover:text-yellow-800 font-medium text-[10px] py-0.5"
                  >
                    <FaEdit className="mr-0.5 text-[8px]" />
                    Modifier
                  </button>
                  <div className="w-px bg-gray-300"></div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="flex-1 inline-flex items-center justify-center text-red-600 hover:text-red-800 font-medium text-[10px] py-0.5"
                  >
                    <FaTrash className="mr-0.5 text-[8px]" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination ultra compacte */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center mt-2 pt-2 border-t border-gray-200 gap-1">
                <div className="text-[10px] text-gray-600">
                  Page {currentPage} sur {totalPages}
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center w-6 h-6 border border-gray-300 rounded text-[10px] bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition duration-200"
                  >
                    <FaChevronLeft className="w-2 h-2" />
                  </button>

                  {getPageNumbers().map(pageNumber => (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`flex items-center justify-center w-6 h-6 border text-[10px] transition duration-200 ${currentPage === pageNumber
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center w-6 h-6 border border-gray-300 rounded text-[10px] bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition duration-200"
                  >
                    <FaChevronRight className="w-2 h-2" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State compact */}
        {!loading && sortedEtudiants.length === 0 && (
          <div className="bg-white rounded shadow-xs border border-gray-200 p-3 text-center">
            <FaUserGraduate className="w-6 h-6 text-gray-400 mx-auto mb-1" />
            {searchTerm || selectedCentre || selectedStatut ? (
              <>
                <h3 className="text-xs font-medium text-gray-900 mb-1">Aucun résultat</h3>
                <p className="text-gray-600 mb-2 text-[10px]">
                  Aucun étudiant ne correspond à vos critères
                </p>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                >
                  <FaTimes className="mr-0.5 text-[10px]" />
                  Réinitialiser les filtres
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xs font-medium text-gray-900 mb-1">Aucun étudiant</h3>
                <p className="text-gray-600 mb-2 text-[10px]">Ajoutez votre premier étudiant</p>
                <button
                  onClick={() => {
                    if (user && user.role === 'gerant' && user.centre_id) {
                      setFormData(prev => ({ ...prev, centre_id: user.centre_id.toString() }));
                    }
                    setShowForm(true);
                  }}
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                >
                  <FaPlus className="mr-0.5 text-[10px]" />
                  Ajouter
                </button>
              </>
            )}
          </div>
        )}

        {/* Modal détails étudiant compact */}
        {detailEtudiant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-1 z-50">
            <div className="bg-white rounded shadow-lg w-full max-w-sm max-h-[85vh] overflow-y-auto">
              <div className="p-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-gray-900 flex items-center">
                    <FaUserGraduate className="mr-1 text-blue-600 text-[10px]" />
                    Détails étudiant
                  </h2>
                  <button
                    onClick={() => setDetailEtudiant(null)}
                    className="text-gray-400 hover:text-gray-600 transition duration-150 p-0.5"
                  >
                    <FaTimes className="w-2 h-2" />
                  </button>
                </div>
              </div>

              {detailLoading ? (
                <div className="p-3 text-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-1 text-gray-600 text-[10px]">Préparation des données...</p>
                </div>
              ) : (
                <div className="p-2">
                  {/* Informations de base compactes */}
                  <div className="space-y-2 mb-3">
                    <h3 className="text-xs font-medium text-gray-900 flex items-center">
                      <FaUserGraduate className="mr-1 text-blue-600 text-[10px]" />
                      Informations
                    </h3>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div><strong className="text-gray-700">Nom:</strong> {detailEtudiant.etudiant.nom}</div>
                      <div><strong className="text-gray-700">Prénom:</strong> {detailEtudiant.etudiant.prenom}</div>
                      <div><strong className="text-gray-700">Email:</strong> {detailEtudiant.etudiant.email || '-'}</div>
                      <div><strong className="text-gray-700">Matricule:</strong> {detailEtudiant.etudiant.matricule || '-'}</div>
                      <div><strong className="text-gray-700">Téléphone:</strong> {detailEtudiant.etudiant.telephone || '-'}</div>
                      <div className="col-span-2">
                        <strong className="text-gray-700">Centre:</strong> {detailEtudiant.etudiant.centre_nom || getCentreName(detailEtudiant.etudiant.centre_id)}
                      </div>

                      <div className="col-span-2">
                        <strong className="text-gray-700">Statut:</strong>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium ${detailEtudiant.etudiant.statut === 'actif'
                            ? 'bg-green-100 text-green-800'
                            : detailEtudiant.etudiant.statut === 'quitte'
                              ? 'bg-yellow-100 text-yellow-800'
                              : detailEtudiant.etudiant.statut === 'fini'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                            {detailEtudiant.etudiant.statut === 'fini' && <FaCheck className="mr-0.5 text-[8px]" />}
                            {detailEtudiant.etudiant.statut || 'Non défini'}
                          </span>
                          <span className="text-gray-500 text-[10px] italic ml-1">
                            (calculé automatiquement)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Résumé ultra compact */}
                  <div className="space-y-2 mb-3">
                    <h3 className="text-xs font-medium text-gray-900 flex items-center">
                      <FaGraduationCap className="mr-1 text-green-600 text-[10px]" />
                      Résumé
                    </h3>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="bg-blue-50 p-1 rounded text-center">
                        <FaGraduationCap className="w-3 h-3 text-blue-600 mx-auto mb-0.5" />
                        <div className="text-xs font-bold text-blue-700">{detailEtudiant.inscriptions.length}</div>
                        <div className="text-xs text-blue-600">Inscriptions</div>
                      </div>

                      <div className="bg-purple-50 p-1 rounded text-center">
                        <FaMoneyBillWave className="w-3 h-3 text-purple-600 mx-auto mb-0.5" />
                        <div className="text-xs font-bold text-purple-700">
                          {detailEtudiant.paiements.filter(p => p.type_paiement === 'droits').length}
                        </div>
                        <div className="text-xs text-purple-600">Droits payés</div>
                      </div>
                    </div>
                  </div>

                  {/* Historique des paiements */}
                  {detailEtudiant.paiements.length > 0 && (
                    <div className="mb-3">
                      <h3 className="text-xs font-medium text-gray-900 mb-1 flex items-center">
                        <FaMoneyBillWave className="mr-1 text-blue-600 text-[10px]" />
                        Historique des paiements
                      </h3>
                      <div className="space-y-1">
                        {detailEtudiant.paiements
                          .sort((a, b) => new Date(b.date_paiement) - new Date(a.date_paiement))
                          .map((paiement) => (
                            <div key={paiement.id} className="flex justify-between items-center text-[10px] bg-gray-50 rounded px-2 py-0.5">
                              <div>
                                <div className="font-medium text-gray-700">
                                  {paiement.type_paiement === 'formation'
                                    ? `Mensualité ${paiement.mois_paye}`
                                    : paiement.type_paiement === 'droits'
                                      ? 'Droits d\'inscription'
                                      : paiement.type_paiement
                                  }
                                </div>
                                <div className="text-gray-500 text-[9px]">
                                  {new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{paiement.montant?.toLocaleString()} Ar</div>
                                <div className="text-green-600 text-[9px]">✓ Payé</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Inscriptions & Paiements compacts */}
                  {detailEtudiant.inscriptions.length > 0 && (
                    <div className="mb-3">
                      <h3 className="text-xs font-medium text-gray-900 mb-1 flex items-center">
                        <FaGraduationCap className="mr-1 text-yellow-600 text-[10px]" />
                        Inscriptions
                      </h3>
                      <div className="space-y-1">
                        {detailEtudiant.inscriptions.map((insc) => {
                          const formationFinie = isFormationFinishedByDate(
                            insc.date_inscription,
                            insc.formations?.duree
                          );

                          return (
                            <div key={insc.id} className="border border-gray-200 rounded p-1">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="font-semibold text-gray-900 text-[10px]">
                                  {insc.formations?.nom || 'Formation inconnue'}
                                </h4>
                                <div className="flex items-center gap-1">
                                  {formationFinie && (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                                      <FaCheck className="mr-0.5 text-[8px]" />
                                      Formation finie
                                    </span>
                                  )}
                                  {!formationFinie && (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                                      <FaClock className="mr-0.5 text-[8px]" />
                                      En cours
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Mensualités */}
                              {insc.formations?.duree > 0 && (
                                <div className="mt-1">
                                  <div className="text-[10px] text-gray-700 font-medium mb-1">
                                    Progression: {insc.paiements?.filter(p => p.type_paiement === 'formation').length || 0}/{insc.formations.duree} mois
                                  </div>
                                  <div className="space-y-1">
                                    {generateMoisFormation(insc.date_inscription, insc.formations.duree).map((mois) => {
                                      const paiementsCeMois = insc.paiements?.filter(p =>
                                        p.type_paiement === 'formation' && p.mois_paye === mois
                                      ) || [];

                                      const totalPaye = paiementsCeMois.reduce((sum, p) => sum + (p.montant || 0), 0);
                                      const fraisMensuel = insc.formations.frais_mensuel || 0;
                                      const reste = Math.max(0, fraisMensuel - totalPaye);
                                      const estPayeTotalement = reste === 0;

                                      return (
                                        <div key={mois} className={`flex items-center justify-between text-[10px] rounded px-2 py-1 mb-1 ${estPayeTotalement ? 'bg-green-50' : 'bg-gray-50'
                                          }`}>
                                          <div className="text-gray-700">{mois}</div>
                                          <div className="text-right flex flex-col items-end">
                                            <div className="font-semibold">
                                              {estPayeTotalement ? (
                                                <span className="text-green-700">{totalPaye.toLocaleString()} Ar</span>
                                              ) : (
                                                <span className="text-gray-700">
                                                  {totalPaye > 0 ? `${totalPaye.toLocaleString()} / ${fraisMensuel.toLocaleString()} Ar` : `${fraisMensuel.toLocaleString()} Ar`}
                                                </span>
                                              )}
                                            </div>

                                            {estPayeTotalement ? (
                                              <div className="flex items-center text-green-600 text-[9px]">
                                                <FaCheck className="mr-0.5 w-2 h-2" /> Payé
                                              </div>
                                            ) : (
                                              <div className="text-[9px] font-medium text-orange-600">
                                                Il reste {reste.toLocaleString()} Ar à payer
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200 text-right">
                    <button
                      onClick={() => setDetailEtudiant(null)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-0.5 rounded text-xs transition duration-200"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Etudiants;