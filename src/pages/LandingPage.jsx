import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Star, LogIn, Clock, ShieldCheck, Video, PencilLine, Zap, CheckCircle } from 'lucide-react';
import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { api } from '../services/api';

const LandingPage = () => {
    const { isSignedIn, user } = useUser();
    const navigate = useNavigate();
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [subscribeMessage, setSubscribeMessage] = useState('');
    const [subscribeStatus, setSubscribeStatus] = useState(null); // 'success', 'error'

    const handleDashboardRedirect = () => {
        const role = user?.unsafeMetadata?.role;
        if (role === 'tutor') {
            navigate('/tutor');
        } else {
            navigate('/student');
        }
    };

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!newsletterEmail.trim() || isSubscribing) return;
        setIsSubscribing(true);
        setSubscribeStatus(null);
        setSubscribeMessage('');
        try {
            const res = await api.subscribeNewsletter(newsletterEmail.trim());
            if (res && res.success) {
                setSubscribeStatus('success');
                setSubscribeMessage(res.message || 'Pomyślnie zapisano do newslettera!');
                setNewsletterEmail('');
            } else {
                setSubscribeStatus('error');
                setSubscribeMessage('Wystąpił błąd. Spróbuj ponownie.');
            }
        } catch (err) {
            console.error(err);
            setSubscribeStatus('error');
            setSubscribeMessage(err.response?.data?.error || 'Nie udało się zapisać.');
        } finally {
            setIsSubscribing(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
    };

    return (
        <div className="min-h-screen bg-[#f0f9ff] text-slate-800 font-sans selection:bg-emerald-200">
            {/* Top Navigation */}
            <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center bg-white/30 backdrop-blur-md sticky top-0 z-40 border-b border-white/20">
                <span className="text-2xl font-black text-emerald-500 tracking-tighter italic">StudyBuddy</span>
                <div>
                    {isSignedIn ? (
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleDashboardRedirect}
                                className="bg-emerald-400 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-full transition-all shadow-lg shadow-emerald-100 text-sm cursor-pointer hover:scale-105"
                            >
                                Przejdź do panelu
                            </button>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    ) : (
                        <SignInButton mode="modal">
                            <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-2.5 rounded-full transition-all shadow-md text-sm cursor-pointer hover:scale-105">
                                <LogIn size={16} /> Zaloguj się
                            </button>
                        </SignInButton>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6 pt-12 pb-24">
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto"
                >
                    <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-blue-50 text-xs font-black uppercase tracking-wider text-emerald-600 mb-6 shadow-sm">
                        <Zap size={14} className="animate-bounce" /> Uber dla korepetycji w Polsce
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="text-6xl md:text-7.5xl font-black text-slate-900 mb-6 tracking-tight leading-none">
                        Nauka na minuty.<br />
                        Płacisz za <span className="text-emerald-500 italic">sekundy</span>.
                    </motion.h1>

                    <motion.p variants={itemVariants} className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl leading-relaxed">
                        Masz problem z zadaniem? Połącz się z ekspertem w 30 sekund. Korzystaj z wideo, dźwięku oraz interaktywnej tablicy i rozliczaj się za faktyczny czas.
                    </motion.p>

                    {/* Role Select Cards */}
                    <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-8 w-full max-w-3xl mb-24">
                        {isSignedIn ? (
                            <>
                                <button 
                                    onClick={() => navigate('/student')}
                                    className="group bg-blue-500 text-white p-12 rounded-[50px] shadow-2xl hover:bg-blue-600 transition-all hover:scale-102 cursor-pointer text-center relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
                                    <User size={56} className="mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                    <h2 className="text-3xl font-black mb-1">Ucz się</h2>
                                    <p className="opacity-90 font-bold">Połącz się z ekspertem natychmiast</p>
                                </button>
                                <button 
                                    onClick={() => navigate('/tutor')}
                                    className="group bg-emerald-400 text-white p-12 rounded-[50px] shadow-2xl hover:bg-emerald-500 transition-all hover:scale-102 cursor-pointer text-center relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
                                    <Star size={56} className="mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                    <h2 className="text-3xl font-black mb-1">Nauczaj</h2>
                                    <p className="opacity-90 font-bold">Zarabiaj na każdej minucie rozmowy</p>
                                </button>
                            </>
                        ) : (
                            <>
                                <SignInButton mode="modal" forceRedirectUrl="/student">
                                    <button className="group bg-blue-500 text-white p-12 rounded-[50px] shadow-2xl hover:bg-blue-600 transition-all hover:scale-102 cursor-pointer text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
                                        <User size={56} className="mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                        <h2 className="text-3xl font-black mb-1">Ucz się</h2>
                                        <p className="opacity-90 font-bold">Połącz się z ekspertem natychmiast</p>
                                    </button>
                                </SignInButton>
                                <SignInButton mode="modal" forceRedirectUrl="/tutor">
                                    <button className="group bg-emerald-400 text-white p-12 rounded-[50px] shadow-2xl hover:bg-emerald-500 transition-all hover:scale-102 cursor-pointer text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
                                        <Star size={56} className="mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                        <h2 className="text-3xl font-black mb-1">Nauczaj</h2>
                                        <p className="opacity-90 font-bold">Zarabiaj na każdej minucie rozmowy</p>
                                    </button>
                                </SignInButton>
                            </>
                        )}
                    </motion.div>
                </motion.div>

                {/* Features Highlights */}
                <section className="mb-24">
                    <h2 className="text-4xl font-black text-center text-slate-900 mb-12">Dlaczego StudyBuddy? 💡</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: <Clock className="text-blue-500" size={32} />, title: "Rozliczenie sekundowe", desc: "Nie kupujesz pełnych godzin. Rozmowa trwała 3 minuty i 15 sekund? Płacisz tylko za ten czas." },
                            { icon: <Zap className="text-amber-500" size={32} />, title: "Połączenie w 30 sekund", desc: "Klikasz przycisk i od razu rozmawiasz z ekspertem online. Bez czekania, rezerwacji i maili." },
                            { icon: <PencilLine className="text-emerald-500" size={32} />, title: "Tablica w czasie rzeczywistym", desc: "Rysujcie, piszcie i rozwiązujcie zadania na wspólnej, interaktywnej tablicy synced peer-to-peer." },
                            { icon: <ShieldCheck className="text-purple-500" size={32} />, title: "Nagrania na 7 dni", desc: "Wszystkie lekcje wraz z zapisem tablicy i wideo są nagrywane. Możesz je pobrać lub obejrzeć przez tydzień." }
                        ].map((feature, i) => (
                            <div key={i} className="bg-white p-8 rounded-[35px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How it Works */}
                <section className="mb-24 bg-white p-16 rounded-[60px] border border-slate-100 shadow-sm">
                    <h2 className="text-4xl font-black text-center text-slate-900 mb-16">Jak to działa? 🛠️</h2>
                    <div className="grid md:grid-cols-2 gap-16">
                        <div>
                            <h3 className="text-2xl font-black text-blue-500 mb-8 flex items-center gap-2"><User /> Dla Studenta</h3>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                                    <div>
                                        <p className="font-bold text-slate-800">Wybierz korepetytora</p>
                                        <p className="text-slate-400 text-sm">Filtruj według przedmiotów i przeglądaj online ekspertów z najlepszych uczelni.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                                    <div>
                                        <p className="font-bold text-slate-800">Rozpocznij lekcję</p>
                                        <p className="text-slate-400 text-sm">Jednym kliknięciem łączysz się na audio-wideo z wbudowaną tablicą.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                                    <div>
                                        <p className="font-bold text-slate-800">Rozlicz się za minuty</p>
                                        <p className="text-slate-400 text-sm">Po zakończeniu kwota zostanie automatycznie potrącona z Twojego portfela.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-2xl font-black text-emerald-500 mb-8 flex items-center gap-2"><Star /> Dla Korepetytora</h3>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                                    <div>
                                        <p className="font-bold text-slate-800">Skonfiguruj profil</p>
                                        <p className="text-slate-400 text-sm">Wpisz swoją uczelnię, przedmiot i stawkę za minutę (np. 1.80 PLN/min).</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                                    <div>
                                        <p className="font-bold text-slate-800">Wejdź w stan Online</p>
                                        <p className="text-slate-400 text-sm">Włącz dostępność w panelu. Od tego momentu studenci widzą Cię na liście.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                                    <div>
                                        <p className="font-bold text-slate-800">Odbieraj połączenia</p>
                                        <p className="text-slate-400 text-sm">Rozmawiaj, tłumacz i zarabiaj na każdej sekundzie. Wypłacaj środki kiedy chcesz.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Newsletter Section */}
                <section className="w-full max-w-2xl bg-white p-12 rounded-[60px] shadow-xl border border-blue-50 mx-auto text-center">
                    <h3 className="text-3xl font-black text-slate-800 mb-2">Chcesz dowiedzieć się więcej?</h3>
                    <p className="text-slate-500 mb-8">Zostaw swój mail, a prześlemy Ci prezentację dla inwestorów oraz kod na 15 darmowych minut.</p>
                    <form onSubmit={handleSubscribe} className="space-y-4">
                        <input 
                            type="email" 
                            required
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            placeholder="Wpisz swój email..." 
                            className="w-full p-6 bg-slate-50 rounded-3xl border-none focus:ring-2 focus:ring-emerald-400 outline-none text-lg text-center font-bold text-slate-700" 
                        />
                        <div className="flex justify-center gap-6 py-2">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-bold">
                                <input type="radio" name="role" defaultChecked className="w-5 h-5 accent-emerald-500" /> Jestem Studentem
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-bold">
                                <input type="radio" name="role" className="w-5 h-5 accent-emerald-500" /> Jestem Korepetytorem
                            </label>
                        </div>
                        <button 
                            type="submit"
                            disabled={isSubscribing}
                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg shadow-slate-200 cursor-pointer"
                        >
                            {isSubscribing ? 'Zapisywanie...' : 'Zapisz mnie do newslettera'}
                        </button>
                        
                        {subscribeMessage && (
                            <p className={`mt-4 text-sm font-bold ${subscribeStatus === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {subscribeMessage}
                            </p>
                        )}
                    </form>
                </section>
            </main>
        </div>
    );
};

export default LandingPage;
