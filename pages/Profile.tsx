
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhoto, setUserPhoto] = useState('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [maxShops, setMaxShops] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState({ visits: 0, favorites: 0 });
  const [favoriteBarbershops, setFavoriteBarbershops] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  useEffect(() => {
    getProfile();

    // Realtime changes
    let profileChannel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        profileChannel = supabase
          .channel(`profile-page-${session.user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          }, (payload) => {
            setUserName(payload.new.full_name || userName);
            setUserPhoto(payload.new.avatar_url || userPhoto);
            setMaxShops(payload.new.max_shops || 0);
            setUserRole(payload.new.role || null);
          })
          .subscribe();
      }
    }
    setupRealtime();

    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/auth');
        return;
      }

      const { user } = session;
      setUserEmail(user.email || '');

      let { data, error, status } = await supabase
        .from('profiles')
        .select(`full_name, avatar_url, role, max_shops`)
        .eq('id', user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUserName(data.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário');
        setUserPhoto(data.avatar_url || user.user_metadata?.avatar_url || userPhoto);
        const currentRole = data.role;
        const shopsLimit = data.max_shops || 0;
        setUserRole(currentRole);
        setIsAdmin(currentRole === 'admin' || currentRole === 'super_admin');
        setMaxShops(shopsLimit);
      } else {
        // Se o perfil não existir (usuário antigo ou erro no trigger), criar um
        const defaultName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
        setUserName(defaultName);

        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: defaultName,
          avatar_url: userPhoto,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error loading user data!', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    try {
      setLoadingFavorites(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('user_favorites')
        .select('barbershop_id')
        .eq('user_id', session.user.id);

      if (error) throw error;

      if (data) {
        const favoriteIds = data.map(f => f.barbershop_id);

        const { data: shops, error: shopsError } = await supabase
          .from('barbershops')
          .select('*')
          .in('id', favoriteIds);

        if (shopsError) throw shopsError;

        if (shops) {
          setFavoriteBarbershops(shops);
          setStats(prev => ({ ...prev, favorites: shops.length }));
        }
      }
    } catch (error) {
      console.error('Error loading favorites!', error);
    } finally {
      setLoadingFavorites(false);
    }
  }

  const handleSaveName = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: userName,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setIsEditingName(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const menuItems = [
    {
      title: 'Minha Atividade',
      items: [
        {
          label: 'Meus Agendamentos',
          icon: 'calendar_month',
          color: 'primary',
          onClick: () => navigate('/appointments')
        },
        {
          label: 'Histórico de Visitas',
          icon: 'history',
          color: 'primary',
          badge: stats.visits,
          onClick: () => console.log('Ver histórico')
        },
      ]
    },
    (isAdmin || maxShops > 0 || (userRole === 'shop_owner')) ? {
      title: 'Administração',
      items: [
        {
          label: isAdmin ? 'Gerenciar Plataforma' : 'Gerir Barbearia',
          icon: isAdmin ? 'dashboard_customize' : 'storefront',
          color: 'primary',
          onClick: () => navigate('/admin')
        },
        isAdmin && {
          label: 'Estatísticas Globais',
          icon: 'analytics',
          color: 'primary',
          onClick: () => navigate('/global-stats')
        }
      ].filter(Boolean) as any[]
    } : null,
    {
      title: 'Conta',
      items: [
        {
          label: 'Dados Pessoais',
          icon: 'person',
          color: 'primary',
          onClick: () => navigate('/personal-data')
        },
      ]
    },
    {
      title: 'Ações',
      items: [
        {
          label: 'Sair da Conta',
          icon: 'logout',
          color: 'danger',
          onClick: () => setShowLogoutModal(true)
        },
      ]
    }
  ];

  return (
    <div className="animate-fadeIn pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background-dark/90 backdrop-blur-xl p-4 pt-12 border-b border-white/5 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="size-11 rounded-2xl bg-surface-highlight flex items-center justify-center border border-white/10 shadow-lg active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-xl font-black">Meu Perfil</h2>
        <div className="size-11"></div> {/* Spacer to keep title centered */}
      </header>

      <div className="p-6">
        {/* User Info Card */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            {loading ? (
              <div className="relative size-32 rounded-[40px] bg-surface-highlight animate-pulse mb-6"></div>
            ) : (
              <img
                src={userPhoto}
                className="relative size-32 rounded-[40px] border-4 border-surface-dark shadow-2xl object-cover mb-6"
                alt={userName}
              />
            )}
            <button
              onClick={() => console.log('Alterar foto')}
              className="absolute -bottom-2 -right-2 size-11 bg-primary text-white rounded-2xl border-4 border-background-dark flex items-center justify-center shadow-2xl active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            </button>
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-surface-highlight border border-primary/50 rounded-xl px-4 py-2 text-xl font-black text-center focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="size-10 bg-primary rounded-xl flex items-center justify-center active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">check</span>
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  getProfile(); // Reset to original name
                }}
                className="size-10 bg-surface-highlight rounded-xl flex items-center justify-center active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2 overflow-hidden">
              <h1 className="text-2xl font-black whitespace-nowrap truncate">{userName}</h1>
              <button
                onClick={() => setIsEditingName(true)}
                className="size-8 bg-surface-highlight rounded-lg flex items-center justify-center active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>
          )}
          <p className="text-text-secondary font-bold text-sm tracking-tight">{userEmail}</p>
        </div>

        {/* Stats Cards */}
        <div className="flex justify-center mb-10">
          <div className="bg-surface-dark rounded-[28px] p-5 flex flex-col items-center border border-white/5 shadow-xl hover:border-primary/30 transition-all cursor-pointer active:scale-95 w-full max-w-[200px]">
            <span className="text-primary text-4xl font-black mb-1">{stats.visits}</span>
            <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest text-center">Visitas Realizadas</span>
          </div>
        </div>



        {/* Menu Sections */}
        <div className="space-y-10">
          {menuItems.filter(Boolean).map((section: any) => (
            <div key={section.title}>
              <h3 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] mb-4 px-2">{section.title}</h3>
              <div className="space-y-3">
                {section.items.map(item => (
                  <div
                    key={item.label}
                    onClick={item.onClick}
                    className="flex items-center gap-4 bg-surface-dark px-5 py-4 rounded-[22px] border border-white/5 active:scale-[0.98] transition-all cursor-pointer group shadow-sm hover:shadow-lg hover:border-white/10"
                  >
                    <div className={`size-12 rounded-[18px] flex items-center justify-center transition-all ${item.color === 'danger' ? 'bg-red-500/10 text-red-500 group-hover:bg-red-500/20' :
                      item.color === 'success' ? 'bg-success/10 text-success group-hover:bg-success/20' :
                        'bg-primary/10 text-primary group-hover:bg-primary/20'
                      }`}>
                      <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                    </div>
                    <p className={`flex-1 font-bold text-sm ${item.color === 'danger' ? 'text-red-500' : 'text-white'}`}>
                      {item.label}
                    </p>
                    {item.badge !== undefined && (
                      <span className="bg-primary text-white text-xs font-black px-2.5 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.color !== 'danger' && (
                      <span className="material-symbols-outlined text-text-secondary text-[18px] group-hover:translate-x-1 transition-transform">
                        chevron_right
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Catly App • Versão 2.4.0</p>
          <p className="text-[9px] text-text-secondary/50 mt-1">Desenvolvido com ❤️ em Moçambique</p>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-dark rounded-[32px] p-8 max-w-sm w-full border border-white/10 shadow-2xl animate-slideUp">
            <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-500 text-[32px]">logout</span>
            </div>
            <h3 className="text-2xl font-black text-center mb-2">Sair da Conta?</h3>
            <p className="text-text-secondary text-center text-sm mb-8">
              Você tem certeza que deseja sair? Seus dados estarão seguros quando voltar.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-14 bg-surface-highlight rounded-2xl font-bold text-sm border border-white/10 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-14 bg-red-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-500/30 active:scale-95 transition-all"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
