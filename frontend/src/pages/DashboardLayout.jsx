import React from 'react';
import Dashboard from './Dashboard';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="flex h-screen">
      {/* Sidebar - Dashboard */}
      <div className="w-2/5 bg-gray-800 text-white p-4">
        <Dashboard />
      </div>

      {/* Contenu principal */}
      <div className="w-3/5 p-6">
        <Outlet /> {/* Affiche la page actuelle */}
      </div>
    </div>
  );
};

export default DashboardLayout;
