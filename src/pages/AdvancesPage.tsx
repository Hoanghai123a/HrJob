import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { pb } from "../lib/pocketbase";
import { Complaint, OperationType } from "../types";
import { handlePBError } from "../lib/pbUtils";
import {
  Wallet,
  Phone,
  User,
  Send,
  Clock,
  CheckCircle2,
  History,
  Inbox,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  Building,
  CreditCard,
  Calendar,
  Search,
  FileSpreadsheet,
  Download,
  Save,
  Settings2,
  Trash2,
  Square,
  CheckSquare,
  Plus,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import * as XLSX from "xlsx";

export default function AdvancesPage() {
  const { profile } = useAuth();
  const { companySettings, updateCompanySettings } = useApp();
  const [advances, setAdvances] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "pending" | "completed" | "recovered" | "rejected"
  >("pending");
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showUserHistory, setShowUserHistory] = useState(false);

  const [advanceConditions, setAdvanceConditions] = useState(
    companySettings.advanceConditions || "",
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingBulk, setProcessingBulk] = useState(false);

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingStatus, setApprovingStatus] = useState<
    "completed" | "recovered" | "rejected" | null
  >(null);
  const [bulkApprovalMode, setBulkApprovalMode] = useState(false);
  const [bulkApprovalStatus, setBulkApprovalStatus] = useState<
    "completed" | "recovered" | "rejected" | null
  >(null);

  // Form State
  const [formData, setFormData] = useState({
    name: profile?.fullName || "",
    company: profile?.company || "",
    phone: profile?.phoneNumber || "",
    content: "",
    advanceAmount: "",
  });

  // Helper to normalize bank info from possible shapes on the `profile` object
  const resolveBankInfo = (p: any) => {
    if (!p) return null;
    if (p.bankInfo && p.bankInfo.bankName) return p.bankInfo;
    // support legacy/top-level fields
    if (p.bankName || p.accountNumber || p.accountName) {
      return {
        bankName: p.bankName || "",
        accountNumber: p.accountNumber || "",
        accountName: p.accountName || "",
      };
    }
    return null;
  };

  const currentBankInfo = resolveBankInfo(profile);
  const currentPendingBankInfo = resolveBankInfo(profile?.pendingBankInfo)
    ? profile.pendingBankInfo
    : profile?.pendingBankInfo || null;

  useEffect(() => {
    fetchAdvances();
  }, [profile]);

  useEffect(() => {
    setAdvanceConditions(companySettings.advanceConditions || "");
  }, [companySettings.advanceConditions]);

  const fetchAdvances = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let data;
      if (profile.role === "admin") {
        data = await pb.collection("complaints").getFullList({
          filter: 'type = "advance"',
          sort: "-created",
        });
      } else {
        data = await pb.collection("complaints").getFullList({
          filter: `userId = "${profile.id}" && type = "advance"`,
          sort: "-created",
        });
      }
      setAdvances(data as any);
    } catch (error) {
      handlePBError(error, OperationType.GET, "advances");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    setSavingSettings(true);
    try {
      await updateCompanySettings({
        ...companySettings,
        advanceConditions,
      });
      setShowSettings(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingSettings(false);
    }
  };

  const exportAdvancesToExcel = () => {
    let dataToExport = advances;

    if (startDate && endDate) {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      dataToExport = advances.filter((item) => {
        if (!item.created) return false;
        const date = new Date(item.created);
        return isWithinInterval(date, { start, end });
      });

      if (dataToExport.length === 0) {
        alert("Không có yêu cầu nào trong khoảng thời gian đã chọn.");
        return;
      }
    }

    const data = dataToExport.map((item) => ({
      "Mã NLĐ": item.employeeId || item.userId || "",
      "Ngày yêu cầu": item.created
        ? format(new Date(item.created), "dd/MM/yyyy HH:mm")
        : "",
      "Họ tên": item.name,
      "Số điện thoại": item.phone,
      "Công ty": item.company,
      "Số tiền ứng": item.advanceAmount || 0,
      "Ngân hàng": item.bankInfo?.bankName || "",
      "Số tài khoản": item.bankInfo?.accountNumber || "",
      "Chủ tài khoản": item.bankInfo?.accountName || "",
      "Trạng thái":
        item.status === "completed"
          ? "Đã xử lý"
          : item.status === "recovered"
            ? "Đã thu hồi"
            : "Đang chờ",
      "Người phê duyệt": item.approvedByName || "",
      "Ngày phê duyệt": item.approvedDate
        ? format(new Date(item.approvedDate), "dd/MM/yyyy HH:mm")
        : "",
      "Ghi chú": item.approvalNote || "",
      "Nội dung yêu cầu": item.content || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_ung_luong");
    const fileName =
      startDate && endDate
        ? `Ung_Luong_${startDate}_den_${endDate}.xlsx`
        : `Danh_Sach_Ung_Luong_Toan_Bo_${format(new Date(), "ddMMyyyy")}.xlsx`;

    XLSX.writeFile(wb, fileName);
    setShowExportOptions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const pendingAdvances = advances.filter((c) => c.status === "pending");
    if (pendingAdvances.length >= 2) {
      alert(
        "Bạn hiện đang có 2 yêu cầu ứng đang chờ duyệt. Vui lòng đợi bộ phận nhân sự xử lý trước khi tạo yêu cầu mới.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const record = await pb.collection("complaints").create({
        ...(formData as any),
        type: "advance",
        advanceAmount: Number(formData.advanceAmount.replace(/\D/g, "")),
        bankInfo:
          resolveBankInfo(profile) ||
          resolveBankInfo(profile?.pendingBankInfo) ||
          null,
        userId: profile.id,
        employeeId: profile.employeeId || "",
        status: "pending",
        approvalHistory: [],
      });

      setAdvances([record as any, ...advances]);
      setSubmitted(true);
      setFormData({
        name: profile.fullName || "",
        company: profile.company || "",
        phone: profile.phoneNumber || "",
        content: "",
        advanceAmount: "",
      });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      handlePBError(error, OperationType.WRITE, "complaints");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: Complaint["status"],
  ) => {
    // For users: direct update (no comment needed)
    if (profile?.role !== "admin") {
      try {
        await pb.collection("complaints").update(id, {
          status: newStatus,
        });
        setAdvances((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
        );
      } catch (error) {
        handlePBError(error, OperationType.UPDATE, "complaints");
      }
      return;
    }

    // For admin: trigger modal
    setApprovingId(id);
    setApprovingStatus(newStatus);
    setApprovalNote("");
    setShowApprovalModal(true);
  };

  const handleStatusChangeWithComment = async () => {
    if (!approvingId || !approvingStatus || !profile) return;

    try {
      const item = advances.find((c) => c.id === approvingId);
      if (!item) return;

      const newApprovalRecord = {
        approvedBy: profile.id,
        approvedByName: profile.fullName || profile.username || "Admin",
        date: new Date().toISOString(),
        status: approvingStatus,
        note: approvalNote || undefined,
      };

      const currentHistory = item.approvalHistory || [];

      await pb.collection("complaints").update(approvingId, {
        status: approvingStatus,
        approvalHistory: [...currentHistory, newApprovalRecord],
        approvedBy: profile.id,
        approvedByName: profile.fullName || profile.username || "Admin",
        approvedDate: new Date().toISOString(),
        approvalNote: approvalNote || "",
      });

      setAdvances((prev) =>
        prev.map((c) =>
          c.id === approvingId
            ? {
                ...c,
                status: approvingStatus,
                approvalHistory: [...currentHistory, newApprovalRecord],
                approvedBy: profile.id,
                approvedByName: profile.fullName || profile.username || "Admin",
                approvedDate: new Date().toISOString(),
                approvalNote: approvalNote,
              }
            : c,
        ),
      );

      setShowApprovalModal(false);
      setApprovingId(null);
      setApprovingStatus(null);
      setApprovalNote("");
    } catch (error) {
      handlePBError(error, OperationType.UPDATE, "complaints");
    }
  };

  // Date range filtering logic
  useEffect(() => {
    if (startDate && endDate && profile?.role === "admin") {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));

      const autoSelected = advances
        .filter((c) => {
          if (!c.created) return false;
          const date = new Date(c.created);
          return (
            c.status === activeTab && isWithinInterval(date, { start, end })
          );
        })
        .map((c) => c.id);

      setSelectedIds(new Set(autoSelected));
    }
  }, [startDate, endDate, activeTab, profile?.role]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkAction = async (targetStatus: Complaint["status"]) => {
    if (selectedIds.size === 0) return;

    // For bulk action, show modal for admin to add comment
    if (profile?.role === "admin") {
      setBulkApprovalMode(true);
      setBulkApprovalStatus(targetStatus);
      setApprovalNote("");
      setShowApprovalModal(true);
      return;
    }

    // Fallback: direct bulk update
    if (
      !confirm(
        `Bạn có chắc chắn muốn xử lý ${selectedIds.size} yêu cầu đã chọn thành trạng thái "${targetStatus === "completed" ? "Đã duyệt" : "Đã thu hồi"}"?`,
      )
    )
      return;

    setProcessingBulk(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        pb.collection("complaints").update(id, { status: targetStatus }),
      );
      await Promise.all(promises);

      setAdvances((prev) =>
        prev.map((c) =>
          selectedIds.has(c.id) ? { ...c, status: targetStatus } : c,
        ),
      );
      setSelectedIds(new Set());
      setStartDate("");
      setEndDate("");
      alert("Xử lý hàng loạt thành công!");
    } catch (error) {
      handlePBError(error, OperationType.UPDATE, "complaints/bulk");
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkActionWithComment = async () => {
    if (selectedIds.size === 0 || !bulkApprovalStatus || !profile) return;

    setProcessingBulk(true);
    try {
      const promises = Array.from(selectedIds).map((id) => {
        const item = advances.find((c) => c.id === id);
        if (!item) return Promise.resolve();

        const newApprovalRecord = {
          approvedBy: profile.id,
          approvedByName: profile.fullName || profile.username || "Admin",
          date: new Date().toISOString(),
          status: bulkApprovalStatus,
          note: approvalNote || undefined,
        };

        const currentHistory = item.approvalHistory || [];

        return pb.collection("complaints").update(id, {
          status: bulkApprovalStatus,
          approvalHistory: [...currentHistory, newApprovalRecord],
          approvedBy: profile.id,
          approvedByName: profile.fullName || profile.username || "Admin",
          approvedDate: new Date().toISOString(),
          approvalNote: approvalNote || "",
        });
      });

      await Promise.all(promises);

      setAdvances((prev) =>
        prev.map((c) => {
          if (!selectedIds.has(c.id)) return c;

          const newApprovalRecord = {
            approvedBy: profile.id,
            approvedByName: profile.fullName || profile.username || "Admin",
            date: new Date().toISOString(),
            status: bulkApprovalStatus as any,
            note: approvalNote || undefined,
          };
          const currentHistory = c.approvalHistory || [];

          return {
            ...c,
            status: bulkApprovalStatus,
            approvalHistory: [...currentHistory, newApprovalRecord],
            approvedBy: profile.id,
            approvedByName: profile.fullName || profile.username || "Admin",
            approvedDate: new Date().toISOString(),
            approvalNote: approvalNote,
          };
        }),
      );

      setSelectedIds(new Set());
      setStartDate("");
      setEndDate("");
      setShowApprovalModal(false);
      setBulkApprovalMode(false);
      setBulkApprovalStatus(null);
      setApprovalNote("");
      alert(`Xử lý hàng loạt ${selectedIds.size} yêu cầu thành công!`);
    } catch (error) {
      handlePBError(error, OperationType.UPDATE, "complaints/bulk");
    } finally {
      setProcessingBulk(false);
    }
  };

  if (profile?.role === "admin") {
    const filteredAdvances = advances.filter((c) => {
      const matchStatus = (c.status || "pending") === activeTab;
      const matchSearch =
        searchQuery === "" ||
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery);
      return matchStatus && matchSearch;
    });

    // Determine if all currently filtered items are selected
    const areAllVisibleSelected =
      filteredAdvances.length > 0 &&
      filteredAdvances.every((c) => selectedIds.has(c.id));

    const toggleSelectAllVisible = () => {
      const visibleIds = filteredAdvances.map((c) => c.id);
      const next = new Set(selectedIds);
      if (areAllVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      setSelectedIds(next);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Quản lý Ứng lương
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-3 rounded-2xl transition-all shadow-sm",
                  showSettings
                    ? "bg-slate-900 text-white"
                    : "text-amber-600 bg-amber-50 hover:bg-amber-100",
                )}
                title="Thiết lập điều kiện ứng"
              >
                <Settings2 size={18} />
              </button>
              {advances.length > 0 && (
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  className={cn(
                    "p-3 rounded-2xl transition-all shadow-sm",
                    showExportOptions
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100",
                  )}
                  title="Xuất danh sách ứng lương"
                >
                  <FileSpreadsheet size={18} />
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showExportOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-lg shadow-emerald-50/50 space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Xuất Excel theo ngày
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportAdvancesToExcel}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Download size={14} />
                    {startDate && endDate
                      ? "Xuất theo khoảng ngày"
                      : "Xuất toàn bộ danh sách"}
                  </button>
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="px-4 text-slate-400 font-bold text-[10px] uppercase hover:text-slate-600"
                  >
                    Xóa ngày
                  </button>
                </div>
              </motion.div>
            )}
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 size={16} className="text-amber-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Cài đặt Điều kiện ứng lương
                  </h3>
                </div>
                <textarea
                  value={advanceConditions}
                  onChange={(e) => setAdvanceConditions(e.target.value)}
                  placeholder="Nhập điều kiện ứng lương cho NLĐ xem..."
                  rows={4}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-amber-500 shadow-inner leading-relaxed"
                />
                <button
                  onClick={handleUpdateSettings}
                  disabled={savingSettings}
                  className="w-full bg-amber-500 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {savingSettings ? (
                    "Đang lưu..."
                  ) : (
                    <>
                      <Save size={14} />
                      Lưu cài đặt
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
            <button
              onClick={() => {
                setActiveTab("pending");
                setSelectedIds(new Set());
              }}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                activeTab === "pending"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Inbox size={14} />
              Chờ (
              {
                advances.filter((c) => (c.status || "pending") === "pending")
                  .length
              }
              )
            </button>
            <button
              onClick={() => {
                setActiveTab("completed");
                setSelectedIds(new Set());
              }}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                activeTab === "completed"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <History size={14} />
              Đã duyệt (
              {advances.filter((c) => c.status === "completed").length})
            </button>
            <button
              onClick={() => {
                setActiveTab("recovered");
                setSelectedIds(new Set());
              }}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                activeTab === "recovered"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <CheckCircle2 size={14} />
              Thu hồi ({advances.filter((c) => c.status === "recovered").length}
              )
            </button>
            <button
              onClick={() => {
                setActiveTab("rejected");
                setSelectedIds(new Set());
              }}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                activeTab === "rejected"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <XCircle size={14} />
              Từ chối (
              {advances.filter((c) => c.status === "rejected").length})
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Tìm tên nld, sđt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="flex items-center">
                <button
                  onClick={toggleSelectAllVisible}
                  disabled={filteredAdvances.length === 0}
                  className={cn(
                    "ml-2 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    filteredAdvances.length === 0
                      ? "bg-slate-50 text-slate-300 border border-slate-100"
                      : areAllVisibleSelected
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                  title={
                    areAllVisibleSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"
                  }
                >
                  {areAllVisibleSelected ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}
                  {`Chọn tất cả (${filteredAdvances.length})`}
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Calendar size={14} />
                Lọc & Chọn theo khoảng thời gian
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 shadow-inner"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 shadow-inner"
                />
              </div>

              {selectedIds.size > 0 && (
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {activeTab === "pending" && (
                    <button
                      onClick={() => handleBulkAction("completed")}
                      disabled={processingBulk}
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Check size={14} /> Duyệt {selectedIds.size} mục
                    </button>
                  )}
                  {activeTab === "completed" && (
                    <button
                      onClick={() => handleBulkAction("recovered")}
                      disabled={processingBulk}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Download size={14} /> Thu hồi {selectedIds.size} mục
                    </button>
                  )}
                  {activeTab === "pending" && (
                    <button
                      onClick={() => handleBulkAction("rejected")}
                      disabled={processingBulk}
                      className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-rose-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <XCircle size={14} /> Từ chối {selectedIds.size} mục
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-4 text-slate-400 font-bold text-[9px] uppercase hover:text-slate-600"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAdvances.map((item) => (
            <div
              key={item.id}
              className={cn(
                "bg-white p-6 rounded-[2.5rem] border transition-all relative overflow-hidden",
                selectedIds.has(item.id)
                  ? "border-blue-600 ring-4 ring-blue-50 shadow-lg"
                  : "border-slate-200 shadow-sm",
              )}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleSelect(item.id)}
                  className="pt-1.5 focus:outline-none"
                >
                  {selectedIds.has(item.id) ? (
                    <CheckSquare className="text-blue-600" size={24} />
                  ) : (
                    <Square className="text-slate-300" size={24} />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg tracking-tight flex items-center gap-2">
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                          <Clock size={12} />
                          {item.created
                            ? format(new Date(item.created), "HH:mm dd/MM/yyyy")
                            : "Vừa xong"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 text-sm text-slate-600 leading-relaxed font-medium border border-slate-100 mb-4">
                    <div className="mb-4 pb-4 border-b border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Số tiền ứng:
                        </span>
                        <span className="text-xl font-black text-slate-900">
                          {item.advanceAmount?.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                      {item.bankInfo && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                          <p className="text-[9px] font-black uppercase text-blue-600 mb-2">
                            Thông tin nhận tiền (STK):
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-bold">
                                Ngân hàng
                              </p>
                              <p className="text-xs font-black">
                                {item.bankInfo.bankName}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase font-bold">
                                Số tài khoản
                              </p>
                              <p className="text-xs font-black text-blue-600">
                                {item.bankInfo.accountNumber}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[8px] text-slate-400 uppercase font-bold">
                                Chủ tài khoản
                              </p>
                              <p className="text-xs font-black uppercase">
                                {item.bankInfo.accountName}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {item.content || "Không có ghi chú thêm"}
                  </div>

                  {/* Approval History */}
                  {item.approvalHistory && item.approvalHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-3">
                        Lịch sử phê duyệt:
                      </p>
                      {item.approvalHistory.map((record, idx) => (
                        <div
                          key={idx}
                          className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[9px]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-slate-900">
                              {record.approvedByName}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full font-black",
                                record.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : record.status === "rejected"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-indigo-100 text-indigo-700",
                              )}
                            >
                              {record.status === "completed"
                                ? "Đã duyệt"
                                : record.status === "rejected" ? "Từ chối" : "Thu hồi"}
                            </span>
                          </div>
                          <p className="text-slate-500 font-bold">
                            {format(new Date(record.date), "HH:mm dd/MM/yyyy")}
                          </p>
                          {record.note && (
                            <p className="text-slate-600 italic mt-1">
                              "{record.note}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <a
                        href={`tel:${item.phone}`}
                        className="p-3 text-emerald-600 bg-emerald-50 rounded-2xl hover:bg-emerald-100 transition-colors shadow-sm"
                      >
                        <Phone size={18} />
                      </a>
                    </div>
                    {item.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(item.id, "rejected")}
                          className="bg-rose-50 text-rose-600 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-rose-100 transition-all active:scale-95"
                        >
                          <XCircle size={18} /> Từ chối
                        </button>
                        <button
                          onClick={() => handleStatusChange(item.id, "completed")}
                          className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                          <Check size={18} /> Duyệt
                        </button>
                      </div>
                    ) : item.status === "completed" ? (
                      <button
                        onClick={() => handleStatusChange(item.id, "recovered")}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                      >
                        <Download size={18} /> Thu hồi
                      </button>
                    ) : (
                      <div className={cn(
                        "px-4 py-2 rounded-2xl font-black text-[9px] uppercase tracking-widest border",
                        item.status === "rejected" ? "bg-rose-50 text-rose-400 border-rose-100" : "bg-slate-100 text-slate-400 border-slate-200"
                      )}>
                        {item.status === "rejected" ? "Đã từ chối" : "Đã thu hồi"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredAdvances.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-200 border-dashed">
              <Inbox size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Không tìm thấy yêu cầu nào
              </p>
            </div>
          )}
        </div>

        {/* Approval Modal */}
        <AnimatePresence>
          {showApprovalModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowApprovalModal(false);
                setApprovingId(null);
                setApprovingStatus(null);
                setBulkApprovalMode(false);
                setApprovalNote("");
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={cn(
                    "px-6 py-5 text-white flex items-center justify-between",
                    bulkApprovalStatus === "completed"
                      ? "bg-emerald-600"
                      : bulkApprovalStatus === "rejected"
                        ? "bg-rose-600"
                        : "bg-indigo-600",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {bulkApprovalStatus === "completed" ? (
                      <Check size={24} />
                    ) : bulkApprovalStatus === "rejected" ? (
                      <XCircle size={24} />
                    ) : <Download size={24} />}
                    <div>
                      <h3 className="font-black uppercase tracking-tight">
                        {bulkApprovalStatus === "completed"
                          ? "Phê duyệt yêu cầu"
                          : bulkApprovalStatus === "rejected" ? "Từ chối yêu cầu" : "Thu hồi ứng lương"}
                      </h3>
                      <p className="text-[10px] opacity-80 font-bold">
                        {bulkApprovalMode
                          ? `${selectedIds.size} yêu cầu`
                          : "1 yêu cầu"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setApprovingId(null);
                      setApprovingStatus(null);
                      setBulkApprovalMode(false);
                      setApprovalNote("");
                    }}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Ghi chú / Lý do
                    </label>
                    <textarea
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Nhập ghi chú (không bắt buộc)..."
                      rows={3}
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (bulkApprovalMode) {
                          handleBulkActionWithComment();
                        } else {
                          handleStatusChangeWithComment();
                        }
                      }}
                      disabled={processingBulk}
                      className={cn(
                        "flex-1 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95",
                        bulkApprovalStatus === "completed"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                          : bulkApprovalStatus === "rejected"
                            ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
                            : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100",
                      )}
                    >
                      {processingBulk ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Đang xử lý...
                        </>
                      ) : bulkApprovalStatus === "completed" ? (
                        <>
                          <Check size={16} /> Xác nhận phê duyệt
                        </>
                      ) : bulkApprovalStatus === "rejected" ? (
                        <>
                          <XCircle size={16} /> Xác nhận từ chối
                        </>
                      ) : <>
                          <Download size={16} /> Xác nhận thu hồi
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowApprovalModal(false);
                        setApprovingId(null);
                        setApprovingStatus(null);
                        setBulkApprovalMode(false);
                        setApprovalNote("");
                      }}
                      className="px-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // User View
  return (
    <div className="space-y-6">
      <div className="bg-amber-500 px-[20px] pt-[15px] pb-[15px] rounded-[20px] text-white space-y-3 relative overflow-hidden shadow-2xl shadow-amber-100 mb-[15px]">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight">
            {showUserHistory ? "Lịch sử ứng" : "Ứng lương"}
          </h2>
          <p className="text-amber-100 text-sm font-medium opacity-80 leading-relaxed">
            {showUserHistory
              ? "Xem lại các khoản ứng lương của bạn."
              : "Đăng ký nhận tạm ứng lương linh hoạt."}
          </p>
        </div>
        <Wallet
          size={160}
          className="absolute -right-8 -bottom-8 text-white/10"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowUserHistory(false)}
          className={cn(
            "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2",
            !showUserHistory
              ? "bg-slate-900 border-slate-900 text-white shadow-xl"
              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600",
          )}
        >
          <Plus size={14} /> Đăng ký ứng mới
        </button>
        <button
          onClick={() => setShowUserHistory(true)}
          className={cn(
            "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2",
            showUserHistory
              ? "bg-slate-900 border-slate-900 text-white shadow-xl"
              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600",
          )}
        >
          <History size={14} /> Lịch sử ứng
        </button>
      </div>

      {!showUserHistory ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white px-[20px] pt-[20px] pb-[20px] rounded-[2rem] border border-slate-200 shadow-sm space-y-6"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 items-start shadow-sm">
              <AlertTriangle
                className="text-red-600 shrink-0 mt-0.5"
                size={18}
              />
              <p className="text-[11px] font-black text-red-600 uppercase tracking-tight leading-relaxed not-italic font-bold">
                Kiểm tra lại STK, cty sẽ không chịu trách nhiệm nếu NLĐ gửi sai
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Info size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Điều kiện ứng:
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">
                {companySettings.advanceConditions ||
                  "Vui lòng liên hệ bộ phận nhân sự để biết thêm chi tiết."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Số tiền ứng
              </label>
              <div className="relative">
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={formData.advanceAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFormData({
                      ...formData,
                      advanceAmount:
                        val === ""
                          ? ""
                          : parseInt(val, 10).toLocaleString("vi-VN"),
                    });
                  }}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xl font-black text-slate-900 focus:ring-2 focus:ring-amber-500 shadow-inner placeholder:text-slate-300"
                  placeholder="Vd: 2.000.000"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  VNĐ
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Ghi chú thêm (nếu có)
              </label>
              <textarea
                rows={3}
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-amber-600 shadow-inner placeholder:text-slate-300 leading-relaxed"
                placeholder="Lý do ứng, lưu ý đặc biệt..."
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPersonalInfo(!showPersonalInfo)}
                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors py-2 px-1"
              >
                <Info size={14} /> Thông tin của tôi
                {showPersonalInfo ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>

              <AnimatePresence>
                {showPersonalInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-4"
                  >
                    {resolveBankInfo(profile) ||
                    resolveBankInfo(profile?.pendingBankInfo) ? (
                      <div
                        className={cn(
                          "p-5 rounded-2xl text-white space-y-3 shadow-xl shadow-blue-100 relative overflow-hidden",
                          profile.bankInfoStatus === "pending"
                            ? "bg-amber-500 shadow-amber-100"
                            : "bg-blue-600 shadow-blue-100",
                        )}
                      >
                        <div className="relative z-10 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard size={16} />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {profile.bankInfoStatus === "pending"
                                  ? "Tài khoản đang chờ duyệt"
                                  : "Tài khoản nhận tiền"}
                              </span>
                            </div>
                            {profile.bankInfoStatus === "pending" && (
                              <span className="bg-white/20 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                Đang chờ
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {(() => {
                              const displayInfo =
                                profile.bankInfoStatus === "pending"
                                  ? resolveBankInfo(profile?.pendingBankInfo) ||
                                    resolveBankInfo(profile)
                                  : resolveBankInfo(profile) ||
                                    resolveBankInfo(profile?.pendingBankInfo);
                              return (
                                <>
                                  <p
                                    className={`text-[10px] font-bold uppercase tracking-tighter opacity-80 ${profile.bankInfoStatus === "pending" ? "text-amber-50" : "text-blue-100"}`}
                                  >
                                    {displayInfo?.bankName}
                                  </p>
                                  <p className="text-xl font-black font-mono tracking-wider">
                                    {displayInfo?.accountNumber}
                                  </p>
                                  <p className="text-[10px] font-black uppercase mt-1 tracking-widest">
                                    {displayInfo?.accountName}
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                          <CreditCard size={100} />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-black text-red-600 uppercase">
                        Vui lòng bổ sung thông tin thẻ ATM tại trang cá nhân để
                        ứng lương.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              disabled={
                isSubmitting ||
                !(
                  resolveBankInfo(profile) ||
                  resolveBankInfo(profile?.pendingBankInfo)
                )
              }
              className={cn(
                "w-full py-5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl uppercase tracking-widest text-sm",
                submitted
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100 disabled:opacity-50",
              )}
            >
              {isSubmitting ? (
                "Đang gửi..."
              ) : submitted ? (
                <>
                  <CheckCircle2 size={24} /> Gửi thành công
                </>
              ) : (
                <>
                  <Send size={20} />
                  Gửi yêu cầu ứng
                </>
              )}
            </button>
          </div>
        </motion.form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {advances.map((item) => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      (item.status || "pending") === "pending"
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : (item.status || "pending") === "completed"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-indigo-50 text-indigo-600 border-indigo-100",
                    )}
                  >
                    {(item.status || "pending") === "pending"
                      ? "Đang chờ"
                      : (item.status || "pending") === "completed"
                        ? "Đã duyệt"
                        : "Đã thu hồi"}
                  </span>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1 bg-slate-50 w-fit px-2 py-0.5 rounded-full border border-slate-100">
                    <Clock size={12} />
                    {item.created
                      ? format(new Date(item.created), "HH:mm dd/MM/yyyy")
                      : "Vừa xong"}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-600 border border-slate-100 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Số tiền:
                  </span>
                  <span className="text-md font-black text-slate-900">
                    {item.advanceAmount?.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <p className="italic text-xs">
                  "{item.content || "Yêu cầu ứng lương"}"
                </p>
              </div>
            </div>
          ))}
          {advances.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-200 border-dashed">
              <Inbox size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Chưa có lịch sử ứng lương
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
