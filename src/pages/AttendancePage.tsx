import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AttendanceRecord, OperationType, UserProfile } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, getDay, startOfWeek, addMonths, subMonths } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Moon, Sun, Star, Trash2, Wallet, FileDown, Search } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { calculateWageDetails, WageDetails } from '../lib/wageCalculator';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

export default function AttendancePage() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Form State
  const [shift, setShift] = useState<'day' | 'night'>('day');
  const [isHoliday, setIsHoliday] = useState(false);
  const [hoursHC, setHoursHC] = useState(8);
  const [hoursOT, setHoursOT] = useState(0);

  // Sync initial hours when profile loads
  useEffect(() => {
    if (profile) {
      setHoursHC(profile.defaultHC || 8);
      setHoursOT(profile.defaultOT || 0);
    }
  }, [profile]);

  const fetchRecords = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      let q;
      if (profile.role === 'admin') {
        // Admin fetches all records for the month
        q = query(
          collection(db, 'attendance'),
          where('date', '>=', start),
          where('date', '<=', end)
        );
        
        // Also fetch all users to match profiles
        const usersSnap = await getDocs(collection(db, 'users'));
        setAllUsers(usersSnap.docs.map(doc => doc.data() as UserProfile));
      } else {
        // User fetches only their own
        q = query(
          collection(db, 'attendance'),
          where('userId', '==', profile.uid),
          where('date', '>=', start),
          where('date', '<=', end)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AttendanceRecord));
      setRecords(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentDate, profile]);

  const handleSave = async () => {
    if (!profile || !selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const recordId = `${profile.uid}_${dateStr}`;
    const newRecord: AttendanceRecord = {
      userId: profile.uid,
      date: dateStr,
      shift,
      isHoliday,
      hoursHC,
      hoursOT
    };

    try {
      await setDoc(doc(db, 'attendance', recordId), newRecord);
      
      // Update local state immediately
      setRecords(prev => {
        const filtered = prev.filter(r => r.date !== dateStr);
        return [...filtered, newRecord];
      });
      
      setShowForm(false);
      fetchRecords(); // Still fetch to sync
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${recordId}`);
    }
  };

  const handleDelete = async (date: Date) => {
    if (!profile) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingRecord = records.find(r => r.date === dateStr);
    
    if (!existingRecord) return;
    
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      // Auto reset after 3 seconds if not confirmed
      setTimeout(() => setShowDeleteConfirm(false), 3000);
      return;
    }
    
    setLoading(true);
    try {
      // Use the actual document ID from the record
      await deleteDoc(doc(db, 'attendance', existingRecord.id));
      
      // Update local state immediately for better UX
      setRecords(prev => prev.filter(r => r.date !== dateStr));
      setShowForm(false);
      setShowDeleteConfirm(false);
      
      // Still fetch to ensure sync
      fetchRecords(); 
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `attendance/${existingRecord.id}`);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (date: Date) => {
    if (profile?.role === 'admin') return; // Admin only views summary
    
    const existing = records.find(r => r.date === format(date, 'yyyy-MM-dd'));
    setSelectedDate(date);
    setShowDeleteConfirm(false);
    if (existing) {
      setShift(existing.shift);
      setIsHoliday(existing.isHoliday);
      setHoursHC(existing.hoursHC);
      setHoursOT(existing.hoursOT);
    } else {
      const savedShift = localStorage.getItem('hrpro_pref_shift');
      setShift((savedShift as 'day' | 'night') || 'day');
      setIsHoliday(false);
      setHoursHC(profile?.defaultHC || 8);
      setHoursOT(profile?.defaultOT || 0);
    }
    setShowForm(true);
  };

  const wage = profile ? calculateWageDetails(records.filter(r => r.userId === profile.uid), profile) : null;

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const exportToExcel = () => {
    // 0. Filter users
    const filteredUsersForExport = allUsers
      .filter(u => u.role !== 'admin')
      .filter(user => {
        const search = userSearchTerm.toLowerCase();
        return user.email.toLowerCase().includes(search);
      });

    // 1. Prepare Summary Data
    const summaryData = filteredUsersForExport
      .map(user => {
        const userRecords = records.filter(r => r.userId === user.uid);
        const userWage = calculateWageDetails(userRecords, user);
        const totalHC = userRecords.reduce((sum, r) => sum + r.hoursHC, 0);
        const totalOT = userRecords.reduce((sum, r) => sum + r.hoursOT, 0);
        const lastRecord = [...userRecords].sort((a, b) => b.date.localeCompare(a.date))[0];
        const lastDay = lastRecord ? format(parseISO(lastRecord.date), 'dd/MM/yyyy') : 'N/A';

        return {
          'Nhân viên (Email)': user.email,
          'Mã NV': user.employeeId || 'N/A',
          'Họ tên': user.fullName || 'N/A',
          'Số điện thoại': user.phoneNumber || 'N/A',
          'Công ty': user.company || 'N/A',
          'Ngày làm cuối': lastDay,
          'Tổng HC (h)': totalHC,
          'Tổng TC (h)': totalOT,
          'Lương dự tính (VND)': userWage.totalIncome
        };
      });

    // 2. Prepare Detailed Work Dates Data
    const monthDays = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });

    const detailedData = filteredUsersForExport
      .map(user => {
        const userRecords = records.filter(r => r.userId === user.uid);
        const row: any = { 
          'Nhân viên': user.email,
          'Mã NV': user.employeeId || '',
          'Họ tên': user.fullName || '',
          'Công ty': user.company || ''
        };
        
        let totalMonthHours = 0;
        monthDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayRecord = userRecords.find(r => r.date === dateStr);
          const dayHours = dayRecord ? dayRecord.hoursHC + dayRecord.hoursOT : 0;
          row[format(day, 'dd/MM')] = dayHours || ''; // Show dayHours or empty
          totalMonthHours += dayHours;
        });
        
        row['Tổng cộng (h)'] = totalMonthHours;
        return row;
      });

    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng hợp');
    
    // Detailed Sheet
    const wsDetail = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi tiết đi làm');
    
    XLSX.writeFile(wb, `ChamCong_${format(currentDate, 'MM_yyyy')}.xlsx`);
  };

  const filteredAdminUsers = allUsers
    .filter(u => u.role !== 'admin')
    .filter(user => {
      const search = userSearchTerm.toLowerCase();
      return user.email.toLowerCase().includes(search);
    });

  if (profile?.role === 'admin') {
    return (
      <div className="space-y-6 pt-[5px] pb-[15px]">
        <div className="bg-slate-900 pt-[10px] pb-[10px] px-8 rounded-[2.5rem] text-white shadow-xl items-center justify-between mb-[10px]">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
             <div className="mb-[10px]">
               <h2 className="text-2xl font-black tracking-tight">Tổng hợp công tháng</h2>
               <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">Dành cho quản trị viên</p>
             </div>
             
             <div className="relative w-full sm:w-64">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 py-[3px]">
                <Search size={16} />
               </div>
               <input 
                 type="text"
                 placeholder="Tìm nhân viên..." 
                 value={userSearchTerm}
                 onChange={e => setUserSearchTerm(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-[10px] pl-11 pr-4 pt-[5px] pb-[5px] text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
               />
             </div>
           </div>
           
           <div className="flex items-center gap-3 w-full">
          <button
            onClick={exportToExcel}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 pt-[3px] pb-[3px] rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-900/20 active:scale-[0.98]"
          >
            <FileDown size={16} /> 
            <span>Xuất Excel</span>
          </button>

          <div className="flex-1 flex items-center justify-between bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button 
              onClick={() => setCurrentDate(prev => subMonths(prev, 1))} 
              className="p-2 hover:bg-white/10 rounded-xl transition-colors active:scale-90"
            >
              <ChevronLeft size={18} />
            </button>
            
            <span className="font-black text-sm capitalize text-center">
              {format(currentDate, 'MM/yyyy')}
            </span>
            
            <button 
              onClick={() => setCurrentDate(prev => addMonths(prev, 1))} 
              className="p-2 hover:bg-white/10 rounded-xl transition-colors active:scale-90"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="pt-[10px] pb-[10px] px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nhân viên</th>
                <th className="pt-[10px] pb-[10px] px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Ngày làm cuối</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Tổng HC</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Tổng TC</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center text-blue-600">Lương Dự Tính</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAdminUsers.map(user => {
                const userRecords = records.filter(r => r.userId === user.uid);
                const userWage = calculateWageDetails(userRecords, user);
                const totalHC = userRecords.reduce((sum, r) => sum + r.hoursHC, 0);
                const totalOT = userRecords.reduce((sum, r) => sum + r.hoursOT, 0);
                const lastRecord = [...userRecords].sort((a, b) => b.date.localeCompare(a.date))[0];
                const lastDay = lastRecord ? format(parseISO(lastRecord.date), 'dd/MM') : '--';

                return (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="pt-[5px] pb-[5px] pl-[10px] pr-[5px]">
                      <p className="font-black text-slate-900">{user.email.split('@')[0]}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{user.email}</p>
                    </td>
                    <td className="pt-[5px] pb-[5px] px-5 text-center font-black text-slate-400">{lastDay}</td>
                    <td className="pt-[5px] pb-[5px] px-5 text-center font-black text-slate-600">{totalHC}h</td>
                    <td className="p-5 text-center font-black text-slate-600">{totalOT}h</td>
                    <td className="p-5 text-center font-black text-blue-600 font-mono">
                      {formatCurrency(userWage.totalIncome)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Salary Summary Card */}
      <AnimatePresence>
        {wage && (
          <div className="space-y-4">
            {(!profile?.lcb || profile.lcb === 0) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-3xl text-xs font-bold flex items-center gap-3">
                <Star size={16} className="text-amber-500 animate-pulse" />
                Hãy thiết lập Lương Cơ Bản trong trang Tài Khoản để tính lương chính xác!
              </div>
            )}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl space-y-5"
            >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">Lương Tạm Tính</p>
                <h3 className="text-3xl font-black">{formatCurrency(wage.totalIncome).replace('₫', '')} <span className="text-xs font-normal opacity-50">VND</span></h3>
              </div>
              <div className="bg-blue-500/20 p-2 rounded-xl">
                 <Wallet size={20} className="text-blue-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[9px] text-slate-500 font-bold">100%</p>
                <p className="text-[11px] font-black">{wage.h100}h</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[9px] text-slate-500 font-bold">130%</p>
                <p className="text-[11px] font-black text-blue-400">{wage.h130}h</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[9px] text-slate-500 font-bold">150%</p>
                <p className="text-[11px] font-black text-orange-400">{wage.h150}h</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[9px] text-slate-500 font-bold">200%</p>
                <p className="text-[11px] font-black text-red-500">{wage.h200}h</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[9px] text-slate-500 font-bold">270%</p>
                <p className="text-[11px] font-black text-purple-400">{wage.h270}h</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[9px] text-slate-500 font-bold">300%</p>
                <p className="text-[11px] font-black text-yellow-400">{wage.h300}h</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[9px] text-slate-500 font-bold">390%</p>
                <p className="text-[11px] font-black text-green-400">{wage.h390}h</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] items-center border-t border-white/10 pt-4 opacity-80">
               <span className="text-blue-400 font-bold uppercase tracking-widest">{profile?.company || 'Chưa thiết lập'}</span>
               <span className="text-slate-700">•</span>
               <span className="font-medium">LCB: {formatCurrency(profile?.lcb || 0)}</span>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Calendar View */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 p-5 flex items-center justify-between border-b border-slate-100">
          <button onClick={() => setCurrentDate(prev => subMonths(prev, 1))} className="p-2.5 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
            <ChevronLeft size={20} />
          </button>
          <h4 className="font-black text-slate-900 capitalize tracking-tight">Tháng {format(currentDate, 'MM yyyy')}</h4>
          <button onClick={() => setCurrentDate(prev => addMonths(prev, 1))} className="p-2.5 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
            <div key={d} className="bg-white text-center py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
          
          {/* Day Padding */}
          {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/30 h-20" />
          ))}

          {days.map((day, i) => {
             const dateStr = format(day, 'yyyy-MM-dd');
             const record = records.find(r => r.date === dateStr);
             const isSun = getDay(day) === 0;
             const isToday = isSameDay(day, new Date());
             
             return (
               <button
                 key={dateStr}
                 onClick={() => openForm(day)}
                 className={cn(
                   "bg-white h-20 p-2 flex flex-col items-center justify-between transition-all hover:bg-slate-50 relative border-slate-50",
                   record && "bg-blue-50/30",
                   isToday && "ring-1 ring-blue-500 ring-inset z-10"
                 )}
               >
                 <span className={cn(
                   "text-xs font-black", 
                   isSun ? "text-red-400" : "text-slate-400",
                   isToday && "text-blue-600"
                 )}>
                   {format(day, 'd')}
                 </span>
                 {record && (
                   <div className="flex flex-col items-center gap-1">
                     <div className="flex gap-0.5">
                       {record.shift === 'day' ? <Sun size={12} className="text-amber-500" /> : <Moon size={12} className="text-indigo-500" />}
                       {record.isHoliday && <Star size={12} className="text-red-500 fill-red-500" />}
                     </div>
                     <span className="text-[10px] font-black text-slate-900 bg-white/80 px-1.5 rounded-full border border-slate-100 shadow-sm">{record.hoursHC + record.hoursOT}h</span>
                   </div>
                 )}
               </button>
             );
          })}
        </div>
      </div>

      {/* Entry Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-blue-600 p-6 text-white text-center">
                <h3 className="text-xl font-bold">Ngày {format(selectedDate!, 'dd/MM/yyyy')}</h3>
                <p className="text-blue-100 text-xs opacity-80 mt-1">Thiết lập giờ công của bạn</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setShift('day');
                      localStorage.setItem('hrpro_pref_shift', 'day');
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all border-2",
                      shift === 'day' ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm" : "border-gray-100 text-gray-500"
                    )}
                  >
                    <Sun size={18} /> Ca ngày
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setShift('night');
                      localStorage.setItem('hrpro_pref_shift', 'night');
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all border-2",
                      shift === 'night' ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" : "border-gray-100 text-gray-500"
                    )}
                  >
                    <Moon size={18} /> Ca đêm
                  </button>
                </div>

                <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isHoliday} 
                    onChange={e => setIsHoliday(e.target.checked)}
                    className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-gray-300" 
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">Ngày lễ</p>
                    <p className="text-[10px] text-gray-500">Tính lương theo chế độ ngày lễ</p>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giờ HC</p>
                    <input 
                      type="number" 
                      value={hoursHC}
                      onChange={e => setHoursHC(Number(e.target.value))}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-900 focus:ring-2 focus:ring-blue-600 shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giờ TC</p>
                    <input 
                      type="number" 
                      value={hoursOT}
                      onChange={e => setHoursOT(Number(e.target.value))}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-900 focus:ring-2 focus:ring-blue-600 shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 transition-colors">Hủy</button>
                  {records.some(r => r.date === format(selectedDate!, 'yyyy-MM-dd')) && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectedDate && handleDelete(selectedDate);
                      }}
                      disabled={loading}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex items-center justify-center shrink-0 font-bold text-xs uppercase tracking-tight",
                        showDeleteConfirm 
                          ? "bg-red-600 border-red-600 text-white w-24 animate-pulse" 
                          : "bg-red-50 border-red-100 text-red-500 hover:bg-red-100"
                      )}
                      title={showDeleteConfirm ? "Nhấn lại để xóa" : "Xóa dữ liệu ngày này"}
                    >
                      {showDeleteConfirm ? 'Xóa?' : <Trash2 size={20} />}
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={handleSave} 
                    disabled={loading || showDeleteConfirm}
                    className="flex-[4] bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {loading ? '...' : 'Lưu ngay'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
