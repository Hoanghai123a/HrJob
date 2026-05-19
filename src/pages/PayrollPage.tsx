import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Download, 
  Search, 
  Calendar as CalendarIcon,
  Filter,
  FileSpreadsheet,
  Plus,
  X,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Building2,
  User as UserIcon,
  History,
  AlertCircle,
  CheckCircle2,
  Info,
  Archive,
  ArrowDownToLine,
  FileDown,
  Sun,
  Moon,
  Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { pb } from '../lib/pocketbase';
import { PayrollRecord, UserProfile, OperationType, PayrollBatch } from '../types';
import { handlePBError } from '../lib/pbUtils';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, getDay } from 'date-fns';
import { cn } from '../lib/utils';

export default function PayrollPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'attendance' | 'payroll'>('attendance');
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [uploadMonth, setUploadMonth] = useState(new Date().toISOString().substring(0, 7));
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState({ success: 0, failed: 0 });
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    setUploadMonth(selectedMonth);
  }, [showUploadModal]);

  useEffect(() => {
    fetchData();
  }, [profile, activeTab, selectedMonth]);

  const fetchCompanies = async () => {
    try {
      const data = await pb.collection('settings').getOne('company');
      if (data) {
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      if (isAdmin) {
        const data = await pb.collection('payrollBatches').getFullList({
          filter: `type = "${activeTab}" && month = "${selectedMonth}"`,
          sort: '-created'
        });
        setBatches(data as any);
      } else {
        const data = await pb.collection('payrollRecords').getFullList({
          filter: `userId = "${profile.id}" && type = "${activeTab}" && month = "${selectedMonth}"`,
          sort: '-created'
        });
        setRecords(data as any);
      }
    } catch (error) {
      handlePBError(error, OperationType.GET, isAdmin ? 'payrollBatches' : 'payrollRecords');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    let headers: string[] = [];
    
    if (activeTab === 'payroll') {
      headers = ['MaNV', 'HoTen', 'LCB', 'NgayVao', 'HS_100%', 'HS_150%', 'HS_200%', 'PC_Chuyên cần', 'PC_Đời sống', 'TR_Ứng', 'TR_Tiền ăn'];
    } else {
      headers = ['MaNV', 'HoTen'];
      // Add summary HS headers first or last? User says admin sends them. Let's add them at the beginning for visibility or end.
      // Usually summary is at the end.
      for (let i = 1; i <= 31; i++) {
        headers.push(`D${i}_HC`, `D${i}_TC`, `D${i}_Ca`, `D${i}_Le`);
      }
      headers.push('HS_100%', 'HS_150%', 'HS_200%', 'HS_210%', 'HS_270%', 'HS_300%', 'HS_390%');
    }
    
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Template_${activeTab === 'payroll' ? 'BangLuong' : 'BangCong'}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) {
      if (!selectedCompany) alert('Vui lòng chọn công ty trước khi tải lên');
      return;
    }

    setUploading(true);
    setUploadStats({ success: 0, failed: 0 });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const base64File = btoa(bstr);
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let users;
        try {
          users = await pb.collection('users').getFullList({
            filter: `company = "${selectedCompany}"`
          });
        } catch (error) {
          handlePBError(error, OperationType.GET, 'users');
          return;
        }
        
        const userMap = new Map<string, any>(users.map(u => [u.employeeId, u]));

        let successCount = 0;
        let failedCount = 0;

        // Create Batch first to get ID
        const batchRecord = await pb.collection('payrollBatches').create({
          companyName: selectedCompany,
          month: uploadMonth,
          type: activeTab,
          fileName: file.name,
          fileData: base64File,
          recordCount: 0
        });

        for (const row of data as any[]) {
          const empId = String(row['MaNV'] || row['Mã NV'] || '').trim();
          const targetUser = userMap.get(empId);

          if (!targetUser) {
            failedCount++;
            continue;
          }

          try {
            await pb.collection('payrollRecords').create({
              userId: targetUser.id,
              employeeId: empId,
              fullName: targetUser.fullName || row['HoTen'] || row['Họ tên'] || '',
              companyName: selectedCompany,
              month: uploadMonth,
              type: activeTab,
              data: row,
              batchId: batchRecord.id,
              version: 1
            });
            successCount++;
          } catch (error) {
            handlePBError(error, OperationType.WRITE, 'payrollRecords');
          }
        }

        setUploadStats({ success: successCount, failed: failedCount });

        // Update record count in batch
        await pb.collection('payrollBatches').update(batchRecord.id, {
          recordCount: successCount
        });

        fetchData();
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Lỗi xử lý file Excel');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadBatchFile = (batch: PayrollBatch) => {
    const binaryString = atob(batch.fileData);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = batch.fileName;
    link.click();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Công lương</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            {isAdmin ? 'Quản lý gửi bảng công & lương' : 'Tra cứu bảng công & lương cá nhân'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={downloadTemplate}
              className="w-12 h-12 bg-white border border-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
              title="Tải bảng mẫu"
            >
              <FileDown size={20} />
            </button>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-95 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-3xl border border-slate-100 flex shadow-sm mx-1">
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${activeTab === 'attendance' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <CalendarIcon size={16} /> Bảng công
        </button>
        <button 
          onClick={() => setActiveTab('payroll')}
          className={`flex-1 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${activeTab === 'payroll' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <CreditCard size={16} /> Bảng lương
        </button>
      </div>

      {/* Filters (User only Month, Admin History Header) */}
      <div className="px-1">
        <div className="relative group">
          <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
          />
        </div>
      </div>

      {/* Records/Batches List */}
      <div className="space-y-4 px-1">
        {isAdmin && (
          <div className="flex items-center gap-2 mb-2 ml-4">
             <History size={14} className="text-slate-400" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch sử lượt gửi</span>
          </div>
        )}
        
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
          </div>
        ) : isAdmin ? (
          // Admin View: List Batches
          batches.length > 0 ? (
            batches.map((batch, idx) => (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${activeTab === 'payroll' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                    <Archive size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{batch.month} • {batch.created ? format(new Date(batch.created), 'HH:mm') : ''}</span>
                      <button 
                        onClick={() => downloadBatchFile(batch)}
                        className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 rounded-xl transition-all"
                        title="Tải lại file"
                      >
                        <ArrowDownToLine size={18} />
                      </button>
                    </div>
                    <h4 className="font-black text-slate-900 text-lg tracking-tight truncate mt-1">
                      {batch.companyName}
                    </h4>
                    <div className="flex items-center gap-3 mt-2">
                       <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                        <UserIcon size={10} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{batch.recordCount || 'N/A'} người nhận</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                        <FileText size={10} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[120px]">{batch.fileName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <History size={32} className="text-slate-200 mx-auto mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Chưa có lượt gửi nào</p>
            </div>
          )
        ) : (
          // User View: List individual records
          records.length > 0 ? (
            records.map((record, idx) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedRecord(record)}
                className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-emerald-200 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${activeTab === 'payroll' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    {activeTab === 'payroll' ? <CreditCard size={24} /> : <FileText size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{record.month} • Lần {record.version}</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                    <h4 className="font-black text-slate-900 text-lg tracking-tight truncate mt-1">
                      {record.fullName}
                    </h4>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                        <TrendingUp size={10} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">ID: {record.employeeId}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                        <Building2 size={10} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[80px]">{record.companyName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <AlertCircle size={32} className="text-slate-200 mx-auto mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Chưa nhận được dữ liệu tháng này</p>
            </div>
          )
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setShowUploadModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Gửi {activeTab === 'payroll' ? 'Lương' : 'Công'}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Chọn công ty & file Excel</p>
                  </div>
                  <button 
                    onClick={() => setShowUploadModal(false)}
                    className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {uploading ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-sm font-black text-slate-900 uppercase italic">Đang đồng bộ dữ liệu...</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 animate-pulse">Vui lòng không thoát trình duyệt</p>
                  </div>
                ) : uploadStats.success > 0 || uploadStats.failed > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
                        <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-3" />
                        <p className="text-2xl font-black text-emerald-600 tracking-tighter leading-none">{uploadStats.success}</p>
                        <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mt-1">Đã gửi</p>
                      </div>
                      <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-center">
                        <AlertCircle size={32} className="text-rose-600 mx-auto mb-3" />
                        <p className="text-2xl font-black text-rose-600 tracking-tighter leading-none">{uploadStats.failed}</p>
                        <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest mt-1">Lỗi ID</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowUploadModal(false)}
                      className="w-full bg-slate-900 py-5 text-white rounded-[1.75rem] font-black uppercase tracking-widest text-xs active:scale-[0.98] transition-all"
                    >
                      Xong
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CÔNG TY ĐÍCH</p>
                         <select 
                           value={selectedCompany}
                           onChange={e => setSelectedCompany(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-600 transition-all font-mono"
                         >
                           <option value="">-- CHỌN CÔNG TY --</option>
                           {companies.map(c => (
                             <option key={c} value={c}>{c.toUpperCase()}</option>
                           ))}
                         </select>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">THÁNG DỮ LIỆU</p>
                        <div className="relative">
                          <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="month"
                            value={uploadMonth}
                            onChange={e => setUploadMonth(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <label className={`block ${!selectedCompany ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                      <div className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-100/50 hover:border-emerald-200 transition-all group">
                        <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          <FileSpreadsheet size={28} />
                        </div>
                        <p className="text-sm font-black text-slate-700 uppercase italic">Chọn tệp dữ liệu</p>
                      </div>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Record Detail Modal (Remains same) */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 40 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${selectedRecord.type === 'payroll' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                      {selectedRecord.type === 'payroll' ? <CreditCard size={24} /> : <FileText size={24} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedRecord.type === 'payroll' ? 'Phiếu lương' : 'Bảng công'}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tháng: {selectedRecord.month} • Phiên bản {selectedRecord.version}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content Content Content */}
              <div className="flex-1 overflow-y-auto p-8 pt-4">
                {selectedRecord.type === 'attendance' ? (
                  <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-4 rounded-[1.5rem] shadow-lg mb-4 space-y-2">
                      {/* Row 1: Primary Totals */}
                      <div className="flex flex-wrap gap-2">
                        <div className="flex-1 min-w-[70px] bg-white/5 py-2 px-3 rounded-xl border border-white/5">
                          <p className="text-[7px] text-slate-500 font-black uppercase tracking-tighter">Tổng HC</p>
                          <p className="text-xs font-black">{Object.entries(selectedRecord.data).reduce((acc, [k, v]) => k.includes('_HC') ? acc + Number(v || 0) : acc, 0)}h</p>
                        </div>
                        <div className="flex-1 min-w-[70px] bg-white/5 py-2 px-3 rounded-xl border border-white/5">
                          <p className="text-[7px] text-slate-500 font-black uppercase tracking-tighter">Tổng TC</p>
                          <p className="text-xs font-black text-blue-400">{Object.entries(selectedRecord.data).reduce((acc, [k, v]) => k.includes('_TC') ? acc + Number(v || 0) : acc, 0)}h</p>
                        </div>
                        <div className="flex-1 min-w-[70px] bg-white/5 py-2 px-3 rounded-xl border border-white/5">
                          <p className="text-[7px] text-slate-500 font-black uppercase tracking-tighter">Ngày Lễ</p>
                          <p className="text-xs font-black text-rose-400">{Object.entries(selectedRecord.data).reduce((acc, [k, v]) => k.includes('_Le') && (String(v).toUpperCase() === 'L') ? acc + 1 : acc, 0)}</p>
                        </div>
                      </div>

                      {/* Row 2: Sorted Coefficients */}
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedRecord.data)
                          .filter(([k]) => k.startsWith('HS_'))
                          .sort((a, b) => {
                            const valA = parseInt(a[0].replace('HS_', '').replace('%', ''));
                            const valB = parseInt(b[0].replace('HS_', '').replace('%', ''));
                            return valA - valB;
                          })
                          .map(([key, value]) => (
                            <div key={key} className="flex-1 min-w-[70px] bg-white/10 py-2 px-3 rounded-xl border border-white/10">
                              <p className="text-[7px] text-emerald-500/60 font-black uppercase tracking-tighter">{key.replace('HS_', '')}</p>
                              <p className="text-xs font-black text-emerald-400">{Number(value || 0)}h</p>
                            </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="grid grid-cols-7 gap-px bg-slate-50">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                          <div key={d} className="bg-white text-center py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                        ))}
                        
                        {(() => {
                          const monthDate = parseISO(selectedRecord.month + '-01');
                          const days = eachDayOfInterval({
                            start: startOfMonth(monthDate),
                            end: endOfMonth(monthDate)
                          });
                          const startDay = getDay(startOfMonth(monthDate));
                          
                          return (
                            <>
                              {Array.from({ length: startDay }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-slate-50/20 h-16" />
                              ))}
                              {days.map(day => {
                                const d = format(day, 'd');
                                const hc = Number(selectedRecord.data[`D${d}_HC`] || 0);
                                const tc = Number(selectedRecord.data[`D${d}_TC`] || 0);
                                const isNight = String(selectedRecord.data[`D${d}_Ca`] || '').toUpperCase() === 'D';
                                const isHoliday = String(selectedRecord.data[`D${d}_Le`] || '').toUpperCase() === 'L';
                                const isSun = getDay(day) === 0;
                                const hasWork = hc > 0 || tc > 0;

                                return (
                                  <div key={d} className={cn("bg-white h-16 p-1 flex flex-col items-center justify-between border-slate-50 border-r border-b last:border-r-0 group", hasWork && "bg-emerald-50/30")}>
                                    <span className={cn("text-[9px] font-black", isSun ? "text-rose-400" : "text-slate-400")}>{d}</span>
                                    {hasWork && (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <div className="flex gap-0.5">
                                          {isNight ? <Moon size={8} className="text-indigo-500" /> : <Sun size={8} className="text-amber-500" />}
                                          {isHoliday && <Star size={8} className="text-rose-500 fill-rose-500" />}
                                        </div>
                                        <span className="text-[9px] font-black text-slate-900">{hc + tc}h</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Section 1: Personal Info */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UserIcon size={14} className="text-slate-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thông tin nhân viên</h4>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-md">{selectedRecord.employeeId}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{selectedRecord.companyName}</span>
                          </div>
                          <h3 className="text-base font-black tracking-tighter uppercase italic text-slate-900 truncate mb-1">{selectedRecord.fullName}</h3>
                          <div className="flex items-center gap-1.5">
                             <CalendarIcon size={12} className="text-emerald-600" />
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                               Ngày vào: {(() => {
                                 const rawDate = selectedRecord.data['NgayVao'] || selectedRecord.data['Ngày vào'];
                                 if (!rawDate) return 'N/A';
                                 try {
                                   // Handle Excel serial date or ISO string
                                   const date = typeof rawDate === 'number' 
                                     ? new Date((rawDate - 25569) * 86400 * 1000) 
                                     : new Date(String(rawDate));
                                   return format(date, 'dd - MM - yyyy');
                                 } catch (e) {
                                   return String(rawDate);
                                 }
                               })()}
                             </span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Section 2: Hours & Coefficients */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon size={16} className="text-emerald-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Lương theo hệ số</h4>
                      </div>
                      <div className="space-y-1">
                        {(() => {
                          const lcb = parseFloat(selectedRecord.data['LCB'] || 0);
                          const ratePerHour = lcb / 26 / 8;
                          let totalSalary = 0;
                          
                          const hsEntries = Object.entries(selectedRecord.data).filter(([k]) => k.startsWith('HS_'));
                          
                          return (
                            <>
                              {hsEntries.map(([key, hours]) => {
                                const hStr = key.replace('HS_', '').replace('%', '');
                                const coefficient = parseFloat(hStr) / 100;
                                const hrs = parseFloat(String(hours || 0));
                                const amount = ratePerHour * coefficient * hrs;
                                totalSalary += amount;
                                
                                return (
                                  <div key={key} className="flex flex-col py-3 border-b border-slate-50 group">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black uppercase text-slate-500">{key.replace('HS_', 'Hệ số ')}</span>
                                      <span className="text-[14px] font-black text-slate-900 italic tracking-tighter">{Math.round(amount).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Số giờ: {hrs}</span>
                                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Đơn giá: {Math.round(ratePerHour * coefficient).toLocaleString('vi-VN')}</span>
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="flex justify-between py-4 border-t-2 border-slate-100 mt-2">
                                <span className="text-[10px] font-black uppercase text-slate-900">Tổng lương</span>
                                <span className="text-lg font-black text-emerald-600 italic tracking-tighter">{Math.round(totalSalary).toLocaleString('vi-VN')} đ</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </section>

                    {/* Section 3: Allowances */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-emerald-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Các khoản phụ cấp</h4>
                      </div>
                      <div className="space-y-1">
                        {(() => {
                          const pcEntries = Object.entries(selectedRecord.data).filter(([k]) => k.startsWith('PC_'));
                          const totalPC = pcEntries.reduce((sum, [_, v]) => sum + parseFloat(String(v || 0)), 0);
                          
                          return (
                            <>
                              {pcEntries.map(([key, value]) => (
                                <div key={key} className="flex justify-between py-2 border-b border-slate-50">
                                  <span className="text-[10px] font-black uppercase text-slate-400">{key.replace('PC_', '')}</span>
                                  <span className="text-[13px] font-black text-slate-900 italic tracking-tighter">{Math.round(parseFloat(String(value || 0))).toLocaleString('vi-VN')} đ</span>
                                </div>
                              ))}
                              <div className="flex justify-between py-4 border-t-2 border-slate-100 mt-2">
                                <span className="text-[10px] font-black uppercase text-slate-900">Tổng phụ cấp</span>
                                <span className="text-lg font-black text-emerald-600 italic tracking-tighter">{Math.round(totalPC).toLocaleString('vi-VN')} đ</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </section>

                    {/* Section 4: Deductions */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Archive size={16} className="text-rose-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600">Các khoản trừ</h4>
                      </div>
                      <div className="space-y-1">
                        {(() => {
                          const trEntries = Object.entries(selectedRecord.data).filter(([k]) => k.startsWith('TR_'));
                          const totalTR = trEntries.reduce((sum, [_, v]) => sum + parseFloat(String(v || 0)), 0);
                          
                          return (
                            <>
                              {trEntries.map(([key, value]) => (
                                <div key={key} className="flex justify-between py-2 border-b border-slate-50">
                                  <span className="text-[10px] font-black uppercase text-slate-400">{key.replace('TR_', '')}</span>
                                  <span className="text-[13px] font-black text-rose-600 italic tracking-tighter">-{Math.round(parseFloat(String(value || 0))).toLocaleString('vi-VN')} đ</span>
                                </div>
                              ))}
                              <div className="flex justify-between py-4 border-t-2 border-slate-100 mt-2">
                                <span className="text-[10px] font-black uppercase text-slate-900">Tổng các khoản trừ</span>
                                <span className="text-lg font-black text-rose-600 italic tracking-tighter">-{Math.round(totalTR).toLocaleString('vi-VN')} đ</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </section>

                    {/* Final Result */}
                    <section className="pt-6 border-t-4 border-slate-900">
                       {(() => {
                          const lcb = parseFloat(selectedRecord.data['LCB'] || 0);
                          const ratePerHour = lcb / 26 / 8;
                          const hsEntries = Object.entries(selectedRecord.data).filter(([k]) => k.startsWith('HS_'));
                          const totalSalary = hsEntries.reduce((sum, [key, hours]) => {
                            const coefficient = parseFloat(key.replace('HS_', '').replace('%', '')) / 100;
                            return sum + (ratePerHour * coefficient * parseFloat(String(hours || 0)));
                          }, 0);
                          
                          const pcEntries = Object.entries(selectedRecord.data).filter(([k]) => k.startsWith('PC_'));
                          const totalPC = pcEntries.reduce((sum, [_, v]) => sum + parseFloat(String(v || 0)), 0);
                          
                          const trEntries = Object.entries(selectedRecord.data).filter(([k]) => k.startsWith('TR_'));
                          const totalTR = trEntries.reduce((sum, [_, v]) => sum + parseFloat(String(v || 0)), 0);
                          
                          const actual = totalSalary + totalPC - totalTR;
                          
                          return (
                            <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-100">
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">THỰC NHẬN (VIETNAM DONG)</p>
                               <div className="flex items-baseline gap-2">
                                  <span className="text-4xl font-black italic tracking-tighter">{Math.round(actual).toLocaleString('vi-VN')}</span>
                                  <span className="text-sm font-black uppercase">VND</span>
                               </div>
                            </div>
                          );
                       })()}
                    </section>
                  </div>
                )}

                <div className="p-8 bg-blue-50 mt-12 rounded-3xl border border-blue-100 flex gap-4">
                   <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                      <Info size={20} className="text-blue-600" />
                   </div>
                   <p className="text-[10px] font-bold text-blue-600/80 leading-relaxed uppercase tracking-widest">
                     Nếu có bất kỳ sai sót nào trong bảng công hoặc bảng lương, vui lòng liên hệ bộ phận nhân sự hoặc gửi khiếu nại trực tiếp trên ứng dụng.
                   </p>
                </div>
              </div>

              {/* Action */}
              <div className="p-8 border-t border-slate-100 bg-slate-50 shadow-inner">
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="w-full py-5 bg-slate-900 fill-white text-white rounded-[1.75rem] font-black uppercase tracking-widest text-xs active:scale-[0.98] transition-all hover:bg-slate-800 shadow-xl shadow-slate-200"
                >
                  Xác nhận thông tin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
