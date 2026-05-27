import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen, Coins, BookOpenText, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { SUBJECTS } from '../services/mockData';

const RoleContext = createContext();

export const useRole = () => useContext(RoleContext);

export const RoleProvider = ({ children }) => {
    const { isLoaded, isSignedIn, user } = useUser();
    const [role, setRole] = useState(null);
    const [dbProfile, setDbProfile] = useState(null);
    const [isSelectingRole, setIsSelectingRole] = useState(false);
    const [isSettingUpTutor, setIsSettingUpTutor] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // Tutor onboarding form state
    const [tutorData, setTutorData] = useState({
        university: '',
        subject: SUBJECTS[1] || 'Mikroekonomia',
        pricePerMinute: 1.50,
        bio: ''
    });

    useEffect(() => {
        const checkUserProfile = async () => {
            if (isLoaded && isSignedIn && user) {
                setIsLoadingProfile(true);
                try {
                    // Try to fetch profile from our database/backend
                    const profileData = await api.fetchProfile(user.id);
                    if (profileData) {
                        setRole(profileData.role);
                        setDbProfile(profileData.profile);
                        setIsSelectingRole(false);
                    } else {
                        // Profile doesn't exist in DB yet, prompt to choose role
                        setIsSelectingRole(true);
                    }
                } catch (error) {
                    console.error("Failed to check user profile in DB:", error);
                    // Fallback to clerk metadata if backend is offline
                    const userRole = user.unsafeMetadata?.role;
                    if (userRole) {
                        setRole(userRole);
                    } else {
                        setIsSelectingRole(true);
                    }
                } finally {
                    setIsLoadingProfile(false);
                }
            } else {
                setRole(null);
                setDbProfile(null);
                setIsSelectingRole(false);
                setIsSettingUpTutor(false);
                setIsLoadingProfile(false);
            }
        };

        checkUserProfile();
    }, [isLoaded, isSignedIn, user]);

    const handleSelectRole = async (selectedRole) => {
        if (!user) return;
        
        if (selectedRole === 'student') {
            try {
                setIsLoadingProfile(true);
                // Create student profile in database immediately
                const response = await api.createProfile({
                    clerkId: user.id,
                    name: user.fullName || user.username || "Uczeń",
                    role: 'student',
                    imageUrl: user.imageUrl
                });
                
                // Sync with Clerk unsafeMetadata for client-side quick checks
                await user.update({
                    unsafeMetadata: { ...user.unsafeMetadata, role: 'student' }
                });

                setRole('student');
                setDbProfile(response.profile);
                setIsSelectingRole(false);
            } catch (error) {
                console.error("Error creating student profile:", error);
                alert("Błąd podczas tworzenia profilu studenta: " + (error.response?.data?.error || error.response?.data?.message || error.message));
            } finally {
                setIsLoadingProfile(false);
            }
        } else if (selectedRole === 'tutor') {
            // Tutors need to fill out their details first
            setIsSelectingRole(false);
            setIsSettingUpTutor(true);
        }
    };

    const handleTutorSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            setIsLoadingProfile(true);
            const response = await api.createProfile({
                clerkId: user.id,
                name: user.fullName || user.username || "Tutor",
                role: 'tutor',
                imageUrl: user.imageUrl,
                university: tutorData.university,
                subject: tutorData.subject,
                pricePerMinute: parseFloat(tutorData.pricePerMinute),
                bio: tutorData.bio
            });

            // Sync with Clerk unsafeMetadata
            await user.update({
                unsafeMetadata: { ...user.unsafeMetadata, role: 'tutor' }
            });

            setRole('tutor');
            setDbProfile(response.profile);
            setIsSettingUpTutor(false);
        } catch (error) {
            console.error("Error creating tutor profile:", error);
            alert("Błąd podczas tworzenia profilu korepetytora: " + (error.response?.data?.error || error.response?.data?.message || error.message));
        } finally {
            setIsLoadingProfile(false);
        }
    };

    if (!isLoaded || isLoadingProfile) {
        return (
            <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isSelectingRole) {
        return (
            <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl w-full bg-white/70 backdrop-blur-xl p-12 rounded-[60px] border border-white shadow-2xl text-center"
                >
                    <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Kim jesteś w EduMinucie? 🤔</h1>
                    <p className="text-slate-500 mb-10 text-lg">Wybierz swoją rolę. Zostanie ona przypisana do Twojego profilu.</p>

                    <div className="grid md:grid-cols-2 gap-8">
                        <button
                            onClick={() => handleSelectRole('student')}
                            className="group p-10 bg-blue-500 hover:bg-blue-600 text-white rounded-[40px] shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex flex-col items-center gap-4 cursor-pointer text-center"
                        >
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                                <BookOpen size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">Chcę się uczyć</h3>
                                <p className="text-sm opacity-80 mt-1">Szukam szybkich konsultacji z ekspertami</p>
                            </div>
                        </button>

                        <button
                            onClick={() => handleSelectRole('tutor')}
                            className="group p-10 bg-emerald-400 hover:bg-emerald-500 text-white rounded-[40px] shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex flex-col items-center gap-4 cursor-pointer text-center"
                        >
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                                <GraduationCap size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">Chcę uczyć</h3>
                                <p className="text-sm opacity-85 mt-1">Chcę zarabiać na minucie konsultacji</p>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (isSettingUpTutor) {
        return (
            <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-xl w-full bg-white p-12 rounded-[50px] border border-slate-100 shadow-2xl"
                >
                    <h2 className="text-3xl font-black text-slate-800 mb-2 text-center tracking-tight">Karta Korepetytora 🎓</h2>
                    <p className="text-slate-500 mb-8 text-center text-sm">Wypełnij swoje dane profilowe, aby studenci mogli Cię znaleźć.</p>

                    <form onSubmit={handleTutorSubmit} className="space-y-6">
                        <div>
                            <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <GraduationCap size={16} /> Twoja uczelnia
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="np. SGH w Warszawie"
                                value={tutorData.university}
                                onChange={e => setTutorData(prev => ({ ...prev, university: e.target.value }))}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-400 outline-none text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <BookOpenText size={16} /> Główny przedmiot
                            </label>
                            <select
                                value={tutorData.subject}
                                onChange={e => setTutorData(prev => ({ ...prev, subject: e.target.value }))}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-400 outline-none text-slate-700 font-bold"
                            >
                                {SUBJECTS.filter(s => s !== "Wszystkie").map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-slate-700 font-bold mb-2 flex items-center justify-between text-sm uppercase tracking-wider">
                                <span className="flex items-center gap-2"><Coins size={16} /> Stawka za minutę</span>
                                <span className="text-emerald-500 font-black text-base">{tutorData.pricePerMinute.toFixed(2)} PLN</span>
                            </label>
                            <input
                                type="range"
                                min="0.80"
                                max="4.00"
                                step="0.10"
                                value={tutorData.pricePerMinute}
                                onChange={e => setTutorData(prev => ({ ...prev, pricePerMinute: parseFloat(e.target.value) }))}
                                className="w-full accent-emerald-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                                <span>0.80 PLN/min</span>
                                <span>4.00 PLN/min</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-700 font-bold mb-2 text-sm uppercase tracking-wider">
                                O sobie (krótki opis)
                            </label>
                            <textarea
                                required
                                rows="3"
                                placeholder="Napisz kilka zdań o swoim doświadczeniu..."
                                value={tutorData.bio}
                                onChange={e => setTutorData(prev => ({ ...prev, bio: e.target.value }))}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-400 outline-none text-slate-700 text-sm leading-relaxed"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-black text-lg py-5 rounded-2xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Rozpocznij udzielanie lekcji <ArrowRight size={20} />
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <RoleContext.Provider value={{ role, dbProfile, setDbProfile, isSignedIn, user }}>
            {children}
        </RoleContext.Provider>
    );
};
