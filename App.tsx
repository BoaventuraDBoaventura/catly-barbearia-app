
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import Layout from './components/Layout';
import Home from './pages/Home';
import BarbershopDetail from './pages/BarbershopDetail';
import BookingFlow from './pages/BookingFlow';
import Profile from './pages/Profile';
import MapExplore from './pages/MapExplore';
import Appointments from './pages/Appointments';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import PersonalData from './pages/PersonalData';
import GlobalStats from './pages/GlobalStats';
import Notifications from './pages/Notifications';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setDbError(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.error("Auth error:", err);
      setDbError(true);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-red-500 text-6xl mb-4">database_off</span>
        <h2 className="text-xl font-bold mb-2 text-white">Erro de Configuração</h2>
        <p className="text-text-secondary">O Supabase não foi configurado corretamente. Verifique o seu arquivo .env.local</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/barbershop/:id" element={<BarbershopDetail />} />
                <Route path="/booking/:barbershopId" element={<BookingFlow />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/map" element={<MapExplore />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/personal-data" element={<PersonalData />} />
                <Route path="/global-stats" element={<GlobalStats />} />
                <Route path="/notifications" element={<Notifications />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;
