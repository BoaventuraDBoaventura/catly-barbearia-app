
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { calculateDistance, formatDistance } from '../services/locationUtils';
import { isShopOpen } from '../services/timeUtils';

const Favorites: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [shops, setShops] = useState<any[]>([]);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => {
        const saved = localStorage.getItem('catly_user_coords');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (!userCoords && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserCoords({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                () => console.log('Using default location')
            );
        }
        fetchFavorites();
    }, []);

    async function fetchFavorites() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate('/auth');
                return;
            }

            // 1. Get favorite IDs
            const { data: favs, error: favError } = await supabase
                .from('user_favorites')
                .select('barbershop_id')
                .eq('user_id', session.user.id);

            if (favError) throw favError;

            if (favs && favs.length > 0) {
                const ids = favs.map(f => f.barbershop_id);

                // 2. Get shops details
                const { data: shopsData, error: shopsError } = await supabase
                    .from('barbershops')
                    .select('*')
                    .in('id', ids);

                if (shopsError) throw shopsError;

                if (shopsData) {
                    // Process shops (distance, open status)
                    const processed = shopsData.map(shop => {
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
                            realDistance,
                            is_open: isShopOpen(shop.opening_time || '08:00', shop.closing_time || '20:00', shop.opening_days)
                        };
                    });
                    setShops(processed);
                }
            } else {
                setShops([]);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoading(false);
        }
    }

    const removeFavorite = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { error } = await supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', session.user.id)
                .eq('barbershop_id', id);

            if (error) throw error;

            // Remove from local state
            setShops(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error removing favorite:', error);
        }
    };

    return (
        <div className="animate-fadeIn min-h-screen pb-32 bg-background-dark">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background-dark/95 backdrop-blur-xl p-4 pt-12 border-b border-white/5 flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Meus Favoritos</h1>
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined filled">favorite</span>
                </div>
            </header>

            <div className="px-4 space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-40 bg-surface-dark rounded-[24px] animate-pulse"></div>
                        ))}
                    </div>
                ) : shops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="size-20 rounded-full bg-surface-dark flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl text-text-secondary/30">heart_broken</span>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Sem favoritos ainda</h3>
                        <p className="text-text-secondary text-sm max-w-[200px] mb-6">Explore o app e adicione barbearias aos seus favoritos.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all"
                        >
                            Explorar Agora
                        </button>
                    </div>
                ) : (
                    shops.map(shop => (
                        <div
                            key={shop.id}
                            onClick={() => navigate(`/barbershop/${shop.slug || shop.id}`)}
                            className="group bg-surface-dark rounded-[24px] overflow-hidden border border-white/5 active:scale-[0.98] transition-all cursor-pointer relative"
                        >
                            <div className="flex p-3 gap-4">
                                <div className="w-24 h-24 rounded-2xl bg-gray-800 shrink-0 overflow-hidden relative">
                                    <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                                    <div className={`absolute bottom-0 left-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase text-center text-white ${shop.is_open ? 'bg-success/90' : 'bg-red-500/90'}`}>
                                        {shop.is_open ? 'Aberto' : 'Fechado'}
                                    </div>
                                </div>

                                <div className="flex-1 py-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-base font-black text-white truncate pr-2">{shop.name}</h3>
                                        <button
                                            onClick={(e) => removeFavorite(e, shop.id)}
                                            className="size-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center -mt-1 -mr-1 active:scale-90 transition-all hover:bg-red-500/20"
                                        >
                                            <span className="material-symbols-outlined text-[18px] filled">favorite</span>
                                        </button>
                                    </div>

                                    <p className="text-text-secondary text-xs truncate mb-3 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                                        {shop.neighborhood}
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 bg-surface-highlight px-2 py-1 rounded-lg">
                                            <span className="material-symbols-outlined text-yellow-500 text-[14px] filled">star</span>
                                            <span className="text-xs font-bold text-white">{shop.rating}</span>
                                        </div>
                                        <span className="text-xs font-bold text-text-secondary">
                                            {formatDistance(shop.realDistance)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Favorites;
