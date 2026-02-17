import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const ProtectedRoute = ({ element, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Si on est encore en train d'initialiser l'auth, ne pas rediriger
  if (loading) return null;

  // Si pas d'utilisateur, redirige vers /login
  if (!user) return <Navigate to="/login" replace />;

  // Si des rôles sont spécifiés et que l'utilisateur n'en fait pas partie
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirige vers une page sûre (le dashboard par défaut)
    return <Navigate to="/dashboard" replace />;
  }

  // Autorise l'accès
  return element;
};

export default ProtectedRoute;



