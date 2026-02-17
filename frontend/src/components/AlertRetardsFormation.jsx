import React, { useState, useEffect, useCallback } from 'react';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
import { useAuth } from '../context/authContext';
import {
  FiAlertTriangle,
  FiX,
  FiUser,
  FiBook,
  FiCreditCard,
  FiRefreshCw,
  FiCalendar,
  FiDollarSign,
  FiMapPin,
  FiSearch,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

const AlertRetardsFormation = () => {
  const [retards, setRetards] = useState([]);
  const [filteredRetards, setFilteredRetards] = useState([]);
  const [selectedEtudiant, setSelectedEtudiant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paiementMois, setPaiementMois] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { user } = useAuth();

  useEffect(() => {
    chargerRetards();

    const interval = setInterval(chargerRetards, 600000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = retards.filter(retard =>
        retard.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        retard.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        retard.formation_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        retard.centre_nom?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRetards(filtered);
    } else {
      setFilteredRetards(retards);
    }
    setCurrentPage(1);
  }, [searchTerm, retards]);

  const chargerRetards = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${API_BASE}/api/paiements/retards/list${user?.centre_id && user?.role === 'gerant' ? `?centre_id=${user.centre_id}` : ''}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Erreur fetch retards');
      const data = await resp.json();
      console.log('Retards chargés:', data);
      setRetards(data);
      setFilteredRetards(data);
    } catch (error) {
      console.error('Erreur AlertRetardsFormation:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const ouvrirDetails = async (etudiantId, inscriptionId) => {
    try {
      const url = `${API_BASE}/api/inscriptions/${inscriptionId}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Erreur fetch inscription');
      const insJson = await resp.json();
      const details = insJson.data || insJson;

      // Build details object matching the old service format
      if (details) {
        const retardData = retards.find(r => r.inscription_id === inscriptionId) || {};
        const detailsObj = {
          ...details,
          inscription_id: inscriptionId,
          formation_nom: details.formations?.nom,
          duree: details.formations?.duree,
          frais_mensuel: details.formations?.frais_mensuel,
          centre_nom: retardData.centre_nom || details.etudiants?.centre_nom || '-',
          // Find retard data
          ...retardData
        };
        setSelectedEtudiant(detailsObj);
        setPaiementMois(detailsObj.mois_en_retard || '');
        setShowModal(true);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fermerModal = () => {
    setShowModal(false);
    setSelectedEtudiant(null);
    setPaiementMois('');
  };

  const calculerMoisAPayer = (etudiant) => {
    if (!etudiant.mois_en_retard) return 'premier mois';
    return etudiant.mois_en_retard;
  };

  const getMoisDisponibles = (etudiant) => {
    if (!etudiant.tous_les_mois || !etudiant.mois_payes) return [];
    // On filtre les mois qui sont DÉJÀ entièrement payés
    // Note: mois_payes ici vient du service qui a déjà filtré les mois partiellement payés comme "non payés"
    // Mais pour être sûr, on peut réutiliser la logique du service ou faire confiance à mois_payes
    return etudiant.tous_les_mois.filter(mois =>
      !etudiant.mois_payes.includes(mois)
    );
  };

  const handlePaiementFormation = async () => {
    if (!selectedEtudiant || !selectedEtudiant.inscription_id || !paiementMois) {
      alert('Veuillez sélectionner un mois à payer');
      return;
    }

    const statut = (selectedEtudiant.statut || '').toLowerCase();
    if (statut === 'quitte' || statut === 'quitté') {
      alert('Impossible d\'effectuer un paiement pour un étudiant ayant le statut "quitte".');
      return;
    }

    try {
      const inscriptionId = selectedEtudiant.inscription_id || selectedEtudiant.id || selectedEtudiant.inscriptionId || (selectedEtudiant.inscription && selectedEtudiant.inscription.id);
      if (!inscriptionId) {
        console.error('Aucun `inscription_id` trouvé dans selectedEtudiant:', selectedEtudiant);
        alert('Impossible de déterminer l\'identifiant d\'inscription pour cet étudiant. Voir la console.');
        return;
      }

      const paiementsExistants = await fetch(`${API_BASE}/api/paiements/inscription/${inscriptionId}`).then(r => r.json());

      // Vérification paiement partiel
      const paiementsCeMois = (paiementsExistants || []).filter(p => p.mois_paye === paiementMois);
      const totalDejaPaye = paiementsCeMois.reduce((sum, p) => sum + (p.montant || 0), 0);
      const fraisMensuel = selectedEtudiant.frais_mensuel || 0;

      if (totalDejaPaye >= fraisMensuel) {
        alert(`Le mois "${paiementMois}" est déjà entièrement payé pour cet étudiant.`);
        return;
      }

      const resteAPayer = fraisMensuel - totalDejaPaye;

      const confirmMsg = `Confirmer le paiement de ${resteAPayer.toLocaleString()} Ar (reste) pour le mois de ${paiementMois} ?`;
      if (!window.confirm(confirmMsg)) return;

      setProcessing(true);

      await fetch(`${API_BASE}/api/paiements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscription_id: inscriptionId,
          type_paiement: 'formation',
          montant: resteAPayer,
          mois_paye: paiementMois,
          date_paiement: new Date().toISOString().split('T')[0]
        })
      });

      // Optimistic update: masquer immédiatement l'entrée payée dans l'UI
      setRetards(prev => prev.filter(r => !(r.inscription_id === inscriptionId && r.mois_en_retard === paiementMois)));
      setFilteredRetards(prev => prev.filter(r => !(r.inscription_id === inscriptionId && r.mois_en_retard === paiementMois)));

      // Petit délai pour laisser Supabase propager l'insertion, puis recharger
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Recharger les retards depuis le serveur pour synchroniser l'état
      await chargerRetards();
      fermerModal();

      alert(`Paiement du mois "${paiementMois}" enregistré avec succès !`);

    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement du paiement: ' + (error.message || error));
    } finally {
      setProcessing(false);
    }
  };

  // Calcul de la pagination
  const totalPages = Math.ceil(filteredRetards.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRetards = filteredRetards.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (retards.length === 0 && !loading) {
    return null;
  }

  return (
    <>
      {/* Badge d'alerte */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 sm:p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors border border-orange-200 shadow-sm"
          title={`${retards.length} retard(s) de paiement formation`}
        >
          <FiCreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
          {retards.length > 0 && (
            <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-orange-600 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 text-xs flex items-center justify-center animate-pulse">
              {retards.length > 9 ? '9+' : retards.length}
            </span>
          )}
        </button>

        {/* Overlay pour fermer en cliquant à l'extérieur sur mobile */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-10 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Liste déroulante des retards - Version compacte */}
        {isOpen && (
          <div className="fixed sm:absolute top-14 sm:top-full left-2 sm:left-auto right-2 sm:right-0 mt-0 sm:mt-2 w-auto sm:w-80 max-h-[70vh] sm:max-h-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-2 sm:p-3 border-b border-gray-200 flex justify-between items-center bg-orange-50 rounded-t-lg">
              <h3 className="font-semibold text-orange-900 flex items-center text-xs sm:text-sm">
                <FiCreditCard className="mr-1 sm:mr-2 flex-shrink-0" size={14} />
                Retards ({retards.length})
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-orange-100 rounded text-orange-600 flex-shrink-0"
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="max-h-48 sm:max-h-56 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-center text-gray-500 flex items-center justify-center text-xs">
                  <FiRefreshCw className="animate-spin mr-2" size={12} />
                  Chargement...
                </div>
              ) : currentRetards.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-xs">
                  {searchTerm ? 'Aucun résultat trouvé' : 'Aucun retard'}
                </div>
              ) : (
                currentRetards.map((retard) => {
                  const moisAPayer = calculerMoisAPayer(retard);

                  return (
                    <div
                      key={`${retard.etudiant_id}-${retard.inscription_id}`}
                      className="p-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
                      onClick={() => ouvrirDetails(retard.etudiant_id, retard.inscription_id)}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex-1 min-w-0">
                          {/* Nom et prénom compact */}
                          <div className="flex items-center mb-1">
                            <FiUser className="text-gray-400 mr-1 flex-shrink-0" size={10} />
                            <h4 className="font-semibold text-gray-900 text-xs truncate">
                              {retard.prenom} {retard.nom}
                            </h4>
                          </div>

                          {/* Formation et Centre compact */}
                          <div className="flex items-center text-xs text-gray-600 mb-1">
                            <FiBook className="mr-1 flex-shrink-0" size={10} />
                            <span className="truncate flex-1">{retard.formation_nom}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mb-1">
                            <FiMapPin className="mr-1 flex-shrink-0" size={10} />
                            <span className="truncate flex-1">{retard.centre_nom || '-'}</span>
                          </div>

                          {/* Informations de retard compact */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                              {retard.jours_retard}j
                            </span>
                            <span className="text-xs text-orange-600 font-semibold truncate ml-1 max-w-[60px]">
                              {moisAPayer}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {filteredRetards.length > itemsPerPage && (
              <div className="p-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:text-gray-800"
                  >
                    <FiChevronLeft size={14} />
                  </button>

                  <span className="text-gray-600">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRetards.length)} sur {filteredRetards.length}
                  </span>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:text-gray-800"
                  >
                    <FiChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Bouton actualiser */}
            <div className="p-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                onClick={chargerRetards}
                disabled={loading}
                className="w-full py-1.5 bg-blue-600 text-white rounded text-xs flex items-center justify-center disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? (
                  <FiRefreshCw className="animate-spin mr-1" size={12} />
                ) : (
                  <FiRefreshCw className="mr-1" size={12} />
                )}
                Actualiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détails - Version compacte */}
      {showModal && selectedEtudiant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-3 z-[100]">
          <div className="bg-white rounded-lg w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-xl mx-2">
            {/* En-tête compact */}
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 rounded-t-lg">
              <h2 className="text-base font-bold text-gray-900">
                Paiement en retard
              </h2>
              <button
                onClick={fermerModal}
                className="p-1 hover:bg-gray-100 rounded flex-shrink-0 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-3">
              {/* Informations étudiant compactes */}
              <div className="mb-3">
                <div className="flex items-center mb-2">
                  <FiUser className="text-blue-600 mr-2" size={16} />
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {selectedEtudiant.prenom} {selectedEtudiant.nom}
                  </h3>
                </div>

                {/* Formation et centre compact */}
                <div className="bg-gray-50 rounded-lg p-2 mb-3 border border-gray-200 text-xs">
                  <div className="flex items-center mb-1">
                    <FiBook className="text-blue-500 mr-1" size={12} />
                    <span className="font-medium text-gray-800">{selectedEtudiant.formation_nom}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiMapPin className="text-gray-400 mr-1" size={12} />
                    <span>Centre: {selectedEtudiant.centre_nom}</span>
                  </div>
                </div>

                {/* Alerte retard compacte */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3">
                  <div className="flex items-center mb-2">
                    <FiAlertTriangle className="text-orange-500 mr-1" size={14} />
                    <span className="font-semibold text-orange-800 text-sm">Retard détecté</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="bg-white rounded p-1 text-center">
                      <div className="text-gray-500 mb-1">Jours</div>
                      <div className="font-bold text-orange-700">{selectedEtudiant.jours_retard}</div>
                    </div>
                    <div className="bg-white rounded p-1 text-center">
                      <div className="text-gray-500 mb-1">Montant</div>
                      <div className="font-bold text-gray-900">{(selectedEtudiant.frais_mensuel || 0).toLocaleString()} Ar</div>
                    </div>
                    <div className="bg-white rounded p-1 text-center">
                      <div className="text-gray-500 mb-1">Date limite</div>
                      <div className="font-medium text-orange-700 text-xs">
                        {new Date(selectedEtudiant.date_limite_paiement).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sélection du mois compacte */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    <FiCalendar className="inline mr-1" size={12} />
                    Mois à régulariser:
                  </label>
                  <select
                    value={paiementMois}
                    onChange={(e) => setPaiementMois(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">Sélectionner un mois</option>
                    {getMoisDisponibles(selectedEtudiant).map((mois) => (
                      <option key={mois} value={mois}>
                        {mois}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Recommandé: <span className="font-semibold text-orange-600">
                      {selectedEtudiant.mois_en_retard}
                    </span>
                  </p>
                </div>

                {/* Résumé du paiement compact */}
                {paiementMois && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                    {(() => {
                      const fraisMensuel = selectedEtudiant.frais_mensuel || 0;
                      const paiementsCeMois = (selectedEtudiant.paiements || []).filter(p => p.type_paiement === 'formation' && p.mois_paye === paiementMois);
                      const dejaPaye = paiementsCeMois.reduce((sum, p) => sum + (p.montant || 0), 0);
                      const reste = Math.max(0, fraisMensuel - dejaPaye);

                      return (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 font-medium">
                              {dejaPaye > 0 ? "Reste à payer:" : "Total à payer:"}
                            </span>
                            <span className="font-bold text-blue-700 text-base">
                              {reste.toLocaleString()} Ar
                            </span>
                          </div>
                          {dejaPaye > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Déjà payé:</span>
                              <span>{dejaPaye.toLocaleString()} Ar</span>
                            </div>
                          )}
                          <div className="text-xs text-blue-600 mt-1">
                            Mois: <strong>{paiementMois}</strong>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Actions compactes */}
              <div className="flex space-x-2">
                <button
                  onClick={fermerModal}
                  disabled={processing}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium active:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePaiementFormation}
                  disabled={processing || !paiementMois}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 text-sm font-medium active:bg-green-800"
                >
                  {processing ? (
                    <FiRefreshCw className="animate-spin mr-1" size={14} />
                  ) : (
                    <FiDollarSign className="mr-1" size={14} />
                  )}
                  Payer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AlertRetardsFormation;