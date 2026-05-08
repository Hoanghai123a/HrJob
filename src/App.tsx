import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProfilePage from './pages/ProfilePage';
import AttendancePage from './pages/AttendancePage';
import InstructionsPage from './pages/InstructionsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import JobsPage from './pages/JobsPage';
import { LogIn, User as UserIcon, Lock } from 'lucide-react';
import { motion } from 'motion/react';

function AppContent() {
  const { user, profile, loading, signIn } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 max-w-md mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">HR PRO & Work...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      setIsLoggingIn(true);
      try {
        await signIn(username, password);
      } catch (error: any) {
        setLoginError('Tài khoản hoặc mật khẩu không chính xác.');
      } finally {
        setIsLoggingIn(false);
      }
    };

    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 max-w-md mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full border border-slate-100"
        >
          <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100 overflow-hidden p-2 border border-slate-100">
            <img src="/logo.png" alt="HR Pro Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter uppercase text-center">HR PRO</h1>
          <p className="text-slate-400 text-sm mb-8 font-medium">Vui lòng đăng nhập để tiếp tục</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Tên đăng nhập (Vd: admin)"
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                />
              </div>
            </div>

            {loginError && <p className="text-red-500 text-xs font-bold px-2">{loginError}</p>}

            <button
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              {isLoggingIn ? 'Đang thực hiện...' : 'Đăng nhập'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              *Tài khoản mặc định: admin / admin123<br/>
              *Hãy kích hoạt Email/Password Provider trong Firebase Console
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfilePage />;
      case 'attendance': return <AttendancePage />;
      case 'instructions': return <InstructionsPage />;
      case 'complaints': return <ComplaintsPage />;
      case 'jobs': return <JobsPage />;
      default: return <JobsPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
