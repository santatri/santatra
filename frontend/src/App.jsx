import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/authContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Centres from './pages/Centres';
import Formations from './pages/Formations';
import Etudiants from './pages/Etudiants';
import Inscriptions from './pages/Inscriptions';
import Droits from './pages/Droits';
import Depenses from './pages/Depenses';
import StatsPage from './pages/StatsPage';
import SendMail from './pages/SendMail';
import DepensesObligatoiresDashboard from './pages/DepensesObligatoiresDashboard'
import DashboardMontants from './pages/DashboardMontants';
import Parametres from './pages/Parametres';
import Livres from './pages/Livres';
import AutreMontant from './pages/AutreMontant';
import PaiementsEtAutres from './pages/PaiementsEtAutres';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pages publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Routes protégées */}
          <Route path="/dashboard/*" element={<ProtectedRoute element={<Dashboard />} />}>
            <Route path="users" element={<ProtectedRoute element={<Users />} allowedRoles={['admin']} />} />
            <Route path="centres" element={<ProtectedRoute element={<Centres />} allowedRoles={['admin']} />} />
            <Route path="formations" element={<ProtectedRoute element={<Formations />} allowedRoles={['admin']} />} />
            <Route path="etudiants" element={<Etudiants />} />
            <Route path="inscriptions" element={<Inscriptions />} />
            <Route path="droits" element={<Droits />} />
            <Route path="statspage" element={<StatsPage />} />
            <Route path="send-mail" element={<SendMail />} />
            <Route path="depensesObligatoiresDashboard" element={<DepensesObligatoiresDashboard />} />
            <Route path="depenses" element={<Depenses />} />
            <Route path="livres" element={<ProtectedRoute element={<Livres />} allowedRoles={['admin']} />} />
            <Route path="dashboardMontants" element={<DashboardMontants />} />
            <Route path="parametres" element={<Parametres />} />
            <Route path="autreMontant" element={<AutreMontant />} />
            <Route path="paiementsEtAutres" element={<PaiementsEtAutres />} />
          </Route>

          {/* Redirection des routes inconnues */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
