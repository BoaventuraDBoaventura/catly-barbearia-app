
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { calculateDistance, formatDistance } from '../services/locationUtils';

const MapExplore: React.FC = () => {
  const navigate = useNavigate();
  const [barbershops, setBarbershops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState({ lat: -25.9692, lng: 32.5732 }); // Default Maputo, Moçambique
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(0.01);

  const selectedShopDistance = useMemo(() => {
    if (!selectedShop || !userLocation) return selectedShop?.distance || 0;
    if (selectedShop.latitude && selectedShop.longitude) {
      return calculateDistance(
        userLocation.lat,
        userLocation.lng,
        selectedShop.latitude,
        selectedShop.longitude
      );
    }
    return selectedShop.distance || 0;
  }, [selectedShop, userLocation]);

  useEffect(() => {
    fetchBarbershops();

    const timer = setTimeout(() => setMapLoaded(true), 500);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log('Using default location')
      );
    }

    return () => clearTimeout(timer);
  }, []);

  async function fetchBarbershops() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('barbershops')
        .select('*');

      if (error) throw error;
      if (data) {
        setBarbershops(data);
        setSelectedShop(data[0]);
      }
    } catch (error) {
      console.error('Error fetching shops for map:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredShops = useMemo(() => {
    return barbershops.filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || (shop.category || '').toLowerCase() === activeCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [barbershops, searchQuery, activeCategory]);

  const recenterMap = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  };

  const handleDirections = (shop: any) => {
    if (!shop) return;

    console.log('Traçando rota para:', shop.name);

    // Simplificando a lógica de destino
    let destString = '';
    if (shop.latitude && shop.longitude) {
      destString = `${shop.latitude},${shop.longitude}`;
    } else {
      destString = encodeURIComponent(`${shop.name}, ${shop.neighborhood || ''}, Maputo`);
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destString}&travelmode=driving`;

    // Tentar abrir em nova aba
    const newWindow = window.open(url, '_blank');

    // Fallback caso o popup blocker bloqueie
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = url;
    }
  };

  return (
    <div className="relative h-[calc(100vh-96px)] overflow-hidden animate-fadeIn bg-background-dark">
      {/* Map Container */}
      <div className="absolute inset-0">
        {!mapLoaded || loading ? (
          <div className="w-full h-full flex items-center justify-center bg-surface-dark">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-text-secondary font-bold">Carregando mapa...</p>
            </div>
          </div>
        ) : (
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="yes"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng - zoom},${userLocation.lat - zoom},${userLocation.lng + zoom},${userLocation.lat + zoom}&layer=mapnik&marker=${selectedShop?.latitude || userLocation.lat},${selectedShop?.longitude || userLocation.lng}`}
            style={{ border: 0 }}
            title="Mapa de Barbearias"
          ></iframe>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/20 via-transparent to-background-dark/80 pointer-events-none"></div>
      </div>

      {/* Botão Re-centrar Flutuante */}
      <button
        onClick={recenterMap}
        className="absolute right-4 bottom-[410px] z-40 size-12 rounded-2xl bg-surface-dark/95 backdrop-blur-xl border border-white/10 flex items-center justify-center text-primary active:scale-95 shadow-2xl transition-all"
        title="Minha Localização"
      >
        <span className="material-symbols-outlined text-[24px]">my_location</span>
      </button>



      {/* Shop Carousel - Positioned ABOVE the bottom navigation */}
      <div className="absolute bottom-[100px] left-0 w-full z-50 flex gap-4 px-4 overflow-x-auto no-scrollbar snap-x pb-4">
        {filteredShops.map(shop => (
          <div
            key={shop.id}
            id={`shop-card-${shop.id}`}
            onClick={() => setSelectedShop(shop)}
            className={`min-w-[320px] bg-surface-dark/95 backdrop-blur-xl rounded-[32px] p-5 shadow-2xl border transition-all snap-center cursor-pointer ${selectedShop?.id === shop.id ? 'border-primary ring-1 ring-primary/30' : 'border-white/5'
              }`}
          >
            <div className="flex gap-4 mb-5">
              <div
                className="w-20 h-20 rounded-2xl bg-cover bg-center shrink-0 shadow-xl border border-white/10"
                style={{ backgroundImage: `url(${shop.image})` }}
              ></div>
              <div className="flex-1 min-w-0 py-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-black text-white truncate pr-2">{shop.name}</h3>
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-lg shrink-0 border border-primary/20">
                    <span className="material-symbols-outlined text-yellow-400 text-[10px] filled">star</span>
                    <span className="text-[10px] font-black text-white">{shop.rating}</span>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary truncate mt-1 font-medium">{shop.neighborhood || shop.address}</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="bg-success/20 text-success text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-success/20">Aberto</div>
                  <span className="text-[9px] text-text-secondary font-bold">Fecha às {shop.closing_time}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/barbershop/${shop.id}`);
                }}
                className="h-12 rounded-xl bg-surface-highlight border border-white/10 font-bold text-xs uppercase tracking-widest text-white active:scale-95 transition-all"
              >
                Ver Detalhes
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDirections(shop);
                }}
                className="h-12 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/30 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">directions</span>
                Rota
              </button>
            </div>
          </div>
        ))}
        {filteredShops.length === 0 && (
          <div className="w-full bg-surface-dark/80 backdrop-blur-xl rounded-[32px] p-12 text-center border border-dashed border-white/10 mx-4">
            <span className="material-symbols-outlined text-primary text-4xl mb-4 opacity-30">map</span>
            <p className="text-text-secondary font-bold text-sm">Nenhuma barbearia disponível.</p>
          </div>
        )}
      </div>

      {/* Floating Marker */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-full flex flex-col items-center animate-bounce">
          <div className="bg-primary p-3 rounded-2xl shadow-2xl shadow-primary/40 border-2 border-white/30">
            <span className="material-symbols-outlined text-white text-2xl filled">storefront</span>
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-primary -mt-[1px]"></div>
        </div>
      </div>
    </div>
  );
};

export default MapExplore;
