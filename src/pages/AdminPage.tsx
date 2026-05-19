import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserCheck,
  UserX,
  MessageSquare,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  Trash2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { pb } from "../lib/pocketbase";
import * as XLSX from "xlsx";
import { UserProfile, OperationType } from "../types";
import { handlePBError } from "../lib/pbUtils";

// Ensure ngrok bypass header is installed (idempotent guard)
if (!(globalThis as any).__ngrok_header_installed) {
  const _orig = (globalThis as any).fetch;
  if (_orig) {
    (globalThis as any).fetch = async (
      input: RequestInfo,
      init?: RequestInit,
    ) => {
      try {
        let url = typeof input === "string" ? input : (input as Request).url;
        if (typeof url === "string" && url.includes("ngrok")) {
          init = init || {};
          const h = new Headers((init.headers as HeadersInit) || {});
          h.set("ngrok-skip-browser-warning", "true");
          init.headers = h;
        }
      } catch (e) {}
      return _orig(input, init);
    };
    (globalThis as any).__ngrok_header_installed = true;
  }
}

export default function AdminPage() {
  const { profile } = useAuth();
  const { companySettings, appSettings, updateAppSettings } = useApp();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingRegistrations: 0,
    pendingComplaints: 0,
    pendingBankUpdates: 0,
    totalAdvances: 0,
    totalPayroll: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [selectAllPending, setSelectAllPending] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<UserProfile[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyMode, setHistoryMode] = useState<"account" | "bank" | null>(
    null,
  );
  const [historySearch, setHistorySearch] = useState("");
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeAdminPopup, setActiveAdminPopup] = useState<
    "accounts" | "pending" | "companies" | "bank" | null
  >(null);
  // Approval requirement toggle
  const [requireApproval, setRequireApproval] = useState(false);
  const [showApprovalToggleModal, setShowApprovalToggleModal] = useState(false);
  const [togglePassword, setTogglePassword] = useState("");
  const [toggleLoading, setToggleLoading] = useState(false);
  // Company management state
  const [newCompanyName, setNewCompanyName] = useState("");
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState("");
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadAdminData = async () => {
    try {
      // 1. Chỉ gọi lấy toàn bộ danh sách users một lần duy nhất
      const users = (await pb
        .collection("users")
        .getFullList()) as UserProfile[];

      // 2. Lọc trực tiếp trên mảng ở Frontend (Tránh hoàn toàn lỗi 400 từ API)
      // Dự phòng: Nếu tài khoản mới đăng ký chưa có thuộc tính approvalStatus nhưng status đang bị disabled, vẫn coi là pending
      const pendingRegistrations = users.filter(
        (u) =>
          u.approvalStatus === "pending" ||
          (!u.approvalStatus && u.status === "disabled" && u.role !== "admin"),
      );
      const activeUsers = users.filter((u) => u.status !== "disabled");
      const pendingBankUpdates = users.filter(
        (u) => u.bankInfoStatus === "pending",
      );
      const history = [...users]
        .filter(
          (u) =>
            u.approvalStatus === "approved" || u.approvalStatus === "rejected",
        )
        .sort(
          (a, b) =>
            new Date(b.updated || b.created || 0).getTime() -
            new Date(a.updated || a.created || 0).getTime(),
        )
        .slice(0, 20);

      // 3. Tách nhỏ việc gọi các bảng khác để nếu một bảng lỗi không làm sập toàn bộ trang Admin
      let complaints = [];
      try {
        complaints = await pb.collection("complaints").getFullList();
      } catch (e) {
        console.error(
          "Chưa tạo hoặc không thể lấy dữ liệu bảng complaints:",
          e,
        );
      }
      const pendingComplaints = complaints.filter(
        (c) => c.status === "pending",
      );

      let advances = [];
      try {
        advances = await pb.collection("advances").getFullList();
      } catch (e) {
        console.error("Chưa tạo hoặc không thể lấy dữ liệu bảng advances:", e);
      }
      const totalAdvances = advances.reduce(
        (sum, a) => sum + (a.amount || 0),
        0,
      );

      let batches = [];
      try {
        batches = await pb.collection("payrollBatches").getFullList();
      } catch (e) {
        console.error(
          "Chưa tạo hoặc không thể lấy dữ liệu bảng payrollBatches:",
          e,
        );
      }
      const totalPayroll = batches.reduce(
        (sum, b) => sum + (b.totalAmount || 0),
        0,
      );

      // 4. Cập nhật dữ liệu sạch lên giao diện công phu của bạn
      setStats({
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        pendingRegistrations: pendingRegistrations.length,
        pendingComplaints: pendingComplaints.length,
        pendingBankUpdates: pendingBankUpdates.length,
        totalAdvances,
        totalPayroll,
      });

      const sortedUsers = [...users].sort(
        (a, b) =>
          new Date(b.created || 0).getTime() -
          new Date(a.created || 0).getTime(),
      );
      setRecentUsers(sortedUsers.slice(0, 5));
      setAllUsers(users);
      setPendingUsers(pendingRegistrations);
      setApprovalHistory(history);
      setRequireApproval(appSettings?.requireApproval === true);

      const sortedComplaints = complaints.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
      );
      setRecentComplaints(sortedComplaints.slice(0, 5));
    } catch (error) {
      console.error("Error loading admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportUsersToXLSX = () => {
    if (!allUsers || allUsers.length === 0) {
      setNotification({
        type: "error",
        message: "Không có người dùng để xuất.",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const data = allUsers.map((u) => ({
      id: u.id || "",
      username: (u as any).username || "",
      email: (u as any).email || "",
      fullName: u.fullName || "",
      phoneNumber: u.phoneNumber || "",
      role: u.role || "",
      company: u.company || "",
      approvalStatus: u.approvalStatus || "",
      bankInfoStatus: u.bankInfoStatus || "",
      status: u.status || "",
      bankName: (u as any).bankName || u.bankInfo?.bankName || "",
      accountNumber:
        (u as any).accountNumber || u.bankInfo?.accountNumber || "",
      accountName: (u as any).accountName || u.bankInfo?.accountName || "",
      created: u.created || "",
      updated: u.updated || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const filename = `users_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);

    setNotification({
      type: "success",
      message: "Đã tạo file xuất thành công.",
    });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!profile || profile.role !== "admin") return;
    loadAdminData();
  }, [profile]);
  const handleAddCompany = async () => {
    const trimmedName = newCompanyName.trim();
    if (!trimmedName) return;

    const currentCompanies = appSettings.companies || [];
    if (currentCompanies.includes(trimmedName)) {
      setNotification({
        type: "error",
        message: "Công ty này đã tồn tại.",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const updatedCompanies = [...currentCompanies, trimmedName];

    try {
      await updateAppSettings({ companies: updatedCompanies });
      setNewCompanyName("");
      setNotification({ type: "success", message: "Đã thêm công ty mới" });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Error adding company:", error);
      setNotification({
        type: "error",
        message: "Không thể thêm công ty. Vui lòng thử lại.",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDeleteCompany = async (companyToDelete: string) => {
    const updatedCompanies = (appSettings.companies || []).filter(
      (c) => c !== companyToDelete,
    );

    try {
      await updateAppSettings({ companies: updatedCompanies });
      setNotification({ type: "success", message: "Đã xóa công ty" });
      setTimeout(() => setNotification(null), 3000);
      if (editingCompany === companyToDelete) {
        setEditingCompany(null);
        setEditingCompanyName("");
      }
    } catch (error: any) {
      console.error("Error deleting company:", error);
      setNotification({
        type: "error",
        message: "Không thể xóa công ty. Vui lòng thử lại.",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleStartEditCompany = (company: string) => {
    setEditingCompany(company);
    setEditingCompanyName(company);
  };

  const handleCancelEditCompany = () => {
    setEditingCompany(null);
    setEditingCompanyName("");
  };

  const handleSaveCompanyEdit = async () => {
    if (!editingCompany) return;
    const trimmedName = editingCompanyName.trim();
    if (!trimmedName) return;

    const currentCompanies = appSettings.companies || [];
    if (
      currentCompanies.includes(trimmedName) &&
      trimmedName !== editingCompany
    ) {
      setNotification({
        type: "error",
        message: "Tên công ty này đã tồn tại.",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const updatedCompanies = currentCompanies.map((company) =>
      company === editingCompany ? trimmedName : company,
    );

    try {
      await updateAppSettings({ companies: updatedCompanies });
      setNotification({
        type: "success",
        message: "Đã cập nhật tên công ty.",
      });
      setEditingCompany(null);
      setEditingCompanyName("");
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Error editing company:", error);
      setNotification({
        type: "error",
        message: "Không thể chỉnh sửa công ty. Vui lòng thử lại.",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await pb.collection("users").update(userId, {
        status: "active",
        approvalStatus: "approved",
      });
      setNotification({
        type: "success",
        message: "Đã duyệt đăng ký thành công.",
      });
      await loadAdminData();
    } catch (error: any) {
      console.error("Error approving user:", error);
      setNotification({
        type: "error",
        message: "Không thể duyệt đăng ký. Vui lòng thử lại.",
      });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await pb.collection("users").update(userId, {
        status: "disabled",
        approvalStatus: "rejected",
      });
      setNotification({
        type: "success",
        message: "Đã từ chối đăng ký.",
      });
      await loadAdminData();
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      setNotification({
        type: "error",
        message: "Không thể từ chối đăng ký. Vui lòng thử lại.",
      });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleApproveBankInfo = async (
    userId: string,
    action: "approve" | "reject",
  ) => {
    const targetUser = allUsers.find((u) => u.id === userId);
    if (!targetUser) return;

    try {
      const updateData: any = {};
      if (action === "approve") {
        updateData.bankInfoStatus = "approved";
        updateData.bankName =
          targetUser.pendingBankInfo?.bankName || targetUser.bankName;
        updateData.accountNumber =
          targetUser.pendingBankInfo?.accountNumber || targetUser.accountNumber;
        updateData.accountName =
          targetUser.pendingBankInfo?.accountName || targetUser.accountName;
        updateData.pendingBankInfo = null;
      } else {
        updateData.bankInfoStatus = "rejected";
        updateData.pendingBankInfo = null;
      }

      await pb.collection("users").update(userId, updateData);
      setNotification({
        type: "success",
        message:
          action === "approve"
            ? "Đã duyệt số tài khoản thành công."
            : "Đã từ chối yêu cầu số tài khoản.",
      });
      await loadAdminData();
    } catch (error: any) {
      console.error("Bank approval error:", error);
      setNotification({
        type: "error",
        message: "Không thể xử lý yêu cầu. Vui lòng thử lại.",
      });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const toggleSelectPending = (id: string) => {
    setSelectedPendingIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSelectAllPending = () => {
    if (selectAllPending) {
      setSelectedPendingIds([]);
      setSelectAllPending(false);
    } else {
      setSelectedPendingIds(pendingUsers.map((u) => u.id));
      setSelectAllPending(true);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPendingIds.length === 0) return;
    try {
      await Promise.all(
        selectedPendingIds.map((id) =>
          pb.collection("users").update(id, {
            status: "active",
            approvalStatus: "approved",
          }),
        ),
      );
      setNotification({ type: "success", message: "Đã duyệt hàng loạt." });
      await loadAdminData();
      setSelectedPendingIds([]);
      setSelectAllPending(false);
    } catch (error) {
      console.error("Bulk approve error:", error);
      setNotification({ type: "error", message: "Không thể duyệt. Thử lại." });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleBulkReject = async () => {
    if (selectedPendingIds.length === 0) return;
    try {
      await Promise.all(
        selectedPendingIds.map((id) =>
          pb.collection("users").update(id, {
            status: "disabled",
            approvalStatus: "rejected",
          }),
        ),
      );
      setNotification({ type: "success", message: "Đã từ chối hàng loạt." });
      await loadAdminData();
      setSelectedPendingIds([]);
      setSelectAllPending(false);
    } catch (error) {
      console.error("Bulk reject error:", error);
      setNotification({
        type: "error",
        message: "Không thể từ chối. Thử lại.",
      });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleToggleApprovalRequirement = async () => {
    if (!togglePassword.trim()) {
      setNotification({
        type: "error",
        message: "Vui lòng nhập mật khẩu admin.",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setToggleLoading(true);
    try {
      // Verify admin password by attempting authentication
      const adminAuth = await pb
        .collection("users")
        .authWithPassword(
          profile?.email || profile?.username || "",
          togglePassword,
        );
      if (!adminAuth) throw new Error("Mật khẩu không chính xác");

      // Update approval requirement setting
      const newRequireApproval = !requireApproval;
      await updateAppSettings({ requireApproval: newRequireApproval });

      setRequireApproval(newRequireApproval);
      setShowApprovalToggleModal(false);
      setTogglePassword("");

      setNotification({
        type: "success",
        message: newRequireApproval
          ? "Đã bật yêu cầu phê duyệt."
          : "Đã tắt yêu cầu phê duyệt. User sẽ tự do đăng ký.",
      });
    } catch (error: any) {
      console.error("Toggle approval error:", error);
      setNotification({
        type: "error",
        message: "Mật khẩu không chính xác hoặc lỗi hệ thống.",
      });
    } finally {
      setToggleLoading(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Tổng nhân viên",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Nhân viên hoạt động",
      value: stats.activeUsers,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Khiếu nại chờ xử lý",
      value: stats.pendingComplaints,
      icon: MessageSquare,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Đăng ký chờ duyệt",
      value: stats.pendingRegistrations,
      icon: UserX,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Cập nhật STK chờ duyệt",
      value: stats.pendingBankUpdates,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Tổng ứng lương",
      value: new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(stats.totalAdvances),
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Tổng lương đã trả",
      value: new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(stats.totalPayroll),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  const bankApprovalHistory = [...allUsers]
    .filter(
      (u) => u.bankInfoStatus === "approved" || u.bankInfoStatus === "rejected",
    )
    .sort(
      (a, b) =>
        new Date(b.updated || b.created || 0).getTime() -
        new Date(a.updated || a.created || 0).getTime(),
    )
    .slice(0, 20);

  const currentHistoryItems =
    historyMode === "bank" ? bankApprovalHistory : approvalHistory;
  const filteredHistoryItems = currentHistoryItems.filter((user) => {
    const search = historySearch.trim().toLowerCase();
    if (!search) return true;
    return (
      (user.fullName || user.username || "").toLowerCase().includes(search) ||
      (user.username || "").toLowerCase().includes(search) ||
      (user.pendingBankInfo?.bankName || "").toLowerCase().includes(search) ||
      (user.pendingBankInfo?.accountNumber || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
          >
            <div
              className={
                "p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md " +
                (notification.type === "success"
                  ? "bg-green-600/90 border-green-500 text-white"
                  : "bg-red-600/90 border-red-500 text-white")
              }
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">
                {notification.type === "success" ? "✓" : "!"}
              </div>
              <p className="text-xs font-black uppercase tracking-widest leading-relaxed">
                {notification.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-3">
        <Building className="w-6 h-6 text-slate-600" />
        <h1 className="text-xl font-black text-slate-900 tracking-tighter">
          Quản lý hệ thống
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
                  {stat.title}
                </p>
                <p className="text-lg font-black text-slate-900 truncate">
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Approval Requirement Setting */}
      <AnimatePresence>
        {showApprovalToggleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowApprovalToggleModal(false)}
            className="fixed inset-0 bg-black/40 z-70 flex items-center justify-center"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg"
            >
              <h3 className="text-lg font-black mb-4">
                Xác nhận thay đổi cài đặt
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {requireApproval
                  ? "Bạn sắp tắt yêu cầu phê duyệt. User sẽ tự do đăng ký tài khoản mà không cần admin duyệt."
                  : "Bạn sắp bật yêu cầu phê duyệt. Tất cả đăng ký mới sẽ phải qua admin phê duyệt."}
              </p>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Nhập mật khẩu admin:
                </label>
                <input
                  type="password"
                  value={togglePassword}
                  onChange={(e) => setTogglePassword(e.target.value)}
                  placeholder="Mật khẩu..."
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleToggleApprovalRequirement()
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowApprovalToggleModal(false);
                    setTogglePassword("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleToggleApprovalRequirement}
                  disabled={toggleLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {toggleLoading ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveAdminPopup("accounts")}
          className="rounded-3xl border p-5 text-left transition-all shadow-sm hover:shadow-md border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                Quản lý tài khoản
              </p>
              <h3 className="mt-4 text-2xl font-black text-slate-900">
                {stats.activeUsers}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Tài khoản đang hoạt động
              </p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveAdminPopup("pending")}
          className="rounded-3xl border p-5 text-left transition-all shadow-sm hover:shadow-md border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                Đăng ký chờ duyệt
              </p>
              <h3 className="mt-4 text-2xl font-black text-slate-900">
                {stats.pendingRegistrations}
              </h3>
              <p className="text-sm text-slate-500 mt-1">Quản lý đăng ký mới</p>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
              <UserX className="w-6 h-6" />
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveAdminPopup("companies");
            setShowCompanyList(true);
          }}
          className="rounded-3xl border p-5 text-left transition-all shadow-sm hover:shadow-md border-slate-200 bg-white w-full"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                Quản lý công ty
              </p>
              <h3 className="mt-4 text-2xl font-black">
                {(appSettings.companies || []).length}
              </h3>
              <p className="text-sm mt-1">Số lượng công ty hiện có</p>
            </div>
            <div className="rounded-2xl bg-slate-800 p-3 text-white">
              <Building className="w-6 h-6" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveAdminPopup("bank")}
          className="rounded-3xl border p-5 text-left transition-all shadow-sm hover:shadow-md border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                Phê duyệt STK
              </p>
              <h3 className="mt-4 text-2xl font-black text-slate-900">
                {allUsers.filter((u) => u.bankInfoStatus === "pending").length}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Yêu cầu cập nhật số tài khoản
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {activeAdminPopup === "accounts" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveAdminPopup(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setActiveAdminPopup(null)}
                className="absolute right-5 top-5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                    Quản lý tài khoản
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-slate-900">
                    Tổng quan và cài đặt phê duyệt
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Xem số liệu tài khoản, yêu cầu phê duyệt và danh sách tài
                    khoản mới nhất.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportUsersToXLSX}
                    className="rounded-full bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200"
                  >
                    Xuất Excel
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    Tài khoản hoạt động
                  </p>
                  <p className="mt-4 text-3xl font-black text-slate-900">
                    {stats.activeUsers}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Số tài khoản đã kích hoạt.
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    Đăng ký chờ duyệt
                  </p>
                  <p className="mt-4 text-3xl font-black text-slate-900">
                    {stats.pendingRegistrations}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Số tài khoản mới cần admin duyệt.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Yêu cầu phê duyệt đăng ký
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {requireApproval
                        ? "Bật: người dùng cần admin duyệt đăng ký mới"
                        : "Tắt: người dùng có thể đăng ký tài khoản tự động"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowApprovalToggleModal(true)}
                    className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                      requireApproval
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "bg-amber-600 text-white hover:bg-amber-500"
                    }`}
                  >
                    {requireApproval ? "Đang bật" : "Đang tắt"}
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-black text-slate-900">
                  Tài khoản mới nhất
                </h3>
                <div className="mt-4 grid gap-3">
                  {recentUsers.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Chưa có tài khoản mới.
                    </p>
                  ) : (
                    recentUsers.slice(0, 5).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4 border border-slate-200"
                      >
                        <div>
                          <p className="font-black text-slate-900 truncate">
                            {user.fullName || user.username}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {user.username} •{" "}
                            {user.company || "Chưa có công ty"}
                          </p>
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                            user.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {user.status === "active" ? "Hoạt động" : "Vô hiệu"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeAdminPopup === "pending" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveAdminPopup(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setActiveAdminPopup(null)}
                className="absolute right-5 top-5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                    Đăng ký chờ duyệt
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-slate-900">
                    Quản lý đăng ký mới
                  </h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    Số đăng ký
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-900">
                    {stats.pendingRegistrations}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSelectAllPending}
                    className="rounded-full bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200"
                  >
                    {selectAllPending ? "Bỏ chọn" : "Chọn tất cả"}
                  </button>
                  <button
                    onClick={handleBulkApprove}
                    className="rounded-full bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500"
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={handleBulkReject}
                    className="rounded-full bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500"
                  >
                    Từ chối
                  </button>
                </div>
              </div>

              {pendingUsers.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">
                  Không có đăng ký mới.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-black text-slate-900">
                            {user.fullName || user.username}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {user.phoneNumber || "Không có số điện thoại"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedPendingIds.includes(user.id)}
                            onChange={() => toggleSelectPending(user.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-xs text-slate-500">
                            {user.created
                              ? new Date(user.created).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          className="w-full rounded-full bg-green-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-green-500 sm:w-auto"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          className="w-full rounded-full bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500 sm:w-auto"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Xem lại lịch sử phê duyệt tài khoản để quản lý nhanh.
                </p>
                <button
                  onClick={() => {
                    setHistoryMode("account");
                    setShowHistory(true);
                  }}
                  className="rounded-full bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200"
                >
                  Xem lịch sử
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeAdminPopup === "bank" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveAdminPopup(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setActiveAdminPopup(null)}
                className="absolute right-5 top-5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                    Phê duyệt STK
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-slate-900">
                    Yêu cầu cập nhật ngân hàng
                  </h2>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-black text-slate-900">Số yêu cầu</p>
                <p className="mt-3 text-3xl font-black text-slate-900">
                  {
                    allUsers.filter((u) => u.bankInfoStatus === "pending")
                      .length
                  }
                </p>
              </div>

              {allUsers.filter((u) => u.bankInfoStatus === "pending").length ===
              0 ? (
                <p className="mt-6 text-sm text-slate-500">
                  Hiện không có yêu cầu phê duyệt số tài khoản.
                </p>
              ) : (
                <div className="mt-6 grid gap-4">
                  {allUsers
                    .filter((u) => u.bankInfoStatus === "pending")
                    .map((user) => (
                      <div
                        key={user.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {user.fullName || user.username}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {user.phoneNumber || "Không có số điện thoại"}
                            </p>
                          </div>
                          <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-700">
                            Đang chờ duyệt
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-3xl bg-white p-4 border border-slate-200">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                              Ngân hàng
                            </p>
                            <p className="mt-2 font-black text-slate-900 text-sm">
                              {user.pendingBankInfo?.bankName || "-"}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-white p-4 border border-slate-200">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                              Số tài khoản
                            </p>
                            <p className="mt-2 font-black text-slate-900 text-sm">
                              {user.pendingBankInfo?.accountNumber || "-"}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-white p-4 border border-slate-200">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                              Chủ tài khoản
                            </p>
                            <p className="mt-2 font-black text-slate-900 text-sm">
                              {user.pendingBankInfo?.accountName || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <button
                            onClick={() =>
                              handleApproveBankInfo(user.id, "approve")
                            }
                            className="flex-1 rounded-full bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-all"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() =>
                              handleApproveBankInfo(user.id, "reject")
                            }
                            className="flex-1 rounded-full bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500 transition-all"
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Xem lại lịch sử phê duyệt STK để kiểm tra nhanh.
                </p>
                <button
                  onClick={() => {
                    setHistoryMode("bank");
                    setShowHistory(true);
                  }}
                  className="rounded-full bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200"
                >
                  Xem lịch sử
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showHistory && historyMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowHistory(false);
              setHistoryMode(null);
            }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4 py-6"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => {
                  setShowHistory(false);
                  setHistoryMode(null);
                }}
                className="absolute right-5 top-5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                    {historyMode === "bank"
                      ? "Lịch sử STK"
                      : "Lịch sử tài khoản"}
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-slate-900">
                    {historyMode === "bank"
                      ? "Lịch sử phê duyệt STK"
                      : "Lịch sử phê duyệt tài khoản"}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.35em] text-slate-600">
                  {filteredHistoryItems.length} mục
                </span>
              </div>

              <div className="mt-4">
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Tìm kiếm theo tên hoặc tài khoản..."
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {filteredHistoryItems.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">
                  Không có lịch sử phù hợp.
                </p>
              ) : (
                <div className="mt-6 grid gap-3">
                  {filteredHistoryItems.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-black text-slate-900">
                            {user.fullName || user.username}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.username}
                            {historyMode === "bank" &&
                            user.pendingBankInfo?.bankName
                              ? ` • ${user.pendingBankInfo.bankName}`
                              : historyMode === "account" && user.company
                                ? ` • ${user.company}`
                                : ""}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
                            historyMode === "bank"
                              ? user.bankInfoStatus === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                              : user.approvalStatus === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {historyMode === "bank"
                            ? user.bankInfoStatus === "approved"
                              ? "Đã duyệt"
                              : "Đã từ chối"
                            : user.approvalStatus === "approved"
                              ? "Đã duyệt"
                              : "Đã từ chối"}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                        {user.updated
                          ? new Date(user.updated).toLocaleString("vi-VN")
                          : user.created
                            ? new Date(user.created).toLocaleString("vi-VN")
                            : "Không xác định"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {activeAdminPopup === "companies" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setActiveAdminPopup(null);
              setShowCompanyList(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => {
                  setActiveAdminPopup(null);
                  setShowCompanyList(false);
                }}
                className="absolute right-5 top-5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                    Quản lý công ty
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-slate-900">
                    Danh sách công ty và quản lý
                  </h2>
                </div>
              </div>

              <div className="mt-5 flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Tên công ty mới..."
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddCompany}
                  className="rounded-full bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500"
                >
                  Thêm
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-black text-slate-900">
                  Tổng số công ty
                </p>
                <p className="mt-3 text-3xl font-black text-slate-900">
                  {(appSettings.companies || []).length}
                </p>
              </div>

              <AnimatePresence>
                {showCompanyList && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 py-2">
                      {appSettings.companies.length === 0 ? (
                        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest py-4">
                          Chưa có công ty nào...
                        </p>
                      ) : (
                        appSettings.companies.map((company) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={company}
                            className="bg-slate-800 border border-slate-700/50 rounded-full pl-4 pr-1 py-1.5 flex items-center gap-2 group hover:border-blue-500/50 transition-all"
                          >
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                              {company}
                            </span>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Activity */}
      <div className="space-y-6">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            Nhân viên mới
          </h2>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-black text-blue-600">
                    {user.fullName?.charAt(0) ||
                      user.username?.charAt(0) ||
                      "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {user.fullName || user.username}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user.created
                      ? new Date(user.created).toLocaleDateString("vi-VN")
                      : "N/A"}
                  </p>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    user.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.status === "active" ? "Hoạt động" : "Vô hiệu"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-600" />
            Khiếu nại gần đây
          </h2>
          <div className="space-y-3">
            {recentComplaints.map((complaint) => (
              <div
                key={complaint.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
              >
                <div
                  className={`p-2 rounded-full ${
                    complaint.status === "pending"
                      ? "bg-orange-100"
                      : complaint.status === "resolved"
                        ? "bg-green-100"
                        : "bg-red-100"
                  }`}
                >
                  {complaint.status === "pending" ? (
                    <Clock className="w-4 h-4 text-orange-600" />
                  ) : complaint.status === "resolved" ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {complaint.title || "Khiếu nại"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {complaint.userName || "Người dùng"} •{" "}
                    {complaint.created
                      ? new Date(complaint.created).toLocaleDateString("vi-VN")
                      : "N/A"}
                  </p>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    complaint.status === "pending"
                      ? "bg-orange-100 text-orange-700"
                      : complaint.status === "resolved"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {complaint.status === "pending"
                    ? "Chờ xử lý"
                    : complaint.status === "resolved"
                      ? "Đã giải quyết"
                      : "Từ chối"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
