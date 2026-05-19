import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pb } from '../lib/pocketbase';
import { Complaint, OperationType } from '../types';
import { handlePBError } from '../lib/pbUtils';
import { MessageSquare, Phone, User, Send, Clock, CheckCircle2, History, Inbox, Check, ChevronDown, ChevronUp, Info, Building, Search, Plus } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: profile?.fullName || '',
    company: profile?.company || '',
    phone: profile?.phoneNumber || '',
    content: ''
  });

  useEffect(() => {
    fetchComplaints();
  }, [profile]);

  const fetchComplaints = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let data;
      if (profile.role === 'admin') {
        data = await pb.collection('complaints').getFullList({
          filter: 'type = "complaint"',
          sort: '-created'
        });
      } else {
        data = await pb.collection('complaints').getFullList({
          filter: `userId = "${profile.id}" && type = "complaint"`,
          sort: '-created'
        });
      }
      setComplaints(data as any);
    } catch (error) {
      handlePBError(error, OperationType.GET, 'complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);
    try {
      const record = await pb.collection('complaints').create({
        ...formData,
        type: 'complaint',
        userId: profile.id,
        status: 'pending'
      });
      
      setComplaints([record as any, ...complaints]);
      setSubmitted(true);
      setFormData({ 
        name: profile.fullName || '', 
        company: profile.company || '', 
        phone: profile.phoneNumber || '', 
        content: ''
      });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      handlePBError(error, OperationType.WRITE, 'complaints');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await pb.collection('complaints').update(id, {
        status: 'completed'
      });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'completed' } : c));
    } catch (error) {
      handlePBError(error, OperationType.UPDATE, 'complaints');
    }
  };

  if (profile?.role === 'admin') {
    const filteredComplaints = complaints.filter(c => {
      const matchStatus = (c.status || 'pending') === activeTab;
      const matchSearch = searchQuery === '' || 
        (c.name?.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (c.phone?.includes(searchQuery));
      return matchStatus && matchSearch;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quản lý Khiếu nại</h2>
          
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
            <button 
              onClick={() => setActiveTab('pending')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                activeTab === 'pending' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Inbox size={14} />
              Chờ ({complaints.filter(c => (c.status || 'pending') === 'pending').length})
            </button>
            <button 
              onClick={() => setActiveTab('completed')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                activeTab === 'completed' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <History size={14} />
              Đã xử lý ({complaints.filter(c => c.status === 'completed').length})
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tìm theo tên nld, sđt..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-6">
          {filteredComplaints.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shadow-inner">
                    <User size={24} />
                  </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg tracking-tight">
                        {item.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                        <Clock size={12} />
                        {item.created ? format(new Date(item.created), 'HH:mm dd/MM/yyyy') : 'Vừa xong'}
                      </p>
                    </div>
                </div>
                {item.status === 'pending' ? (
                  <div className="flex gap-2">
                    <a 
                      href={`tel:${item.phone}`}
                      className="p-3 text-emerald-600 bg-emerald-50 rounded-2xl hover:bg-emerald-100 transition-colors shadow-sm"
                    >
                      <Phone size={18} />
                    </a>
                    <button 
                      onClick={() => handleComplete(item.id)}
                      className="p-3 text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors shadow-xl shadow-blue-100"
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

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Building size={14} className="text-blue-500" />
                  {item.company}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Phone size={14} className="text-emerald-500" />
                  {item.phone}
                </div>
              </div>
            </div>
          ))}

          {filteredComplaints.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-200 border-dashed">
              <Inbox size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Không có khiếu nại nào</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User View
  return (
    <div className="space-y-6">
      <div className="bg-blue-600 px-[20px] pt-[15px] pb-[15px] rounded-[20px] text-white space-y-3 relative overflow-hidden shadow-2xl shadow-blue-100 mb-[15px]">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight">{showUserHistory ? 'Lịch sử khiếu nại' : 'Gửi khiếu nại'}</h2>
          <p className="text-blue-100 text-sm font-medium opacity-80 leading-relaxed">
            {showUserHistory ? 'Xem lại các khiếu nại bạn đã gửi.' : 'Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện dịch vụ.'}
          </p>
        </div>
        <MessageSquare size={160} className="absolute -right-8 -bottom-8 text-white/10" />
      </div>

      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setShowUserHistory(false)}
          className={cn(
            "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2",
            !showUserHistory 
              ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
          )}
        >
          <Plus size={14} className="mr-1 inline" /> Gửi khiếu nại mới
        </button>
        <button 
          onClick={() => setShowUserHistory(true)}
          className={cn(
            "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2",
            showUserHistory 
              ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
          )}
        >
          <History size={14} className="mr-1 inline" /> Lịch sử đã gửi
        </button>
      </div>

      {!showUserHistory ? (
        <motion.form 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit} 
          className="bg-white px-[20px] pt-[20px] pb-[20px] rounded-[2rem] border border-slate-200 shadow-sm space-y-6"
        >
          <div className="space-y-1.5 mb-[5px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung khiếu nại</label>
            <textarea 
              required
              rows={6}
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
              <Info size={14} /> Thông tin của tôi
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
                    <div className="bg-slate-50 p-4 rounded-xl space-y-1 border border-slate-100">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={10} /> Họ và tên</label>
                      <p className="text-xs font-black text-slate-800 uppercase">{formData.name}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-1 border border-slate-100">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Phone size={10} /> Số điện thoại</label>
                      <p className="text-xs font-bold text-slate-800 font-mono">{formData.phone}</p>
                    </div>
                  </div>
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
                <CheckCircle2 size={24} /> Gửi thành công
              </>
            ) : (
              <>
                <Send size={20} /> Gửi khiếu nại
              </>
            )}
          </button>
        </motion.form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {complaints.length > 0 ? (
            complaints.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      (item.status || 'pending') === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {(item.status || 'pending') === 'pending' ? 'Đang chờ' : 'Đã xử lý'}
                    </span>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1 bg-slate-50 w-fit px-2 py-0.5 rounded-full border border-slate-100">
                      <Clock size={12} />
                      {item.created ? format(new Date(item.created), 'HH:mm dd/MM/yyyy') : 'Vừa xong'}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-600 border border-slate-100 italic shadow-inner">
                  "{item.content}"
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-200 border-dashed">
              <Inbox size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Chưa có lịch sử khiếu nại</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
