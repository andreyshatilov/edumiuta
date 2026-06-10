import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, GraduationCap, Video, RefreshCw, Wallet, Calendar, Play, Download, Send, MessageSquare, User, Bell } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

// Audio helpers using Web Audio API
const playChimeSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        
        // Soft chime Note 1 (E5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Note 2 (A5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.12);
        gain2.gain.setValueAtTime(0.10, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.8);
    } catch (e) {
        console.error("Audio failed:", e);
    }
};

const playBubbleSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.12); // slide up
        gain.gain.setValueAtTime(0.10, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    } catch (e) {
        console.error("Audio failed:", e);
    }
};

// Pure Framer Motion Confetti explosion
const Confetti = ({ active }) => {
    if (!active) return null;
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#ec4899', '#8b5cf6'];
    const particles = Array.from({ length: 50 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 40 + Math.random() * 90;
        const x = Math.cos(angle) * velocity;
        const y = Math.sin(angle) * velocity - 60; // bias upward
        const size = 6 + Math.random() * 8;
        const rotation = Math.random() * 360;
        const delay = Math.random() * 0.15;
        const duration = 0.8 + Math.random() * 1.2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return {
            id: i,
            x,
            y,
            size,
            rotation,
            delay,
            duration,
            color
        };
    });

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-50">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
                    animate={{ 
                        x: p.x, 
                        y: p.y + 120, // gravity fall
                        opacity: 0,
                        scale: [0, 1, 0.7, 0],
                        rotate: p.rotation + 360
                    }}
                    transition={{
                        delay: p.delay,
                        duration: p.duration,
                        ease: "easeOut"
                    }}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '3px'
                    }}
                />
            ))}
        </div>
    );
};

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

    // Consultation request states
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestSubject, setRequestSubject] = useState('');
    const [requestDuration, setRequestDuration] = useState('30 min');
    const [requestTask, setRequestTask] = useState('');
    const [activeSessionRequest, setActiveSessionRequest] = useState(null);

    // Booking states
    const [isBookingMode, setIsBookingMode] = useState(false);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTimeSlot, setBookingTimeSlot] = useState('');
    const [bookings, setBookings] = useState([]);
    const [isBookingsLoading, setIsBookingsLoading] = useState(false);
    const [tutorBookings, setTutorBookings] = useState([]);
    const [isTutorBookingsLoading, setIsTutorBookingsLoading] = useState(false);

    // Chat WS and typing states
    const chatWsRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const [peerIsTyping, setPeerIsTyping] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState(false);

    // Notifications state & WS
    const notificationsWsRef = useRef(null);
    const [notifications, setNotifications] = useState([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [toasts, setToasts] = useState([]);

    // Additional features states
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [transactions, setTransactions] = useState([]);
    const [tutorReviews, setTutorReviews] = useState([]);
    const [submittedReviews, setSubmittedReviews] = useState({});
    
    // Review Modal States
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSessionId, setReviewSessionId] = useState('');
    const [reviewTutorClerkId, setReviewTutorClerkId] = useState('');

    const getNextDays = () => {
        const days = [];
        const weekdays = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        for (let i = 1; i <= 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dayName = weekdays[d.getDay()];
            const dateString = d.toISOString().split('T')[0];
            const label = `${dayName} (${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')})`;
            days.push({ value: dateString, label });
        }
        return days;
    };

    const TIME_SLOTS = [
        '09:00 - 10:00',
        '10:00 - 11:00',
        '11:00 - 12:00',
        '13:00 - 14:00',
        '14:00 - 15:00',
        '15:00 - 16:00',
        '16:00 - 17:00',
        '17:00 - 18:00',
        '18:00 - 19:00'
    ];

    const printReceipt = (session) => {
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="pl">
          <head>
            <meta charset="UTF-8">
            <title>Rachunek za lekcję - StudyBuddy</title>
            <style>
              body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 40px;
                color: #334155;
                background-color: #ffffff;
              }
              .invoice-box {
                max-width: 800px;
                margin: auto;
                padding: 30px;
                border: 1px solid #f1f5f9;
                border-radius: 24px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #f1f5f9;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 28px;
                font-weight: 900;
                color: #10b981;
                letter-spacing: -0.05em;
              }
              .title {
                font-size: 24px;
                font-weight: 800;
                text-align: right;
                color: #1e293b;
              }
              .details-grid {
                display: grid;
                grid-template-cols: 1fr 1fr;
                gap: 20px;
                margin-bottom: 40px;
              }
              .details-card {
                background-color: #f8fafc;
                padding: 20px;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
              }
              .details-card h3 {
                margin-top: 0;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #94a3b8;
                margin-bottom: 10px;
              }
              .details-card p {
                margin: 5px 0;
                font-size: 14px;
                font-weight: 700;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
              }
              th {
                background-color: #f8fafc;
                text-align: left;
                padding: 12px;
                font-size: 12px;
                text-transform: uppercase;
                color: #64748b;
                border-bottom: 2px solid #e2e8f0;
              }
              td {
                padding: 15px 12px;
                font-size: 14px;
                border-bottom: 1px solid #f1f5f9;
              }
              .total-section {
                text-align: right;
                font-size: 18px;
                font-weight: 800;
                color: #1e293b;
              }
              .total-amount {
                font-size: 28px;
                color: #3b82f6;
                font-weight: 900;
                margin-top: 5px;
              }
              .footer {
                margin-top: 50px;
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
                border-top: 1px solid #f1f5f9;
                padding-top: 20px;
              }
              @media print {
                body { padding: 0; }
                .invoice-box { box-shadow: none; border: none; }
              }
            </style>
          </head>
          <body>
            <div class="invoice-box">
              <div class="header">
                <div class="logo">StudyBuddy</div>
                <div class="title">Rachunek za lekcję</div>
              </div>
              
              <div class="details-grid">
                <div class="details-card">
                  <h3>Sprzedawca (Tutor)</h3>
                  <p>ID Korepetytora: ${session.tutorClerkId}</p>
                  <p>Przedmiot: ${session.subject}</p>
                  <p>Stawka: ${(session.tutorRate || 1.50).toFixed(2)} PLN / minuta</p>
                </div>
                <div class="details-card">
                  <h3>Nabywca (Student)</h3>
                  <p>Imię studenta: ${session.studentName || 'Uczeń'}</p>
                  <p>ID Studenta: ${session.studentClerkId}</p>
                  <p>Data: ${new Date(session.startTime).toLocaleDateString('pl-PL')}</p>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Opis usługi</th>
                    <th>Czas trwania</th>
                    <th>Stawka min.</th>
                    <th>Suma</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Indywidualna konsultacja online na platformie StudyBuddy</td>
                    <td>${Math.floor((session.durationSeconds || 0) / 60)} min ${session.durationSeconds % 60} sek</td>
                    <td>${(session.tutorRate || 1.50).toFixed(2)} PLN</td>
                    <td>${(session.cost || 0).toFixed(2)} PLN</td>
                  </tr>
                </tbody>
              </table>
              
              <div class="total-section">
                Suma do zapłaty (opłacono z portfela)
                <div class="total-amount">${(session.cost || 0).toFixed(2)} PLN</div>
              </div>
              
              <div class="footer">
                Dziękujemy za korzystanie ze StudyBuddy! Dokładamy wszelkich starań, aby Twoja nauka była jak najbardziej efektywna.<br>
                StudyBuddy Inc. • Generowane automatycznie • Status: OPŁACONE
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
          </html>
        `;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    // Student profile edit states
    const [studentName, setStudentName] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // YouTube/Vimeo embed URL helper
    const getEmbedUrl = (url) => {
        if (!url) return null;
        if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/video/')) {
            return url;
        }
        if (url.includes('youtube.com/watch?v=')) {
            const videoId = url.split('v=')[1]?.split('&')[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1]?.split('?')[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return url;
    };

    // Check if there is already an active or requested session on load
    const checkActiveSession = async () => {
        if (!user) return;
        try {
            const activeSession = await api.fetchActiveSession(user.id);
            if (activeSession) {
                if (activeSession.status === 'active') {
                    navigate(`/call/${activeSession.id}`, { state: { session: activeSession } });
                } else if (activeSession.status === 'requested') {
                    const tutorsList = await api.fetchTutors();
                    const tutor = tutorsList?.find(t => t.clerkId === activeSession.tutorClerkId);
                    setActiveSessionRequest({
                        ...activeSession,
                        tutorName: tutor ? tutor.name : 'Korepetytor'
                    });
                }
            }
        } catch (err) {
            console.error("Error checking active session:", err);
        }
    };

    useEffect(() => {
        if (user) {
            checkActiveSession();
        }
    }, [user]);

    // Poll for session request changes
    useEffect(() => {
        if (!activeSessionRequest || !user) return;

        let isMounted = true;
        const interval = setInterval(async () => {
            try {
                const sessionDetails = await api.fetchSession(activeSessionRequest.id);
                if (!isMounted) return;
                
                if (sessionDetails.status === 'active') {
                    clearInterval(interval);
                    navigate(`/call/${sessionDetails.id}`, { state: { session: sessionDetails } });
                } else if (sessionDetails.status === 'declined') {
                    clearInterval(interval);
                    alert("Korepetytor odrzucił Twoje zapytanie o konsultację.");
                    setActiveSessionRequest(null);
                } else if (sessionDetails.status === 'canceled') {
                    clearInterval(interval);
                    setActiveSessionRequest(null);
                }
            } catch (err) {
                console.error("Error polling session status:", err);
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [activeSessionRequest, user, navigate]);

    // Request consultation modal opening handler
    const handleOpenRequestModal = async (booking = false) => {
        if (!selectedTutor) return;
        setIsBookingMode(booking);
        
        const minRequiredBalance = selectedTutor.pricePerMinute * 5;
        if (walletBalance < minRequiredBalance) {
            alert(`Niewystarczające środki w portfelu! Doładuj konto. Minimalna kwota na rozpoczęcie lekcji (5 min) to ${minRequiredBalance.toFixed(2)} PLN.`);
            setSelectedTutor(null);
            setActiveTab('portfel');
            return;
        }
        
        setRequestSubject(selectedTutor.subject || '');
        setRequestDuration('30 min');
        setRequestTask('');
        setBookingDate('');
        setBookingTimeSlot('');

        if (booking) {
            setIsTutorBookingsLoading(true);
            try {
                const res = await api.fetchBookings(selectedTutor.clerkId);
                setTutorBookings(res || []);
            } catch (err) {
                console.error("Error fetching tutor bookings:", err);
                setTutorBookings([]);
            } finally {
                setIsTutorBookingsLoading(false);
            }
        }
        
        setShowRequestModal(true);
    };

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

                // Fetch notifications
                const userNotifications = await api.fetchNotifications(user.id);
                if (userNotifications && Array.isArray(userNotifications)) {
                    setNotifications(userNotifications);
                }

                // Fetch transactions history
                const userTransactions = await api.fetchTransactions(user.id);
                if (userTransactions && Array.isArray(userTransactions)) {
                    setTransactions(userTransactions);
                }

                // Fetch submitted reviews
                const studentReviews = await api.fetchStudentReviews(user.id);
                if (studentReviews && Array.isArray(studentReviews)) {
                    const mapped = {};
                    studentReviews.forEach(r => {
                        mapped[r.sessionId] = r;
                    });
                    setSubmittedReviews(mapped);
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

    // Helper to synthesize a high-fidelity E5-G5 chime tone using Web Audio API
    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const playNote = (frequency, startTime, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.setValueAtTime(frequency, startTime);
                osc.type = 'sine';
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            
            const now = ctx.currentTime;
            playNote(659.25, now, 0.4);       // E5
            playNote(783.99, now + 0.15, 0.45); // G5
        } catch (err) {
            console.warn('Audio playback failed or blocked:', err);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await api.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error("Error marking notification read:", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.markAllNotificationsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error("Error marking all notifications read:", err);
        }
    };

    // WebSocket listener for real-time notifications
    useEffect(() => {
        if (!user) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
        const wsUrl = `${protocol}//${host}/api/sync?roomId=notifications_${user.id}`;

        const ws = new WebSocket(wsUrl);
        notificationsWsRef.current = ws;

        ws.onopen = () => {
            console.log("Notifications WS connected to room:", `notifications_${user.id}`);
        };

        ws.onmessage = (event) => {
            try {
                const eventData = JSON.parse(event.data);
                if (eventData.type === 'notification' && eventData.data) {
                    const newNotification = eventData.data;
                    
                    setNotifications(prev => {
                        if (prev.some(n => n.id === newNotification.id)) return prev;
                        return [newNotification, ...prev];
                    });

                    // Trigger visual toast
                    const toastId = Date.now() + Math.random();
                    setToasts(prev => [...prev, { ...newNotification, id: toastId }]);

                    // Play E5-G5 chime
                    playNotificationSound();

                    // Auto-dismiss toast
                    setTimeout(() => {
                        setToasts(prev => prev.filter(t => t.id !== toastId));
                    }, 6000);
                }
            } catch (err) {
                console.error("Error parsing notification WS message:", err);
            }
        };

        ws.onclose = () => {
            console.log("Notifications WS disconnected");
        };

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [user]);

    useEffect(() => {
        if (!selectedTutor) {
            setTutorReviews([]);
            return;
        }
        
        const loadTutorReviews = async () => {
            try {
                const reviews = await api.fetchTutorReviews(selectedTutor.clerkId);
                if (reviews && Array.isArray(reviews)) {
                    setTutorReviews(reviews);
                }
            } catch (err) {
                console.error("Error loading tutor reviews:", err);
            }
        };
        
        loadTutorReviews();
    }, [selectedTutor]);

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

        // Stop typing
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        if (chatWsRef.current && chatWsRef.current.readyState === 1) {
            chatWsRef.current.send(JSON.stringify({
                type: 'typing',
                senderId: user.id,
                isTyping: false
            }));
        }

        try {
            const response = await api.sendChatMessage(user.id, activePeerId, textToSend, 'student');
            const newMsg = {
                id: response.id || Date.now(),
                text: textToSend,
                sender: 'student',
                time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, newMsg]);

            if (chatWsRef.current && chatWsRef.current.readyState === 1) {
                chatWsRef.current.send(JSON.stringify({
                    type: 'message',
                    message: newMsg
                }));
            }
        } catch (err) {
            console.error("Error sending chat message:", err);
        }
    };

    const handleChatInputChange = (e) => {
        setChatInput(e.target.value);
        if (chatWsRef.current && chatWsRef.current.readyState === 1) {
            chatWsRef.current.send(JSON.stringify({
                type: 'typing',
                senderId: user.id,
                isTyping: true
            }));

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                if (chatWsRef.current && chatWsRef.current.readyState === 1) {
                    chatWsRef.current.send(JSON.stringify({
                        type: 'typing',
                        senderId: user.id,
                        isTyping: false
                    }));
                }
            }, 2000);
        }
    };

    const handleAttachFile = async (e) => {
        const file = e.target.files[0];
        if (!file || !user || !activePeerId) return;
        setIsUploadingFile(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const fileData = await api.uploadChatFile(formData);
            const textToSend = fileData.url;
            const response = await api.sendChatMessage(user.id, activePeerId, textToSend, 'student');
            
            const newMsg = {
                id: response.id || Date.now(),
                text: textToSend,
                sender: 'student',
                time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, newMsg]);

            if (chatWsRef.current && chatWsRef.current.readyState === 1) {
                chatWsRef.current.send(JSON.stringify({
                    type: 'message',
                    message: newMsg
                }));
            }
        } catch (err) {
            console.error("Error uploading file:", err);
            alert("Nie udało się przesłać pliku.");
        } finally {
            setIsUploadingFile(false);
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

    // Booking loaders & actions
    const loadBookings = async () => {
        if (!user) return;
        setIsBookingsLoading(true);
        try {
            const res = await api.fetchBookings(user.id);
            setBookings(res);
        } catch (err) {
            console.error("Error loading bookings:", err);
        } finally {
            setIsBookingsLoading(false);
        }
    };

    useEffect(() => {
        if (!user || activeTab !== 'kalendarz') return;
        loadBookings();
        const interval = setInterval(loadBookings, 5000);
        return () => clearInterval(interval);
    }, [user, activeTab]);

    const handleStartScheduledSession = async (sessionId) => {
        try {
            const session = await api.startScheduledSession(sessionId);
            navigate(`/call/${session.id}`, { state: { session } });
        } catch (error) {
            console.error("Error starting scheduled session:", error);
            alert("Nie udało się rozpocząć lekcji.");
        }
    };

    // Chat WebSocket lifecycle & initial loader
    useEffect(() => {
        if (!user || activeTab !== 'czat') {
            if (chatWsRef.current) {
                chatWsRef.current.close();
                chatWsRef.current = null;
            }
            return;
        }

        const loadInitialChat = async () => {
            try {
                const convs = await api.fetchConversations(user.id);
                if (convs && Array.isArray(convs)) {
                    setConversations(convs);
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
                console.error("Error loading initial chat:", err);
            }
        };

        loadInitialChat();

        if (!activePeerId) return;

        const sortedIds = [user.id, activePeerId].sort().join('_');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
        const wsUrl = `${protocol}//${host}/api/sync?roomId=chat_${sortedIds}`;

        const ws = new WebSocket(wsUrl);
        chatWsRef.current = ws;

        ws.onopen = () => {
            console.log("Chat WS connected room:", sortedIds);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'message') {
                    setMessages(prev => {
                        if (prev.some(m => m.id === data.message.id)) return prev;
                        if (data.message.senderId !== user.id) {
                            playBubbleSound();
                        }
                        return [...prev, data.message];
                    });
                } else if (data.type === 'typing') {
                    if (data.senderId === activePeerId) {
                        setPeerIsTyping(data.isTyping);
                    }
                }
            } catch (err) {
                console.error("Error parsing chat WS message:", err);
            }
        };

        ws.onclose = () => {
            console.log("Chat WS disconnected");
        };

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [user, activeTab, activePeerId]);

    // Poll for conversations update periodically
    useEffect(() => {
        if (!user || activeTab !== 'czat') return;
        const interval = setInterval(async () => {
            try {
                const convs = await api.fetchConversations(user.id);
                if (convs && Array.isArray(convs)) {
                    setConversations(convs);
                }
            } catch (e) {
                console.error("Error polling conversations:", e);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [user, activeTab]);

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
                        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            <div className="bg-white px-8 py-4 rounded-[30px] shadow-sm border border-emerald-50 text-center flex items-center gap-4 flex-1 md:flex-none justify-between">
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

                            {/* Bell notification button */}
                            <button
                                onClick={() => setIsNotificationsOpen(true)}
                                className="relative bg-white p-4 rounded-[24px] shadow-sm border border-emerald-50 text-slate-400 hover:text-emerald-500 hover:scale-105 hover:bg-slate-50 cursor-pointer transition-all duration-300 flex items-center justify-center"
                                title="Powiadomienia"
                            >
                                <Bell size={20} />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                        {notifications.filter(n => !n.read).length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </header>

                    {bookings.filter(b => b.status === 'scheduled').length > 0 && (
                        <div className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white p-8 rounded-[40px] shadow-lg mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fadeIn">
                            <div>
                                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Nadchodząca Lekcja 📅</span>
                                <h3 className="text-2xl font-black mt-3">Zaplanowana lekcja z korepetytorem</h3>
                                <p className="text-emerald-50 text-sm mt-1 font-bold">
                                    Termin: {bookings.filter(b => b.status === 'scheduled')[0].bookingDate} o godzinie {bookings.filter(b => b.status === 'scheduled')[0].bookingTimeSlot} ({bookings.filter(b => b.status === 'scheduled')[0].approximateTime})
                                </p>
                            </div>
                            <button
                                onClick={() => handleStartScheduledSession(bookings.filter(b => b.status === 'scheduled')[0].id)}
                                className="bg-white text-emerald-600 px-8 py-4 rounded-3xl font-black hover:bg-emerald-50 transition-all shadow-md cursor-pointer text-sm hover:scale-102"
                            >
                                Połącz teraz 🚀
                            </button>
                        </div>
                    )}

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
                                                {isSeeding ? <RefreshCw className="animate-spin" size={18} /> : "Zasil bazę demo (5 korepetytorów)"}
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
                            <motion.div 
                                initial={{ opacity: 0, y: 15 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25 }}
                                className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 w-full"
                            >
                                {/* Left Column: BLIK Top up */}
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 h-fit">
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

                                {/* Right Column: Transaction Logs */}
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col">
                                    <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                        <Clock className="text-emerald-500" /> Historia transakcji
                                    </h2>
                                    
                                    {transactions.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 my-auto">
                                            <Wallet size={32} className="text-slate-200 mx-auto mb-3" />
                                            <p className="font-bold text-xs">Brak zarejestrowanych transakcji</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                                            {transactions.map(t => {
                                                const isDeposit = t.type === 'deposit';
                                                const isPayment = t.type === 'payment';
                                                
                                                let typeLabel = '';
                                                let amountColor = '';
                                                let prefix = '';
                                                if (isDeposit) {
                                                    typeLabel = 'Doładowanie portfela';
                                                    amountColor = 'text-emerald-500 font-bold';
                                                    prefix = '+';
                                                } else if (isPayment) {
                                                    typeLabel = 'Opłata za lekcję';
                                                    amountColor = 'text-rose-500 font-bold';
                                                    prefix = '-';
                                                } else {
                                                    typeLabel = t.type;
                                                    amountColor = 'text-slate-700';
                                                }

                                                return (
                                                    <div key={t.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex justify-between items-center text-xs">
                                                        <div>
                                                            <p className="font-bold text-slate-700">{typeLabel}</p>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">
                                                                {new Date(t.timestamp).toLocaleString('pl-PL')}
                                                            </span>
                                                        </div>
                                                        <span className={`font-mono text-sm ${amountColor}`}>
                                                            {prefix}{t.amount.toFixed(2)} PLN
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}

                        {activeTab === 'historia' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto">
                                <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Clock className="text-emerald-500" /> Historia lekcji
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
                                                    <button 
                                                        onClick={() => printReceipt(session)}
                                                        className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
                                                    >
                                                        Rachunek PDF 📄
                                                    </button>
                                                    
                                                    {submittedReviews[session.id] ? (
                                                        <span className="p-3 bg-slate-50 text-slate-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 select-none border border-slate-100">
                                                            Oceniono ⭐ {submittedReviews[session.id].rating}
                                                        </span>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setReviewSessionId(session.id);
                                                                setReviewTutorClerkId(session.tutorClerkId);
                                                                setReviewRating(5);
                                                                setReviewComment('');
                                                                setShowReviewModal(true);
                                                            }}
                                                            className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
                                                        >
                                                            Oceń ⭐
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'kalendarz' && (() => {
                            const POLISH_MONTHS = [
                                "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", 
                                "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
                            ];
                            const year = currentMonth.getFullYear();
                            const month = currentMonth.getMonth();
                            const firstDayIndex = new Date(year, month, 1).getDay();
                            const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
                            const totalDays = new Date(year, month + 1, 0).getDate();
                            
                            const getDayDateString = (dayNum) => {
                                return `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            };

                            const handlePrevMonth = () => {
                                setCurrentMonth(new Date(year, month - 1, 1));
                            };
                            const handleNextMonth = () => {
                                setCurrentMonth(new Date(year, month + 1, 1));
                            };

                            // Bookings for selected date
                            const selectedDayBookings = bookings.filter(b => b.bookingDate === selectedDateStr);

                            return (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-4xl mx-auto">
                                    {/* Monthly Calendar Card */}
                                    <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100">
                                        <div className="flex justify-between items-center mb-8">
                                            <div>
                                                <h3 className="font-black text-2xl text-slate-800 tracking-tight flex items-center gap-2">
                                                    <Calendar className="text-emerald-500" /> Twój Kalendarz Lekcji
                                                </h3>
                                                <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Planuj i dołączaj do zaplanowanych zajęć</p>
                                            </div>
                                            
                                            {/* Navigation controls */}
                                            <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-full border border-slate-100">
                                                <button
                                                    onClick={handlePrevMonth}
                                                    className="p-2.5 rounded-full hover:bg-white text-slate-500 hover:text-emerald-500 transition-all cursor-pointer animate-none"
                                                >
                                                    &larr;
                                                </button>
                                                <span className="font-black text-slate-800 text-sm px-4 min-w-36 text-center select-none">
                                                    {POLISH_MONTHS[month]} {year}
                                                </span>
                                                <button
                                                    onClick={handleNextMonth}
                                                    className="p-2.5 rounded-full hover:bg-white text-slate-500 hover:text-emerald-500 transition-all cursor-pointer animate-none"
                                                >
                                                    &rarr;
                                                </button>
                                            </div>
                                        </div>

                                        {/* Weekday headers */}
                                        <div className="grid grid-cols-7 gap-3 text-center text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">
                                            <span>Pn</span><span>Wt</span><span>Śr</span><span>Cz</span><span>Pi</span><span>So</span><span>Ni</span>
                                        </div>

                                        {/* Days Grid */}
                                        <div className="grid grid-cols-7 gap-3">
                                            {Array.from({ length: startOffset }).map((_, i) => (
                                                <div key={`empty-${i}`} className="aspect-square bg-slate-50/20 rounded-2xl border border-transparent"></div>
                                            ))}
                                            {Array.from({ length: totalDays }).map((_, i) => {
                                                const day = i + 1;
                                                const dateStr = getDayDateString(day);
                                                const isSelected = selectedDateStr === dateStr;
                                                
                                                const dayBookings = bookings.filter(b => b.bookingDate === dateStr);
                                                const hasScheduled = dayBookings.some(b => b.status === 'scheduled');
                                                const hasPending = dayBookings.some(b => b.status === 'pending_booking');

                                                let statusStyle = 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-100/50';
                                                if (isSelected) {
                                                    statusStyle = 'bg-emerald-400 text-white border-transparent shadow-lg shadow-emerald-100 scale-105 font-bold';
                                                } else if (hasScheduled) {
                                                    statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold';
                                                } else if (hasPending) {
                                                    statusStyle = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold';
                                                }

                                                return (
                                                    <button
                                                        type="button"
                                                        key={`day-${day}`}
                                                        onClick={() => setSelectedDateStr(dateStr)}
                                                        className={`aspect-square rounded-3xl border text-sm transition-all cursor-pointer flex flex-col items-center justify-center relative ${statusStyle}`}
                                                    >
                                                        <span className="text-sm font-black">{day}</span>
                                                        
                                                        {/* Status Dots */}
                                                        <div className="flex gap-1 mt-1 justify-center items-center">
                                                            {hasScheduled && !isSelected && (
                                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                            )}
                                                            {hasPending && !isSelected && (
                                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Daily Bookings List */}
                                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                                        <div className="mb-6">
                                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block">
                                                Lekcje w wybranym dniu
                                            </span>
                                            <h4 className="font-black text-xl text-slate-800 mt-2">
                                                {new Date(selectedDateStr).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </h4>
                                        </div>

                                        {isBookingsLoading ? (
                                            <div className="flex justify-center py-10">
                                                <RefreshCw className="animate-spin text-emerald-400" size={24} />
                                            </div>
                                        ) : selectedDayBookings.length === 0 ? (
                                            <div className="text-center py-12 text-slate-400">
                                                <Calendar className="text-slate-200 mx-auto mb-3" size={32} />
                                                <p className="font-bold text-xs">Brak zaplanowanych rezerwacji na ten dzień</p>
                                                <p className="text-[10px] mt-1">Przejdź do zakładki "Szukaj", aby znaleźć wolnego korepetytora.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedDayBookings.map(booking => {
                                                    const isScheduled = booking.status === 'scheduled';
                                                    const isPending = booking.status === 'pending_booking';
                                                    const isDeclined = booking.status === 'declined';
                                                    const isCanceled = booking.status === 'canceled';
                                                    
                                                    let statusLabel = '';
                                                    let statusStyle = '';
                                                    if (isScheduled) {
                                                        statusLabel = 'Zaakceptowana';
                                                        statusStyle = 'bg-emerald-100 text-emerald-600';
                                                    } else if (isPending) {
                                                        statusLabel = 'Oczekuje na akceptację';
                                                        statusStyle = 'bg-amber-100 text-amber-600';
                                                    } else if (isDeclined) {
                                                        statusLabel = 'Odrzucona przez korepetytora';
                                                        statusStyle = 'bg-rose-100 text-rose-600';
                                                    } else if (isCanceled) {
                                                        statusLabel = 'Anulowana';
                                                        statusStyle = 'bg-slate-100 text-slate-500';
                                                    } else {
                                                        statusLabel = booking.status;
                                                        statusStyle = 'bg-slate-100 text-slate-700';
                                                    }
                                                    
                                                    return (
                                                        <div key={booking.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-50/50">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${statusStyle}`}>
                                                                        {statusLabel}
                                                                    </span>
                                                                    <span className="text-slate-400 font-bold text-[9px] uppercase">
                                                                        Lekcja #{booking.id ? booking.id.slice(-6) : ''}
                                                                    </span>
                                                                </div>
                                                                <h5 className="font-black text-slate-800 text-sm">Przedmiot: {booking.subject}</h5>
                                                                <p className="text-[11px] text-slate-500 mt-1 font-bold">
                                                                    📅 Data: {booking.bookingDate} | ⏰ Godzina: {booking.bookingTimeSlot} ({booking.approximateTime})
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                                {isScheduled && (
                                                                    <button
                                                                        onClick={() => handleStartScheduledSession(booking.id)}
                                                                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black transition-all shadow-md shadow-emerald-100 flex items-center gap-1 cursor-pointer animate-none"
                                                                    >
                                                                        Połącz teraz 🚀
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })()}

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
                                                        {peerIsTyping ? (
                                                            <span className="text-[10px] text-emerald-500 font-black animate-pulse">Pisze...</span>
                                                        ) : (
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Korepetytor</p>
                                                        )}
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
                                                {messages.map(msg => {
                                                    const isUploadedFile = msg.text?.startsWith('/uploads/');
                                                    const isImage = isUploadedFile && msg.text.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
                                                    const baseUploadUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:3001';
                                                    const fullFileUrl = isUploadedFile ? `${baseUploadUrl}${msg.text}` : '';

                                                    return (
                                                        <div 
                                                            key={msg.id} 
                                                            className={`p-6 rounded-[30px] shadow-sm max-w-[80%] border ${msg.sender === 'tutor' ? 'bg-white text-slate-700 rounded-tl-none border-slate-100' : 'bg-emerald-400 text-white rounded-tr-none border-transparent ml-auto'}`}
                                                        >
                                                            {isUploadedFile ? (
                                                                <div>
                                                                    {isImage ? (
                                                                        <img 
                                                                            src={fullFileUrl} 
                                                                            alt="Załącznik graficzny" 
                                                                            className="max-w-full rounded-2xl max-h-60 object-cover border border-slate-100"
                                                                        />
                                                                    ) : (
                                                                        <div className={`flex items-center gap-3 p-4 rounded-2xl text-xs ${msg.sender === 'student' ? 'bg-emerald-500/20 text-white border border-emerald-300/30' : 'bg-slate-50 text-slate-700 border border-slate-150'}`}>
                                                                            <div className="truncate flex-1">
                                                                                <p className="font-bold truncate">{msg.text.split('/').pop()}</p>
                                                                                <p className="text-[9px] uppercase font-black opacity-60">Załącznik</p>
                                                                            </div>
                                                                            <a 
                                                                                href={fullFileUrl} 
                                                                                download 
                                                                                target="_blank" 
                                                                                rel="noreferrer"
                                                                                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${msg.sender === 'student' ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'}`}
                                                                            >
                                                                                Pobierz
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className={msg.sender === 'student' ? 'font-bold' : ''}>{msg.text}</p>
                                                            )}
                                                            <span className={`block text-[10px] mt-2 text-right ${msg.sender === 'tutor' ? 'text-slate-400' : 'text-emerald-100'}`}>{msg.time}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Chat Input */}
                                            <div className="p-8 bg-white border-t border-slate-50">
                                                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-3">
                                                    <label className="flex items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-emerald-500 rounded-full cursor-pointer transition-all flex-shrink-0 border border-slate-100">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 0 1 0 12.728l-6.364 6.364a6 6 0 1 1-8.485-8.485l7.071-7.071a4 4 0 0 1 5.657 5.657l-7.071 7.07a2 2 0 0 1-2.828-2.828l6.364-6.364" />
                                                        </svg>
                                                        <input 
                                                            type="file" 
                                                            onChange={handleAttachFile} 
                                                            className="hidden" 
                                                            disabled={isUploadingFile}
                                                        />
                                                    </label>
                                                    <div className="relative flex-1">
                                                        <input 
                                                            type="text" 
                                                            value={chatInput}
                                                            onChange={handleChatInputChange}
                                                            placeholder={isUploadingFile ? "Przesyłanie pliku..." : "Napisz wiadomość..."} 
                                                            disabled={isUploadingFile}
                                                            className="w-full p-6 bg-slate-50 rounded-full border-none focus:ring-2 focus:ring-emerald-400 outline-none pr-20 text-slate-800" 
                                                        />
                                                        <button 
                                                            type="submit"
                                                            disabled={isUploadingFile}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-400 text-white p-4 rounded-full shadow-lg shadow-emerald-100 cursor-pointer disabled:opacity-50"
                                                        >
                                                            <Send size={20} />
                                                        </button>
                                                    </div>
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
                {selectedTutor && !showRequestModal && (
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
                                    
                                    <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 mb-6">
                                        <h4 className="font-black text-slate-700 mb-2">Specjalizacja: {selectedTutor.subject}</h4>
                                        <p className="text-slate-500 leading-relaxed italic text-sm">"{selectedTutor.bio}"</p>
                                    </div>

                                    {/* LinkedIn, Doświadczenie i Certyfikaty */}
                                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                                        {selectedTutor.experience && (
                                            <div className="bg-slate-50 p-6 rounded-[30px] border border-slate-100 text-left">
                                                <h5 className="font-black text-slate-700 mb-2 text-xs uppercase tracking-wider">Doświadczenie</h5>
                                                <p className="text-slate-500 text-sm leading-relaxed">{selectedTutor.experience}</p>
                                            </div>
                                        )}
                                        {selectedTutor.certificates && (
                                            <div className="bg-slate-50 p-6 rounded-[30px] border border-slate-100 text-left">
                                                <h5 className="font-black text-slate-700 mb-2 text-xs uppercase tracking-wider">Certyfikaty</h5>
                                                <p className="text-slate-500 text-sm leading-relaxed">{selectedTutor.certificates}</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedTutor.linkedin && (
                                        <div className="mb-6 text-left">
                                            <a 
                                                href={selectedTutor.linkedin} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm hover:scale-102 transition-transform"
                                            >
                                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                                </svg>
                                                Profil LinkedIn
                                            </a>
                                        </div>
                                    )}

                                    {selectedTutor.videoGreetingUrl && (
                                        <div className="mb-8 text-left">
                                            <h4 className="font-black text-slate-700 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                                                <Play size={14} className="text-emerald-500" /> Wideo Wizytówka
                                            </h4>
                                            <div className="relative aspect-video rounded-[30px] overflow-hidden border border-slate-100 shadow-sm bg-slate-900">
                                                <iframe
                                                    src={getEmbedUrl(selectedTutor.videoGreetingUrl)}
                                                    title="Wideo powitalne"
                                                    className="absolute inset-0 w-full h-full border-none"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                        <button 
                                            onClick={() => handleOpenRequestModal(false)}
                                            className="flex-1 bg-emerald-400 text-white py-6 rounded-3xl font-black text-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 cursor-pointer hover:scale-102"
                                        >
                                            <Video size={24} /> Rozpocznij naukę
                                        </button>
                                        <button 
                                            onClick={() => handleOpenRequestModal(true)}
                                            className="flex-1 bg-slate-100 text-slate-700 py-6 rounded-3xl font-black text-xl hover:bg-slate-200 transition-all cursor-pointer hover:scale-102"
                                        >
                                            Zarezerwuj termin
                                        </button>
                                    </div>

                                    {/* System opinii */}
                                    <div className="mt-8 pt-8 border-t border-slate-100 mb-6 text-left">
                                        <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <Star className="text-emerald-500 fill-emerald-500 animate-pulse" size={18} /> Opinie uczniów ({tutorReviews.length})
                                        </h4>
                                        
                                        {tutorReviews.length === 0 ? (
                                            <p className="text-xs text-slate-400 font-bold uppercase py-2">
                                                Ten korepetytor nie ma jeszcze opinii.
                                            </p>
                                        ) : (
                                            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                                                {tutorReviews.map(r => (
                                                    <div key={r.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold text-xs text-slate-700">{r.studentName}</span>
                                                            <div className="flex text-emerald-400">
                                                                {Array.from({ length: 5 }).map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        size={12}
                                                                        className={i < r.rating ? "fill-emerald-400 text-emerald-400" : "text-slate-200"}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-slate-500 text-xs leading-relaxed">"{r.comment}"</p>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 block">
                                                            {new Date(r.timestamp).toLocaleDateString('pl-PL')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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

            {/* Consultation Request Modal */}
            <AnimatePresence>
                {showRequestModal && selectedTutor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white text-slate-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative border border-slate-100"
                        >
                            <button 
                                onClick={() => {
                                    setShowRequestModal(false);
                                }} 
                                className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                            >
                                <X size={20} />
                            </button>
 
                                    <div className="text-center mb-6">
                                 <h3 className="text-2xl font-black text-slate-800 mb-1">Zapytanie o konsultację</h3>
                                 <p className="text-slate-400 text-sm font-bold">Korepetytor: {selectedTutor.name}</p>
                             </div>
 
                             <form onSubmit={async (e) => {
                                 e.preventDefault();
                                 if (isBookingMode) {
                                     if (!bookingDate || !bookingTimeSlot) {
                                         alert("Wybierz datę i godzinę rezerwacji!");
                                         return;
                                     }
                                     setShowRequestModal(false);
                                     setIsStartingCall(true);
                                     try {
                                         const sanitizedName = (studentName || user.fullName || "Student").split(' ')[0];
                                         await api.requestBooking({
                                             studentClerkId: user.id,
                                             tutorClerkId: selectedTutor.clerkId,
                                             studentName: sanitizedName,
                                             subject: requestSubject,
                                             approximateTime: requestDuration,
                                             taskDescription: requestTask,
                                             bookingDate,
                                             bookingTimeSlot
                                         });
                                         alert(`Pomyślnie wysłano prośbę o rezerwację na dzień ${bookingDate} o godzinie ${bookingTimeSlot}!`);
                                         setActiveTab('kalendarz');
                                         setSelectedTutor(null);
                                     } catch (error) {
                                         console.error("Error creating booking request:", error);
                                         alert(error.response?.data?.error || "Nie udało się wysłać prośby o rezerwację.");
                                     } finally {
                                         setIsStartingCall(false);
                                     }
                                 } else {
                                     setShowRequestModal(false);
                                     setIsStartingCall(true);
                                     try {
                                         const sanitizedName = (studentName || user.fullName || "Student").split(' ')[0];
                                         const session = await api.startSession({
                                             studentClerkId: user.id,
                                             tutorClerkId: selectedTutor.clerkId,
                                             studentName: sanitizedName,
                                             subject: requestSubject,
                                             approximateTime: requestDuration,
                                             taskDescription: requestTask
                                         });
                                         setActiveSessionRequest({
                                             ...session,
                                             tutorName: selectedTutor.name
                                         });
                                         setSelectedTutor(null); // close profile modal
                                     } catch (error) {
                                         console.error("Error starting consultation request:", error);
                                         alert("Nie udało się wysłać zapytania o konsultację.");
                                     } finally {
                                         setIsStartingCall(false);
                                     }
                                 }
                             }} className="space-y-6">
                                 <div>
                                     <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Przedmiot / Temat</label>
                                     <input 
                                         type="text"
                                         required
                                         value={requestSubject}
                                         onChange={(e) => setRequestSubject(e.target.value)}
                                         placeholder="np. Analiza matematyczna, Teoria gier"
                                         className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm font-bold"
                                     />
                                 </div>

                                 <div>
                                     <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Szacowany czas</label>
                                     <select
                                         value={requestDuration}
                                         onChange={(e) => setRequestDuration(e.target.value)}
                                         className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-850 focus:ring-2 focus:ring-emerald-400 text-sm font-bold cursor-pointer"
                                     >
                                         <option value="15 min">15 minut (Szybkie pytanie)</option>
                                         <option value="30 min">30 minut (Standardowa lekcja)</option>
                                     </select>
                                 </div>

                                 {isBookingMode && (
                                     <div className="space-y-4">
                                         <div>
                                             <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Wybierz datę lekcji</label>
                                             {isTutorBookingsLoading ? (
                                                 <div className="p-4 bg-slate-50 text-slate-400 text-xs rounded-2xl flex items-center gap-2">
                                                     <RefreshCw className="animate-spin" size={14} /> Pobieranie wolnych terminów...
                                                 </div>
                                             ) : (() => {
                                                 let parsedSlots = {};
                                                 try {
                                                     if (selectedTutor.availableSlots) {
                                                         parsedSlots = JSON.parse(selectedTutor.availableSlots);
                                                     }
                                                 } catch (e) {
                                                     console.error("Error parsing tutor slots:", e);
                                                 }

                                                 const availableDates = Object.keys(parsedSlots).filter(date => {
                                                     const slots = parsedSlots[date] || [];
                                                     const freeSlots = slots.filter(slot => {
                                                         const isBooked = tutorBookings.some(b => 
                                                             b.bookingDate === date && 
                                                             b.bookingTimeSlot === slot && 
                                                             (b.status === 'scheduled' || b.status === 'pending_booking')
                                                         );
                                                         return !isBooked;
                                                     });
                                                     return freeSlots.length > 0;
                                                 }).sort();

                                                 if (availableDates.length === 0) {
                                                     return (
                                                         <div className="p-4 bg-amber-50 text-amber-600 text-xs rounded-2xl border border-amber-100/50">
                                                             ⚠️ Ten korepetytor nie ma obecnie żadnych wolnych terminów do rezerwacji.
                                                         </div>
                                                     );
                                                 }

                                                 return (
                                                     <select
                                                         required
                                                         value={bookingDate}
                                                         onChange={(e) => {
                                                             setBookingDate(e.target.value);
                                                             setBookingTimeSlot('');
                                                         }}
                                                         className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-850 focus:ring-2 focus:ring-emerald-400 text-sm font-bold cursor-pointer"
                                                     >
                                                         <option value="">-- Wybierz datę --</option>
                                                         {availableDates.map(date => {
                                                             const dateObj = new Date(date);
                                                             const label = dateObj.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                                             return (
                                                                 <option key={date} value={date}>
                                                                     {label}
                                                                 </option>
                                                             );
                                                         })}
                                                     </select>
                                                 );
                                             })()}
                                         </div>

                                         {bookingDate && (
                                             <div>
                                                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Wybierz godzinę lekcji</label>
                                                 {(() => {
                                                     let parsedSlots = {};
                                                     try {
                                                         if (selectedTutor.availableSlots) {
                                                             parsedSlots = JSON.parse(selectedTutor.availableSlots);
                                                         }
                                                     } catch (e) {}

                                                     const slots = parsedSlots[bookingDate] || [];
                                                     const freeSlots = slots.filter(slot => {
                                                         const isBooked = tutorBookings.some(b => 
                                                             b.bookingDate === bookingDate && 
                                                             b.bookingTimeSlot === slot && 
                                                             (b.status === 'scheduled' || b.status === 'pending_booking')
                                                         );
                                                         return !isBooked;
                                                     });

                                                     if (freeSlots.length === 0) {
                                                         return (
                                                             <div className="p-4 bg-rose-50 text-rose-600 text-xs rounded-2xl">
                                                                 Brak wolnych godzin w tym dniu. Wybierz inną datę.
                                                             </div>
                                                         );
                                                     }

                                                     return (
                                                         <select
                                                             required
                                                             value={bookingTimeSlot}
                                                             onChange={(e) => setBookingTimeSlot(e.target.value)}
                                                             className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-850 focus:ring-2 focus:ring-emerald-400 text-sm font-bold cursor-pointer"
                                                         >
                                                             <option value="">-- Wybierz godzinę --</option>
                                                             {freeSlots.map(slot => (
                                                                 <option key={slot} value={slot}>
                                                                     {slot}
                                                                 </option>
                                                             ))}
                                                         </select>
                                                     );
                                                 })()}
                                             </div>
                                         )}
                                     </div>
                                 )}

                                 <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Opis zadania / problemu (opcjonalnie)</label>
                                      <textarea
                                          value={requestTask}
                                          onChange={(e) => setRequestTask(e.target.value)}
                                          placeholder="Wpisz krótki opis problemu..."
                                          rows="3"
                                          className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-800 focus:ring-2 focus:ring-emerald-400 text-sm leading-relaxed"
                                      />
                                  </div>

                                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                                     <span className="text-slate-500 font-bold">Stawka korepetytora:</span>
                                     <span className="font-black text-emerald-500 text-sm">{selectedTutor.pricePerMinute.toFixed(2)} PLN / min</span>
                                 </div>

                                 <button
                                     type="submit"
                                     className="w-full bg-emerald-400 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black text-xl transition-all shadow-lg shadow-emerald-100 cursor-pointer flex items-center justify-center gap-2 hover:scale-102"
                                 >
                                     {isBookingMode ? <Calendar size={20} /> : <Video size={20} />}
                                     {isBookingMode ? "Zarezerwuj tę lekcję" : "Wyślij zapytanie o lekcję"}
                                 </button>
                             </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

             <AnimatePresence>
                 {activeSessionRequest && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
                         <motion.div
                             initial={{ scale: 0.9, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             exit={{ scale: 0.9, opacity: 0 }}
                             className="bg-white text-slate-900 w-full max-w-md rounded-[40px] p-10 text-center shadow-2xl relative border border-slate-100"
                         >
                             <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
                             
                             <h3 className="text-2xl font-black text-slate-800 mb-2">Oczekiwanie na korepetytora</h3>
                             <p className="text-slate-400 text-sm mb-6 font-bold">
                                 Wysyłanie prośby o połączenie do: {activeSessionRequest.tutorName}
                             </p>
 
                             <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100 mb-8 space-y-3 text-xs">
                                 <div className="flex justify-between">
                                     <span className="text-slate-500 font-bold">Przedmiot:</span>
                                     <span className="font-bold text-slate-800">{activeSessionRequest.subject}</span>
                                 </div>
                                 <div className="flex justify-between">
                                     <span className="text-slate-500 font-bold">Czas trwania:</span>
                                     <span className="font-bold text-slate-800">{activeSessionRequest.approximateTime}</span>
                                 </div>
                                 {activeSessionRequest.taskDescription && (
                                     <div className="pt-2 border-t border-slate-150">
                                         <span className="text-slate-500 font-bold block mb-1">Opis problemu:</span>
                                         <p className="text-slate-600 leading-relaxed italic">"{activeSessionRequest.taskDescription}"</p>
                                     </div>
                                 )}
                             </div>
 
                             <button
                                 onClick={async () => {
                                     try {
                                         await api.cancelSession(activeSessionRequest.id);
                                         setActiveSessionRequest(null);
                                     } catch (err) {
                                         console.error("Error canceling session request:", err);
                                         setActiveSessionRequest(null);
                                     }
                                 }}
                                 className="w-full py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black transition-all cursor-pointer text-sm"
                             >
                                 Anuluj zapytanie
                             </button>
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
                                                                playChimeSound();
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
                                <div className="py-8 relative overflow-hidden">
                                    <Confetti active={true} />
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

            {/* Notifications drawer */}
            <AnimatePresence>
                {isNotificationsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsNotificationsOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col border-l border-slate-100"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                        <Bell className="text-emerald-500" /> Powiadomienia
                                    </h2>
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mt-1">
                                            Masz {notifications.filter(n => !n.read).length} nieprzeczytanych
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsNotificationsOpen(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {notifications.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                        <Bell size={48} className="text-slate-200 mb-4 animate-bounce" />
                                        <p className="font-bold">Brak powiadomień</p>
                                        <p className="text-xs mt-1">Wszystkie powiadomienia systemowe pojawią się tutaj.</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => !notif.read && handleMarkRead(notif.id)}
                                            className={`p-4 rounded-3xl border transition-all duration-300 flex gap-3 relative ${
                                                notif.read 
                                                    ? 'bg-slate-50/50 border-slate-100 text-slate-500 opacity-75' 
                                                    : 'bg-white border-emerald-100 text-slate-800 shadow-sm shadow-emerald-50/50 hover:bg-slate-50/30 cursor-pointer hover:border-emerald-200'
                                            }`}
                                        >
                                            {!notif.read && (
                                                <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            )}
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        {notif.type}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-800">{notif.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 block">
                                                    {new Date(notif.timestamp).toLocaleString('pl-PL', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {notifications.some(n => !n.read) && (
                                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="w-full bg-emerald-400 hover:bg-emerald-500 text-white py-3.5 px-6 rounded-[20px] font-bold text-sm shadow-md shadow-emerald-200 transition-all hover:scale-102 cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        Oznacz wszystkie jako przeczytane
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Toasts list */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="bg-white/95 backdrop-blur-xl border border-emerald-100 p-5 rounded-[26px] shadow-2xl flex gap-3 relative shadow-emerald-100/30 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-emerald-400" />
                            
                            <div className="flex-1 pl-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-1">
                                    {t.type}
                                </span>
                                <h5 className="font-bold text-slate-800 text-sm">{t.title}</h5>
                                <p className="text-xs text-slate-500 mt-1">{t.message}</p>
                            </div>
                            
                            <button
                                onClick={() => {
                                    setToasts(prev => prev.filter(item => item.id !== t.id));
                                }}
                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors self-start cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StudentDashboard;
