import React, { useState, useEffect } from 'react';
import { Home, Calendar, BookOpen, MessageSquare, User, LayoutDashboard, Wallet, Info, ChevronLeft, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { pb } from '../lib/pocketbase';

import { AppProvider, useApp } from '../contexts/AppContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { profile, logout } = useAuth();
  const { companySettings } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingComplaintsCount, setPendingComplaintsCount] = useState(0);

  useEffect(() => {
    if (!profile) {
      setUnreadCount(0);
      setPendingComplaintsCount(0);
      return;
    }

    const setupSubscriptions = async () => {
      try {
        // For regular users: Count unread direct guidances
        if (profile.role !== 'admin') {
          try {
            const initialUnread = await pb.collection('directGuidance').getFullList({
              filter: `receiverId = "${profile.id}" && read = false`
            });
            setUnreadCount(initialUnread.length);

            pb.collection('directGuidance').subscribe('*', function (e) {
              if (e.action === 'create' && e.record.receiverId === profile.id && !e.record.read) {
                setUnreadCount(prev => prev + 1);
              } else if (e.action === 'update' && e.record.receiverId === profile.id) {
                if (e.record.read) {
                   setUnreadCount(prev => Math.max(0, prev - 1));
                }
              }
            }).catch(() => {});
          } catch (err) {}
        }

        // For admins: Count pending complaints
        if (profile.role === 'admin') {
          try {
            const initialPending = await pb.collection('complaints').getFullList({
              filter: 'status = "pending"'
            });
            setPendingComplaintsCount(initialPending.length);

            pb.collection('complaints').subscribe('*', function (e) {
              if (e.action === 'create' && e.record.status === 'pending') {
                setPendingComplaintsCount(prev => prev + 1);
              } else if (e.action === 'update') {
                if (e.record.status !== 'pending') {
                   setPendingComplaintsCount(prev => Math.max(0, prev - 1));
                }
              }
            }).catch(() => {});
          } catch (err) {}
        }
      } catch (err) {}
    };

    setupSubscriptions();

    return () => {
      pb.collection('directGuidance').unsubscribe('*').catch(() => {});
      pb.collection('complaints').unsubscribe('*').catch(() => {});
    };
  }, [profile]);

  const tabs = [
    { id: 'home', icon: Home, label: 'Trang chủ' },
    { id: 'about', icon: Info, label: 'Về chúng tôi' },
  ];

  const isHomeActive = activeTab !== 'about';

  if (profile?.role === 'admin') {
    // Admin might want a specific view or just more access
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto relative overflow-hidden shadow-2xl border-x border-slate-100">
    <header className="bg-white border-b border-[#dce3e8] px-6 pt-4 pb-[10px] flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          {activeTab !== 'home' && activeTab !== 'about' && (
            <button 
              onClick={() => setActiveTab('home')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center p-1"
            >
              <img 
                src={companySettings.logoUrl} 
                alt={companySettings.name} 
                className="w-full h-full object-contain" 
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== 'https://cdn-icons-png.flaticon.com/512/9167/9167023.png') {
                    target.src = 'https://cdn-icons-png.flaticon.com/512/9167/9167023.png';
                  }
                }}
              />
            </motion.div>
            {companySettings.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {profile?.role === 'admin' && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded uppercase tracking-tighter shrink-0">Admin</span>
          )}
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors shrink-0"
            aria-label="Đăng xuất"
          >
            <LogOut size={20} />
          </button>
        </div>
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
          const isActive = tab.id === 'home' ? isHomeActive : activeTab === 'about';
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
              {tab.id === 'home' && unreadCount > 0 && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white z-20 shadow-sm animate-bounce" />
              )}
              {tab.id === 'home' && profile?.role === 'admin' && pendingComplaintsCount > 0 && (
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
