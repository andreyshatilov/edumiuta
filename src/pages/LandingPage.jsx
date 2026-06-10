import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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
                <div className="flex items-center gap-8">
                    <span 
                        className="text-2xl font-black text-emerald-500 tracking-tighter italic cursor-pointer select-none hover:scale-102 transition-transform"
                        onClick={() => navigate('/')}
                    >
                        StudyBuddy
                    </span>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-500">
                        <button 
                            onClick={() => setShowAboutModal(true)} 
                            className="hover:text-emerald-500 transition-colors cursor-pointer bg-transparent border-none outline-none font-bold"
                        >
                            O nas
                        </button>
                        <button 
                            onClick={() => setShowPrivacyModal(true)} 
                            className="hover:text-emerald-500 transition-colors cursor-pointer bg-transparent border-none outline-none font-bold"
                        >
                            Polityka prywatności
                        </button>
                    </nav>
                </div>
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

            {/* Premium Footer */}
            <footer className="bg-white border-t border-slate-100 mt-12 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col items-center md:items-start">
                        <span className="text-xl font-black text-emerald-500 tracking-tighter italic">StudyBuddy</span>
                        <p className="text-slate-400 text-xs mt-1">Nauka na minuty. Płacisz za sekundy.</p>
                    </div>
                    <div className="flex gap-8 text-sm font-bold text-slate-500">
                        <button 
                            type="button"
                            onClick={() => setShowAboutModal(true)}
                            className="hover:text-emerald-500 transition-colors cursor-pointer bg-transparent border-none outline-none"
                        >
                            O nas
                        </button>
                        <button 
                            type="button"
                            onClick={() => setShowPrivacyModal(true)}
                            className="hover:text-emerald-500 transition-colors cursor-pointer bg-transparent border-none outline-none"
                        >
                            Polityka prywatności
                        </button>
                    </div>
                    <p className="text-slate-400 text-xs">
                        &copy; 2026 StudyBuddy Sp. z o.o. Wszelkie prawa zastrzeżone.
                    </p>
                </div>
            </footer>

            {/* O Nas (About Us) Modal */}
            <AnimatePresence>
                {showAboutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/60 overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white text-slate-900 w-full max-w-2xl rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-100 relative max-h-[85vh] overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button 
                                onClick={() => setShowAboutModal(false)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"></path></svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800">O nas</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Studencki Startup StudyBuddy</p>
                                </div>
                            </div>

                            <div className="space-y-6 text-slate-650 text-sm md:text-base leading-relaxed">
                                <p>
                                    Jesteśmy grupą studentów z polskich uczelni wyższych, którzy na własnej skórze doświadczyli problemów z przygotowaniem do trudnych kolokwiów i egzaminów. Postanowiliśmy to zmienić.
                                </p>
                                <p>
                                    Nasz projekt powstał z myślą o wypełnieniu luki między tradycyjnymi, sztywnymi korepetycjami trwającymi całe godziny a realnymi potrzebami studentów, którzy często potrzebują szybkiego skonsultowania pojedynczego zadania.
                                </p>

                                <div className="grid md:grid-cols-2 gap-4 pt-4">
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                        <h3 className="font-black text-slate-800 mb-1">Kim jesteśmy?</h3>
                                        <p className="text-slate-550 text-xs">
                                            Zespołem pasjonatów technologii i nowoczesnej edukacji. Tworzymy przyjazną platformę bezpośredniej wymiany wiedzy.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                        <h3 className="font-black text-slate-800 mb-1">Nasza misja</h3>
                                        <p className="text-slate-550 text-xs">
                                            Zapewnienie natychmiastowej, przystępnej cenowo pomocy. Łączymy uczniów i ekspertów w 30 sekund z dokładnym rozliczaniem za czas rozmowy.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => setShowAboutModal(false)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-3 rounded-2xl transition-all cursor-pointer text-sm"
                                >
                                    Zamknij
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Polityka Prywatności Modal */}
            <AnimatePresence>
                {showPrivacyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/60 overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white text-slate-900 w-full max-w-2xl rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-100 relative max-h-[85vh] overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button 
                                onClick={() => setShowPrivacyModal(false)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-emerald-500 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800">Polityka Prywatności</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">RODO & Ochrona Danych Osobowych</p>
                                </div>
                            </div>

                            <div className="space-y-6 text-slate-500 text-sm leading-relaxed overflow-y-auto max-h-[45vh] pr-2">
                                <section>
                                    <h3 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                                        1. Administrator Danych
                                    </h3>
                                    <p>
                                        Administratorem danych osobowych zbieranych za pośrednictwem platformy **StudyBuddy** jest studencki startup StudyBuddy (tworzony przez studentów dla studentów). Cenimy Twoją prywatność i chronimy dane z należytą starannością.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                                        2. Ochrona Prywatności i RODO (Zasada RODO)
                                    </h3>
                                    <p>
                                        W trosce o prywatność naszych użytkowników, platforma StudyBuddy wdraża mechanizm ochrony tożsamości uczniów. Dane studenta przekazywane korepetytorom są automatycznie anonimizowane – **tutorzy widzą wyłącznie imię studenta (bez nazwiska)**. Pełne nazwisko studenta nie jest ujawniane w systemie czatów, żądań ani historii lekcji widocznych dla tutorów.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                                        3. Jakie dane przetwarzamy?
                                    </h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong>Dane uwierzytelniające:</strong> Przechowywane bezpiecznie za pośrednictwem serwisu Clerk Auth (Email, Hasło, Awatar).</li>
                                        <li><strong>Dane profilu:</strong> Imię i nazwisko, portfel (dla studentów) oraz uczelnia, przedmiot, stawka, biografia, certyfikaty, doświadczenie (dla tutorów).</li>
                                        <li><strong>Transakcje płatnicze:</strong> Logi doładowań i pobrania opłat za zrealizowane sesje.</li>
                                        <li><strong>Sesje wideo:</strong> Pokoje wideo audio-wideo (Daily.co / Jitsi) oraz ich opcjonalne nagrania w celu weryfikacji jakości (przechowywane przez 7 dni).</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                                        4. Prawa Użytkownika
                                    </h3>
                                    <p>
                                        Masz prawo do wglądu w swoje dane, ich edycji, żądania ograniczenia ich przetwarzania lub całkowitego usunięcia konta. W tym celu możesz skontaktować się z administratorem lub dokonać edycji w zakładce „Profil”.
                                    </p>
                                </section>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                    Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
                                </span>
                                <button 
                                    onClick={() => setShowPrivacyModal(false)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-3 rounded-2xl transition-all cursor-pointer text-sm"
                                >
                                    Zamknij
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
