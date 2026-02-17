import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { RotatingLines } from 'react-loader-spinner';
import logo from '../assets/images.jpg';
import { AuthContext } from '../context/authContext'; // Importez le contexte
import { API_URL } from '../config';


const Login = () => {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext); // Ajoutez cette ligne

  const currentYear = new Date().getFullYear();
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    };
  }, []);

  // Redirection si déjà connecté - CORRIGÉ
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));

    // Vérifiez seulement si nous sommes sur la page de login
    if (location.pathname === '/login' && user) {
      // Petite pause pour éviter les conflits de navigation
      const timer = setTimeout(() => {
        const targetPath = user.role === 'admin' ? '/dashboard/users' : '/dashboard/etudiants';
        navigate(targetPath, { replace: true });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [navigate, location.pathname]); // Ajoutez location.pathname

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mdp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Erreur de connexion');
        setLoading(false);
        return;
      }

      // Utilisez la fonction login du contexte
      if (login) {
        login(data.user);
      } else {
        // Fallback si le contexte n'est pas disponible
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Redirigez après un court délai
      setTimeout(() => {
        const targetPath = (data.user.role === 'admin') ? '/dashboard/users' : '/dashboard/etudiants';
        navigate(targetPath, { replace: true });
      }, 100);

    } catch (err) {
      setError('Erreur serveur, réessayez plus tard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-3 md:p-8 safe-area-bottom overflow-hidden">
      {/* Container principal responsive */}
      <div className="w-full max-w-[90vw] md:max-w-md max-h-[85vh] md:max-h-[600px] bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden border border-white/20 mx-auto flex flex-col">

        {/* Header responsive */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 md:px-6 py-4 md:py-5 text-center relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 left-0 w-full h-0.5 md:h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
          <div className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-8 h-8 md:w-12 md:h-12 bg-white/10 rounded-full"></div>
          <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 w-7 h-7 md:w-10 md:h-10 bg-purple-400/20 rounded-full"></div>

          <div className="relative z-10 w-full">
            <div className="flex items-center justify-center space-x-2 md:space-x-3">
              <div className="w-7 h-7 md:w-10 md:h-10 bg-white/20 rounded md:rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/30 overflow-hidden">
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <h1 className="text-sm md:text-xl font-bold text-white">CFPM</h1>
                <p className="text-blue-100 text-[9px] md:text-sm">de Madagascar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire responsive */}
        <div className="p-4 md:p-6 flex-1 overflow-auto">
          <div className="space-y-1 md:space-y-2 mb-4 md:mb-6 text-center">
            <h2 className="text-sm md:text-xl font-bold text-gray-900">Connexion</h2>
            <p className="text-gray-600 text-[11px] md:text-base">Accédez à votre espace{window.innerWidth >= 768 ? ' personnel' : ''}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
            {/* Champ Email */}
            <div className="space-y-1 md:space-y-2">
              <label htmlFor="email" className="text-[11px] md:text-sm font-medium text-gray-700 flex items-center">
                <FaEnvelope className="mr-1 md:mr-2 text-blue-500 text-[10px] md:text-base" />
                {window.innerWidth >= 768 ? 'Adresse email' : 'Email'}
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-2 md:p-3 text-[13px] md:text-base bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 md:focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-gray-900"
                  autoComplete="email"
                  disabled={loading}
                  inputMode="email"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div className="space-y-1 md:space-y-2">
              <label htmlFor="mdp" className="text-[11px] md:text-sm font-medium text-gray-700 flex items-center">
                <FaLock className="mr-1 md:mr-2 text-blue-500 text-[10px] md:text-base" />
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="mdp"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  value={mdp}
                  onChange={(e) => setMdp(e.target.value)}
                  required
                  className="w-full p-2 md:p-3 text-[13px] md:text-base bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 md:focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-gray-900 pr-9 md:pr-11"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-1.5 md:right-2 top-1/2 transform -translate-y-1/2 focus:outline-none p-1 md:p-2 hover:bg-gray-100 rounded transition-colors duration-200 touch-manipulation"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                  disabled={loading}
                >
                  {showPassword ?
                    <FaEyeSlash className="text-gray-500 text-[10px] md:text-base" /> :
                    <FaEye className="text-gray-500 text-[10px] md:text-base" />
                  }
                </button>
              </div>
            </div>

            {/* Bouton de connexion responsive */}
            <button
              type="submit"
              className="w-full py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-800 active:scale-95 transform transition-all duration-300 shadow md:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center space-x-1.5 md:space-x-2 touch-manipulation text-[13px] md:text-base mt-2 md:mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RotatingLines
                    strokeColor="white"
                    strokeWidth="4"
                    animationDuration="0.75"
                    width={window.innerWidth >= 768 ? "18" : "14"}
                    visible={true}
                  />
                  <span>{window.innerWidth >= 768 ? 'Connexion en cours...' : 'Connexion...'}</span>
                </>
              ) : (
                <>
                  <FaLock className="text-[10px] md:text-sm" />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>

          {/* Message d'erreur responsive */}
          {error && (
            <div className="mt-3 md:mt-5 p-2 md:p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-1.5 md:space-x-2">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                <p className="text-red-700 text-[11px] md:text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Footer responsive */}
          <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-100 md:border-gray-200">
            <div className="text-center text-gray-500 text-[9px] md:text-xs">
              <p>© {currentYear} CFPM de Madagascar{window.innerWidth >= 768 ? ' - Tous droits réservés' : ''}</p>
              <p><span className="hidden md:inline">Version 1.0.0 </span></p>
            </div>
          </div>
        </div>
      </div>

      {/* CORRECTION : Remplacez <style jsx> par <style> */}
      <style>
        {`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        body {
          overflow: hidden;
          position: fixed;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 768px) {
          .h-screen {
            height: 100vh;
            height: 100dvh;
          }
        }
      `}
      </style>
    </div>
  );
};

export default Login;