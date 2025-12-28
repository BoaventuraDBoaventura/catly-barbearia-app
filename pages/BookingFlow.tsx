
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Service, Professional } from '../types';
import { supabase } from '../services/supabaseClient';

const BookingFlow: React.FC = () => {
  const { barbershopId } = useParams<{ barbershopId: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProf, setSelectedProf] = useState<Professional | 'qualquer' | null>(null);

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedFullDate, setSelectedFullDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    fetchShopDetails();
  }, [barbershopId]);

  async function fetchShopDetails() {
    if (!barbershopId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .single();

      if (error) throw error;
      setShop(data);
    } catch (error) {
      console.error('Error fetching shop:', error);
    } finally {
      setLoading(false);
    }
  }

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [viewDate]);

  const times = ['08:00', '09:00', '10:00', '11:00', '13:30', '14:30', '15:30', '16:30', '17:30', '18:30'];

  const handleNext = () => {
    if (step === 1 && selectedService) setStep(2);
    else if (step === 2 && selectedProf) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate(-1);
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedProf || !selectedFullDate || !selectedTime || !barbershopId) return;

    try {
      setBookingLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('user_appointments')
        .insert({
          user_id: session.user.id,
          barbershop_id: barbershopId,
          barbershop_name: shop.name,
          service_name: selectedService.name,
          professional_name: selectedProf === 'qualquer' ? 'Próximo Livre' : (selectedProf as Professional).name,
          date: selectedFullDate.toLocaleDateString('pt-BR'),
          time: selectedTime,
          status: 'confirmed'
        });

      if (error) throw error;
      setIsSuccess(true);
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Erro ao confirmar agendamento. Tente novamente.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!shop) return <div className="p-8 text-center text-white">Barbearia não encontrada.</div>;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="size-24 bg-success/20 text-success rounded-full flex items-center justify-center mb-8 animate-bounce">
          <span className="material-symbols-outlined text-6xl filled">check_circle</span>
        </div>
        <h1 className="text-4xl font-black mb-4 leading-tight text-white">Agendamento Realizado!</h1>
        <p className="text-text-secondary mb-10 max-w-[280px]">Seu horário foi reservado com sucesso. Te esperamos lá!</p>

        <div className="w-full bg-surface-dark rounded-[32px] p-6 border border-white/5 mb-12 shadow-2xl">
          <div className="flex flex-col gap-4 text-left">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-xs text-text-secondary uppercase font-bold tracking-widest">Serviço</span>
              <span className="font-bold text-white">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-xs text-text-secondary uppercase font-bold tracking-widest">Profissional</span>
              <span className="font-bold text-primary">{selectedProf === 'qualquer' ? 'Próximo Livre' : (selectedProf as Professional).name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary uppercase font-bold tracking-widest">Data & Hora</span>
              <span className="font-bold text-white">{selectedFullDate?.toLocaleDateString('pt-BR')} às {selectedTime}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/appointments')}
          className="w-full h-16 bg-primary text-white font-black rounded-[20px] shadow-2xl shadow-primary/30 mb-4 hover:bg-primary/90 transition-all active:scale-95"
        >
          VER MEUS AGENDAMENTOS
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-text-secondary font-bold text-sm hover:text-white transition-all"
        >
          Voltar para o Início
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn pb-40 min-h-screen bg-background-dark">
      <header className="flex items-center p-4 pt-12 border-b border-white/5 sticky top-0 bg-background-dark/95 backdrop-blur-md z-50">
        <button onClick={handleBack} className="size-11 flex items-center justify-center rounded-2xl bg-surface-highlight border border-white/10 active:scale-95 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h2 className="font-black text-lg text-white">Agendar Horário</h2>
          <p className="text-[9px] text-text-secondary uppercase font-black tracking-[0.2em]">{shop.name}</p>
        </div>
        <div className="w-11"></div>
      </header>

      <div className="flex w-full flex-row items-center justify-center gap-3 py-8 px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? 'w-12 bg-primary' : (step > s ? 'w-6 bg-primary/40' : 'w-6 bg-surface-highlight')}`}></div>
        ))}
      </div>

      <div className="px-4">
        {step === 1 && (
          <div className="animate-slideInRight">
            <h1 className="text-3xl font-black mb-2 text-white">Qual o serviço?</h1>
            <p className="text-text-secondary text-sm mb-8">Nossa seleção premium para você.</p>
            <div className="space-y-4">
              {shop.services?.map((service: any) => (
                <div key={service.id} onClick={() => setSelectedService(service)} className={`flex items-center justify-between p-5 rounded-[24px] border-2 transition-all cursor-pointer ${selectedService?.id === service.id ? 'bg-primary/10 border-primary shadow-xl shadow-primary/5' : 'bg-surface-dark border-transparent hover:border-white/10'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`size-14 rounded-2xl flex items-center justify-center transition-all ${selectedService?.id === service.id ? 'bg-primary text-white' : 'bg-surface-highlight text-text-secondary'}`}>
                      <span className="material-symbols-outlined text-2xl">{service.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-base text-white">{service.name}</h3>
                      <p className="text-xs text-text-secondary font-medium">{service.duration} min • {service.price.toFixed(2)} MT</p>
                    </div>
                  </div>
                  <div className={`size-6 rounded-full border-2 flex items-center justify-center ${selectedService?.id === service.id ? 'border-primary bg-primary' : 'border-white/20'}`}>
                    {selectedService?.id === service.id && <span className="material-symbols-outlined text-[16px] text-white font-bold">check</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slideInRight">
            <h1 className="text-3xl font-black mb-2 text-white">Com quem?</h1>
            <p className="text-text-secondary text-sm mb-8">Profissionais altamente qualificados.</p>
            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => setSelectedProf('qualquer')} className={`flex flex-col items-center p-6 rounded-[32px] border-2 transition-all cursor-pointer text-center ${selectedProf === 'qualquer' ? 'bg-primary/10 border-primary shadow-xl shadow-primary/10' : 'bg-surface-dark border-transparent hover:border-white/10'}`}>
                <div className={`size-20 rounded-full flex items-center justify-center mb-4 transition-all ${selectedProf === 'qualquer' ? 'bg-primary text-white scale-110' : 'bg-surface-highlight text-primary'}`}>
                  <span className="material-symbols-outlined text-4xl">groups</span>
                </div>
                <p className="font-black text-sm text-white">Qualquer um</p>
                <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-1">Mais Rápido</p>
              </div>
              {shop.professionals?.map((p: any) => (
                <div key={p.id} onClick={() => setSelectedProf(p)} className={`flex flex-col items-center p-6 rounded-[32px] border-2 transition-all cursor-pointer text-center ${(selectedProf as Professional)?.id === p.id ? 'bg-primary/10 border-primary shadow-xl shadow-primary/10' : 'bg-surface-dark border-transparent hover:border-white/10'}`}>
                  <img src={p.photo} className={`size-20 rounded-full object-cover mb-4 transition-all ${(selectedProf as Professional)?.id === p.id ? 'scale-110 ring-4 ring-primary/30' : ''}`} alt={p.name} />
                  <p className="font-black text-sm text-white">{p.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold uppercase mt-1">
                    <span className="material-symbols-outlined text-[12px] filled">star</span>
                    <span>{p.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slideInRight">
            <h1 className="text-3xl font-black mb-2 text-white">Quando?</h1>
            <p className="text-text-secondary text-sm mb-8">Escolha o momento perfeito.</p>

            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="font-black text-base text-white">{viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-3">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} disabled={viewDate.getMonth() === today.getMonth()} className="size-10 flex items-center justify-center rounded-xl bg-surface-dark border border-white/5 disabled:opacity-20 active:scale-95 transition-all"><span className="material-symbols-outlined">chevron_left</span></button>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="size-10 flex items-center justify-center rounded-xl bg-surface-dark border border-white/5 active:scale-95 transition-all"><span className="material-symbols-outlined">chevron_right</span></button>
              </div>
            </div>

            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-8 -mx-4 px-4">
              {monthDays.map(date => {
                const disabled = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const selected = selectedFullDate?.toDateString() === date.toDateString();
                return (
                  <div key={date.toISOString()} onClick={() => !disabled && setSelectedFullDate(date)} className={`flex flex-col items-center justify-center min-w-[75px] h-[95px] rounded-[24px] cursor-pointer transition-all ${selected ? 'bg-primary shadow-2xl shadow-primary/40 scale-110' : disabled ? 'bg-surface-dark/40 opacity-20' : 'bg-surface-dark border border-white/5 hover:border-white/20'}`}>
                    <span className={`text-[10px] font-black uppercase mb-1 ${selected ? 'text-white/80' : 'text-text-secondary'}`}>{date.toLocaleString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                    <span className={`text-2xl font-black ${selected ? 'text-white' : 'text-white/90'}`}>{date.getDate()}</span>
                  </div>
                );
              })}
            </div>

            <h2 className="font-black text-sm uppercase tracking-widest text-text-secondary mb-5">Horários Disponíveis</h2>
            <div className="grid grid-cols-3 gap-3 mb-10">
              {times.map(t => (
                <button key={t} onClick={() => setSelectedTime(t)} className={`py-4 rounded-2xl border-2 text-sm font-black transition-all ${selectedTime === t ? 'bg-primary border-primary shadow-xl shadow-primary/25 text-white' : 'bg-surface-dark border-transparent text-text-secondary hover:border-white/10'}`}>{t}</button>
              ))}
            </div>

            <div className="bg-surface-dark/50 rounded-[28px] p-5 border border-white/5 mb-10">
              <div className="flex gap-4">
                <div className="size-16 rounded-2xl bg-surface-highlight flex items-center justify-center text-primary shadow-inner">
                  <span className="material-symbols-outlined text-3xl">{selectedService?.icon || 'content_cut'}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-white">{selectedService?.name || 'Selecione um serviço'}</h3>
                  <p className="text-xs text-text-secondary font-medium">{shop.name}</p>
                  <p className="text-xs text-primary font-black mt-1 uppercase tracking-widest">{selectedProf === 'qualquer' ? 'Próximo Livre' : (selectedProf as Professional)?.name}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background-dark/95 backdrop-blur-xl border-t border-white/5 p-4 pb-12 z-[100] shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto">
          {step < 3 ? (
            <button onClick={handleNext} disabled={step === 1 ? !selectedService : !selectedProf} className={`w-full h-16 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 transition-all ${((step === 1 && selectedService) || (step === 2 && selectedProf)) ? 'bg-primary text-white shadow-2xl shadow-primary/40' : 'bg-surface-highlight text-text-secondary opacity-50'}`}>CONTINUAR <span className="material-symbols-outlined">arrow_forward</span></button>
          ) : (
            <button onClick={handleConfirm} disabled={!selectedFullDate || !selectedTime || bookingLoading} className={`w-full h-16 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 transition-all ${selectedFullDate && selectedTime && !bookingLoading ? 'bg-success text-white shadow-2xl shadow-success/40' : 'bg-surface-highlight text-text-secondary opacity-50'}`}>
              {bookingLoading ? (
                <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>FINALIZAR AGENDAMENTO <span className="material-symbols-outlined">check_circle</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;
