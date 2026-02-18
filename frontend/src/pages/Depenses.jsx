import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/authContext';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiChevronLeft, FiChevronRight, FiX, FiCalendar, FiMapPin } from 'react-icons/fi';
import { API_URL } from '../config';
import SearchableSelect from '../components/SearchableSelect';

const depenseTypes = ['salaire', 'loyer', 'eau', 'électricité', 'fournitures', 'autre'];

export default function Depenses() {
  const { user } = useAuth();
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [centres, setCentres] = useState([]);
  const [userCentreId, setUserCentreId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ centre_id: '', type_depense: 'autre', description: '', montant: '', date_depense: '' });
  // Recherche / filtres / pagination
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCentre, setFilterCentre] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  // State filters recherchables
  const [showFiltersCentresDropdown, setShowFiltersCentresDropdown] = useState(false);
  const [searchFiltersCentreInput, setSearchFiltersCentreInput] = useState("");
  const [showFiltersTypesDropdown, setShowFiltersTypesDropdown] = useState(false);
  const [searchFiltersTypeInput, setSearchFiltersTypeInput] = useState("");

  const filteredFiltersCentresOptions = React.useMemo(() => {
    return [
      { id: "", nom: "Tous les centres" },
      ...centres.filter(c => (c.nom || "").toLowerCase().includes(searchFiltersCentreInput.toLowerCase()))
    ];
  }, [centres, searchFiltersCentreInput]);

  const filteredFiltersTypesOptions = React.useMemo(() => {
    const types = ['salaire', 'loyer', 'eau', 'électricité', 'fournitures', 'autre'];
    return [
      { id: "", label: "Tous les types" },
      ...types.filter(t => t.toLowerCase().includes(searchFiltersTypeInput.toLowerCase())).map(t => ({ id: t, label: t }))
    ];
  }, [searchFiltersTypeInput]);

  const API_BASE = `${API_URL}/api`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch centres
      const respCentres = await fetch(`${API_BASE}/centres`);
      if (!respCentres.ok) throw new Error('Erreur centres');
      const centresData = await respCentres.json();
      setCentres(centresData);

      // Fetch depenses
      const depUrl = `${API_BASE}/depenses${user?.role === 'gerant' && user?.centre_id ? `?centre_id=${user.centre_id}` : ''}`;
      const respDep = await fetch(depUrl);
      if (!respDep.ok) throw new Error('Erreur depenses');
      const depensesData = await respDep.json();
      setDepenses(depensesData);

      // Set user centre if gerant
      if (user && user.role === 'gerant') {
        setUserCentreId(user.centre_id || null);
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('fr-FR');
    } catch {
      return d;
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      salaire: '-',
      loyer: '-',
      eau: '-',
      électricité: '-',
      fournitures: '-',
      autre: '-'
    };
    return icons[type] || icons.autre;
  };

  const depensesFiltered = React.useMemo(() => {
    let arr = (depenses || []).slice().sort((a, b) => (b.date_depense || '').localeCompare(a.date_depense || ''));
    if (filterType) {
      arr = arr.filter(d => String(d.type_depense) === String(filterType));
    }
    if (filterCentre) {
      arr = arr.filter(d => String(d.centre_id) === String(filterCentre));
    }
    if (dateFrom) {
      arr = arr.filter(d => d.date_depense && d.date_depense >= dateFrom);
    }
    if (dateTo) {
      arr = arr.filter(d => d.date_depense && d.date_depense <= dateTo);
    }
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      arr = arr.filter(d => {
        if ((d.montant || '').toString().toLowerCase().includes(q)) return true;
        if ((d.type_depense || '').toLowerCase().includes(q)) return true;
        if ((d.description || '').toLowerCase().includes(q)) return true;
        if ((d.centres && d.centres.nom) && d.centres.nom.toLowerCase().includes(q)) return true;
        if ((d.users && ((d.users.nom || '') + ' ' + (d.users.prenom || ''))).toLowerCase().includes(q)) return true;
        if ((d.date_depense || '').toLowerCase().includes(q)) return true;
        return false;
      });
    }
    return arr;
  }, [depenses, search, filterType, filterCentre, dateFrom, dateTo]);

  // Grouper les dépenses par mois
  const depensesGroupedByMonth = React.useMemo(() => {
    const grouped = {};
    depensesFiltered.forEach(depense => {
      if (!depense.date_depense) return;
      const date = new Date(depense.date_depense);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(depense);
    });
    // Trier les mois par ordre décroissant
    const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const result = {};
    sortedMonths.forEach(month => {
      // Trier les dépenses dans chaque mois par date décroissante
      result[month] = grouped[month].sort((a, b) => (b.date_depense || '').localeCompare(a.date_depense || ''));
    });
    return result;
  }, [depensesFiltered]);

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      centre_id: userCentreId || '',
      type_depense: 'autre',
      description: '',
      montant: '',
      date_depense: new Date().toISOString().slice(0, 10)
    });
    setFormVisible(true);
  };

  const openEdit = (d) => {
    if (user && user.role === 'gerant' && userCentreId && d.centre_id !== userCentreId) {
      alert('Accès refusé : vous ne pouvez pas modifier une dépense d\'un autre centre.');
      return;
    }
    setEditing(d);
    setForm({
      centre_id: d.centre_id || '',
      type_depense: d.type_depense || 'autre',
      description: d.description || '',
      montant: d.montant || '',
      date_depense: d.date_depense || ''
    });
    setFormVisible(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        centre_id: user && user.role === 'gerant' ? userCentreId : (form.centre_id || null),
        user_id: user?.id || null,
        type_depense: form.type_depense,
        description: form.description,
        montant: Number(form.montant),
        date_depense: form.date_depense || new Date().toISOString().slice(0, 10)
      };

      if (editing) {
        await fetch(`${API_BASE}/depenses/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`${API_BASE}/depenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setFormVisible(false);
      fetchData();
    } catch (err) {
      console.error('Erreur enregistrement dépense:', err);
      alert('Erreur sauvegarde dépense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette dépense ?')) return;

    if (user && user.role === 'gerant') {
      const dep = depenses.find(d => d.id === id);
      if (dep && userCentreId && dep.centre_id !== userCentreId) {
        alert('Accès refusé : vous ne pouvez pas supprimer une dépense d\'un autre centre.');
        return;
      }
    }

    try {
      await fetch(`${API_BASE}/depenses/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur suppression');
    }
  };

  return (
    <div className="min-h-screen bg-white p-2 pb-16">
      {/* Header compact */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-900">Dépenses</h1>
          <button
            onClick={openCreate}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            <FiPlus size={14} />
          </button>
        </div>

        {/* Barre de recherche compacte */}
        <div className="relative mb-2">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm"
          />
        </div>

        {/* Filtres rapides */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setFiltersVisible(!filtersVisible)}
            className="flex items-center text-xs text-gray-600"
          >
            <FiFilter className="mr-1" size={12} />
            Filtres
          </button>
          <div className="text-xs text-gray-500">
            {depensesFiltered.length} résultats
          </div>
        </div>
      </div>

      {/* Filtres détaillés */}
      {filtersVisible && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2 border border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            {/* Filtre Type Recherchable */}
            <div className="relative">
              <label className="block text-xs text-gray-600 mb-1">Type</label>
              <div
                className="relative cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFiltersTypesDropdown(!showFiltersTypesDropdown);
                  setShowFiltersCentresDropdown(false);
                }}
              >
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded text-xs bg-white pr-6"
                  placeholder="Type..."
                  value={filterType === "" ? searchFiltersTypeInput : filterType}
                  onChange={(e) => {
                    setSearchFiltersTypeInput(e.target.value);
                    if (filterType !== "") setFilterType("");
                    setShowFiltersTypesDropdown(true);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <FiFilter size={10} />
                </div>
              </div>

              {showFiltersTypesDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto py-1">
                  {filteredFiltersTypesOptions.length > 0 ? (
                    filteredFiltersTypesOptions.map((t) => (
                      <div
                        key={t.id}
                        className={`px-3 py-2 text-xs cursor-pointer transition-colors ${String(filterType) === String(t.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                        onClick={() => {
                          setFilterType(t.id);
                          setSearchFiltersTypeInput(t.id === "" ? "" : t.label);
                          setShowFiltersTypesDropdown(false);
                        }}
                      >
                        <span className="capitalize">{t.label}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-500 italic">Aucun type trouvé</div>
                  )}
                </div>
              )}
            </div>

            {user && user.role !== 'gerant' && (
              <div className="relative">
                <label className="block text-xs text-gray-600 mb-1">Centre</label>
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFiltersCentresDropdown(!showFiltersCentresDropdown);
                    setShowFiltersTypesDropdown(false);
                  }}
                >
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-xs bg-white pr-6"
                    placeholder="Centre..."
                    value={filterCentre === "" ? searchFiltersCentreInput : (centres.find(c => String(c.id) === String(filterCentre))?.nom || "")}
                    onChange={(e) => {
                      setSearchFiltersCentreInput(e.target.value);
                      if (filterCentre !== "") setFilterCentre("");
                      setShowFiltersCentresDropdown(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <FiMapPin size={10} />
                  </div>
                </div>

                {showFiltersCentresDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto py-1">
                    {filteredFiltersCentresOptions.length > 0 ? (
                      filteredFiltersCentresOptions.map((c) => (
                        <div
                          key={c.id}
                          className={`px-3 py-2 text-xs cursor-pointer transition-colors ${String(filterCentre) === String(c.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                          onClick={() => {
                            setFilterCentre(c.id === "" ? "" : String(c.id));
                            setSearchFiltersCentreInput(c.id === "" ? "" : c.nom);
                            setShowFiltersCentresDropdown(false);
                          }}
                        >
                          {c.nom}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500 italic">Aucun centre trouvé</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Click mask to close filters dropdowns */}
            {(showFiltersCentresDropdown || showFiltersTypesDropdown) && (
              <div
                className="fixed inset-0 z-40 outline-none"
                onClick={() => {
                  setShowFiltersCentresDropdown(false);
                  setShowFiltersTypesDropdown(false);
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Du</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Au</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Liste des dépenses groupées par mois */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : Object.keys(depensesGroupedByMonth).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucune dépense trouvée
          </div>
        ) : (
          Object.entries(depensesGroupedByMonth).map(([monthKey, monthDepenses]) => (
            <div key={monthKey} className="space-y-2">
              {/* Titre du mois */}
              <div className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-800 capitalize">
                  {formatMonth(monthKey)}
                </h3>
                <div className="text-xs text-gray-600">
                  {monthDepenses.length} dépense{monthDepenses.length > 1 ? 's' : ''} •
                  Total: {monthDepenses.reduce((sum, d) => sum + Number(d.montant || 0), 0).toLocaleString()} Ar
                </div>
              </div>

              {/* Dépenses du mois */}
              <div className="space-y-1 ml-2">
                {monthDepenses.map(d => (
                  <div key={d.id} className="bg-white border border-gray-200 rounded-lg p-2 hover:bg-gray-50">
                    {/* Ligne principale */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <span className="text-base">{getTypeIcon(d.type_depense)}</span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-0.5">
                            <span className="text-sm font-medium text-gray-900 truncate capitalize">
                              {d.type_depense}
                            </span>
                            {d.description && (
                              <span className="text-xs text-gray-500 truncate">• {d.description}</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <span className="flex items-center">
                              <FiCalendar className="mr-1" size={10} />
                              {formatDate(d.date_depense)}
                            </span>
                            <span className="flex items-center">
                              <FiMapPin className="mr-1" size={10} />
                              {d.centres?.nom || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-2">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {Number(d.montant).toLocaleString()} Ar
                          </div>
                        </div>

                        {((user && (user.role === 'admin' || user.role === 'dir')) || (user && user.role === 'gerant' && userCentreId && d.centre_id === userCentreId)) && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openEdit(d)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <FiEdit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Plus de pagination - affichage groupé par mois */}

      {/* Modal compact */}
      {formVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center p-2 z-50 sm:items-center">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
              <h3 className="text-base font-semibold">
                {editing ? 'Modifier dépense' : 'Nouvelle dépense'}
              </h3>
              <button
                onClick={() => setFormVisible(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                    value={form.date_depense}
                    onChange={(e) => setForm({ ...form, date_depense: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type_depense}
                    onChange={(e) => setForm({ ...form, type_depense: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                  >
                    {depenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded text-sm"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Montant (Ar)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                    value={form.montant}
                    onChange={(e) => setForm({ ...form, montant: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Centre</label>
                  {user && user.role === 'gerant' ? (
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded text-sm bg-gray-50"
                      value={(centres.find(c => c.id == userCentreId) || {}).nom || userCentreId || ''}
                      disabled
                    />
                  ) : (
                    <SearchableSelect
                      placeholder="Choisir centre"
                      options={centres.map(c => ({ value: c.id, label: c.nom }))}
                      value={form.centre_id}
                      onChange={(val) => setForm({ ...form, centre_id: val })}
                      className="w-full text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormVisible(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium"
                >
                  {editing ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}