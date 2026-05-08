import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Instruction, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { Plus, Edit2, Trash2, Info, CheckCircle, AlertCircle, HelpCircle, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ICON_MAP = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  check: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  alert: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  help: { icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
};

export default function InstructionsPage() {
  const { profile } = useAuth();
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Instruction> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInstructions = async () => {
    try {
      const snap = await getDocs(collection(db, 'instructions'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Instruction));
      setInstructions(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'instructions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructions();
  }, []);

  const handleSave = async () => {
    if (!editing?.title || !editing?.content) return;
    try {
      const data = {
        title: editing.title,
        content: editing.content,
        icon: editing.icon || 'info',
        fontSize: editing.fontSize || 14
      };
      if (editing.id) {
        await updateDoc(doc(db, 'instructions', editing.id), data);
      } else {
        await addDoc(collection(db, 'instructions'), data);
      }
      setEditing(null);
      fetchInstructions();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'instructions');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa hướng dẫn này?')) return;
    try {
      await deleteDoc(doc(db, 'instructions', id));
      fetchInstructions();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `instructions/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hướng dẫn</h2>
        {profile?.role === 'admin' && (
          <button 
            onClick={() => setEditing({ icon: 'info', fontSize: 14 })}
            className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg flex items-center gap-2 font-black text-xs uppercase tracking-widest"
          >
            <Plus size={20} />
            Thêm mới
          </button>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-5"
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiêu đề</label>
              <input 
                value={editing.title || ''} 
                onChange={e => setEditing({ ...editing, title: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                placeholder="Nhập tiêu đề..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cỡ chữ (px)</label>
                <input 
                  type="number"
                  value={editing.fontSize || 14} 
                  onChange={e => setEditing({ ...editing, fontSize: Number(e.target.value) })}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Biểu tượng</label>
                <select 
                  value={editing.icon || 'info'} 
                  onChange={e => setEditing({ ...editing, icon: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner appearance-none"
                >
                  <option value="info">Thông tin</option>
                  <option value="check">Hoàn tất</option>
                  <option value="alert">Cảnh báo</option>
                  <option value="help">Trợ giúp</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung (Markdown)</label>
              <textarea 
                rows={5}
                value={editing.content || ''} 
                onChange={e => setEditing({ ...editing, content: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner leading-relaxed"
                placeholder="Nhập nội dung hướng dẫn..."
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => setEditing(null)}
                className="flex-1 py-5 font-black text-slate-400 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors uppercase tracking-widest text-xs"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                <Save size={20} />
                Lưu hướng dẫn
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {instructions.map((item) => {
          const config = ICON_MAP[item.icon as keyof typeof ICON_MAP] || ICON_MAP.info;
          const Icon = config.icon;
          const isExpanded = expandedId === item.id;

          return (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={item.id} 
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              className={cn(
                "bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative group cursor-pointer transition-all duration-300",
                isExpanded ? "shadow-xl border-blue-100" : "hover:shadow-md"
              )}
            >
              <div className="flex gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-500",
                  config.bg, config.color,
                  !isExpanded && "group-hover:scale-110"
                )}>
                  <Icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start pr-16">
                    <h3 className={cn(
                      "text-lg font-black text-slate-900 tracking-tight leading-tight transition-colors",
                      !isExpanded && "group-hover:text-blue-600"
                    )}>
                      {item.title}
                    </h3>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {isExpanded ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-slate-50"
                      >
                        <div 
                          className="text-slate-600 leading-relaxed font-medium markdown-container"
                          style={{ fontSize: `${item.fontSize}px` }}
                        >
                          <ReactMarkdown>{item.content}</ReactMarkdown>
                        </div>
                      </motion.div>
                    ) : (
                      <p className="text-slate-400 text-xs font-medium mt-1 truncate">
                        {item.content.split('\n')[0].replace(/[#*`]/g, '')}
                      </p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {profile?.role === 'admin' && (
                <div className="absolute top-6 right-6 flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(item);
                    }} 
                    className="p-2 text-slate-300 hover:text-blue-600 bg-slate-50 rounded-xl transition-colors"
                  >
                    <Edit2 size={16}/>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }} 
                    className="p-2 text-slate-300 hover:text-red-600 bg-slate-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
        {instructions.length === 0 && !loading && (
          <div className="text-center py-24 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
            <HelpCircle size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Chưa có hướng dẫn nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
