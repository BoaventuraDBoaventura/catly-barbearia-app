
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const GlobalStats: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalShops: 0,
        totalAppointments: 0,
        recentAppointments: [] as any[],
        popularShops: [] as any[]
    });

    useEffect(() => {
        fetchGlobalStats();
    }, []);

    async function fetchGlobalStats() {
        try {
            setLoading(true);

            // 1. Total Users
            const { count: userCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // 2. Total Shops
            const { count: shopCount } = await supabase
                .from('barbershops')
                .select('*', { count: 'exact', head: true });

            // 3. Total Appointments
            const { count: apptCount } = await supabase
                .from('user_appointments')
                .select('*', { count: 'exact', head: true });

            // 4. Recent Appointments with details
            const { data: recent } = await supabase
                .from('user_appointments')
                .select(`
                    id,
                    service_name,
                    date,
                    time,
                    status,
                    profiles!user_id (full_name),
                    barbershops!barbershop_id (name)
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            setStats({
                totalUsers: userCount || 0,
                totalShops: shopCount || 0,
                totalAppointments: apptCount || 0,
                recentAppointments: recent || [],
                popularShops: [] // Future implementation
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
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
                <h2 className="text-xl font-black text-white">Estatísticas Globais</h2>
            </header>

            <main className="p-6 max-w-lg mx-auto space-y-8">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-dark p-6 rounded-[32px] border border-white/5 shadow-xl">
                        <span className="material-symbols-outlined text-primary mb-2">person</span>
                        <h3 className="text-2xl font-black text-white">{stats.totalUsers}</h3>
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Utilizadores</p>
                    </div>
                    <div className="bg-surface-dark p-6 rounded-[32px] border border-white/5 shadow-xl">
                        <span className="material-symbols-outlined text-success mb-2">storefront</span>
                        <h3 className="text-2xl font-black text-white">{stats.totalShops}</h3>
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Barbearias</p>
                    </div>
                    <div className="col-span-2 bg-primary/10 p-6 rounded-[32px] border border-primary/20 shadow-xl flex items-center justify-between">
                        <div>
                            <span className="material-symbols-outlined text-primary mb-2">calendar_month</span>
                            <h3 className="text-3xl font-black text-white">{stats.totalAppointments}</h3>
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Reservas Totais</p>
                        </div>
                        <div className="size-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-white text-3xl">trending_up</span>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Atividade Recente</h3>
                        <span className="text-[10px] font-bold text-primary">Tempo Real</span>
                    </div>

                    <div className="space-y-3">
                        {stats.recentAppointments.map((appt) => (
                            <div key={appt.id} className="bg-surface-dark p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-surface-highlight flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-xl">event_available</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white truncate">
                                        {appt.profiles?.full_name || 'Alguém'} marcou no(a) {appt.barbershops?.name}
                                    </p>
                                    <p className="text-[10px] text-text-secondary font-bold">
                                        {appt.service_name} • {appt.date} às {appt.time}
                                    </p>
                                </div>
                                <div className={`size-2 rounded-full ${appt.status === 'confirmed' ? 'bg-success' :
                                        appt.status === 'cancelled' ? 'bg-red-500' : 'bg-warning'
                                    }`}></div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Footer Tip */}
                <div className="p-6 bg-surface-dark/50 rounded-[32px] border border-dashed border-white/10 text-center">
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest leading-relaxed">
                        Estas métricas ajudam-te a <br /> acompanhar o crescimento da plataforma.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default GlobalStats;
