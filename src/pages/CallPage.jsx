import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, RotateCcw, Pencil, Eraser, RefreshCw, AlertCircle } from 'lucide-react';
import DailyIframe from '@daily-co/daily-js';
import { api } from '../services/api';

const getErrorDetails = (err) => {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    if (err.errorMsg) return err.errorMsg;
    if (err.msg) return err.msg;
    try {
        return JSON.stringify(err);
    } catch (e) {
        return String(err);
    }
};

const CallPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Check for passed session state
    const passedSession = location.state?.session;
    const [session, setSession] = useState(passedSession || null);

    const [seconds, setSeconds] = useState(0);
    const [pricePerMinute, setPricePerMinute] = useState(1.50);
    const [activeTool, setActiveTool] = useState('draw'); // draw, erase
    const [drawColor, setDrawColor] = useState('#10b981'); // Emerald 500
    const [strokeWidth, setStrokeWidth] = useState(4);
    
    // Status states
    const [showSummary, setShowSummary] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [finalCost, setFinalCost] = useState('0.00');
    const [isJoined, setIsJoined] = useState(false);
    const [callError, setCallError] = useState(null);

    // Refs
    const canvasRef = useRef(null);
    const callContainerRef = useRef(null);
    const callFrameRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastXRef = useRef(0);
    const lastYRef = useRef(0);
    const wsRef = useRef(null);

    // 1. Load active session detail from DB if not passed
    useEffect(() => {
        const loadSessionDetails = async () => {
            if (session) {
                setPricePerMinute(session.tutorRate || 1.50);
                return;
            }
            try {
                // Fetch the session from the backend
                const activeSession = await api.fetchSession(sessionId);
                if (activeSession) {
                    setSession(activeSession);
                    setPricePerMinute(activeSession.tutorRate || 1.50);
                } else {
                    setCallError("Nie odnaleziono aktywnej sesji.");
                }
            } catch (error) {
                console.error("Error loading session:", error);
                setCallError("Błąd podczas wczytywania danych sesji.");
            }
        };

        loadSessionDetails();
    }, [sessionId, session]);

    // 1b. Connect to WebSocket server for whiteboard sync fallback
    useEffect(() => {
        if (!sessionId) return;
        
        let apiHost = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        if (apiHost.endsWith('/')) {
            apiHost = apiHost.slice(0, -1);
        }
        if (apiHost.endsWith('/api')) {
            apiHost = apiHost.slice(0, -4);
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Replace http:// or https:// with ws:// or wss://
        const wsHost = apiHost.replace(/^https?:\/\//, '');
        const wsUrl = `${protocol}//${wsHost}/api/sync?roomId=${sessionId}`;
        
        console.log("Connecting to whiteboard sync WebSocket:", wsUrl);
        let ws;
        try {
            ws = new WebSocket(wsUrl);
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'draw') {
                        drawOnCanvas(data.lastX, data.lastY, data.currentX, data.currentY, data.color, data.strokeWidth, data.tool);
                    } else if (data.type === 'clear') {
                        clearLocalCanvas();
                    }
                } catch (err) {
                    console.error("Error parsing WebSocket sync message:", err);
                }
            };
            
            ws.onopen = () => {
                console.log("Connected to whiteboard sync WebSocket successfully.");
            };
            
            ws.onerror = (err) => {
                console.error("WebSocket sync error:", err);
            };
            
            wsRef.current = ws;
        } catch (wsError) {
            console.error("Failed to create WebSocket:", wsError);
        }
        
        return () => {
            if (ws) {
                ws.close();
            }
            wsRef.current = null;
        };
    }, [sessionId]);

    // 2. Initialize Daily.co video call frame
    useEffect(() => {
        if (!session || !session.dailyRoomUrl || callFrameRef.current) return;

        const initCall = async () => {
            try {
                const roomUrl = session.dailyRoomUrl;
                
                // If the url is meet.jit.si, we will render it as a standard iframe instead of Daily SDK
                if (roomUrl.includes('meet.jit.si')) {
                    setIsJoined(true);
                    return;
                }

                // Initialize Daily.co Prebuilt Frame
                const frame = DailyIframe.createFrame(callContainerRef.current, {
                    iframeStyle: {
                        width: '100%',
                        height: '100%',
                        border: '0',
                        borderRadius: '30px',
                        backgroundColor: '#0f172a'
                    },
                    showLeaveButton: false, // We use our own termination button
                    showFullscreenButton: true
                });

                callFrameRef.current = frame;

                // Event Listeners
                frame.on('joined-meeting', () => {
                    setIsJoined(true);
                });

                frame.on('left-meeting', () => {
                    setIsJoined(false);
                });

                frame.on('error', (e) => {
                    console.error("Daily.co Frame Error:", e);
                    setCallError(`Wystąpił błąd wideo-połączenia. Szczegóły: ${getErrorDetails(e)}`);
                });

                // WebRTC Collaborative Drawing Listener
                frame.on('app-message', (event) => {
                    const data = event.data;
                    if (!data) return;

                    if (data.type === 'draw') {
                        drawOnCanvas(data.lastX, data.lastY, data.currentX, data.currentY, data.color, data.strokeWidth, data.tool);
                    } else if (data.type === 'clear') {
                        clearLocalCanvas();
                    }
                });

                // Join room
                await frame.join({ url: roomUrl });
            } catch (err) {
                console.error("Failed to initialize Daily call frame:", err);
                setCallError(`Nie udało się uruchomić połączenia wideo. Szczegóły: ${getErrorDetails(err)}`);
            }
        };

        initCall();

        return () => {
            // Cleanup call frame on unmount
            if (callFrameRef.current) {
                callFrameRef.current.destroy();
                callFrameRef.current = null;
            }
        };
    }, [session]);

    // 3. Call Duration billing timer
    useEffect(() => {
        if (!isJoined) return;

        const interval = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isJoined]);

    // 4. Whiteboard Canvas setup
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isJoined]);

    // Helper drawing actions
    const drawOnCanvas = (lastX, lastY, currentX, currentY, color, width, tool) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);

        if (tool === 'draw') {
            ctx.strokeStyle = color;
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.strokeStyle = '#ffffff';
            ctx.globalCompositeOperation = 'destination-out'; // True erasure
        }

        ctx.lineWidth = width;
        ctx.stroke();
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        
        isDrawingRef.current = true;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        lastXRef.current = clientX - rect.left;
        lastYRef.current = clientY - rect.top;
    };

    const draw = (e) => {
        if (!isDrawingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;

        // Draw locally
        drawOnCanvas(lastXRef.current, lastYRef.current, currentX, currentY, drawColor, strokeWidth, activeTool);

        // Broadcast to Peer over Daily.co WebRTC Data Channel
        if (callFrameRef.current) {
            callFrameRef.current.sendAppMessage({
                type: 'draw',
                lastX: lastXRef.current,
                lastY: lastYRef.current,
                currentX,
                currentY,
                color: drawColor,
                strokeWidth,
                tool: activeTool
            }, '*');
        }

        // Broadcast to Peer over WebSocket fallback
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'draw',
                lastX: lastXRef.current,
                lastY: lastYRef.current,
                currentX,
                currentY,
                color: drawColor,
                strokeWidth,
                tool: activeTool
            }));
        }

        lastXRef.current = currentX;
        lastYRef.current = currentY;
    };

    const stopDrawing = () => {
        isDrawingRef.current = false;
    };

    const clearLocalCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleClearCanvas = () => {
        clearLocalCanvas();
        // Broadcast clear
        if (callFrameRef.current) {
            callFrameRef.current.sendAppMessage({ type: 'clear' }, '*');
        }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'clear' }));
        }
    };

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const currentCost = ((seconds / 60) * pricePerMinute).toFixed(2);

    const handleEndCall = async () => {
        setIsEnding(true);
        // Leave Daily meeting room
        if (callFrameRef.current) {
            try {
                await callFrameRef.current.leave();
            } catch (err) {
                console.error("Error leaving room:", err);
            }
        }
        
        try {
            // End session on backend database & perform wallet transactions
            const result = await api.endSession(sessionId || session.id, seconds);
            if (result && result.cost !== undefined) {
                setFinalCost(result.cost.toFixed(2));
            } else {
                setFinalCost(currentCost);
            }
        } catch (error) {
            console.error("Error calling endSession API:", error);
            setFinalCost(currentCost);
        } finally {
            setIsEnding(false);
            setShowSummary(true);
        }
    };

    if (callError) {
        return (
            <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-6 text-center text-white">
                <div className="max-w-md bg-slate-800 p-10 rounded-[40px] border border-slate-700">
                    <AlertCircle size={48} className="text-rose-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-black mb-4">Błąd połączenia</h2>
                    <p className="text-slate-400 mb-8">{callError}</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-6 py-3 rounded-2xl transition-colors cursor-pointer"
                    >
                        Powrót do panelu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="h-20 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-emerald-400 tracking-tighter">EduMinuta</span>
                    <span className="bg-slate-800 text-xs px-3 py-1 rounded-full text-slate-400 font-bold uppercase tracking-wider">
                        Sesja: #{sessionId?.slice(-6) || 'Aktywna'}
                    </span>
                    {isJoined && (
                        <div className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs px-3 py-1 rounded-full font-bold">
                            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                            Trwa nagrywanie (7 dni)
                        </div>
                    )}
                </div>

                {/* Live Billing Tracker */}
                <div className="flex items-center gap-8 bg-slate-900 px-6 py-2 rounded-full border border-slate-800">
                    <div className="text-center border-r border-slate-800 pr-6">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Czas</p>
                        <p className="font-mono text-xl font-bold text-emerald-400">{formatTime(seconds)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Koszt</p>
                        <p className="font-mono text-xl font-bold text-blue-400">{currentCost} PLN</p>
                    </div>
                </div>
            </header>

            {/* Split screen content area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                
                {/* 1. Whiteboard Canvas (Left) */}
                <div className="flex-1 bg-white flex flex-col relative overflow-hidden">
                    {/* Toolbar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-200 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-10 border border-slate-800">
                        <button 
                            onClick={() => setActiveTool('draw')}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${activeTool === 'draw' ? 'bg-emerald-500 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
                            title="Ołówek"
                        >
                            <Pencil size={20} />
                        </button>
                        <button 
                            onClick={() => setActiveTool('erase')}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${activeTool === 'erase' ? 'bg-emerald-500 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
                            title="Gumka"
                        >
                            <Eraser size={20} />
                        </button>

                        <div className="w-px h-6 bg-slate-800"></div>

                        {/* Drawing Colors */}
                        <div className="flex gap-2">
                            {['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#000000'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => {
                                        setDrawColor(color);
                                        setActiveTool('draw');
                                    }}
                                    style={{ backgroundColor: color }}
                                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${drawColor === color && activeTool === 'draw' ? 'border-white scale-125 shadow-md' : 'border-transparent'}`}
                                />
                            ))}
                        </div>

                        <div className="w-px h-6 bg-slate-800"></div>

                        {/* Reset Canvas */}
                        <button 
                            onClick={handleClearCanvas}
                            className="p-2 rounded-xl hover:bg-slate-850 text-slate-400 transition-all cursor-pointer"
                            title="Wyczyść tablicę"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    {/* Canvas drawing surface */}
                    {!isJoined ? (
                        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-center p-6">
                            <RefreshCw className="animate-spin text-emerald-400 mb-4" size={32} />
                            <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">Czekam na połączenie wideo...</p>
                        </div>
                    ) : null}

                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="flex-1 cursor-crosshair bg-white"
                    />
                </div>

                {/* 2. Daily Video Call / Iframe (Right) */}
                <div className="w-full lg:w-[480px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col relative h-[300px] lg:h-auto">
                    {session && session.dailyRoomUrl && session.dailyRoomUrl.includes('meet.jit.si') ? (
                        // Jitsi fallback
                        <iframe 
                            src={session.dailyRoomUrl}
                            className="w-full h-full border-none"
                            allow="camera; microphone; fullscreen; display-capture; autoplay"
                        />
                    ) : (
                        // Live Daily Prebuilt Container
                        <div ref={callContainerRef} className="w-full h-full" />
                    )}
                </div>
            </div>

            {/* Bottom Call Controls */}
            <footer className="h-24 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-center gap-4">
                <button 
                    onClick={handleEndCall}
                    disabled={isEnding || !isJoined}
                    className="px-10 py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white rounded-2xl font-black text-lg transition-all flex items-center gap-2 shadow-lg shadow-rose-500/10 cursor-pointer"
                >
                    {isEnding ? (
                        <>
                            <RefreshCw className="animate-spin" size={22} /> Przetwarzanie płatności...
                        </>
                    ) : (
                        <>
                            <PhoneOff size={22} /> Rozłącz i rozlicz sesję
                        </>
                    )}
                </button>
            </footer>

            {/* Session Billing Summary Modal */}
            <AnimatePresence>
                {showSummary && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/80">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white text-slate-900 w-full max-w-md rounded-[50px] p-10 shadow-2xl text-center border border-slate-100"
                        >
                            <h2 className="text-3xl font-black text-slate-800 mb-2">Rozliczono sesję</h2>
                            <p className="text-slate-400 mb-8 font-bold uppercase tracking-wider text-xs">Płatność pobrana z portfela</p>

                            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 mb-8 space-y-4 text-left">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-bold">Czas trwania:</span>
                                    <span className="font-mono font-bold text-slate-800">{formatTime(seconds)} ({seconds} sek)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-bold">Stawka za minutę:</span>
                                    <span className="font-mono font-bold text-slate-800">{pricePerMinute.toFixed(2)} PLN</span>
                                </div>
                                <div className="w-full h-px bg-slate-200 my-2"></div>
                                <div className="flex justify-between text-lg">
                                    <span className="text-slate-800 font-black">Całkowity koszt:</span>
                                    <span className="font-mono font-black text-emerald-500">{finalCost} PLN</span>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 mb-8 leading-relaxed">
                                Nagranie wideo z zapisem Twoich rysunków z tablicy jest zapisywane. Będzie ono dostępne do pobrania i obejrzenia w Twoim panelu przez kolejne 7 dni.
                            </p>

                            <button 
                                onClick={() => navigate('/')}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-emerald-500 transition-colors shadow-lg cursor-pointer"
                            >
                                Powrót do panelu
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CallPage;
