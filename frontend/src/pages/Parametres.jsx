import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/authContext';
import { FiTrash2, FiAlertTriangle, FiUsers, FiClock, FiDownload, FiDatabase } from 'react-icons/fi';
import RefreshButton from '../components/RefreshButton';
import { API_URL } from '../config';
// import AutreMontant from './AutreMontant';
// import PaiementsTous from './PaiementsEtAutres';

const Parametres = () => {
  const { user } = useAuth();
  const [etudiantsToDelete, setEtudiantsToDelete] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const API_BASE = `${API_URL}/api`

  // --- Calcule le statut global d'un étudiant ---
  const calculateStudentStatus = (inscriptions) => {
    if (!inscriptions || inscriptions.length === 0) return 'inconnu';

    if (inscriptions.some(inscr => inscr.statut === 'actif')) return 'actif';
    if (inscriptions.some(inscr => inscr.statut === 'quitte')) return 'quitte';
    if (inscriptions.some(inscr => inscr.statut === 'fini')) return 'fini';

    return 'inconnu';
  };

  // --- Récupérer les étudiants avec leurs inscriptions ---
  const fetchEtudiantsToDelete = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/parametres/etudiants-to-delete`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const etudiants = await response.json();

      if (!etudiants || etudiants.length === 0) {
        setEtudiantsToDelete([]);
        setMessage('Aucun étudiant trouvé');
        return;
      }

      setEtudiantsToDelete(etudiants);
    } catch (err) {
      console.error('Erreur récupération étudiants:', err);
      setMessage('❌ Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'dir')) fetchEtudiantsToDelete();
  }, [user, fetchEtudiantsToDelete]);

  // --- Supprime un étudiant et toutes ses données en cascade ---
  const deleteEtudiantCompletely = async (etudiantId) => {
    try {
      const response = await fetch(`${API_BASE}/parametres/etudiants/${etudiantId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la suppression');
      }

      return true;
    } catch (err) {
      console.error('Erreur suppression étudiant:', err);
      return false;
    }
  };

  // --- Supprimer tous les étudiants ---
  const handleDeleteAll = async () => {
    if (!window.confirm(`Supprimer définitivement ${etudiantsToDelete.length} étudiant(s) ?`)) return;
    setDeleting(true);
    setMessage('');

    const etudiantIds = etudiantsToDelete.map(e => e.id);

    try {
      const response = await fetch(`${API_BASE}/parametres/etudiants/delete-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etudiantIds })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      const result = await response.json();
      setEtudiantsToDelete([]);
      setMessage(result.message || `✅ ${result.successCount} étudiant(s) supprimé(s)`);
    } catch (err) {
      console.error('Erreur suppression multiple:', err);
      setMessage('❌ Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // --- Supprimer un étudiant individuel ---
  const handleDeleteOne = async (etudiantId) => {
    if (!window.confirm(`Supprimer cet étudiant et toutes ses données ?`)) return;
    setDeleting(true);
    const success = await deleteEtudiantCompletely(etudiantId);
    if (success) {
      setEtudiantsToDelete(prev => prev.filter(e => e.id !== etudiantId));
      setMessage('✅ Étudiant supprimé avec succès');
    } else setMessage('❌ Erreur lors de la suppression');
    setDeleting(false);
  };

  // --- Exporter la base de données ---
  const handleExport = async () => {
    try {
      setExporting(true);
      setMessage('⌛ Préparation de l\'exportation...');

      const response = await fetch(`${API_BASE}/parametres/export`);

      if (!response.ok) throw new Error('Erreur lors de l\'exportation');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage('✅ Base de données exportée avec succès');
    } catch (err) {
      console.error('Erreur export:', err);
      setMessage('❌ Erreur lors de l\'exportation de la base de données');
    } finally {
      setExporting(false);
    }
  };



  const getDaysSince = (dateReference) => {
    if (!dateReference) return 0;
    return Math.ceil((new Date() - new Date(dateReference)) / (1000 * 60 * 60 * 24));
  };

  if (user && user.role !== 'admin' && user.role !== 'dir') {
    return (
      <div className="min-h-screen bg-gray-50 py-3 px-2">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <FiAlertTriangle className="text-red-500 mr-2" size={20} />
            <span className="text-red-700">Accès réservé aux administrateurs</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-3 px-2">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg mr-4">
                <FiDatabase className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Sauvegarde de sécurité</h2>
                <p className="text-xs text-gray-500">Téléchargez une copie complète de la base de données (format SQL)</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors shadow-sm"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exportation...
                </>
              ) : (
                <>
                  <FiDownload className="mr-2" />
                  Exporter (.sql)
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-lg font-bold text-gray-900 flex items-center">
            <FiAlertTriangle className="mr-2 text-red-600 text-sm" />
            Maintenance - Nettoyage des données
          </h1>
          <RefreshButton onClick={fetchEtudiantsToDelete} loading={loading} />
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.includes('❌') ? 'bg-red-50 border-red-200 text-red-700' :
            message.includes('⚠️') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
              'bg-green-50 border-green-200 text-green-700'
            }`}>
            <span className="text-xs">{message}</span>
          </div>
        )}

        {etudiantsToDelete.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex justify-between items-center">
            <span className="text-sm text-red-800 font-medium">
              {etudiantsToDelete.length} étudiant(s) éligible(s) à la suppression
            </span>
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg flex items-center text-sm"
            >
              {deleting ? 'Suppression...' : <><FiTrash2 className="mr-2" />Supprimer tout</>}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : etudiantsToDelete.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Aucun étudiant éligible
            </div>
          ) : (
            etudiantsToDelete.map((etudiant) => (
              <div key={etudiant.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-900">{etudiant.nom} {etudiant.prenom}</div>
                  <div className="text-xs text-gray-500">Centre: {etudiant.centre_id || '-'}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${calculateStudentStatus(etudiant.inscriptions) === 'fini' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>{calculateStudentStatus(etudiant.inscriptions)}</span>
                    <span className="ml-2 flex items-center">
                      <FiClock className="mr-1" size={10} />
                      {getDaysSince(etudiant.inscriptions[0].date_inscription)} jours
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteOne(etudiant.id)}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-xs flex items-center"
                >
                  <FiTrash2 className="mr-1" /> Supprimer
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {/* <div>
        <PaiementsTous />
      </div> */}
    </div>
  );
};

export default Parametres;
