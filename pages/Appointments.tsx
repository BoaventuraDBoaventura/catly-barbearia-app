
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Appointments: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pendentes');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      channel = supabase
        .channel('appointments-realtime')
        .on('postgres_changes', {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_appointments'
        }, () => {
          // Refresh list when any change occurs
          // RLS ensures the user only fetches what they should see
          fetchAppointments();
        })
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);

      // Get role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      setUserRole(profile?.role || 'customer');

      // Fetch appointments (RLS handles the filtering: my appointments OR appointments for my shops)
      const { data, error } = await supabase
        .from('user_appointments')
        .select(`
          *,
          profiles!user_id (full_name, phone, avatar_url),
          barbershops!barbershop_id (owner_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = appointments.filter(app => {
    if (activeTab === 'pendentes') return app.status === 'pending' || app.status === 'confirmed';
    if (activeTab === 'concluidos') return app.status === 'completed';
    return true;
  });

  return (
    <div className="animate-fadeIn min-h-screen bg-background-dark pb-24">
      <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-xl p-4 pt-12 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="size-11 flex items-center justify-center rounded-2xl bg-surface-highlight border border-white/10 shadow-lg active:scale-95 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-xl font-black text-white">Minha Agenda</h2>
        <button className="size-11 flex items-center justify-center rounded-2xl bg-surface-highlight border border-white/10 active:scale-95 transition-all">
          <span className="material-symbols-outlined">filter_list</span>
        </button>
      </header>

      <div className="p-4 space-y-6">
        {/* Tabs Estilizados */}
        <div className="flex rounded-2xl bg-surface-dark p-1.5 border border-white/5">
          {['pendentes', 'concluidos'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-text-secondary hover:text-white'
                }`}
            >
              {tab === 'pendentes' ? 'Próximos' : 'Finalizados'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-surface-dark rounded-[28px] animate-pulse"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-dark/30 rounded-[32px] border border-dashed border-white/10">
            <div className="size-20 bg-surface-dark rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-xl">
              <span className="material-symbols-outlined text-4xl text-text-secondary opacity-30">calendar_today</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Sem agendamentos</h3>
            <p className="text-text-secondary text-sm px-10">
              {activeTab === 'pendentes'
                ? 'Você não tem nenhum agendamento próximo marcado.'
                : 'Seu histórico de agendamentos concluídos aparecerá aqui.'}
            </p>
            {activeTab === 'pendentes' && (
              <button
                onClick={() => navigate('/')}
                className="mt-8 px-6 py-3 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-all"
              >
                Explorar Barbearias
              </button>
            )}
          </div>
        ) : (
          filtered.map(app => (
            <div key={app.id} className="relative bg-surface-dark rounded-[28px] p-6 border border-white/5 shadow-2xl animate-slideUp">
              <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                <div className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-lg ${app.status === 'confirmed' ? 'bg-success/20 text-success' :
                  app.status === 'completed' ? 'bg-primary/20 text-primary' :
                    'bg-warning/20 text-warning'
                  }`}>
                  {app.status === 'confirmed' ? 'Confirmado' :
                    app.status === 'completed' ? 'Concluído' :
                      'Pendente'}
                </div>
                {app.user_id !== userId && (
                  <span className="bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-primary/20">
                    Reserva Recebida
                  </span>
                )}
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="size-16 rounded-[22px] bg-primary/10 flex items-center justify-center ring-2 ring-white/5 shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-primary text-3xl filled">storefront</span>
                </div>
                <div className="py-1 min-w-0 flex-1">
                  <h4 className="text-lg font-black leading-tight mb-1 truncate">
                    {app.user_id === userId ? app.barbershop_name : app.profiles?.full_name || 'Cliente'}
                  </h4>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest truncate">
                      <span className="material-symbols-outlined text-[16px]">content_cut</span>
                      <span>{app.service_name}</span>
                    </div>
                    {app.user_id !== userId && (
                      <div className="flex items-center gap-2 text-text-secondary font-bold text-[10px] truncate">
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        <span>{app.profiles?.phone || 'Sem telefone'}</span>
                      </div>
                    )}
                    {app.user_id !== userId && (
                      <div className="flex items-center gap-2 text-text-secondary font-bold text-[10px] truncate">
                        <span className="material-symbols-outlined text-[14px]">storefront</span>
                        <span>No(a): {app.barbershop_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-background-dark/50 rounded-2xl p-4 mb-6 border border-white/5">
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest mb-1.5">Data</span>
                  <div className="flex items-center gap-1.5 text-white">
                    <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                    <span className="text-xs font-black">{app.date}</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/5"></div>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest mb-1.5">Horário</span>
                  <div className="flex items-center gap-1.5 text-white">
                    <span className="material-symbols-outlined text-[16px] text-orange-400">schedule</span>
                    <span className="text-xs font-black">{app.time}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {app.status !== 'completed' && (
                  <button className="flex-1 py-4 bg-surface-highlight text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all hover:bg-white/5">
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => navigate(`/barbershop/${app.barbershop_id}`)}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all hover:bg-primary/90"
                >
                  {app.status === 'completed' ? 'Agendar Novamente' : 'Ver Barbearia'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Appointments;
