import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Home,
  Calendar,
  BookOpen,
  MessageSquare,
  User,
  Wallet,
  LayoutGrid,
  Bell,
  ChevronRight,
  Newspaper,
  ShieldCheck,
  HelpCircle,
  Check,
  Banknote,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { pb } from "../lib/pocketbase";
import { OperationType } from "../types";
import { handlePBError } from "../lib/pbUtils";

interface HomePageProps {
  onNavigate: (tab: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { profile } = useAuth();
  const { companySettings } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [rawNotifications, setRawNotifications] = useState<any[]>([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(
    new Set(),
  );

  const notifications = rawNotifications.filter(
    (n) => !dismissedNotifIds.has(n.id),
  );

  useEffect(() => {
    if (!profile) return;

    const setupSubscriptions = async () => {
      try {
        if (profile.role === "admin") {
          // ADMIN: Load initial pending bank info
          try {
            const initialPendingUsers = await pb
              .collection("users")
              .getFullList({
                filter: 'bankInfoStatus != ""',
              });
            setAdminBankNotifs(
              initialPendingUsers.map((u) => ({
                id: `bank-${u.id}`,
                title: "Cập nhật STK",
                message: `${u.fullName} xin cập nhật STK`,
                type: "bank",
                path: "profile",
              })),
            );
          } catch (err) {
            console.warn("Users collection not ready");
          }

          // ADMIN: Load initial pending complaints
          try {
            const initialPendingComplaints = await pb
              .collection("complaints")
              .getFullList({
                filter: 'status = "pending"',
              });
            setAdminComplaintNotifs(
              initialPendingComplaints.map((c) => ({
                id: `complaint-${c.id}`,
                title: "Khiếu nại mới",
                message: `${(c as any).userName || "Người dùng"} gửi khiếu nại mới`,
                type: "complaint",
                path: "complaints",
              })),
            );
          } catch (err) {
            console.warn("Complaints collection not ready");
          }

          // Subscribe to users
          try {
            pb.collection("users")
              .subscribe("*", function (e) {
                if (
                  (e.action === "update" || e.action === "create") &&
                  e.record.bankInfoStatus
                ) {
                  setAdminBankNotifs((prev) => {
                    const id = `bank-${e.record.id}`;
                    if (prev.some((n) => n.id === id)) return prev;
                    return [
                      ...prev,
                      {
                        id,
                        title: "Cập nhật STK",
                        message: `${e.record.fullName} xin cập nhật STK`,
                        type: "bank",
                        path: "profile",
                      },
                    ];
                  });
                }
              })
              .catch(() => {});
          } catch (err) {}

          // Subscribe to complaints
          try {
            pb.collection("complaints")
              .subscribe("*", function (e) {
                if (e.action === "create" && e.record.status === "pending") {
                  setAdminComplaintNotifs((prev) => {
                    const id = `complaint-${e.record.id}`;
                    if (prev.some((n) => n.id === id)) return prev;
                    return [
                      ...prev,
                      {
                        id,
                        title: "Khiếu nại mới",
                        message: `${(e.record as any).userName || "Người dùng"} gửi khiếu nại mới`,
                        type: "complaint",
                        path: "complaints",
                      },
                    ];
                  });
                }
              })
              .catch(() => {});
          } catch (err) {}
        } else {
          // REGULAR WORKER: Load initial direct guidance
          try {
            const initialGuidance = await pb
              .collection("directGuidance")
              .getFullList({
                filter: `receiverId = "${profile.id}" && read = false`,
              });

            const guidanceNotifs = initialGuidance.map((g) => ({
              id: g.id,
              title: "Thông báo mới",
              message: g.content,
              type: "guidance",
              timestamp: g.created,
              read: false,
              path: "instructions",
            }));

            let allNotifications = [...guidanceNotifs];

            if (
              profile.bankInfoStatus === "approved" &&
              !profile.bankNotificationRead
            ) {
              allNotifications.push({
                id: "bank-approved",
                title: "Tài khoản ngân hàng",
                message:
                  "Admin đã phê duyệt thông tin tài khoản ngân hàng của bạn.",
                type: "bank",
                timestamp: null,
                read: false,
                path: "profile",
              });
            }
            setRawNotifications(allNotifications);
          } catch (err) {
            console.warn("Guidance collection not ready");
          }

          // Subscribe to direct guidance
          try {
            pb.collection("directGuidance")
              .subscribe("*", function (e) {
                if (
                  e.action === "create" &&
                  e.record.receiverId === profile.id &&
                  !e.record.read
                ) {
                  setRawNotifications((prev) => {
                    if (prev.some((n) => n.id === e.record.id)) return prev;
                    return [
                      ...prev,
                      {
                        id: e.record.id,
                        title: "Thông báo mới",
                        message: e.record.content,
                        type: "guidance",
                        timestamp: e.record.created,
                        read: false,
                        path: "instructions",
                      },
                    ];
                  });
                }
              })
              .catch(() => {});
          } catch (err) {}
        }
      } catch (globalErr) {
        console.error("Subscription error:", globalErr);
      }
    };

    setupSubscriptions();

    return () => {
      pb.collection("users")
        .unsubscribe("*")
        .catch(() => {});
      pb.collection("complaints")
        .unsubscribe("*")
        .catch(() => {});
      pb.collection("directGuidance")
        .unsubscribe("*")
        .catch(() => {});
    };
  }, [profile]);

  const [adminBankNotifs, setAdminBankNotifs] = useState<any[]>([]);
  const [adminComplaintNotifs, setAdminComplaintNotifs] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role === "admin") {
      const all = [...adminBankNotifs, ...adminComplaintNotifs];
      setRawNotifications(all);
    }
  }, [adminBankNotifs, adminComplaintNotifs, profile?.role]);

