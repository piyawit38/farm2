import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getHerb, saveHerb, getHerbs, logHerbView, deleteHerb } from "../services/db";
import { HERBAL_CATEGORIES } from "../constants";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useGarden } from "../contexts/GardenContext";
import { AudioGuidePlayer } from "../components/AudioGuidePlayer";
import { QRCodeSVG } from "qrcode.react";
import {
  Volume2, VolumeX, Sparkles, AlertTriangle, BookOpen, MapPin,
  QrCode, Info, ChevronLeft, CheckCircle, HelpCircle, Eye, CornerDownRight,
  Leaf, Award, Edit, Trash2, Printer, Download, ExternalLink
} from "lucide-react";

export const HerbDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, addCompletedHerb } = useAuth();
  const { showToast } = useToast();
  const { currentGarden } = useGarden();

  const [herb, setHerb] = useState(getHerb(id || ""));
  const [activeImg, setActiveImg] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const herbUrl = typeof window !== "undefined" ? window.location.href : `https://herb-platform.app/herbs/${herb?.herbId || ""}`;

  // Helper to determine display location strictly as "แปลงสมุนไพร แปลงที่ 1" or "แปลงสมุนไพร แปลงที่ 2"
  const getDisplayLocation = (herbData?: Partial<Herb> | null) => {
    if (!herbData) return "แปลงสมุนไพร แปลงที่ 1";
    const loc = herbData.location?.trim() || "";

    if (loc.includes("แปลงที่ 2") || loc.includes("แปลง 2") || loc.includes("2")) {
      return "แปลงสมุนไพร แปลงที่ 2";
    }
    if (loc.includes("แปลงที่ 1") || loc.includes("แปลง 1")) {
      return "แปลงสมุนไพร แปลงที่ 1";
    }

    // Deterministic selection between Plot 1 and Plot 2 based on herb identity
    const idStr = herbData.herbId || herbData.thaiName || "1";
    let charSum = 0;
    for (let i = 0; i < idStr.length; i++) {
      charSum += idStr.charCodeAt(i);
    }
    const plotNum = (charSum % 2) + 1; // 1 or 2
    return `แปลงสมุนไพร แปลงที่ ${plotNum}`;
  };

  // Download raw QR Code as crisp high-res PNG image
  const handleDownloadQrPng = (svgId: string = "herb-qr-code-svg") => {
    const svg = document.getElementById(svgId);
    if (!svg) {
      showToast("ไม่พบข้อมูล QR Code ในขณะนี้", "error");
      return;
    }
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = 1200;
        canvas.height = 1200;
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, 1200, 1200);
          const pngUrl = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = pngUrl;
          a.download = `QRCode_${herb?.thaiName || "สมุนไพร"}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast("ดาวน์โหลดไฟล์รูปภาพ QR Code สำเร็จแล้ว", "success");
        }
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error(e);
      showToast("ไม่สามารถดาวน์โหลด QR Code ได้", "error");
    }
  };

  // Download full plant tag card as high-res printable PNG image using direct 2D Canvas
  const handleDownloadCardPng = async () => {
    const svgEl = document.getElementById("herb-qr-code-svg");
    if (!svgEl) {
      showToast("ไม่พบข้อมูล QR Code ในขณะนี้", "error");
      return;
    }

    try {
      setIsDownloading(true);

      // Serialize QR Code SVG to Base64 Image
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const qrImg = new Image();
      const qrLoaded = new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = (e) => reject(e);
        qrImg.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
      });

      await qrLoaded;

      // Create high-resolution Canvas (1000 x 1280)
      const width = 1000;
      const height = 1280;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Draw background with gradient & rounded corners
      const cornerRadius = 40;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#CCFBF1"); // Light Teal
      grad.addColorStop(0.5, "#F0FDF4"); // Light Emerald
      grad.addColorStop(1, "#99F6E4"); // Medium Teal
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(20, 20, width - 40, height - 40, cornerRadius);
      ctx.fill();

      // Outer border
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#0D9488";
      ctx.stroke();

      // Top Badge: Garden Title
      const gardenName = currentGarden?.name || "ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข";
      const badgeY = 70;
      const badgeHeight = 76;
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(13, 148, 136, 0.18)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      ctx.beginPath();
      ctx.roundRect(60, badgeY, width - 120, badgeHeight, 22);
      ctx.fill();
      ctx.shadowColor = "transparent";

      ctx.strokeStyle = "#5EEAD4";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = "bold 32px 'Prompt', 'Noto Sans Thai', sans-serif";
      ctx.fillStyle = "#065F46";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`🌿 ${gardenName}`, width / 2, badgeY + badgeHeight / 2);

      // QR Code Box
      const qrBoxSize = 420;
      const qrBoxX = (width - qrBoxSize) / 2;
      const qrBoxY = 180;

      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 30);
      ctx.fill();
      ctx.shadowColor = "transparent";

      ctx.strokeStyle = "#99F6E4";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw QR Image inside box
      const qrPadding = 25;
      ctx.drawImage(
        qrImg,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrBoxSize - qrPadding * 2,
        qrBoxSize - qrPadding * 2
      );

      // Thai Name - Extra Large Font
      let currentY = 645;
      ctx.font = "bold 72px 'Prompt', 'Noto Sans Thai', sans-serif";
      ctx.fillStyle = "#0F172A";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const thaiName = herb?.thaiName || "สมุนไพร";
      ctx.fillText(thaiName, width / 2, currentY);

      currentY += 98;

      // Scientific Name - Extra Large Font
      if (herb?.scientificName) {
        ctx.font = "italic bold 44px 'Georgia', serif";
        ctx.fillStyle = "#0F766E";
        ctx.fillText(herb.scientificName, width / 2, currentY);
        currentY += 72;
      }

      // Family - Extra Large Font
      if (herb?.family) {
        ctx.font = "bold 36px 'Prompt', 'Noto Sans Thai', sans-serif";
        const familyText = `วงศ์ ${herb.family}`;
        const textMetrics = ctx.measureText(familyText);
        const familyBadgeWidth = textMetrics.width + 70;
        const familyBadgeHeight = 60;
        const familyBadgeX = (width - familyBadgeWidth) / 2;

        ctx.fillStyle = "#D1FAE5";
        ctx.beginPath();
        ctx.roundRect(familyBadgeX, currentY, familyBadgeWidth, familyBadgeHeight, 18);
        ctx.fill();

        ctx.strokeStyle = "#6EE7B7";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = "#065F46";
        ctx.textBaseline = "middle";
        ctx.fillText(familyText, width / 2, currentY + familyBadgeHeight / 2);

        currentY += familyBadgeHeight + 45;
      } else {
        currentY += 25;
      }

      // Divider Line
      ctx.strokeStyle = "#5EEAD4";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(80, currentY);
      ctx.lineTo(width - 80, currentY);
      ctx.stroke();

      currentY += 35;

      // Location - Extra Large Font with Plot 1 / Plot 2 logic
      const displayLocation = getDisplayLocation(herb);
      const locationText = `📍 พิกัด: ${displayLocation}`;
      ctx.font = "bold 40px 'Prompt', 'Noto Sans Thai', sans-serif";
      ctx.fillStyle = "#0F172A";
      ctx.textBaseline = "top";
      ctx.fillText(locationText, width / 2, currentY);

      // Export as PNG and trigger download
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `แผ่นป้าย_QR_${herb?.thaiName || "สมุนไพร"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast("ดาวน์โหลดแผ่นป้าย QR Code สำหรับพิมพ์เรียบร้อย!", "success");
    } catch (err) {
      console.error("Download card canvas error:", err);
      showToast("เกิดข้อผิดพลาดในการสร้างไฟล์แผ่นป้าย", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const loadHerbData = () => {
      const fetched = getHerb(id || "");
      if (fetched) {
        setHerb(fetched);
        setActiveImg(prev => prev || fetched.images?.[0] || "");
      }
    };

    loadHerbData();

    // Increment view count dynamically on load and log telemetry once
    const fetched = getHerb(id || "");
    if (fetched) {
      const updated = { ...fetched, viewCount: (fetched.viewCount || 0) + 1 };
      saveHerb(updated);
      logHerbView(currentGarden.gardenId, fetched.herbId);
    }

    window.addEventListener("db_synced", loadHerbData);
    window.addEventListener("storage", loadHerbData);

    return () => {
      window.removeEventListener("db_synced", loadHerbData);
      window.removeEventListener("storage", loadHerbData);
    };
  }, [id]);

  // Clean up speech on page exit
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  if (!herb) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold">ไม่พบข้อมูลสมุนไพรนี้ในฐานข้อมูล</h2>
        <button onClick={() => navigate("/herbs")} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold">
          กลับสู่ฐานข้อมูล
        </button>
      </div>
    );
  }

  const catInfo = HERBAL_CATEGORIES.find((c) => c.id === herb.category);
  const isLearned = user?.completedHerbs.includes(herb.herbId) || false;

  // TTS Reader logic
  const handleToggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel(); // safety clear

      // Construct complete descriptive Thai text to read aloud
      const textToSpeak = `
        สมุนไพร ${herb.thaiName} หรือที่เรียกกันในท้องถิ่นว่า ${herb.localName || herb.thaiName}
        มีชื่อวิทยาศาสตร์ว่า ${herb.scientificName} จัดอยู่ในวงศ์ ${herb.family}
        ลักษณะทางพฤกษศาสตร์คือ ${herb.description}
        สรรพคุณสำคัญได้แก่ ${herb.properties.join(", ")}
        วิธีใช้คือ ${herb.usage}
        ข้อควรระวังคือ ${herb.precautions}
      `;

      const newUtterance = new SpeechSynthesisUtterance(textToSpeak);
      newUtterance.lang = "th-TH";
      newUtterance.rate = 1.0;

      if ("speechSynthesis" in window) {
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.lang.startsWith("th") || v.lang.includes("TH") || v.lang.includes("th"));
        if (thaiVoice) {
          newUtterance.voice = thaiVoice;
        }
      }
      
      newUtterance.onend = () => {
        setIsPlaying(false);
      };
      newUtterance.onerror = () => {
        setIsPlaying(false);
      };

      setUtterance(newUtterance);
      window.speechSynthesis.speak(newUtterance);
      setIsPlaying(true);
      showToast("กำลังเริ่มอ่านออกเสียงข้อมูลสมุนไพรด้วยเสียงพูดภาษาไทย", "info");
    }
  };

  const handleMarkAsLearned = async () => {
    if (!user) {
      showToast("กรุณาเข้าสู่ระบบก่อนเพื่อสะสมคะแนนการเรียนรู้", "warning");
      return;
    }
    try {
      await addCompletedHerb(herb.herbId);
      showToast(`ยอดเยี่ยม! คุณได้เรียนรู้ "${herb.thaiName}" สำเร็จ และได้รับ 10 คะแนน`, "success");
    } catch (e) {
      showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    }
  };

  // Get Related Herbs models
  const allHerbs = getHerbs(currentGarden.gardenId);
  const manualRelated = allHerbs.filter(h => herb.relatedHerbs?.includes(h.herbId));
  
  // AI Recommendation fallback: find herbs in the same category or family
  const aiRecommended = allHerbs
    .filter(h => h.herbId !== herb.herbId && (h.category === herb.category || h.family === herb.family))
    .slice(0, 3);
    
  const relatedHerbsModels = manualRelated.length > 0 ? manualRelated : aiRecommended;
  const isAiRecommended = manualRelated.length === 0 && relatedHerbsModels.length > 0;

  const handleConfirmDeleteHerb = () => {
    if (!herb) return;
    deleteHerb(herb.herbId, currentGarden.gardenId);
    showToast("ลบสมุนไพรเรียบร้อยแล้ว", "success");
    navigate("/herbs");
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* Back Button and Action Headers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/herbs")}
            className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>ย้อนกลับ</span>
          </button>

          {user?.role === "admin" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/admin")}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>แก้ไขข้อมูลสมุนไพรนี้</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบสมุนไพรนี้</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* TTS Audio Speaker Button */}
          <button
            onClick={handleToggleSpeech}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isPlaying
                ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900"
                : "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100/70 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900"
            }`}
          >
            {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isPlaying ? "หยุดเสียงบรรยาย" : "ฟังเสียงบรรยายภาษาไทย"}</span>
          </button>

          {/* Ask AI Helper (Context loaded) */}
          <button
            onClick={() => navigate(`/chatbot?herb=${herb.herbId}`)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span>คุยถาม AI เกี่ยวกับตัวนี้</span>
          </button>

          {/* Learn Checkbox */}
          <button
            onClick={handleMarkAsLearned}
            disabled={isLearned}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
              isLearned
                ? "bg-emerald-500 text-white cursor-not-allowed opacity-90"
                : "bg-teal-600 hover:bg-teal-700 text-white"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isLearned ? "เรียนรู้สำเร็จแล้ว" : "ทำเครื่องหมายเรียนรู้แล้ว (+10)"}</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Left (Images & Map) / Right (Details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visual Area (Images, QR Code, Location Map) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Photo Gallery */}
          <div className="space-y-3">
            <div className="h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 dark:border-slate-850 shadow-sm relative">
              <img src={activeImg || "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=800&auto=format&fit=crop"} alt={herb.thaiName} className="w-full h-full object-cover" />
              <span className="absolute bottom-3 left-3 text-[10px] font-bold bg-slate-900/60 backdrop-blur-xs text-white px-2 py-0.5 rounded flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>มีผู้เข้าชมแล้ว {herb.viewCount || 0} ครั้ง</span>
              </span>
            </div>
            
            {/* Gallery Thumbnail Strip */}
            {herb.images && herb.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {herb.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(img)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                      activeImg === img ? "border-teal-500" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt={`ภาพประกอบ ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location and QR Code Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                <MapPin className="w-5 h-5 text-teal-600" />
                <span>ตำแหน่งและรหัสคิวอาร์สำหรับพืช</span>
              </h3>
              <button
                onClick={() => setShowQrModal(true)}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>ขยาย / พิมพ์ QR</span>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Real generated QRCodeSVG */}
              <div
                onClick={() => setShowQrModal(true)}
                className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:border-teal-500 transition-all shadow-xs group"
                title="คลิกเพื่อขยายและดาวน์โหลด / พิมพ์แผ่น QR Code"
              >
                <div className="p-1.5 bg-white rounded-lg shadow-2xs group-hover:scale-105 transition-transform">
                  <QRCodeSVG
                    id="herb-qr-code-svg-page"
                    value={herbUrl}
                    size={96}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[9px] font-extrabold text-teal-600 dark:text-teal-400 mt-2 tracking-wider flex items-center gap-1">
                  <QrCode className="w-3 h-3" />
                  <span>สแกนเข้าหน้านี้</span>
                </span>
              </div>

              <div className="space-y-2 text-left">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 block">พิกัดทางกายภาพในสวน:</span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
                  {getDisplayLocation(herb)}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                  * คุณสามารถดาวน์โหลดหรือพิมพ์แผ่น QR Code ติดตั้งไว้หน้าแปลงสมุนไพร เพื่อให้ผู้มาเยือนสแกนดูข้อมูลสมุนไพรต้นนี้ได้ทันที
                </p>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleDownloadQrPng("herb-qr-code-svg-page")}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด QR (PNG)</span>
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold rounded-xl border border-teal-200 dark:border-teal-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ขยาย / ดาวน์โหลดแผ่นป้าย</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Information Sheet (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header Title Information */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {catInfo && (
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white uppercase flex items-center gap-1 shadow-2xs" style={{ backgroundColor: catInfo.color }}>
                  <span>{catInfo.icon}</span>
                  <span>{catInfo.name}</span>
                </span>
              )}
              <span className="text-xs sm:text-sm font-bold bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 px-3 py-1 rounded-lg border border-teal-300 dark:border-teal-800 shadow-2xs">
                วงศ์: {herb.family}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {herb.thaiName}
            </h1>

            {herb.localName && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold">
                ชื่อท้องถิ่น: <span className="text-teal-700 dark:text-teal-300 font-extrabold">{herb.localName}</span>
              </p>
            )}

            <p className="text-base sm:text-lg font-serif italic font-bold text-teal-800 dark:text-teal-300">
              {herb.scientificName}
            </p>
          </div>

          {/* Audio Guide TTS Player Component for Accessibility */}
          <AudioGuidePlayer
            herbName={herb.thaiName}
            localName={herb.localName}
            scientificName={herb.scientificName}
            family={herb.family}
            description={herb.description}
            properties={herb.properties}
            usage={herb.usage}
            precautions={herb.precautions}
          />

          {/* Description Block */}
          <section className="bg-slate-50/50 dark:bg-slate-900/30 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>ลักษณะทางพฤกษศาสตร์</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {herb.description}
            </p>
          </section>

          {/* Properties lists & Usage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <section className="space-y-2.5">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Award className="w-4 h-4 text-teal-600" />
                <span>สรรพคุณทางยา</span>
              </h3>
              <ul className="space-y-1.5">
                {herb.properties?.map((prop, idx) => (
                  <li key={idx} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 mt-0.5 shrink-0">✦</span>
                    <span>{prop}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2.5">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Info className="w-4 h-4 text-emerald-500" />
                <span>ส่วนที่ใช้ & วิธีใช้</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {herb.usage}
              </p>
            </section>

          </div>

          {/* Warnings and Precautions */}
          {herb.precautions && (
            <section className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 text-left">
              <h4 className="font-extrabold text-xs sm:text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>ข้อควรระวังสำคัญ</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {herb.precautions}
              </p>
            </section>
          )}

          {/* References info */}
          {herb.reference && herb.reference.length > 0 && (
            <section className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                แหล่งข้อมูลอ้างอิงทางวิชาการ
              </h4>
              <ul className="space-y-1 text-slate-500 dark:text-slate-400 text-xs">
                {herb.reference.map((ref, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CornerDownRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{ref}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Related Herbs link */}
          {relatedHerbsModels.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                {isAiRecommended ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400">AI แนะนำพืชที่ควรศึกษาต่อ</span>
                  </>
                ) : (
                  <span>สมุนไพรที่เกี่ยวข้อง</span>
                )}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedHerbsModels.map((relHerb) => (
                  <Link
                    key={relHerb.herbId}
                    to={`/herbs/${relHerb.herbId}`}
                    className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-teal-500/20 dark:border-slate-800 dark:hover:border-teal-400/20 bg-white dark:bg-slate-900 shadow-xs hover:shadow-sm transition-all"
                  >
                    <img src={relHerb.images?.[0]} alt={relHerb.thaiName} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                    <div className="text-left overflow-hidden">
                      <span className="font-bold text-xs sm:text-sm text-slate-850 dark:text-slate-200 block truncate hover:text-teal-600">
                        🌿 {relHerb.thaiName}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{relHerb.scientificName}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">ยืนยันการลบสมุนไพร</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณต้องการลบสมุนไพร <strong className="text-slate-900 dark:text-slate-100">"{herb?.thaiName}"</strong> ออกจากฐานข้อมูลใช่หรือไม่?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDeleteHerb}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบสมุนไพร</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:p-0 print:bg-white print:static">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center relative print:border-none print:shadow-none print:w-full">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 print:hidden">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                <QrCode className="w-5 h-5" />
                <span>แผ่นป้าย QR Code สมุนไพร</span>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>

            {/* Plant Tag Preview Area */}
            <div
              id="herb-qr-card-printable"
              className="p-6 bg-gradient-to-b from-teal-50 via-emerald-50 to-teal-100 rounded-2xl border-2 border-teal-400 space-y-4 shadow-sm text-slate-900"
            >
              
              {/* Organization Header */}
              <div className="flex items-center justify-center gap-1.5 text-teal-950 font-black text-sm sm:text-base bg-white/90 px-3 py-1.5 rounded-xl border border-teal-300 shadow-2xs">
                <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-center">{currentGarden?.name || "ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข"}</span>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl shadow-md inline-block border-2 border-teal-200">
                <QRCodeSVG
                  id="herb-qr-code-svg"
                  value={herbUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Herb Names & Family */}
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight">
                  {herb?.thaiName}
                </h2>
                {herb?.scientificName && (
                  <p className="text-base sm:text-lg font-serif italic font-bold text-teal-800">
                    {herb.scientificName}
                  </p>
                )}
                {herb?.family && (
                  <div className="pt-1">
                    <span className="text-sm sm:text-base font-black text-teal-900 bg-teal-100 px-3.5 py-1 rounded-lg border border-teal-300 inline-block shadow-2xs">
                      วงศ์ {herb.family}
                    </span>
                  </div>
                )}
              </div>

              {/* Location Tag */}
              <div className="text-sm sm:text-base font-black text-slate-900 border-t-2 border-teal-300/80 pt-2.5 font-sans">
                📍 พิกัด: {getDisplayLocation(herb)}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              คุณสามารถดาวน์โหลดเป็นไฟล์รูปภาพ PNG เพื่อนำไปพิมพ์และติดตั้งหน้าแปลงสมุนไพร
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <button
                onClick={handleDownloadCardPng}
                disabled={isDownloading}
                className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${isDownloading ? "animate-bounce" : ""}`} />
                <span>{isDownloading ? "กำลังสร้างภาพ..." : "ดาวน์โหลดแผ่นป้าย (PNG)"}</span>
              </button>

              <button
                onClick={() => handleDownloadQrPng("herb-qr-code-svg")}
                className="w-full sm:flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดเฉพาะ QR</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default HerbDetail;
