import React, { useState, useEffect, useRef } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSyncAlt,
  FaSearch,
  FaBook,
  FaFilter,
  FaEllipsisV
} from "react-icons/fa";
import { getLivres, createLivre, updateLivre, deleteLivre, searchLivres } from "../api/services/livresService";
import { API_URL } from '../config';

const API_URL_FORMATIONS = `${API_URL}/api/formations`;

const Livres = () => {
  const [livres, setLivres] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormation, setFilterFormation] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(null);

  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    nom: '',
    prix: '',
    formation_id: ''
  });

  useEffect(() => {
    fetchLivres();
    fetchFormations();
  }, []);

  const fetchLivres = async () => {
    try {
      setLoading(true);
      const data = await getLivres();
      setLivres(data);
      setMessage('');
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormations = async () => {
    try {
      const response = await fetch(API_URL_FORMATIONS);
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      setFormations(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const data = await searchLivres(
        searchTerm || null,
        filterFormation || null
      );
      setLivres(data);
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (livre) => {
    setFormData({
      nom: livre.nom,
      prix: livre.prix,
      formation_id: livre.formation_id
    });
    setEditingId(livre.id);
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nom || !formData.prix || !formData.formation_id) {
      setMessage('Tous les champs sont requis');
      return;
    }

    const prixNum = parseFloat(formData.prix);
    if (isNaN(prixNum) || prixNum < 0) {
      setMessage('Le prix doit être positif');
      return;
    }

    try {
      setLoadingAction(true);
      const payload = {
        nom: formData.nom,
        prix: prixNum,
        formation_id: parseInt(formData.formation_id)
      };

      if (editingId) {
        await updateLivre(editingId, payload);
        setMessage('Livre mis à jour');
      } else {
        await createLivre(payload);
        setMessage('Livre créé');
      }

      setFormData({ nom: '', prix: '', formation_id: '' });
      setEditingId(null);
      setShowForm(false);
      fetchLivres();
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('Erreur lors de l\'opération');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce livre ?')) return;

    try {
      setLoadingAction(true);
      await deleteLivre(id);
      setMessage('Livre supprimé');
      fetchLivres();
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('Erreur suppression');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancel = () => {
    setFormData({ nom: '', prix: '', formation_id: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const getFormationNom = (formationId) => {
    const formation = formations.find(f => f.id === formationId);
    return formation ? formation.nom : 'N/A';
  };

  const filteredLivres = livres.filter(livre => {
    const matchesSearch = !searchTerm ||
      livre.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterFormation ||
      livre.formation_id.toString() === filterFormation;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => a.nom.localeCompare(b.nom));

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      {/* En-tête compact */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <FaBook className="text-blue-600 text-sm" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-base">Livres</h1>
              <p className="text-xs text-gray-500">
                {livres.length} livre{livres.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium"
          >
            <FaPlus size={12} />
            <span className="hidden xs:inline">Nouveau</span>
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-2 p-2 rounded-lg text-xs ${
            message.includes('Erreur') || message.includes('Supprimé') 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span>{message}</span>
              <button 
                onClick={() => setMessage('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire compact */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-3 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-800 text-sm">
              {editingId ? 'Modifier le livre' : 'Nouveau livre'}
            </h3>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <FaTimes size={14} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleInputChange}
              placeholder="Nom du livre"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                name="prix"
                value={formData.prix}
                onChange={handleInputChange}
                placeholder="Prix"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
              <select
                name="formation_id"
                value={formData.formation_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="">Formation</option>
                {formations.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loadingAction}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                {loadingAction ? '...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="mb-3">
        <div className="flex gap-2 mb-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-sm" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-300 text-gray-600'}`}
              title="Filtres"
            >
              <FaFilter size={14} />
            </button>
            <button
              onClick={fetchLivres}
              disabled={loading}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              title="Rafraîchir"
            >
              <FaSyncAlt size={14} className={`${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="bg-white border border-gray-300 rounded-lg p-2 mb-2">
            <select
              value={filterFormation}
              onChange={(e) => setFilterFormation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Toutes les formations</option>
              {formations.map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grille des livres - style "bibliothèque" */}
      {loading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Chargement...</p>
        </div>
      ) : filteredLivres.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <FaBook className="text-gray-400 text-base" />
          </div>
          <p className="text-gray-700 font-medium text-sm">Aucun livre trouvé</p>
          <p className="text-gray-500 text-xs mt-1">
            {searchTerm || filterFormation ? 'Modifiez vos critères' : 'Ajoutez un livre'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredLivres.map((livre) => (
            <div
              key={livre.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative group"
            >
              {/* Partie supérieure - imitation couverture */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-24 flex items-center justify-center p-2">
                <FaBook className="text-white text-3xl opacity-80" />
              </div>
              
              {/* Contenu */}
              <div className="p-2">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2" title={livre.nom}>
                  {livre.nom}
                </h4>
                <p className="text-xs text-gray-600 mb-1 truncate">
                  {getFormationNom(livre.formation_id)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-green-600">
                    {parseFloat(livre.prix).toLocaleString('fr-FR')} Ar
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(livre.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Menu actions au survol */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative">
                  <button
                    onClick={() => setShowActions(showActions === livre.id ? null : livre.id)}
                    className="p-1.5 bg-white rounded-full shadow-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                    <FaEllipsisV size={12} />
                  </button>

                  {showActions === livre.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowActions(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-50 min-w-[130px]">
                        <button
                          onClick={() => {
                            handleEdit(livre);
                            setShowActions(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                        >
                          <FaEdit className="text-blue-600" size={12} />
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(livre.id);
                            setShowActions(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          <FaTrash size={12} />
                          Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton flottant pour mobile */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition md:hidden z-30"
        >
          <FaPlus size={16} />
        </button>
      )}
    </div>
  );
};

export default Livres;