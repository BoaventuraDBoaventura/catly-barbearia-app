
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Ocultar nav em páginas de autenticação, fluxos de agendamento ou detalhes da barbearia
  const isAuthPage = location.pathname === '/login';
  const isBookingPage = location.pathname.includes('/booking/');
  const isDetailPage = location.pathname.includes('/barbershop/');
  const shouldHideNav = isAuthPage || isBookingPage || isDetailPage;

  if (isAuthPage) return <>{children}</>;

  const navItems = [
    { label: 'Início', icon: 'home', path: '/' },
    { label: 'Favoritos', icon: 'favorite', path: '/favorites' },
    { label: 'Agenda', icon: 'calendar_month', path: '/appointments' },
    { label: 'Perfil', icon: 'person', path: '/profile' },
  ];

  return (
    <div className={`flex flex-col min-h-screen bg-background-dark text-white font-display ${shouldHideNav ? '' : 'pb-24'}`}>
      <main className="flex-1 w-full max-w-md mx-auto">
        {children}
      </main>

      {!shouldHideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-background-dark/95 backdrop-blur-xl border-t border-gray-800 pb-safe pt-2 px-6">
          <div className="flex justify-between items-center h-16 max-w-md mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-white'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[26px] ${isActive ? 'filled' : ''}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="h-4 w-full"></div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
