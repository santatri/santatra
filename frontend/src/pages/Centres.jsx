import React, { useState, useEffect, useRef } from "react";
import {
  FaBuilding,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaSearch,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaArrowUp,
  FaSyncAlt
} from "react-icons/fa";
import { API_URL } from '../config';

// API URL
const API_URL1 = `${API_URL}/api/centres`;

// Bouton de rafraîchissement intégré
const RefreshButton = ({ onClick, loading = false, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg font-medium transition duration-200 shadow-sm text-xs md:text-sm ${className}`}
      title="Rafraîchir"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-gray-800"></div>
      ) : (
        <FaSyncAlt className="mr-1 md:mr-2" />
      )}
      <span className="hidden sm:inline">Rafraîchir</span>
    </button>
  );
};

const Centres = () => {
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [idEdit, setIdEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [centres, setCentres] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const formRef = useRef(null);

  // Fonctions API directes (pas besoin de service séparé)
  const fetchCentres = async () => {
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
      setCentres(data);
    } catch (error) {
      console.error("Erreur lors du chargement des centres:", error);
      showMessage('error', 'Erreur lors du chargement des centres');
    }
  };

  const createCentre = async (centreData) => {
    try {
      const response = await fetch(API_URL1, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(centreData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création');
      }

      return data;
    } catch (error) {
      console.error('Erreur dans createCentre:', error);
      throw error;
    }
  };

  const updateCentre = async (id, centreData) => {
    try {
      const response = await fetch(`${API_URL1}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(centreData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la mise à jour');
      }

      return data;
    } catch (error) {
      console.error('Erreur dans updateCentre:', error);
      throw error;
    }
  };

  const deleteCentre = async (id) => {
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
      console.error('Erreur dans deleteCentre:', error);
      throw error;
    }
  };

  // Charger les centres
  useEffect(() => {
    fetchCentres();
  }, []);

  // Gestion du scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll vers le formulaire
  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Gestion des messages
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Trier les centres par nom
  const sortedCentres = [...centres].sort((a, b) => {
    const nameA = a.nom.toLowerCase();
    const nameB = b.nom.toLowerCase();
    if (sortDirection === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  // Filtrer les centres
  const filteredCentres = sortedCentres.filter(centre =>
    centre.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (centre.adresse && centre.adresse.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filteredCentres.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCentres = filteredCentres.slice(indexOfFirstItem, indexOfLastItem);

  // Ajouter ou modifier un centre
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!nom.trim()) {
      showMessage('warning', 'Le nom du centre est obligatoire');
      setLoading(false);
      return;
    }

    try {
      if (idEdit) {
        await updateCentre(idEdit, { nom, adresse });
        showMessage('success', 'Centre mis à jour avec succès!');
      } else {
        await createCentre({ nom, adresse });
        showMessage('success', 'Centre créé avec succès!');
      }

      // Réinitialiser
      setNom("");
      setAdresse("");
      setIdEdit(null);
      setShowForm(false);
      fetchCentres();
    } catch (error) {
      showMessage('error', idEdit ? 'Erreur lors de la modification' : 'Erreur lors de la création');
      console.error("Erreur:", error);
    }

    setLoading(false);
  };

  // Supprimer un centre
  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce centre ? Cette action est irréversible.")) return;

    try {
      await deleteCentre(id);
      showMessage('success', 'Centre supprimé avec succès!');
      fetchCentres();
      setCurrentPage(1);
    } catch (error) {
      showMessage('error', 'Erreur lors de la suppression');
      console.error("Erreur:", error);
    }
  };

  // Remplir le formulaire pour modifier
  const handleEdit = (centre) => {
    setNom(centre.nom);
    setAdresse(centre.adresse || "");
    setIdEdit(centre.id);
    setShowForm(true);

    // Défilement vers le formulaire après un court délai
    setTimeout(() => {
      scrollToForm();
    }, 50);
  };

  const cancelEdit = () => {
    setNom("");
    setAdresse("");
    setIdEdit(null);
    setShowForm(false);
  };

  // Trier par ordre alphabétique
  const toggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Scroll vers le haut
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header avec stats */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center">
                <FaBuilding className="mr-2 text-blue-600 text-base md:text-lg" />
                Centres
              </h1>
              <p className="text-gray-600 text-xs md:text-sm mt-0.5">
                {filteredCentres.length} centre{filteredCentres.length !== 1 ? 's' : ''} {searchTerm && '(filtré)'}
              </p>
            </div>

            <div className="flex gap-2">
              <RefreshButton onClick={fetchCentres} loading={loading} />
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  if (!showForm) {
                    setIdEdit(null);
                    setNom("");
                    setAdresse("");
                    setTimeout(() => scrollToForm(), 50);
                  }
                }}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition duration-200 shadow-sm text-xs md:text-sm"
              >
                {showForm ? (
                  <>
                    <FaTimes className="mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Fermer</span>
                  </>
                ) : (
                  <>
                    <FaPlus className="mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Nouveau centre</span>
                    <span className="sm:hidden">Ajouter</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Message Alert */}
          {message.type && (
            <div className={`mb-3 p-3 rounded-lg animate-fade-in ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
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

          {/* Barre de recherche */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm md:text-base" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm md:text-base"
              placeholder="Rechercher un centre ou une adresse..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition duration-150"
              >
                <FaTimes className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Formulaire - Référence pour le scroll */}
        <div ref={formRef}>
          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6 animate-slide-down">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
                  <FaBuilding className="mr-2 text-blue-600" />
                  {idEdit ? "Modifier le centre" : "Nouveau centre"}
                </h2>
                <button
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <FaTimes className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm md:text-base"
                    placeholder="Ex: Centre de Formation Paris"
                    required
                    autoFocus={showForm}
                  />
                </div>

                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <textarea
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    className="w-full px-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-sm md:text-base min-h-[80px]"
                    placeholder="Adresse complète du centre"
                    rows="3"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
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
                    ) : idEdit ? (
                      <>
                        <FaSave className="mr-2" />
                        Mettre à jour
                      </>
                    ) : (
                      <>
                        <FaPlus className="mr-2" />
                        Créer le centre
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bouton de retour en haut */}
        {showScrollToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition duration-200 z-50"
            aria-label="Retour en haut"
          >
            <FaArrowUp className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}

        {/* Liste des centres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-3 md:px-4 py-3 md:py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
                <FaBuilding className="mr-2 text-blue-600" />
                Liste des centres
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {filteredCentres.length}
                </span>
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSort}
                  className="flex items-center text-gray-600 hover:text-gray-900 text-xs md:text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition duration-200"
                  title={sortDirection === 'asc' ? 'Tri A → Z' : 'Tri Z → A'}
                >
                  {sortDirection === 'asc' ? (
                    <FaSortAlphaDown className="mr-1.5" />
                  ) : (
                    <FaSortAlphaUp className="mr-1.5" />
                  )}
                  <span className="hidden sm:inline">Trier</span>
                  <span className="sm:hidden">Tri</span>
                </button>
              </div>
            </div>
          </div>

          {currentCentres.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du centre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentCentres.map((centre) => (
                      <tr key={centre.id} className="hover:bg-blue-50 transition duration-150">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            #{centre.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{centre.nom}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600 max-w-md">
                            {centre.adresse || (
                              <span className="text-gray-400 italic">Non renseignée</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(centre)}
                              className="inline-flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-200 hover:scale-105 active:scale-95"
                              title="Modifier ce centre"
                            >
                              <FaEdit className="mr-1.5" />
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(centre.id)}
                              className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-200 hover:scale-105 active:scale-95"
                              title="Supprimer ce centre"
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
                {currentCentres.map((centre) => (
                  <div key={centre.id} className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200 hover:border-blue-300 transition duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-900 bg-gray-200 px-2 py-0.5 rounded">
                            #{centre.id}
                          </span>
                          <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                            {centre.nom}
                          </h3>
                        </div>

                        <div className="text-xs md:text-sm text-gray-600 mb-3">
                          {centre.adresse ? (
                            <>
                              <FaBuilding className="inline mr-1 text-gray-400" />
                              {centre.adresse}
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Aucune adresse renseignée</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(centre)}
                        className="flex-1 inline-flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-xs font-medium transition duration-200 hover:scale-105 active:scale-95"
                      >
                        <FaEdit className="mr-1.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(centre.id)}
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
              <FaBuilding className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm md:text-base mb-2">
                {searchTerm ? "Aucun centre ne correspond à votre recherche" : "Aucun centre trouvé"}
              </p>
              <p className="text-gray-400 text-xs md:text-sm mb-4">
                {searchTerm ? "Essayez avec d'autres termes" : "Commencez par créer votre premier centre"}
              </p>
              <button
                onClick={() => {
                  setShowForm(true);
                  setIdEdit(null);
                  setNom("");
                  setAdresse("");
                  setTimeout(() => scrollToForm(), 50);
                }}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 text-sm md:text-base"
              >
                <FaPlus className="mr-2" />
                Créer un centre
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-3 md:px-4 py-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs md:text-sm text-gray-600">
                  Page {currentPage} sur {totalPages} •
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredCentres.length)} sur {filteredCentres.length} centres
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

      {/* Styles pour les animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Centres;