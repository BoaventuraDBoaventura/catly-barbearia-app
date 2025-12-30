
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Auth: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!supabase) {
                throw new Error('O Supabase não está configurado. Verifique o seu arquivo .env.local');
            }

            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                alert('Confirme seu email para continuar!');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro na autenticação');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const { error: googleError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`
                }
            });
            if (googleError) throw googleError;
        } catch (err: any) {
            setError(err.message || 'Erro ao entrar com Google');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background-dark text-white p-6 animate-fadeIn">
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                {/* Logo/Icon Section */}
                <div className="mb-12 text-center">
                    <div className="size-20 bg-primary/20 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-primary/30 shadow-2xl shadow-primary/20">
                        <span className="material-symbols-outlined text-primary text-[40px] filled">content_cut</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Barberias</h1>
                    <p className="text-text-secondary font-medium">Estilo impecável a um toque de distância.</p>
                </div>

                {/* Auth Card */}
                <div className="bg-surface-dark rounded-[32px] p-8 border border-white/5 shadow-2xl">
                    <h2 className="text-2xl font-black mb-8 text-center">
                        {isSignUp ? 'Criar Conta' : 'Entrar na Conta'}
                    </h2>

                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest pl-1">Email</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">mail</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full h-14 pl-12 pr-4 bg-surface-highlight border-none rounded-2xl text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest pl-1">Senha</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">lock</span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full h-14 pl-12 pr-12 bg-surface-highlight border-none rounded-2xl text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors focus:outline-none"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-slideUp">
                                <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
                                <p className="text-xs text-red-500 font-bold leading-relaxed">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="size-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">{isSignUp ? 'person_add' : 'login'}</span>
                                    {isSignUp ? 'CADASTRAR' : 'ENTRAR'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1"></div>
                        <span className="text-xs font-bold text-text-secondary uppercase">ou</span>
                        <div className="h-px bg-white/10 flex-1"></div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full h-14 bg-surface-highlight border border-white/5 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm text-white hover:bg-white/5 active:scale-[0.98] transition-all"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="size-5" alt="Google" />
                        Continuar com Google
                    </button>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm font-bold text-text-secondary hover:text-primary transition-colors"
                        >
                            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="py-8 text-center">
                <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">
                    Barberias App • Moçambique 2025
                </p>
            </div>
        </div>
    );
};

export default Auth;
