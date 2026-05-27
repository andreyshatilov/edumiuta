import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Filter, Phone, PhoneOff, RefreshCw, Star, Wallet, Calendar, Clock, Download, X } from 'lucide-react';
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

    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Tutor profile edit states
    const [tutorName, setTutorName] = useState('');
    const [tutorUniversity, setTutorUniversity] = useState('');
    const [tutorSubject, setTutorSubject] = useState('');
    const [tutorPrice, setTutorPrice] = useState(1.50);
    const [tutorBio, setTutorBio] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Real Chat variables
    const [conversations, setConversations] = useState([]);
    const [activePeerId, setActivePeerId] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !user || !activePeerId) return;
        const textToSend = chatInput;
        setChatInput('');
        try {
            await api.sendChatMessage(user.id, activePeerId, textToSend, 'tutor');
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: textToSend,
                sender: 'tutor',
                time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    const handleSaveTutorProfile = async (e) => {
        e.preventDefault();
        if (!user || isSavingProfile) return;
        setIsSavingProfile(true);
        try {
            await api.updateProfile({
                clerkId: user.id,
                name: tutorName,
                role: 'tutor',
                university: tutorUniversity,
                subject: tutorSubject,
                pricePerMinute: parseFloat(tutorPrice),
                bio: tutorBio
            });
            alert("Profil zaktualizowany pomyślnie!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Nie udało się zaktualizować profilu.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Fetch tutor profile, status, earnings and history
    const loadProfileData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await api.fetchProfile(user.id);
            if (data && data.profile) {
                setIsOnline(data.profile.isOnline || false);
                setTotalEarnings(data.profile.totalEarnings || 0.00);
                
                // Populate edit fields
                setTutorName(data.profile.name || '');
                setTutorUniversity(data.profile.university || '');
                setTutorSubject(data.profile.subject || '');
                setTutorPrice(data.profile.pricePerMinute || 1.50);
                setTutorBio(data.profile.bio || '');
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

    // Real Chat messages polling loop
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
                            sender: m.senderId === user.id ? 'tutor' : 'student',
                            time: new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
                        }));
                        setMessages(mapped);
                    }
                }
            } catch (err) {
                console.error("Error loading chat data:", err);
            }
        };

        loadChatData();
        const interval = setInterval(loadChatData, 3000);
        return () => clearInterval(interval);
    }, [user, activeTab, activePeerId]);

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

    const activePeer = conversations.find(c => c.peerId === activePeerId);

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
                                <div className="w-80 border-r border-slate-50 p-6 overflow-y-auto space-y-4">
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
                                                <div className="w-12 h-12 bg-blue-200 rounded-2xl flex items-center justify-center font-bold text-blue-700 overflow-hidden flex-shrink-0">
                                                    {conv.imageUrl ? (
                                                        <img src={conv.imageUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-blue-700 font-bold">{conv.name?.[0]?.toUpperCase() || 'S'}</div>
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
                                            {/* Chat Header */}
                                            <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold">
                                                        {activePeer?.imageUrl ? (
                                                            <img src={activePeer.imageUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div>{activePeer?.name?.[0]?.toUpperCase() || 'S'}</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-800">{activePeer?.name || 'Student'}</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={async () => {
                                                        try {
                                                            const data = await api.fetchProfile(activePeerId);
                                                            if (data && data.profile) {
                                                                setSelectedStudent(data.profile);
                                                            } else {
                                                                alert("Nie znaleziono profilu tego studenta.");
                                                            }
                                                        } catch (err) {
                                                            console.error("Error fetching student profile:", err);
                                                            alert("Błąd podczas pobierania profilu.");
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-black transition-all cursor-pointer"
                                                >
                                                    Zobacz profil
                                                </button>
                                            </div>

                                            <div className="flex-1 p-10 space-y-6 overflow-y-auto">
                                                {messages.map(msg => (
                                                    <div 
                                                        key={msg.id} 
                                                        className={`p-6 rounded-[30px] shadow-sm max-w-[80%] border ${msg.sender === 'student' ? 'bg-white text-slate-700 rounded-tl-none border-slate-100' : 'bg-emerald-400 text-white rounded-tr-none border-transparent ml-auto'}`}
                                                    >
                                                        <p className={msg.sender === 'tutor' ? 'font-bold' : ''}>{msg.text}</p>
                                                        <span className={`block text-[10px] mt-2 text-right ${msg.sender === 'student' ? 'text-slate-400' : 'text-emerald-100'}`}>{msg.time}</span>
                                                    </div>
                                                ))}
                                                {isTyping && (
                                                    <div className="bg-white p-4 rounded-[20px] rounded-tl-none border border-slate-100 w-fit flex items-center gap-1.5 shadow-sm">
                                                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-8 bg-white border-t border-slate-50">
                                                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={chatInput}
                                                        onChange={(e) => setChatInput(e.target.value)}
                                                        placeholder="Napisz do studenta..." 
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
                                                Tutaj pojawią się wiadomości od studentów.
                                            </p>
                                        </div>
                                    )}
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

                        {activeTab === 'profil' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                className="max-w-2xl mx-auto bg-white p-12 rounded-[50px] shadow-sm border border-slate-100"
                            >
                                <form onSubmit={handleSaveTutorProfile} className="space-y-6">
                                    <div className="flex justify-center mb-8">
                                        <div className="relative">
                                            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-black text-2xl overflow-hidden shadow-inner">
                                                {user?.imageUrl ? (
                                                    <img src={user.imageUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    tutorName?.[0]?.toUpperCase() || 'T'
                                                )}
                                            </div>
                                            <span className="absolute bottom-0 right-0 bg-emerald-400 text-white p-1.5 rounded-full text-xs font-black shadow">Tutor</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Imię i nazwisko</label>
                                            <input
                                                type="text"
                                                value={tutorName}
                                                onChange={(e) => setTutorName(e.target.value)}
                                                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Stawka za minutę (PLN)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tutorPrice}
                                                onChange={(e) => setTutorPrice(e.target.value)}
                                                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm font-mono font-bold text-emerald-600"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Uczelnia</label>
                                            <input
                                                type="text"
                                                value={tutorUniversity}
                                                onChange={(e) => setTutorUniversity(e.target.value)}
                                                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Przedmiot główny</label>
                                            <input
                                                type="text"
                                                value={tutorSubject}
                                                onChange={(e) => setTutorSubject(e.target.value)}
                                                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Opis o sobie (biografia)</label>
                                        <textarea
                                            value={tutorBio}
                                            onChange={(e) => setTutorBio(e.target.value)}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm h-32 leading-relaxed resize-none"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="w-full bg-emerald-400 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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

            {/* Student Profile Modal */}
            <AnimatePresence>
                {selectedStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/30">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[50px] p-12 shadow-2xl relative border border-slate-100"
                        >
                            <button onClick={() => setSelectedStudent(null)} className="absolute top-8 right-8 p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                            <div className="text-center">
                                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-3xl overflow-hidden shadow-inner mx-auto mb-6">
                                    {selectedStudent.imageUrl ? (
                                        <img src={selectedStudent.imageUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedStudent.name?.[0]?.toUpperCase() || 'S'
                                    )}
                                </div>
                                <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4 inline-block">
                                    Student
                                </span>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">{selectedStudent.name}</h3>
                                <p className="text-slate-400 text-sm mb-6">Uczestnik zajęć na EduMinuta</p>

                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Status portfela:</span>
                                        <span className="font-mono font-bold text-emerald-600">{(selectedStudent.walletBalance || 0).toFixed(2)} PLN</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Rola systemowa:</span>
                                        <span className="font-bold text-slate-700">Uczeń</span>
                                    </div>
                                </div>
                                
                                <button 
                                    type="button"
                                    onClick={() => setSelectedStudent(null)}
                                    className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black text-sm mt-8 hover:bg-slate-800 transition-all cursor-pointer"
                                >
                                    Zamknij profil
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
