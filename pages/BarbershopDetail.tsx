
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStyleAdvice } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { isShopOpen } from '../services/timeUtils';
import { calculateDistance, formatDistance, openDirections } from '../services/locationUtils';
import StarRating from '../components/StarRating';

const BarbershopDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [activeTab, setActiveTab] = useState('servicos');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = localStorage.getItem('catly_user_coords');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    fetchShopDetails();
    if (!userCoords) {
      getUserLocation();
    }
  }, [slug]);

  useEffect(() => {
    if (shop?.id) {
      checkFavoriteStatus();
    }
  }, [shop]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error("Error getting location:", error)
      );
    }
  };

  async function fetchShopDetails() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      const enrichedShop = {
        ...data,
        is_open: isShopOpen(data.opening_time || '08:00', data.closing_time || '20:00', data.opening_days)
      };
      setShop(enrichedShop);
    } catch (error) {
      console.error('Error fetching shop:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkFavoriteStatus() {
    if (!shop?.id) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('barbershop_id', shop.id)
      .single();

    setIsFavorite(!!data);
  }

  const toggleFavorite = async () => {
    if (!shop?.id) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    if (isFavorite) {
      setIsFavorite(false);
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('barbershop_id', shop.id);
    } else {
      setIsFavorite(true);
      await supabase
        .from('user_favorites')
        .insert({
          user_id: session.user.id,
          barbershop_id: shop.id
        });
    }
  };

  const handleServiceClick = async (serviceName: string) => {
    if (advice && advice.includes(serviceName)) return;
    setLoadingAdvice(true);
    const res = await getStyleAdvice(serviceName);
    setAdvice(res || null);
    setLoadingAdvice(false);
  };

  const handleDirections = () => {
    if (!shop) return;
    openDirections(
      shop.latitude,
      shop.longitude,
      `${shop.name}, ${shop.neighborhood || ''}, Maputo`
    );
  };

  const submitRating = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      if (!shop?.id) return;

      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: session.user.id,
          barbershop_id: shop.id,
          rating: userRating
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          alert('Você já avaliou esta barbearia!');
        } else {
          throw error;
        }
      } else {
        alert(`Obrigado! Sua avaliação de ${userRating} estrelas foi registrada.`);
        fetchShopDetails(); // Refresh to update rating count
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      alert('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setShowRatingModal(false);
    }
  };

  const handleShare = async () => {
    if (!shop) return;
    const shareData = {
      title: `Barbearia ${shop.name}`,
      text: `Confira a barbearia ${shop.name} no Barberias!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleNavigateImage = (direction: 'next' | 'prev', e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!shop?.gallery || !selectedImage) return;

    const gallery = Array.isArray(shop.gallery) ? shop.gallery : [];
    if (gallery.length <= 1) return;

    const currentIndex = gallery.indexOf(selectedImage);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % gallery.length;
    } else {
      newIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    }

    setSelectedImage(gallery[newIndex]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background-dark p-8 text-center flex flex-col items-center justify-center">
        <h2 className="text-2xl font-black text-white mb-4">Barbearia não encontrada</h2>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-white font-bold rounded-xl">Voltar para Home</button>
      </div>
    );
  }

  return (
    <div className="relative animate-fadeIn min-h-screen pb-32 bg-background-dark">
      {/* Hero Header */}
      <div className="relative h-[40vh] w-full">
        <div className="absolute top-12 w-full z-20 flex justify-between px-4">
          <button onClick={() => navigate(-1)} className="size-11 rounded-2xl bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10 text-white shadow-2xl active:scale-95 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={toggleFavorite}
              className={`size-11 rounded-2xl backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-2xl transition-all active:scale-90 ${isFavorite ? 'bg-red-500 text-white' : 'bg-black/40 text-white'}`}
            >
              <span className={`material-symbols-outlined ${isFavorite ? 'filled' : ''}`}>favorite</span>
            </button>
            <button
              onClick={handleDirections}
              className="size-11 rounded-2xl bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10 text-white shadow-2xl active:scale-95 transition-all"
              title="Obter Rota"
            >
              <span className="material-symbols-outlined">directions</span>
            </button>
            <button
              onClick={handleShare}
              className="size-11 rounded-2xl bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10 text-white shadow-2xl active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>
        </div>
        <img
          src={shop.image}
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-700"
          alt={shop.name}
          onClick={() => setSelectedImage(shop.image)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/20 to-transparent pointer-events-none"></div>
      </div>

      <div className="px-4 -mt-16 relative z-10">
        {/* Main Info Card */}
        <div className="bg-surface-dark rounded-[32px] p-6 shadow-2xl border border-white/5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">{shop.name}</h1>
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span className="text-xs font-bold uppercase tracking-widest">{shop.neighborhood}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer active:scale-95 transition-all ${(shop.ratings_count || 0) >= 3
                  ? 'bg-primary/10 border-primary/20'
                  : 'bg-primary border-primary text-white'
                  }`}
                onClick={() => setShowRatingModal(true)}
              >
                {(shop.ratings_count || 0) >= 3 ? (
                  <>
                    <StarRating rating={shop.rating} size={14} />
                    <span className="text-white text-sm font-black ml-1">{shop.rating?.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="text-xs font-black uppercase tracking-widest">Novo</span>
                )}
              </div>
              <span className="text-[9px] text-text-secondary font-bold mt-1 cursor-pointer hover:text-white" onClick={() => setShowRatingModal(true)}>
                {(shop.ratings_count || 0) > 0 ? `${shop.ratings_count} avaliações` : 'Seja o primeiro a avaliar'}
              </span>
            </div>
          </div>

          <div className="flex gap-6 py-4 border-t border-white/5 items-center">
            <div className="flex flex-col">
              <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Distância</span>
              <span className="text-white font-bold">
                {userCoords && shop.latitude && shop.longitude
                  ? formatDistance(calculateDistance(userCoords.lat, userCoords.lng, shop.latitude, shop.longitude))
                  : `${shop.distance || '1.0'} km`}
              </span>
            </div>
            <div className="w-px h-8 bg-white/5"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Status</span>
              <span className={`font-bold ${shop.is_open ? 'text-success' : 'text-red-500'}`}>{shop.is_open ? 'Aberto' : 'Fechado'}</span>
            </div>
            <div className="w-px h-8 bg-white/5 ml-auto"></div>
            <button
              onClick={handleDirections}
              className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl border border-primary/20 transition-all active:scale-95 group"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">directions</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Rota</span>
            </button>
          </div>
        </div>

        {/* AI Advice Section */}
        {advice && (
          <div className="bg-primary/10 border border-primary/20 rounded-[24px] p-5 mb-6 animate-slideUp">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[18px]">robot_2</span>
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest text-primary">Dica Especial da IA</h4>
            </div>
            <p className="text-sm text-white leading-relaxed font-medium italic">"{advice}"</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/5 mb-6">
          {['servicos', 'sobre', 'fotos'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-primary' : 'text-text-secondary'}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full animate-scaleIn"></div>}
            </button>
          ))}
        </div>

        {activeTab === 'servicos' && (
          <div className="space-y-4 animate-slideUp">
            {shop.services?.map((service: any) => (
              <div
                key={service.id}
                onClick={() => handleServiceClick(service.name)}
                className="group bg-surface-dark border border-white/5 p-4 rounded-[24px] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:border-primary/30"
              >
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-surface-highlight flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">{service.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-black text-white">{service.name}</h4>
                    <p className="text-xs text-text-secondary">{service.duration} min • {service.price.toFixed(2)} MT</p>
                  </div>
                </div>
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {loadingAdvice ? (
                    <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sobre' && (
          <div className="animate-slideUp">
            <p className="text-white text-sm leading-relaxed mb-6">
              {shop.description || 'Uma barbearia premium focada em estilo e bem-estar, proporcionando a melhor experiência de cuidado masculino.'}
            </p>
            <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary mb-4">Localização</h4>
            <div
              onClick={handleDirections}
              className="bg-surface-dark rounded-2xl p-4 border border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:border-primary/30"
            >
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-surface-highlight flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">map</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">{shop.address}</p>
                  <p className="text-[10px] text-text-secondary uppercase font-bold">{shop.neighborhood}</p>
                </div>
              </div>
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">directions</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fotos' && (
          <div className="grid grid-cols-2 gap-4 animate-slideUp">
            {shop.gallery && (shop.gallery as string[]).map((photo: string, idx: number) => (
              <div
                key={idx}
                className="aspect-square rounded-2xl overflow-hidden border border-white/5 shadow-xl cursor-pointer active:scale-95 transition-all"
                onClick={() => setSelectedImage(photo)}
              >
                <img src={photo} className="w-full h-full object-cover transition-transform hover:scale-110 duration-500" alt={`Galeria ${idx}`} />
              </div>
            ))}
            {(!shop.gallery || shop.gallery.length === 0) && (
              <div className="col-span-2 py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-white/10 mb-2">no_photography</span>
                <p className="text-text-secondary text-sm font-bold">Nenhuma foto na galeria.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Buffer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background-dark/95 backdrop-blur-xl border-t border-white/5 p-4 pb-8 z-[150] shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate(`/booking/${shop.id}`)}
            className="w-full h-16 bg-primary text-white font-black rounded-[24px] shadow-2xl shadow-primary/30 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
          >
            AGENDAR AGORA
            <span className="material-symbols-outlined">calendar_month</span>
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-12 right-6 size-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-white z-[210] active:scale-90 transition-all hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* Navigation Buttons */}
          {shop.gallery && shop.gallery.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 size-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-white z-[210] active:scale-90 transition-all hover:bg-white/20"
                onClick={(e) => handleNavigateImage('prev', e)}
              >
                <span className="material-symbols-outlined text-[32px]">chevron_left</span>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 size-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-white z-[210] active:scale-90 transition-all hover:bg-white/20"
                onClick={(e) => handleNavigateImage('next', e)}
              >
                <span className="material-symbols-outlined text-[32px]">chevron_right</span>
              </button>
            </>
          )}

          <div className="relative w-full max-w-4xl animate-scaleIn flex justify-center items-center h-full pointer-events-none">
            <img
              src={selectedImage}
              className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] pointer-events-auto"
              alt="Visualização"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-dark rounded-[32px] p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-slideUp">
            <div className="text-center mb-6">
              <h3 className="text-xl font-black text-white mb-2">Avaliar Experiência</h3>
              <p className="text-text-secondary text-sm">Como foi seu atendimento na {shop.name}?</p>
            </div>

            <div className="flex justify-center mb-8">
              <StarRating
                rating={userRating}
                interactive={true}
                size={40}
                onRatingChange={setUserRating}
                className="gap-2"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 h-12 rounded-xl bg-surface-highlight border border-white/10 font-bold text-sm text-text-secondary active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={submitRating}
                disabled={userRating === 0}
                className="flex-1 h-12 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar Avaliação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarbershopDetail;
