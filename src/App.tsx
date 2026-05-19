import React, { useState } from "react";
import { pb } from "./lib/pocketbase";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider, useApp } from "./contexts/AppContext";
import Layout from "./components/Layout";
import ProfilePage from "./pages/ProfilePage";
import AttendancePage from "./pages/AttendancePage";
import InstructionsPage from "./pages/InstructionsPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import AdvancesPage from "./pages/AdvancesPage";
import JobsPage from "./pages/JobsPage";
import PayrollPage from "./pages/PayrollPage";
import HomePage from "./pages/HomePage";
import AboutUsPage from "./pages/AboutUsPage";
import AdminPage from "./pages/AdminPage";
import { LogIn, User as UserIcon, Lock, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function AppContent() {
  const { user, profile, loading: authLoading, signIn } = useAuth();
  const { companySettings, loading: appLoading } = useApp();
  const [activeTab, setActiveTab] = useState("home");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const loading = authLoading || appLoading;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 max-w-md mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError("");
      setIsLoggingIn(true);
      try {
        await signIn(username.trim(), password);
      } catch (error: any) {
        console.error("Login error detail:", error);
        let msg = "Tài khoản hoặc mật khẩu không chính xác.";
        const em = error?.message || "";
        if (
          em === "COLLECTION_NOT_ALLOW_PASSWORD_AUTH" ||
          em
            .toString()
            .toLowerCase()
            .includes("not configured to allow password authentication")
        ) {
          msg =
            'Đăng nhập bị từ chối: collection "users" chưa được bật xác thực bằng mật khẩu. Vui lòng bật trong PocketBase Admin → Collections → users → Authentication.';
        } else if (em && em !== "Failed to authenticate.") {
          msg = em;
        } else if (em === "Failed to authenticate.") {
          msg = "Tên đăng nhập hoặc mật khẩu không chính xác.";
        }
        setLoginError(msg);
      } finally {
        setIsLoggingIn(false);
      }
    };

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setRegisterError("");
      setRegisterSuccess("");

      if (!registerUsername.trim()) {
        setRegisterError("Vui lòng nhập tên đăng nhập.");
        return;
      }
      if (!registerPhone.trim()) {
        setRegisterError("Vui lòng nhập số điện thoại.");
        return;
      }
      if (registerPassword.length < 8) {
        setRegisterError("Mật khẩu phải từ 8 ký tự trở lên.");
        return;
      }
      if (registerPassword !== registerConfirmPassword) {
        setRegisterError("Mật khẩu xác nhận không trùng khớp.");
        return;
      }

      setIsRegistering(true);
      try {
        const sanitizedPhone = registerPhone.trim();
        const quotesEscaped = sanitizedPhone.replace(/"/g, '\\"');
        const existingUsers = await pb.collection("users").getFullList({
          filter: `phoneNumber = "${quotesEscaped}"`,
        });

        if (existingUsers.length > 0) {
          setRegisterError(
            "Số điện thoại này đã được sử dụng bởi tài khoản khác.",
          );
          return;
        }

        await pb.collection("users").create({
          username: registerUsername.trim(),
          password: registerPassword,
          passwordConfirm: registerPassword,
          phoneNumber: sanitizedPhone,
          role: "user",
          defaultHC: 8,
          defaultOT: 0,
          lcb: 0,
          bankName: "",
          accountNumber: "",
          accountName: "",
          company: "",
          status:
            companySettings?.requireApproval === true ? "disabled" : "active",
          approvalStatus:
            companySettings?.requireApproval === true ? "pending" : "approved",
        });

        setRegisterSuccess(
          companySettings?.requireApproval === true
            ? "Đăng ký thành công. Yêu cầu của bạn đã được gửi tới Admin để duyệt."
            : "Đăng ký thành công. Bạn có thể đăng nhập ngay bây giờ!",
        );
        setShowRegisterModal(false);
        setRegisterUsername("");
        setRegisterPhone("");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
      } catch (error: any) {
        console.error("Register error:", error);
        const msg =
          error?.message || "Đăng ký không thành công. Vui lòng thử lại sau.";
        setRegisterError(msg.toString());
      } finally {
        setIsRegistering(false);
      }
    };

    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 max-w-md mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full border border-slate-100"
        >
          <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100 overflow-hidden p-2 border border-slate-100">
            <img
              src={companySettings.logoUrl}
              alt={companySettings.name}
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
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter uppercase text-center">
            {companySettings.name}
          </h1>
          <p className="text-slate-400 text-sm mb-8 font-medium">
            Vui lòng đăng nhập để tiếp tục
          </p>

          <div className="space-y-6">
            <div className="bg-slate-50 rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-widest">
                Đăng nhập
              </h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <div className="relative">
                    <UserIcon
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Tên đăng nhập (username)"
                      className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu"
                      className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-black focus:ring-2 focus:ring-blue-600 shadow-inner"
                    />
                  </div>
                </div>

                {loginError && (
                  <p className="text-red-500 text-xs font-bold px-2">
                    {loginError}
                  </p>
                )}

                <button
                  disabled={isLoggingIn}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                >
                  {isLoggingIn ? "Đang thực hiện..." : "Đăng nhập"}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col gap-3">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                  *Chỉ dùng username để đăng nhập, không dùng email.
                </p>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-100 uppercase tracking-widest text-sm"
                >
                  Chưa có tài khoản? Đăng ký ngay
                </button>
              </div>
            </div>

            {registerSuccess && !showRegisterModal && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700 font-bold text-sm">
                {registerSuccess}
              </div>
            )}
          </div>

          {showRegisterModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">
                      Đăng ký tài khoản mới
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                      Đăng ký bằng số điện thoại, tài khoản sẽ chờ admin duyệt.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        Tên đăng nhập
                      </label>
                      <input
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        placeholder="Tên đăng nhập"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        Số điện thoại
                      </label>
                      <input
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        placeholder="Số điện thoại"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        Mật khẩu
                      </label>
                      <input
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Mật khẩu"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        Nhập lại mật khẩu
                      </label>
                      <input
                        type="password"
                        value={registerConfirmPassword}
                        onChange={(e) =>
                          setRegisterConfirmPassword(e.target.value)
                        }
                        placeholder="Nhập lại mật khẩu"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {registerError && (
                      <p className="text-red-500 text-xs font-bold px-2">
                        {registerError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-100 uppercase tracking-widest text-sm"
                    >
                      {isRegistering
                        ? "Đang gửi yêu cầu..."
                        : "Gửi yêu cầu đăng ký"}
                    </button>
                  </form>

                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700 text-sm font-bold">
                    *Số điện thoại chỉ được dùng cho một tài khoản.
                    <br />
                    *Tài khoản sẽ được Admin duyệt trước khi kích hoạt.
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomePage onNavigate={setActiveTab} />;
      case "about":
        return <AboutUsPage />;
      case "admin":
        return <AdminPage />;
      case "profile":
        return <ProfilePage />;
      case "attendance":
        return <AttendancePage />;
      case "instructions":
        return <InstructionsPage />;
      case "complaints":
        return <ComplaintsPage />;
      case "advances":
        return <AdvancesPage />;
      case "jobs":
        return <JobsPage />;
      case "payroll":
        return <PayrollPage />;
      default:
        return <HomePage onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppProvider>
  );
}
