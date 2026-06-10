import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

const NewsletterPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null); // null, 'success', 'error'
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || isLoading) return;

        setIsLoading(true);
        setStatus(null);
        try {
            const result = await api.subscribeNewsletter(email.trim());
            if (result && result.success) {
                setStatus('success');
                setMessage(result.message || 'Pomyślnie zapisano do newslettera!');
                setEmail('');
            } else {
                setStatus('error');
                setMessage('Nie udało się zapisać. Spróbuj ponownie.');
            }
        } catch (error) {
            console.error("Newsletter subscription error:", error);
            setStatus('error');
            setMessage(error.response?.data?.error || 'Wystąpił błąd po stronie serwera. Spróbuj ponownie później.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f0f9ff] text-slate-800 font-sans flex flex-col justify-between selection:bg-emerald-200">
            {/* Header */}
            <header className="max-w-7xl mx-auto px-6 py-6 w-full flex justify-between items-center bg-white/30 backdrop-blur-md sticky top-0 z-40 border-b border-white/20">
                <span className="text-2xl font-black tracking-tighter italic"><span className="text-emerald-500">Study</span><span className="text-blue-500">Buddy</span></span>
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-2.5 rounded-full transition-all text-sm cursor-pointer shadow-md hover:scale-105"
                >
                    <ArrowLeft size={16} /> Powrót
                </button>
            </header>

            {/* Main Content */}
            <main className="max-w-xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center w-full">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white p-10 md:p-12 rounded-[50px] shadow-2xl border border-blue-50 relative overflow-hidden text-center"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 blur-2xl rounded-full translate-x-8 -translate-y-8"></div>
                    
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Mail size={32} />
                    </div>

                    <h1 className="text-3xl font-black text-slate-800 mb-3">Zapisz się na Newsletter</h1>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed px-4">
                        Bądź na bieżąco z rozwojem StudyBuddy! Zostaw swój adres e-mail, aby otrzymywać informacje o nowych funkcjach, darmowych minutach i aktualnościach.
                    </p>

                    {status === 'success' ? (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-emerald-700 font-bold mb-6 flex flex-col items-center gap-2"
                        >
                            <CheckCircle2 size={36} className="text-emerald-500" />
                            <p className="text-sm">{message}</p>
                            <button 
                                onClick={() => setStatus(null)}
                                className="text-xs underline text-emerald-600 hover:text-emerald-800 font-bold mt-2"
                            >
                                Zapisz inny email
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Wpisz swój adres email..."
                                    className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-400 outline-none text-center font-bold text-slate-700 placeholder-slate-400"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-rose-500 text-xs font-bold">{message}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full bg-emerald-400 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={20} /> Zapisywanie...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} /> Zapisz mnie!
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <p className="text-[10px] text-slate-400 mt-6 leading-relaxed">
                        Zapisując się akceptujesz naszą Politykę prywatności. Zawsze możesz wypisać się z listy subskrybentów.
                    </p>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="text-center py-8 text-xs text-slate-400">
                &copy; {new Date().getFullYear()} StudyBuddy. Wszelkie prawa zastrzeżone.
            </footer>
        </div>
    );
};

export default NewsletterPage;
