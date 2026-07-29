import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useGarden } from "../../contexts/GardenContext";
import { useToast } from "../../contexts/ToastContext";
import { DateRangeSelector, DateRange } from "../../components/DateRangeSelector";
import {
  getHerbs, saveHerb, deleteHerb, getQuizzes, saveQuiz, deleteQuiz,
  getGarden, saveGarden, getUsers, getStatsDateRange, getPopularQuestions,
  getVisitorCount, saveVisitorCount, getScanCount, saveScanCount, getChatCount, saveChatCount,
  clearAllStatisticsLogs, formatThaiDate
} from "../../services/db";
import { Herb, Quiz, Garden } from "../../types";
import {
  Shield, Landmark, Leaf, HelpCircle, Award, BarChart, Settings,
  Plus, Edit, Trash2, Save, X, ExternalLink, RefreshCw, Upload, Eye,
  Sparkles, Download, Check, AlertTriangle, FileText, ChevronRight, Globe, Facebook, Info, Calendar, Camera, QrCode
} from "lucide-react";

export const AdminPortal: React.FC = () => {
  const { user } = useAuth();
  const { currentGarden, switchGarden } = useGarden();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      showToast("ความปลอดภัย: ปฏิเสธการเข้าถึงเฉพาะผู้ดูแลระบบสมุนไพรเท่านั้น", "error");
      navigate("/");
    }
  }, [user, navigate]);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "garden" | "settings" | "herbs" | "quizzes" | "ai_builder" | "import_export" | "certificates"
  >("dashboard");

  // State Management
  const [localHerbs, setLocalHerbs] = useState<Herb[]>([]);
  const [localQuizzes, setLocalQuizzes] = useState<Quiz[]>([]);
  const [localGarden, setLocalGarden] = useState<Garden | null>(null);

  // Date Range Filter State for Dashboard Telemetry
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange>({
    preset: "all",
    startDate: "",
    endDate: ""
  });

  // Dashboard Analytics Numbers
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [scanCount, setScanCount] = useState<number>(0);
  const [aiChatCount, setAiChatCount] = useState<number>(0);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // AI Analytics Report
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyticsReport, setAnalyticsReport] = useState<{
    summaryText: string;
    popularHerbsText: string;
    difficultTopicsText: string;
    aiRecommendationsText: string;
  } | null>(() => {
    const saved = localStorage.getItem("herbal_platform_ai_analysis_report");
    return saved ? JSON.parse(saved) : null;
  });

  // CSV Import State
  const [csvPreviewList, setCsvPreviewList] = useState<any[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // AI Knowledge Builder State
  const [aiBuilderText, setAiBuilderText] = useState("");
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderStep, setBuilderStep] = useState("");
  const [builderDraft, setBuilderDraft] = useState<{
    herb: Partial<Herb>;
    quizzes: Array<{ question: string; answerScheme: string }>;
  } | null>(null);

  // Form Modals
  const [herbModalOpen, setHerbModalOpen] = useState(false);
  const [editingHerb, setEditingHerb] = useState<Partial<Herb> | null>(null);

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Partial<Quiz> | null>(null);

  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    type: "herb" | "quiz";
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const updateAdminData = () => {
      if (currentGarden) {
        setLocalHerbs(getHerbs(currentGarden.gardenId));
        setLocalQuizzes(getQuizzes(currentGarden.gardenId));
        setLocalGarden({ ...currentGarden });
        setVisitorCount(getVisitorCount(currentGarden.gardenId, dateRangeFilter.startDate, dateRangeFilter.endDate));
        setScanCount(getScanCount(currentGarden.gardenId, dateRangeFilter.startDate, dateRangeFilter.endDate));
        setAiChatCount(getChatCount(currentGarden.gardenId, dateRangeFilter.startDate, dateRangeFilter.endDate));
      }
    };

    updateAdminData();

    window.addEventListener("db_synced", updateAdminData);
    window.addEventListener("storage", updateAdminData);
    window.addEventListener("stats_cleared", updateAdminData);

    return () => {
      window.removeEventListener("db_synced", updateAdminData);
      window.removeEventListener("storage", updateAdminData);
      window.removeEventListener("stats_cleared", updateAdminData);
    };
  }, [currentGarden, activeTab, dateRangeFilter]);

  if (!user || user.role !== "admin") return null;

  const dateRange = getStatsDateRange(currentGarden?.gardenId);
  const realQuestions = getPopularQuestions(currentGarden?.gardenId);

  // Save visitors metrics
  const saveVisitorMetric = (v: number) => {
    setVisitorCount(v);
    saveVisitorCount(v);
  };
  const saveScanMetric = (s: number) => {
    setScanCount(s);
    saveScanCount(s);
  };
  const saveChatMetric = (c: number) => {
    setAiChatCount(c);
    saveChatCount(c);
  };

  // Reset all stats function
  const handleConfirmReset = () => {
    clearAllStatisticsLogs();
    setVisitorCount(0);
    setScanCount(0);
    setAiChatCount(0);
    setAnalyticsReport(null);
    localStorage.removeItem("herbal_platform_ai_analysis_report");
    setShowResetModal(false);
    showToast("ล้างข้อมูลสถิติกิจกรรมและทำเนียบเกียรติยศทั้งหมดเป็น 0 เรียบร้อยแล้ว!", "success");
  };

  // --- 1. GARDEN FORM ACTIONS ---
  const handleSaveGarden = () => {
    if (localGarden) {
      saveGarden(localGarden);
      // Force refresh current context
      switchGarden(localGarden.gardenId);
      showToast("บันทึกปรับปรุงข้อมูลสวนพฤกษศาสตร์เรียบร้อยแล้ว!", "success");
    }
  };

  // Image Upload Helpers for Garden Settings
  const handleGardenLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !localGarden) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setLocalGarden({ ...localGarden, logo: base64 });
        showToast("อัปโหลดโลโก้สวนจากเครื่องสำเร็จ", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGardenBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !localGarden) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setLocalGarden({ ...localGarden, banner: base64 });
        showToast("อัปโหลดภาพปกสวนจากเครื่องสำเร็จ", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  // --- 2. HERB FORM ACTIONS ---
  const handleHerbImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingHerb) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast("ขนาดไฟล์ใหญ่เกินไป (ควรไม่เกิน 8MB)", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setEditingHerb({ ...editingHerb, images: [base64] });
        showToast("อัปโหลดและแปลงรูปภาพสมุนไพรเข้าสู่ระบบสำเร็จ", "success");
      }
    };
    reader.readAsDataURL(file);
  };
  const handleOpenHerbModal = (herb?: Herb) => {
    if (herb) {
      setEditingHerb({ ...herb });
    } else {
      setEditingHerb({
        herbId: "HERB_" + Math.random().toString(36).substring(2, 9),
        gardenId: currentGarden.gardenId,
        thaiName: "",
        scientificName: "",
        family: "",
        category: "general",
        description: "",
        properties: [],
        usage: "",
        precautions: "",
        location: "",
        images: ["https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=400&auto=format&fit=crop"],
        reference: ["เอกสารสวนพฤกษศาสตร์โรงเรียน"],
        viewCount: 0
      });
    }
    setHerbModalOpen(true);
  };

  const handleSaveHerb = () => {
    if (!editingHerb || !editingHerb.thaiName) {
      showToast("กรุณากรอกชื่อสมุนไพรอย่างน้อย", "warning");
      return;
    }

    const imagesArr = typeof editingHerb.images === "string"
      ? (editingHerb.images as string).split("\n").map(s => s.trim()).filter(Boolean)
      : (Array.isArray(editingHerb.images) ? editingHerb.images.filter(Boolean) : []);

    const referenceArr = typeof editingHerb.reference === "string"
      ? (editingHerb.reference as string).split(",").map(r => r.trim()).filter(Boolean)
      : (Array.isArray(editingHerb.reference) ? editingHerb.reference.filter(Boolean) : []);

    const finalHerb = {
      ...editingHerb,
      images: imagesArr.length > 0 ? imagesArr : ["https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=400&auto=format&fit=crop"],
      properties: typeof editingHerb.properties === "string"
        ? (editingHerb.properties as string).split(",").map(p => p.trim()).filter(Boolean)
        : editingHerb.properties || [],
      reference: referenceArr
    } as Herb;

    saveHerb(finalHerb);
    setLocalHerbs(getHerbs(currentGarden.gardenId));
    setHerbModalOpen(false);
    setEditingHerb(null);
    showToast(`บันทึกข้อมูล "${finalHerb.thaiName}" เรียบร้อยแล้ว`, "success");
  };

  const handleDeleteHerb = (id: string, name?: string) => {
    const targetHerb = localHerbs.find(h => h.herbId === id);
    const title = name || targetHerb?.thaiName || "สมุนไพรนี้";
    setDeleteConfirmItem({ type: "herb", id, title });
  };

  const handleConfirmExecuteDelete = () => {
    if (!deleteConfirmItem) return;
    if (deleteConfirmItem.type === "herb") {
      deleteHerb(deleteConfirmItem.id, currentGarden.gardenId);
      setLocalHerbs(getHerbs(currentGarden.gardenId));
      showToast(`ลบสมุนไพร "${deleteConfirmItem.title}" สำเร็จ`, "success");
    } else if (deleteConfirmItem.type === "quiz") {
      deleteQuiz(deleteConfirmItem.id);
      setLocalQuizzes(getQuizzes(currentGarden.gardenId));
      showToast("ลบโจทย์เรียบร้อยแล้ว", "success");
    }
    setDeleteConfirmItem(null);
  };

  // --- 3. QUIZ FORM ACTIONS ---
  const handleOpenQuizModal = (quiz?: Quiz) => {
    if (quiz) {
      setEditingQuiz({ ...quiz });
    } else {
      setEditingQuiz({
        quizId: "QUIZ_" + Math.random().toString(36).substring(2, 9),
        gardenId: currentGarden.gardenId,
        herbId: localHerbs[0]?.herbId || "",
        question: "",
        answerScheme: "",
        score: 10
      });
    }
    setQuizModalOpen(true);
  };

  const handleSaveQuiz = () => {
    if (!editingQuiz || !editingQuiz.question || !editingQuiz.answerScheme) {
      showToast("กรุณากรอกข้อมูลโจทย์และแนวคำตอบเฉลยให้ครบถ้วน", "warning");
      return;
    }
    const finalQuiz = {
      ...editingQuiz,
      score: 10
    } as Quiz;
    saveQuiz(finalQuiz);
    setLocalQuizzes(getQuizzes(currentGarden.gardenId));
    setQuizModalOpen(false);
    setEditingQuiz(null);
    showToast("บันทึกข้อมูลโจทย์และแนวเฉลยสำเร็จ", "success");
  };

  const handleDeleteQuiz = (id: string, questionText?: string) => {
    const q = localQuizzes.find(item => item.quizId === id);
    const title = questionText || q?.question || "โจทย์ข้อสอบนี้";
    setDeleteConfirmItem({ type: "quiz", id, title });
  };

  // --- 4. CSV IMPORT & JSON BACKUP ---
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split("\n");
        const parsed: any[] = [];
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          const cleanCells = cells.map(cell => cell.replace(/^"|"$/g, "").trim());

          if (cleanCells[0]) {
            parsed.push({
              thaiName: cleanCells[0] || "",
              scientificName: cleanCells[1] || "",
              family: cleanCells[2] || "",
              category: cleanCells[3] || "general",
              description: cleanCells[4] || "",
              properties: cleanCells[5] ? cleanCells[5].split(";").map(p => p.trim()).filter(Boolean) : [],
              usage: cleanCells[6] || "",
              precautions: cleanCells[7] || "",
              location: cleanCells[8] || "",
              images: [cleanCells[9] || "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=400&auto=format&fit=crop"]
            });
          }
        }

        setCsvPreviewList(parsed);
        showToast(`วิเคราะห์ไฟล์ CSV สำเร็จ: ค้นพบพืชสมุนไพร ${parsed.length} รายการในไฟล์`, "info");
      } catch (err) {
        showToast("รูปแบบไฟล์ CSV ไม่ถูกต้องตามหัวข้อคอลัมน์มาตรฐาน", "error");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const executeBulkCSVImport = () => {
    if (csvPreviewList.length === 0) return;
    
    csvPreviewList.forEach((parsedHerb) => {
      const draftHerb: Herb = {
        herbId: "HERB_" + Math.random().toString(36).substring(2, 9),
        gardenId: currentGarden.gardenId,
        thaiName: parsedHerb.thaiName,
        localName: parsedHerb.thaiName,
        scientificName: parsedHerb.scientificName,
        family: parsedHerb.family,
        category: parsedHerb.category,
        description: parsedHerb.description,
        properties: parsedHerb.properties,
        usage: parsedHerb.usage,
        precautions: parsedHerb.precautions,
        location: parsedHerb.location,
        locationMap: "",
        qrCode: "",
        images: parsedHerb.images,
        reference: ["นำเข้าจากไฟล์ CSV"],
        relatedHerbs: [],
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveHerb(draftHerb);
    });

    setLocalHerbs(getHerbs(currentGarden.gardenId));
    setCsvPreviewList([]);
    if (csvInputRef.current) csvInputRef.current.value = "";
    showToast("นำเข้าข้อมูลสมุนไพรแบบกลุ่มเสร็จสมบูรณ์รวดเร็ว!", "success");
  };

  const handleJSONExport = () => {
    const dataObj = {
      garden: currentGarden,
      herbs: getHerbs(currentGarden.gardenId),
      quizzes: getQuizzes(currentGarden.gardenId),
      backupDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `garden_backup_${currentGarden.gardenId}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("ส่งออกข้อมูลสำรองไฟล์ระบบเสร็จสมบูรณ์!", "success");
  };

  // --- 5. AI ANALYTICS ENGINE (GEMINI) ---
  const handleRunAIAnalysis = async () => {
    setIsAnalyzing(true);
    showToast("ระบบกำลังส่งสัญญาณวิเคราะห์ข้อมูลพฤกษเวชไปยังขุมพลัง Gemini AI...", "info");
    try {
      const scoresList = getUsers().map((u) => u.totalScore);

      const res = await fetch("/api/gemini/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gardenName: currentGarden.name,
          herbsList: localHerbs,
          quizzesCount: localQuizzes.length,
          chatLogsCount: aiChatCount,
          usersCount: getUsers().length,
          scoresList: scoresList
        })
      });

      if (!res.ok) throw new Error("Server analytics pipeline error");
      const data = await res.json();
      setAnalyticsReport(data);
      localStorage.setItem("herbal_platform_ai_analysis_report", JSON.stringify(data));
      showToast("ประมวลผลรายงานระบบอัจฉริยะเสร็จสิ้น!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("เกิดความล้มเหลวในการเชื่อมต่อปัญญาประดิษฐ์วิเคราะห์สถิติ", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- 6. AI KNOWLEDGE BUILDER ACTION ---
  const handleRunAIBuilder = async () => {
    if (!aiBuilderText.trim()) {
      showToast("กรุณากรอกข้อมูลหรือคำอธิบายดิบเพื่อเริ่มใช้งานระบบเรียนรู้", "warning");
      return;
    }

    setBuilderLoading(true);
    setBuilderStep("กำลังส่งข้อมูลดิบให้หมอแผนไทยปัญญาประดิษฐ์...");
    
    const steps = [
      "กำลังวิเคราะห์ลักษณะโครงสร้างทางพฤกษศาสตร์ของพืช...",
      "กำลังจำแนกตระกูล วงศ์พืช และชื่อวิทยาศาสตร์ทางการแพทย์...",
      "กำลังสกัดสรรพคุณเด่น ฤทธิ์ทางยา และข้อควรระวังสำคัญ...",
      "กำลังสร้างแบบวัดระดับความรู้ท้ายบทเรียนอัจฉริยะ (Quizzes) 3 หัวข้อ..."
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        setBuilderStep(steps[currentStepIdx]);
        currentStepIdx++;
      }
    }, 1800);

    try {
      const res = await fetch("/api/gemini/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiBuilderText })
      });

      clearInterval(interval);
      if (!res.ok) throw new Error("Failed to compile herb data");

      const parsedResult = await res.json();
      setBuilderDraft(parsedResult);
      showToast("วิเคราะห์โครงสร้างและคำถามเสร็จสมบูรณ์! กรุณาตรวจความถูกต้องก่อนบันทึก", "success");
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการประมวลผล AI Builder", "error");
    } finally {
      setBuilderLoading(false);
      setBuilderStep("");
    }
  };

  const saveBuilderDraftToDB = () => {
    if (!builderDraft) return;

    const herbId = "HERB_" + Math.random().toString(36).substring(2, 9);
    const newHerb: Herb = {
      ...builderDraft.herb,
      herbId,
      gardenId: currentGarden.gardenId,
      localName: builderDraft.herb.thaiName || "",
      locationMap: "",
      qrCode: "",
      reference: ["วิเคราะห์โครงสร้างโดย Gemini AI Builder"],
      relatedHerbs: [],
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Herb;

    // Save Herb
    saveHerb(newHerb);

    // Save 3 Quizzes
    builderDraft.quizzes.forEach((q) => {
      const newQuiz: Quiz = {
        quizId: "QUIZ_" + Math.random().toString(36).substring(2, 9),
        gardenId: currentGarden.gardenId,
        herbId,
        question: q.question,
        answer: q.answerScheme,
        score: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any; // Cast answerScheme as answer appropriately
      saveQuiz(newQuiz);
    });

    // Reset Builder
    setBuilderDraft(null);
    setAiBuilderText("");
    setLocalHerbs(getHerbs(currentGarden.gardenId));
    setLocalQuizzes(getQuizzes(currentGarden.gardenId));
    setActiveTab("herbs");
    showToast(`นำเข้าและสถาปนาสมุนไพร "${newHerb.thaiName}" พร้อมข้อสอบ 3 ข้อเรียบร้อย!`, "success");
  };

  const sidebarTabs = [
    { id: "dashboard", label: "แผงสถิติ & AI Analytics", icon: BarChart },
    { id: "garden", label: "จัดการข้อมูลทั่วไปของสวน", icon: Landmark },
    { id: "settings", label: "ตั้งค่าเปิด-ปิด & ธีมระบบ", icon: Settings },
    { id: "herbs", label: "จัดการฐานพืชสมุนไพร", icon: Leaf },
    { id: "quizzes", label: "จัดการคลังข้อสอบ", icon: HelpCircle },
    { id: "ai_builder", label: "ตัวสกัดฐานข้อมูล AI (builder)", icon: Sparkles },
    { id: "import_export", label: "นำเข้า/ส่งออกพืชรวม", icon: Upload },
    { id: "certificates", label: "สถิติผู้เรียน & เกียรติบัตร", icon: Award }
  ] as const;

  // Sorted list of popular herbs
  const popularHerbs = [...localHerbs]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12">
      
      {/* Admin Title Banner */}
      <div className="bg-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 text-left">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-widest flex items-center gap-1 w-max">
            <Shield className="w-3 h-3" />
            <span>สิทธิ์ผู้ดูแลระบบหลัก (Garden Administrator)</span>
          </span>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight font-sans">
            ระบบบริหารจัดการสวนพฤกษเวช
          </h1>
          <p className="text-xs text-slate-200">
            ระบบจัดทำและบำรุงข้อมูลสวนสมุนไพร โครงการ "1 อปท. 1 สวนสมุนไพร" ประจำจุดบริการ {currentGarden.name}
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>ไปหน้าหลักของประชาชน</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar Menu */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Workspace Workspace panels */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[520px]">
          
          {/* ==============================================
              A. DASHBOARD TAB VIEW
             ============================================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 text-left">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">แผงวัดผลสัมฤทธิ์ของสวนและผู้เรียน (Real Analytics Dashboard)</h2>
                    <p className="text-xs text-slate-400">
                      {!dateRangeFilter.startDate && !dateRangeFilter.endDate
                        ? dateRange.rangeText
                        : `สถิติตามช่วงเวลา ${dateRangeFilter.startDate ? formatThaiDate(dateRangeFilter.startDate) : "เริ่มต้น"} ถึง ${dateRangeFilter.endDate ? formatThaiDate(dateRangeFilter.endDate) : "ปัจจุบัน"}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <DateRangeSelector value={dateRangeFilter} onChange={setDateRangeFilter} />
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="ล้างสถิติเริ่มต้นใหม่เป็น 0 หลังติดตั้งระบบเรียบร้อย"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างสถิติเริ่มต้นใหม่ (หลังติดตั้ง)</span>
                    </button>

                    <button
                      onClick={handleRunAIAnalysis}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>{isAnalyzing ? "กำลังประมวลผล..." : "รัน AI สรุปรายงานระบบ"}</span>
                    </button>
                  </div>
                </div>

                {/* Enhanced Dashboard Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "สมุนไพรทั้งหมด", value: `${localHerbs.length} ชนิด`, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/20" },
                    { label: "แบบประเมินข้อสอบ", value: `${localQuizzes.length} ข้อ`, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20" },
                    { label: "ผู้เรียนทั้งหมด", value: `${getUsers().length} คน`, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20" },
                    { label: "เกียรติบัตรที่ออก", value: `${getUsers().filter(u => u.totalScore >= 10).length} ใบ`, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl text-center border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/40">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">{stat.label}</span>
                      <span className={`text-xl sm:text-2xl font-black ${stat.color.split(" ")[0]}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Real Telemetry Activity Metrics calculated dynamically from logs */}
                <div className="bg-slate-50 dark:bg-slate-950/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                      สถิติกิจกรรมจริงตามช่วงเวลาที่เลือก (Real System Activity Logs):
                    </span>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold">
                      {dateRangeFilter.preset === "all" ? "สะสมตลอดกาล" : "กรองตามช่วงวันที่"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 shadow-sm">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">ยอดผู้เข้าเยี่ยมชม (Visit Logs):</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">
                          {visitorCount.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">ครั้ง</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 shadow-sm">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">การสแกนภาพพืช AI (Scan Logs):</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 font-mono">
                          {scanCount.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">ครั้ง</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 shadow-sm">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">การสนทนาแชท AI (Chat Logs):</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 font-mono">
                          {aiChatCount.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">ครั้ง</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Popular Herbs and AI report */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Popular Herbs & Quizzes Statistics */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b pb-2">
                      <Leaf className="w-4.5 h-4.5 text-teal-600" />
                      <span>อันดับสมุนไพรยอดนิยม (ตามยอดเข้าชม)</span>
                    </h3>

                    {popularHerbs.length === 0 ? (
                      <p className="text-xs text-slate-400">ยังไม่มีประวัติการเข้าชมสมุนไพรในสวน</p>
                    ) : (
                      <div className="space-y-2.5">
                        {popularHerbs.map((h, index) => (
                          <div key={h.herbId} className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-300">
                              {index + 1}. 🌿 {h.thaiName}
                            </span>
                            <span className="text-slate-400 font-mono">
                              👁️ {h.viewCount || 0} ครั้ง
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Popular Questions / Telemetry Info */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl space-y-4 text-left">
                    <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b pb-2">
                      <HelpCircle className="w-4.5 h-4.5 text-indigo-600" />
                      <span>คำถามยอดนิยม & ประเด็นหลักจากนักเรียน</span>
                    </h3>
                    {realQuestions.length === 0 ? (
                      <p className="text-xs text-slate-400">ยังไม่มีข้อมูลคำถามจากแบบทดสอบหรือการแชท</p>
                    ) : (
                      <div className="space-y-2.5 text-xs">
                        {realQuestions.map((item, index) => (
                          <div key={index} className="flex justify-between gap-4 font-semibold text-slate-600 dark:text-slate-300">
                            <span className="truncate">"{item.q}"</span>
                            <span className="font-mono text-slate-400 shrink-0">{item.count} ครั้ง</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              {/* Gemini Analytics Report Card */}
              {analyticsReport && (
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-slate-900 dark:to-slate-850 p-6 rounded-2xl border border-teal-500/15 text-left space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-600 dark:text-emerald-400 animate-pulse" />
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-850 dark:text-slate-100">
                      รายงานวิเคราะห์ระบบสวนพฤกษเวชอัจฉริยะ โดย Gemini AI
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <div className="space-y-1.5">
                      <span className="font-black text-teal-800 dark:text-teal-400 block border-b pb-1">📊 1. ภาพรวมการจัดการสวน:</span>
                      <p>{analyticsReport.summaryText}</p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-black text-teal-800 dark:text-teal-400 block border-b pb-1">🌿 2. ความต้องการและการเข้าถึงของชุมชน:</span>
                      <p>{analyticsReport.popularHerbsText}</p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-black text-teal-800 dark:text-teal-400 block border-b pb-1">⚠️ 3. วิเคราะห์ทักษะ/จุดที่ควรปรับปรุง:</span>
                      <p>{analyticsReport.difficultTopicsText}</p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-black text-teal-800 dark:text-teal-400 block border-b pb-1">💡 4. ข้อเสนอแนะเชิงลึกจาก AI:</span>
                      <p>{analyticsReport.aiRecommendationsText}</p>
                    </div>
                  </div>
                  
                  <span className="text-[10px] text-slate-400 block text-right pt-2 border-t border-slate-150 dark:border-slate-800">
                    * จัดทำสถิติอัตโนมัติด้วยโครงข่ายประสาทเทียมผ่าน Gemini API
                  </span>
                </div>
              )}

            </div>
          )}

          {/* ==============================================
              B. GARDEN FORM EDIT VIEW
             ============================================== */}
          {activeTab === "garden" && localGarden && (
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">ปรับปรุงข้อมูลอัตลักษณ์และข้อมูลทางกายภาพ</h2>
                  <p className="text-xs text-slate-400">กำหนดประวัติ แบนเนอร์ ข้อมูลการติดต่อ โซเชียลมีเดีย และลิงก์แผนที่กูเกิลแมป</p>
                </div>
                <button
                  onClick={handleSaveGarden}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูลสวน</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">ชื่อจุดบริการ / สวนพฤกษเวช:</label>
                  <input
                    type="text"
                    value={localGarden.name}
                    onChange={(e) => setLocalGarden({ ...localGarden, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 block">รูปภาพโลโก้สวน (Logo):</label>
                    <label className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>อัปโหลดจากเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGardenLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={localGarden.logo || ""}
                    onChange={(e) => setLocalGarden({ ...localGarden, logo: e.target.value })}
                    placeholder="https://... หรือปุ่มอัปโหลดขวาบน"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 block">รูปภาพหน้าปกสไลเดอร์ / แบนเนอร์ (Banner):</label>
                    <label className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>อัปโหลดจากเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGardenBannerFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={localGarden.banner}
                    onChange={(e) => setLocalGarden({ ...localGarden, banner: e.target.value })}
                    placeholder="https://... หรือปุ่มอัปโหลดขวาบน"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm font-mono"
                  />
                </div>

                {/* Previews */}
                <div className="sm:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block">พรีวิวโลโก้สวน (Logo):</span>
                    <div className="w-16 h-16 rounded-full bg-white border overflow-hidden flex items-center justify-center shadow-xs">
                      <img src={localGarden.logo || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpjm_Yo-6e2HgR7GsSNQiGL7q_Y4l-TasybXnDrNZJxw&s=10"} alt="Logo Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block">พรีวิวภาพปกสวน (Banner):</span>
                    <div className="h-16 w-full rounded-lg border bg-white overflow-hidden shadow-xs">
                      <img src={localGarden.banner} alt="Banner Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 block">คำแนะนำรายละเอียดและประวัติของสวนพฤกษเวช:</label>
                  <textarea
                    rows={4}
                    value={localGarden.description}
                    onChange={(e) => setLocalGarden({ ...localGarden, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">ที่อยู่พิกัดทางกายภาพ:</label>
                  <input
                    type="text"
                    value={localGarden.address}
                    onChange={(e) => setLocalGarden({ ...localGarden, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">เวลาเปิดทำการ (เช่น ทุกวัน 8:30 - 16:30):</label>
                  <input
                    type="text"
                    value={localGarden.openingHours}
                    onChange={(e) => setLocalGarden({ ...localGarden, openingHours: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">เบอร์โทรศัพท์ติดต่อ:</label>
                  <input
                    type="text"
                    value={localGarden.phone}
                    onChange={(e) => setLocalGarden({ ...localGarden, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">อีเมลติดต่อสวน:</label>
                  <input
                    type="text"
                    value={localGarden.email}
                    onChange={(e) => setLocalGarden({ ...localGarden, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">ลิงก์ติดต่อ Facebook (Facebook Page URL):</label>
                  <input
                    type="text"
                    value={localGarden.facebook || ""}
                    onChange={(e) => setLocalGarden({ ...localGarden, facebook: e.target.value })}
                    placeholder="https://facebook.com/your-garden"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">ลิงก์เว็บไซต์อย่างเป็นทางการ (Official Website):</label>
                  <input
                    type="text"
                    value={localGarden.website || ""}
                    onChange={(e) => setLocalGarden({ ...localGarden, website: e.target.value })}
                    placeholder="https://www.your-garden.go.th"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 block">ลิงก์ฝังแผนที่ Google Maps Embed (iframe src URL):</label>
                  <input
                    type="text"
                    value={localGarden.googleMap}
                    onChange={(e) => setLocalGarden({ ...localGarden, googleMap: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 rounded-lg text-xs sm:text-xs font-mono"
                  />
                </div>

                {/* Map Preview Block */}
                {localGarden.googleMap && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block">พรีวิวแผนที่โรงเรียน/สวนสมุนไพรแบบฝังโครงสร้าง (Live Iframe Map):</span>
                    <div className="w-full h-44 rounded-xl border overflow-hidden bg-slate-100">
                      <iframe
                        src={localGarden.googleMap}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==============================================
              C. SETTINGS & THEMING TAB VIEW
             ============================================== */}
          {activeTab === "settings" && localGarden && (
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">เปิด-ปิดระบบ & และปรับสีโครงสร้างธีม</h2>
                  <p className="text-xs text-slate-400">ควบคุมเปิดปิดการเรียนรู้ด้วย AI, การประเมินข้อสอบแบบวัดความรู้ และการขึ้นบอร์ดตารางคะแนน</p>
                </div>
                <button
                  onClick={handleSaveGarden}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกตั้งค่า</span>
                </button>
              </div>

              {/* Theme Selector */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide block">ธีมและสีหลักของแอปพลิเคชัน (Main Visual Theme Style):</label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { id: "teal", name: "เขียวพฤกษาพัทลุง", color: "bg-teal-600 border-teal-200" },
                    { id: "emerald", name: "เขียวมรกตชีวาสุข", color: "bg-emerald-500 border-emerald-200" },
                    { id: "indigo", name: "น้ำเงินครามแพทย์ทางเลือก", color: "bg-indigo-600 border-indigo-200" },
                    { id: "rose", name: "ชมพูสมุนไพรบานสะพรั่ง", color: "bg-rose-500 border-rose-200" }
                  ].map((theme) => {
                    const selected = localGarden.themeColor === theme.id || (!localGarden.themeColor && theme.id === "teal");
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setLocalGarden({ ...localGarden, themeColor: theme.id })}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-24 cursor-pointer transition-all ${
                          selected
                            ? "border-slate-850 dark:border-white ring-2 ring-slate-850 dark:ring-white bg-slate-50 dark:bg-slate-850"
                            : "border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${theme.color}`} />
                        <div>
                          <span className="text-xs font-bold block text-slate-900 dark:text-slate-100">{theme.name}</span>
                          <span className="text-[9px] text-slate-400 capitalize">{theme.id} Theme</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feature Toggle Switches */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide block">เปิด-ปิด โมดูลฟีเจอร์ฝั่งผู้เรียน (Citizen Interaction Controls):</label>

                <div className="space-y-3.5">
                  
                  {/* AI Support Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <div className="space-y-1 text-left max-w-[80%]">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">เปิดใช้งานโมดูล แชทอัจฉริยะ & สแกนภาพ AI ด้วย Gemini:</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        เปิดใช้งานปุ่มสแกนภาพ AI บนหน้าแรก และปุ่มแชทคุยความรู้กับแพทย์แผนไทย AI ในหน้าสมุนไพร เพื่อช่วยเหลือผู้ใช้ตอบคำถามเชิงลึก
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLocalGarden({ ...localGarden, enableAI: !localGarden.enableAI })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                        localGarden.enableAI ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all shadow-md ${
                        localGarden.enableAI ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Quiz Support Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <div className="space-y-1 text-left max-w-[80%]">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">เปิดใช้งานโมดูล แบบทดสอบประเมินชั่วโมงเรียนรู้ (Quizzes):</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        เปิดใช้งานแบบสอบถามควิซท้ายบทเรียน และสะสมชั่วโมงศึกษาเพื่อตรวจสอบเงื่อนไขการพิมพ์ออกใบรับเกียรติบัตรอิเล็กทรอนิกส์
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLocalGarden({ ...localGarden, enableQuiz: !localGarden.enableQuiz })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                        localGarden.enableQuiz ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all shadow-md ${
                        localGarden.enableQuiz ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Leaderboard Support Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <div className="space-y-1 text-left max-w-[80%]">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">เปิดใช้งานกระดานอันดับตารางคะแนนความรู้ (Leaderboard):</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        เปิดหน้าตารางโชว์รายชื่อผู้เรียนที่มีคะแนนทดสอบความรู้และกิจกรรมสะสมสูงสุด เพื่อกระตุ้นและส่งเสริมการมีส่วนร่วมในชุมชน
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLocalGarden({ ...localGarden, enableLeaderboard: !localGarden.enableLeaderboard })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                        localGarden.enableLeaderboard ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all shadow-md ${
                        localGarden.enableLeaderboard ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ==============================================
              D. HERBS CRUD LIST VIEW
             ============================================== */}
          {activeTab === "herbs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">ทะเบียนพรรณไม้และยาสมุนไพร</h2>
                  <p className="text-xs text-slate-400">เพิ่ม ลบ หรือแก้ไขข้อมูลส่วนประกอบ ตำแหน่ง และภาพถ่ายพฤกษศาสตร์ในพื้นที่</p>
                </div>
                <button
                  onClick={() => handleOpenHerbModal()}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มสมุนไพรตัวใหม่</span>
                </button>
              </div>

              {/* Herbs List Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[10px] font-bold uppercase border-b border-slate-150 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">ภาพพืช</th>
                      <th className="px-4 py-3 text-left">ชื่อพืชหลัก / ท้องถิ่น</th>
                      <th className="px-4 py-3 text-left">ตระกูลพืชพรรณ</th>
                      <th className="px-4 py-3 text-center">เข้าดู</th>
                      <th className="px-4 py-3 text-right">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 font-medium">
                    {localHerbs.map((h) => (
                      <tr key={h.herbId} className="hover:bg-slate-50/50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300">
                        <td className="px-4 py-3 text-left w-14 shrink-0">
                          <img src={h.images?.[0]} alt={h.thaiName} className="w-10 h-10 object-cover rounded-lg bg-slate-100" />
                        </td>
                        <td className="px-4 py-3 text-left">
                          <span className="font-extrabold block text-slate-900 dark:text-slate-100">🌿 {h.thaiName}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">หรือ: {h.localName || "ไม่มีชื่อเรียกอื่น"}</span>
                        </td>
                        <td className="px-4 py-3 text-left font-mono">
                          <span className="italic block text-slate-850 dark:text-slate-300 text-[11px] truncate max-w-[200px]">{h.scientificName}</span>
                          <span className="text-[10px] text-slate-400 block">วงศ์: {h.family}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          👁️ {h.viewCount || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Link
                              to={`/herbs/${h.herbId}`}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="เปิดหน้าพืชและดาวน์โหลด/พิมพ์ QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleOpenHerbModal(h)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="แก้ไขพืช"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteHerb(h.herbId)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="ลบพืช"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==============================================
              E. QUIZZES CRUD LIST VIEW
             ============================================== */}
          {activeTab === "quizzes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">ข้อสอบเพื่อประเมินความรู้</h2>
                  <p className="text-xs text-slate-400">ควบคุมโจทย์อัตนัย คำถามเชิงประยุกต์ และคำใบ้เฉลยวิชาการเพื่อให้ AI ตรวจสอบ</p>
                </div>
                <button
                  onClick={() => handleOpenQuizModal()}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มข้อสอบใหม่</span>
                </button>
              </div>

              {/* Quizzes table */}
              <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[10px] font-bold uppercase border-b border-slate-150 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">สมุนไพรอ้างอิง</th>
                      <th className="px-4 py-3 text-left">โจทย์คำถามทดสอบ</th>
                      <th className="px-4 py-3 text-left">แนวทางคีย์เวิร์ดตรวจเฉลย</th>
                      <th className="px-4 py-3 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 font-medium">
                    {localQuizzes.map((q) => {
                      const hb = localHerbs.find((h) => h.herbId === q.herbId);
                      return (
                        <tr key={q.quizId} className="hover:bg-slate-50/50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300">
                          <td className="px-4 py-3 text-left font-extrabold text-teal-600 dark:text-teal-400 w-36">
                            🌿 {hb?.thaiName || "ไม่พบสมุนไพร"}
                          </td>
                          <td className="px-4 py-3 text-left text-slate-850 dark:text-slate-150 font-semibold max-w-xs truncate">
                            {q.question}
                          </td>
                          <td className="px-4 py-3 text-left text-slate-400 max-w-xs truncate">
                            {q.answer || (q as any).answerScheme}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleOpenQuizModal(q)}
                                className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                title="แก้ไขข้อสอบ"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(q.quizId)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                title="ลบข้อสอบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==============================================
              F. AI KNOWLEDGE BUILDER TAB VIEW
             ============================================== */}
          {activeTab === "ai_builder" && (
            <div className="space-y-6 text-left">
              <div className="border-b pb-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">AI Knowledge Builder & Quiz Generator</h2>
                <p className="text-xs text-slate-400">พิมพ์หรือคัดลอกเอกสารดิบ / ประวัติสมุนไพรมาวาง แล้วระบบจะแยกหัวข้อพร้อมสร้างข้อสอบ 3 ข้อให้อัตโนมัติ</p>
              </div>

              {!builderDraft ? (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-2.5">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong>วิธีใช้:</strong> คัดลอกข้อมูลทางเภสัชศาสตร์หรือลักษณะลำต้นใบ ของสมุนไพรพัชญเวชโบราณ แล้วส่งให้หมอไทย AI สกัดโครงสร้างวิจัย สรรพคุณ วิธีใช้ ข้อระวัง พิกัดแปลง และชุดทดสอบเก็บคะแนน เพื่อความไวในการนำเข้าระดับสูง
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">ข้อมูลคำอธิบายดิบของสมุนไพรที่ต้องการสกัด:</label>
                    <textarea
                      rows={6}
                      value={aiBuilderText}
                      onChange={(e) => setAiBuilderText(e.target.value)}
                      placeholder="ตัวอย่างการกรอกข้อมูลดิบ: 'ไพล (ชื่อวิทยาศาสตร์ Zingiber montanum) เป็นพืชตระกูลขิง ดอกสีนวล มีเหง้าใต้ดิน รสยาฝาดขื่นร้อน สรรพคุณโดดเด่นขับลม แก้ปวดเมื่อยกล้ามเนื้อ ต้านการอักเสบ ใช้ทาถูนวดภายนอก ข้อควรระวังระวังการใช้นานเกินไปเพราะอาจทำให้เนื้อเยื่อระคายเคือง'"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-sans"
                    />
                  </div>

                  <button
                    onClick={handleRunAIBuilder}
                    disabled={builderLoading || !aiBuilderText.trim()}
                    className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>{builderLoading ? "ปัญญาประดิษฐ์กำลังประมวลผลสกัดข้อมูล..." : "สกัดข้อมูลสมุนไพรและข้อสอบด้วย Gemini AI"}</span>
                  </button>

                  {builderLoading && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border rounded-xl flex items-center gap-3 animate-pulse">
                      <RefreshCw className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-spin" />
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-sans">{builderStep}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs sm:text-sm font-bold text-slate-850 dark:text-slate-100">ตรวจสอบและแก้ไขร่างข้อมูลที่สกัดจาก AI (AI Generated Draft)</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setBuilderDraft(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        ละทิ้งร่าง
                      </button>
                      <button
                        onClick={saveBuilderDraftToDB}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
                      >
                        อนุมัติและเผยแพร่สวนพืช
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    
                    {/* Herb Draft Details Form */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b pb-2 flex items-center gap-1.5">
                        <Leaf className="w-4 h-4 text-teal-600" />
                        <span>1. ข้อมูลสายพันธุ์สมุนไพร</span>
                      </h3>

                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">ชื่อทางการแพทย์แผนไทย:</label>
                            <input
                              type="text"
                              value={builderDraft.herb.thaiName || ""}
                              onChange={(e) => setBuilderDraft({
                                ...builderDraft,
                                herb: { ...builderDraft.herb, thaiName: e.target.value }
                              })}
                              className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">ชื่อวิทยาศาสตร์:</label>
                            <input
                              type="text"
                              value={builderDraft.herb.scientificName || ""}
                              onChange={(e) => setBuilderDraft({
                                ...builderDraft,
                                herb: { ...builderDraft.herb, scientificName: e.target.value }
                              })}
                              className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1 italic"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">ตระกูลวงศ์พืช (Family):</label>
                            <input
                              type="text"
                              value={builderDraft.herb.family || ""}
                              onChange={(e) => setBuilderDraft({
                                ...builderDraft,
                                herb: { ...builderDraft.herb, family: e.target.value }
                              })}
                              className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">รหัสจัดกลุ่มหมวดหมู่:</label>
                            <select
                              value={builderDraft.herb.category || "general"}
                              onChange={(e) => setBuilderDraft({
                                ...builderDraft,
                                herb: { ...builderDraft.herb, category: e.target.value }
                              })}
                              className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1 font-bold text-slate-700 dark:text-slate-300"
                            >
                              <option value="fever">แก้ไข้หวัด / ปอด</option>
                              <option value="digestive">ท้องอืด / กระเพาะ</option>
                              <option value="skin">ผิวหนัง / แผลติดเชื้อ</option>
                              <option value="tonic">บำรุงร่างกาย</option>
                              <option value="food">อาหาร / เครื่องเทศ</option>
                              <option value="flower">ไม้ดอกไม้ประดับ</option>
                              <option value="rare">พืชพรรณพัทลุง/อนุรักษ์</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block">ลักษณะทางพฤกษศาสตร์:</label>
                          <textarea
                            rows={3}
                            value={builderDraft.herb.description || ""}
                            onChange={(e) => setBuilderDraft({
                              ...builderDraft,
                              herb: { ...builderDraft.herb, description: e.target.value }
                            })}
                            className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1 font-sans"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block">สรรพคุณหลัก (คั่นด้วยเครื่องหมายจุลภาค):</label>
                          <input
                            type="text"
                            value={Array.isArray(builderDraft.herb.properties) ? builderDraft.herb.properties.join(", ") : ""}
                            onChange={(e) => setBuilderDraft({
                              ...builderDraft,
                              herb: { ...builderDraft.herb, properties: e.target.value.split(",").map(p => p.trim()) }
                            })}
                            className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block">วิธีใช้ปรุงยาทางอายุรเวช:</label>
                          <textarea
                            rows={2}
                            value={builderDraft.herb.usage || ""}
                            onChange={(e) => setBuilderDraft({
                              ...builderDraft,
                              herb: { ...builderDraft.herb, usage: e.target.value }
                            })}
                            className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1 font-sans"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block">ข้อพึงระวังสำคัญ:</label>
                          <input
                            type="text"
                            value={builderDraft.herb.precautions || ""}
                            onChange={(e) => setBuilderDraft({
                              ...builderDraft,
                              herb: { ...builderDraft.herb, precautions: e.target.value }
                            })}
                            className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block">พิกัดทางกายภาพที่ปลูก:</label>
                          <input
                            type="text"
                            value={builderDraft.herb.location || ""}
                            onChange={(e) => setBuilderDraft({
                              ...builderDraft,
                              herb: { ...builderDraft.herb, location: e.target.value }
                            })}
                            className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block">ลิงก์ภาพพืชจาก Unsplash ที่ตรวจเจอ:</label>
                          <input
                            type="text"
                            value={builderDraft.herb.images?.[0] || ""}
                            onChange={(e) => setBuilderDraft({
                              ...builderDraft,
                              herb: { ...builderDraft.herb, images: [e.target.value] }
                            })}
                            className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1 mt-1 font-mono text-[10px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quizzes Draft Details Form */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b pb-2 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-indigo-600" />
                        <span>2. ข้อสอบประเมินที่ AI ผลิตขึ้น (3 ข้อ)</span>
                      </h3>

                      <div className="space-y-4 text-xs">
                        {builderDraft.quizzes.map((q, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border space-y-2 text-left">
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block">โจทย์คำถามวิชาการข้อที่ {idx + 1}:</span>
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => {
                                const newQuizzes = [...builderDraft.quizzes];
                                newQuizzes[idx].question = e.target.value;
                                setBuilderDraft({ ...builderDraft, quizzes: newQuizzes });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-850 border rounded px-2.5 py-1.5 font-sans"
                            />

                            <span className="font-bold text-slate-400 block mt-1">คีย์เวิร์ดเฉลยอ้างอิง:</span>
                            <input
                              type="text"
                              value={q.answerScheme}
                              onChange={(e) => {
                                const newQuizzes = [...builderDraft.quizzes];
                                newQuizzes[idx].answerScheme = e.target.value;
                                setBuilderDraft({ ...builderDraft, quizzes: newQuizzes });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-850 border rounded px-2 py-1 font-semibold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==============================================
              G. IMPORT / EXPORT BULK TAB VIEW
             ============================================== */}
          {activeTab === "import_export" && (
            <div className="space-y-6 text-left">
              <div className="border-b pb-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">นำเข้าพืชรวม & แบ็คอัปข้อมูล</h2>
                <p className="text-xs text-slate-400">ควบคุมข้อมูลเชิงลึก บันทึกเก็บสำรองไฟล์ หรือนำเข้ารายชื่อกลุ่มพืชพรรณพยาเวชโบราณแบบรวดเร็ว</p>
              </div>

              {/* Excel/CSV Block */}
              <div className="bg-slate-50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-teal-600" />
                  <span>1. นำเข้าพืชสมุนไพรแบบกลุ่มผ่านไฟล์ CSV</span>
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed">
                  นำเข้าไฟล์ Comma-Separated Values (.csv) โดยประกอบด้วยข้อมูล 10 คอลัมน์ลำดับดังนี้: <br />
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">
                    thaiName, scientificName, family, category, description, properties(แยกด้วยเครื่องหมาย ;), usage, precautions, location, imageURL
                  </span>
                </p>

                <div className="flex flex-wrap gap-3">
                  <input
                    type="file"
                    ref={csvInputRef}
                    onChange={handleCSVImport}
                    accept=".csv"
                    className="hidden"
                  />
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-200 border border-slate-250 dark:border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer hover:bg-slate-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>เลือกไฟล์ CSV เพื่อเตรียมนำเข้า</span>
                  </button>

                  <button
                    onClick={handleJSONExport}
                    className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-200 border border-slate-250 dark:border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>ส่งออก JSON Backup ทั้งหมด</span>
                  </button>
                </div>

                {/* CSV Preview Block */}
                {csvPreviewList.length > 0 && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        <span>ตรวจพบข้อมูลพืช {csvPreviewList.length} ต้นพร้อมโอนถ่าย</span>
                      </span>
                      <button
                        onClick={executeBulkCSVImport}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
                      >
                        นำเข้าสมุนไพรลงฐานข้อมูลสวนเดี๋ยวนี้
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 text-[11px]">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-950 font-bold sticky top-0 border-b">
                          <tr>
                            <th className="p-2 text-left">ชื่อพืช</th>
                            <th className="p-2 text-left">ชื่อวิทยาศาสตร์</th>
                            <th className="p-2 text-left">ตระกูลวงศ์</th>
                            <th className="p-2 text-left">หมวดหมู่</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {csvPreviewList.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-100/50 dark:hover:bg-slate-850">
                              <td className="p-2 font-bold">🌿 {item.thaiName}</td>
                              <td className="p-2 italic">{item.scientificName}</td>
                              <td className="p-2">{item.family}</td>
                              <td className="p-2">{item.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* JSON Template */}
              <div className="bg-slate-50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2 text-xs">
                <span className="font-extrabold text-slate-500 uppercase tracking-wide block">ตัวอย่างโครงสร้างไฟล์ CSV ต้นแบบสำหรับพาสเวย์นำเข้า:</span>
                <pre className="p-3 bg-white dark:bg-slate-900 border rounded-lg font-mono text-[10px] overflow-x-auto text-slate-600 dark:text-slate-300">
                  {"thaiName,scientificName,family,category,description,properties,usage,precautions,location,imageURL\n"}
                  {"ขิง,Zingiber officinale Roscoe,Zingiberaceae,food,พืชล้มลุกมีเหง้าใต้ดิน,แก้ท้องอืด;ขับลม,นำเหง้าสดต้มน้ำดื่ม,ระวังในผู้ป่วยโรคนิ่วในถุงน้ำดี,แปลงสวนผัก 4,https://unsplash.com/...\n"}
                  {"ไพล,Zingiber montanum,Zingiberaceae,body,พืชล้มลุกมีเหง้าใต้ดิน,แก้ปวดเมื่อย;ต้านการอักเสบ,นำเหง้าคั้นน้ำมันทาถู,ระวังระคายเคืองผิว,แปลงสมุนไพรมีเหง้า B3,https://unsplash.com/..."}
                </pre>
              </div>
            </div>
          )}

          {/* ==============================================
              H. CERTIFICATES & USER LIST VIEW
             ============================================== */}
          {activeTab === "certificates" && (
            <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>📅 {dateRange.rangeText}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    บันทึกสถิติผลการเรียนสะสม ณ เวลาปัจจุบัน
                  </span>
                </div>

                <div className="border-b pb-3 text-left">
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">สถิติผู้เรียน & เกียรติบัตรอิเล็กทรอนิกส์</h2>
                  <p className="text-xs text-slate-400">ประมวลรายชื่อประชาชนและคะแนนประเมินทางวิชาการสะสมที่มีสิทธิ์อนุมัติเกียรติบัตร</p>
                </div>

              {/* Users issued list */}
              <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[10px] font-bold uppercase border-b border-slate-150 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">สมาชิกผู้เรียน</th>
                      <th className="px-4 py-3 text-left">อีเมลติดต่อ</th>
                      <th className="px-4 py-3 text-center">พืชที่เรียนผ่าน</th>
                      <th className="px-4 py-3 text-center">คะแนนรวม</th>
                      <th className="px-4 py-3 text-right">สิทธิ์พิมพ์เกียรติบัตร</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 font-medium">
                    {getUsers().map((u) => {
                      const passes = u.totalScore >= 10;
                      return (
                        <tr key={u.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300">
                          <td className="px-4 py-3 text-left flex items-center gap-2">
                            <img src={u.photoURL} alt={u.displayName} className="w-7 h-7 rounded-full bg-slate-100 border" />
                            <span className="font-extrabold text-slate-900 dark:text-slate-100">{u.displayName}</span>
                          </td>
                          <td className="px-4 py-3 text-left text-slate-400 font-mono">
                            {u.email}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            🌿 {u.completedHerbs?.length || 0} ชนิด
                          </td>
                          <td className="px-4 py-3 text-center text-teal-600 dark:text-teal-400 font-black">
                            ⭐ {u.totalScore} คะแนน
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${
                              passes
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            }`}>
                              {passes ? "🏆 ผ่านเกณฑ์และพิมพ์แล้ว" : "❌ คะแนนไม่ถึงเกณฑ์"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ==========================================================
          MODAL 1: HERB EDITOR FORM MODAL
          ========================================================== */}
      {herbModalOpen && editingHerb && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-left space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {editingHerb.thaiName ? "📝 แก้ไขสมุนไพรในแปลง" : "🌿 เพิ่มสมุนไพรเข้าแปลงปลูกใหม่"}
              </h3>
              <button
                onClick={() => setHerbModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ชื่อทางการแพทย์แผนไทย (ชื่อหลัก):</label>
                <input
                  type="text"
                  required
                  value={editingHerb.thaiName || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, thaiName: e.target.value })}
                  placeholder="เช่น ขิง"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ชื่อท้องถิ่น / ชื่ออื่นๆ:</label>
                <input
                  type="text"
                  value={editingHerb.localName || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, localName: e.target.value })}
                  placeholder="เช่น น้ำลายพญานาค, ฟ้าสาง"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ชื่อวิทยาศาสตร์ (Scientific Name):</label>
                <input
                  type="text"
                  value={editingHerb.scientificName || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, scientificName: e.target.value })}
                  placeholder="เช่น Andrographis paniculata"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm italic"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ชื่อวงศ์พรรณพืช (Family):</label>
                <input
                  type="text"
                  value={editingHerb.family || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, family: e.target.value })}
                  placeholder="เช่น ACANTHACEAE"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm font-sans"
                />
              </div>

              <div className="space-y-2 sm:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>รูปภาพสมุนไพร (Herb Image)</span>
                  </label>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                    * อัปโหลดไฟล์จากเครื่อง รูปไม่หายเมื่อเว็บต้นทางเปลี่ยน
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* File Upload Button */}
                  <label className="w-full sm:w-auto px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>อัปโหลดรูปจากเครื่อง</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHerbImageFileUpload}
                      className="hidden"
                    />
                  </label>

                  <span className="text-xs text-slate-400 font-medium shrink-0">หรือใส่ URL:</span>

                  <input
                    type="text"
                    value={editingHerb.images?.[0] || ""}
                    onChange={(e) => setEditingHerb({ ...editingHerb, images: [e.target.value] })}
                    placeholder="https://... หรืออัปโหลดไฟล์ด้านซ้าย"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>

                {/* Image Preview */}
                {editingHerb.images?.[0] && (
                  <div className="mt-2 flex items-center gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 overflow-hidden shrink-0 shadow-xs">
                      <img
                        src={editingHerb.images[0]}
                        alt="Herb Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=400&auto=format&fit=crop";
                        }}
                      />
                    </div>
                    <div className="text-left space-y-0.5 text-xs text-slate-500 dark:text-slate-400 overflow-hidden">
                      <span className="font-bold block text-slate-700 dark:text-slate-200">ตัวอย่างแสดงผลรูปภาพ</span>
                      <p className="truncate text-[11px] font-mono text-slate-400">
                        {editingHerb.images[0].startsWith("data:image") ? "รูปภาพอัปโหลดบันทึกในเครื่อง (Base64)" : editingHerb.images[0]}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500">ลักษณะทางพฤกษศาสตร์โดยละเอียด:</label>
                <textarea
                  rows={3}
                  value={editingHerb.description || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, description: e.target.value })}
                  placeholder="เขียนพฤกษศาสตร์ เช่น เป็นไม้ล้มลุก ลำต้นสี่เหลี่ยม..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm font-sans"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500">สรรพคุณทางยาเด่น (คั่นด้วยเครื่องหมายจุลภาค ,):</label>
                <input
                  type="text"
                  value={Array.isArray(editingHerb.properties) ? editingHerb.properties.join(", ") : ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, properties: e.target.value })}
                  placeholder="เช่น แก้ไข้, บรรเทาเจ็บคอ, แก้ท้องเสีย"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500">วิธีใช้ ปรุงยา และส่วนที่ใช้รักษา:</label>
                <textarea
                  rows={2}
                  value={editingHerb.usage || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, usage: e.target.value })}
                  placeholder="เช่น นำใบสด 5-10 ใบมาต้มดื่มน้ำหลังอาหารบรรเทาอาการท้องเสีย..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm font-sans"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500">ข้อควรระวัง / ผลข้างเคียง / ห้ามใช้:</label>
                <input
                  type="text"
                  value={editingHerb.precautions || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, precautions: e.target.value })}
                  placeholder="เช่น ห้ามใช้ในสตรีมีครรภ์ หรือผู้มีประวัติแพ้พืชวงศ์นี้"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500">เอกสารหรือลิงก์อ้างอิง (Reference Links / Documents - คั่นด้วยเครื่องหมายจุลภาค ,):</label>
                <input
                  type="text"
                  value={Array.isArray(editingHerb.reference) ? editingHerb.reference.join(", ") : (editingHerb.reference || "")}
                  onChange={(e) => setEditingHerb({ ...editingHerb, reference: e.target.value })}
                  placeholder="เช่น https://example.com/doc, ตำรับสมุนไพรไทย"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500">ลิงก์พิกัดแผนที่กูเกิลแมปสมุนไพร (Google Maps / Location Link):</label>
                <input
                  type="text"
                  value={editingHerb.locationMap || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, locationMap: e.target.value })}
                  placeholder="เช่น https://maps.google.com/?q=7.008,100.474"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">พิกัด / ตำแหน่งติดตั้งแปลง:</label>
                <input
                  type="text"
                  value={editingHerb.location || ""}
                  onChange={(e) => setEditingHerb({ ...editingHerb, location: e.target.value })}
                  placeholder="เช่น แปลง A05 ฝั่งทิศใต้ของสวนชีวาสุข"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">หมวดหมู่พรรณสมุนไพร:</label>
                <select
                  value={editingHerb.category || "general"}
                  onChange={(e) => setEditingHerb({ ...editingHerb, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-350"
                >
                  <option value="fever">แก้ไข้หวัด / ปอด / ระบบทางเดินหายใจ</option>
                  <option value="digestive">ท้องอืด / กระเพาะอาหาร / ขับถ่าย</option>
                  <option value="skin">ผิวหนัง / แผลติดเชื้อ / พิษสัตว์กัด</option>
                  <option value="general">พืชพรรณทั่วไป / บำรุงร่างกาย</option>
                  <option value="tonic">บำรุงร่างกาย / ฟื้นฟูสุขภาพ</option>
                  <option value="food">อาหาร / เครื่องเทศ</option>
                  <option value="flower">ไม้ดอกไม้ประดับ</option>
                  <option value="rare">พืชพรรณพัทลุง/อนุรักษ์</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setHerbModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold cursor-pointer text-slate-800 dark:text-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveHerb}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูลพืช</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 2: QUIZ EDITOR FORM MODAL
          ========================================================== */}
      {quizModalOpen && editingQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl text-left space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                โจทย์คำถามทดสอบความรู้
              </h3>
              <button
                onClick={() => setQuizModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">สมุนไพรวิชาการที่อ้างอิงของโจทย์ข้อนี้:</label>
                <select
                  value={editingQuiz.herbId || ""}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, herbId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm font-semibold text-slate-850 dark:text-slate-200"
                >
                  {localHerbs.map((h) => (
                    <option key={h.herbId} value={h.herbId}>
                      🌿 {h.thaiName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">โจทย์คำถามประเมินความคิดเชิงลึก (Open-ended):</label>
                <textarea
                  rows={3}
                  required
                  value={editingQuiz.question || ""}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, question: e.target.value })}
                  placeholder="เขียนคำถาม เช่น เหง้าของขิงนำมาต้มน้ำดื่มใช้แก้อาการใด?"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">แนวเฉลยทางคลินิก (สำหรับปัญญาประดิษฐ์เทียบคำตอบ):</label>
                <input
                  type="text"
                  required
                  value={editingQuiz.answer || (editingQuiz as any).answerScheme || ""}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, answer: e.target.value })}
                  placeholder="เช่น ทารักษาแผลเริม งูสวัด ตะขาบกัด ทาซ้ำวันละ 3-4 ครั้ง"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuizModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold cursor-pointer text-slate-800 dark:text-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveQuiz}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกข้อสอบ</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Reset Statistics Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">ยืนยันการล้างข้อมูลสถิติ</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณต้องการล้างข้อมูลสถิติกิจกรรมทั้งหมด (<strong className="text-slate-900 dark:text-slate-100">ยอดผู้เข้าชม, สถิติการสแกนภาพ AI, แชท AI</strong>) พร้อมทั้ง<strong className="text-rose-600 dark:text-rose-400">ล้างทำเนียบเกียรติยศและเกียรติบัตรทั้งหมด</strong>ให้กลายเป็น 0 เพื่อเริ่มต้นเก็บสถิติการใช้งานจริงใช่หรือไม่?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันล้างข้อมูลเป็น 0</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                  ยืนยันการลบ{deleteConfirmItem.type === "herb" ? "สมุนไพร" : "โจทย์ข้อสอบ"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณต้องการลบ{deleteConfirmItem.type === "herb" ? "สมุนไพร" : "โจทย์"} <strong className="text-slate-900 dark:text-slate-100">"{deleteConfirmItem.title}"</strong> ออกจากฐานข้อมูลใช่หรือไม่?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบข้อมูล</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminPortal;
