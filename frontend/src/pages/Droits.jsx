import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { FiEdit2, FiSave, FiX, FiDollarSign, FiRefreshCw } from 'react-icons/fi';

const Droits = () => {
  const [droit, setDroit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ montant: '' });
  const [message, setMessage] = useState('');
  const API_BASE = `${API_URL}/api`;

  const fetchDroit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/droits`);
      if (!res.ok) throw new Error('Erreur chargement');
      const json = await res.json();
      // On suppose qu'il n'y a qu'un seul droit
      const firstDroit = json.data?.[0] || null;
      setDroit(firstDroit);
      if (firstDroit) {
        setForm({ montant: firstDroit.montant });
      }
    } catch (e) {
      console.error(e);
      setMessage('Erreur lors du chargement');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchDroit(); 
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!droit) {
      setMessage('Aucun droit à modifier');
      return;
    }
    
    const montant = parseFloat(form.montant);
    if (isNaN(montant)) { 
      setMessage('Montant invalide'); 
      return; 
    }
    
    if (montant === parseFloat(droit.montant)) {
      setEditing(false);
      setMessage('Aucune modification détectée');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/droits/${droit.id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ montant }) 
      });
      
      if (!res.ok) { 
        const err = await res.json().catch(() => ({})); 
        throw new Error(err.message || 'Erreur serveur'); 
      }
      
      setDroit({ ...droit, montant });
      setEditing(false);
      setMessage('Droit d\'inscription mis à jour avec succès');
      
      // Effacer le message après 3 secondes
      setTimeout(() => setMessage(''), 3000);
      
    } catch (err) { 
      console.error(err); 
      setMessage(err.message || 'Erreur lors de la mise à jour'); 
    }
  };

  const handleCancel = () => {
    setEditing(false);
    if (droit) {
      setForm({ montant: droit.montant });
    }
    setMessage('');
  };

  const formatMontant = (montant) => {
    return Number(montant).toLocaleString('fr-FR') + ' Ar';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        
        {/* En-tête */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-3">
            <FiDollarSign className="text-blue-600 text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            Droit d'inscription
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Modifier le montant du droit d'inscription
          </p>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          
          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
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
                  <FiX />
                </button>
              </div>
            </div>
          )}

          {/* État de chargement */}
          {loading ? (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-3 text-gray-500">Chargement...</p>
            </div>
          ) : !droit ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiDollarSign className="text-gray-400 text-2xl" />
              </div>
              <p className="text-gray-700 font-medium">Aucun droit configuré</p>
              <p className="text-gray-500 text-sm mt-1">
                Contactez l'administrateur pour configurer le droit d'inscription
              </p>
            </div>
          ) : (
            <>
              {/* Affichage du droit */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Montant actuel</span>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiEdit2 className="text-sm" />
                      Modifier
                    </button>
                  )}
                </div>
                
                <div className="text-3xl font-bold text-gray-900">
                  {formatMontant(droit.montant)}
                </div>
                
                <div className="mt-1 text-xs text-gray-400">
                  Dernière mise à jour • ID: {droit.id}
                </div>
              </div>

              {/* Formulaire de modification */}
              {editing && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">
                    Modifier le montant
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nouveau montant (Ar)
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 50000"
                        value={form.montant}
                        onChange={e => setForm({ montant: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        required
                        autoFocus
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        Ancien montant: {formatMontant(droit.montant)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                      >
                        <FiSave />
                        Enregistrer
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        <FiX />
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bouton rafraîchir (si nécessaire) */}
        {droit && !editing && (
          <div className="mt-4 text-center">
            <button
              onClick={fetchDroit}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <FiRefreshCw />
              Actualiser
            </button>
          </div>
        )}

        {/* Informations */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h4 className="text-sm font-medium text-blue-800 mb-1">
            À propos du droit d'inscription
          </h4>
          <p className="text-xs text-blue-600">
            Ce montant est appliqué à tous les nouveaux inscrits. 
            Toute modification sera effective immédiatement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Droits;