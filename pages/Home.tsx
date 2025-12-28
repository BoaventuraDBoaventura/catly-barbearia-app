
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAddressFromCoords } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { calculateDistance, formatDistance } from '../services/locationUtils';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('Moçambique');
  const [locationUrl, setLocationUrl] = useState<string | undefined>(undefined);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [barbershops, setBarbershops] = useState<any[]>([]);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const isRetrying = useRef(false);

  useEffect(() => {
    async function getUserPhoto() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single();

        if (data?.avatar_url) {
          setUserPhoto(data.avatar_url);
        } else if (session.user.user_metadata?.avatar_url) {
          setUserPhoto(session.user.user_metadata.avatar_url);
        } else {
          setUserPhoto(null);
        }
      }
    }
    getUserPhoto();
    fetchFavorites();
    fetchBarbershops();

    // Realtime subscription for profile changes
    let profileChannel: any;
    const setupSubscriptions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        profileChannel = supabase
          .channel(`profile-home-${session.user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          }, (payload) => {
            setUserPhoto(payload.new.avatar_url || null);
          })
          .subscribe();
      }
    };
    setupSubscriptions();

    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, []);

  async function fetchBarbershops() {
    try {
      setLoadingShops(true);
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .order('rating', { ascending: false });

      if (error) throw error;
      if (data) setBarbershops(data);
    } catch (error) {
      console.error('Error fetching barbershops:', error);
    } finally {
      setLoadingShops(false);
    }
  }

  async function fetchFavorites() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('user_favorites')
        .select('barbershop_id')
        .eq('user_id', session.user.id);

      if (data) {
        setFavorites(data.map(f => f.barbershop_id));
      }
    }
  }

  const handleOpenKeySelection = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setNeedsApiKey(false);
      updateLocation();
    }
  };

  const updateLocation = useCallback(async () => {
    setLoadingLocation(true);
    setNeedsApiKey(false);
    setLocationName('Moçambique');

    if (!navigator.geolocation) {
      setLocationName('GPS não suportado');
      setLoadingLocation(false);
      return;
    }

    const successCallback = async (position: GeolocationPosition) => {
      setLocationName('Moçambique');
      const { latitude, longitude } = position.coords;
      setUserCoords({ lat: latitude, lng: longitude });

      try {
        const { address, url } = await getAddressFromCoords(latitude, longitude);
        setLocationName(address);
        setLocationUrl(url);
        isRetrying.current = false;
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        if (errorMsg.includes("Requested entity was not found")) {
          setNeedsApiKey(true);
          setLocationName('Ajuste de Chave Necessário');
        } else {
          setLocationName('Maputo, Moçambique');
        }
      } finally {
        setLoadingLocation(false);
      }
    };

    const errorCallback = (error: GeolocationPositionError) => {
      setLocationName("Maputo, Moçambique");
      setLoadingLocation(false);
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  }, [getAddressFromCoords]);

  useEffect(() => {
    updateLocation();
  }, [updateLocation]);

  const categories = [
    { id: 'todos', label: 'Todos', icon: 'grid_view' },
    { id: 'cabelo', label: 'Cabelo', icon: 'cut' },
    { id: 'barba', label: 'Barba', icon: 'face' },
    { id: 'tratamento', label: 'Tratamento', icon: 'spa' },
    { id: 'premium', label: 'Premium', icon: 'diamond' },
  ];

  const filteredShops = useMemo(() => {
    return barbershops.map(shop => {
      // Calculate real-time distance if user and shop have coords
      let realDistance = shop.distance;
      if (userCoords && shop.latitude && shop.longitude) {
        realDistance = calculateDistance(
          userCoords.lat,
          userCoords.lng,
          shop.latitude,
          shop.longitude
        );
      }

      return {
        ...shop,
        realDistance
      };
    }).filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeCategory === 'Todos') return matchesSearch;
      if (activeCategory === 'Premium') return matchesSearch && shop.is_premium;

      const categoryKeywords: Record<string, string[]> = {
        'Cabelo': ['corte', 'cabelo'],
        'Barba': ['barba'],
        'Tratamento': ['tratamento', 'hidratacao', 'spa']
      };

      const keywords = categoryKeywords[activeCategory] || [];
      const hasService = shop.services.some((s: any) =>
        keywords.some(k => s.name.toLowerCase().includes(k) || s.description.toLowerCase().includes(k))
      );

      return matchesSearch && hasService;
    }).sort((a, b) => (a.realDistance || 0) - (b.realDistance || 0));
  }, [activeCategory, searchQuery, barbershops, userCoords]);

  const toggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const isFavorite = favorites.includes(id);

    if (isFavorite) {
      setFavorites(prev => prev.filter(f => f !== id));
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('barbershop_id', id);
    } else {
      setFavorites(prev => [...prev, id]);
      await supabase
        .from('user_favorites')
        .insert({
          user_id: session.user.id,
          barbershop_id: id
        });
    }
  };

  return (
    <div className="animate-fadeIn pb-10 min-h-screen bg-background-dark">
      {/* Header Melhorado */}
      <header className="sticky top-0 z-40 bg-background-dark/95 backdrop-blur-xl border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Explore as melhores</span>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={updateLocation}>
              <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className={`material-symbols-outlined text-primary text-[20px] ${loadingLocation ? 'animate-spin' : ''}`}>
                  {loadingLocation ? 'sync' : 'location_on'}
                </span>
              </div>
              <h1 className="text-lg font-extrabold truncate pr-4 text-white">{locationName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/notifications')}
              className="size-11 rounded-2xl bg-surface-highlight flex items-center justify-center relative shadow-lg active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-surface-highlight"></span>
            </button>
            {userPhoto ? (
              <img src={userPhoto} className="size-11 rounded-2xl border-2 border-white/10 shadow-lg object-cover" alt="Perfil" onClick={() => navigate('/profile')} />
            ) : (
              <div
                className="size-11 rounded-2xl border-2 border-white/10 shadow-lg bg-surface-highlight flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                onClick={() => navigate('/profile')}
              >
                <span className="material-symbols-outlined text-primary text-[24px] filled">person</span>
              </div>
            )}
          </div>
        </div>

        {/* Busca Reativa */}
        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou estilo..."
            className="w-full pl-12 pr-4 h-14 rounded-2xl border-none bg-surface-highlight text-white placeholder:text-text-secondary focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
          />
        </div>

        {/* Categorias com Scroll Suave */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.label)}
              className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl px-4 transition-all ${activeCategory === cat.label
                ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-105'
                : 'bg-surface-highlight text-text-secondary border border-white/5'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
              <p className="text-xs font-bold uppercase tracking-wider">{cat.label}</p>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 mt-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Perto de você</h2>
            <p className="text-xs text-text-secondary font-medium">Encontramos {filteredShops.length} lugares incríveis</p>
          </div>
          <button onClick={() => navigate('/map')} className="text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 bg-primary/10 rounded-lg">Ver Mapa</button>
        </div>

        <div className="grid gap-6">
          {loadingShops ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-surface-dark rounded-[24px] animate-pulse"></div>
              ))}
            </div>
          ) : filteredShops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => navigate(`/barbershop/${shop.id}`)}
              className="group flex flex-col bg-surface-dark rounded-[24px] overflow-hidden shadow-2xl transition-all border border-white/5 active:scale-[0.98] cursor-pointer relative"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={shop.image} alt={shop.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                <div className="absolute top-4 left-4 flex gap-2">
                  {shop.is_premium && (
                    <div className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                      PREMIUM
                    </div>
                  )}
                  <div className={`text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg backdrop-blur-md ${shop.is_open ? 'bg-success/90' : 'bg-red-500/90'}`}>
                    {shop.is_open ? 'Aberto' : 'Fechado'}
                  </div>
                </div>

                <button
                  onClick={(e) => toggleFavorite(e, shop.id)}
                  className={`absolute top-4 right-4 size-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${favorites.includes(shop.id) ? 'bg-red-500 text-white shadow-red-500/20 shadow-xl' : 'bg-black/40 text-white'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[22px] ${favorites.includes(shop.id) ? 'filled' : ''}`}>favorite</span>
                </button>

                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white leading-tight mb-1">{shop.name}</h3>
                    <div className="flex items-center gap-2 text-white/80">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span className="text-xs font-medium">{shop.neighborhood}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                    <span className="material-symbols-outlined text-yellow-400 text-[16px] filled">star</span>
                    <span className="text-white text-sm font-black">{shop.rating}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Distância</span>
                    <span className="text-sm font-bold text-white">{formatDistance(shop.realDistance)}</span>
                  </div>
                  <div className="w-px h-6 bg-white/10"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Preço</span>
                    <span className="text-sm font-bold text-white">
                      {shop.services && shop.services.length > 0
                        ? `MT ${Math.min(...shop.services.map((s: any) => s.price)).toFixed(2)}`
                        : '---'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/booking/${shop.id}`);
                  }}
                  className="h-11 px-6 bg-primary rounded-xl text-white text-sm font-black shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all"
                >
                  RESERVAR
                </button>
              </div>
            </div>
          ))}

          {!loadingShops && filteredShops.length === 0 && (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-6xl text-text-secondary/20 mb-4">search_off</span>
              <p className="text-text-secondary font-bold">Nenhuma barbearia encontrada.</p>
              <button onClick={() => { setActiveCategory('Todos'); setSearchQuery(''); }} className="mt-4 text-primary font-bold">Limpar filtros</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
