import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Wallet, Calendar, MessageSquare, Clock, User } from 'lucide-react';
import { useUser, UserButton } from '@clerk/clerk-react';

const Sidebar = ({ role, activeTab, setActiveTab }) => {
    const { user } = useUser();
    
    const menuItems = role === 'student' ? [
        { id: 'szukaj', label: 'Szukaj', icon: <Search size={20} /> },
        { id: 'portfel', label: 'Portfel', icon: <Wallet size={20} /> },
        { id: 'czat', label: 'Czaty', icon: <MessageSquare size={20} /> },
        { id: 'historia', label: 'Historia', icon: <Clock size={20} /> },
        { id: 'profil', label: 'Profil', icon: <User size={20} /> },
    ] : [
        { id: 'czat', label: 'Czaty', icon: <MessageSquare size={20} /> },
        { id: 'zarobki', label: 'Zarobki', icon: <Wallet size={20} /> },
        { id: 'kalendarz', label: 'Kalendarz', icon: <Calendar size={20} /> },
        { id: 'historia', label: 'Historia', icon: <Clock size={20} /> },
        { id: 'profil', label: 'Profil', icon: <User size={20} /> },
    ];

    const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress.split('@')[0] || "Użytkownik";

    return (
        <aside className="w-72 bg-white border-r border-slate-100 p-6 hidden md:flex flex-col h-screen sticky top-0">
            <Link to="/" className="text-2xl font-black text-emerald-500 mb-10 px-4 tracking-tighter">EduMinuta</Link>
            <nav className="space-y-2 flex-1">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[24px] transition-all duration-300 ${activeTab === item.id
                                ? 'bg-emerald-400 text-white shadow-lg shadow-emerald-200 font-bold scale-105'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-emerald-500'
                            }`}
                    >
                        {item.icon} {item.label}
                    </button>
                ))}
            </nav>
            <div className="p-4 bg-slate-50 rounded-3xl mt-auto">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user?.imageUrl ? (
                                <img src={user.imageUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-emerald-700 font-bold">{displayName[0]?.toUpperCase()}</div>
                            )}
                        </div>
                        <div className="truncate min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{displayName}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{role === 'student' ? 'Student' : 'Tutor'}</p>
                        </div>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
