import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, collection, getDocs, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { OperationType, UserProfile, AppSettings } from '../types';
import { Save, LogOut, User as UserIcon, Building, Clock, Wallet, Banknote, Key, UserPlus, Users, Plus, Trash2, Phone, Hash, UserCircle, FileSpreadsheet, Download, AlertCircle, Search, RefreshCw, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import * as XLSX from 'xlsx';

export default function ProfilePage() {
  const { profile, logout, refreshProfile, changePassword } = useAuth();
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  // Admin Management State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', role: 'user' as 'user' | 'admin' });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  
  const [companies, setCompanies] = useState<string[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showCompanyList, setShowCompanyList] = useState(false);
  
  const [banks, setBanks] = useState<{ name: string; code: string; shortName: string }[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    phoneNumber: '',
    defaultHC: 8,
    defaultOT: 0,
    company: '',
    lcb: 0,
    chuyenCan: 0,
    doiSong: 0,
    thamNien: 0,
    bankInfo: {
      bankName: '',
      accountNumber: '',
      accountName: '',
    },
  });

  useEffect(() => {
    fetchAppSettings();
    fetchBanks();
    if (profile) {
      setFormData({
        employeeId: profile.employeeId || '',
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        defaultHC: profile.defaultHC || 8,
        defaultOT: profile.defaultOT || 0,
        company: profile.company || '',
        lcb: profile.lcb || 0,
        chuyenCan: profile.chuyenCan || 0,
        doiSong: profile.doiSong || 0,
        thamNien: profile.thamNien || 0,
        bankInfo: {
          bankName: profile.bankInfo?.bankName || '',
          accountNumber: profile.bankInfo?.accountNumber || '',
          accountName: profile.bankInfo?.accountName || '',
        },
      });
      
      if (profile.role === 'admin') {
        fetchUsers();
      }
    }
  }, [profile]);

  const filteredUsers = allUsers.filter(u => 
    u.uid !== profile?.uid && 
    (u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
     u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.employeeId?.toLowerCase().includes(userSearch.toLowerCase()))
  );
  
  const displayedUsers = showAllUsers ? filteredUsers : filteredUsers.slice(0, 5);

  const handleDeleteUser = async (uid: string) => {
    const userToDelete = allUsers.find(u => u.uid === uid);
    const isCurrentlyDisabled = userToDelete?.status === 'disabled';
    const actionText = isCurrentlyDisabled ? 'khôi phục' : 'vô hiệu hóa';
    
    if (!window.confirm(`Bạn có chắc muốn ${actionText} nhân sự này?`)) return;
    
    try {
      const newStatus = isCurrentlyDisabled ? 'active' : 'disabled';
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
      setAllUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus as 'active' | 'disabled' } : u));
      showNotification('success', `Đã ${actionText} nhân sự thành công`);
    } catch (error) {
      showNotification('error', `Lỗi khi ${actionText} nhân sự`);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!window.confirm('Gửi email khôi phục mật khẩu đến ' + email + '?')) return;
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification('success', 'Đã gửi email khôi phục mật khẩu');
    } catch (error) {
      showNotification('error', 'Lỗi khi gửi email khôi phục');
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await fetch('https://api.vietqr.io/v2/banks');
      const data = await response.json();
      if (data.code === '00') {
        const bankList = data.data.map((b: any) => ({
          name: b.name,
          code: b.code,
          shortName: b.shortName
        }));
        setBanks(bankList);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      // Fallback static list in case API fails
      setBanks([
        { code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
        { code: 'TCB', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam' },
        { code: 'MB', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân Đội' },
        { code: 'ACB', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
        { code: 'STB', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
        { code: 'BIDV', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
        { code: 'CTG', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
        { code: 'VPB', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
      ]);
    }
  };

  const filteredBanks = banks.filter(bank => 
    bank.shortName.toLowerCase().includes(bankSearch.toLowerCase()) || 
    bank.name.toLowerCase().includes(bankSearch.toLowerCase())
  );
  const fetchAppSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'app'));
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setCompanies(data.companies || []);
      } else {
        // Initialize default settings if not exists
        await setDoc(doc(db, 'settings', 'app'), { companies: ['HR Pro', 'Samsung', 'Foxconn', 'Luxshare'] });
        setCompanies(['HR Pro', 'Samsung', 'Foxconn', 'Luxshare']);
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  };

  const handleAddCompany = async () => {
    const trimmedName = newCompanyName.trim();
    if (!trimmedName) return;
    
    if (companies.includes(trimmedName)) {
      showNotification('error', 'Công ty này đã tồn tại');
      return;
    }

    try {
      const updatedCompanies = [...companies, trimmedName];
      await setDoc(doc(db, 'settings', 'app'), { companies: updatedCompanies }, { merge: true });
      setCompanies(updatedCompanies);
      setNewCompanyName('');
      showNotification('success', 'Đã thêm công ty mới');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/app');
    }
  };

  const handleDeleteCompany = async (companyToDelete: string) => {
    try {
      const updatedCompanies = companies.filter(c => c !== companyToDelete);
      await setDoc(doc(db, 'settings', 'app'), { companies: updatedCompanies }, { merge: true });
      setCompanies(updatedCompanies);
      showNotification('success', 'Đã xóa công ty');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/app');
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAccount.email || newAccount.password.length < 6) {
      showNotification('error', 'Vui lòng nhập email hợp lệ và mật khẩu tối thiểu 6 ký tự.');
      return;
    }

    setCreatingAccount(true);
    try {
      await createSingleAccount(newAccount.email, newAccount.password, newAccount.role as 'user' | 'admin');
      
      showNotification('success', 'Tạo tài khoản ' + newAccount.email + ' thành công!');
      setNewAccount({ email: '', password: '', role: 'user' });
      setTimeout(fetchUsers, 2000);
    } catch (error: any) {
      let message = 'Lỗi: ' + (error.message || 'Đã có lỗi xảy ra');
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email ' + newAccount.email + ' đã được sử dụng bởi một tài khoản khác.';
      }
      showNotification('error', message);
    } finally {
      setCreatingAccount(false);
    }
  };

  const createSingleAccount = async (email: string, password: string, role: 'user' | 'admin') => {
    let secondaryApp;
    try {
      secondaryApp = initializeApp(firebaseConfig, `Account-${Date.now()}-${Math.random()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password.toString());
      const uid = userCredential.user.uid;

      const newProfile: UserProfile = {
        uid,
        email,
        role,
        defaultHC: 8,
        defaultOT: 0,
        lcb: 0,
        bankInfo: { bankName: '', accountNumber: '', accountName: '' },
        company: '',
        status: 'active'
      };

      await setDoc(doc(db, 'users', uid), newProfile);
      await signOut(secondaryAuth);
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkCreating(true);
    setBulkErrors([]);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const errors: string[] = [];
        let success = 0;

        for (const row of data) {
          const email = row.Email || row.email || row['Email đăng nhập'];
          const password = row.Password || row.password || row['Mật khẩu'];
          const roleRaw = row.Role || row.role || row['Quyền'] || 'user';
          const role = roleRaw.toString().toLowerCase() === 'admin' ? 'admin' : 'user';

          if (!email || !password || password.toString().length < 6) {
            errors.push(`Dòng ${data.indexOf(row) + 2}: Email hoặc mật khẩu không hợp lệ.`);
            continue;
          }

          try {
            await createSingleAccount(email, password, role);
            success++;
          } catch (err: any) {
            errors.push(`${email}: ${err.message}`);
          }
        }

        setBulkErrors(errors);
        if (errors.length === 0) {
          showNotification('success', `Đã nhập thành công ${success} tài khoản.`);
        } else {
          showNotification('error', `Đã nhập ${success} tài khoản, ${errors.length} lỗi.`);
        }
        fetchUsers();
      } catch (err) {
        showNotification('error', 'Lỗi khi xử lý file Excel.');
      } finally {
        setBulkCreating(false);
        if (e.target) e.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const downloadSampleExcel = () => {
    const data = [
      { 'Email đăng nhập': 'nhanvien1@gmail.com', 'Mật khẩu': '12345678', 'Quyền': 'user' },
      { 'Email đăng nhập': 'admin_test@gmail.com', 'Mật khẩu': 'admin123', 'Quyền': 'admin' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập liệu");
    XLSX.writeFile(wb, "Mau_Nhap_Nhan_Su.xlsx");
  };

  const exportUsersToExcel = () => {
    const data = filteredUsers.map(u => ({
      'Mã NV': u.employeeId || '',
      'Họ Tên': u.fullName || '',
      'Email': u.email || '',
      'SĐT': u.phoneNumber || '',
      'Công ty': u.company || '',
      'Ngân hàng': u.bankInfo?.bankName || '',
      'STK': u.bankInfo?.accountNumber || '',
      'Chủ TK': u.bankInfo?.accountName || '',
      'LCB': u.lcb || 0,
      'Quyền': u.role === 'admin' ? 'Quản trị' : 'Nhân viên',
      'Trạng thái': u.status === 'disabled' ? 'Vô hiệu hóa' : 'Hoạt động'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách nhân sự");
    XLSX.writeFile(wb, `Danh_Sach_Nhan_Su_${new Date().toLocaleDateString('vi-VN')}.xlsx`);
  };

  const handleUpdate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, formData);
      await refreshProfile();
      showNotification('success', 'Cập nhật hồ sơ thành công!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      showNotification('error', 'Mật khẩu phải từ 6 ký tự.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(newPassword);
      showNotification('success', 'Đổi mật khẩu thành công!');
      setShowPassModal(false);
      setNewPassword('');
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        showNotification('error', 'Cần đăng nhập lại để đổi mật khẩu');
      } else if (error.code === 'auth/weak-password') {
        showNotification('error', 'Mật khẩu quá yếu (tối thiểu 6 ký tự)');
      } else {
        showNotification('error', error.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
          >
            <div className={cn(
              "p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md",
              notification.type === 'success' ? "bg-green-600/90 border-green-500 text-white" : "bg-red-600/90 border-red-500 text-white"
            )}>
              <div className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">
                {notification.type === 'success' ? '✓' : '!'}
              </div>
              <p className="text-xs font-black uppercase tracking-widest leading-relaxed">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-[5px]">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tài khoản</h2>
        <div className="flex gap-2">
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setShowCreateAccountForm(!showCreateAccountForm)}
              className={cn(
                "p-3 rounded-2xl transition-all shadow-sm",
                showCreateAccountForm ? "bg-slate-900 text-white" : "text-blue-600 bg-blue-50 hover:bg-blue-100"
              )}
            >
              <UserPlus size={18} />
            </button>
          )}
          <button 
            onClick={() => setShowPassModal(true)}
            className="p-3 text-blue-600 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors shadow-sm"
          >
            <Key size={18} />
          </button>
          <button 
            onClick={logout}
            className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors shadow-sm"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCreateAccountForm && profile?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white space-y-6 shadow-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <UserPlus className="text-blue-400" size={24} />
                   <h3 className="text-xl font-black tracking-tight">Tạo tài khoản mới</h3>
                </div>
                <button onClick={() => setShowCreateAccountForm(false)} className="text-slate-500 hover:text-white transition-colors">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={(e) => {
                handleCreateAccount(e);
                // We keep it open if it fails, but user might want to close it manually
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="email"
                    placeholder="Email đăng nhập"
                    value={newAccount.email}
                    onChange={e => setNewAccount({...newAccount, email: e.target.value})}
                    className="bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Mật khẩu"
                    value={newAccount.password}
                    onChange={e => setNewAccount({...newAccount, password: e.target.value})}
                    className="bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                  />
                </div>
                <div className="flex items-center gap-3 w-full justify-center">
                  <div className="flex-1 relative">
                    <select
                      value={newAccount.role}
                      onChange={e => setNewAccount({...newAccount, role: e.target.value as 'user' | 'admin'})}
                      className="w-full appearance-none bg-slate-800 border-none text-white rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    >
                      <option value="user" className="bg-slate-800">User</option>
                      <option value="admin" className="bg-slate-800">Admin</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={creatingAccount}
                    className="flex-1 bg-blue-600 hover:bg-blue-50 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.97] disabled:opacity-50"
                  >
                    {creatingAccount ? 'Đang tạo...' : 'Tạo nhân sự'}
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileSpreadsheet size={14} /> Nhập liệu hàng loạt (Excel)
                  </p>
                  <button 
                    onClick={downloadSampleExcel}
                    className="text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 uppercase tracking-widest"
                  >
                    <Download size={12} /> Tải file mẫu
                  </button>
                </div>
                
                <label className="relative group cursor-pointer">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleBulkImport}
                    className="hidden"
                    disabled={bulkCreating}
                  />
                  <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center group-hover:border-blue-500/50 transition-all">
                    {bulkCreating ? (
                      <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Đang xử lý file...
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-300">Chọn hoặc kéo thả file Excel vào đây</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Hỗ trợ định dạng .xlsx, .xls</p>
                      </div>
                    )}
                  </div>
                </label>

                {bulkErrors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Lỗi khi nhập liệu ({bulkErrors.length})</p>
                    </div>
                    <div className="max-h-32 overflow-y-auto px-1 custom-scrollbar space-y-1.5">
                      {bulkErrors.map((err, idx) => (
                        <p key={idx} className="text-[10px] font-bold text-red-400 leading-tight">
                          • {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPassModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-2 rounded-[2.5rem] shadow-2xl w-full max-w-sm space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Đổi mật khẩu</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Mật khẩu tối thiểu 6 ký tự</p>
              </div>
              <input 
                type="password"
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowPassModal(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Hủy</button>
                <button onClick={handlePasswordChange} className="flex-[2] bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] shadow-xl">Cập nhật</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white pt-[4px] pb-[4px] pl-[9px] pr-2 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 mb-[10px]">
        <div className={cn("flex items-center gap-5 h-[80px] pb-0", profile?.role !== 'admin' && "border-b border-slate-50")}>
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 shadow-sm">
            <UserIcon size={28} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Email tài khoản</p>
            <p className="font-black text-slate-900 text-[16px] tracking-tight">{profile?.email}</p>
            {profile?.role === 'admin' && (
              <span className="mt-1 inline-block px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Quản trị viên</span>
            )}
          </div>
        </div>

        {profile?.role !== 'admin' && (
          <>
            <section className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
              <Building size={12} /> Công ty làm việc
            </label>
            <div className="relative">
              <select
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full appearance-none bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner cursor-pointer"
              >
                <option value="">Chọn công ty</option>
                {companies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                <Plus size={16} className="rotate-45 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Hash size={12} /> Mã nhân viên
              </label>
              <input
                type="text"
                placeholder="Vd: NV001"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <UserCircle size={12} /> Họ và tên
              </label>
              <input
                type="text"
                placeholder="Vd: NGUYỄN VĂN A"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Phone size={12} /> Số điện thoại
              </label>
              <input
                type="tel"
                placeholder="Vd: 0912..."
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Clock size={12} /> Giờ HC mặc định
              </label>
              <input
                type="number"
                value={formData.defaultHC}
                onChange={(e) => setFormData({ ...formData, defaultHC: Number(e.target.value) })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Clock size={12} /> Giờ TC mặc định
              </label>
              <input
                type="number"
                value={formData.defaultOT}
                onChange={(e) => setFormData({ ...formData, defaultOT: Number(e.target.value) })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
              <Wallet size={12} /> Lương cơ bản (LCB)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formData.lcb === 0 ? '' : formData.lcb.toLocaleString('vi-VN')}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, lcb: val === '' ? 0 : parseInt(val, 10) });
              }}
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate">Chuyên cần</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formData.chuyenCan === 0 ? '' : formData.chuyenCan.toLocaleString('vi-VN')}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, chuyenCan: val === '' ? 0 : parseInt(val, 10) });
                }}
                className="w-full bg-slate-50 border-none rounded-2xl px-3 py-4 text-xs font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate">Đời sống</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formData.doiSong === 0 ? '' : formData.doiSong.toLocaleString('vi-VN')}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, doiSong: val === '' ? 0 : parseInt(val, 10) });
                }}
                className="w-full bg-slate-50 border-none rounded-2xl px-3 py-4 text-xs font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate">Thâm niên</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formData.thamNien === 0 ? '' : formData.thamNien.toLocaleString('vi-VN')}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, thamNien: val === '' ? 0 : parseInt(val, 10) });
                }}
                className="w-full bg-slate-50 border-none rounded-2xl px-3 py-4 text-xs font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
          </div>
        </section>

        <section className="space-y-5 pt-6 border-t border-slate-50">
          <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
            <Banknote size={18} className="text-blue-600" />
            Tài khoản ngân hàng
          </h3>
          <div className="space-y-4">
            <div className="relative">
              <div 
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus-within:ring-2 focus-within:ring-blue-500 shadow-inner flex items-center justify-between cursor-pointer"
                onClick={() => setShowBankDropdown(!showBankDropdown)}
              >
                <div className="truncate">
                  {formData.bankInfo.bankName || <span className="text-slate-400">Chọn ngân hàng</span>}
                </div>
                <Plus size={16} className={cn("transition-transform duration-300 text-slate-400", showBankDropdown ? "rotate-45" : "rotate-0")} />
              </div>

              <AnimatePresence>
                {showBankDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 5, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute z-50 left-0 right-0 top-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-50">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Tìm kiếm ngân hàng..."
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black focus:ring-1 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                      {filteredBanks.length === 0 ? (
                        <div className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Không tìm thấy ngân hàng</div>
                      ) : (
                        filteredBanks.map(bank => (
                          <button
                            key={bank.code}
                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-0.5"
                            onClick={() => {
                              setFormData({ ...formData, bankInfo: { ...formData.bankInfo, bankName: bank.shortName } });
                              setShowBankDropdown(false);
                              setBankSearch('');
                            }}
                          >
                            <span className="text-xs font-black text-slate-900">{bank.shortName}</span>
                            <span className="text-[10px] font-medium text-slate-400 truncate">{bank.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {showBankDropdown && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowBankDropdown(false)} 
              />
            )}
            <input
              placeholder="Số tài khoản"
              type="text"
              value={formData.bankInfo.accountNumber}
              onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, accountNumber: e.target.value } })}
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black font-mono focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
            <input
              placeholder="Tên chủ tài khoản (Viết hoa)"
              type="text"
              value={formData.bankInfo.accountName}
              onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, accountName: e.target.value } })}
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black uppercase focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
          </div>
        </section>

            <button
              onClick={handleUpdate}
              disabled={loading}
              className="w-full bg-slate-900 text-white rounded-[1.5rem] py-5 font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl uppercase tracking-widest text-sm"
            >
              {loading ? 'Đang lưu...' : (
                <>
                  <Save size={20} />
                  Cập nhật hồ sơ
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Admin Management Section */}
      {profile?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-slate-900 pt-[15px] pb-[15px] px-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-6 mb-[10px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building className="text-blue-500" size={24} />
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Quản lý công ty</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Đồng hành cùng HR Pro</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowCompanyList(!showCompanyList)}
                className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-4 py-2 rounded-xl hover:bg-blue-400/20 transition-all text-center"
              >
                {showCompanyList ? 'Ẩn danh sách' : 'Xem danh sách'}
              </button>
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Tên công ty mới..."
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
                  className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 transition-all"
                />
              </div>
              <button
                onClick={handleAddCompany}
                className="shrink-0 bg-blue-600 text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/40"
              >
                Thêm
              </button>
            </div>

            <AnimatePresence>
              {showCompanyList && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 py-2">
                    {companies.length === 0 ? (
                      <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest py-4">Chưa có công ty nào...</p>
                    ) : (
                      companies.map(company => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={company} 
                          className="bg-slate-800 border border-slate-700/50 rounded-full pl-4 pr-1 py-1.5 flex items-center gap-2 group hover:border-blue-500/50 transition-all"
                        >
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{company}</span>
                          <button
                            onClick={() => handleDeleteCompany(company)}
                            className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-white p-2 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <div className="px-4 pt-4 flex flex-col gap-4 mb-[10px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-600" size={24} />
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Danh sách nhân sự</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={exportUsersToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-colors shadow-sm"
                    title="Xuất file Excel"
                  >
                    <Download size={14} /> Xuất Excel
                  </button>
                  <button 
                    onClick={fetchUsers}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-xl"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Tìm kiếm theo tên, email, mã NV..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 shadow-inner"
                />
              </div>
              <p className="text-[9px] font-bold text-slate-400 px-1 italic">
                * Icon Khóa/Mở để vô hiệu hóa quyền truy cập. Icon Chìa khóa để gửi email reset mật khẩu.
              </p>
            </div>

            <div className="divide-y divide-slate-50 px-2">
              {allUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  Đang tải danh sách...
                </div>
              ) : displayedUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  Không tìm thấy nhân sự phù hợp
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedUsers.map((u) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={u.uid} 
                      className={cn(
                        "rounded-3xl transition-all border border-transparent overflow-hidden",
                        u.status === 'disabled' ? "bg-red-50/10 grayscale border-red-100" : "bg-white hover:border-slate-200 shadow-sm border-slate-100"
                      )}
                    >
                      <div 
                        className="p-4 cursor-pointer flex items-center justify-between"
                        onClick={() => setExpandedUserId(expandedUserId === u.uid ? null : u.uid)}
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm",
                            u.status === 'disabled' ? "bg-slate-200 text-slate-400" : "bg-blue-50 text-blue-600"
                          )}>
                            {u.fullName ? u.fullName.charAt(0) : u.email?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 truncate tracking-tight flex items-center gap-2">
                              {u.fullName || u.email}
                              {expandedUserId === u.uid ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-slate-400" />}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{u.employeeId || 'Chưa có mã'}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-[9px] font-bold text-slate-400 truncate">{u.company || 'HR Pro'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => handleResetPassword(u.email!)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Gửi email đổi mật khẩu"
                          >
                            <Key size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.uid)}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              u.status === 'disabled' 
                                ? "text-green-500 hover:bg-green-50" 
                                : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                            )}
                            title={u.status === 'disabled' ? "Khôi phục tài khoản" : "Vô hiệu hóa tài khoản"}
                          >
                            {u.status === 'disabled' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedUserId === u.uid && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-50/50 border-t border-slate-100"
                          >
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                                <p className="text-xs font-bold text-slate-800">{u.email}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</p>
                                <p className="text-xs font-bold text-slate-800">{u.phoneNumber || 'Chưa cập nhật'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mã nhân viên</p>
                                <p className="text-xs font-bold text-slate-800">{u.employeeId || 'Chưa cập nhật'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lương cơ bản</p>
                                <p className="text-xs font-bold text-slate-800">{u.lcb?.toLocaleString('vi-VN')} đ</p>
                              </div>
                              <div className="md:col-span-2 p-3 bg-white rounded-2xl border border-slate-100 space-y-3">
                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-50 pb-2">Thông tin tài khoản ngân hàng</p>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ngân hàng</p>
                                    <p className="text-[11px] font-bold text-slate-800">{u.bankInfo?.bankName || '---'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Số tài khoản</p>
                                    <p className="text-[11px] font-bold text-blue-600">{u.bankInfo?.accountNumber || '---'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Chủ tài khoản</p>
                                    <p className="text-[11px] font-black text-slate-800 truncate">{u.bankInfo?.accountName || '---'}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="md:col-span-2 flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                                  u.role === 'admin' ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                                )}>
                                  Quyền: {u.role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                                </span>
                                {u.status === 'disabled' && (
                                  <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-red-100 text-red-600">
                                    Đã vô hiệu hóa
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {filteredUsers.length > 5 && (
              <div className="px-4 pb-4">
                <button 
                  onClick={() => setShowAllUsers(!showAllUsers)}
                  className="w-full py-4 text-xs font-black text-blue-600 bg-blue-50/50 rounded-2xl hover:bg-blue-50 transition-all uppercase tracking-widest"
                >
                  {showAllUsers ? 'Thu gọn danh sách' : `Xem toàn bộ (${filteredUsers.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
