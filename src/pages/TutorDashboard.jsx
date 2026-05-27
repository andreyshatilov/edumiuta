import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Filter, Phone, PhoneOff, RefreshCw, Star, Wallet, Calendar, Clock, Download } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

const TutorDashboard = () => {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState('czat');
    const [isOnline, setIsOnline] = useState(false);
    const [totalEarnings, setTotalEarnings] = useState(0.00);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isToggling, setIsToggling] = useState(false);
    const [incomingSession, setIncomingSession] = useState(null);
    const [isRespondingCall, setIsRespondingCall] = useState(false);
    const navigate = useNavigate();

    // Fetch tutor profile, status, earnings and history
    const loadProfileData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await api.fetchProfile(user.id);
            if (data && data.profile) {
                setIsOnline(data.profile.isOnline || false);
                setTotalEarnings(data.profile.totalEarnings || 0.00);
            }

            // Fetch history
            const sessionHistory = await api.fetchSessionHistory(user.id);
            if (sessionHistory) {
                setHistory(sessionHistory);
            }
        } catch (error) {
            console.error("Error loading tutor profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProfileData();
    }, [user, activeTab]);

    // Active session polling (incoming call listener)
    useEffect(() => {
        if (!user || !isOnline || incomingSession) return;

        const pollIncomingCalls = async () => {
            try {
                const activeSession = await api.fetchActiveSession(user.id);
                if (activeSession) {
                    setIncomingSession(activeSession);
                }
            } catch (error) {
                // Ignore 404s
            }
        };

        pollIncomingCalls();
        const interval = setInterval(pollIncomingCalls, 3000);
        return () => clearInterval(interval);
    }, [user, isOnline, incomingSession]);

    const handleToggleStatus = async () => {
        if (!user || isToggling) return;
        setIsToggling(true);
        const newStatus = !isOnline;
        try {
            await api.toggleStatus(user.id, newStatus);
            setIsOnline(newStatus);
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Błąd podczas aktualizacji statusu dostępności.");
        } finally {
            setIsToggling(false);
        }
    };

    const handleAcceptCall = () => {
        if (!incomingSession) return;
        navigate(`/call/${incomingSession.id}`, {
            state: { session: incomingSession }
        });
    };

    const handleDeclineCall = async () => {
        if (!incomingSession) return;
        setIsRespondingCall(true);
        try {
            await api.declineSession(incomingSession.id);
            setIncomingSession(null);
        } catch (error) {
            console.error("Error declining call:", error);
            setIncomingSession(null);
        } finally {
            setIsRespondingCall(false);
        }
    };

    const formatDuration = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins} min ${secs} sek`;
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            <Sidebar role="tutor" activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 p-10 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <header className="flex justify-between items-center mb-10">
                        <h1 className="text-4xl font-black text-slate-800 capitalize tracking-tighter">
                            {activeTab === 'kalendarz' ? 'Historia lekcji' : activeTab}
                        </h1>
                        
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleToggleStatus}
                                disabled={isToggling}
                                className={`px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 cursor-pointer transition-all ${isOnline ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-200 text-slate-600'}`}
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
                                Status: {isOnline ? 'Dostępny' : 'Niedostępny'}
                            </button>
                            
                            <button 
                                onClick={loadProfileData}
                                className="p-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-100 text-slate-400 cursor-pointer"
                                title="Odśwież"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </header>

                    <AnimatePresence mode="wait">
                        {activeTab === 'czat' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[60px] shadow-sm border border-slate-100 h-[700px] flex overflow-hidden">
                                {/* Chat Sidebar */}
                                <div className="w-80 border-r border-slate-50 p-6">
                                    <h3 className="font-black text-slate-800 mb-6">Wiadomości</h3>
                                    <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-200 rounded-2xl flex items-center justify-center font-bold text-blue-700">M</div>
                                        <div>
                                            <p className="font-black text-slate-800">Marek (UEK)</p>
                                            <p className="text-xs text-emerald-600 font-bold">Pisze...</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Chat Window */}
                                <div className="flex-1 flex flex-col bg-slate-50/30">
                                    <div className="flex-1 p-10 space-y-6 overflow-y-auto">
                                        <div className="bg-white p-6 rounded-[30px] rounded-tl-none shadow-sm max-w-[80%] border border-slate-100">
                                            <p className="text-slate-600">Dzień dobry! Czy pomógłby mi Pan z testem White'a w Gretlu? Mam problem z interpretacją wyników p-value. Przesyłam zrzut ekranu z zadaniem.</p>
                                            <div className="mt-4 p-3 bg-slate-100 rounded-2xl flex items-center gap-3 border border-dashed border-slate-300">
                                                <Filter size={20} className="text-slate-400" />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">zadanie_ekonometria_1.png</span>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-400 text-white p-6 rounded-[30px] rounded-tr-none shadow-lg max-w-[80%] ml-auto">
                                            <p className="font-bold">Cześć Marek! Jasne, test White'a to klasyk. Pamiętaj, że tam hipoteza zerowa to stałość wariancji (homoskedastyczność). Jeśli chcesz, możemy wejść na 5-minutową konsultację teraz?</p>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-white border-t border-slate-50">
                                        <div className="relative">
                                            <input type="text" placeholder="Napisz do studenta..." className="w-full p-6 bg-slate-50 rounded-full border-none focus:ring-2 focus:ring-emerald-400 outline-none pr-20" />
                                            <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-400 text-white p-4 rounded-full shadow-lg shadow-emerald-100">
                                                <Send size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'zarobki' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-8">
                                <div className="bg-white p-12 rounded-[50px] shadow-sm text-center border border-emerald-50">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest mb-2">Suma zarobków (Łącznie)</p>
                                    <h2 className="text-7xl font-black text-emerald-500">{totalEarnings.toFixed(2)} PLN</h2>
                                    <p className="text-slate-400 text-xs mt-4">
                                        Zarobki są aktualizowane automatycznie po zakończeniu każdej sesji i potrącane z portfela studenta.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'kalendarz' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                {isLoading ? (
                                    <div className="flex justify-center py-10">
                                        <RefreshCw className="animate-spin text-emerald-400" size={24} />
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm">
                                        <p className="text-slate-400 font-bold">Brak historii lekcji. Uruchom sesję z uczniem, aby zacząć zarabiać!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {history.map(session => (
                                            <div key={session.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div>
                                                    <h3 className="font-black text-slate-800 text-lg">Sesja #{session.id.slice(-6)}</h3>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                        {new Date(session.startTime).toLocaleDateString('pl-PL')} o {new Date(session.startTime).toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'})}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="bg-slate-50 px-3 py-1 rounded-full text-xs font-bold text-slate-500">
                                                            {formatDuration(session.durationSeconds || 0)}
                                                        </span>
                                                        <span className="bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold text-emerald-600">
                                                            {(session.tutorRate || 1.50).toFixed(2)} PLN / min
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Zarobek</p>
                                                        <p className="font-mono text-xl font-black text-emerald-500">{(session.cost || 0).toFixed(2)} PLN</p>
                                                    </div>
                                                    
                                                    {session.recordingUrl && (
                                                        <a 
                                                            href={session.recordingUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-emerald-500 transition-colors shadow-sm flex items-center justify-center gap-2 text-xs font-bold"
                                                        >
                                                            <Download size={14} /> Nagranie
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Pulsing Fullscreen Incoming Call Modal */}
            <AnimatePresence>
                {incomingSession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white text-slate-900 w-full max-w-md rounded-[50px] p-10 text-center shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-emerald-400/5 animate-pulse -z-10"></div>
                            
                            <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                                <Phone size={44} />
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 mb-2">Połączenie przychodzące!</h2>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-6">Student prosi o konsultację</p>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 space-y-2 text-center">
                                <p className="font-black text-slate-800 text-lg">Sesja #{incomingSession.id.slice(-6)}</p>
                                <p className="text-sm text-emerald-600 font-bold">Stawka: {(incomingSession.tutorRate || 1.50).toFixed(2)} PLN / min</p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleDeclineCall}
                                    disabled={isRespondingCall}
                                    className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-rose-500/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <PhoneOff size={20} /> Odrzuć
                                </button>
                                <button
                                    onClick={handleAcceptCall}
                                    disabled={isRespondingCall}
                                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Phone size={20} className="animate-spin-slow" /> Odbierz
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TutorDashboard;
