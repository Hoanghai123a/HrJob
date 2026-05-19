import React, { createContext, useContext, useEffect, useState } from "react";
import { pb } from "../lib/pocketbase";
import { handlePBError } from "../lib/pbUtils";
import { OperationType, CompanySettings, AppSettings } from "../types";

const SETTINGS_RECORD_ID = "47mvjm6jnab6rxs";

interface AppContextType {
  companySettings: CompanySettings;
  appSettings: AppSettings;
  updateCompanySettings: (settings: CompanySettings) => Promise<void>;
  updateAppSettings: (settings: AppSettings) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: "HR PRO",
    logoUrl: "https://cdn-icons-png.flaticon.com/512/9167/9167023.png",
    address: "KCN Khai Quang, Vĩnh Yên, Vĩnh Phúc",
    advanceConditions:
      "Nhân viên có thâm niên trên 6 tháng được ứng tối đa 50% lương cơ bản.",
    phone: "0343 751 753",
    email: "contact@vrecruit.com",
    website: "www.vrecruit.com",
    description:
      "HR PRO là đơn vị hàng đầu trong việc kết nối và cung ứng nguồn nhân lực chất lượng cho các khu công nghiệp. Với hơn 5 năm kinh nghiệm, chúng tôi cam kết mang lại giá trị bền vững cho cả người lao động và doanh nghiệp.",
    stats: {
      workers: "5.000+",
      partners: "50+",
    },
    documents: [],
    requireApproval: false,
  });
  const [appSettings, setAppSettings] = useState<AppSettings>({
    companies: [],
    requireApproval: false,
  });
  const [settingsRecordId, setSettingsRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const defaultSettings = {
      name: "HR PRO",
      logoUrl: "https://cdn-icons-png.flaticon.com/512/9167/9167023.png",
      address: "KCN Khai Quang, Vĩnh Yên, Vĩnh Phúc",
      advanceConditions:
        "Nhân viên có thâm niên trên 6 tháng được ứng tối đa 50% lương cơ bản.",
      phone: "0343 751 753",
      email: "contact@vrecruit.com",
      website: "www.vrecruit.com",
      description:
        "HR PRO là đơn vị hàng đầu trong việc kết nối và cung ứng nguồn nhân lực chất lượng cho các khu công nghiệp. Với hơn 5 năm kinh nghiệm, chúng tôi cam kết mang lại giá trị bền vững cho cả người lao động và doanh nghiệp.",
    };

    const loadRecord = (record: any) => {
      setSettingsRecordId(record.id);
      setCompanySettings({
        ...(record as any),
        logoUrl: record.logoUrl || defaultSettings.logoUrl,
        requireApproval:
          record.requireApproval !== undefined ? record.requireApproval : false,
      });
      setAppSettings({
        companies: record.companyName || record.companies || [],
        requireApproval:
          record.requireApproval !== undefined ? record.requireApproval : false,
      });
    };

    const startSubscription = async (recordId: string) => {
      try {
        unsubscribe = await pb
          .collection("settings")
          .subscribe(recordId, function (e) {
            if (e.action === "update" || e.action === "create") {
              // 1. Cập nhật Company Settings an toàn
              setCompanySettings((prev) => ({
                ...prev,
                ...(e.record as any),
                logoUrl: e.record.logoUrl || prev.logoUrl,
                requireApproval:
                  e.record.requireApproval !== undefined
                    ? e.record.requireApproval
                    : prev.requireApproval,
              }));

              // 2. SỬA TẠI ĐÂY: Thêm (prev) => để biến prev hợp lệ 100%
              setAppSettings((prev) => ({
                companies: e.record.companyName || e.record.companies || [],
                requireApproval:
                  e.record.requireApproval !== undefined
                    ? e.record.requireApproval
                    : prev.requireApproval,
              }));
            }
          });
      } catch (err) {
        console.warn("Could not subscribe to settings:", err);
      }
    };

    const fetchSettings = async () => {
      try {
        let record: any | null = null;

        try {
          record = await pb.collection("settings").getOne(SETTINGS_RECORD_ID);
        } catch (error: any) {
          if (error?.status !== 404) {
            throw error;
          }
          record = null;
        }

        if (!record) {
          const list = await pb.collection("settings").getFullList({
            sort: "-updated",
          });
          if (list.length > 0) {
            record = list[0];
          }
        }

        if (!record) {
          record = await pb.collection("settings").create({
            companyName: [],
            name: defaultSettings.name,
            logoUrl: defaultSettings.logoUrl,
            address: defaultSettings.address,
            phone: defaultSettings.phone,
            email: defaultSettings.email,
            website: defaultSettings.website,
            description: defaultSettings.description,
            advanceConditions: defaultSettings.advanceConditions,
            requireApproval: false,
          });
        }

        if (record) {
          loadRecord(record);
          await startSubscription(record.id);
        }
      } catch (error) {
        console.warn(
          "Settings not found or not accessible, using default settings.",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    // Update document title
    document.title = companySettings.name;

    // Update favicon
    const existingLink = document.querySelector(
      "link[rel~='icon']",
    ) as HTMLLinkElement;
    const link = existingLink || document.createElement("link");
    link.type = "image/png";
    link.rel = "icon";
    link.href = companySettings.logoUrl;
    if (!existingLink) {
      document.head.appendChild(link);
    }
  }, [companySettings]);

  const updateCompanySettings = async (settings: CompanySettings) => {
    const payload = {
      ...settings,
      companies: appSettings.companies,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (settingsRecordId) {
        await pb.collection("settings").update(settingsRecordId, payload);
        setCompanySettings(settings);
        return;
      }

      const newRecord = await pb.collection("settings").create(payload);
      setSettingsRecordId(newRecord.id);
      setCompanySettings({
        ...(newRecord as any),
        logoUrl: newRecord.logoUrl || settings.logoUrl,
      });
      setAppSettings({
        companies: newRecord.companyName || newRecord.companies || [],
      });
    } catch (error) {
      handlePBError(error, OperationType.WRITE, "settings");
    }
  };

  const updateAppSettings = async (settings: AppSettings) => {
    const payload: any = {
      companyName: settings.companies,
      updatedAt: new Date().toISOString(),
    };
    if (settings.requireApproval !== undefined) {
      payload.requireApproval = settings.requireApproval;
    }

    try {
      if (settingsRecordId) {
        await pb.collection("settings").update(settingsRecordId, payload);
        setAppSettings(settings);
        if (settings.requireApproval !== undefined) {
          setCompanySettings((prev) => ({
            ...prev,
            requireApproval: settings.requireApproval,
          }));
        }
        return;
      }

      const newRecord = await pb.collection("settings").create({
        ...companySettings,
        companyName: settings.companies,
        requireApproval: settings.requireApproval ?? false,
      });
      setSettingsRecordId(newRecord.id);
      setAppSettings({
        companies: newRecord.companyName || [],
        requireApproval:
          newRecord.requireApproval !== undefined
            ? newRecord.requireApproval
            : false,
      });
      setCompanySettings({
        ...(newRecord as any),
        logoUrl: newRecord.logoUrl || companySettings.logoUrl,
        requireApproval:
          newRecord.requireApproval !== undefined
            ? newRecord.requireApproval
            : false,
      });
    } catch (error) {
      handlePBError(error, OperationType.WRITE, "settings");
    }
  };

  return (
    <AppContext.Provider
      value={{
        companySettings,
        appSettings,
        updateCompanySettings,
        updateAppSettings,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
