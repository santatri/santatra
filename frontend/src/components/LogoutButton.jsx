import React, { useState } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa'; // Icône de déconnexion
import { ClipLoader } from 'react-spinners'; // Loader

const LogoutButton = () => {
  const { logout } = useAuth(); // Récupérer la fonction logout du contexte d'authentification
  const navigate = useNavigate(); // Hook pour la navigation
  const [isLoggingOut, setIsLoggingOut] = useState(false); // État pour gérer l'affichage du loader

  const handleLogout = () => {
    setIsLoggingOut(true); // Activer le loader

    // Simuler une attente de 1/4 de seconde avant de se déconnecter
    setTimeout(() => {
      logout(); // Supprimer l'utilisateur du contexte et du stockage local
      navigate('/login'); // Rediriger vers la page de connexion
    }, 250); // 250 ms = 1/4 de seconde
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center space-x-2 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
      disabled={isLoggingOut} // Désactiver le bouton pendant la déconnexion
    >
      {isLoggingOut ? (
        <ClipLoader size={20} color="#ffffff" /> // Afficher le loader
      ) : (
        <>
          <FaSignOutAlt />
          <span>Se déconnecter</span>
        </>
      )}
    </button>
  );
};

export default LogoutButton;