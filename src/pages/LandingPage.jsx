import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Star, LogIn } from 'lucide-react';
import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';

const LandingPage = () => {
    const { isSignedIn, user } = useUser();
    const navigate = useNavigate();

    const handleDashboardRedirect = () => {
        const role = user?.unsafeMetadata?.role;
        if (role === 'tutor') {
            navigate('/tutor');
        } else {
            navigate('/student');
        }
    };

    return (
        <div className="min-h-screen bg-[#f0f9ff]">
            {/* Top Navigation */}
            <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                <span className="text-2xl font-black text-emerald-500 tracking-tighter italic">EduMinuta</span>
                <div>
                    {isSignedIn ? (
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleDashboardRedirect}
                                className="bg-emerald-400 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-full transition-all shadow-md text-sm"
                            >
                                Przejdź do panelu
                            </button>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    ) : (
                        <SignInButton mode="modal">
                            <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-full transition-all shadow-md text-sm cursor-pointer">
                                <LogIn size={16} /> Zaloguj się
                            </button>
                        </SignInButton>
                    )}
                </div>
            </header>

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex flex-col items-center justify-center p-6 text-center pt-10"
            >
                <div className="max-w-4xl bg-white/60 backdrop-blur-xl p-16 rounded-[80px] border border-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/20 blur-3xl -z-10 rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/20 blur-3xl -z-10 rounded-full"></div>

                    <h1 className="text-7xl font-black text-slate-900 mb-6 tracking-tighter italic">Edu<span className="text-emerald-500">Minuta</span></h1>
                    <p className="text-2xl text-slate-600 mb-12 max-w-2xl mx-auto">Najszybsza pomoc w nauce. Płacisz za sekundy, zyskujesz godziny wolnego czasu.</p>

                    <div className="grid md:grid-cols-2 gap-8">
                        {isSignedIn ? (
                            <>
                                <button 
                                    onClick={() => navigate('/student')}
                                    className="group bg-blue-500 text-white p-12 rounded-[50px] shadow-2xl hover:bg-blue-600 transition-all hover:scale-105 cursor-pointer text-center"
                                >
                                    <User size={56} className="mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                    <h2 className="text-3xl font-bold">Student</h2>
                                    <p className="opacity-80">Rozwiąż zadanie teraz</p>
                                </button>
                                <button 
                                    onClick={() => navigate('/tutor')}
                                    className="group bg-emerald-400 text-white p-12 rounded-[50px] shadow-2xl hover:bg-emerald-500 transition-all hover:scale-105 cursor-pointer text-center"
                                >
                                    <Star size={56} className="mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                    <h2 className="text-3xl font-bold">Korepetytor</h2>
                                    <p className="opacity-80">Zarabiaj na minucie</p>
                                </button>
                            </>
                        ) : (
                            <>
                                <SignInButton mode="modal" forceRedirectUrl="/student">
                                    <button className="group bg-blue-500 text-white p-12 rounded-[50px] shadow-2xl hover:bg-blue-600 transition-all hover:scale-105 cursor-pointer text-center">
                                        <User size={56} className="mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                        <h2 className="text-3xl font-bold">Student</h2>
                                        <p className="opacity-80">Rozwiąż zadanie teraz</p>
                                    </button>
                                </SignInButton>
                                <SignInButton mode="modal" forceRedirectUrl="/tutor">
                                    <button className="group bg-emerald-400 text-white p-12 rounded-[50px] shadow-2xl hover:bg-emerald-500 transition-all hover:scale-105 cursor-pointer text-center">
                                        <Star size={56} className="mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                        <h2 className="text-3xl font-bold">Korepetytor</h2>
                                        <p className="opacity-80">Zarabiaj na minucie</p>
                                    </button>
                                </SignInButton>
                            </>
                        )}
                    </div>
                </div>

                {/* Newsletter Section */}
                <section className="mt-24 w-full max-w-2xl bg-white p-12 rounded-[60px] shadow-xl border border-blue-50">
                    <h3 className="text-3xl font-black text-slate-800 mb-2">Bądź pierwszy!</h3>
                    <p className="text-slate-500 mb-8">Zostaw swój mail, a powiadomimy Cię o starcie platformy i dostaniesz 15 minut za darmo.</p>
                    <div className="space-y-4">
                        <input type="email" placeholder="Wpisz swój email..." className="w-full p-6 bg-slate-50 rounded-3xl border-none focus:ring-2 focus:ring-emerald-400 outline-none text-lg text-center" />
                        <div className="flex justify-center gap-6 py-2">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-bold">
                                <input type="radio" name="role" className="w-5 h-5 accent-emerald-500" /> Chcę dołączyć jako Student
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-bold">
                                <input type="radio" name="role" className="w-5 h-5 accent-emerald-500" /> Chcę uczyć jako Pro
                            </label>
                        </div>
                        <button className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-slate-200 cursor-pointer">
                            Zapisz mnie do EduMinuta
                        </button>
                    </div>
                </section>
            </motion.div>
        </div>
    );
};

export default LandingPage;
