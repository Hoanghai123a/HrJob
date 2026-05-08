import React, { useState, useEffect } from 'react';
import { Home, Calendar, BookOpen, MessageSquare, User, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingComplaintsCount, setPendingComplaintsCount] = useState(0);

  useEffect(() => {
    if (!profile) {
      setUnreadCount(0);
      setPendingComplaintsCount(0);
      return;
    }

    let unreadUnsubscribe: () => void = () => {};
    let complaintsUnsubscribe: () => void = () => {};

    // For regular users: Count unread direct guidances
    if (profile.role !== 'admin') {
      const q = query(
        collection(db, 'directGuidance'),
        where('receiverId', '==', profile.uid),
        where('read', '==', false)
      );

      unreadUnsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadCount(snapshot.size);
      }, (error) => {
        console.error('Error listening to unread guidance:', error);
      });
    }

    // For admins: Count pending complaints
    if (profile.role === 'admin') {
      const cq = query(
        collection(db, 'complaints'),
        where('status', '==', 'pending')
      );

      complaintsUnsubscribe = onSnapshot(cq, (snapshot) => {
        setPendingComplaintsCount(snapshot.size);
      }, (error) => {
        console.error('Error listening to pending complaints:', error);
      });
    }

    return () => {
      unreadUnsubscribe();
      complaintsUnsubscribe();
    };
  }, [profile]);

  const tabs = [
    { id: 'jobs', icon: Home, label: 'Bảng tin' },
    { id: 'attendance', icon: Calendar, label: 'Chấm công' },
    { id: 'instructions', icon: BookOpen, label: 'Hướng dẫn' },
    { id: 'complaints', icon: MessageSquare, label: 'Khiếu nại' },
    { id: 'profile', icon: User, label: 'Tài khoản' },
  ];

  if (profile?.role === 'admin') {
    // Admin might want a specific view or just more access
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto relative overflow-hidden shadow-2xl border-x border-slate-100">
      <header className="bg-white border-b border-[#dce3e8] px-6 pt-4 pb-[10px] flex items-center justify-between sticky top-0 z-10 shrink-0">
        <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center"
          >
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </motion.div>
          HR PRO
        </h1>
        {profile?.role === 'admin' && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded uppercase tracking-tighter">Admin</span>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="px-6 pt-[10px] pb-[20px]"
        >
          {children}
        </motion.div>
      </main>

      <nav className="bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 py-3 flex justify-around items-center absolute bottom-0 w-full z-10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 relative ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-blue-50 rounded-2xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon size={22} className="relative z-10" />
              {tab.id === 'instructions' && unreadCount > 0 && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white z-20 shadow-sm animate-bounce" />
              )}
              {tab.id === 'complaints' && profile?.role === 'admin' && pendingComplaintsCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white z-20 shadow-sm">
                  {pendingComplaintsCount > 9 ? '9+' : pendingComplaintsCount}
                </div>
              )}
              <span className="text-[10px] font-bold relative z-10 uppercase tracking-widest">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
