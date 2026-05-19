import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { pb } from "../lib/pocketbase";
import { OperationType, UserProfile, BankInfo, BankChangeLog } from "../types";
import { handlePBError } from "../lib/pbUtils";
import {
  Save,
  LogOut,
  User as UserIcon,
  Building,
  Clock,
  Wallet,
  Banknote,
  Key,
  UserPlus,
  Users,
  Plus,
  Trash2,
  Phone,
  Hash,
  UserCircle,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Search,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Send,
  Settings2,
  Camera,
  Check,
  X,
} from "lucide-react";
import { cn, compareNames } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";

export default function ProfilePage() {
  const { profile, logout, refreshProfile, changePassword } = useAuth();
  const {
    companySettings,
    appSettings,
    updateCompanySettings,
    updateAppSettings,
  } = useApp();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);
  const [showCompanyGuidanceModal, setShowCompanyGuidanceModal] =
    useState(false);
  const [selectedGuidanceUser, setSelectedGuidanceUser] =
    useState<UserProfile | null>(null);
  const [selectedGuidanceCompany, setSelectedGuidanceCompany] = useState("");
  const [guidanceContent, setGuidanceContent] = useState("");
  const [guidanceTitle, setGuidanceTitle] = useState("");
  const [sendingGuidance, setSendingGuidance] = useState(false);
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showBankConfirm, setShowBankConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [bankLogs, setBankLogs] = useState<BankChangeLog[]>([]);

  // Admin Management State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({
    username: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: "user" as "user" | "admin",
  });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [selectedPendingUserIds, setSelectedPendingUserIds] = useState<
    string[]
  >([]);
  const pendingRequests = allUsers.filter(
    (u) => u.approvalStatus === "pending",
  );
  const isAllPendingSelected =
    pendingRequests.length > 0 &&
    pendingRequests.every((u) => selectedPendingUserIds.includes(u.id));

  const [banks, setBanks] = useState<
    { name: string; code: string; shortName: string }[]
  >([]);
  const [bankSearch, setBankSearch] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const [companyName, setCompanyName] = useState(companySettings.name);
  const [companyLogo, setCompanyLogo] = useState(companySettings.logoUrl);
  const [companyAddress, setCompanyAddress] = useState(
    companySettings.address || "",
  );
  const [companyPhone, setCompanyPhone] = useState(companySettings.phone || "");
  const [companyEmail, setCompanyEmail] = useState(companySettings.email || "");
  const [companyWebsite, setCompanyWebsite] = useState(
    companySettings.website || "",
  );
  const [savingCompany, setSavingCompany] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    fullName: "",
    phoneNumber: "",
    defaultHC: 8,
    defaultOT: 0,
    company: "",
    lcb: 0,
    chuyenCan: 0,
    doiSong: 0,
    thamNien: 0,
    bankInfo: {
      bankName: "",
      accountNumber: "",
      accountName: "",
    },
  });

  useEffect(() => {
    setCompanyName(companySettings.name);
    setCompanyLogo(companySettings.logoUrl);
    setCompanyAddress(companySettings.address || "");
    setCompanyPhone(companySettings.phone || "");
    setCompanyEmail(companySettings.email || "");
    setCompanyWebsite(companySettings.website || "");
  }, [companySettings]);

  const fetchBanks = useCallback(async () => {
    try {
      const response = await fetch("https://api.vietqr.io/v2/banks");
      const data = await response.json();
      if (data.code === "00") {
        const bankList = data.data.map((b: any) => ({
          name: b.name,
          code: b.code,
          shortName: b.shortName,
        }));
        setBanks(bankList);
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
      // Fallback static list in case API fails
      setBanks([
        {
          code: "VCB",
          shortName: "Vietcombank",
          name: "Ngân hàng TMCP Ngoại Thương Việt Nam",
        },
        {
          code: "TCB",
          shortName: "Techcombank",
          name: "Ngân hàng TMCP Kỹ Thương Việt Nam",
        },
        { code: "MB", shortName: "MBBank", name: "Ngân hàng TMCP Quân Đội" },
        { code: "ACB", shortName: "ACB", name: "Ngân hàng TMCP Á Châu" },
        {
          code: "STB",
          shortName: "Sacombank",
          name: "Ngân hàng TMCP Sài Gòn Thương Tín",
        },
        {
          code: "BIDV",
          shortName: "BIDV",
          name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
        },
        {
          code: "CTG",
          shortName: "VietinBank",
          name: "Ngân hàng TMCP Công Thương Việt Nam",
        },
        {
          code: "VPB",
          shortName: "VPBank",
          name: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
        },
      ]);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await pb.collection("users").getFullList();
      setAllUsers(data as any);
    } catch (error) {
      handlePBError(error, OperationType.GET, "users");
    }
  }, []);

  const fetchBankLogs = useCallback(async () => {
    if (!profile) return;
    try {
      let data;
      if (profile.role === "admin") {
        data = await pb.collection("bankChangeLogs").getFullList({
          sort: "-created",
        });
      } else {
        data = await pb.collection("bankChangeLogs").getFullList({
          filter: `userId = "${profile.id}"`,
          sort: "-created",
        });
      }
      setBankLogs(data as any);
    } catch (error) {
      handlePBError(error, OperationType.GET, "bankChangeLogs");
    }
  }, [profile]);

  useEffect(() => {
    fetchBanks();
    if (profile) {
      fetchBankLogs();
      setFormData({
        employeeId: profile.employeeId || "",
        fullName: profile.fullName || "",
        phoneNumber: profile.phoneNumber || "",
        defaultHC: profile.defaultHC || 8,
        defaultOT: profile.defaultOT || 0,
        company: profile.company || "",
        lcb: profile.lcb || 0,
        chuyenCan: profile.chuyenCan || 0,
        doiSong: profile.doiSong || 0,
        thamNien: profile.thamNien || 0,
        bankInfo: {
          bankName:
            profile.pendingBankInfo?.bankName ||
            profile.bankInfo?.bankName ||
            (profile as any).bankName ||
            "",
          accountNumber:
            profile.pendingBankInfo?.accountNumber ||
            profile.bankInfo?.accountNumber ||
            (profile as any).accountNumber ||
            "",
          accountName:
            profile.pendingBankInfo?.accountName ||
            profile.bankInfo?.accountName ||
            (profile as any).accountName ||
            "",
        },
      });

      if (profile.role === "admin") {
        fetchUsers();
      }
    }
  }, [profile, fetchBanks, fetchBankLogs, fetchUsers]);

  const filteredBanks = banks.filter(
    (bank) =>
      bank.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
      bank.name.toLowerCase().includes(bankSearch.toLowerCase()),
  );

  const filteredUsers = allUsers.filter(
    (u) =>
      u.id !== profile?.id &&
      (u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.employeeId?.toLowerCase().includes(userSearch.toLowerCase())),
  );

  const displayedUsers = showAllUsers
    ? filteredUsers
    : filteredUsers.slice(0, 3);

  const handleDeleteUser = async (id: string) => {
    const userToDelete = allUsers.find((u) => u.id === id);
    const isCurrentlyDisabled = userToDelete?.status === "disabled";
    const actionText = isCurrentlyDisabled ? "khôi phục" : "vô hiệu hóa";

    if (!window.confirm(`Bạn có chắc muốn ${actionText} nhân sự này?`)) return;

    try {
      const newStatus = isCurrentlyDisabled ? "active" : "disabled";
      await pb.collection("users").update(id, { status: newStatus });
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, status: newStatus as "active" | "disabled" }
            : u,
        ),
      );
      showNotification("success", `Đã ${actionText} nhân sự thành công`);
    } catch (error) {
      handlePBError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const generateRandomPassword = (): string => {
    const length = 12;
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleAdminResetPassword = async (
    userId: string,
    employeeName: string,
  ) => {
    // Tạo một mật khẩu mặc định dễ nhớ cho công nhân (Ví dụ: 12345678)
    // Hoặc bạn có thể cho hiện một ô ô nhập mật khẩu tùy ý
    const defaultNewPassword = "12345678";

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn đặt lại mật khẩu cho nhân viên [${employeeName}] về mặc định "12345678" không?`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      // Dùng quyền Admin cập nhật thẳng trường password và passwordConfirm lên máy cá nhân của bạn
      await pb.collection("users").update(userId, {
        password: defaultNewPassword,
        passwordConfirm: defaultNewPassword,
      });

      showNotification(
        "success",
        `Đã reset mật khẩu của [${employeeName}] về: 12345678`,
      );
    } catch (error: any) {
      console.error("Lỗi Admin reset mật khẩu:", error);
      showNotification(
        "error",
        "Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại quyền Admin.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportBankLogs = async () => {
    if (!profile || profile.role !== "admin") return;
    setLoading(true);
    try {
      const allLogs = await pb.collection("bankChangeLogs").getFullList({
        sort: "-created",
      });
      const exportData = allLogs.map((data) => {
        return {
          "Nhân viên": data.userName,
          Loại:
            data.type === "approval"
              ? "Duyệt"
              : data.type === "rejection"
                ? "Từ chối"
                : data.type === "request"
                  ? "Yêu cầu"
                  : "Cập nhật",
          "Ngân hàng": data.bankInfo?.bankName,
          "Số tài khoản": data.bankInfo?.accountNumber,
          "Tên tài khoản": data.bankInfo?.accountName,
          "Trạng thái":
            data.status === "approved"
              ? "Thành công"
              : data.status === "pending"
                ? "Đang chờ"
                : "Đã từ chối",
          "Người xử lý": data.processedByName || "Hệ thống",
          "Thời gian": data.created
            ? new Date(data.created).toLocaleString("vi-VN")
            : "",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "LichSuThayDoi");
      XLSX.writeFile(workbook, "Lich_su_thay_doi_tk_ngan_hang.xlsx");
      showNotification("success", "Đã xuất file excel thành công!");
    } catch (error) {
      console.error("Error exporting bank logs:", error);
      showNotification("error", "Lỗi khi xuất file excel");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAccount.username.trim()) {
      showNotification("error", "Vui lòng nhập tên đăng nhập.");
      return;
    }
    if (!newAccount.phoneNumber.trim()) {
      showNotification("error", "Vui lòng nhập số điện thoại.");
      return;
    }
    if (!newAccount.password || newAccount.password.length < 8) {
      showNotification("error", "Mật khẩu phải từ 8 ký tự trở lên.");
      return;
    }
    if (newAccount.password !== newAccount.confirmPassword) {
      showNotification("error", "Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setCreatingAccount(true);
    try {
      const sanitizedPhone = newAccount.phoneNumber.trim();
      const quotesEscaped = sanitizedPhone.replace(/"/g, '\\"');
      const existingUsers = await pb.collection("users").getFullList({
        filter: `phoneNumber = "${quotesEscaped}"`,
      });
      if (existingUsers.length > 0) {
        showNotification(
          "error",
          "Số điện thoại này đã được sử dụng bởi tài khoản khác.",
        );
        return;
      }

      await createSingleAccount(
        newAccount.username.trim(),
        newAccount.password,
        newAccount.role as "user" | "admin",
        sanitizedPhone,
        true,
      );

      showNotification(
        "success",
        "Đăng ký tài khoản thành công. Yêu cầu đã được gửi đến Admin để duyệt.",
      );
      setNewAccount({
        username: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
        role: "user",
      });
      setTimeout(fetchUsers, 1000);
    } catch (error: any) {
      if (
        error.message &&
        error.message.toString().toUpperCase().includes("ONLY SUPERUSERS")
      ) {
        showNotification(
          "error",
          "Quyền chưa đủ: chỉ PocketBase superuser mới có thể tạo tài khoản. Vui lòng cấu hình quyền tạo account trong PocketBase.",
        );
      } else {
        showNotification(
          "error",
          "Lỗi: " + (error.message || "Đã có lỗi xảy ra"),
        );
      }
    } finally {
      setCreatingAccount(false);
    }
  };

  const togglePendingSelection = (userId: string) => {
    setSelectedPendingUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSelectAllPending = () => {
    if (isAllPendingSelected) {
      setSelectedPendingUserIds([]);
      return;
    }
    setSelectedPendingUserIds(pendingRequests.map((u) => u.id));
  };

  const handleBulkApproveSelected = async () => {
    if (selectedPendingUserIds.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(
        selectedPendingUserIds.map((userId) =>
          pb.collection("users").update(userId, {
            status: "active",
            approvalStatus: "approved",
          }),
        ),
      );
      showNotification(
        "success",
        `Đã duyệt ${selectedPendingUserIds.length} tài khoản thành công.`,
      );
      setSelectedPendingUserIds([]);
      fetchUsers();
    } catch (error: any) {
      showNotification(
        "error",
        "Lỗi khi duyệt tài khoản: " + (error.message || "Đã có lỗi xảy ra"),
      );
    } finally {
      setLoading(false);
    }
  };

  const createSingleAccount = async (
    username: string,
    password: string,
    role: "user" | "admin",
    phoneNumber: string = "",
    isPending: boolean = false,
  ) => {
    try {
      await pb.collection("users").create({
        username,
        password,
        passwordConfirm: password,
        role,
        phoneNumber,
        defaultHC: 8,
        defaultOT: 0,
        lcb: 0,
        bankName: "",
        accountNumber: "",
        accountName: "",
        company: "",
        status: isPending ? "disabled" : "active",
        approvalStatus: isPending ? "pending" : "approved",
      });
    } catch (error: any) {
      if (
        error?.message &&
        error.message.toString().toUpperCase().includes("ONLY SUPERUSERS")
      ) {
        throw new Error("ONLY_SUPERUSERS_CAN_CREATE_USERS");
      }
      throw error;
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
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const errors: string[] = [];
        let success = 0;

        for (const row of data) {
          const username =
            row.Username ||
            row.username ||
            row["Tên đăng nhập"] ||
            row["Email đăng nhập"];
          const password = row.Password || row.password || row["Mật khẩu"];
          const roleRaw = row.Role || row.role || row["Quyền"] || "user";
          const role =
            roleRaw.toString().toLowerCase() === "admin" ? "admin" : "user";

          if (!username || !password || password.toString().length < 6) {
            errors.push(
              `Dòng ${data.indexOf(row) + 2}: Tên đăng nhập hoặc mật khẩu không hợp lệ.`,
            );
            continue;
          }

          try {
            await createSingleAccount(username, password, role);
            success++;
          } catch (err: any) {
            errors.push(`${username}: ${err.message}`);
          }
        }

        setBulkErrors(errors);
        if (errors.length === 0) {
          showNotification(
            "success",
            `Đã nhập thành công ${success} tài khoản.`,
          );
        } else {
          showNotification(
            "error",
            `Đã nhập ${success} tài khoản, ${errors.length} lỗi.`,
          );
        }
        fetchUsers();
      } catch (err) {
        showNotification("error", "Lỗi khi xử lý file Excel.");
      } finally {
        setBulkCreating(false);
        if (e.target) e.target.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const downloadSampleExcel = () => {
    const data = [
      { "Tên đăng nhập": "nhanvien1", "Mật khẩu": "12345678", Quyền: "user" },
      { "Tên đăng nhập": "admin_test", "Mật khẩu": "admin123", Quyền: "admin" },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập liệu");
    XLSX.writeFile(wb, "Mau_Nhap_Nhan_Su.xlsx");
  };

  const exportUsersToExcel = () => {
    const data = filteredUsers.map((u) => ({
      "Mã NV": u.employeeId || "",
      "Họ Tên": u.fullName || "",
      "Tên đăng nhập": u.username || "",
      SĐT: u.phoneNumber || "",
      "Công ty": u.company || "",
      "Ngân hàng": u.bankName || u.bankInfo?.bankName || "",
      STK: u.accountNumber || u.bankInfo?.accountNumber || "",
      "Chủ TK": u.accountName || u.bankInfo?.accountName || "",
      LCB: u.lcb || 0,
      Quyền: u.role === "admin" ? "Quản trị" : "Nhân viên",
      "Trạng thái": u.status === "disabled" ? "Vô hiệu hóa" : "Hoạt động",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách nhân sự");
    XLSX.writeFile(
      wb,
      `Danh_Sach_Nhan_Su_${new Date().toLocaleDateString("vi-VN")}.xlsx`,
    );
  };

  const handleUpdateCompanySettings = async () => {
    if (!companyName.trim() || !companyLogo.trim()) {
      showNotification("error", "Vui lòng điền đủ tên công ty và logo URL");
      return;
    }

    // Kiểm tra kích thước logo (Giới hạn tối đa 1MB)
    if (companyLogo.startsWith("data:") && companyLogo.length > 1048576) {
      showNotification(
        "error",
        "Logo quá lớn (tối đa 1MB). Vui lòng chọn ảnh nhỏ hơn.",
      );
      return;
    }

    setSavingCompany(true);
    try {
      await updateCompanySettings({
        name: companyName,
        logoUrl: companyLogo,
        address: companyAddress,
        phone: companyPhone,
        email: companyEmail,
        website: companyWebsite,
      });
      showNotification("success", "Đã cập nhật thiết lập công ty");
      setShowCompanySettings(false);
    } catch (error) {
      console.error("Error updating company settings:", error);
      showNotification("error", "Lỗi khi cập nhật thiết lập");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra kích thước file (tối đa 1MB)
    if (file.size > 1 * 1024 * 1024) {
      showNotification("error", "Logo quá lớn (tối đa 1MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/png", 0.8);
        setCompanyLogo(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (isConfirmed: boolean = false) => {
    if (!profile) return;

    const isBankNameSame = compareNames(
      formData.fullName,
      formData.bankInfo.accountName,
    );
    const hasChangedBankInfo =
      formData.bankInfo.bankName !==
        (profile.bankName || profile.bankInfo?.bankName || "") ||
      formData.bankInfo.accountNumber !==
        (profile.accountNumber || profile.bankInfo?.accountNumber || "") ||
      formData.bankInfo.accountName !==
        (profile.accountName || profile.bankInfo?.accountName || "");

    if (hasChangedBankInfo && !isBankNameSame && !isConfirmed) {
      setPendingSubmitData(formData);
      setShowBankConfirm(true);
      return;
    }

    setLoading(true);
    try {
      let dataToUpdate: any = {
        ...(isConfirmed ? pendingSubmitData : formData),
      };

      // Map back to PocketBase fields
      const updateData: any = {
        employeeId: dataToUpdate.employeeId,
        fullName: dataToUpdate.fullName,
        phoneNumber: dataToUpdate.phoneNumber,
        defaultHC: dataToUpdate.defaultHC,
        defaultOT: dataToUpdate.defaultOT,
        company: dataToUpdate.company,
        lcb: dataToUpdate.lcb,
        chuyenCan: dataToUpdate.chuyenCan,
        doiSong: dataToUpdate.doiSong,
        thamNien: dataToUpdate.thamNien,
      };

      if (hasChangedBankInfo && !isBankNameSame) {
        updateData.pendingBankInfo = dataToUpdate.bankInfo;
        updateData.bankInfoStatus = "pending";
      } else if (hasChangedBankInfo && isBankNameSame) {
        updateData.bankInfoStatus = "approved";
        updateData.pendingBankInfo = null;
        updateData.bankName = dataToUpdate.bankInfo.bankName;
        updateData.accountNumber = dataToUpdate.bankInfo.accountNumber;
        updateData.accountName = dataToUpdate.bankInfo.accountName;
      }

      await pb.collection("users").update(profile.id, updateData);

      if (hasChangedBankInfo) {
        await pb.collection("bankChangeLogs").create({
          userId: profile.id,
          userName: profile.fullName || profile.username,
          type: isBankNameSame ? "update" : "request",
          bankInfo:
            updateData.bankInfoStatus === "pending"
              ? updateData.pendingBankInfo
              : {
                  bankName: updateData.bankName,
                  accountNumber: updateData.accountNumber,
                  accountName: updateData.accountName,
                },
          status: updateData.bankInfoStatus || "approved",
        });
        fetchBankLogs();
      }

      await refreshProfile();
      showNotification(
        "success",
        isBankNameSame || !hasChangedBankInfo
          ? "Cập nhật hồ sơ thành công!"
          : "Yêu cầu thay đổi tài khoản ngân hàng đã được gửi!",
      );
      setShowBankConfirm(false);
      setPendingSubmitData(null);
    } catch (error) {
      handlePBError(error, OperationType.UPDATE, "users");
    } finally {
      setLoading(false);
    }
  };

  // add/delete handled in AdminPage; here we only fetch companies for forms

  const handlePasswordChange = async () => {
    // Validate fields
    if (!oldPassword) {
      showNotification("error", "Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!newPassword) {
      showNotification("error", "Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (newPassword.length < 8) {
      showNotification("error", "Mật khẩu mới phải từ 8 ký tự trở lên.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification("error", "Mật khẩu xác nhận không trùng khớp.");
      return;
    }
    if (oldPassword === newPassword) {
      showNotification("error", "Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setLoading(true);
    try {
      const currentUserId = pb.authStore.model?.id;
      if (!currentUserId) {
        showNotification("error", "Không xác định được tài khoản hiện tại.");
        setLoading(false);
        return;
      }

      // TRUYỀN THẲNG oldPassword VÀO ĐÂY ĐỂ POCKETBASE TỰ XÁC THỰC BẢO MẬT
      await pb.collection("users").update(currentUserId, {
        oldPassword: oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      });

      showNotification("success", "Đổi mật khẩu thành công!");
      setShowPassModal(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      // Hiển thị chi tiết lỗi trả về từ server nếu có
      const serverMessage =
        error?.data?.data?.oldPassword?.message || error?.message;
      showNotification(
        "error",
        serverMessage === "Cannot be blank."
          ? "Mật khẩu cũ không được để trống."
          : serverMessage || "Đã xảy ra lỗi khi đổi mật khẩu.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendGuidance = async () => {
    if (!profile || !selectedGuidanceUser || !guidanceContent.trim()) return;

    setSendingGuidance(true);
    try {
      await pb.collection("directGuidance").create({
        senderId: profile.id,
        receiverId: selectedGuidanceUser.id,
        title: guidanceTitle.trim() || "Hướng dẫn từ Admin",
        content: guidanceContent.trim(),
        read: false,
      });
      showNotification("success", "Đã gửi hướng dẫn thành công!");
      setShowGuidanceModal(false);
      setGuidanceContent("");
      setGuidanceTitle("");
      setSelectedGuidanceUser(null);
    } catch (error) {
      handlePBError(error, OperationType.CREATE, "directGuidance");
    } finally {
      setSendingGuidance(false);
    }
  };

  const handleSendCompanyGuidance = async () => {
    if (!profile || !selectedGuidanceCompany || !guidanceContent.trim()) return;

    const targetUsers = allUsers.filter(
      (u) => u.company === selectedGuidanceCompany,
    );
    if (targetUsers.length === 0) {
      showNotification(
        "error",
        "Không tìm thấy người dùng nào thuộc công ty này",
      );
      return;
    }

    setSendingGuidance(true);
    try {
      for (const user of targetUsers) {
        await pb.collection("directGuidance").create({
          senderId: profile.id,
          receiverId: user.id,
          title: guidanceTitle.trim() || "Hướng dẫn từ Admin",
          content: guidanceContent.trim(),
          read: false,
        });
      }

      showNotification(
        "success",
        `Đã gửi hướng dẫn tới ${targetUsers.length} người dùng công ty ${selectedGuidanceCompany}`,
      );
      setShowCompanyGuidanceModal(false);
      setGuidanceContent("");
      setGuidanceTitle("");
      setSelectedGuidanceCompany("");
    } catch (error) {
      handlePBError(error, OperationType.WRITE, "directGuidance");
    } finally {
      setSendingGuidance(false);
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
            <div
              className={cn(
                "p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md",
                notification.type === "success"
                  ? "bg-green-600/90 border-green-500 text-white"
                  : "bg-red-600/90 border-red-500 text-white",
              )}
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

      <div className="flex items-center justify-between mb-[5px]">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Tài khoản
        </h2>
        <div className="flex gap-2">
          {profile?.role === "admin" && (
            <>
              <button
                onClick={() => setShowCompanySettings(!showCompanySettings)}
                className={cn(
                  "p-3 rounded-2xl transition-all shadow-sm",
                  showCompanySettings
                    ? "bg-slate-900 text-white"
                    : "text-blue-600 bg-blue-50 hover:bg-blue-100",
                )}
                title="Thiết lập công ty"
              >
                <Settings2 size={18} />
              </button>
              <button
                onClick={() => setShowCreateAccountForm(!showCreateAccountForm)}
                className={cn(
                  "p-3 rounded-2xl transition-all shadow-sm",
                  showCreateAccountForm
                    ? "bg-slate-900 text-white"
                    : "text-blue-600 bg-blue-50 hover:bg-blue-100",
                )}
                title="Tạo nhân sự"
              >
                <UserPlus size={18} />
              </button>
            </>
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
        {profile?.role === "admin" && showCompanySettings && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 overflow-hidden mb-6"
          >
            <div className="flex items-center gap-3">
              <Settings2 className="text-blue-600" size={24} />
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Thiết lập công ty
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Tên công ty
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nhập tên công ty hiển thị..."
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Logo Công ty (Icon)
                </label>
                <div className="flex gap-4">
                  <div className="w-16 h-16 shrink-0 rounded-2xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center relative group overflow-hidden">
                    <img
                      src={companyLogo}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (
                          target.src !==
                          "https://cdn-icons-png.flaticon.com/512/9167/9167023.png"
                        ) {
                          target.src =
                            "https://cdn-icons-png.flaticon.com/512/9167/9167023.png";
                        }
                      }}
                    />
                    <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoSelect}
                      />
                    </label>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                      Click vào hình ảnh để chọn file từ thiết bị. Logo sẽ được
                      tự động căn chỉnh và sử dụng làm Favicon của trang web.
                    </p>
                    <button
                      onClick={() =>
                        document
                          .querySelector<HTMLInputElement>('input[type="file"]')
                          ?.click()
                      }
                      className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Chọn file mới
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Địa chỉ công ty..."
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="Số điện thoại liên hệ..."
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="Email liên hệ..."
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="Vd: www.vrecruit.com"
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdateCompanySettings}
                disabled={savingCompany}
                className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {savingCompany ? (
                  "Đang lưu..."
                ) : (
                  <>
                    <Save size={14} />
                    Lưu thiết lập
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateAccountForm && profile?.role === "admin" && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white space-y-6 shadow-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="text-blue-400" size={24} />
                  <h3 className="text-xl font-black tracking-tight">
                    Tạo tài khoản mới
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateAccountForm(false)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  handleCreateAccount(e);
                  // We keep it open if it fails, but user might want to close it manually
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Tên đăng nhập"
                    value={newAccount.username}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, username: e.target.value })
                    }
                    className="bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    value={newAccount.phoneNumber}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={newAccount.password}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, password: e.target.value })
                    }
                    className="bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                  />
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={newAccount.confirmPassword}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                  />
                </div>
                <div className="flex items-center gap-3 w-full justify-center">
                  <div className="flex-1 relative">
                    <select
                      value={newAccount.role}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          role: e.target.value as "user" | "admin",
                        })
                      }
                      className="w-full appearance-none bg-slate-800 border-none text-white rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    >
                      <option value="user" className="bg-slate-800">
                        User
                      </option>
                      <option value="admin" className="bg-slate-800">
                        Admin
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={creatingAccount}
                    className="flex-1 bg-blue-600 hover:bg-blue-50 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.97] disabled:opacity-50"
                  >
                    {creatingAccount ? "Đang tạo..." : "Tạo nhân sự"}
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
                        <p className="text-sm font-bold text-slate-300">
                          Chọn hoặc kéo thả file Excel vào đây
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                          Hỗ trợ định dạng .xlsx, .xls
                        </p>
                      </div>
                    )}
                  </div>
                </label>

                {bulkErrors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        Lỗi khi nhập liệu ({bulkErrors.length})
                      </p>
                    </div>
                    <div className="max-h-32 overflow-y-auto px-1 custom-scrollbar space-y-1.5">
                      {bulkErrors.map((err, idx) => (
                        <p
                          key={`bulk-${idx}`}
                          className="text-[10px] font-bold text-red-400 leading-tight"
                        >
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
        {showBankConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-[2.5rem] shadow-2xl w-full max-w-sm space-y-6"
            >
              <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-500 mb-2">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                  Xác nhận tài khoản
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">
                  Cần dùng tài khoản chính chủ, xác nhận dùng tài khoản này?
                </p>
                <p className="text-[10px] text-amber-600 font-black mt-2 uppercase tracking-widest bg-amber-50 p-2 rounded-xl">
                  Yêu cầu này sẽ được gửi cho Admin duyệt trước khi áp dụng.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBankConfirm(false);
                    setPendingSubmitData(null);
                  }}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleUpdate(true)}
                  disabled={loading}
                  className="flex-[2] bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] shadow-xl"
                >
                  {loading ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPassModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-[2.5rem] shadow-2xl w-full max-w-sm space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Đổi mật khẩu
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                  Mật khẩu phải từ 8 ký tự trở lên
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPassModal(false);
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]"
                >
                  Hủy
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  className="flex-[2] bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] shadow-xl disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : "Cập nhật"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompanyGuidanceModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowCompanyGuidanceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                  Gửi tới cả công ty
                </h3>
                <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">
                  Gửi hướng dẫn tới toàn bộ nhân sự công ty
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Building size={12} /> Chọn công ty
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGuidanceCompany}
                      onChange={(e) =>
                        setSelectedGuidanceCompany(e.target.value)
                      }
                      className="w-full appearance-none bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner cursor-pointer"
                    >
                      <option value="">Chọn công ty...</option>
                      {appSettings.companies.map((c, index) => (
                        <option
                          key={`company-${index}-${c || "empty"}`}
                          value={c}
                        >
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <ChevronDown size={16} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                    <MessageSquareText size={12} /> Tiêu đề hướng dẫn
                  </label>
                  <input
                    type="text"
                    placeholder="Vd: Thông báo cấp phát đồng phục..."
                    value={guidanceTitle}
                    onChange={(e) => setGuidanceTitle(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                    <MessageSquareText size={12} /> Nội dung hướng dẫn
                  </label>
                  <textarea
                    placeholder="Vd: Ngày mai toàn bộ nhân viên Compal sẽ được cấp phát đồng phục..."
                    rows={5}
                    value={guidanceContent}
                    onChange={(e) => setGuidanceContent(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner leading-relaxed"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCompanyGuidanceModal(false)}
                    className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSendCompanyGuidance}
                    disabled={
                      sendingGuidance ||
                      !guidanceContent.trim() ||
                      !selectedGuidanceCompany
                    }
                    className="flex-[2] bg-blue-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {sendingGuidance ? (
                      "Đang gửi..."
                    ) : (
                      <>
                        <Send size={14} />
                        Gửi hàng loạt
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGuidanceModal && selectedGuidanceUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowGuidanceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Gửi hướng dẫn riêng
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                  Tới:{" "}
                  {selectedGuidanceUser.fullName || selectedGuidanceUser.email}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                    <MessageSquareText size={12} /> Tiêu đề
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập tiêu đề hướng dẫn..."
                    value={guidanceTitle}
                    onChange={(e) => setGuidanceTitle(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                    <MessageSquareText size={12} /> Nội dung
                  </label>
                  <textarea
                    placeholder="Nhập nội dung hướng dẫn..."
                    rows={5}
                    value={guidanceContent}
                    onChange={(e) => setGuidanceContent(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner leading-relaxed"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGuidanceModal(false)}
                    className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSendGuidance}
                    disabled={sendingGuidance || !guidanceContent.trim()}
                    className="flex-[2] bg-blue-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    {sendingGuidance ? (
                      "Đang gửi..."
                    ) : (
                      <>
                        <Send size={14} />
                        Gửi ngay
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white pt-[4px] pb-[4px] pl-[9px] pr-2 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 mb-[10px]">
        <div
          className={cn(
            "flex items-center gap-5 h-[80px] pb-0",
            profile?.role !== "admin" && "border-b border-slate-50",
          )}
        >
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 shadow-sm">
            <UserIcon size={28} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Tên đăng nhập
            </p>
            <p className="font-black text-slate-900 text-[16px] tracking-tight">
              {profile?.username}
            </p>
            {profile?.role === "admin" && (
              <span className="mt-1 inline-block px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                Quản trị viên
              </span>
            )}
          </div>
        </div>

        {profile?.role !== "admin" && (
          <>
            <section className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                  <Building size={12} /> Công ty làm việc
                </label>
                <div className="relative">
                  <select
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className="w-full appearance-none bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner cursor-pointer"
                  >
                    <option value="">Chọn công ty</option>
                    {appSettings.companies.map((c, index) => (
                      <option
                        key={`company-${index}-${c || "empty"}`}
                        value={c}
                      >
                        {c}
                      </option>
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
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fullName: e.target.value.toUpperCase(),
                      })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultHC: Number(e.target.value),
                      })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultOT: Number(e.target.value),
                      })
                    }
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
                  value={
                    formData.lcb === 0
                      ? ""
                      : formData.lcb.toLocaleString("vi-VN")
                  }
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFormData({
                      ...formData,
                      lcb: val === "" ? 0 : parseInt(val, 10),
                    });
                  }}
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate">
                    Chuyên cần
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={
                      formData.chuyenCan === 0
                        ? ""
                        : formData.chuyenCan.toLocaleString("vi-VN")
                    }
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        chuyenCan: val === "" ? 0 : parseInt(val, 10),
                      });
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl px-3 py-4 text-xs font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate">
                    Đời sống
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={
                      formData.doiSong === 0
                        ? ""
                        : formData.doiSong.toLocaleString("vi-VN")
                    }
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        doiSong: val === "" ? 0 : parseInt(val, 10),
                      });
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl px-3 py-4 text-xs font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate">
                    Thâm niên
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={
                      formData.thamNien === 0
                        ? ""
                        : formData.thamNien.toLocaleString("vi-VN")
                    }
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        thamNien: val === "" ? 0 : parseInt(val, 10),
                      });
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl px-3 py-4 text-xs font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5 pt-6 border-t border-slate-50">
              <h3 className="text-xs font-black text-slate-900 flex items-center justify-between uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <Banknote size={18} className="text-blue-600" />
                  Tài khoản ngân hàng
                </div>
                {profile.bankInfoStatus === "pending" && (
                  <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-100 text-[9px] animate-pulse">
                    Đang chờ duyệt
                  </span>
                )}
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <div
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black focus-within:ring-2 focus-within:ring-blue-500 shadow-inner flex items-center justify-between cursor-pointer"
                    onClick={() => setShowBankDropdown(!showBankDropdown)}
                  >
                    <div className="truncate">
                      {formData.bankInfo.bankName || (
                        <span className="text-slate-400">Chọn ngân hàng</span>
                      )}
                    </div>
                    <Plus
                      size={16}
                      className={cn(
                        "transition-transform duration-300 text-slate-400",
                        showBankDropdown ? "rotate-45" : "rotate-0",
                      )}
                    />
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
                            <div className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Không tìm thấy ngân hàng
                            </div>
                          ) : (
                            filteredBanks.map((bank, index) => (
                              <button
                                key={`bank-${index}-${bank.code || "unknown"}`}
                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-0.5"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    bankInfo: {
                                      ...formData.bankInfo,
                                      bankName: bank.shortName,
                                    },
                                  });
                                  setShowBankDropdown(false);
                                  setBankSearch("");
                                }}
                              >
                                <span className="text-xs font-black text-slate-900">
                                  {bank.shortName}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 truncate">
                                  {bank.name}
                                </span>
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankInfo: {
                        ...formData.bankInfo,
                        accountNumber: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black font-mono focus:ring-2 focus:ring-blue-500 shadow-inner"
                />
                <input
                  placeholder="Tên chủ tài khoản (Viết hoa)"
                  type="text"
                  value={formData.bankInfo.accountName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankInfo: {
                        ...formData.bankInfo,
                        accountName: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black uppercase focus:ring-2 focus:ring-blue-500 shadow-inner"
                />
              </div>
            </section>

            <button
              onClick={() => handleUpdate()}
              disabled={loading}
              className="w-full bg-slate-900 text-white rounded-[1.5rem] py-5 font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl uppercase tracking-widest text-sm"
            >
              {loading ? (
                "Đang lưu..."
              ) : (
                <>
                  <Save size={20} />
                  Cập nhật hồ sơ
                </>
              )}
            </button>

            {bankLogs.length > 0 && (
              <div className="pt-6 border-t border-slate-50 space-y-4">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest px-1">
                  <Clock size={16} className="text-slate-400" />
                  Lịch sử thay đổi tài khoản
                </h3>
                <div className="space-y-3">
                  {bankLogs.map((log, index) => (
                    <div
                      key={log.id || `log-${index}`}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                              log.status === "approved"
                                ? "bg-emerald-50 text-emerald-600"
                                : log.status === "pending"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-red-50 text-red-600",
                            )}
                          >
                            {log.status === "approved"
                              ? "Thành công"
                              : log.status === "pending"
                                ? "Đang chờ"
                                : "Đã từ chối"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">
                            {log.created
                              ? new Date(log.created).toLocaleDateString(
                                  "vi-VN",
                                ) +
                                " " +
                                new Date(log.created).toLocaleTimeString(
                                  "vi-VN",
                                  { hour: "2-digit", minute: "2-digit" },
                                )
                              : ""}
                          </span>
                        </div>
                        <p className="text-[11px] font-black text-slate-900 truncate">
                          {log.bankInfo.bankName}: {log.bankInfo.accountNumber}
                        </p>
                        <p className="text-[9px] text-slate-500 font-medium italic">
                          Tên TK: {log.bankInfo.accountName}
                        </p>
                        {log.processedByName && (
                          <p className="text-[8px] text-slate-400 mt-1">
                            Được xử lý bởi: {log.processedByName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Admin Management Section */}
      {profile?.role === "admin" && (
        <div className="space-y-6">
          {/* Company management moved to Quản lý page */}

          {/* Pending Bank Approvals */}
          {allUsers.some((u) => u.bankInfoStatus === "pending") && (
            <div className="bg-white p-6 rounded-[2.5rem] border border-amber-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Duyệt tài khoản ngân hàng
                    </h3>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                      Đang chờ xử lý
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-amber-50 border border-amber-100 rounded-full">
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                    {
                      allUsers.filter((u) => u.bankInfoStatus === "pending")
                        .length
                    }{" "}
                    Yêu cầu
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allUsers
                  .filter((u) => u.bankInfoStatus === "pending")
                  .map((u, index) => (
                    <div
                      key={u.id || u.uid || `pending-user-${index}`}
                      className="bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 space-y-4 hover:border-amber-200 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                              <span className="text-[10px] font-black">
                                {u.fullName?.charAt(0)}
                              </span>
                            </div>
                            <p className="text-[13px] font-black text-slate-900 truncate uppercase tracking-tight">
                              {u.fullName}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pb-2">
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Ngân hàng
                              </p>
                              <p className="text-[10px] font-bold text-slate-700 truncate">
                                {u.pendingBankInfo?.bankName}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Số tài khoản
                              </p>
                              <p className="text-[10px] font-black text-blue-600 tracking-wider bg-white px-2 py-0.5 rounded-md inline-block">
                                {u.pendingBankInfo?.accountNumber}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                              Chủ tài khoản
                            </p>
                            <p className="text-[10px] font-bold text-slate-600 italic uppercase">
                              {" "}
                              {u.pendingBankInfo?.accountName}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            handleAdminApproveBank(u.uid, "approve")
                          }
                          className="flex items-center justify-center gap-2 py-2.5 text-[10px] font-black text-emerald-600 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          <Check size={14} /> DUYỆT
                        </button>
                        <button
                          onClick={() =>
                            handleAdminApproveBank(u.uid, "reject")
                          }
                          className="flex items-center justify-center gap-2 py-2.5 text-[10px] font-black text-red-600 bg-white border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          <X size={14} /> TỪ CHỐI
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="bg-white p-2 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <div className="px-4 pt-4 flex flex-col gap-4 mb-[10px]">
              <div className="flex items-center justify-between mb-[3px]">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-600" size={24} />
                  <h3 className="text-[12px] leading-[15px] font-black text-slate-900 tracking-tight">
                    Danh sách nhân sự
                  </h3>
                </div>
                <button
                  onClick={fetchUsers}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-xl"
                  title="Làm mới danh sách"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowCompanyGuidanceModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all shadow-sm active:scale-95"
                  title="Gửi hướng dẫn hàng loạt cho công ty"
                >
                  <Send size={14} /> Gửi theo công ty
                </button>
                <button
                  onClick={exportUsersToExcel}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-600 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-green-100 transition-all shadow-sm active:scale-95"
                  title="Xuất file Excel"
                >
                  <Download size={14} /> Xuất Excel
                </button>
              </div>

              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, email, mã NV..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 shadow-inner"
                />
              </div>
              <p className="text-[9px] font-bold text-slate-400 px-1 italic">
                * Icon Khóa/Mở để vô hiệu hóa quyền truy cập. Icon Chìa khóa để
                gửi email reset mật khẩu.
              </p>

              <div className="space-y-3 max-h-[600px] overflow-y-auto px-1 custom-scrollbar pb-4">
                {pendingRequests.length > 0 && (
                  <div className="bg-slate-100 rounded-3xl border border-slate-200 p-4 mb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Có {pendingRequests.length} yêu cầu đăng ký chờ duyệt
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                        <button
                          onClick={handleSelectAllPending}
                          className="px-4 py-3 bg-slate-900 text-white rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                          {isAllPendingSelected
                            ? "Bỏ chọn tất cả"
                            : "Chọn tất cả"}
                        </button>
                        <button
                          onClick={handleBulkApproveSelected}
                          disabled={
                            selectedPendingUserIds.length === 0 || loading
                          }
                          className="px-4 py-3 bg-emerald-500 text-white rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Duyệt{" "}
                          {selectedPendingUserIds.length > 0
                            ? `(${selectedPendingUserIds.length})`
                            : "đã chọn"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Không tìm thấy nhân sự phù hợp
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedUsers.map((u, index) => (
                      <motion.div
                        key={u.id || u.uid || `user-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "bg-white rounded-[1.5rem] border transition-all",
                          expandedUserId === u.uid
                            ? "ring-2 ring-blue-500/20 border-blue-500 shadow-md"
                            : "border-slate-100",
                        )}
                      >
                        <div
                          className="p-4 cursor-pointer flex items-center justify-between"
                          onClick={() =>
                            setExpandedUserId(
                              expandedUserId === u.uid ? null : u.uid,
                            )
                          }
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm",
                                u.status === "disabled"
                                  ? "bg-slate-200 text-slate-400"
                                  : "bg-blue-50 text-blue-600",
                              )}
                            >
                              {u.fullName
                                ? u.fullName.charAt(0)
                                : u.username?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[12px] leading-[15px] font-black text-slate-900 truncate tracking-tight flex items-center gap-2">
                                {u.fullName || u.username}
                                {u.approvalStatus === "pending" && (
                                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-amber-700">
                                    Chờ duyệt
                                  </span>
                                )}
                                {expandedUserId === u.uid ? (
                                  <ChevronUp
                                    size={14}
                                    className="text-blue-600"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-slate-400"
                                  />
                                )}
                              </h3>
                              <div className="flex items-center gap-2 text-[8px]">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                  {u.employeeId || "Chưa có mã"}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[8px] font-bold text-slate-400 truncate">
                                  {u.company || "HR Pro"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {u.approvalStatus === "pending" && (
                              <label className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <input
                                  type="checkbox"
                                  checked={selectedPendingUserIds.includes(
                                    u.id,
                                  )}
                                  onChange={() => togglePendingSelection(u.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Chờ duyệt
                              </label>
                            )}
                            <button
                              onClick={() =>
                                handleAdminResetPassword(u.id, u.email!)
                              }
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Gửi email đổi mật khẩu"
                            >
                              <Key size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGuidanceUser(u);
                                setShowGuidanceModal(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Gửi hướng dẫn riêng"
                            >
                              <MessageSquareText size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.uid)}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                u.status === "disabled"
                                  ? "text-green-500 hover:bg-green-50"
                                  : "text-slate-400 hover:text-red-500 hover:bg-red-50",
                              )}
                              title={
                                u.status === "disabled"
                                  ? "Khôi phục tài khoản"
                                  : "Vô hiệu hóa tài khoản"
                              }
                            >
                              {u.status === "disabled" ? (
                                <ShieldCheck size={14} />
                              ) : (
                                <ShieldAlert size={14} />
                              )}
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedUserId === u.uid && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-slate-50/50 border-t border-slate-100"
                            >
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    Tên đăng nhập
                                  </p>
                                  <p className="text-xs font-bold text-slate-800">
                                    {u.username}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    Email
                                  </p>
                                  <p className="text-xs font-bold text-slate-800">
                                    {u.email || "Chưa cập nhật"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    Số điện thoại
                                  </p>
                                  <p className="text-xs font-bold text-slate-800">
                                    {u.phoneNumber || "Chưa cập nhật"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    Mã nhân viên
                                  </p>
                                  <p className="text-xs font-bold text-slate-800">
                                    {u.employeeId || "Chưa cập nhật"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    Lương cơ bản
                                  </p>
                                  <p className="text-xs font-bold text-slate-800">
                                    {u.lcb?.toLocaleString("vi-VN")} đ
                                  </p>
                                </div>
                                <div className="md:col-span-2 p-3 bg-white rounded-2xl border border-slate-100 space-y-3">
                                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-50 pb-2">
                                    Thông tin tài khoản ngân hàng
                                  </p>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        Ngân hàng
                                      </p>
                                      <p className="text-[11px] font-bold text-slate-800">
                                        {u.bankName ||
                                          u.bankInfo?.bankName ||
                                          "---"}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        Số tài khoản
                                      </p>
                                      <p className="text-[11px] font-bold text-blue-600">
                                        {u.accountNumber ||
                                          u.bankInfo?.accountNumber ||
                                          "---"}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        Chủ tài khoản
                                      </p>
                                      <p className="text-[11px] font-black text-slate-800 truncate">
                                        {u.accountName ||
                                          u.bankInfo?.accountName ||
                                          "---"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="md:col-span-2 flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                                      u.role === "admin"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-200 text-slate-600",
                                    )}
                                  >
                                    Quyền:{" "}
                                    {u.role === "admin"
                                      ? "Quản trị"
                                      : "Nhân viên"}
                                  </span>
                                  {u.status === "disabled" && (
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
            </div>

            {filteredUsers.length > 3 && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => setShowAllUsers(!showAllUsers)}
                  className="w-full py-4 text-xs font-black text-blue-600 bg-blue-50/50 rounded-2xl hover:bg-blue-50 transition-all uppercase tracking-widest"
                >
                  {showAllUsers
                    ? "Thu gọn danh sách"
                    : `Xem toàn bộ (${filteredUsers.length})`}
                </button>
              </div>
            )}
          </div>

          {bankLogs.length > 0 && (
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-600" size={24} />
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Lịch sử phê duyệt tài khoản
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Các yêu cầu đã xử lý
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchBankLogs}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-xl"
                    title="Làm mới lịch sử"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={handleExportBankLogs}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-[10px] font-black text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all uppercase tracking-widest"
                  >
                    <FileSpreadsheet size={16} />
                    Xuất Excel
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {bankLogs
                  .filter(
                    (log) =>
                      log.type === "approval" || log.type === "rejection",
                  )
                  .map((log, index) => (
                    <div
                      key={log.id || `log-${index}`}
                      className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                              log.status === "approved"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-red-50 text-red-600 border-red-100",
                            )}
                          >
                            {log.status === "approved"
                              ? "Đã duyệt"
                              : "Đã từ chối"}
                          </span>
                          <p className="text-[9px] font-black text-slate-900 truncate uppercase tracking-tight">
                            {log.userName}
                          </p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500">
                          {log.bankInfo.bankName}: {log.bankInfo.accountNumber}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[8px] text-slate-400 font-bold uppercase">
                            {log.created
                              ? new Date(log.created).toLocaleDateString(
                                  "vi-VN",
                                ) +
                                " " +
                                new Date(log.created).toLocaleTimeString(
                                  "vi-VN",
                                  { hour: "2-digit", minute: "2-digit" },
                                )
                              : ""}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-[8px] text-slate-400">
                            Xử lý bởi: {log.processedByName || "Admin"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                {bankLogs.filter(
                  (log) => log.type === "approval" || log.type === "rejection",
                ).length === 0 && (
                  <div className="py-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Chưa có lịch sử phê duyệt
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
