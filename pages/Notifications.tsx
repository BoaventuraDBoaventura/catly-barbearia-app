
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Notifications: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function fetchNotifications() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // For now, we'll treat appointment updates as notifications
            // In a real app, we might have a dedicated notifications table
            const { data, error } = await supabase
                .from('user_appointments')
                .select(`
                    id,
                    status,
                    created_at,
                    service_name,
                    barbershop_name
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Map appointments to notification format
            const mapped = (data || []).map(appt => ({
                id: appt.id,
                title: appt.status === 'confirmed' ? 'Reserva Confirmada!' :
                    appt.status === 'cancelled' ? 'Reserva Cancelada' : 'Nova Reserva Pendente',
                message: `O seu serviço de ${appt.service_name} na ${appt.barbershop_name} está ${appt.status === 'confirmed' ? 'confirmado' : appt.status === 'cancelled' ? 'cancelado' : 'em processamento'}.`,
                time: new Date(appt.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
                icon: appt.status === 'confirmed' ? 'check_circle' : appt.status === 'cancelled' ? 'cancel' : 'schedule',
                color: appt.status === 'confirmed' ? 'text-success' : appt.status === 'cancelled' ? 'text-red-500' : 'text-warning',
                type: 'appointment'
            }));

            setNotifications(mapped);
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background-dark text-white animate-fadeIn pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background-dark/90 backdrop-blur-xl p-4 pt-12 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="size-11 rounded-2xl bg-surface-highlight flex items-center justify-center border border-white/10 shadow-lg active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h2 className="text-xl font-black text-white">Notificações</h2>
                </div>
                <button
                    onClick={fetchNotifications}
                    className="size-11 rounded-2xl bg-surface-highlight flex items-center justify-center border border-white/10 active:scale-95 transition-all text-primary"
                >
                    <span className="material-symbols-outlined">refresh</span>
                </button>
            </header>

            <main className="p-6 max-w-lg mx-auto">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-surface-dark rounded-[24px] animate-pulse border border-white/5"></div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <span className="material-symbols-outlined text-6xl mb-4">notifications_off</span>
                        <p className="font-bold">Nenhuma notificação por aqui.</p>
                        <p className="text-xs">Fique atento às atualizações das suas reservas.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className="bg-surface-dark p-5 rounded-[28px] border border-white/5 shadow-xl flex gap-4 active:scale-[0.98] transition-all"
                            >
                                <div className={`size-12 rounded-2xl bg-surface-highlight flex items-center justify-center ${notif.color}`}>
                                    <span className="material-symbols-outlined filled">{notif.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-sm font-black text-white">{notif.title}</h4>
                                        <span className="text-[9px] text-text-secondary font-bold uppercase">{notif.time}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary font-medium leading-relaxed">
                                        {notif.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;
