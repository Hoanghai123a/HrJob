import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, collection, query, getDocs, addDoc, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Complaint, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { MessageSquare, Phone, MapPin, User, Send, Clock, CheckCircle2, History, Inbox, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function ComplaintsPage() {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showUserHistory, setShowUserHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: profile?.fullName || '',
    company: profile?.company || '',
    phone: profile?.phoneNumber || '',
    content: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || profile.fullName || '',
        company: prev.company || profile.company || '',
        phone: prev.phone || profile.phoneNumber || ''
      }));
    }
  }, [profile]);

  const fetchComplaints = async () => {
    if (!profile) return;
    try {
      let q;
      if (profile.role === 'admin') {
        q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
      } else {
        q = query(
          collection(db, 'complaints'), 
          where('userId', '==', profile.uid),
          orderBy('createdAt', 'desc')
        );
      }
      const snap = await getDocs(q);
      let data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Complaint));
      
      setComplaints(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) fetchComplaints();
    else setLoading(false);
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'complaints'), {
        ...formData,
        userId: profile.uid,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      setSubmitted(true);
      setFormData({ 
        name: profile.fullName || '', 
        company: profile.company || '', 
        phone: profile.phoneNumber || '', 
        content: '' 
      });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'complaints');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateDoc(doc(db, 'complaints', id), {
        status: 'completed'
      });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'completed' } : c));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'complaints');
    }
  };

  if (profile?.role === 'admin') {
    const filteredComplaints = complaints.filter(c => (c.status || 'pending') === activeTab);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Khiếu nại</h2>
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
            <button 
              onClick={() => setActiveTab('pending')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'pending' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Inbox size={14} />
              Đang xử lý
            </button>
            <button 
              onClick={() => setActiveTab('completed')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'completed' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <History size={14} />
              Lịch sử
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {filteredComplaints.map((item) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={item.id} 
              className={cn(
                "bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5",
                item.status === 'completed' && "opacity-75 grayscale-[0.5]"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                    <User size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-900 text-lg tracking-tight">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1 bg-slate-50 w-fit px-2 py-0.5 rounded-full border border-slate-100">
                      <Clock size={12} />
                      {item.createdAt?.seconds ? format(item.createdAt.toDate(), 'HH:mm dd/MM/yyyy') : ''}
                    </p>
                  </div>
                </div>
                {item.status !== 'completed' ? (
                  <div className="flex gap-2">
                    <a 
                      href={`tel:${item.phone}`}
                      className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg shadow-slate-100"
                      title="Gọi điện"
                    >
                      <Phone size={18} />
                    </a>
                    <button 
                      onClick={() => handleComplete(item.id)}
                      className="bg-emerald-500 text-white p-3 rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100 outline-none"
                      title="Hoàn tất"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 border border-emerald-100">
                    <CheckCircle2 size={14} />
                    Đã xử lý
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 text-sm text-slate-600 leading-relaxed font-medium border border-slate-100 shadow-inner">
                {item.content}
              </div>

              <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-500" /> {item.company}</span>
                <span className="text-slate-200">|</span>
                <span>SĐT: {item.phone}</span>
              </div>
            </motion.div>
          ))}
          {filteredComplaints.length === 0 && !loading && (
            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
              <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                {activeTab === 'pending' ? 'Chưa có khiếu nại đang chờ.' : 'Lịch sử khiếu nại trống.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-600 px-[20px] pt-[15px] pb-[15px] rounded-[20px] text-white space-y-3 relative overflow-hidden shadow-2xl shadow-blue-100 mb-[15px]">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight">Gửi khiếu nại</h2>
          <p className="text-blue-100 text-sm font-medium opacity-80 leading-relaxed">Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện dịch vụ tốt hơn.</p>
        </div>
        <MessageSquare size={160} className="absolute -right-8 -bottom-8 text-white/10" />
      </div>

      <div className="flex gap-2 mb-[10px]">
        <button 
          onClick={() => setShowUserHistory(false)}
          className={cn(
            "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
            !showUserHistory 
              ? "bg-blue-600 border-blue-600 text-white shadow-blue-100" 
              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
          )}
        >
          Tạo khiếu nại mới
        </button>
        <button 
          onClick={() => {
            setShowUserHistory(true);
            fetchComplaints();
          }}
          className={cn(
            "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm flex items-center justify-center gap-2",
            showUserHistory 
              ? "bg-blue-600 border-blue-600 text-white shadow-blue-100" 
              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
          )}
        >
          <History size={14} />
          Lịch sử khiếu nại
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!showUserHistory ? (
          <motion.form 
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit} 
            className="bg-white px-[20px] pt-[15px] pb-[15px] rounded-[20px] border border-slate-200 shadow-sm space-y-6"
          >
            <div className="space-y-1.5 mb-[5px]">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung khiếu nại</label>
              <textarea 
                required
                rows={5}
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner placeholder:text-slate-300 leading-relaxed min-h-[150px]"
                placeholder="Nhập chi tiết khiếu nại của bạn tại đây..."
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPersonalInfo(!showPersonalInfo)}
                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors py-2 px-1"
              >
                <Info size={14} />
                Thông tin của tôi
                {showPersonalInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <AnimatePresence>
                {showPersonalInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                        <input 
                          readOnly
                          value={formData.name}
                          className="w-full bg-slate-50/50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 cursor-not-allowed shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                        <input 
                          readOnly
                          value={formData.phone}
                          className="w-full bg-slate-50/50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 cursor-not-allowed shadow-inner font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên công ty</label>
                      <input 
                        readOnly
                        value={formData.company}
                        className="w-full bg-slate-50/50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-500 cursor-not-allowed shadow-inner"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium italic ml-1">* Bạn không thể thay đổi thông tin này vì nó được lấy từ tài khoản của bạn.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              disabled={isSubmitting}
              className={cn(
                "w-full py-5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl uppercase tracking-widest text-sm",
                submitted ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
              )}
            >
              {isSubmitting ? 'Đang gửi...' : submitted ? (
                <>
                  <CheckCircle2 size={24} />
                  Gửi thành công
                </>
              ) : (
                <>
                  <Send size={20} />
                  Gửi yêu cầu
                </>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {complaints.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                <Inbox size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Bạn chưa gửi khiếu nại nào.</p>
              </div>
            ) : (
              complaints.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1 bg-slate-50 w-fit px-2 py-0.5 rounded-full border border-slate-100">
                        <Clock size={12} />
                        {item.createdAt?.seconds ? format(item.createdAt.toDate(), 'HH:mm dd/MM/yyyy') : 'Vừa xong'}
                      </p>
                    </div>
                    {item.status === 'completed' ? (
                      <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest flex items-center gap-1.5 border border-emerald-100">
                        <CheckCircle2 size={12} />
                        Đã xử lý
                      </div>
                    ) : (
                      <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest flex items-center gap-1.5 border border-amber-100">
                        <Clock size={12} />
                        Đang chờ
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-600 leading-relaxed font-medium border border-slate-100 italic">
                    "{item.content}"
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