  const showNotificationDot = notifications.length > 0;

  const handleNotificationItemClick = async (notif: any) => {
    await markAsReadInternal(notif);
    onNavigate(notif.path);
    setShowNotifications(false);
  };

  const markAsReadInternal = async (notif: any) => {
    if (notif.type === "guidance") {
      try {
        await pb.collection("directGuidance").update(notif.id, {
          read: true,
        });
      } catch (error) {
        handlePBError(
          error,
          OperationType.UPDATE,
          `directGuidance/${notif.id}`,
        );
      }
    } else if (notif.type === "bank" && profile?.role !== "admin") {
      try {
        await pb.collection("users").update(profile!.id, {
          bankNotificationRead: true,
        });
      } catch (error) {
        handlePBError(error, OperationType.UPDATE, `users/${profile!.id}`);
      }
    }

    // Add to session dismissed list for immediate local feedback
    setDismissedNotifIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(notif.id);
      return newSet;
    });
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notif: any) => {
    e.stopPropagation();
    await markAsReadInternal(notif);
  };

  const getNotifCountForMenuItem = (itemId: string) => {
    if (itemId === "instructions") {
      return notifications.filter((n) => n.type === "guidance").length;
    }
    if (itemId === "profile") {
      return notifications.filter((n) => n.type === "bank").length;
    }
    if (itemId === "complaints") {
      return notifications.filter((n) => n.type === "complaint").length;
    }
    return 0;
  };

  const allMenuItems = [
    {
      id: "jobs",
      label: "Bảng tin",
      icon: Newspaper,
      color: "text-blue-500",
      roles: ["user", "admin"],
    },
    {
      id: "attendance",
      label: "Chấm công",
      icon: Calendar,
      color: "text-emerald-500",
      roles: ["user", "admin"],
    },
    {
      id: "advances",
      label: "Ứng lương",
      icon: Wallet,
      color: "text-amber-500",
      roles: ["user", "admin"],
    },
    {
      id: "complaints",
      label: "Khiếu nại",
      icon: MessageSquare,
      color: "text-rose-500",
      roles: ["user", "admin"],
    },
    {
      id: "instructions",
      label: "Hướng dẫn",
      icon: BookOpen,
      color: "text-indigo-500",
      roles: ["user", "admin"],
    },
    {
      id: "admin",
      label: "Quản lý",
      icon: LayoutGrid,
      color: "text-purple-500",
      roles: ["admin"],
    },
    {
      id: "payroll",
      label: "Công lương",
      icon: Banknote,
      color: "text-emerald-600",
      roles: ["admin"],
    },
    {
      id: "profile",
      label: "Tài khoản",
      icon: User,
      color: "text-slate-600",
      roles: ["user", "admin"],
    },
  ];

  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(profile?.role || "user"),
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="pt-6 px-2"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 tracking-tighter leading-none">
            Xin chào, {profile?.fullName || "Người dùng"}
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-3 rounded-2xl shadow-sm border transition-all ${
                showNotifications
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-100 text-slate-400 hover:text-blue-600"
              }`}
            >
              <Bell size={20} />
            </button>
            {showNotificationDot && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10, x: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  className="absolute right-0 mt-3 w-[280px] bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 z-50 overflow-hidden"
                >
                  <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Thông báo
                    </h3>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {notifications.length} mới
                    </span>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationItemClick(notif)}
                          className="w-full p-4 flex gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left group cursor-pointer relative"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              notif.type === "bank"
                                ? "bg-amber-50 text-amber-600"
                                : notif.type === "complaint"
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {notif.type === "bank" ? (
                              <Wallet size={18} />
                            ) : notif.type === "complaint" ? (
                              <MessageSquare size={18} />
                            ) : (
                              <MessageSquare size={18} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {notif.title}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          </div>

                          <button
                            onClick={(e) => handleMarkAsRead(e, notif)}
                            className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-100"
                          >
                            <Check size={12} strokeWidth={3} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">
                              Đã đọc
                            </span>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell size={20} className="text-slate-300" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Không có thông báo
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Featured Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-100 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <ShieldCheck size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-2 tracking-tighter leading-tight">
            Yêu cầu nâng cao
          </h3>
          <p className="text-sm font-medium opacity-80 mb-6 leading-relaxed max-w-[200px]">
            Gửi yêu cầu cá nhân & theo dõi tiến độ xử lý trực tiếp.
          </p>
          <button
            onClick={() => onNavigate("complaints")}
            className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/10 active:scale-95 transition-all"
          >
            Bắt đầu ngay
          </button>
        </div>
      </motion.div>

      {/* Quick Menu Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Tiện ích
          </h3>
          <LayoutGrid size={16} className="text-slate-300" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {menuItems.map((item, idx) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-3 group relative"
            >
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[1.75rem] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:border-blue-100 transition-all duration-300">
                <item.icon size={26} className={item.color} />
              </div>
              {getNotifCountForMenuItem(item.id) > 0 && (
                <div className="absolute top-0 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                  {getNotifCountForMenuItem(item.id)}
                </div>
              )}
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Recent Activity / Quick Stats */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Tin mới nhất
          </h3>
          <button
            onClick={() => onNavigate("jobs")}
            className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"
          >
            Xem tất cả <ChevronRight size={12} />
          </button>
        </div>
        <div
          className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-200 transition-all group"
          onClick={() => onNavigate("jobs")}
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Newspaper
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-900 truncate">
              Cập nhật tin tuyển dụng mới
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Bạn có 3 tin tuyển dụng mới chưa xem
            </p>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <div className="bg-slate-50 rounded-3xl p-6 flex items-center gap-4 border border-dashed border-slate-200">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
          <HelpCircle size={18} className="text-slate-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-700">Bạn cần hỗ trợ?</p>
          <button
            onClick={() => onNavigate("instructions")}
            className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5"
          >
            Xem hướng dẫn sử dụng
          </button>
        </div>
      </div>
    </div>
  );
}
