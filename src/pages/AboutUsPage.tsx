import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  FileText, 
  Info, 
  ShieldCheck, 
  Award, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  ExternalLink,
  Image as ImageIcon,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { CompanyDocument } from '../types';

export default function AboutUsPage() {
  const { companySettings, updateCompanySettings } = useApp();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState(companySettings);
  const [selectedDoc, setSelectedDoc] = useState<CompanyDocument | null>(null);

  const handleSave = async () => {
    await updateCompanySettings(editedSettings);
    setIsEditing(false);
  };

  const handleAddDocument = () => {
    const newDoc: CompanyDocument = {
      id: Date.now().toString(),
      name: 'Tài liệu mới',
      imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=60',
      updatedAt: new Date().toISOString()
    };
    setEditedSettings({
      ...editedSettings,
      documents: [...(editedSettings.documents || []), newDoc]
    });
  };

  const handleRemoveDocument = (id: string) => {
    setEditedSettings({
      ...editedSettings,
      documents: editedSettings.documents?.filter(d => d.id !== id)
    });
  };

  const handleOpenLink = (url: string | undefined) => {
    if (!url) return;
    window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-8 relative px-4"
      >
        {isAdmin && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute top-0 right-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Edit2 size={20} />
          </button>
        )}

        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-blue-100 flex items-center justify-center p-4 border border-slate-100 mx-auto mb-6">
          <img 
            src={companySettings.logoUrl} 
            alt={companySettings.name} 
            className="w-full h-full object-contain"
          />
        </div>
        
        {isEditing ? (
          <div className="space-y-4 max-w-sm mx-auto">
            <input 
              type="text"
              value={editedSettings.name || ''}
              onChange={e => setEditedSettings({...editedSettings, name: e.target.value})}
              className="w-full text-center text-3xl font-black text-slate-900 tracking-tighter uppercase bg-slate-50 border border-slate-100 rounded-xl p-3"
              placeholder="Tên công ty"
            />
            <input 
              type="text"
              value={editedSettings.logoUrl || ''}
              onChange={e => setEditedSettings({...editedSettings, logoUrl: e.target.value})}
              className="w-full text-center text-xs text-slate-500 font-medium bg-slate-50 border border-slate-100 rounded-xl p-3"
              placeholder="Link ảnh logo"
            />
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
              {companySettings.name}
            </h2>
            <p className="text-slate-500 font-medium text-sm mt-2">Đồng hành cùng sự phát triển của bạn</p>
          </>
        )}
      </motion.div>

      {/* Main Info Section */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 ml-4">Liên hệ chi tiết</h3>
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 space-y-6 shadow-sm mx-1">
          {/* Address */}
          <div className="flex items-start gap-4">
            <button 
              onClick={() => handleOpenLink(companySettings.mapLink)}
              className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 group transition-all active:scale-95"
            >
              <MapPin size={22} className="text-blue-600 group-hover:scale-110 transition-transform" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1">
                Địa chỉ
                {companySettings.mapLink && <ExternalLink size={10} />}
              </p>
              {isEditing ? (
                <div className="space-y-2">
                  <input 
                    value={editedSettings.address || ''}
                    onChange={e => setEditedSettings({...editedSettings, address: e.target.value})}
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 rounded-lg p-2"
                    placeholder="Địa chỉ"
                  />
                  <input 
                    value={editedSettings.mapLink || ''}
                    onChange={e => setEditedSettings({...editedSettings, mapLink: e.target.value})}
                    className="w-full text-xs text-blue-600 bg-slate-50 rounded-lg p-2 font-mono"
                    placeholder="Link Google Maps"
                  />
                </div>
              ) : (
                <button 
                  onClick={() => handleOpenLink(companySettings.mapLink)}
                  className="text-sm font-bold text-slate-700 leading-relaxed text-left hover:text-blue-600 transition-colors block w-full truncate"
                >
                  {companySettings.address || 'KCN Khai Quang, Vĩnh Yên, Vĩnh Phúc'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Phone */}
            <div className="flex items-start gap-4">
              <a 
                href={`tel:${companySettings.phone}`}
                className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100 transition-all active:scale-95"
              >
                <Phone size={22} className="text-emerald-600" />
              </a>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Điện thoại</p>
                {isEditing ? (
                  <input 
                    value={editedSettings.phone || ''}
                    onChange={e => setEditedSettings({...editedSettings, phone: e.target.value})}
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 rounded-lg p-2 font-mono"
                  />
                ) : (
                  <a href={`tel:${companySettings.phone}`} className="text-sm font-bold text-slate-700 font-mono hover:text-emerald-600 transition-colors block w-full truncate">
                    {companySettings.phone || '0343 751 753'}
                  </a>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <a 
                href={`mailto:${companySettings.email}`}
                className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 transition-all active:scale-95"
              >
                <Mail size={22} className="text-indigo-600" />
              </a>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Email</p>
                {isEditing ? (
                  <input 
                    value={editedSettings.email || ''}
                    onChange={e => setEditedSettings({...editedSettings, email: e.target.value})}
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 rounded-lg p-2"
                  />
                ) : (
                  <a href={`mailto:${companySettings.email}`} className="text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors truncate block w-full">
                    {companySettings.email || 'contact@vrecruit.com'}
                  </a>
                )}
              </div>
            </div>

            {/* Website */}
            <div className="flex items-start gap-4">
              <button 
                onClick={() => handleOpenLink(companySettings.website)}
                className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100 transition-all active:scale-95"
              >
                <Globe size={22} className="text-amber-600" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Website</p>
                {isEditing ? (
                  <input 
                    value={editedSettings.website || ''}
                    onChange={e => setEditedSettings({...editedSettings, website: e.target.value})}
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 rounded-lg p-2"
                  />
                ) : (
                  <button 
                    onClick={() => handleOpenLink(companySettings.website)}
                    className="text-sm font-bold text-slate-700 hover:text-amber-600 transition-colors truncate block w-full text-left"
                  >
                    {companySettings.website || 'www.vrecruit.com'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats & Description Section */}
      <section className="space-y-4 px-1">
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Info size={26} className="text-blue-400" />
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <input 
                  value={editedSettings.stats?.workers || ''}
                  onChange={e => setEditedSettings({
                    ...editedSettings, 
                    stats: { ...editedSettings.stats!, workers: e.target.value }
                  })}
                  className="w-20 text-xs font-black text-center bg-white/10 rounded-lg p-2 text-white border border-white/10"
                  placeholder="SL"
                />
                <input 
                  value={editedSettings.stats?.partners || ''}
                  onChange={e => setEditedSettings({
                    ...editedSettings, 
                    stats: { ...editedSettings.stats!, partners: e.target.value }
                  })}
                  className="w-20 text-xs font-black text-center bg-white/10 rounded-lg p-2 text-white border border-white/10"
                  placeholder="Đối tác"
                />
              </div>
            )}
          </div>
          
          {isEditing ? (
            <textarea 
              value={editedSettings.description || ''}
              onChange={e => setEditedSettings({...editedSettings, description: e.target.value})}
              className="w-full text-sm font-medium leading-relaxed bg-white/10 rounded-2xl p-4 text-white border border-white/10 h-32"
            />
          ) : (
            <p className="text-sm font-medium leading-relaxed opacity-80">
              {companySettings.description || 'HR PRO là đơn vị hàng đầu trong việc kết nối và cung ứng nguồn nhân lực chất lượng cho các khu công nghiệp.'}
            </p>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-[1.75rem] border border-white/10">
              <p className="text-2xl font-black mb-1 tracking-tighter">
                {companySettings.stats?.workers || '5.000+'}
              </p>
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Lao động</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-[1.75rem] border border-white/10">
              <p className="text-2xl font-black mb-1 tracking-tighter">
                {companySettings.stats?.partners || '50+'}
              </p>
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Đối tác</p>
            </div>
          </div>
        </div>
      </section>

      {/* Documents Section */}
      <section className="space-y-4 px-1">
        <div className="flex items-center justify-between px-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tài liệu công ty</h3>
          {isEditing && (
            <button 
              onClick={handleAddDocument}
              className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
            >
              <Plus size={14} /> thêm
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {((isEditing ? editedSettings.documents : companySettings.documents) || []).length > 0 ? (
            ((isEditing ? editedSettings.documents : companySettings.documents) || []).map((doc, idx) => (
              <div 
                key={doc.id}
                className="group relative"
              >
                <div 
                  onClick={() => !isEditing && setSelectedDoc(doc)}
                  className={`bg-white p-4 rounded-[1.75rem] border border-slate-200 flex items-center gap-4 shadow-sm transition-all ${!isEditing ? 'hover:border-blue-200 hover:shadow-md cursor-pointer' : ''}`}
                >
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                    <img src={doc.imageUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input 
                          value={doc.name || ''}
                          onChange={e => {
                            const newDocs = [...editedSettings.documents!];
                            newDocs[idx].name = e.target.value;
                            setEditedSettings({...editedSettings, documents: newDocs});
                          }}
                          className="w-full text-sm font-bold text-slate-700 bg-slate-50 rounded-lg p-2"
                        />
                        <input 
                          value={doc.imageUrl || ''}
                          onChange={e => {
                            const newDocs = [...editedSettings.documents!];
                            newDocs[idx].imageUrl = e.target.value;
                            setEditedSettings({...editedSettings, documents: newDocs});
                          }}
                          className="w-full text-[10px] text-slate-400 bg-slate-50 rounded-lg p-2 font-mono"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-slate-900 truncate">{doc.name}</p>
                        <p className="text-[10px] font-medium text-slate-400">Xem tài liệu • PDF/Image</p>
                      </>
                    )}
                  </div>
                  {!isEditing && <ChevronRight size={18} className="text-slate-300 mr-1" />}
                </div>

                {isEditing && (
                  <button 
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg border-2 border-white hover:bg-red-600 transition-colors z-10"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-[1.75rem] border border-slate-100 border-dashed p-12 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={20} className="text-slate-300" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Chưa có tài liệu</p>
            </div>
          )}
        </div>
      </section>

      {/* Advance Conditions Section (Small addition) */}
      <section className="space-y-4 px-1">
        <div className="bg-amber-50/50 border border-amber-100/50 rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest">Quy định ứng lương</h3>
          </div>
          {isEditing ? (
            <textarea 
              value={editedSettings.advanceConditions || ''}
              onChange={e => setEditedSettings({...editedSettings, advanceConditions: e.target.value})}
              className="w-full text-xs font-bold text-amber-900 opacity-70 leading-relaxed bg-white/50 border border-amber-200 rounded-xl p-3 h-24"
            />
          ) : (
            <p className="text-xs font-bold text-amber-900 opacity-70 leading-relaxed">
              {companySettings.advanceConditions}
            </p>
          )}
        </div>
      </section>

      {/* Footer Branding */}
      <div className="text-center pt-8">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Phiên bản ứng dụng 2.5.0</p>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">{companySettings.name} © 2026</p>
      </div>

      {/* Edit Floating Action Button */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-24 left-0 right-0 px-6 z-50 pointer-events-none"
          >
            <div className="max-w-md mx-auto bg-slate-900 rounded-[2rem] p-3 shadow-2xl flex items-center gap-3 pointer-events-auto">
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditedSettings(companySettings);
                }}
                className="flex-1 py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-[1.5rem] flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all"
              >
                <X size={16} /> Hủy
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 transition-all"
              >
                <Save size={16} /> Lưu thay đổi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">{selectedDoc.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tài liệu công ty</p>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 bg-slate-50 flex items-center justify-center min-h-[300px]">
                <img 
                  src={selectedDoc.imageUrl} 
                  className="max-w-full max-h-[60vh] rounded-2xl shadow-lg object-contain"
                  alt={selectedDoc.name}
                />
              </div>
              <div className="p-6 bg-white text-center">
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                >
                  Đóng nội dung
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
