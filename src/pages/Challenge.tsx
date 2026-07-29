import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useGarden } from "../contexts/GardenContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getHerb, getUsers } from "../services/db";
import html2canvas from "html2canvas";
import {
  HelpCircle, RefreshCw, Sparkles, Send, CheckCircle2, XCircle,
  AlertTriangle, ArrowRight, Trophy, BookOpen, AlertCircle,
  Camera, Upload, Check, RotateCcw, Award, Leaf, Printer, Download, Share2, QrCode, Shield, Compass, FileText, User, Trash2
} from "lucide-react";

// Types for Game
interface GameHerb {
  id: string;
  name: string;
  scientific: string;
  image: string;
  correctProperty: string;
  distractors: string[];
}

export const Challenge: React.FC = () => {
  const { currentGarden, getGardenQuizzes, getGardenHerbs } = useGarden();
  const { user, addScore, updateProfileName, updateProfilePhoto } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [refreshCount, setRefreshCount] = useState(0);
  const [editableName, setEditableName] = useState(user?.displayName || "");
  const [tempPassportPhoto, setTempPassportPhoto] = useState<string | null>(null);

  // Automatically clean up temporary photo when unmounting page
  useEffect(() => {
    return () => {
      setTempPassportPhoto(null);
    };
  }, []);

  const passportDisplayPhoto = useMemo(() => {
    if (tempPassportPhoto) return tempPassportPhoto;
    if (user?.photoURL && !user.photoURL.startsWith("data:")) return user.photoURL;
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.displayName || user?.userId || "guest")}`;
  }, [tempPassportPhoto, user?.photoURL, user?.displayName, user?.userId]);

  useEffect(() => {
    if (user?.displayName) {
      setEditableName(user.displayName);
    }
  }, [user?.displayName]);

  const handleSaveName = async () => {
    if (!editableName.trim()) {
      showToast("กรุณากรอกชื่อผู้รับเกียรติบัตร", "error");
      return;
    }
    try {
      await updateProfileName(editableName.trim());
      showToast("อัปเดตชื่อผู้รับเรียบร้อยแล้ว!", "success");
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการอัปเดตชื่อ", "error");
    }
  };

  const compressImage = (file: File, maxWidth = 500, maxHeight = 500): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePassportPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showToast("กำลังประมวลผลรูปถ่าย...", "info");
        const photoData = await compressImage(file, 500, 500);
        setTempPassportPhoto(photoData);
        showToast("อัปโหลดรูปถ่ายพาสปอร์ตชั่วคราวเรียบร้อย! (รูปนี้ใช้ชั่วคราวสำหรับพิมพ์/บันทึกไฟล์)", "success");
      } catch (err) {
        console.error("Upload error:", err);
        showToast("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", "error");
      }
    }
  };

  useEffect(() => {
    const handleStatsCleared = () => {
      setRefreshCount((c) => c + 1);
    };
    window.addEventListener("stats_cleared", handleStatsCleared);
    window.addEventListener("storage", handleStatsCleared);
    window.addEventListener("db_synced", handleStatsCleared);
    return () => {
      window.removeEventListener("stats_cleared", handleStatsCleared);
      window.removeEventListener("storage", handleStatsCleared);
      window.removeEventListener("db_synced", handleStatsCleared);
    };
  }, []);

  // Real leaderboard ranking list from database active users
  const rankingList = useMemo(() => {
    const rawUsers = getUsers();

    let combined = rawUsers.map((u) => ({
      displayName: u.displayName,
      photoURL: u.photoURL,
      level: u.level,
      completedCount: u.completedHerbs?.length || 0,
      totalScore: u.totalScore,
      isCurrentUser: user?.userId === u.userId
    }));

    if (user && !combined.some((u) => u.isCurrentUser)) {
      combined.push({
        displayName: user.displayName,
        photoURL: user.photoURL,
        level: user.level,
        completedCount: user.completedHerbs?.length || 0,
        totalScore: user.totalScore,
        isCurrentUser: true
      });
    }

    // Sort by score descending
    combined.sort((a, b) => b.totalScore - a.totalScore);

    return combined.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }, [user, refreshCount]);

  // Active quiz tab: "photo" (gorgeous new photo quiz), "standard" (original trivia quizzes list), or "certificate"
  const tabParam = searchParams.get("tab") as "photo" | "standard" | "certificate";
  const [activeTab, setActiveTab] = useState<"photo" | "standard" | "certificate">(
    tabParam === "certificate" || tabParam === "standard" || tabParam === "photo" ? tabParam : "photo"
  );

  // Sync tab state with URL query parameter
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab && (currentTab === "photo" || currentTab === "standard" || currentTab === "certificate")) {
      setActiveTab(currentTab as "photo" | "standard" | "certificate");
    }
  }, [searchParams]);

  const handleTabChange = (tab: "photo" | "standard" | "certificate") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const todayString = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const [downloading, setDownloading] = useState(false);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  const renderPassportCanvas = async (
    userName: string,
    userPhoto: string,
    userId: string,
    score: number,
    gardenName: string,
    gardenId: string,
    dateStr: string
  ): Promise<string> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 780;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Fill Dark slate Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 1200, 780);

    // Outer Gold Border
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 1160, 740);

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, 1136, 716);

    // Top Emblem Logo
    const logoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpjm_Yo-6e2HgR7GsSNQiGL7q_Y4l-TasybXnDrNZJxw&s=10";
    try {
      const logoImg = await loadImage(logoUrl);
      ctx.drawImage(logoImg, 60, 50, 110, 100);
    } catch (e) {
      console.warn("Logo image load notice", e);
    }

    // Titles
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SMART HERBAL PASSPORT", 190, 85);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("พาสปอร์ตท่องเที่ยวและอนุรักษ์พืชสมุนไพรไทย", 190, 118);

    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`📍 ${gardenName}`, 190, 145);

    // Serial Number Box (Top Right)
    const serialNo = userId.replace("USER_", "TH-").substring(0, 12).toUpperCase();
    ctx.fillStyle = "rgba(217, 119, 6, 0.15)";
    ctx.fillRect(860, 55, 280, 80);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(860, 55, 280, 80);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 12px monospace";
    ctx.fillText("PASSPORT NO.", 880, 80);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 20px monospace";
    ctx.fillText(serialNo, 880, 110);

    // Separator Line
    ctx.strokeStyle = "rgba(251, 191, 36, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 170);
    ctx.lineTo(1140, 170);
    ctx.stroke();

    // Photo slot
    const px = 60;
    const py = 200;
    const pw = 260;
    const ph = 320;

    ctx.fillStyle = "#020617";
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, pw, ph);

    if (userPhoto) {
      try {
        const photoImg = await loadImage(userPhoto);
        ctx.drawImage(photoImg, px + 4, py + 4, pw - 8, ph - 8);
      } catch (e) {
        console.warn("User photo load notice", e);
      }
    }

    // APPROVED Stamp Badge on corner of photo
    const stampX = px + pw - 20;
    const stampY = py + ph - 20;
    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.rotate(0.2);
    ctx.fillStyle = "#0d9488";
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("APPROVED", 0, -4);
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("HERBAL PARK", 0, 14);
    ctx.restore();

    // Bio details (Right of photo)
    const fx = 360;
    let fy = 215;

    const drawBioRow = (label: string, val: string, color: string = "#f8fafc") => {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, fx, fy);

      ctx.fillStyle = color;
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(val, fx, fy + 26);

      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 38);
      ctx.lineTo(1140, fy + 38);
      ctx.stroke();

      fy += 64;
    };

    drawBioRow("NAME / ชื่อผู้ถือพาสปอร์ต", userName, "#ffffff");
    drawBioRow("NATIONALITY / สัญชาติ", "THAILAND / ไทย", "#e2e8f0");
    drawBioRow(
      "LEVEL / ระดับเรียนรู้",
      score >= 10 ? "EXPERT (ระดับเชี่ยวชาญ)" : "EXPLORER (ระดับต้น)",
      "#fbbf24"
    );
    drawBioRow("CURRENT SCORE / คะแนนสะสม", `⭐ ${score} คะแนน`, "#4ade80");
    drawBioRow("ISSUING AUTHORITY / หน่วยงานออกหนังสือ", gardenName, "#e2e8f0");

    // Serial & Date
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.fillText("PASSPORT SERIAL & DATE / รหัสประทับตราพาสปอร์ตดิจิทัล", fx, fy);

    const passSerial = `${gardenId}-PASS-${userId.replace("USER_", "").toUpperCase()}`;
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 18px monospace";
    ctx.fillText(passSerial, fx, fy + 26);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText(`ออก ณ วันที่ ${dateStr}`, fx, fy + 48);

    // Bottom Branding Line
    ctx.fillStyle = "rgba(251, 191, 36, 0.1)";
    ctx.fillRect(40, 710, 1120, 40);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ระบบบันทึกพาสปอร์ตดิจิทัลภูมิปัญญาพืชสมุนไพรไทย - HAT YAI CHEEWASUK HERBAL HERITAGE", 600, 735);

    return canvas.toDataURL("image/png");
  };

  const renderCertificateCanvas = async (
    userName: string,
    userId: string,
    score: number,
    gardenName: string,
    gardenId: string,
    dateStr: string
  ): Promise<string> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Background
    ctx.fillStyle = "#fffbeb";
    ctx.fillRect(0, 0, 1200, 850);

    // Border
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 10;
    ctx.strokeRect(25, 25, 1150, 800);

    ctx.strokeStyle = "#0d9488";
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 1120, 770);

    // Ornaments
    ctx.fillStyle = "#b45309";
    ctx.font = "bold 32px serif";
    ctx.fillText("✥", 55, 75);
    ctx.fillText("✥", 1120, 75);
    ctx.fillText("✥", 55, 790);
    ctx.fillText("✥", 1120, 790);

    // Logo
    const logoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpjm_Yo-6e2HgR7GsSNQiGL7q_Y4l-TasybXnDrNZJxw&s=10";
    try {
      const logoImg = await loadImage(logoUrl);
      ctx.drawImage(logoImg, 530, 60, 140, 100);
    } catch (e) {
      console.warn("Certificate logo notice", e);
    }

    // Header
    ctx.fillStyle = "#b45309";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ใบเกียรติบัตรรับรองความรู้สมุนไพรดิจิทัล", 600, 200);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("โครงการต่อยอด 1 อปท. 1 สวนสมุนไพร เฉลิมพระเกียรติฯ", 600, 230);

    ctx.fillStyle = "#0d9488";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(gardenName, 600, 260);

    ctx.fillStyle = "#475569";
    ctx.font = "16px sans-serif";
    ctx.fillText("เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า", 600, 315);

    // Name
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(userName, 600, 375);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(350, 395);
    ctx.lineTo(850, 395);
    ctx.stroke();

    // Content
    ctx.fillStyle = "#334155";
    ctx.font = "17px sans-serif";
    ctx.fillText("ได้สำเร็จหลักสูตรศึกษาระดับพฤกษศาสตร์สมุนไพรอัจฉริยะ", 600, 435);
    ctx.fillText(`ผ่านการเรียนรู้พืชพรรณพฤกษเวชศาสตร์ สะสมคะแนนได้ ${score} คะแนน`, 600, 470);
    ctx.fillText("มีคะแนนสะสมความรู้ยอดเยี่ยมตามมาตรฐานที่กำหนด", 600, 505);

    // Signatures
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("พว.อาบทิพย์ เพ็ชรสกุล", 350, 670);
    ctx.fillStyle = "#475569";
    ctx.font = "14px sans-serif";
    ctx.fillText("หัวหน้าศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข", 350, 698);

    const certSerial = `${gardenId}-CERT-${userId.replace("USER_", "").toUpperCase()}`;
    ctx.fillStyle = "#b45309";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`รหัสเกียรติบัตร: ${certSerial}`, 1100, 670);
    ctx.fillStyle = "#475569";
    ctx.font = "14px sans-serif";
    ctx.fillText(`ให้ไว้ ณ วันที่ ${dateStr}`, 1100, 698);

    return canvas.toDataURL("image/png");
  };

  const handlePrint = () => {
    const printEl = document.getElementById("print-area");
    if (!printEl) {
      window.print();
      return;
    }

    const isPassport = user && user.totalScore < 10;
    const printWin = window.open("", "_blank", "width=1000,height=750");
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${isPassport ? "Smart_Herbal_Passport" : "Herbal_Heritage_Certificate"}</title>
            <meta charset="utf-8" />
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: #ffffff;
                color: #0f172a;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
              }
              .print-box {
                width: 100%;
                max-width: 900px;
              }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              @media print {
                body { padding: 0; background: #ffffff; }
                @page { size: landscape; margin: 10mm; }
              }
            </style>
          </head>
          <body>
            <div class="print-box">
              ${printEl.innerHTML}
            </div>
            <script>
              setTimeout(() => {
                window.print();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      window.print();
    }

    // Reset temporary passport photo after printing
    if (tempPassportPhoto) {
      setTimeout(() => {
        setTempPassportPhoto(null);
        showToast("สั่งพิมพ์พาสปอร์ตเรียบร้อย! ระบบทำการลบรูปถ่ายชั่วคราวแล้ว", "info");
      }, 1000);
    }
  };

  const handleDownloadImage = async () => {
    if (!user) return;
    setDownloading(true);
    showToast("กำลังสร้างไฟล์รูปภาพพาสปอร์ต...", "info");

    try {
      let dataUrl = "";
      const isPassport = user.totalScore < 10;
      if (isPassport) {
        dataUrl = await renderPassportCanvas(
          user.displayName,
          passportDisplayPhoto,
          user.userId,
          user.totalScore,
          currentGarden.name,
          currentGarden.gardenId,
          todayString
        );
      } else {
        dataUrl = await renderCertificateCanvas(
          user.displayName,
          user.userId,
          user.totalScore,
          currentGarden.name,
          currentGarden.gardenId,
          todayString
        );
      }

      const link = document.createElement("a");
      const safeName = user.displayName.replace(/\s+/g, "_");
      const filename = isPassport 
        ? `herbal-passport-${safeName}.png`
        : `herbal-certificate-${safeName}.png`;

      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (tempPassportPhoto) {
        setTempPassportPhoto(null);
        showToast(`ดาวน์โหลด${isPassport ? "พาสปอร์ต" : "เกียรติบัตร"} (PNG) เรียบร้อยแล้ว! (ลบรูปถ่ายชั่วคราวเรียบร้อยแล้ว)`, "success");
      } else {
        showToast(`ดาวน์โหลด${isPassport ? "พาสปอร์ต" : "เกียรติบัตร"} (PNG) เรียบร้อยแล้ว!`, "success");
      }
    } catch (error) {
      console.error("Error generating canvas image:", error);
      showToast("เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = (type: string) => {
    const shareUrl = `${window.location.origin}/challenge?tab=certificate&type=${type}`;
    navigator.clipboard.writeText(shareUrl);
    showToast("คัดลอกลิงก์ตรวจสอบผลการเรียนรู้อัจฉริยะแล้ว! คุณสามารถใช้แชร์เพื่อแสดงความรู้อัจฉริยะได้", "success");
  };

  // --- STATE FOR ORIGINAL TRIVIA QUIZZES ---
  const quizzes = getGardenQuizzes();
  const [standardActiveIdx, setStandardActiveIdx] = useState(0);
  const [standardUserAnswer, setStandardUserAnswer] = useState("");
  const [standardGrading, setStandardGrading] = useState(false);
  const [standardGradeResult, setStandardGradeResult] = useState<any>(null);
  const [standardCorrectCount, setStandardCorrectCount] = useState(0);
  const [standardFinished, setStandardFinished] = useState(false);

  // --- STATE FOR NEW PHOTO/AI CHALLENGE ---
  // Step list: IDLE -> SCANNING -> Q1_RECOGNITION -> Q1_RECOGNITION_RESULT -> Q1_FOLLOWUP -> Q1_FOLLOWUP_RESULT -> Q2_TRIVIA -> Q2_RESULT -> Q3_TRIVIA -> Q3_RESULT -> SUMMARY
  const [gameState, setGameState] = useState<
    "IDLE" | "SCANNING" | "Q1_RECOGNITION" | "Q1_RECOGNITION_RESULT" | "Q1_FOLLOWUP" | "Q1_FOLLOWUP_RESULT" | "Q2_TRIVIA" | "Q2_RESULT" | "Q3_TRIVIA" | "Q3_RESULT" | "SUMMARY"
  >("IDLE");

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [activeGameHerb, setActiveGameHerb] = useState<GameHerb | null>(null);
  
  // Question 1 Inputs & Outputs
  const [q1Guess, setQ1Guess] = useState("");
  const [q1NameOptions, setQ1NameOptions] = useState<string[]>([]);
  const [isQ1Correct, setIsQ1Correct] = useState<boolean>(false);

  const generateQ1NameOptions = (correctName: string) => {
    const commonHerbNames = [
      "ใบบัวบก", "ฟ้าทะลายโจร", "ว่านหางจระเข้", "ไพล",
      "มะขามป้อม", "ชะพลู", "ขิง", "กระชายดำ", "ดีบัว", "รางจืด"
    ];
    const distractors = commonHerbNames
      .filter(n => n.toLowerCase() !== correctName.toLowerCase())
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [correctName, ...distractors].sort(() => Math.random() - 0.5);
  };
  
  // Followup / Properties Question Input
  const [selectedPropertyOption, setSelectedPropertyOption] = useState<string | null>(null);
  const [propertiesOptions, setPropertiesOptions] = useState<string[]>([]);
  const [isPropertyCorrect, setIsPropertyCorrect] = useState<boolean>(false);

  // General Questions 2 & 3 Inputs
  const [q2SelectedOption, setQ2SelectedOption] = useState<string | null>(null);
  const [q3SelectedOption, setq3SelectedOption] = useState<string | null>(null);
  const [isQ2Correct, setIsQ2Correct] = useState<boolean>(false);
  const [isQ3Correct, setIsQ3Correct] = useState<boolean>(false);

  // Final scoring tracking for photo challenge
  const [photoScoreEarned, setPhotoScoreEarned] = useState(0);
  const [savingScore, setSavingScore] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

    const presetHerbs: GameHerb[] = [
      {
        id: "HERB005",
        name: "ขิง",
        scientific: "Zingiber officinale Roscoe",
        image: "https://images.unsplash.com/photo-1608797178974-15b35a61d121?q=80&w=400&auto=format&fit=crop",
        correctProperty: "ขับลม แก้ปวดท้อง จุกเสียดแน่นเฟ้อ แก้อาการคลื่นไส้อาเจียน",
        distractors: [
          "บำรุงหนังศีรษะ ขจัดรังแค แก้ผมร่วงและผมแตกปลาย",
          "ลดระดับน้ำตาลในเลือด รักษาโรคเบาหวานเฉียบพลัน",
          "ขับพยาธิในระบบทางเดินอาหาร และฟื้นฟูกล้ามเนื้ออ่อนแรง"
        ]
      },
      {
        id: "HERB006",
        name: "ใบบัวบก",
        scientific: "Centella asiatica",
        image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=400&auto=format&fit=crop",
        correctProperty: "แก้ช้ำใน ลดการตึงอักเสบ และช่วยสมานแผลให้หายเร็วขึ้น",
        distractors: [
          "แก้ไข้หวัด ตัวร้อน บรรเทาอาการไอ และขับเสมหะระคายคอ",
          "บำรุงประสาทและสมอง ป้องกันภาวะความจำเสื่อม อัลไซเมอร์",
          "แก้ตุ่มคัน บรรเทาอาการอักเสบจากแมลงสัตว์กัดต่อย"
        ]
      },
      {
        id: "HERB007",
        name: "ว่านหางจระเข้",
        scientific: "Aloe vera (L.) Burm.f.",
        image: "https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?q=80&w=400&auto=format&fit=crop",
        correctProperty: "รักษาแผลไฟไหม้ น้ำร้อนลวก และลดอาการระคายเคืองผิวจากความร้อน",
        distractors: [
          "ช่วยขับปัสสาวะ รักษานิ่วในไต และบรรเทาอาการกระเพาะปัสสาวะอักเสบ",
          "ชำระเมือกมันในลำไส้ ช่วยระบายของเสียสะสม",
          "บำรุงธาตุ บำรุงหัวใจ แก้อาการอ่อนเพลียเรื้อรัง"
        ]
      },
      {
        id: "HERB008",
        name: "ไพล",
        scientific: "Zingiber montanum",
        image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=400&auto=format&fit=crop",
        correctProperty: "แก้ปวดเมื่อยกล้ามเนื้อ ต้านการอักเสบ และบรรเทาอาการฟกช้ำดำเขียว",
        distractors: [
          "แก้อาการท้องร่วง ท้องเสียเฉียบพลัน และอาการบิดมีมูกปนเลือด",
          "กระตุ้นการเผาผลาญไขมันสะสมในเซลล์ตับ",
          "รักษาตาปลา ผิวพองหนา และสมานแผลแห้งกร้าน"
        ]
      }
    ];

  // Q2 & Q3 static high-quality trivia database
  const q2Data = {
    question: "เหง้าไพลประกอบด้วยสารสำคัญกลุ่มใดยอดนิยมนำมาสกัดเป็นน้ำมันไพล มีฤทธิ์ต้านการอักเสบและลดปวดเมื่อย?",
    options: [
      "สารในน้ำมันหอมระเหยและไพลมาริน",
      "สารแคปไซซิน (Capsaicin)",
      "สารเมนทอล (Menthol)",
      "สารคาเฟอีน (Caffeine)"
    ],
    correctAnswer: "สารในน้ำมันหอมระเหยและไพลมาริน",
    explanation: "สารในน้ำมันหอมระเหยของไพลช่วยต้านการอักเสบและบรรเทาอาการปวดเมื่อยกล้ามเนื้อได้อย่างมีประสิทธิภาพ"
  };

  const q3Data = {
    question: "ใบบัวบกมีฤทธิ์เด่นตามตำรับยาไทยและวิทยาศาสตร์สุขภาพในเรื่องใด?",
    options: [
      "แก้ช้ำใน สมานแผล และบำรุงสมอง",
      "แก้ท้องเสียถ่ายเป็นน้ำ",
      "ขับพยาธิในลำไส้",
      "ระบายท้องเรื้อรัง"
    ],
    correctAnswer: "แก้ช้ำใน สมานแผล และบำรุงสมอง",
    explanation: "ใบบัวบกมีสารมาเดคาสโซไซด์และเอเชียติโคไซด์ ช่วยต้านการอักเสบ สมานแผล และบำรุงระบบประสาท"
  };

  // Handle incoming photo redirect from homepage
  useEffect(() => {
    const state = location.state as { imageSrc?: string } | null;
    if (state?.imageSrc) {
      const base64 = state.imageSrc;
      // Clear location state immediately to avoid repeated triggers on tab switching or reloading
      window.history.replaceState({}, document.title);

      setUploadedImage(base64);
      setGameState("SCANNING");
      showToast("กำลังประมวลผลวิเคราะห์พันธุ์พืชด้วย AI สำหรับเกมทดสอบความรู้...", "info");

      const runVisionChallengeSetup = async () => {
        try {
          const herbsList = getGardenHerbs();
          const response = await fetch("/api/gemini/vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: "image/jpeg",
              gardenName: currentGarden.name,
              herbsList
            })
          });

          if (!response.ok) {
            throw new Error("ระบบ AI ขัดข้องชั่วคราว");
          }

          const visionResult = await response.json();
          
          const foundDbHerb = getGardenHerbs().find(h => h.herbId === visionResult.matchedHerbId);
          
          const customHerb: GameHerb = {
            id: visionResult.matchedHerbId || "CUSTOM_" + Date.now(),
            name: visionResult.identifiedName || "สมุนไพรพื้นบ้าน",
            scientific: visionResult.scientificName || "Inconnue botanica",
            image: base64,
            correctProperty: foundDbHerb?.properties?.[0] || visionResult.analysisText?.substring(0, 80) || "บำรุงร่างกาย ดับพิษร้อน และฟื้นฟูธาตุ",
            distractors: [
              "บรรเทาอาการท้องอืด ท้องเฟ้อ จุกเสียด และช่วยขับลมในลำไส้",
              "ชำระเส้นผม ขจัดรังแคแก้อาการคันหนังศีรษะเด่นชัด",
              "ลดความดันโลหิตและช่วยบำรุงสายตาเพื่อผ่อนคลายกล้ามเนื้อ"
            ]
          };

          setActiveGameHerb(customHerb);
          setQ1NameOptions(generateQ1NameOptions(customHerb.name));
          const shuffledOptions = [customHerb.correctProperty, ...customHerb.distractors]
            .sort(() => Math.random() - 0.5);
          setPropertiesOptions(shuffledOptions);
          setGameState("Q1_RECOGNITION");
          showToast(`วิเคราะห์รูปภาพสำเร็จ! เริ่มคำถามแรกสำหรับ "${customHerb.name}" ทันที`, "success");
        } catch (err) {
          console.error(err);
          // Fallback gracefully to a preset herb quiz so game continues
          const fallbackHerb = presetHerbs[Math.floor(Math.random() * presetHerbs.length)];
          setActiveGameHerb(fallbackHerb);
          setQ1NameOptions(generateQ1NameOptions(fallbackHerb.name));
          const shuffledOptions = [fallbackHerb.correctProperty, ...fallbackHerb.distractors]
            .sort(() => Math.random() - 0.5);
          setPropertiesOptions(shuffledOptions);
          setGameState("Q1_RECOGNITION");
          showToast("วิเคราะห์พืชเสร็จสิ้น (แบบสแตนอโลน)", "success");
        }
      };

      runVisionChallengeSetup();
    }
  }, [location.state, currentGarden, getGardenHerbs]);

  // --- RESTART GAME ---
  const handleRestartPhotoGame = () => {
    setGameState("IDLE");
    setUploadedImage(null);
    setActiveGameHerb(null);
    setQ1Guess("");
    setQ1NameOptions([]);
    setIsQ1Correct(false);
    setSelectedPropertyOption(null);
    setPropertiesOptions([]);
    setIsPropertyCorrect(false);
    setQ2SelectedOption(null);
    setq3SelectedOption(null);
    setIsQ2Correct(false);
    setIsQ3Correct(false);
    setPhotoScoreEarned(0);
  };

  // --- TRIGGER SCAN OR PRESET SELECT ---
  const handleSelectPreset = (herb: GameHerb) => {
    setUploadedImage(herb.image);
    setActiveGameHerb(herb);
    setQ1NameOptions(generateQ1NameOptions(herb.name));
    setGameState("SCANNING");
    showToast(`สแกนภาพ "${herb.name}" สำเร็จ กำลังเริ่มการทดสอบ...`, "info");

    // Simulate scanning delay
    setTimeout(() => {
      // Shuffle options for property question (Q1 Follow-up)
      const shuffledOptions = [herb.correctProperty, ...herb.distractors]
        .sort(() => Math.random() - 0.5);
      setPropertiesOptions(shuffledOptions);
      setGameState("Q1_RECOGNITION");
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const base64 = event.target.result as string;
          setUploadedImage(base64);
          setGameState("SCANNING");
          showToast("กำลังประมวลผลวิเคราะห์พันธุ์พืชด้วย AI...", "info");

          try {
            // Call Gemini Vision to identify the herb
            const herbsList = getGardenHerbs();
            const response = await fetch("/api/gemini/vision", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64,
                mimeType: file.type,
                gardenName: currentGarden.name,
                herbsList
              })
            });

            if (!response.ok) {
              throw new Error("ระบบ AI ขัดข้องชั่วคราว");
            }

            const visionResult = await response.json();
            
            // Map visionResult to activeGameHerb structure
            // Use matched DB herb properties, or fallback to beautiful defaults
            const foundDbHerb = getGardenHerbs().find(h => h.herbId === visionResult.matchedHerbId);
            
            const customHerb: GameHerb = {
              id: visionResult.matchedHerbId || "CUSTOM_" + Date.now(),
              name: visionResult.identifiedName || "สมุนไพรพื้นบ้าน",
              scientific: visionResult.scientificName || "Inconnue botanica",
              image: base64,
              correctProperty: foundDbHerb?.properties?.[0] || visionResult.analysisText?.substring(0, 80) || "บำรุงร่างกาย ดับพิษร้อน และฟื้นฟูธาตุ",
              distractors: [
                "บรรเทาอาการท้องอืด ท้องเฟ้อ จุกเสียด และช่วยขับลมในลำไส้",
                "ชำระเส้นผม ขจัดรังแคแก้อาการคันหนังศีรษะเด่นชัด",
                "ลดความดันโลหิตและช่วยบำรุงสายตาเพื่อผ่อนคลายกล้ามเนื้อ"
              ]
            };

            setActiveGameHerb(customHerb);
            setQ1NameOptions(generateQ1NameOptions(customHerb.name));
            const shuffledOptions = [customHerb.correctProperty, ...customHerb.distractors]
              .sort(() => Math.random() - 0.5);
            setPropertiesOptions(shuffledOptions);
            setGameState("Q1_RECOGNITION");
            showToast("วิเคราะห์รูปภาพสำเร็จแล้ว!", "success");
          } catch (err) {
            console.error(err);
            // Fallback gracefully so the game never crashes
            const fallbackHerb = presetHerbs[Math.floor(Math.random() * presetHerbs.length)];
            setActiveGameHerb(fallbackHerb);
            setQ1NameOptions(generateQ1NameOptions(fallbackHerb.name));
            const shuffledOptions = [fallbackHerb.correctProperty, ...fallbackHerb.distractors]
              .sort(() => Math.random() - 0.5);
            setPropertiesOptions(shuffledOptions);
            setGameState("Q1_RECOGNITION");
            showToast("สแกนภาพสำเร็จ (เชื่อมต่อแบบสแตนอโลน)", "success");
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- ANSWER Q1: WHAT HERB IS THIS? ---
  const handleQ1Submit = () => {
    if (!q1Guess.trim()) {
      showToast("กรุณากรอกคำตอบก่อนส่งนะครับ", "warning");
      return;
    }

    if (!activeGameHerb) return;

    // Check if correct name
    const guessClean = q1Guess.trim().toLowerCase();
    const correctName = activeGameHerb.name.toLowerCase();

    // Lenient match: correct if either contains the key syllables of the herb name
    const isMatch = guessClean.includes(correctName) || correctName.includes(guessClean);

    setIsQ1Correct(isMatch);
    
    if (isMatch) {
      setPhotoScoreEarned(prev => prev + 1);
      showToast("คำตอบถูกต้องเก่งมาก! รับ 1 คะแนน 🎉", "success");
    } else {
      showToast("ชื่อสมุนไพรยังไม่ตรงจุดนะ... มาตอบคำถามกู้คะแนนกัน!", "info");
    }

    setGameState("Q1_RECOGNITION_RESULT");
  };

  // --- ANSWER Q1 FOLLOWUP: WHAT IS THE PROPERTY? ---
  const handleQ1FollowupSubmit = () => {
    if (!selectedPropertyOption) {
      showToast("กรุณาเลือกตัวเลือกสรรพคุณข้อใดข้อหนึ่งครับ", "warning");
      return;
    }

    if (!activeGameHerb) return;

    const correct = selectedPropertyOption === activeGameHerb.correctProperty;
    setIsPropertyCorrect(correct);

    if (correct) {
      // Award partial score for recovery
      setPhotoScoreEarned(prev => prev + 1); // 1 point for property recovery
      showToast("แก้ตัวสำเร็จ! รับ 1 คะแนนสำหรับสรรพคุณเด่น 🌟", "success");
    } else {
      showToast("น่าเสียดาย! ข้อนี้ยังไม่ถูกต้องนะ", "error");
    }

    setGameState("Q1_FOLLOWUP_RESULT");
  };

  // --- ANSWER Q2 TRIVIA ---
  const handleQ2Submit = () => {
    if (!q2SelectedOption) {
      showToast("กรุณาเลือกหนึ่งคำตอบนะครับ", "warning");
      return;
    }

    const correct = q2SelectedOption === q2Data.correctAnswer;
    setIsQ2Correct(correct);

    if (correct) {
      setPhotoScoreEarned(prev => prev + 1);
      showToast("เก่งมาก ตอบถูกข้อที่ 2! 🌿", "success");
    } else {
      showToast("คำตอบข้อ 2 ยังไม่ถูกต้องนะครับ", "error");
    }

    setGameState("Q2_RESULT");
  };

  // --- ANSWER Q3 TRIVIA ---
  const handleQ3Submit = () => {
    if (!q3SelectedOption) {
      showToast("กรุณาเลือกหนึ่งคำตอบนะครับ", "warning");
      return;
    }

    const correct = q3SelectedOption === q3Data.correctAnswer;
    setIsQ3Correct(correct);

    if (correct) {
      setPhotoScoreEarned(prev => prev + 1);
      showToast("ยอดเยี่ยม ตอบถูกข้อที่ 3 ครบเซ็ต! 🎉", "success");
    } else {
      showToast("คำตอบข้อ 3 ยังไม่ถูกต้องนะครับ", "error");
    }

    setGameState("Q3_RESULT");
  };

  // --- FINISH GAME & RECORD SCORE ---
  const handleFinishPhotoGame = async () => {
    try {
      setSavingScore(true);
      if (user) {
        // Record the score permanently to User profile
        await addScore(photoScoreEarned);
        showToast(`บันทึกสำเร็จ! เพิ่มสะสมอีก +${photoScoreEarned} คะแนนลงโปรไฟล์ของคุณเรียบร้อยแล้ว`, "success");
      } else {
        showToast("เล่นโหมดบุคคลทั่วไป: คะแนนจะไม่บันทึกถาวร กรุณาเข้าสู่ระบบ", "info");
      }
      setGameState("SUMMARY");
    } catch (e) {
      console.error(e);
      showToast("ขัดข้องในการบันทึกคะแนนสะสม", "error");
      setGameState("SUMMARY");
    } finally {
      setSavingScore(false);
    }
  };

  // --- ORIGINAL STANDARD QUIZZES RESTART/FLOW ---
  const handleRestartStandard = () => {
    setStandardActiveIdx(0);
    setStandardUserAnswer("");
    setStandardGradeResult(null);
    setStandardCorrectCount(0);
    setStandardFinished(false);
    setStandardGrading(false);
  };

  const handleStandardSubmit = async () => {
    if (!standardUserAnswer.trim()) {
      showToast("กรุณาเลือกตัวเลือกคำตอบก่อนกดยืนยัน", "warning");
      return;
    }
    const currentQuiz = quizzes[standardActiveIdx];
    const associatedHerb = currentQuiz ? getHerb(currentQuiz.herbId) : null;

    try {
      setStandardGrading(true);
      let grade = null;

      if (associatedHerb) {
        try {
          const response = await fetch("/api/gemini/challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: currentQuiz.question,
              userAnswer: standardUserAnswer,
              herbData: associatedHerb
            })
          });

          if (response.ok) {
            grade = await response.json();
          }
        } catch (err) {
          console.warn("API grading fallback to local comparison", err);
        }
      }

      // Fallback local grading if API is unvailable
      if (!grade) {
        const isCorrect = standardUserAnswer.trim().toLowerCase() === currentQuiz.answer.trim().toLowerCase();
        grade = {
          correct: isCorrect,
          score: isCorrect ? 1 : 0,
          correctAnswer: currentQuiz.answer,
          explanation: isCorrect 
            ? (currentQuiz.explanation || "ถูกต้องแล้ว! เป็นคำตอบที่ถูกต้องตามหลักวิชาการสมุนไพรไทย")
            : (currentQuiz.explanation ? `คำตอบที่ถูกต้องคือ "${currentQuiz.answer}" — ${currentQuiz.explanation}` : `คำตอบที่ถูกต้องคือ "${currentQuiz.answer}"`),
          additionalInfo: ""
        };
      }

      setStandardGradeResult(grade);

      if (grade.correct) {
        setStandardCorrectCount((prev) => prev + 1);
        if (user) {
          await addScore(1);
        }
      }
    } catch (e) {
      console.error(e);
      showToast("ล้มเหลวในการตรวจคำตอบ กรุณาลองส่งใหม่อีกครั้ง", "error");
    } finally {
      setStandardGrading(false);
    }
  };

  const handleStandardNext = () => {
    if (standardActiveIdx + 1 < quizzes.length) {
      setStandardActiveIdx((prev) => prev + 1);
      setStandardUserAnswer("");
      setStandardGradeResult(null);
    } else {
      setStandardFinished(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in text-left">
      
      {/* Styles for High-tech Laser Scan overlay */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.3; }
          100% { top: 0%; opacity: 0.8; }
        }
        .animate-scan-line {
          animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Header Info Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🌿 ทดสอบความรู้สมุนไพร</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              เกมสแกนภาพใบพืชและตอบคำถามท้าทายภูมิปัญญาไทย ประจำสวน <span className="font-semibold text-teal-600 dark:text-teal-400">{currentGarden.name}</span>
            </p>
          </div>

          <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3.5 py-1.5 rounded-xl border border-amber-500/15 flex items-center gap-2 text-xs font-bold">
            <Award className="w-4 h-4" />
            <span>ระดับของคุณ: {user ? user.level.toUpperCase() : "บุคคลทั่วไป"} ({user ? user.totalScore : 0} คะแนน)</span>
          </div>
        </div>

        {/* Tab Selection buttons */}
        {/* Mobile Segmented Control (< sm) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-center sm:hidden">
          <button
            onClick={() => {
              handleTabChange("photo");
              handleRestartPhotoGame();
            }}
            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeTab === "photo"
                ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="truncate w-full text-center text-[11px]">เกมภาพถ่าย</span>
          </button>
          
          <button
            onClick={() => {
              handleTabChange("standard");
              handleRestartStandard();
            }}
            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeTab === "standard"
                ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="truncate w-full text-center text-[11px]">แบบทดสอบ</span>
          </button>

          <button
            onClick={() => {
              handleTabChange("certificate");
            }}
            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeTab === "certificate"
                ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            <Award className="w-4 h-4" />
            <span className="truncate w-full text-center text-[11px]">เกียรติบัตร</span>
          </button>
        </div>

        {/* Desktop Tab Bar (>= sm) */}
        <div className="hidden sm:flex border-b border-slate-100 dark:border-slate-800 pt-2 gap-2 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => {
              handleTabChange("photo");
              handleRestartPhotoGame();
            }}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "photo"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>📸 เกมท้าทายด้วยภาพถ่าย</span>
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-sans uppercase animate-pulse">ใหม่</span>
          </button>
          
          <button
            onClick={() => {
              handleTabChange("standard");
              handleRestartStandard();
            }}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "standard"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📝 แบบทดสอบความรู้ทั่วไป</span>
          </button>

          <button
            onClick={() => {
              handleTabChange("certificate");
            }}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "certificate"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>🏅 เกียรติบัตร / พาสปอร์ต</span>
          </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}

      {activeTab === "photo" ? (
        /* ==================== 1. AI PHOTO CHALLENGE GAME ==================== */
        <div className="space-y-6">
          
          {gameState === "IDLE" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xs text-center flex flex-col items-center justify-center gap-4 max-w-lg mx-auto">
              
              <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1 text-center">
                <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">
                  📸 เกมท้าทายด้วยภาพถ่าย AI
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  เลือกภาพสมุนไพรจากเครื่องเพื่อวิเคราะห์และเริ่มแบบทดสอบตอบคำถามสะสมคะแนน
                </p>
              </div>

              {/* Single Upload Button */}
              <div className="w-full max-w-sm pt-2">
                <div className="relative w-full overflow-hidden rounded-xl">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="w-full px-5 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 border border-teal-600 cursor-pointer">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>📁 เลือกรูปภาพจากคลังภาพ / อัลบั้ม</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {gameState === "SCANNING" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-sm space-y-6 flex flex-col items-center">
              <div className="relative w-full max-w-sm h-64 rounded-xl overflow-hidden border border-slate-200 shadow-md">
                <img src={uploadedImage || ""} alt="Scanning" className="w-full h-full object-cover" />
                {/* Visual scanner overlay */}
                <div className="absolute inset-0 bg-teal-500/10 pointer-events-none"></div>
                <div className="absolute left-0 right-0 h-1 bg-teal-500 shadow-lg shadow-teal-500/50 animate-scan-line pointer-events-none"></div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-center items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-base">กำลังประมวลผลวิเคราะห์พันธุ์พืชด้วย AI</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">
                  คอมพิวเตอร์วิทัศน์กำลังตรวจสอบลวดลายขอบใบ การจัดเรียงเส้นใบ และโครงสร้างดอกเทียบเคียงกับคลังภูมิปัญญาสมุนไพรในสวน...
                </p>
              </div>
            </div>
          )}

          {/* Q1: NAME RECOGNITION QUESTION */}
          {gameState === "Q1_RECOGNITION" && activeGameHerb && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                <span>ความก้าวหน้าการท้าทาย</span>
                <span className="text-teal-600 dark:text-teal-400">คำถามข้อที่ 1 จาก 3 (ขั้นระบุชื่อ)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Photo card (5 cols) */}
                <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl shadow-xs">
                  <img src={uploadedImage || ""} alt="Active Herb Challenge" className="w-full h-64 md:h-80 object-cover rounded-xl" />
                  <span className="text-[10px] text-slate-400 font-bold block text-center mt-2.5 uppercase">ภาพพืชอ้างอิงโจทย์</span>
                </div>

                {/* Question panel (7 cols) */}
                <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xs space-y-5">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">คำถามที่ 1 (ถามตอบชื่อสมุนไพร)</span>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-150 leading-relaxed">
                      จากภาพสมุนไพรนี้ มันมีชื่อเรียกว่าอะไรในพจนานุกรมสมุนไพรไทย?
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">เลือกตัวเลือกชื่อสมุนไพรที่ถูกต้องจาก 4 ตัวเลือกด้านล่าง:</label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {(q1NameOptions.length > 0 ? q1NameOptions : [activeGameHerb.name, "ใบบัวบก", "ขิง", "ว่านหางจระเข้"]).map((opt, idx) => {
                        const letters = ["ก.", "ข.", "ค.", "ง."];
                        const isSelected = q1Guess === opt;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setQ1Guess(opt)}
                            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? "border-teal-500 bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 ring-2 ring-teal-500/30"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-teal-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {letters[idx] || idx + 1}
                              </span>
                              <span className="text-xs sm:text-sm font-bold">{opt}</span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-teal-600 bg-teal-600 text-white"
                                  : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleRestartPhotoGame}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ยกเลิก/สแกนใหม่</span>
                    </button>

                    <button
                      onClick={handleQ1Submit}
                      disabled={!q1Guess.trim()}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>ส่งคำตอบประเมิน</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Q1: NAME RECOGNITION RESULT DISPLAY */}
          {gameState === "Q1_RECOGNITION_RESULT" && activeGameHerb && (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                {isQ1Correct ? (
                  <>
                    <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full animate-bounce-slow">
                      <CheckCircle2 className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">เก่งมาก! ตอบถูกอย่างแม่นยำ</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        คุณระบุชื่อสมุนไพรนี้ได้อย่างถูกต้อง นั่นคือ <span className="font-extrabold text-slate-800 dark:text-slate-100">"{activeGameHerb.name}"</span> ({activeGameHerb.scientific}) รับไปเลย <span className="font-bold text-teal-600">+1 คะแนนสะสม</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full">
                      <XCircle className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">ชื่อสมุนไพรยังไม่ตรงจุดอ้างอิง</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        คุณทายชื่อพืชว่า <span className="font-bold text-rose-500">"{q1Guess}"</span> แต่ความจริงพืชนี้คือ <span className="font-extrabold text-slate-800 dark:text-slate-100">"{activeGameHerb.name}"</span> ({activeGameHerb.scientific})
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-extrabold mt-1.5">
                        ⚠️ ผิดคำตอบนี้! แต่ AI ท้าทายสิทธิพิเศษต่อ: "คุณสมบัติ/สรรพคุณของมันคืออะไร?" เพื่อกู้ชีพคะแนนกลับคืนมา!
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-800">
                {isQ1Correct ? (
                  <button
                    onClick={() => setGameState("Q2_TRIVIA")}
                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>ไปทำคำถามข้อที่ 2 ถัดไป</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setGameState("Q1_FOLLOWUP")}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-sm animate-pulse"
                  >
                    <span>👉 เข้าสู่คำถามกู้คะแนนสรรพคุณ (มีตัวเลือก)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          )}

          {/* Q1 FOLLOW-UP (PROPERTIES) QUESTION */}
          {gameState === "Q1_FOLLOWUP" && activeGameHerb && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                <span>กู้ชีพคำตอบที่ 1</span>
                <span className="text-amber-600 dark:text-amber-400">คำถามสรรพคุณเด่น (แบบมีตัวเลือก)</span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">คำถามทดสอบสรรพคุณกู้ชีพคะแนน</span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-150 leading-relaxed">
                    คุณตอบชื่อสมุนไพรผิดไป แต่เพื่อกู้คะแนนคืน คุณรู้หรือไม่ว่า สมุนไพรชนิดนี้ <span className="text-teal-600">"{activeGameHerb.name}"</span> มี 'คุณสมบัติหรือสรรพคุณหลักทางยา' ที่ระบุไว้เด่นชัดที่สุดในข้อใด?
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3.5 pt-2">
                  {propertiesOptions.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                        selectedPropertyOption === opt
                          ? "border-teal-500 bg-teal-500/5 dark:bg-teal-400/5"
                          : "border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="properties_options"
                        checked={selectedPropertyOption === opt}
                        onChange={() => setSelectedPropertyOption(opt)}
                        className="mt-1 accent-teal-600 scale-110 shrink-0"
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 leading-normal">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal max-w-xs sm:max-w-md">
                    * เลือกสรรพคุณที่น่าจะเป็นจุดแข็งที่สุดของต้น "{activeGameHerb.name}" เพื่อผ่านด่านชิงคะแนนบันทึกคืนมา
                  </p>
                  
                  <button
                    onClick={handleQ1FollowupSubmit}
                    disabled={!selectedPropertyOption}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <span>ยืนยันคำตอบสรรพคุณ</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Q1 FOLLOW-UP GRADED RESULT DISPLAY */}
          {gameState === "Q1_FOLLOWUP_RESULT" && activeGameHerb && (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                {isPropertyCorrect ? (
                  <>
                    <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                      <CheckCircle2 className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">กู้ชีพคะแนนสำเร็จแล้ว! 🎉</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        ยอดเยี่ยมมาก! สรรพคุณหลักของต้น <span className="font-extrabold text-teal-600">"{activeGameHerb.name}"</span> คือ <span className="font-extrabold text-slate-800 dark:text-slate-100">"{activeGameHerb.correctProperty}"</span> รับไปเลย <span className="font-bold text-teal-600">+1 คะแนนสะสมกู้ชีพ!</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full">
                      <XCircle className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">ยังไม่ถูกใจในหลักการแพทย์แผนไทย</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        สรรพคุณหลักของพืช <span className="font-extrabold text-slate-800 dark:text-slate-100">"{activeGameHerb.name}"</span> ที่ถูกต้องคือ <span className="font-extrabold text-emerald-600">"{activeGameHerb.correctProperty}"</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1 block">ไม่เป็นไรนะ! เรายังมีอีก 2 คำถามให้คุณพยายามเก็บคะแนนสะสม</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setGameState("Q2_TRIVIA")}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>ไปทำคำถามทั่วไปข้อถัดไป (ข้อ 2 จาก 3)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* QUESTION 2: TRIVIA MULTIPLE CHOICE */}
          {gameState === "Q2_TRIVIA" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                <span>คำถามคลังความรู้สะสม</span>
                <span className="text-teal-600 dark:text-teal-400">คำถามข้อที่ 2 จาก 3</span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">คำถามทั่วไปประจำชุดความรู้</span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-150 leading-relaxed font-sans">
                    {q2Data.question}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3.5 pt-2">
                  {q2Data.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                        q2SelectedOption === opt
                          ? "border-teal-500 bg-teal-500/5 dark:bg-teal-400/5"
                          : "border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="q2_options"
                        checked={q2SelectedOption === opt}
                        onChange={() => setQ2SelectedOption(opt)}
                        className="mt-1 accent-teal-600 scale-110 shrink-0"
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 leading-normal font-sans">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 leading-normal">
                    * ทบทวนความรู้สรรพคุณไพลให้ดีเพื่อเก็บแต้ม
                  </span>
                  
                  <button
                    onClick={handleQ2Submit}
                    disabled={!q2SelectedOption}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <span>ส่งคำตอบข้อที่ 2</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* QUESTION 2: RESULT */}
          {gameState === "Q2_RESULT" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                {isQ2Correct ? (
                  <>
                    <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full animate-bounce-slow">
                      <CheckCircle2 className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">ถูกต้องยอดเยี่ยม! 🎉</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        เก่งมาก! คำตอบคือ <span className="font-extrabold text-slate-800 dark:text-slate-100">"{q2Data.correctAnswer}"</span> ได้รับ <span className="font-bold text-teal-600">+1 คะแนนสะสม</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full">
                      <XCircle className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">ยังไม่ตรงคำตอบอ้างอิงหลักครับ</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        คำตอบที่ถูกต้องตามหลักคือ <span className="font-extrabold text-emerald-600">"{q2Data.correctAnswer}"</span>
                      </p>
                    </div>
                  </>
                )}

                {/* Technical discussion */}
                <div className="w-full bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">อภิปรายโดย AI Companion:</span>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-sans font-medium">
                    {q2Data.explanation}
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setGameState("Q3_TRIVIA")}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>ไปทำคำถามข้อถัดไป (ข้อสุดท้าย 3 จาก 3)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* QUESTION 3: TRIVIA MULTIPLE CHOICE */}
          {gameState === "Q3_TRIVIA" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                <span>คำถามประเมินเกียรติบัตร</span>
                <span className="text-teal-600 dark:text-teal-400">คำถามข้อที่ 3 จาก 3</span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">คำถามข้อสุดท้าย</span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-150 leading-relaxed font-sans">
                    {q3Data.question}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3.5 pt-2">
                  {q3Data.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                        q3SelectedOption === opt
                          ? "border-teal-500 bg-teal-500/5 dark:bg-teal-400/5"
                          : "border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="q3_options"
                        checked={q3SelectedOption === opt}
                        onChange={() => setq3SelectedOption(opt)}
                        className="mt-1 accent-teal-600 scale-110 shrink-0"
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 leading-normal font-sans">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 leading-normal">
                    * ตอบคำถามสุดท้ายให้ถูกต้องเพื่อสรุปคะแนนสะสมบันทึก
                  </span>
                  
                  <button
                    onClick={handleQ3Submit}
                    disabled={!q3SelectedOption}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <span>ส่งคำตอบคำถามสุดท้าย</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* QUESTION 3: RESULT */}
          {gameState === "Q3_RESULT" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                {isQ3Correct ? (
                  <>
                    <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full animate-bounce-slow">
                      <CheckCircle2 className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">ถูกต้องยอดเยี่ยมเป็นที่สุด! 🎉</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        เก่งมาก! คำตอบคือ <span className="font-extrabold text-slate-800 dark:text-slate-100">"{q3Data.correctAnswer}"</span> ได้รับ <span className="font-bold text-teal-600">+1 คะแนนสะสม</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full">
                      <XCircle className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">ยังไม่ถูกต้องตามตำราแพทย์ไทย</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        คำตอบอ้างอิงที่ถูกต้องคือ <span className="font-extrabold text-emerald-600">"{q3Data.correctAnswer}"</span>
                      </p>
                    </div>
                  </>
                )}

                {/* Technical discussion */}
                <div className="w-full bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">อภิปรายโดย AI Companion:</span>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-sans font-medium">
                    {q3Data.explanation}
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleFinishPhotoGame}
                  disabled={savingScore}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-55"
                >
                  {savingScore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังประมวลผลคำนวณและบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <span>🏁 ประมวลผลและดูบทสรุปคะแนน</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* GAME FINAL SUMMARY VIEW */}
          {gameState === "SUMMARY" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-md space-y-6 flex flex-col items-center justify-center animate-fade-in">
              <div className="p-4.5 bg-amber-500/10 text-amber-500 rounded-full animate-bounce-slow">
                <Trophy className="w-16 h-16" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">ยินดีด้วย! คุณทำภารกิจท้าทายครบเซ็ตแล้ว</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  คุณตอบคำถามได้ถูกต้อง <span className="font-extrabold text-teal-600 text-base">{photoScoreEarned}</span> จากด่านคำถามทั้งหมดที่ทำไป
                </p>
              </div>

              {/* Saved Score Profile Info */}
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-750 p-4 rounded-xl w-full max-w-md text-left flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold block uppercase tracking-wide">คะแนนสะสมและบันทึกประวัติ</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-350 block mt-1">
                    ✅ บันทึกเพิ่มสะสม <span className="text-teal-600 font-bold">+{photoScoreEarned} คะแนน</span> ลงโปรไฟล์ของคุณสำเร็จแล้ว!
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    🌟 คะแนนรวมปัจจุบัน: {user ? user.totalScore : "0"} คะแนน (ระดับ: {user ? user.level.toUpperCase() : "บุคคลทั่วไป"})
                  </span>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shrink-0"
                >
                  ดูแดชบอร์ด
                </button>
              </div>

              <div className="flex flex-wrap gap-3.5 justify-center">
                <button
                  onClick={handleRestartPhotoGame}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 font-bold rounded-xl text-sm"
                >
                  ท้าทายใหม่อีกครั้ง
                </button>
                <button
                  onClick={() => navigate("/herbs")}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-sm"
                >
                  🌿 เรียนรู้สมุนไพรเพิ่มเติม
                </button>
              </div>

            </div>
          )}

        </div>
      ) : activeTab === "standard" ? (
        /* ==================== 2. LEGACY TRIVIA GENERAL QUIZZES ==================== */
        <div className="space-y-6">
          {quizzes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 text-center rounded-2xl max-w-md mx-auto space-y-4">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
              <h2 className="text-lg font-bold">ไม่มีรายการแบบทดสอบ</h2>
              <p className="text-xs text-slate-500">สวนพฤกษศาสตร์ของท้องถิ่นนี้ยังไม่มีการจัดตั้งแบบทดสอบความรู้</p>
              <button onClick={() => navigate("/herbs")} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold">
                กลับไปอ่านฐานข้อมูลสมุนไพร
              </button>
            </div>
          ) : (
            <>
              {standardFinished ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-md space-y-6 flex flex-col items-center justify-center">
                  <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full">
                    <Trophy className="w-16 h-16" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">ยินดีด้วย! คุณเรียนรู้แบบทดสอบจบแล้ว</h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      คุณทำคำตอบถูกต้องทั้งหมด <span className="font-extrabold text-teal-600">{standardCorrectCount}</span> จากทั้งหมด <span className="font-bold">{quizzes.length}</span> ข้อทดสอบ
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700 p-4 rounded-xl w-full max-w-sm flex items-center justify-between text-left">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase">คะแนนสะสมโปรไฟล์ทั้งหมดของคุณ</span>
                      <span className="text-sm sm:text-base font-extrabold text-slate-850 dark:text-slate-200">
                        ⭐ {user ? user.totalScore : "0"} คะแนนสะสม
                      </span>
                    </div>
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg"
                    >
                      ดูแดชบอร์ด
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleRestartStandard}
                      className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm"
                    >
                      ทดสอบใหม่อีกครั้ง
                    </button>
                    <button
                      onClick={() => navigate("/herbs")}
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-sm"
                    >
                      เรียนรู้สมุนไพรเพิ่ม
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Progress panel */}
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>คำถามข้อที่ {standardActiveIdx + 1} จาก {quizzes.length}</span>
                      <span className="text-teal-600 dark:text-teal-400">ความก้าวหน้า {Math.round(((standardActiveIdx) / quizzes.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-850 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${((standardActiveIdx) / quizzes.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Question content */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 text-left">
                    
                    {getHerb(quizzes[standardActiveIdx].herbId) && (
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-750">
                        <img src={getHerb(quizzes[standardActiveIdx].herbId)?.images?.[0]} alt="Herb" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">พืชอ้างอิงความรู้</span>
                          <span className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400">🌿 {getHerb(quizzes[standardActiveIdx].herbId)?.thaiName}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-teal-600" />
                        <span>คำถามโจทย์ทดสอบความรู้ทั่วไป</span>
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
                        {quizzes[standardActiveIdx].question}
                      </h2>
                    </div>

                    {!standardGradeResult ? (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                            เลือกตัวเลือกคำตอบที่ถูกต้องที่สุด 1 ข้อจาก 4 ตัวเลือกด้านล่าง:
                          </label>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {(quizzes[standardActiveIdx].options && quizzes[standardActiveIdx].options!.length > 0
                              ? quizzes[standardActiveIdx].options!
                              : [
                                  quizzes[standardActiveIdx].answer,
                                  "ขิงช่วยขับลมและแก้ปวดท้อง",
                                  "ใบบัวบกช่วยสมานแผลและแก้ช้ำใน",
                                  "ไพลช่วยต้านการอักเสบและแก้ปวดเมื่อย"
                                ]
                            ).map((opt, idx) => {
                              const letters = ["ก.", "ข.", "ค.", "ง."];
                              const isSelected = standardUserAnswer === opt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={standardGrading}
                                  onClick={() => setStandardUserAnswer(opt)}
                                  className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-teal-500 bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 ring-2 ring-teal-500/30 shadow-xs"
                                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                                  }`}
                                >
                                  <span
                                    className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? "bg-teal-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    }`}
                                  >
                                    {letters[idx] || idx + 1}
                                  </span>
                                  <span className="text-xs sm:text-sm font-semibold pt-0.5 leading-relaxed flex-1">
                                    {opt}
                                  </span>
                                  <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                      isSelected
                                        ? "border-teal-600 bg-teal-600 text-white"
                                        : "border-slate-300 dark:border-slate-600"
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-between items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm leading-normal">
                            * เลือกตัวเลือกคำตอบแล้วกด "ส่งคำตอบยืนยัน" ระบบจะประเมินคะแนนทันที
                          </p>
                          
                          <button
                            onClick={handleStandardSubmit}
                            disabled={standardGrading || !standardUserAnswer.trim()}
                            className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                          >
                            {standardGrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            <span>{standardGrading ? "กำลังส่งคำตอบ..." : "ส่งคำตอบยืนยัน"}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 animate-fade-in border-t border-slate-100 dark:border-slate-800 pt-5 text-left">
                        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                          standardGradeResult.correct
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/25"
                            : "bg-red-500/10 text-red-800 dark:text-red-400 border-red-500/25"
                        }`}>
                          {standardGradeResult.correct ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                          )}
                          <div className="space-y-1">
                            <span className="text-sm font-extrabold block">
                              {standardGradeResult.correct ? "ถูกต้องยอดเยี่ยม! ได้รับ 1 คะแนน" : "คำตอบยังไม่ตรงจุดอ้างอิง"}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                              คำตอบอ้างอิงหลักที่ถูกต้อง: <span className="font-bold text-slate-700 dark:text-slate-300">"{standardGradeResult.correctAnswer}"</span>
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/25 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">ความเห็นของ AI Grader:</span>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-medium">
                            {standardGradeResult.explanation}
                          </p>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={handleStandardNext}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>{standardActiveIdx + 1 < quizzes.length ? "คำถามข้อถัดไป" : "สรุปผลแบบทดสอบ"}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ==================== 3. CERTIFICATE & PASSPORT ==================== */
        <div className="space-y-6 animate-fade-in text-left">
          {/* Style Injection for Print */}
          <style>{`
            @media print {
              /* Hide all components except print-area */
              body * {
                visibility: hidden !important;
              }
              #print-area, #print-area * {
                visibility: visible !important;
              }
              #print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 2rem !important;
                border: 8px double #d97706 !important; /* amber-600 double border */
                border-radius: 0.5rem !important;
                box-shadow: none !important;
                background: #fffbeb !important; /* amber-50 */
                color: #0f172a !important; /* slate-900 */
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>

          {!user ? (
            <div className="py-20 max-w-sm mx-auto text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">กรุณาเข้าสู่ระบบก่อน</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                คุณจำเป็นต้องเข้าสู่ระบบและมีคะแนนสะสมในระบบ เพื่อดาวน์โหลดและพิมพ์ พาสปอร์ตท่องเที่ยวสวนสมุนไพร หรือ เกียรติบัตรความเชี่ยวชาญ
              </p>
              <button
                onClick={() => navigate("/login")}
                className="w-full px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-sm cursor-pointer"
              >
                เข้าสู่ระบบ / ลงทะเบียน
              </button>
            </div>
          ) : user.totalScore === 0 ? (
            /* User is logged in but has NO points yet */
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-md max-w-lg mx-auto space-y-6 flex flex-col items-center justify-center">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-300 dark:text-slate-600">
                <Award className="w-16 h-16" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-200">คุณยังไม่มีคะแนนสะสมความรู้</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                  เมื่อคุณเล่นเกมท้าทายด้วยภาพถ่ายหรือทำแบบทดสอบผ่านอย่างน้อย <span className="font-bold text-amber-600">1 คะแนน</span> คุณจะปลดล็อกสิทธิ์ในการเปิดรับและพิมพ์ <span className="font-bold text-teal-600">พาสปอร์ตท่องเที่ยวสวนสมุนไพร (Smart Herb Passport)</span> ได้ทันที!
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  *และหากสะสมคะแนนครบ <span className="font-bold text-teal-600">10 คะแนน</span> จะได้รับสิทธิ์อัปเกรดเป็น <span className="font-bold text-amber-600">เกียรติบัตรความรู้อัจฉริยะ (E-Certificate)</span> ระดับสากลขั้นสูงสุด
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => handleTabChange("photo")}
                  className="flex-1 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>สแกนภาพสะสมคะแนน</span>
                </button>
                <button
                  onClick={() => handleTabChange("standard")}
                  className="flex-1 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>ทำแบบทดสอบทั่วไป</span>
                </button>
              </div>
            </div>
          ) : (
            /* User has scores (>0) */
            <div className="space-y-6">
              {/* Header and Controls Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 font-sans">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {user.totalScore < 10 ? (
                      <>
                        <span>📖 พาสปอร์ตท่องเที่ยวสมุนไพร</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                          ระดับต้น (Explorer)
                        </span>
                      </>
                    ) : (
                      <>
                        <span>🏅 เกียรติบัตรความรู้อัจฉริยะ</span>
                        <span className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold">
                          ระดับสูง (Expert)
                        </span>
                      </>
                    )}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {user.totalScore < 10 
                      ? "คุณได้รับพาสปอร์ตท่องเที่ยวสวนสมุนไพร สามารถนำไปสแกนประทับตราหรือพิมพ์สะสมชั่วโมงเรียนรู้พืชท้องถิ่น"
                      : "เกียรติบัตรอิเล็กทรอนิกส์รับรองความเป็นเลิศในการศึกษาพฤกษเวชศาสตร์และภูมิปัญญาเภสัชกรรมไทย"
                    }
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleDownloadImage}
                    disabled={downloading}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 ${downloading ? "animate-bounce" : ""}`} />
                    <span>{downloading ? "กำลังสร้างรูปภาพ..." : `ดาวน์โหลด${user.totalScore < 10 ? "พาสปอร์ต" : "เกียรติบัตร"} (PNG)`}</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์ / บันทึก PDF</span>
                  </button>

                  <button
                    onClick={() => handleShare(user.totalScore < 10 ? "passport" : "cert")}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>แชร์</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {user.totalScore < 10 && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-400 flex items-start gap-2.5 leading-normal font-sans">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">ก้าวถัดไปสู่ "เกียรติบัตรทองคำ"! 🌟</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ขณะนี้คุณมี <span className="font-extrabold text-amber-700 dark:text-amber-300">{user.totalScore} คะแนน</span> ขาดอีกเพียง <span className="font-extrabold text-teal-600 dark:text-teal-400">{10 - user.totalScore} คะแนน</span> เพื่อเลื่อนขั้นไปปลดล็อกใบเกียรติบัตรรับรองความเชี่ยวชาญอัจฉริยะสำเร็จรูปแบบทางการ
                    </p>
                  </div>
                </div>
              )}

              {/* Edit Name and Photo for Certificate / Passport */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
                {/* Left: Name edit */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="w-full sm:w-auto">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                      ชื่อผู้รับบนพาสปอร์ต / เกียรติบัตร:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={editableName}
                        onChange={(e) => setEditableName(e.target.value)}
                        placeholder="พิมพ์ชื่อจริง หรือ ชื่อ-นามสกุล..."
                        className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-60 font-sans"
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>เปลี่ยนชื่อ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Upload Photo Button */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="relative overflow-hidden w-full sm:w-auto">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePassportPhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-500/30">
                      <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>📸 {tempPassportPhoto ? "เปลี่ยนรูปถ่ายพาสปอร์ต (ชั่วคราว)" : "อัปโหลดรูปถ่ายพาสปอร์ต (ชั่วคราว)"}</span>
                    </div>
                  </div>
                  {tempPassportPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempPassportPhoto(null);
                        showToast("ลบรูปถ่ายพาสปอร์ตชั่วคราวเรียบร้อยแล้ว", "info");
                      }}
                      className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-rose-500/30"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>ลบรูปชั่วคราว</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PRINT AREA CONTAINER */}
              <div id="print-area" className="w-full max-w-4xl mx-auto overflow-hidden">
                {user.totalScore < 10 ? (
                  /* ==================== PASSPORT CARD DESIGN ==================== */
                  <div className="bg-slate-900 text-slate-100 border-8 border-amber-500/40 p-6 sm:p-10 rounded-2xl relative shadow-xl overflow-hidden font-sans">
                    {/* Decorative gold flourishes and security patterns */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    
                    {/* Top Passport Headers with official requested emblem logo */}
                    <div className="border-b border-amber-500/20 pb-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <img
                          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpjm_Yo-6e2HgR7GsSNQiGL7q_Y4l-TasybXnDrNZJxw&s=10"
                          alt="ตราสัญลักษณ์ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข"
                          className="h-16 sm:h-20 w-auto object-contain drop-shadow-md rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-amber-400 tracking-wider uppercase font-mono">
                            SMART HERBAL PASSPORT
                          </h3>
                          <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                            พาสปอร์ตท่องเที่ยวและอนุรักษ์พืชสมุนไพรไทย
                          </p>
                          <span className="text-[10px] text-teal-400 font-extrabold block mt-0.5">
                            {currentGarden.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-center sm:text-right bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-500/20">
                        <span className="text-[9px] text-slate-400 block font-mono">PASSPORT NO.</span>
                        <span className="text-xs sm:text-sm font-mono font-black text-amber-400 tracking-wider">
                          {user.userId.replace("USER_", "TH-").substring(0, 10).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Passport Bio Area */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center">
                      
                      {/* Photo slot with upload overlay & official stamp */}
                      <div className="flex flex-col items-center justify-center relative group">
                        <div className="relative p-1 bg-amber-500/30 rounded-xl border-2 border-amber-500/40 w-36 h-36 sm:w-40 sm:h-40 overflow-hidden shadow-lg bg-slate-950">
                          <img 
                            src={passportDisplayPhoto} 
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        
                        {/* Stamp graphic overlay */}
                        <div className="absolute -bottom-2 -right-1 bg-teal-600/90 text-white rounded-full p-2 border-2 border-slate-900 text-[8px] font-extrabold uppercase font-mono tracking-widest flex flex-col items-center justify-center w-16 h-16 shadow-lg rotate-12 select-none">
                          <Leaf className="w-3.5 h-3.5 text-teal-200" />
                          <span>APPROVED</span>
                          <span className="text-[6px] opacity-75">{currentGarden.name.substring(0, 10)}</span>
                        </div>
                      </div>

                      {/* Info fields (NO QR CODE as requested) */}
                      <div className="md:col-span-2 grid grid-cols-2 gap-4 text-left font-mono">
                        <div className="col-span-2 border-b border-slate-800 pb-2">
                          <span className="text-[9px] text-slate-400 block">NAME / ชื่อผู้ถือพาสปอร์ต</span>
                          <span className="text-base font-extrabold text-white font-sans">{user.displayName}</span>
                        </div>

                        <div className="border-b border-slate-800 pb-2">
                          <span className="text-[9px] text-slate-400 block">NATIONALITY / สัญชาติ</span>
                          <span className="text-xs font-extrabold text-slate-200">THAILAND / ไทย</span>
                        </div>

                        <div className="border-b border-slate-800 pb-2">
                          <span className="text-[9px] text-slate-400 block">LEVEL / ระดับเรียนรู้</span>
                          <span className="text-xs font-extrabold text-amber-400 font-sans">
                            {user.totalScore >= 10 ? "EXPERT (ระดับเชี่ยวชาญ)" : "EXPLORER (ระดับต้น)"}
                          </span>
                        </div>

                        <div className="border-b border-slate-800 pb-2">
                          <span className="text-[9px] text-slate-400 block">CURRENT SCORE / คะแนนสะสม</span>
                          <span className="text-xs font-extrabold text-teal-400">⭐ {user.totalScore} คะแนน</span>
                        </div>

                        <div className="border-b border-slate-800 pb-2">
                          <span className="text-[9px] text-slate-400 block">ISSUING AUTHORITY / หน่วยงานออกหนังสือ</span>
                          <span className="text-xs font-bold text-slate-200 font-sans leading-tight">{currentGarden.name}</span>
                        </div>

                        <div className="col-span-2 pt-1 border-b border-slate-800 pb-2">
                          <span className="text-[9px] text-slate-400 block">PASSPORT SERIAL & DATE / รหัสประทับตราพาสปอร์ตดิจิทัล</span>
                          <span className="text-xs font-mono text-amber-400 font-bold block mt-0.5">
                            {currentGarden.gardenId}-PASS-{user.userId.replace("USER_", "").toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-sans">ออก ณ วันที่ {todayString}</span>
                        </div>
                      </div>

                    </div>

                    {/* Passport Bottom Security Line */}
                    <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                      <p className="text-[9px] font-mono text-slate-500 tracking-widest break-all">
                        P&lt;THA{user.displayName.replace(/\s+/g, "").toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;{user.userId.substring(0, 10).toUpperCase()}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* ==================== CERTIFICATE DESIGN ==================== */
                  <div className="w-full bg-amber-50/20 dark:bg-slate-900 border-12 border-double border-amber-500/30 p-8 sm:p-14 rounded-2xl relative shadow-md overflow-hidden text-center text-slate-850 dark:text-slate-100 font-sans">
                    {/* Elegant corner flourishes */}
                    <div className="absolute top-4 left-4 text-amber-500/20 text-3xl font-serif">✥</div>
                    <div className="absolute top-4 right-4 text-amber-500/20 text-3xl font-serif">✥</div>
                    <div className="absolute bottom-4 left-4 text-amber-500/20 text-3xl font-serif">✥</div>
                    <div className="absolute bottom-4 right-4 text-amber-500/20 text-3xl font-serif">✥</div>

                    <div className="space-y-6 max-w-2xl mx-auto">
                      {/* Top Emblem Logo requested by user */}
                      <div className="flex justify-center mb-1">
                        <img
                          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpjm_Yo-6e2HgR7GsSNQiGL7q_Y4l-TasybXnDrNZJxw&s=10"
                          alt="ตราสัญลักษณ์ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข"
                          className="h-20 sm:h-24 w-auto object-contain drop-shadow-xs rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Certificate Header */}
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="space-y-1">
                          <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tracking-wider block">
                            ใบเกียรติบัตรรับรองความรู้สมุนไพรดิจิทัล
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">
                            โครงการต่อยอด 1 อปท. 1 สวนสมุนไพร เฉลิมพระเกียรติฯ
                          </span>
                          <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 block">
                            {currentGarden.name}
                          </span>
                        </div>
                      </div>

                      {/* Presentation text */}
                      <div className="space-y-3 pt-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</span>
                        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white border-b border-slate-200/50 pb-2 max-w-md mx-auto">
                          {user.displayName}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
                          ได้สำเร็จหลักสูตรศึกษาระดับพฤกษศาสตร์สมุนไพรอัจฉริยะ ผ่านการเรียนรู้พืชพรรณพฤกษเวชศาสตร์และการทดสอบประเมินคำตอบด้วยระบบตรวจข้อสอบปัญญาประดิษฐ์ มีคะแนนสะสมความรู้ยอดเยี่ยมตามมาตรฐานที่กำหนด
                        </p>
                      </div>

                      {/* Signatures and Certificate Details (Pure Thai, No fake QR code) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 items-end font-sans">
                        
                        {/* Official Signatures */}
                        <div className="space-y-1 flex flex-col items-center text-center">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">พว.อาบทิพย์ เพ็ชรสกุล</span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-tight block">หัวหน้าศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข</span>
                        </div>

                        {/* Certificate Serial & Date Details */}
                        <div className="space-y-1 text-center sm:text-right">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold">รหัสเกียรติบัตร</span>
                          <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold block">
                            {currentGarden.gardenId}-CERT-{user.userId.replace("USER_", "").toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block pt-1">
                            ให้ไว้ ณ วันที่ 26 กรกฎาคม 2569
                          </span>
                        </div>

                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* Legal Notice */}
              <div className="max-w-4xl mx-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5 font-sans">
                <Shield className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-normal">
                  <span className="font-bold text-slate-700 dark:text-slate-200">ระบบตรวจสอบอ้างอิงความมั่นคงปลอดภัย (Security Verification)</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    เอกสารรับรองดิจิทัลและหนังสือคนเดินทางพฤกษเวชศาสตร์ทุกฉบับ มีรหัสทะเบียนเฉพาะตัวกำกับแบบเข้ารหัสความปลอดภัย เจ้าหน้าที่ฝ่ายส่งเสริมสาธารณสุขทางเลือก โรงพยาบาล หรือองค์กรปกครองส่วนท้องถิ่น (อปท.) สามารถอ้างอิงฐานข้อมูลของสวนสมุนไพร เพื่อสแกนตรวจสอบการรับวุฒิบัตรจริงได้ตลอดเวลา
                  </p>
                </div>
              </div>

              {/* Leaderboard Rankings (Show after certificate is issued) */}
              <div className="max-w-4xl mx-auto pt-6 space-y-4 text-left border-t border-slate-100 dark:border-slate-800 mt-6 print:hidden">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>🏆 ทำเนียบเกียรติยศและอันดับผู้เรียนดีเด่น</span>
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" title="อัปเดตแบบเรียลไทม์"></span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    แสดงอันดับคะแนนเทียบเคียงกับผู้เรียนดีเด่นทั้งหมดในเขตพื้นที่บริการของสวนสมุนไพร
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-5 py-3.5 text-left w-16">อันดับ</th>
                          <th className="px-5 py-3.5 text-left">ชื่อผู้ร่วมเรียนรู้</th>
                          <th className="px-5 py-3.5 text-center">ระดับ</th>
                          <th className="px-5 py-3.5 text-right pr-6">คะแนนรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {rankingList.map((rankUser) => (
                          <tr
                            key={rankUser.displayName}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                              rankUser.isCurrentUser ? "bg-teal-600/5 dark:bg-teal-400/5 font-bold" : ""
                            }`}
                          >
                            <td className="px-5 py-4 font-bold text-slate-850 dark:text-slate-200">
                              {rankUser.rank === 1 ? "🥇 1" : rankUser.rank === 2 ? "🥈 2" : rankUser.rank === 3 ? "🥉 3" : rankUser.rank}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={rankUser.photoURL}
                                  alt={rankUser.displayName}
                                  className="w-8 h-8 rounded-full border border-slate-200/50 bg-white shrink-0"
                                />
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-slate-900 dark:text-slate-200">
                                    {rankUser.displayName}
                                  </span>
                                  {rankUser.isCurrentUser && (
                                    <span className="ml-2 text-[9px] font-extrabold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-500/10">
                                      คุณเอง
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                rankUser.totalScore >= 10 
                                  ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400" 
                                  : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}>
                                {rankUser.totalScore >= 10 ? "Expert" : "Explorer"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right pr-6 font-extrabold text-teal-600 dark:text-teal-400">
                              ⭐ {rankUser.totalScore} คะแนน
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Challenge;
