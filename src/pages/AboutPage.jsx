import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Rocket, Users, Target, Heart } from 'lucide-react';

const AboutPage = () => {
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
            <main className="max-w-4xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="bg-white p-12 md:p-16 rounded-[60px] shadow-2xl border border-blue-50/50 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/5 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 blur-3xl rounded-full -translate-x-12 translate-y-12"></div>

                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Rocket size={40} className="animate-pulse" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                        O nas – Studencki Startup <span className="italic"><span className="text-emerald-500">Study</span><span className="text-blue-500">Buddy</span></span>
                    </h1>

                    <p className="text-lg text-slate-500 mb-10 max-w-2xl leading-relaxed mx-auto">
                        Jesteśmy grupą studentów z polskich uczelni wyższych, którzy na własnej skórze doświadczyli problemów z przygotowaniem do trudnych kolokwiów i egzaminów. Postanowiliśmy to zmienić.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8 text-left mb-12">
                        <div className="bg-slate-50/50 p-6 rounded-[30px] border border-slate-100/50">
                            <Users className="text-blue-500 mb-3" size={24} />
                            <h3 className="font-black text-slate-800 text-lg mb-1">Kim jesteśmy?</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Zespołem pasjonatów technologii i edukacji. Łączymy wiedzę akademicką z nowoczesnymi narzędziami, tworząc przestrzeń dla studentów i korepetytorów.
                            </p>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-[30px] border border-slate-100/50">
                            <Target className="text-emerald-500 mb-3" size={24} />
                            <h3 className="font-black text-slate-800 text-lg mb-1">Nasza misja</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Zapewnienie natychmiastowej pomocy w nauce. Chcemy, aby każdy student mógł połączyć się z ekspertem w 30 sekund i płacić tylko za faktyczny czas rozmowy.
                            </p>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-[30px] border border-slate-100/50">
                            <Heart className="text-rose-500 mb-3" size={24} />
                            <h3 className="font-black text-slate-800 text-lg mb-1">Dlaczego my?</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                StudyBuddy to nie kolejna nudna platforma ogłoszeniowa. Oferujemy wideo calls, zintegrowaną tablicę WebRTC i płatność co do sekundy.
                            </p>
                        </div>
                    </div>

                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Stworzone z pasją przez studentów dla studentów 🎓
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

export default AboutPage;
