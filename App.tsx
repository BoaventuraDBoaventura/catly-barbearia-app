
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
import Favorites from './pages/Favorites';

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
        <h2 className="text-xl font-bold mb-2 text-white">Configuração Necessária</h2>
        <p className="text-text-secondary leading-relaxed max-w-md mx-auto mb-6">
          O Supabase não foi detectado. Se você está no <strong>Netlify</strong>, certifique-se de adicionar as chaves nas
          <code className="bg-gray-800 px-1 rounded text-red-400">Environment Variables</code> do painel de controle.
        </p>
        <div className="bg-gray-900/50 p-4 rounded-lg text-left text-sm border border-gray-800 w-full max-w-md">
          <p className="font-mono text-gray-400 mb-2">Variáveis necessárias:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300 font-mono text-xs">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
            <li className="opacity-50 text-[10px] mt-1 italic">VITE_GEMINI_API_KEY (Opcional)</li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2 bg-primary text-white rounded-full font-bold hover:brightness-110 transition-all"
        >
          Tentar Novamente
        </button>
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
                <Route path="/barbershop/:slug" element={<BarbershopDetail />} />
                <Route path="/booking/:barbershopId" element={<BookingFlow />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/map" element={<MapExplore />} />
                <Route path="/favorites" element={<Favorites />} />
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
