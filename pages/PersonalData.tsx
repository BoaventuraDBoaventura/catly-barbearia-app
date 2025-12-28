
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const PersonalData: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        avatar_url: ''
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/auth');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, email, phone, avatar_url')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;

            if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    email: data.email || session.user.email || '',
                    phone: data.phone || '',
                    avatar_url: data.avatar_url || ''
                });
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
        } finally {
            setFetching(false);
        }
    }

    async function handleImageUpload(file: File) {
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('barbershop-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('barbershop-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            alert('Foto carregada com sucesso! Não esqueça de salvar as alterações.');
        } catch (error: any) {
            alert('Erro no upload: ' + error.message);
        } finally {
            setUploading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', session.user.id);

            if (error) throw error;
            alert('Dados atualizados com sucesso!');
            navigate('/profile');
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    if (fetching) {
        return (
            <div className="min-h-screen bg-background-dark flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-dark text-white animate-fadeIn pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background-dark/90 backdrop-blur-xl p-4 pt-12 border-b border-white/5 flex items-center gap-4">
                <button
                    onClick={() => navigate('/profile')}
                    className="size-11 rounded-2xl bg-surface-highlight flex items-center justify-center border border-white/10 shadow-lg active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className="text-xl font-black text-white">Dados Pessoais</h2>
            </header>

            <main className="p-6 max-w-lg mx-auto">
                <div className="mb-8 text-center">
                    <div className="relative inline-block group">
                        <div className="relative">
                            {uploading || !formData.avatar_url ? (
                                <div className="size-24 rounded-[32px] border-2 border-primary shadow-2xl bg-surface-highlight flex items-center justify-center">
                                    {uploading ? (
                                        <div className="size-6 border-2 border-primary border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <span className="material-symbols-outlined text-primary text-4xl filled">person</span>
                                    )}
                                </div>
                            ) : (
                                <img
                                    src={formData.avatar_url}
                                    className="size-24 rounded-[32px] border-2 border-primary shadow-2xl object-cover"
                                    alt="Avatar"
                                />
                            )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 size-8 bg-primary rounded-xl flex items-center justify-center border-4 border-background-dark shadow-xl cursor-pointer hover:scale-105 transition-all">
                            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(file);
                                }}
                            />
                        </label>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Seu nome completo"
                            className="w-full h-14 bg-surface-dark border border-white/5 rounded-2xl px-5 text-sm font-bold focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2 opacity-60">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">E-mail (Não editável)</label>
                        <input
                            type="email"
                            disabled
                            value={formData.email}
                            className="w-full h-14 bg-surface-dark/50 border border-white/5 rounded-2xl px-5 text-sm font-bold outline-none cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">Telemóvel / WhatsApp</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+258 --- --- ---"
                            className="w-full h-14 bg-surface-dark border border-white/5 rounded-2xl px-5 text-sm font-bold focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        />
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">save</span>
                                    <span>SALVAR ALTERAÇÕES</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-[10px] text-text-secondary font-black uppercase tracking-widest leading-relaxed">
                    Seus dados são usados apenas para <br /> identificar seus agendamentos.
                </p>
            </main>
        </div>
    );
};

export default PersonalData;
