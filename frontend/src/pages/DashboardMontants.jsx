import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import { FiCalendar, FiUsers, FiDollarSign, FiChevronDown, FiChevronUp, FiHome, FiInfo, FiSearch } from "react-icons/fi";
import { API_URL } from '../config';

export default function DashboardMontants() {
  const { user } = useContext(AuthContext);
  const [centres, setCentres] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedCentre, setExpandedCentre] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [moisFormat, setMoisFormat] = useState("");

  const API_BASE = `${API_URL}/api`;

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    setErrorMsg("");
    try {
      // Construire l'URL avec centre_id si l'utilisateur est un gérant
      let url = `${API_BASE}/paiements/dashboard/montants`;
      if (user?.role === 'gerant' && user?.centre_id) {
        url += `?centre_id=${user.centre_id}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const data = await response.json();

      setCentres(data.centres || []);
      setTotalGeneral(data.totalGeneral || 0);
      
      // Estimer le nombre d'étudiants actifs
      const nbEtudiantsActifs = data.nbEtudiantsActifsTotal || 0;
      setEtudiants(Array(nbEtudiantsActifs).fill({ statut: 'actif' }));
      
      setMoisFormat(data.moisFormat || '');
    } catch (err) {
      console.error("Erreur fetchAll:", err);
      setErrorMsg("Erreur lors de la récupération des données");
    } finally {
      setLoading(false);
    }
  }

  function parseMonthYearFromString(s) {
    if (!s) return null;
    const str = String(s).trim().toLowerCase();
    const monthsMap = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12
    };
    const monthNameMatch = str.match(/([a-zéûôàê]+)\s+(\d{4})/i);
    if (monthNameMatch) {
      const name = monthNameMatch[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const year = Number(monthNameMatch[2]);
      const key = name.toLowerCase();
      for (const [k, v] of Object.entries(monthsMap)) {
        const kn = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (kn.toLowerCase() === key) return { month: v, year };
      }
    }
    return null;
  }

  function paymentMatchesTarget(p) {
    if (!p) return false;
    if (p.mois_paye) {
      const parsed = parseMonthYearFromString(p.mois_paye);
      if (parsed) return parsed.month === targetMonth + 1 && parsed.year === targetYear;
    }
    if (p.date_paiement) {
      const d = new Date(p.date_paiement);
      if (!isNaN(d.getTime())) {
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      }
    }
    return false;
  }

  function formationActive(inscription, formation) {
    if (!inscription || !formation) return false;

    // Vérifier d'abord le statut de l'inscription
    if (inscription.statut === 'fini' || inscription.statut === 'quitte') {
      return false;
    }

    const debut = new Date(inscription.date_inscription);
    const fin = new Date(debut);
    const dureeFloat = parseFloat(formation.duree);
    const moisEntiers = Math.floor(dureeFloat);
    const joursDecimaux = Math.round((dureeFloat - moisEntiers) * 30);
    fin.setMonth(fin.getMonth() + moisEntiers);
    fin.setDate(fin.getDate() + joursDecimaux);

    const finDeMoisProchain = new Date(targetYear, targetMonth + 1, 0);
    return fin > finDeMoisProchain;
    return fin > finDeMoisProchain;
  }

  function calculTotalParCentreAvecFormation(centreId) {
    const centre = centres.find(c => c.id === centreId);
    if (!centre) return { totalDû: 0, formationDetails: [] };
    
    return {
      totalDû: centre.totalDû || 0,
      formationDetails: centre.formationDetails || []
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 px-2 sm:px-4 py-3 sm:py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header - Mobile optimisé */}
        <div className="mb-4 sm:mb-6 px-1 sm:px-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">
            Montants du mois prochain
          </h1>
          <div className="flex items-center gap-1 sm:gap-2 mt-1 text-gray-600 text-xs sm:text-sm">
            <FiCalendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{moisFormat}</span>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs sm:text-sm mx-1 sm:mx-0">
            {errorMsg}
          </div>
        )}

        {/* Summary Cards - Stacked on mobile, grid on desktop */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <FiDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Montant total dû</p>
                {loading ? (
                  <div className="h-6 sm:h-8 w-20 sm:w-32 bg-gray-200 rounded animate-pulse mt-0.5 sm:mt-1"></div>
                ) : (
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">
                    {totalGeneral.toLocaleString("fr-FR")} Ar
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <FiHome className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Centres</p>
                {loading ? (
                  <div className="h-6 sm:h-8 w-16 sm:w-20 bg-gray-200 rounded animate-pulse mt-0.5 sm:mt-1"></div>
                ) : (
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                    {centres.length}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                <FiUsers className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Étudiants actifs</p>
                {loading ? (
                  <div className="h-6 sm:h-8 w-16 sm:w-20 bg-gray-200 rounded animate-pulse mt-0.5 sm:mt-1"></div>
                ) : (
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                    {etudiants.filter(e => e.statut === "actif").length}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow p-3 sm:p-4 mx-1 sm:mx-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Rechercher un centre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Centres List */}
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-2 sm:mb-3 px-1 sm:px-0">
            Détails par centre
          </h2>

          {loading ? (
            <div className="space-y-2 sm:space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-4 sm:p-5 animate-pulse mx-1 sm:mx-0">
                  <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/2 mb-3 sm:mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : centres.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center mx-1 sm:mx-0">
              <p className="text-gray-500 text-sm sm:text-base">Aucun centre trouvé</p>
            </div>
          ) : (
            centres
              .filter(centre =>
                centre.nom.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((centre) => {
                const { totalDû, formationDetails } = calculTotalParCentreAvecFormation(centre.id);
                const isExpanded = expandedCentre === centre.id;

                return (
                  <div key={centre.id} className="bg-white rounded-lg shadow border overflow-hidden mx-1 sm:mx-0">
                    {/* Centre Header - Compact on mobile */}
                    <div
                      className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                      onClick={() => setExpandedCentre(isExpanded ? null : centre.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                            <FiHome className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                              {centre.nom}
                            </h3>
                          </div>
                          <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                            <div className="text-center sm:text-left">
                              <p className="text-xs text-gray-600">Formations</p>
                              <p className="font-medium text-sm sm:text-base">{formationDetails.length}</p>
                            </div>
                            <div className="text-center sm:text-left">
                              <p className="text-xs text-gray-600">Montant dû</p>
                              <p className={`font-bold text-sm sm:text-base ${totalDû === 0 ? 'text-gray-500' : 'text-red-600'}`}>
                                {totalDû.toLocaleString("fr-FR")} Ar
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          {isExpanded ? (
                            <FiChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                          ) : (
                            <FiChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details - Optimisé pour mobile */}
                    {isExpanded && formationDetails.length > 0 && (
                      <div className="border-t p-3 sm:p-4 bg-gray-50">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                          Détails des formations
                        </h4>
                        <div className="space-y-2 sm:space-y-3">
                          {formationDetails.map((fd) => (
                            <div key={fd.nom} className="bg-white rounded p-3 border">
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-medium text-gray-900 text-sm truncate">{fd.nom}</h5>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    {fd.fraisUnitaire.toLocaleString("fr-FR")} Ar / étudiant
                                  </p>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0 ml-2">
                                  {fd.nbInscrits} étudiant{fd.nbInscrits > 1 ? 's' : ''}
                                </span>
                              </div>

                              <div className="pt-2 border-t">
                                <div className="flex justify-between items-end">
                                  <div>
                                    <p className="text-xs text-gray-600 mb-0.5">Calcul</p>
                                    <p className="text-xs font-medium truncate">
                                      {fd.nbInscrits} × {fd.fraisUnitaire.toLocaleString("fr-FR")} Ar
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-600 mb-0.5">Total dû</p>
                                    <p className="text-sm sm:text-base font-bold text-red-600">
                                      {fd.totalDû.toLocaleString("fr-FR")} Ar
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>

        {/* Legend - Mobile optimisé */}
        <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow p-3 sm:p-4 mx-1 sm:mx-0">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <FiInfo className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <h4 className="font-medium text-gray-800 text-sm sm:text-base">
              Comment lire ces données
            </h4>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span><strong className="font-semibold">Total théorique</strong> : Montant total si tous les étudiants payaient leurs formations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span><strong className="font-semibold">Montant dû</strong> : Montant restant à encaisser pour le mois prochain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span><strong className="font-semibold">Formation active</strong> : Formation dont la durée couvre le mois prochain</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}