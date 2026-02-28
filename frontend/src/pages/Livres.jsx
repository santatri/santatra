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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 italic-prevent">
      {/* Header Compact Premium */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-blue-600">
              <FaBook size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">Catalogue</h1>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[9px] font-bold uppercase tracking-wider border border-blue-100/50">
                  {livres.length} Ouvrage{livres.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm) {
                setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              }
            }}
            className="flex items-center gap-2 bg-slate-900 text-white pl-3.5 pr-4 py-2 rounded-xl text-[11px] font-bold hover:bg-blue-600 transition-all duration-300 shadow-lg shadow-slate-200 active:scale-95"
          >
            <FaPlus size={10} />
            <span>NOUVEAU</span>
          </button>
        </div>

        {/* Messaging Area */}
        <div className="mt-2 h-8">
          {message && (
            <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-300 ${message.includes('Erreur') || message.includes('Supprimé')
              ? 'bg-red-50 text-red-700 border-red-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
              <span className="text-[10px] font-bold uppercase tracking-wide">{message}</span>
              <button onClick={() => setMessage('')} className="hover:opacity-60"><FaTimes size={10} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Formulaire Compact */}
      <div className="max-w-6xl mx-auto px-4">
        {showForm && (
          <div ref={formRef} className="bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 mb-6 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded flex items-center justify-center text-white ${editingId ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                  {editingId ? <FaEdit size={12} /> : <FaPlus size={12} />}
                </div>
                <h3 className="font-bold text-slate-800 text-xs tracking-tight uppercase">
                  {editingId ? 'Modifier' : 'Ajouter'}
                </h3>
              </div>
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
                <FaTimes size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Désignation</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    placeholder="Nom du livre"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Prix (AR)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="prix"
                      value={formData.prix}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">AR</span>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Formation</label>
                  <select
                    name="formation_id"
                    value={formData.formation_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition-all"
                    required
                  >
                    <option value="">Choisir...</option>
                    {formations.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50 mt-4">
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="flex-[2] bg-blue-600 text-white py-2.5 rounded-lg text-[11px] font-black tracking-widest hover:bg-blue-700 transition-all uppercase disabled:opacity-50"
                >
                  {loadingAction ? '...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg text-[11px] font-black tracking-widest hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Discovery Area Compact */}
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <div className="flex gap-2">
          <div className="flex-[3] relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="w-full h-11 pl-10 pr-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium shadow-sm focus:border-blue-300 outline-none transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          </div>

          <div className="hidden sm:block flex-[1.5] relative">
            <select
              value={filterFormation}
              onChange={(e) => setFilterFormation(e.target.value)}
              className="w-full h-11 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm focus:border-blue-300 outline-none appearance-none transition-all cursor-pointer"
            >
              <option value="">FORMATION</option>
              {formations.map(f => (
                <option key={f.id} value={f.id}>{f.nom.toUpperCase()}</option>
              ))}
            </select>
            <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          </div>

          <button
            onClick={fetchLivres}
            disabled={loading}
            className="h-11 w-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all disabled:opacity-50"
          >
            <FaSyncAlt size={14} className={`${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* List Area Compact */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest">Calcul...</p>
          </div>
        ) : filteredLivres.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <FaBook className="text-slate-100 mx-auto mb-2" size={32} />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Catalogue Vide</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLivres.map((livre) => (
              <div
                key={livre.id}
                className="group bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex items-center gap-4"
              >
                {/* Visual Thumbnail */}
                <div className="w-14 h-20 bg-slate-50 rounded-lg overflow-hidden relative flex-shrink-0 border border-slate-200/50 flex items-center justify-center">
                  <FaBook className="text-slate-200 text-xl group-hover:text-blue-200 transition-colors" />
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/10"></div>
                </div>

                {/* Info Center */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase truncate max-w-[150px]">
                      {getFormationNom(livre.formation_id)}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                    {livre.nom.toUpperCase()}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">#{livre.id} • Ajouté le {new Date(livre.created_at).toLocaleDateString('fr-FR')}</p>
                </div>

                {/* Compact Pricing */}
                <div className="px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center min-w-[100px]">
                  <p className="text-[8px] font-black text-emerald-500 uppercase mb-0.5">PRIX</p>
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="font-black text-emerald-700 text-sm">
                      {parseFloat(livre.prix).toLocaleString('fr-FR')}
                    </span>
                    <span className="text-[9px] font-black text-emerald-500">AR</span>
                  </div>
                </div>

                {/* Actions Discrete */}
                <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
                  <button
                    onClick={() => handleEdit(livre)}
                    className="w-9 h-9 flex items-center justify-center bg-white text-slate-600 rounded-lg hover:text-amber-600 hover:shadow-sm transition-all"
                    title="EDIT"
                  >
                    <FaEdit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(livre.id)}
                    className="w-9 h-9 flex items-center justify-center bg-white text-slate-400 hover:text-red-600 hover:shadow-sm transition-all"
                    title="DELETE"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Livres;
