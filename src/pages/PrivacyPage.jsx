import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Eye, Key, Database } from 'lucide-react';

const PrivacyPage = () => {
    const navigate = useNavigate();

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
            <main className="max-w-3xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white p-10 md:p-12 rounded-[50px] shadow-2xl border border-blue-50 text-left"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-sm">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800">Polityka Prywatności</h1>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">RODO & Ochrona Danych Osobowych</p>
                        </div>
                    </div>

                    <div className="space-y-6 text-slate-500 text-sm leading-relaxed">
                        <section>
                            <h2 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                                <Database size={16} className="text-emerald-500" /> 1. Administrator Danych
                            </h2>
                            <p>
                                Administratorem danych osobowych zbieranych za pośrednictwem platformy **StudyBuddy** jest studencki startup StudyBuddy (tworzony przez studentów dla studentów). Cenimy Twoją prywatność i chronimy dane z należytą starannością.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                                <Eye size={16} className="text-blue-500" /> 2. Ochrona Prywatności i RODO (Zasada RODO)
                            </h2>
                            <p>
                                W trosce o prywatność naszych użytkowników, platforma StudyBuddy wdraża mechanizm ochrony tożsamości uczniów. Dane studenta przekazywane korepetytorom są automatycznie anonimizowane – **tutorzy widzą wyłącznie imię studenta (bez nazwiska)**. Pełne nazwisko studenta nie jest ujawniane w systemie czatów, żądań ani historii lekcji widocznych dla tutorów.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                                <Key size={16} className="text-amber-500" /> 3. Jakie dane przetwarzamy?
                            </h2>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Dane uwierzytelniające:</strong> Przechowywane bezpiecznie za pośrednictwem serwisu Clerk Auth (Email, Hasło, Awatar).</li>
                                <li><strong>Dane profilu:</strong> Imię i nazwisko, adres email, portfel (dla studentów) oraz uczelnia, przedmiot, stawka, biografia, link LinkedIn, certyfikaty, doświadczenie (dla tutorów).</li>
                                <li><strong>Transakcje płatnicze:</strong> Logi doładowań (mock BLIK) i pobrania opłat za zrealizowane sesje.</li>
                                <li><strong>Sesje wideo:</strong> Pokoje wideo audio-wideo (Daily.co) oraz ich opcjonalne nagrania chmurowe (przechowywane przez 7 dni w celu weryfikacji jakości).</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-purple-500" /> 4. Prawa Użytkownika
                            </h2>
                            <p>
                                Masz prawo do wglądu w swoje dane, ich edycji za pośrednictwem panelu profilu, żądania ograniczenia ich przetwarzania lub całkowitego usunięcia konta. W tym celu możesz skontaktować się z administratorem lub dokonać edycji w zakładce „Profil”.
                            </p>
                        </section>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
                        Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="text-center py-8 text-xs text-slate-400">
                &copy; {new Date().getFullYear()} StudyBuddy. Wszelkie prawa zastrzeżone.
            </footer>
        </div>
    );
};

export default PrivacyPage;
