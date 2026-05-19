import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { pb } from "../lib/pocketbase";
import { JobPost, OperationType } from "../types";
import { handlePBError } from "../lib/pbUtils";
import {
  Phone,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Briefcase,
  FileText,
  StickyNote,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  Save,
  Search,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function JobsPage() {
  const { profile } = useAuth();
  const { appSettings } = useApp();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    images: [] as string[], // base64 strings
    mapsUrl: "",
    interviewTime: "",
    gender: "Nam/Nữ",
    baseSalary: 0,
    allowance: 0,
    requiredDocs: "",
    notes: "",
  });

  const fetchJobs = async () => {
    try {
      const data = await pb.collection("jobs").getFullList({
        sort: "-created",
      });
      setJobs(data as any);
    } catch (error) {
      handlePBError(error, OperationType.LIST, "jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - formData.images.length;
    if (remainingSlots <= 0) {
      alert("Tối đa 3 ảnh");
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, reader.result as string].slice(0, 3),
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleEdit = (job: JobPost) => {
    setEditingId(job.id);
    setFormData({
      companyName: job.companyName,
      address: job.address || "",
      images: job.images || [],
      mapsUrl: job.mapsUrl || "",
      interviewTime: job.interviewTime || "",
      gender: job.gender || "Nam/Nữ",
      baseSalary: job.baseSalary || 0,
      allowance: job.allowance || 0,
      requiredDocs: job.requiredDocs || "",
      notes: job.notes || "",
    });
    setShowAddForm(true);
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (!formData.companyName) {
        alert("Vui lòng chọn tên công ty cho tin tuyển dụng.");
        return;
      }

      // Hàm tiện ích nội bộ để biến chuỗi Base64 thành File nhị phân chuẩn PocketBase
      const base64ToFile = (base64Str: string, filename: string): File => {
        const arr = base64Str.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      };

      // Xử lý danh sách ảnh: Chỉ chuyển đổi các chuỗi Base64 mới, giữ nguyên tên file cũ nếu đang chỉnh sửa
      const processedImages = (formData.images || []).map(
        (img: string, index: number) => {
          if (typeof img === "string" && img.startsWith("data:image")) {
            return base64ToFile(img, `job_${index}_${Date.now()}.jpg`);
          }
          return img; // Giữ lại tên file cũ (chuỗi không phải base64) khi cập nhật bài viết
        },
      );

      const jobData = {
        companyName: formData.companyName,
        address: formData.address,
        images: processedImages, // <--- Đã truyền mảng File hợp lệ
        mapsUrl: formData.mapsUrl,
        interviewTime: formData.interviewTime,
        gender: formData.gender,
        baseSalary: formData.baseSalary,
        allowance: formData.allowance,
        requiredDocs: formData.requiredDocs,
        notes: formData.notes,
      };

      if (editingId) {
        await pb.collection("jobs").update(editingId, jobData);
      } else {
        await pb.collection("jobs").create(jobData);
      }

      setShowAddForm(false);
      setEditingId(null);
      setFormData({
        companyName: appSettings.companies?.[0] || "",
        address: "",
        images: [],
        mapsUrl: "",
        interviewTime: "",
        gender: "Nam/Nữ",
        baseSalary: 0,
        allowance: 0,
        requiredDocs: "",
        notes: "",
      });
      fetchJobs();
    } catch (error) {
      handlePBError(error, OperationType.WRITE, "jobs");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa tin tuyển dụng này?")) return;
    try {
      await pb.collection("jobs").delete(id);
      fetchJobs();
    } catch (error) {
      handlePBError(error, OperationType.DELETE, `jobs/${id}`);
    }
  };

  const defaultAdminPhone = "0343751753"; // Placeholder for admin phone

  const filteredJobs = jobs.filter((job) => {
    const search = searchTerm.toLowerCase();
    return (
      job.companyName.toLowerCase().includes(search) ||
      job.address?.toLowerCase().includes(search) ||
      job.requiredDocs?.toLowerCase().includes(search) ||
      job.notes?.toLowerCase().includes(search)
    );
  });
  // Hàm tiện ích chuyển đổi chuỗi mã hóa Base64 thành File nhị phân chuẩn để gửi lên PocketBase
  const convertBase64ToFile = (
    base64String: string,
    filename: string,
  ): File => {
    const arr = base64String.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  return (
    <div className="space-y-6 pt-0 pb-[15px]">
      <div className="pt-[5px] pb-[15px]">
        {/* Header Actions */}
        <div className="flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-xl pt-[5px] pb-[5px] mb-0 z-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Bảng tin
          </h2>
          <div className="flex gap-2">
            {profile?.role === "admin" && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    companyName: appSettings.companies?.[0] || "",
                    address: "",
                    images: [],
                    mapsUrl: "",
                    interviewTime: "",
                    gender: "Nam/Nữ",
                    baseSalary: 0,
                    allowance: 0,
                    requiredDocs: "",
                    notes: "",
                  });
                  setShowAddForm(true);
                }}
                className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
              >
                <Plus size={20} />
                Đăng tin
              </button>
            )}
            {profile?.role !== "admin" && (
              <a
                href={`tel:${defaultAdminPhone}`}
                className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
              >
                <Phone size={20} />
                Ứng tuyển
              </a>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search
              size={18}
              className="text-slate-400 group-focus-within:text-blue-500 transition-colors"
            />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm công ty, hồ sơ hoặc ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 rounded-[8px] pt-[4px] pb-[4px] pl-11 pr-11 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-5 mb-6"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {editingId ? "Chỉnh sửa tin tuyển dụng" : "Thêm tin tuyển dụng"}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Tên công ty
                </label>
                {appSettings.companies && appSettings.companies.length > 0 ? (
                  <select
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="" disabled>
                      Chọn công ty
                    </option>
                    {appSettings.companies.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    placeholder="Chưa có công ty nào trong hệ thống"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Địa chỉ (KCN, Khu vực...)
                </label>
                <input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Vd: Bá Thiện, Bình Xuyên..."
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Link Google Maps
                </label>
                <input
                  value={formData.mapsUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, mapsUrl: e.target.value })
                  }
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Hình ảnh (Máy ảnh/Từ máy - Tối đa 3)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {formData.images.map((img, idx) => {
                    // Xác định URL: ảnh base64 mới thì giữ nguyên, ảnh cũ từ server thì sinh URL chuẩn qua pb.files.getUrl
                    const previewUrl =
                      typeof img === "string" && img.startsWith("data:image")
                        ? img
                        : pb.files.getUrl(
                            {
                              id: editingId,
                              collectionId: "jobs",
                              collectionName: "jobs",
                            } as any,
                            img,
                          );

                    return (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden group cursor-zoom-in"
                        onClick={() => setSelectedImageUrl(previewUrl)} // Click vào ảnh preview để phóng to
                      >
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Ngăn chặn kích hoạt hành động phóng to ảnh khi bấm nút xóa
                            removeImage(idx);
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                  {formData.images.length < 3 && (
                    <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 cursor-pointer transition-all">
                      <Plus size={20} />
                      <span className="text-[8px] font-black uppercase mt-1">
                        Tải ảnh
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Giờ PV
                  </label>
                  <input
                    value={formData.interviewTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interviewTime: e.target.value,
                      })
                    }
                    placeholder="Vd: 8:00 Thứ 2"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tuyển Nam/Nữ
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Nam/Nữ">Nam/Nữ</option>
                    <option value="Nam">Chỉ Nam</option>
                    <option value="Nữ">Chỉ Nữ</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Lương CB
                  </label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseSalary: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Phụ cấp
                  </label>
                  <input
                    type="number"
                    value={formData.allowance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowance: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <textarea
                placeholder="Giấy tờ yêu cầu"
                value={formData.requiredDocs}
                onChange={(e) =>
                  setFormData({ ...formData, requiredDocs: e.target.value })
                }
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
              />
              <textarea
                placeholder="Ghi chú khác"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              onClick={handleCreateOrUpdate}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              <Save size={18} />{" "}
              {editingId ? "Cập nhật bài đăng" : "Lưu bài đăng"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.map((job) => {
          const isExpanded = expandedId === job.id;
          return (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={job.id}
              onClick={() => setExpandedId(isExpanded ? null : job.id)}
              className={cn(
                "bg-white rounded-[15px] border border-slate-200 shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-500 cursor-pointer h-fit",
                isExpanded && "shadow-xl border-blue-100 md:col-span-2",
              )}
            >
              {/* Image section - Always show images */}
              <div className="grid grid-cols-3 gap-0.5 bg-slate-100 overflow-hidden h-24 sm:h-32">
                {job.images && job.images.length > 0 ? (
                  job.images.slice(0, 3).map((img, i) => {
                    // Chuyển chuỗi tên tệp ngắn thành đường dẫn URL đầy đủ chạy qua IP LAN PocketBase
                    const fullImageUrl = pb.files.getUrl(job, img);

                    return (
                      <img
                        key={i}
                        src={fullImageUrl} // Hiển thị ảnh chuẩn gốc
                        alt="Hình ảnh bài đăng"
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 cursor-zoom-in"
                        referrerPolicy="no-referrer"
                        onClick={(e) => {
                          e.stopPropagation(); // Ngăn chặn hành động click làm đóng/mở rộng (collapse) thẻ bài viết tuyển dụng
                          setSelectedImageUrl(fullImageUrl); // Truyền link ảnh chuẩn nét vào modal để phóng to
                        }}
                      />
                    );
                  })
                ) : (
                  <div className="col-span-3 flex items-center justify-center text-slate-300">
                    <ImageIcon size={20} className="opacity-20" />
                  </div>
                )}
              </div>

              <div className="p-4 pt-[7px] pb-[7px] space-y-3">
                <div className="flex justify-between items-start mb-[5px]">
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "text-lg font-black text-slate-900 leading-tight tracking-tight transition-colors truncate",
                        !isExpanded && "group-hover:text-blue-600",
                      )}
                    >
                      {job.companyName}
                    </h3>
                    {job.address && (
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase tracking-wide">
                        {job.address}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                        Đang tuyển dụng
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {!isExpanded && (
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full">
                        Chi tiết
                      </span>
                    )}
                    {profile?.role === "admin" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(job);
                          }}
                          className="p-2 text-slate-300 hover:text-blue-500 bg-slate-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(job.id);
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 bg-slate-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-[5px]">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest">
                      Lương CB
                    </p>
                    <p className="text-xs font-normal text-slate-900">
                      {formatCurrency(job.baseSalary).replace("₫", "")}{" "}
                      <span className="text-[7px] opacity-40 font-normal underline">
                        đ
                      </span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest">
                      Phụ cấp
                    </p>
                    <p className="text-xs font-normal text-black">
                      +{formatCurrency(job.allowance).replace("₫", "")}{" "}
                      <span className="text-[7px] opacity-40 font-normal underline">
                        đ
                      </span>
                    </p>
                  </div>
                </div>

                {/* Always visible brief info */}
                <div className="grid grid-cols-2 gap-2 text-[10px] mb-[5px]">
                  <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50/50 p-1.5 rounded-lg">
                    <Calendar size={12} className="text-orange-500" />
                    <span className="truncate">
                      PV:{" "}
                      <span className="font-bold text-slate-900">
                        {job.interviewTime || "TBC"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50/50 p-1.5 rounded-lg">
                    <Users size={12} className="text-indigo-500" />
                    <span className="truncate">
                      Tuyển:{" "}
                      <span className="font-bold text-slate-900">
                        {job.gender}
                      </span>
                    </span>
                  </div>
                </div>

                {job.mapsUrl && (
                  <a
                    href={job.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-[10px] text-blue-600 font-black hover:bg-blue-50 pt-[4px] pb-[4px] pl-1.5 pr-1.5 rounded-lg transition-colors group/link"
                  >
                    <MapPin
                      size={12}
                      className="group-hover/link:animate-bounce"
                    />
                    <span>Xem vị trí Google Maps</span>
                    <ExternalLink size={10} className="ml-auto opacity-40" />
                  </a>
                )}

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pt-3 border-t border-slate-100 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative overflow-hidden group/card shadow-inner">
                          <div className="flex items-center gap-2 text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            <FileText size={10} /> Giấy tờ hồ sơ
                          </div>
                          <p className="text-[9px] text-slate-600 leading-relaxed font-medium">
                            {job.requiredDocs ||
                              "Liên hệ để biết thêm chi tiết"}
                          </p>
                        </div>
                        {job.notes && (
                          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                            <div className="flex items-center gap-2 text-[7px] font-black text-amber-600 uppercase tracking-widest mb-1">
                              Ghi chú
                            </div>
                            <p className="text-[9px] text-slate-600 leading-relaxed font-medium">
                              {job.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
        {filteredJobs.length === 0 && !loading && (
          <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-slate-200">
            {searchTerm ? (
              <>
                <Search
                  size={48}
                  className="mx-auto text-slate-300 mb-4 opacity-50"
                />
                <p className="text-slate-500 font-bold">
                  Không tìm thấy kết quả cho "{searchTerm}"
                </p>
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-2 text-blue-600 text-sm font-black hover:underline"
                >
                  Xóa tìm kiếm
                </button>
              </>
            ) : (
              <>
                <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-400 font-medium">
                  Hiện chưa có tin tuyển dụng nào.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImageUrl(null)}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImageUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedImageUrl(null)}
                className="absolute top-0 -right-2 md:-right-12 text-white/50 hover:text-white p-2 transition-colors"
                aria-label="Close preview"
              >
                <X size={32} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
