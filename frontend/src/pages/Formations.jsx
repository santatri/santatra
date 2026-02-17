import React, { useState, useEffect, useRef } from "react";
import {
  FaPlus,
  FaList,
  FaEdit,
  FaTrash,
  FaGraduationCap,
  FaClock,
  FaMoneyBillWave,
  FaTimes,
  FaSave,
  FaSyncAlt,
  FaSearch
} from "react-icons/fa";
import { API_URL } from '../config';

// API URL
const API_URL1 = `${API_URL}/api/formations`;

// Fonction pour afficher la durée de manière lisible
const formatDuree = (duree) => {
  const mois = Math.floor(duree);
  const semaines = Math.round((duree - mois) * 4);

  if (duree === 0.25) return "1 semaine";
  if (duree === 0.5) return "2 semaines";
  if (duree === 0.75) return "3 semaines";
  if (duree === 1.5) return "1 mois et demi";

  if (semaines === 0) return `${mois} mois`;
  if (mois === 0) return `${semaines} semaine${semaines > 1 ? 's' : ''}`;

  return `${mois} mois et ${semaines} semaine${semaines > 1 ? 's' : ''}`;
};

// Bouton de rafraîchissement intégré
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

const Formations = () => {
  // États pour les formations
  const [formations, setFormations] = useState([]);
  const [nomF, setNomF] = useState("");
  const [duree, setDuree] = useState("");
  const [frais, setFrais] = useState("");
  const [idEditF, setIdEditF] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showFormFormation, setShowFormFormation] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const topRef = useRef(null);

  // Fonctions API directes
  const fetchFormations = async () => {
    try {
      const response = await fetch(API_URL1, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setFormations(data);
    } catch (error) {
      console.error("Erreur lors du chargement des formations:", error);
      showMessage('error', 'Erreur lors du chargement des formations');
    }
  };

  const createFormation = async (formationData) => {
    try {
      const response = await fetch(API_URL1, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formationData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création');
      }

      return data;
    } catch (error) {
      console.error('Erreur dans createFormation:', error);
      throw error;
    }
  };

  const updateFormation = async (id, formationData) => {
    try {
      const response = await fetch(`${API_URL1}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formationData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la mise à jour');
      }

      return data;
    } catch (error) {
      console.error('Erreur dans updateFormation:', error);
      throw error;
    }
  };

  const deleteFormation = async (id) => {
    try {
      const response = await fetch(`${API_URL1}/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression');
      }

      return data;
    } catch (error) {
      console.error('Erreur dans deleteFormation:', error);
      throw error;
    }
  };

  // Charger les formations au démarrage
  useEffect(() => {
    fetchFormations();
  }, []);

  // Gestion des messages
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Filtrer les formations
  const filteredFormations = formations.filter(formation =>
    formation.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formation.duree.toString().includes(searchTerm) ||
    formation.frais_mensuel.toString().includes(searchTerm)
  ).sort((a, b) => a.nom.localeCompare(b.nom));

  // Pagination
  const totalPages = Math.ceil(filteredFormations.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFormations = filteredFormations.slice(indexOfFirstItem, indexOfLastItem);

  // CRUD Formations
  const handleSubmitFormation = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!nomF.trim()) {
      showMessage('warning', 'Le nom de la formation est obligatoire');
      setLoading(false);
      return;
    }

    if (!duree || parseFloat(duree) <= 0) {
      showMessage('warning', 'La durée doit être supérieure à 0');
      setLoading(false);
      return;
    }

    if (!frais || parseFloat(frais) < 0) {
      showMessage('warning', 'Les frais mensuels sont invalides');
      setLoading(false);
      return;
    }

    try {
      if (idEditF) {
        await updateFormation(idEditF, {
          nom: nomF,
          duree: parseFloat(duree),
          frais_mensuel: parseFloat(frais)
        });
        showMessage('success', 'Formation mise à jour avec succès!');
      } else {
        await createFormation({
          nom: nomF,
          duree: parseFloat(duree),
          frais_mensuel: parseFloat(frais)
        });
        showMessage('success', 'Formation créée avec succès!');
      }

      // Réinitialiser
      setNomF("");
      setDuree("");
      setFrais("");
      setIdEditF(null);
      setShowFormFormation(false);
      fetchFormations();
    } catch (error) {
      showMessage('error', idEditF ? 'Erreur lors de la modification' : 'Erreur lors de la création');
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFormation = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette formation ? Cette action est irréversible.")) return;

    try {
      await deleteFormation(id);
      showMessage('success', 'Formation supprimée avec succès!');
      fetchFormations();
      setCurrentPage(1);
    } catch (error) {
      showMessage('error', 'Erreur lors de la suppression');
      console.error("Erreur:", error);
    }
  };

  const handleEditFormation = (f) => {
    setNomF(f.nom);
    setDuree(f.duree);
    setFrais(f.frais_mensuel);
    setIdEditF(f.id);
    setShowFormFormation(true);

    // Défilement vers le haut
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const cancelEditFormation = () => {
    setNomF("");
    setDuree("");
    setFrais("");
    setIdEditF(null);
    setShowFormFormation(false);
  };

  const toggleFormFormation = () => {
    setShowFormFormation(!showFormFormation);
    if (!showFormFormation) {
      setNomF("");
      setDuree("");
      setFrais("");
      setIdEditF(null);
    }
  };

  // Formater les montants
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div ref={topRef} className="min-h-screen bg-gray-50 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center">
            <FaGraduationCap className="mr-2 text-blue-600 text-base md:text-lg" />
            Formations
          </h1>
          <p className="text-gray-600 mt-1 text-xs md:text-sm">
            Gestion des formations et programmes
          </p>
        </div>

        {/* Message Alert */}
        {message.type && (
          <div className={`mb-3 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
            message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
              'bg-yellow-50 border border-yellow-200 text-yellow-700'
            }`}>
            <div className="flex items-center">
              {message.type === 'success' && <FaSave className="mr-2 flex-shrink-0 text-sm" />}
              {message.type === 'error' && <FaTimes className="mr-2 flex-shrink-0 text-sm" />}
              {message.type === 'warning' && <FaTimes className="mr-2 flex-shrink-0 text-sm" />}
              <span className="text-xs md:text-sm">{message.text}</span>
            </div>
          </div>
        )}

        {/* Header avec recherche */}
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
                <FaGraduationCap className="mr-1 text-blue-600" />
                Formations ({filteredFormations.length})
              </h2>
            </div>

            <div className="flex gap-2">
              <RefreshButton onClick={fetchFormations} loading={loading} />
              <button
                onClick={toggleFormFormation}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition duration-200 shadow-sm text-xs md:text-sm"
              >
                {showFormFormation ? (
                  <>
                    <FaTimes className="mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Fermer</span>
                  </>
                ) : (
                  <>
                    <FaPlus className="mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Nouvelle formation</span>
                    <span className="sm:hidden">Ajouter</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm"
              placeholder="Rechercher une formation..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition duration-150"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Formulaire Formation */}
        {showFormFormation && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
                <FaGraduationCap className="mr-2 text-blue-600" />
                {idEditF ? "Modifier la formation" : "Nouvelle formation"}
              </h2>
              <button
                onClick={cancelEditFormation}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FaTimes className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFormation} className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-sm md:text-base font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomF}
                  onChange={(e) => setNomF(e.target.value)}
                  className="w-full px-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm md:text-base"
                  placeholder="Ex: Développement Web Fullstack"
                  required
                  autoFocus={showFormFormation}
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-gray-700 mb-1">
                  Durée (mois) <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    (0.25 = 1 semaine, 0.5 = 2 semaines, 1.5 = 1 mois et demi)
                  </span>
                </label>
                <input
                  type="number"
                  value={duree}
                  onChange={(e) => setDuree(e.target.value)}
                  min="0.25"
                  step="0.25"
                  className="w-full px-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm md:text-base"
                  placeholder="Ex: 6.0 pour 6 mois"
                  required
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-gray-700 mb-1">
                  Frais mensuel (Ar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={frais}
                  onChange={(e) => setFrais(e.target.value)}
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm md:text-base"
                  placeholder="Ex: 120000"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelEditFormation}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg font-medium transition duration-200 text-sm md:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg font-medium transition duration-200 text-sm md:text-base flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white"></div>
                  ) : idEditF ? (
                    <>
                      <FaSave className="mr-2" />
                      Mettre à jour
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-2" />
                      Créer la formation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des formations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-3 md:px-4 py-3 md:py-4 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
              <FaList className="mr-2 text-blue-600" />
              Liste des formations
            </h2>
          </div>

          {currentFormations.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durée</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frais mensuel</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total formation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentFormations.map((f) => (
                      <tr key={f.id} className="hover:bg-blue-50 transition duration-150">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            #{f.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{f.nom}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <FaClock className="mr-2 text-gray-400" />
                            {formatDuree(f.duree)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <FaMoneyBillWave className="mr-2 text-gray-400" />
                            {formatCurrency(f.frais_mensuel)} Ar
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-blue-600">
                            {formatCurrency(f.frais_mensuel * f.duree)} Ar
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditFormation(f)}
                              className="inline-flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-200 hover:scale-105 active:scale-95"
                              title="Modifier cette formation"
                            >
                              <FaEdit className="mr-1.5" />
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDeleteFormation(f.id)}
                              className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-200 hover:scale-105 active:scale-95"
                              title="Supprimer cette formation"
                            >
                              <FaTrash className="mr-1.5" />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-2 p-3 md:p-4">
                {currentFormations.map((f) => (
                  <div key={f.id} className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200 hover:border-blue-300 transition duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-900 bg-gray-200 px-2 py-0.5 rounded">
                            #{f.id}
                          </span>
                          <h3 className="text-sm md:text-base font-semibold text-gray-900">
                            {f.nom}
                          </h3>
                        </div>

                        <div className="space-y-2 text-xs md:text-sm text-gray-600">
                          <div className="flex items-center">
                            <FaClock className="mr-2 text-gray-400 flex-shrink-0" />
                            <span>Durée: {formatDuree(f.duree)}</span>
                          </div>
                          <div className="flex items-center">
                            <FaMoneyBillWave className="mr-2 text-gray-400 flex-shrink-0" />
                            <span>Frais mensuel: {formatCurrency(f.frais_mensuel)} Ar</span>
                          </div>
                          <div className="font-semibold text-blue-600">
                            Total: {formatCurrency(f.frais_mensuel * f.duree)} Ar
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleEditFormation(f)}
                        className="flex-1 inline-flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-xs font-medium transition duration-200 hover:scale-105 active:scale-95"
                      >
                        <FaEdit className="mr-1.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteFormation(f.id)}
                        className="flex-1 inline-flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-medium transition duration-200 hover:scale-105 active:scale-95"
                      >
                        <FaTrash className="mr-1.5" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 md:py-12">
              <FaGraduationCap className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm md:text-base mb-2">
                {searchTerm ? "Aucune formation ne correspond à votre recherche" : "Aucune formation trouvée"}
              </p>
              <p className="text-gray-400 text-xs md:text-sm mb-4">
                {searchTerm ? "Essayez avec d'autres termes" : "Commencez par créer votre première formation"}
              </p>
              <button
                onClick={() => {
                  setShowFormFormation(true);
                  setIdEditF(null);
                  setNomF("");
                  setDuree("");
                  setFrais("");
                }}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 text-sm md:text-base"
              >
                <FaPlus className="mr-2" />
                Créer une formation
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-3 md:px-4 py-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs md:text-sm text-gray-600">
                  Page {currentPage} sur {totalPages} •
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredFormations.length)} sur {filteredFormations.length} formations
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs md:text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition duration-200"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs md:text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition duration-200"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Formations;