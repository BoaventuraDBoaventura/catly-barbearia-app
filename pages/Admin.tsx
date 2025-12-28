
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Admin: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [shops, setShops] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [unreadAppointments, setUnreadAppointments] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [maxShops, setMaxShops] = useState(0);
    const [activeTab, setActiveTab] = useState<'shops' | 'users' | 'appointments'>('shops');

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [locationLoading, setLocationLoading] = useState(false);

    // Services helper state
    const [newService, setNewService] = useState({
        name: '',
        price: '',
        duration: '30',
        icon: 'content_cut'
    });

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        neighborhood: '',
        image: '',
        description: '',
        opening_time: '08:00',
        closing_time: '20:00',
        opening_days: [1, 2, 3, 4, 5, 6], // Segunda a Sábado por padrão
        is_premium: false,
        distance: 1.0,
        latitude: null as number | null,
        longitude: null as number | null,
        services: [] as any[],
        professionals: [] as any[],
        gallery: [] as string[],
        owner_id: null as string | null
    });

    useEffect(() => {
        checkAdmin();
    }, []);

    useEffect(() => {
        if (!userRole) return;

        const channel = supabase
            .channel('appointments_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'user_appointments' },
                (payload) => {
                    console.log('New appointment!', payload);
                    fetchAppointments();
                    setUnreadAppointments(prev => prev + 1);
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.play();
                    } catch (e) { console.error('Audio play error', e); }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userRole]);

    async function checkAdmin() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/auth');
            return;
        }

        const { data } = await supabase
            .from('profiles')
            .select('role, max_shops')
            .eq('id', session.user.id)
            .single();

        const role = data?.role;
        const limit = data?.max_shops || 0;
        setUserRole(role);
        setMaxShops(limit);

        if (role !== 'super_admin' && role !== 'shop_owner' && role !== 'admin' && limit === 0) {
            alert('Acesso negado. Você não tem permissão para gerir barbearias.');
            navigate('/');
            return;
        }

        setIsAdmin(true);
        fetchShops(role);
        fetchAppointments(role);
        if (role === 'super_admin' || role === 'admin') {
            fetchUsers();
        }
    }

    async function fetchShops(roleOverride?: string | null) {
        try {
            setLoading(true);
            const activeRole = roleOverride || userRole;
            const { data: { session } } = await supabase.auth.getSession();

            let query = supabase
                .from('barbershops')
                .select('*')
                .order('created_at', { ascending: false });

            // If not super admin, only show owned shops
            if (activeRole === 'shop_owner') {
                query = query.eq('owner_id', session?.user.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setShops(data || []);
        } catch (error) {
            console.error('Error fetching shops:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchUsers() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('Erro ao carregar usuários: ' + (error as any).message);
        }
    }

    async function updateUserRole(userId: string, newRole: string) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            alert('Permissão atualizada com sucesso!');
            fetchUsers();
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Erro ao atualizar permissão.');
        }
    }

    async function updateMaxShops(userId: string, count: number) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ max_shops: count })
                .eq('id', userId);

            if (error) throw error;
            alert('Limite de lojas atualizado!');
            fetchUsers();
        } catch (error) {
            console.error('Error updating max shops:', error);
            alert('Erro ao atualizar limite.');
        }
    }

    async function fetchAppointments(roleOverride?: string | null) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const activeRole = roleOverride || userRole;

            const { data, error } = await supabase
                .from('user_appointments')
                .select(`
                    *,
                    profiles!user_id (email, full_name, phone),
                    barbershops!barbershop_id (owner_id)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            let filtered = data || [];
            if (activeRole === 'shop_owner') {
                filtered = (data || []).filter((appt: any) => appt.barbershops?.owner_id === session.user.id);
            }

            setAppointments(filtered);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            alert('Erro ao carregar reservas: ' + (error as any).message);
        }
    }

    async function updateAppointmentStatus(id: string, status: string) {
        try {
            const { error } = await supabase
                .from('user_appointments')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
            fetchAppointments();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    async function handleImageUpload(file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('barbershop-images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('barbershop-images')
            .getPublicUrl(filePath);

        return publicUrl;
    }

    async function handleGalleryUpload(files: File[]) {
        const urls = [];
        for (const file of files) {
            const url = await handleImageUpload(file);
            urls.push(url);
        }
        return urls;
    }

    function addService() {
        if (!newService.name || !newService.price) {
            alert('Preencha o nome e preço do serviço.');
            return;
        }
        const service = {
            id: Math.random().toString(36).substring(7),
            ...newService,
            price: parseFloat(newService.price)
        };
        setFormData({
            ...formData,
            services: [...formData.services, service]
        });
        setNewService({ name: '', price: '', duration: '30', icon: 'content_cut' });
    }

    function removeService(id: string) {
        setFormData({
            ...formData,
            services: formData.services.filter(s => s.id !== id)
        });
    }

    async function handleGetLocation() {
        if (!navigator.geolocation) {
            alert('Geolocalização não é suportada pelo seu navegador.');
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                setLocationLoading(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Não foi possível obter a localização. Certifique-se de dar permissão ao navegador.');
                setLocationLoading(false);
            },
            { enableHighAccuracy: true }
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            let imageUrl = formData.image;
            let galleryUrls = [...formData.gallery];

            if (imageFile) {
                imageUrl = await handleImageUpload(imageFile);
            } else if (!isEditing) {
                alert('Por favor, selecione uma imagem de capa para a barbearia.');
                setLoading(false);
                return;
            }

            if (galleryFiles.length > 0) {
                const newGalleryUrls = await handleGalleryUpload(galleryFiles);
                galleryUrls = [...galleryUrls, ...newGalleryUrls];
            }

            const payload = {
                ...formData,
                image: imageUrl,
                gallery: galleryUrls,
                owner_id: isEditing ? formData.owner_id : session?.user.id
            };

            if (isEditing && currentId) {
                const { error } = await supabase
                    .from('barbershops')
                    .update(payload)
                    .eq('id', currentId);
                if (error) throw error;
            } else {
                // Check limit for non-super-admins
                if (userRole !== 'super_admin' && userRole !== 'admin') {
                    if (shops.length >= maxShops) {
                        alert(`Você atingiu o seu limite de ${maxShops} barbearias! Entre em contato com o administrador para aumentar o limite.`);
                        setLoading(false);
                        return;
                    }
                }

                const { error } = await supabase
                    .from('barbershops')
                    .insert([payload]);
                if (error) throw error;
            }

            resetForm();
            fetchShops();
            alert('Sucesso!');
        } catch (error) {
            console.error('Error saving shop:', error);
            alert('Erro ao salvar barbearia.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir esta barbearia?')) return;
        try {
            setLoading(true);
            await supabase.from('barbershops').delete().eq('id', id);
            fetchShops();
        } catch (error) {
            console.error('Error deleting shop:', error);
        } finally {
            setLoading(false);
        }
    }

    function editShop(shop: any) {
        setIsEditing(true);
        setCurrentId(shop.id);
        setImagePreview(shop.image);
        setGalleryPreviews(shop.gallery || []);
        setFormData({
            name: shop.name,
            address: shop.address,
            neighborhood: shop.neighborhood,
            image: shop.image,
            description: shop.description || '',
            opening_time: shop.opening_time || '08:00',
            closing_time: shop.closing_time,
            opening_days: shop.opening_days || [1, 2, 3, 4, 5, 6],
            is_premium: shop.is_premium,
            distance: shop.distance,
            latitude: shop.latitude,
            longitude: shop.longitude,
            services: shop.services || [],
            professionals: shop.professionals || [],
            gallery: shop.gallery || [],
            owner_id: shop.owner_id
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetForm() {
        setIsEditing(false);
        setCurrentId(null);
        setImageFile(null);
        setImagePreview(null);
        setGalleryFiles([]);
        setGalleryPreviews([]);
        setFormData({
            name: '',
            address: '',
            neighborhood: '',
            image: '',
            description: '',
            opening_time: '08:00',
            closing_time: '20:00',
            opening_days: [1, 2, 3, 4, 5, 6],
            is_premium: false,
            distance: 1.0,
            latitude: null,
            longitude: null,
            services: [],
            professionals: [],
            gallery: [],
            owner_id: null
        });
    }

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-background-dark pb-32 animate-fadeIn">
            <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-xl p-4 pt-12 border-b border-white/5 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="size-11 flex items-center justify-center rounded-2xl bg-surface-highlight border border-white/10 shadow-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h2 className="text-xl font-black text-white">Painel Admin</h2>
                <div className="w-11"></div>
            </header>

            <div className="p-4 space-y-8">
                {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'shop_owner') && (
                    <div className="flex p-1.5 bg-surface-dark rounded-2xl border border-white/5">
                        <button
                            onClick={() => setActiveTab('shops')}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'shops' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary'}`}
                        >
                            Lojas
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('appointments');
                                setUnreadAppointments(0);
                            }}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all relative ${activeTab === 'appointments' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary'}`}
                        >
                            Reservas
                            {unreadAppointments > 0 && (
                                <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-surface-dark animate-pulse"></span>
                            )}
                        </button>
                        {(userRole === 'super_admin' || userRole === 'admin') && (
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary'}`}
                            >
                                Usuários
                            </button>
                        )}
                    </div>
                )}
                {activeTab === 'shops' ? (
                    <>
                        {/* Formulario de Cadastro - Só aparece se não exceder o limite ou estiver editando */}
                        {(userRole === 'super_admin' || userRole === 'admin' || shops.length < maxShops || isEditing) ? (
                            <section className="bg-surface-dark p-6 rounded-[32px] border border-white/5 shadow-2xl animate-slideUp">
                                <h3 className="text-xl font-black mb-6 text-white">{isEditing ? 'Editar Barbearia' : 'Cadastrar Barbearia'}</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Nome da Barbearia"
                                        className="w-full bg-background-dark border border-white/5 rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Endereço Completo"
                                        className="w-full bg-background-dark border border-white/5 rounded-2xl p-4 text-white"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        required
                                    />
                                    <textarea
                                        placeholder="Descrição da Barbearia (História, diferenciais...)"
                                        className="w-full bg-background-dark border border-white/5 rounded-2xl p-4 text-white min-h-[120px] resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Bairro"
                                            className="w-full bg-background-dark border border-white/5 rounded-2xl p-4 text-white"
                                            value={formData.neighborhood}
                                            onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                                            required
                                        />
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest px-2">Abertura</span>
                                            <input
                                                type="time"
                                                className="w-full bg-background-dark border border-white/5 rounded-2xl p-4 text-white"
                                                value={formData.opening_time}
                                                onChange={e => setFormData({ ...formData, opening_time: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest px-2">Fechamento</span>
                                            <input
                                                type="time"
                                                className="w-full bg-background-dark border border-white/5 rounded-2xl p-4 text-white"
                                                value={formData.closing_time}
                                                onChange={e => setFormData({ ...formData, closing_time: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Dias de Funcionamento */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest px-2">Dias de Funcionamento</span>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 1, label: 'Seg' },
                                                { id: 2, label: 'Ter' },
                                                { id: 3, label: 'Qua' },
                                                { id: 4, label: 'Qui' },
                                                { id: 5, label: 'Sex' },
                                                { id: 6, label: 'Sáb' },
                                                { id: 0, label: 'Dom' }
                                            ].map(day => (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const days = formData.opening_days.includes(day.id)
                                                            ? formData.opening_days.filter(d => d !== day.id)
                                                            : [...formData.opening_days, day.id];
                                                        setFormData({ ...formData, opening_days: days });
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.opening_days.includes(day.id)
                                                        ? 'bg-primary border-primary text-white shadow-lg'
                                                        : 'bg-background-dark border-white/5 text-text-secondary'
                                                        }`}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Localização GPS */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-2">
                                            <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Coordenadas GPS</span>
                                            <button
                                                type="button"
                                                onClick={handleGetLocation}
                                                disabled={locationLoading}
                                                className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                                            >
                                                <span className={`material-symbols-outlined text-[14px] ${locationLoading ? 'animate-spin' : ''}`}>
                                                    {locationLoading ? 'sync' : 'my_location'}
                                                </span>
                                                {locationLoading ? 'Obtendo...' : 'Usar Local Atual'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Latitude"
                                                className="w-full bg-background-dark border border-white/5 rounded-2xl p-4 text-white text-sm"
                                                value={formData.latitude || ''}
                                                onChange={e => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                                                required
                                            />
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Longitude"
                                                className="w-full bg-background-dark border border-white/5 rounded-2xl p-4 text-white text-sm"
                                                value={formData.longitude || ''}
                                                onChange={e => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Upload de Imagem de Capa */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest px-2">Imagem de Capa</span>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setImageFile(file);
                                                        setImagePreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                            <div className="w-full h-40 bg-background-dark border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                                                {imagePreview ? (
                                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-white/20 text-4xl mb-2">add_a_photo</span>
                                                        <span className="text-white/40 text-[10px] font-black uppercase">Fazer upload de capa</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Galeria de Fotos */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest px-2">Galeria de Fotos</span>
                                        <div className="grid grid-cols-4 gap-2">
                                            {galleryPreviews.map((url, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGalleryPreviews(prev => prev.filter((_, i) => i !== idx));
                                                            setFormData(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }));
                                                        }}
                                                        className="absolute top-1 right-1 size-5 bg-red-500 rounded-full flex items-center justify-center"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px] text-white">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="relative aspect-square bg-background-dark border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center group hover:border-primary/50 transition-all">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={e => {
                                                        const files = Array.from(e.target.files || []);
                                                        if (files.length > 0) {
                                                            setGalleryFiles(prev => [...prev, ...files]);
                                                            const newPreviews = files.map((f: any) => URL.createObjectURL(f));
                                                            setGalleryPreviews(prev => [...prev, ...newPreviews]);
                                                        }
                                                    }}
                                                />
                                                <span className="material-symbols-outlined text-white/20">add</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gerenciamento de Serviços */}
                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest px-2">Serviços e Preços (MT)</h4>

                                        <div className="bg-background-dark/50 p-4 rounded-2xl border border-white/5 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Nome do Serviço"
                                                    className="w-full bg-background-dark border border-white/5 rounded-xl p-3 text-white text-sm"
                                                    value={newService.name}
                                                    onChange={e => setNewService({ ...newService, name: e.target.value })}
                                                />
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary">MT</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Preço"
                                                        className="w-full bg-background-dark border border-white/5 rounded-xl p-3 pl-10 text-white text-sm"
                                                        value={newService.price}
                                                        onChange={e => setNewService({ ...newService, price: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <select
                                                    className="w-full bg-background-dark border border-white/5 rounded-xl p-3 text-white text-sm"
                                                    value={newService.duration}
                                                    onChange={e => setNewService({ ...newService, duration: e.target.value })}
                                                >
                                                    <option value="15">15 min</option>
                                                    <option value="30">30 min</option>
                                                    <option value="45">45 min</option>
                                                    <option value="60">60 min</option>
                                                    <option value="90">90 min</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={addService}
                                                    className="bg-primary/20 text-primary font-black text-xs rounded-xl hover:bg-primary/30 transition-all"
                                                >
                                                    ADICIONAR SERVIÇO
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {formData.services.map((s, idx) => (
                                                <div key={idx} className="bg-background-dark border border-white/5 p-3 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-primary">{s.icon}</span>
                                                        <div>
                                                            <p className="text-white text-sm font-bold">{s.name}</p>
                                                            <p className="text-text-secondary text-[10px]">{s.duration} min • {s.price} MT</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeService(s.id)}
                                                        className="text-red-500 material-symbols-outlined"
                                                    >
                                                        delete
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-3 p-4 bg-background-dark/50 rounded-2xl border border-white/5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="size-5 accent-primary"
                                            checked={formData.is_premium}
                                            onChange={e => setFormData({ ...formData, is_premium: e.target.checked })}
                                        />
                                        <span className="text-white font-bold text-sm">Barbearia Premium</span>
                                    </label>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isEditing ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR AGORA'}
                                        </button>
                                        {isEditing && (
                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="h-16 px-6 bg-surface-highlight text-white font-black rounded-2xl border border-white/5 active:scale-95 transition-all"
                                            >
                                                CANCELAR
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </section>
                        ) : (
                            <div className="bg-primary/5 border border-primary/10 p-10 rounded-[40px] text-center mb-10 animate-fadeIn border-dashed">
                                <div className="size-16 bg-primary/10 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-primary text-4xl">lock</span>
                                </div>
                                <h3 className="text-white font-black uppercase text-xs tracking-widest mb-2">Limite de Lojas Atingido</h3>
                                <p className="text-text-secondary text-sm max-w-[280px] mx-auto leading-relaxed">
                                    Você já completou seu limite de <strong>{maxShops} {maxShops === 1 ? 'loja' : 'lojas'}</strong>.
                                    Contrate um plano maior para gerir mais barbearias.
                                </p>
                            </div>
                        )}

                        {/* Lista de Barbearias */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-lg font-black text-white">Minhas Barbearias ({shops.length})</h3>
                                <button onClick={fetchShops} className="material-symbols-outlined text-primary">refresh</button>
                            </div>

                            {shops.map(shop => (
                                <div key={shop.id} className="bg-surface-dark p-4 rounded-[28px] border border-white/5 flex items-center justify-between animate-slideUp">
                                    <div className="flex items-center gap-4">
                                        <img src={shop.image} className="size-16 rounded-2xl object-cover" alt="" />
                                        <div>
                                            <h4 className="font-black text-white">{shop.name}</h4>
                                            <p className="text-[10px] text-text-secondary uppercase font-black">{shop.neighborhood}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="material-symbols-outlined text-[10px] text-primary">location_on</span>
                                                <span className="text-[8px] text-text-secondary font-bold truncate max-w-[120px]">
                                                    {shop.latitude?.toFixed(4)}, {shop.longitude?.toFixed(4)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => editShop(shop)}
                                            className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center active:scale-90 transition-all"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(shop.id)}
                                            className="size-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </section>
                    </>
                ) : activeTab === 'appointments' ? (
                    /* Gerenciamento de Reservas */
                    <section className="space-y-4 animate-slideUp">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-black text-white">Reservas Recebidas ({appointments.length})</h3>
                            <button onClick={fetchAppointments} className="material-symbols-outlined text-primary">refresh</button>
                        </div>

                        <div className="space-y-4">
                            {appointments.length === 0 && (
                                <div className="py-20 text-center bg-surface-dark rounded-[32px] border border-dashed border-white/10">
                                    <span className="material-symbols-outlined text-5xl text-white/5 mb-4">calendar_today</span>
                                    <p className="text-text-secondary font-bold text-sm">Nenhuma reserva recebida ainda.</p>
                                </div>
                            )}
                            {appointments.map(appt => (
                                <div key={appt.id} className="bg-surface-dark p-5 rounded-[32px] border border-white/5 shadow-xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <span className="material-symbols-outlined">person</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-black">{appt.profiles?.full_name || 'Cliente'}</p>
                                                <p className="text-[10px] text-text-secondary font-bold uppercase truncate max-w-[150px]">
                                                    {appt.profiles?.email}
                                                    {appt.profiles?.phone && ` • ${appt.profiles.phone}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${appt.status === 'confirmed' ? 'bg-success/20 text-success' :
                                            appt.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                                                'bg-yellow-500/20 text-yellow-500'
                                            }`}>
                                            {appt.status === 'confirmed' ? 'Confirmado' : appt.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 p-4 bg-background-dark/50 rounded-2xl border border-white/5 mb-4">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Serviço</p>
                                            <p className="text-xs font-bold text-white truncate">{appt.service_name}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Profissional</p>
                                            <p className="text-xs font-bold text-primary truncate">{appt.professional_name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Data</p>
                                            <p className="text-xs font-bold text-white">{appt.date}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Horário</p>
                                            <p className="text-xs font-bold text-white">{appt.time}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 p-3 bg-surface-highlight/30 rounded-2xl mb-4">
                                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Barbearia</p>
                                        <p className="text-xs font-bold text-white px-1">{appt.barbershop_name}</p>
                                    </div>

                                    {appt.status !== 'cancelled' && (
                                        <div className="flex gap-2">
                                            {appt.status !== 'confirmed' && (
                                                <button
                                                    onClick={() => updateAppointmentStatus(appt.id, 'confirmed')}
                                                    className="flex-1 h-12 bg-success text-white font-black rounded-xl text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                                                >
                                                    Confirmar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => updateAppointmentStatus(appt.id, 'cancelled')}
                                                className="flex-1 h-12 bg-red-500/10 text-red-500 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500/20 active:scale-95 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    /* Gerenciamento de Usuários */
                    <section className="space-y-4 animate-slideUp">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-black text-white">Gerenciar Usuários ({users.length})</h3>
                        </div>
                        <div className="space-y-3">
                            {users.map(user => (
                                <div key={user.id} className="bg-surface-dark p-5 rounded-[24px] border border-white/5 shadow-xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-lg">
                                            {user.email?.[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold truncate">{user.email}</p>
                                            {user.phone && <p className="text-[10px] text-text-secondary font-bold">{user.phone}</p>}
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${user.role === 'super_admin' ? 'text-primary' : user.role === 'shop_owner' ? 'text-success' : 'text-text-secondary'}`}>
                                                {user.role || 'cliente'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateUserRole(user.id, 'shop_owner')}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${user.role === 'shop_owner' ? 'bg-success text-white border-success' : 'border-white/10 text-text-secondary hover:border-success/50'}`}
                                        >
                                            Proprietário
                                        </button>
                                        <button
                                            onClick={() => updateUserRole(user.id, 'super_admin')}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${user.role === 'super_admin' ? 'bg-primary text-white border-primary' : 'border-white/10 text-text-secondary hover:border-primary/50'}`}
                                        >
                                            Super Admin
                                        </button>
                                        <button
                                            onClick={() => updateUserRole(user.id, 'customer')}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${(!user.role || user.role === 'customer') ? 'bg-surface-highlight text-white border-white/20' : 'border-white/10 text-text-secondary hover:border-white/50'}`}
                                        >
                                            Cliente
                                        </button>
                                    </div>
                                    <div className="mt-4 p-3 bg-background-dark/50 rounded-2xl border border-white/5 space-y-3">
                                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Configurar Limite de Lojas</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                id={`max-shops-${user.id}`}
                                                defaultValue={user.max_shops || 0}
                                                className="flex-1 bg-surface-dark border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById(`max-shops-${user.id}`) as HTMLInputElement;
                                                    updateMaxShops(user.id, parseInt(input.value) || 0);
                                                }}
                                                className="px-4 py-2 bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/30 transition-all font-bold"
                                            >
                                                Salvar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default Admin;
