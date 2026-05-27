import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, GraduationCap, Video, RefreshCw, Wallet, Calendar, Play, Download } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

const StudentDashboard = () => {
    const { user } = useUser();
    const displayName = user?.firstName || "Student";
    const [activeTab, setActiveTab] = useState('szukaj');
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [filter, setFilter] = useState('Wszystkie');
    const [tutors, setTutors] = useState([]);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const [walletBalance, setWalletBalance] = useState(100.00);
    const [selectedDeposit, setSelectedDeposit] = useState(50);
    const [isDepositing, setIsDepositing] = useState(false);
    const [isStartingCall, setIsStartingCall] = useState(false);
    const navigate = useNavigate();

    // Fetch tutors, history and user profile
    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            if (user) {
                const profileData = await api.fetchProfile(user.id);
                if (profileData && profileData.profile) {
                    setWalletBalance(profileData.profile.walletBalance || 0.00);
                }

                // Fetch history
                const sessionHistory = await api.fetchSessionHistory(user.id);
                if (sessionHistory) {
                    setHistory(sessionHistory);
                }
            }

            const tutorsList = await api.fetchTutors();
            if (tutorsList) {
                setTutors(tutorsList);
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [user, activeTab]);

    const filteredTutors = filter === 'Wszystkie'
        ? tutors
        : tutors.filter(t => t.subject === filter);

    const handleStartCall = async (tutor) => {
        if (!user) return;
        
        const minRequiredBalance = tutor.pricePerMinute * 5;
        if (walletBalance < minRequiredBalance) {
            alert(`Niewystarczające środki w portfelu! Doładuj konto. Minimalna kwota na rozpoczęcie lekcji (5 min) to ${minRequiredBalance.toFixed(2)} PLN.`);
            setSelectedTutor(null);
            setActiveTab('portfel');
            return;
        }

        setIsStartingCall(true);
        try {
            const session = await api.startSession(user.id, tutor.clerkId);
            navigate(`/call/${session.id}`, {
                state: { session }
            });
        } catch (error) {
            console.error("Error starting live session:", error);
            alert("Błąd podczas nawiązywania połączenia z korepetytorem. Upewnij się, że jest dostępny.");
        } finally {
            setIsStartingCall(false);
        }
    };

    const handleDeposit = async () => {
        if (!user) return;
        setIsDepositing(true);
        try {
            const updatedProfile = await api.depositFunds(user.id, selectedDeposit);
            if (updatedProfile) {
                setWalletBalance(updatedProfile.walletBalance || 0.00);
                alert(`Pomyślnie doładowano portfel kwotą ${selectedDeposit} PLN!`);
            }
        } catch (error) {
            console.error("Failed to deposit funds:", error);
            alert("Błąd podczas doładowywania portfela.");
        } finally {
            setIsDepositing(false);
        }
    };

    const handleSeedDemo = async () => {
        setIsSeeding(true);
        try {
            const result = await api.seedDatabase();
            alert(result.message || "Pomyślnie zasilono bazę danych demo!");
            loadDashboardData();
        } catch (error) {
            console.error("Failed to seed database:", error);
            alert("Błąd podczas zasilania bazy danych demo.");
        } finally {
            setIsSeeding(false);
        }
    };

    const formatDuration = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins} min ${secs} sek`;
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            <Sidebar role="student" activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 p-4 md:p-10">
                <div className="max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Cześć, {displayName}! 👋</h1>
                            <p className="text-slate-400">Znajdź eksperta, który pomoże Ci w nauce.</p>
                        </div>
                        <div className="bg-white px-8 py-4 rounded-[30px] shadow-sm border border-emerald-50 text-center flex items-center gap-4">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Twój portfel</p>
                                <p className="text-2xl font-black text-emerald-500">{walletBalance.toFixed(2)} PLN</p>
                            </div>
                            <button 
                                onClick={loadDashboardData}
                                className="p-2 rounded-full hover:bg-slate-50 transition-colors text-slate-400 cursor-pointer"
                                title="Odśwież dane"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </header>

                    <AnimatePresence mode="wait">
                        {activeTab === 'szukaj' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {/* Subjects Filter */}
                                <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
                                    {['Wszystkie', 'Mikroekonomia', 'Makroekonomia', 'Ekonometria', 'Statystyka', 'Rachunkowość', 'Finanse', 'Zarządzanie'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setFilter(s)}
                                            className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap shadow-sm cursor-pointer ${filter === s ? 'bg-emerald-400 text-white scale-105 shadow-md shadow-emerald-100' : 'bg-white text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                {/* Loader / Grid */}
                                {isLoading ? (
                                    <div className="flex justify-center py-20">
                                        <RefreshCw className="animate-spin text-emerald-400" size={32} />
                                    </div>
                                ) : filteredTutors.length === 0 ? (
                                    <div className="bg-white p-16 rounded-[40px] text-center border border-slate-100 max-w-lg mx-auto shadow-sm mt-10">
                                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Video size={28} />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2">Brak aktywnych korepetytorów</h3>
                                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                                            Wszyscy eksperci są offline. Do celów prezentacji możesz natychmiast zaszilić bazę danych 5 wirtualnymi korepetytorami online!
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                            <button 
                                                onClick={handleSeedDemo} 
                                                disabled={isSeeding}
                                                className="bg-emerald-400 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {isSeeding ? <RefreshCw className="animate-spin" size={18} /> : "Zasil bazę demo (5 тьюторов)"}
                                            </button>
                                            <button 
                                                onClick={loadDashboardData} 
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <RefreshCw size={16} /> Odśwież
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                                        {filteredTutors.map(tutor => (
                                            <motion.div
                                                key={tutor.id || tutor.clerkId}
                                                layout
                                                whileHover={{ y: -8 }}
                                                onClick={() => setSelectedTutor(tutor)}
                                                className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 cursor-pointer hover:shadow-xl transition-all relative group"
                                            >
                                                <div className="absolute top-6 right-6 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black">
                                                    {tutor.pricePerMinute.toFixed(2)} zł/min
                                                </div>
                                                <img src={tutor.imageUrl} className="w-24 h-24 rounded-[32px] object-cover mb-6 shadow-md border-4 border-slate-50" alt={tutor.name} />
                                                <h3 className="font-black text-xl text-slate-800 mb-1">{tutor.name}</h3>
                                                <p className="text-emerald-500 font-bold text-sm mb-4">{tutor.subject}</p>
                                                <div className="flex items-center gap-1 text-yellow-500 font-black mb-4">
                                                    <Star size={18} fill="currentColor" /> {tutor.rating.toFixed(1)} <span className="text-slate-300 font-normal ml-1">({tutor.reviewsCount})</span>
                                                </div>
                                                <div className="pt-4 border-t border-slate-50 text-slate-400 text-sm italic truncate">
                                                    {tutor.university}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'portfel' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-md mx-auto bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                                <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Wallet className="text-emerald-500" /> Doładuj portfel
                                </h2>
                                <div className="space-y-6">
                                    <div className="p-6 bg-slate-50 rounded-3xl text-center">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Dostępne środki</p>
                                        <p className="text-4xl font-black text-slate-800">{walletBalance.toFixed(2)} PLN</p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Wybierz kwotę doładowania</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[20, 50, 100].map(amount => (
                                                <button 
                                                    key={amount} 
                                                    onClick={() => setSelectedDeposit(amount)}
                                                    className={`py-4 rounded-2xl font-black text-lg transition-all border cursor-pointer ${selectedDeposit === amount ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}
                                                >
                                                    {amount} zł
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleDeposit}
                                        disabled={isDepositing}
                                        className="w-full bg-emerald-400 text-white py-5 rounded-2xl font-black text-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {isDepositing ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={20} /> Przetwarzanie...
                                            </>
                                        ) : (
                                            `Doładuj ${selectedDeposit} PLN przez BLIK`
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'historia' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto">
                                <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Calendar className="text-emerald-500" /> Historia lekcji
                                </h2>
                                
                                {isLoading ? (
                                    <div className="flex justify-center py-10">
                                        <RefreshCw className="animate-spin text-emerald-400" size={24} />
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm">
                                        <p className="text-slate-400 font-bold">Brak historii lekcji. Odbądź swoją pierwszą konsultację!</p>
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
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Koszt</p>
                                                        <p className="font-mono text-xl font-black text-blue-500">{(session.cost || 0).toFixed(2)} PLN</p>
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

            {/* Profile Modal */}
            <AnimatePresence>
                {selectedTutor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/30">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-3xl rounded-[60px] p-12 shadow-2xl relative border border-slate-100"
                        >
                            <button onClick={() => setSelectedTutor(null)} className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={28} />
                            </button>
                            <div className="flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
                                <img src={selectedTutor.imageUrl} className="w-48 h-48 rounded-[50px] object-cover shadow-2xl border-8 border-slate-50" />
                                <div className="flex-1">
                                    <div className="bg-emerald-100 text-emerald-600 px-4 py-1 rounded-full text-sm font-black w-fit mb-4 mx-auto md:mx-0">
                                        {selectedTutor.pricePerMinute.toFixed(2)} PLN / MINUTA
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-800 mb-2">{selectedTutor.name}</h2>
                                    <p className="text-slate-400 font-bold flex items-center justify-center md:justify-start gap-2 mb-6 uppercase tracking-widest text-sm">
                                        <GraduationCap size={20} /> {selectedTutor.university}
                                    </p>
                                    <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 mb-8">
                                        <h4 className="font-black text-slate-700 mb-2">Specjalizacja: {selectedTutor.subject}</h4>
                                        <p className="text-slate-500 leading-relaxed italic">"{selectedTutor.bio}"</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button 
                                            onClick={() => handleStartCall(selectedTutor)}
                                            disabled={isStartingCall}
                                            className="flex-1 bg-emerald-400 text-white py-6 rounded-3xl font-black text-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                                        >
                                            {isStartingCall ? (
                                                <RefreshCw className="animate-spin" size={24} />
                                            ) : (
                                                <>
                                                    <Video size={24} /> Rozpocznij naukę
                                                </>
                                            )}
                                        </button>
                                        <button className="flex-1 bg-slate-100 text-slate-700 py-6 rounded-3xl font-black text-xl hover:bg-slate-200 transition-all">
                                            Zarezerwuj termin
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentDashboard;
