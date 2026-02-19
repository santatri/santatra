import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/authContext';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiUser, FiUsers, FiHome, FiChevronRight,
  FiBook, FiDollarSign, FiLogOut, FiBarChart2, FiBookOpen,
  FiShoppingBag, FiTrendingUp, FiTrendingDown, FiSettings,
  FiClipboard, FiCreditCard, FiMapPin, FiLayers
} from 'react-icons/fi';
import AlertRetardsFormation from '../components/AlertRetardsFormation';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [menu, setMenu] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false); // Ajoutez cet état
  const navigate = useNavigate();
  const location = useLocation();

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      closeSidebar();
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const menuIcons = {
    'Utilisateurs': <FiUsers className="w-4 h-4" />,
    'Formations': <FiBook className="w-4 h-4" />,
    'Centres': <FiMapPin className="w-4 h-4" />,
    'Livres': <FiBookOpen className="w-4 h-4" />,
    'Dashboard': <FiLayers className="w-4 h-4" />,
    'Etudiants': <FiUser className="w-4 h-4" />,
    'Inscriptions': <FiClipboard className="w-4 h-4" />,
    'Dépenses': <FiTrendingDown className="w-4 h-4" />,
    'StatsPage': <FiBarChart2 className="w-4 h-4" />,
    'Formateurs': <FiUser className="w-4 h-4" />,
    'Paramètres': <FiSettings className="w-4 h-4" />,
    'AutreMontant': <FiTrendingDown className="w-4 h-4" />,
    'Mois prochain': <FiCreditCard className="w-4 h-4" />,
    'Caisse': <FiDollarSign className="w-4 h-4" />,
    'PaiementsEtAutres': <FiDollarSign className="w-4 h-4" />,
    'Examens': <FiBook className="w-4 h-4" />
    
  };

  // Build menu based on role
  useEffect(() => {
    // Si pas d'utilisateur, ne rien faire
    if (!user) return;

    const newMenu = user.role === 'admin'
      ? [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Utilisateurs', path: '/dashboard/users' },
        { name: 'Centres', path: '/dashboard/centres' },
        { name: 'Formations', path: '/dashboard/formations' },
        { name: 'Livres', path: '/dashboard/livres' },
        { name: 'Etudiants', path: '/dashboard/etudiants' },
        { name: 'Inscriptions', path: '/dashboard/inscriptions' },
        { name: 'StatsPage', path: '/dashboard/statspage' },
        { name: 'Dépenses', path: '/dashboard/depenses' },
        { name: 'Caisse', path: '/dashboard/depensesObligatoiresDashboard' },
        { name: 'Mois prochain', path: '/dashboard/dashboardMontants' },
        { name: 'AutreMontant', path: '/dashboard/autreMontant' },
        { name: 'Total', path: '/dashboard/paiementsEtAutres' },
        { name: 'Examens', path: '/dashboard/examens' },
        { name: 'Paramètres', path: '/dashboard/parametres' }
      ]
      : user.role === 'dir'
        ? [
          { name: 'Dashboard', path: '/dashboard' },
          { name: 'Etudiants', path: '/dashboard/etudiants' },
          { name: 'Inscriptions', path: '/dashboard/inscriptions' },
          { name: 'StatsPage', path: '/dashboard/statspage' },
          { name: 'Dépenses', path: '/dashboard/depenses' },
          { name: 'Caisse', path: '/dashboard/depensesObligatoiresDashboard' },
          { name: 'Mois prochain', path: '/dashboard/dashboardMontants' },
          { name: 'AutreMontant', path: '/dashboard/autreMontant' },
          { name: 'Examens', path: '/dashboard/examens' },
          // { name: 'Total', path: '/dashboard/paiementsEtAutres' },
          // { name: 'Paramètres', path: '/dashboard/parametres' }
        ]
        : [
          { name: 'Dashboard', path: '/dashboard' },
          { name: 'Etudiants', path: '/dashboard/etudiants' },
          { name: 'Inscriptions', path: '/dashboard/inscriptions' },
          { name: 'StatsPage', path: '/dashboard/statspage' },
          { name: 'Caisse', path: '/dashboard/depensesObligatoiresDashboard' },
          { name: 'Mois prochain', path: '/dashboard/dashboardMontants' },
          { name: 'AutreMontant', path: '/dashboard/autreMontant' },
          { name: 'Examens', path: '/dashboard/examens' },
          // { name: 'Total', path: '/dashboard/paiementsEtAutres' },
        ];
    setMenu(newMenu);
  }, [user]);

  // CORRECTION PRINCIPALE : Gestion de la redirection
  useEffect(() => {
    if (!user) {
      // Si pas d'utilisateur, redirigez vers login
      navigate('/login', { replace: true });
      return;
    }

    // Si nous sommes sur la racine du dashboard ET que nous n'avons pas encore redirigé
    if ((location.pathname === '/dashboard' || location.pathname === '/dashboard/') && !hasRedirected) {
      setHasRedirected(true);

      // Déterminez la route cible
      const targetPath = (user.role === 'admin') ? '/dashboard/users' : '/dashboard/etudiants';

      // Utilisez setTimeout pour éviter les conflits de navigation
      const timer = setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 50);

      return () => clearTimeout(timer);
    }

    // Si nous ne sommes pas sur la racine, réinitialisez l'état de redirection
    if (location.pathname !== '/dashboard' && location.pathname !== '/dashboard/') {
      setHasRedirected(false);
    }
  }, [user, location.pathname, navigate, hasRedirected]);

  const getCurrentPageName = () => {
    // Triez le menu par longueur de chemin pour prioriser les chemins plus spécifiques
    const sortedMenu = [...menu].sort((a, b) => b.path.length - a.path.length);
    const currentItem = sortedMenu.find(item => location.pathname.startsWith(item.path));
    return currentItem ? currentItem.name : 'Tableau de bord';
  };

  const handleLogout = () => {
    logout();
    // Redirection après logout
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 100);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar toggle button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-3 left-3 z-50 p-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg lg:hidden shadow-lg transition-all duration-200 active:scale-95 hover:shadow-xl ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
      >
        <FiMenu size={18} />
      </button>

      {/* Sidebar overlay */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative w-64 bg-gradient-to-b from-white to-gray-50 text-gray-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out border-r border-gray-200 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          } h-full z-50`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mr-3 shadow-lg">
              <FiLayers className="text-white" size={18} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">CFPM de Madagascar</h1>
              <p className="text-xs text-gray-500">Gestion de centre</p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={closeSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg active:bg-gray-200 transition-colors duration-150"
            >
              <FiX size={16} className="text-gray-500" />
            </button>
          )}
        </div>

        {/* User profile */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 mx-3 mt-3 rounded-xl border border-blue-100">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow">
              <FiUser className="text-white" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate text-sm">
                {user?.prenom} {user?.nom}
              </h2>
              <p className="text-xs text-white bg-gradient-to-r from-blue-500 to-indigo-600 px-2 py-1 rounded-full inline-block mt-1 border border-blue-200 capitalize font-medium">
                {user?.role === 'admin' ? 'Administrateur' : user?.role === 'dir' ? 'Direction' : 'Gérant'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {menu.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group active:scale-95 ${isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'hover:bg-gray-50 text-gray-700 active:bg-gray-100 border border-transparent hover:border-gray-200'
                    }`}
                >
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 transition-all duration-200 ${isActive
                      ? 'bg-white bg-opacity-20'
                      : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:scale-110'
                      }`}>
                      {menuIcons[item.name]}
                    </div>
                    <span className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-700'
                      }`}>
                      {item.name}
                    </span>
                  </div>
                  {isActive && (
                    <FiChevronRight
                      size={14}
                      className={`${isActive ? 'text-white' : 'text-gray-400'} transform group-hover:translate-x-0.5 transition-transform`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 border border-transparent hover:border-red-200 active:bg-red-100 group"
          >
            <div className="flex items-center">
              <div className="p-2 rounded-lg mr-3 bg-red-50 text-red-500 group-hover:bg-red-100 group-hover:scale-110 transition-all duration-200">
                <FiLogOut className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm group-hover:text-red-600">
                Déconnexion
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-4 px-4 lg:px-6 shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mr-3">
                  {menuIcons[getCurrentPageName()] || <FiLayers className="w-4 h-4" />}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">
                    {getCurrentPageName()}
                  </h1>
                  <nav className="flex items-center space-x-1 text-sm text-gray-500">
                    <Link
                      to="/dashboard"
                      className="hover:text-blue-600 transition-colors duration-150 active:text-blue-700 flex items-center"
                    >
                      <FiHome className="w-3 h-3 mr-1" />
                      Dashboard
                    </Link>
                    <FiChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 font-medium truncate text-sm flex items-center">
                      {getCurrentPageName()}
                    </span>
                  </nav>
                </div>
              </div>
            </div>

            {/* Ajout de l'alerte des retards et informations utilisateur */}
            <div className="flex items-center space-x-4">
              {/* Composant d'alerte des retards de formation */}
              <AlertRetardsFormation />

              {/* User info - Desktop */}
              <div className="hidden lg:flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl px-4 py-2 border border-gray-200 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow">
                  <FiUser className="text-white" size={16} />
                </div>
                <div className="text-right min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {user?.prenom} {user?.nom}
                  </div>
                  <div className="text-xs text-gray-500 capitalize bg-white px-2 py-1 rounded-full border">
                    {user?.role === 'admin' ? 'Administrateur' : user?.role === 'dir' ? 'Direction' : 'Gérant'}
                  </div>
                </div>
              </div>

              {/* Mobile user menu */}
              <div className="lg:hidden">
                <button
                  onClick={toggleSidebar}
                  className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl active:bg-gray-300 transition-all duration-150 shadow-sm active:scale-95"
                >
                  <FiUser className="text-gray-600" size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50/30">
          <div className="p-4 md:p-5 lg:p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[calc(100vh-140px)] overflow-hidden">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;