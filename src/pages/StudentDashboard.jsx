import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, GraduationCap, Video, RefreshCw, Wallet, Calendar, Play, Download, Send, MessageSquare, User } from 'lucide-react';
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
    const [showBlikModal, setShowBlikModal] = useState(false);
    const [blikCode, setBlikCode] = useState('');
    const [blikStep, setBlikStep] = useState('input'); // input, processing, success
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('rating'); // rating, price-asc, price-desc
    const navigate = useNavigate();

    // Student profile edit states
    const [studentName, setStudentName] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Chat states
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [conversations, setConversations] = useState([]);
    const [activePeerId, setActivePeerId] = useState(null);
    
    // Direct message from tutor profile modal
    const [tutorMessageText, setTutorMessageText] = useState('');
    const [isSendingDirectMessage, setIsSendingDirectMessage] = useState(false);

    // Fetch tutors, history and user profile
    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            if (user) {
                const profileData = await api.fetchProfile(user.id);
                if (profileData && profileData.profile) {
                    setWalletBalance(profileData.profile.walletBalance || 0.00);
                    setStudentName(profileData.profile.name || user.fullName || '');
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

    // Save Student profile
    const handleSaveStudentProfile = async (e) => {
        e.preventDefault();
        if (!user || isSavingProfile) return;
        setIsSavingProfile(true);
        try {
            await api.updateProfile({
                clerkId: user.id,
                name: studentName,
                role: 'student'
            });
            alert("Profil zaktualizowany pomyślnie!");
        } catch (error) {
            console.error("Error updating student profile:", error);
            alert("Nie udało się zaktualizować profilu.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Chat handlers
    const handleSendMessage = async () => {
        if (!chatInput.trim() || !user || !activePeerId) return;
        const textToSend = chatInput;
        setChatInput('');
        try {
            await api.sendChatMessage(user.id, activePeerId, textToSend, 'student');
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: textToSend,
                sender: 'student',
                time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (err) {
            console.error("Error sending chat message:", err);
        }
    };

    const handleSendDirectMessage = async (e) => {
        e.preventDefault();
        if (!tutorMessageText.trim() || !user || !selectedTutor || isSendingDirectMessage) return;
        setIsSendingDirectMessage(true);
        const textToSend = tutorMessageText;
        try {
            await api.sendChatMessage(user.id, selectedTutor.clerkId, textToSend, 'student');
            setTutorMessageText('');
            setSelectedTutor(null);
            setActivePeerId(selectedTutor.clerkId);
            setActiveTab('czat');
            alert("Wiadomość została wysłana! Przekierowano do czatu.");
        } catch (err) {
            console.error("Error sending direct message:", err);
            alert("Nie udało się wysłać wiadomości.");
        } finally {
            setIsSendingDirectMessage(false);
        }
    };

    // Real Chat messages polling loop for Student
    useEffect(() => {
        if (!user || activeTab !== 'czat') return;

        const loadChatData = async () => {
            try {
                const convs = await api.fetchConversations(user.id);
                if (convs && Array.isArray(convs)) {
                    setConversations(convs);
                    
                    // Set default peer if not set
                    if (convs.length > 0 && !activePeerId) {
                        setActivePeerId(convs[0].peerId);
                    }
                }

                if (activePeerId) {
                    const msgs = await api.fetchChatMessages(activePeerId, user.id);
                    if (msgs && Array.isArray(msgs)) {
                        const mapped = msgs.map(m => ({
                            id: m.id,
                            text: m.text,
                            sender: m.senderId === user.id ? 'student' : 'tutor',
                            time: new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
                        }));
                        setMessages(mapped);
                    }
                }
            } catch (err) {
                console.error("Error loading student chat data:", err);
            }
        };

        loadChatData();
        const interval = setInterval(loadChatData, 3000);
        return () => clearInterval(interval);
    }, [user, activeTab, activePeerId]);

    const activePeer = conversations.find(c => c.peerId === activePeerId);
    const activePeerDetails = activePeer || tutors.find(t => t.clerkId === activePeerId);


    const filteredTutors = tutors
        .filter(t => filter === 'Wszystkie' || t.subject === filter)
        .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.university.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'rating') {
                return b.rating - a.rating;
            } else if (sortBy === 'price-asc') {
                return a.pricePerMinute - b.pricePerMinute;
            } else if (sortBy === 'price-desc') {
                return b.pricePerMinute - a.pricePerMinute;
            }
            return 0;
        });

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

    const formatSessionDate = (startTime) => {
        if (!startTime) return 'Brak daty';
        const d = new Date(startTime);
        if (isNaN(d.getTime())) return 'Brak daty';
        return `${d.toLocaleDateString('pl-PL')} o ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
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

                                {/* Search and Sort controls */}
                                <div className="flex flex-col md:flex-row gap-4 mb-8">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Szukaj korepetytora po nazwisku lub uczelni..."
                                            className="w-full pl-12 pr-6 py-4 bg-white rounded-3xl border border-slate-100 shadow-sm outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm transition-all"
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex gap-3 items-center">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Sortuj według:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="bg-white border border-slate-100 px-6 py-4 rounded-3xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-emerald-400"
                                        >
                                            <option value="rating">Najlepsza ocena ⭐</option>
                                            <option value="price-asc">Cena: od najniższej 💰</option>
                                            <option value="price-desc">Cena: od najwyższej 📈</option>
                                        </select>
                                    </div>
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
                                        onClick={() => {
                                            setShowBlikModal(true);
                                            setBlikStep('input');
                                            setBlikCode('');
                                        }}
                                        disabled={isDepositing}
                                        className="w-full bg-emerald-400 text-white py-5 rounded-2xl font-black text-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        Doładuj {selectedDeposit} PLN przez BLIK
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
                                                    <h3 className="font-black text-slate-800 text-lg">Sesja #{session.id ? session.id.slice(-6) : ''}</h3>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                        {formatSessionDate(session.startTime)}
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

                        {activeTab === 'czat' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[60px] shadow-sm border border-slate-100 h-[700px] flex overflow-hidden">
                                {/* Chat Sidebar */}
                                <div className="w-80 border-r border-slate-50 p-6 overflow-y-auto space-y-4 flex-shrink-0">
                                    <h3 className="font-black text-slate-800 mb-6">Wiadomości</h3>
                                    {conversations.length === 0 ? (
                                        <p className="text-slate-400 text-xs font-bold uppercase text-center mt-10">Brak aktywnych czatów</p>
                                    ) : (
                                        conversations.map(conv => (
                                            <div 
                                                key={conv.peerId}
                                                onClick={() => setActivePeerId(conv.peerId)}
                                                className={`p-4 rounded-3xl border flex items-center gap-3 cursor-pointer transition-all ${activePeerId === conv.peerId ? 'bg-[#f0fdf4] border-emerald-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                                            >
                                                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center font-bold text-emerald-700 overflow-hidden flex-shrink-0">
                                                    {conv.imageUrl ? (
                                                        <img src={conv.imageUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-emerald-700 font-bold">{conv.name?.[0]?.toUpperCase() || 'S'}</div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-slate-800 truncate">{conv.name}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{conv.lastMessage || 'Kliknij aby pisać'}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {/* Chat Window */}
                                <div className="flex-1 flex flex-col bg-slate-50/30">
                                    {activePeerId ? (
                                        <>
                                            {/* Chat header with tutor profile link */}
                                            <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                        {activePeerDetails?.imageUrl ? (
                                                            <img src={activePeerDetails.imageUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="text-emerald-700 font-bold">{activePeerDetails?.name?.[0]?.toUpperCase()}</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-800">{activePeerDetails?.name || 'Korepetytor'}</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Korepetytor</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const matched = tutors.find(t => t.clerkId === activePeerId);
                                                        if (matched) {
                                                            setSelectedTutor(matched);
                                                        } else {
                                                            alert("Nie znaleziono szczegółów profilu tego korepetytora.");
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-xs font-black transition-all cursor-pointer"
                                                >
                                                    Zobacz profil
                                                </button>
                                            </div>
                                            
                                            {/* Messages */}
                                            <div className="flex-1 p-10 space-y-6 overflow-y-auto">
                                                {messages.map(msg => (
                                                    <div 
                                                        key={msg.id} 
                                                        className={`p-6 rounded-[30px] shadow-sm max-w-[80%] border ${msg.sender === 'tutor' ? 'bg-white text-slate-700 rounded-tl-none border-slate-100' : 'bg-emerald-400 text-white rounded-tr-none border-transparent ml-auto'}`}
                                                    >
                                                        <p className={msg.sender === 'student' ? 'font-bold' : ''}>{msg.text}</p>
                                                        <span className={`block text-[10px] mt-2 text-right ${msg.sender === 'tutor' ? 'text-slate-400' : 'text-emerald-100'}`}>{msg.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Chat Input */}
                                            <div className="p-8 bg-white border-t border-slate-50">
                                                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={chatInput}
                                                        onChange={(e) => setChatInput(e.target.value)}
                                                        placeholder="Napisz wiadomość..." 
                                                        className="w-full p-6 bg-slate-50 rounded-full border-none focus:ring-2 focus:ring-emerald-400 outline-none pr-20 text-slate-800" 
                                                    />
                                                    <button 
                                                        type="submit"
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-400 text-white p-4 rounded-full shadow-lg shadow-emerald-100 cursor-pointer"
                                                    >
                                                        <Send size={20} />
                                                    </button>
                                                </form>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                                                <MessageSquare size={28} />
                                            </div>
                                            <h4 className="font-black text-slate-800 mb-1">Twój czat jest pusty</h4>
                                            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                                                Wybierz korepetytora z listy, aby rozpocząć konwersację.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'profil' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                className="max-w-2xl mx-auto bg-white p-12 rounded-[50px] shadow-sm border border-slate-100"
                            >
                                <form onSubmit={handleSaveStudentProfile} className="space-y-6">
                                    <div className="flex justify-center mb-8">
                                        <div className="relative">
                                            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-2xl overflow-hidden shadow-inner">
                                                {user?.imageUrl ? (
                                                    <img src={user.imageUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    studentName?.[0]?.toUpperCase() || 'S'
                                                )}
                                            </div>
                                            <span className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full text-xs font-black shadow">Student</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Imię i nazwisko</label>
                                        <input
                                            type="text"
                                            value={studentName}
                                            onChange={(e) => setStudentName(e.target.value)}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-blue-400 text-sm"
                                            required
                                        />
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Twój portfel</p>
                                            <p className="text-2xl font-black text-emerald-500">{walletBalance.toFixed(2)} PLN</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setActiveTab('portfel')}
                                            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl border border-slate-100 transition-all text-sm shadow-sm cursor-pointer"
                                        >
                                            Doładuj konto
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="w-full bg-blue-500 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {isSavingProfile ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={20} /> Zapisywanie...
                                            </>
                                        ) : "Zapisz zmiany w profilu"}
                                    </button>
                                </form>
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
                            className="bg-white w-full max-w-3xl rounded-[60px] p-12 shadow-2xl relative border border-slate-100 overflow-y-auto max-h-[90vh]"
                        >
                            <button onClick={() => setSelectedTutor(null)} className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={28} />
                            </button>
                            <div className="flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
                                <img src={selectedTutor.imageUrl} className="w-48 h-48 rounded-[50px] object-cover shadow-2xl border-8 border-slate-50 flex-shrink-0" />
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
                                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
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

                                    {/* Direct message block */}
                                    <form onSubmit={handleSendDirectMessage} className="pt-6 border-t border-slate-100">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Napisz do korepetytora</label>
                                        <div className="flex gap-3">
                                            <input 
                                                type="text" 
                                                value={tutorMessageText}
                                                onChange={(e) => setTutorMessageText(e.target.value)}
                                                placeholder="Wpisz pytanie lub wiadomość..."
                                                className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm"
                                                required
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={isSendingDirectMessage}
                                                className="bg-emerald-400 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                                            >
                                                {isSendingDirectMessage ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                                                Wyślij
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* GORGEOUS BLIK PAYMENT MODAL */}
            <AnimatePresence>
                {showBlikModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white text-slate-900 w-full max-w-sm rounded-[40px] p-8 text-center shadow-2xl relative border border-slate-100 overflow-hidden"
                        >
                            {/* BLIK Brand Header */}
                            <div className="flex justify-center items-center gap-2 mb-6">
                                <div className="bg-[#e2007a] text-white font-black px-4 py-1.5 rounded-xl text-lg tracking-wider transform -skew-x-12 shadow-md">
                                    blik
                                </div>
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Płatność mobilna</span>
                            </div>

                            {blikStep === 'input' && (
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">Wpisz kod BLIK</h3>
                                    <p className="text-slate-400 text-xs mb-6">Generowany w aplikacji Twojego banku</p>
                                    
                                    <div className="space-y-6">
                                        <input
                                            type="text"
                                            maxLength="6"
                                            placeholder="000 000"
                                            value={blikCode}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setBlikCode(val);
                                            }}
                                            className="w-full text-center text-3xl font-black tracking-[0.5em] p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-[#e2007a] focus:ring-0 outline-none text-slate-800"
                                        />

                                        <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100 flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-bold">Kwota doładowania:</span>
                                            <span className="font-black text-slate-800 text-sm">{selectedDeposit} PLN</span>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowBlikModal(false)}
                                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer text-sm"
                                            >
                                                Anuluj
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (blikCode.length !== 6) {
                                                        alert("Wpisz poprawny 6-cyfrowy kod BLIK!");
                                                        return;
                                                    }
                                                    setBlikStep('processing');
                                                    try {
                                                        const updatedProfile = await api.depositFunds(user.id, selectedDeposit);
                                                        setTimeout(() => {
                                                            if (updatedProfile) {
                                                                setWalletBalance(updatedProfile.walletBalance || 0.00);
                                                                setBlikStep('success');
                                                                setTimeout(() => {
                                                                    setShowBlikModal(false);
                                                                }, 1500);
                                                            }
                                                        }, 1800);
                                                    } catch (err) {
                                                        console.error(err);
                                                        setBlikStep('input');
                                                        alert("Błąd podczas doładowywania portfela.");
                                                    }
                                                }}
                                                className="flex-1 py-4 bg-[#e2007a] hover:bg-[#c00067] text-white rounded-xl font-black transition-all cursor-pointer shadow-lg shadow-pink-100 text-sm"
                                            >
                                                Zatwierdź
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {blikStep === 'processing' && (
                                <div className="py-8">
                                    <div className="w-16 h-16 border-4 border-pink-100 border-t-[#e2007a] rounded-full animate-spin mx-auto mb-6"></div>
                                    <h3 className="text-lg font-black text-slate-800 mb-2">Oczekiwanie na akceptację</h3>
                                    <p className="text-slate-400 text-xs leading-relaxed px-4">
                                        Potwierdź płatność w aplikacji swojego banku na telefonie w ciągu 90 sekund.
                                    </p>
                                </div>
                            )}

                            {blikStep === 'success' && (
                                <div className="py-8">
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                        className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </motion.div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">Doładowano konto!</h3>
                                    <p className="text-emerald-500 font-bold text-sm">+{selectedDeposit}.00 PLN</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentDashboard;
