import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGarden } from "../contexts/GardenContext";
import { useToast } from "../contexts/ToastContext";
import { Camera, Upload, RefreshCw, AlertCircle, Sparkles, Check, ChevronRight, Leaf, Volume2, VolumeX } from "lucide-react";
import { incrementScanCount } from "../services/db";

interface VisionResult {
  identifiedName: string;
  scientificName: string;
  confidence: number;
  matchedHerbId: string | null;
  similarHerbs: string[];
  analysisText: string;
}

export const Vision: React.FC = () => {
  const { currentGarden, getGardenHerbs } = useGarden();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakResult = () => {
    if (!result) return;
    if (!("speechSynthesis" in window)) {
      showToast("เบราว์เซอร์นี้ไม่รองรับระบบอ่านออกเสียง", "warning");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const textToSpeak = `
        ผลการวิเคราะห์สมุนไพรโดยเอไอ ต้นนี้คือ ${result.identifiedName}
        มีชื่อวิทยาศาสตร์ว่า ${result.scientificName}
        ระดับความแม่นยำ ${result.confidence} เปอร์เซ็นต์
        คำอธิบาย: ${result.analysisText}
      `.trim();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "th-TH";
      utterance.rate = 0.85; // Slower rate for accessibility

      if ("speechSynthesis" in window) {
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.lang.startsWith("th") || v.lang.includes("TH") || v.lang.includes("th"));
        if (thaiVoice) {
          utterance.voice = thaiVoice;
        }
      }
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      showToast("กำลังอ่านออกเสียงผลการวิเคราะห์ด้วยภาษาไทย", "info");
    }
  };



  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setResult(null);
          analyzeImage(event.target.result as string, file.type);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Payload: string, mimeType: string) => {
    try {
      setAnalyzing(true);
      const herbsList = getGardenHerbs();

      const response = await fetch("/api/gemini/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Payload,
          mimeType,
          gardenName: currentGarden.name,
          herbsList
        })
      });

      if (!response.ok) {
        throw new Error("ระบบวิเคราะห์ขัดข้องชั่วคราว");
      }

      const data: VisionResult = await response.json();
      setResult(data);
      incrementScanCount();
      showToast("วิเคราะห์ภาพสำเร็จอัจฉริยะ!", "success");
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "ไม่สามารถวิเคราะห์สมุนไพรได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const resetScanner = () => {
    setImageSrc(null);
    setResult(null);
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Title block */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>📷 AI วิเคราะห์ภาพสมุนไพร</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          ถ่ายรูปหรืออัปโหลดรูปพืชพรรณเพื่อตรวจหาว่าตรงกับสมุนไพรชนิดใดในสวน <span className="font-semibold text-teal-600 dark:text-teal-400">{currentGarden.name}</span> ด้วยขุมพลัง AI วิเคราะห์สายพันธุ์
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Upload Zone (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Input สำหรับเลือกรูปภาพจากอัลบั้มหรือไฟล์ */}
          <input
            type="file"
            id="herb-image-upload"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          {!imageSrc ? (
            /* Upload and Live selection card */
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center gap-5 transition-all hover:border-teal-500/30">
                <div className="p-4 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-full">
                  <Camera className="w-10 h-10 text-teal-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">วิเคราะห์รูปภาพสมุนไพรด้วย AI</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mx-auto">
                    เลือกรูปภาพสมุนไพรจากคลังภาพ อัลบั้ม หรือถ่ายภาพเพื่อตรวจหาสายพันธุ์ สรรพคุณ และข้อมูลทางพฤกษศาสตร์ด้วยโมเดล AI ทันที
                  </p>
                </div>
                
                {/* Single high quality button */}
                <div className="w-full max-w-sm pt-2">
                  <div className="relative w-full overflow-hidden rounded-xl">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-full px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-teal-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-teal-600">
                      <Upload className="w-4 h-4 shrink-0" />
                      <span>📁 เลือกรูปภาพจากคลังภาพ / อัลบั้ม</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Active preview zone */
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm relative">
              <img src={imageSrc} alt="ภาพสมุนไพรที่เลือก" className="w-full h-80 sm:h-[420px] object-cover" />
              
              {/* Overlay states */}
              {analyzing && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-teal-400" />
                  <div className="text-center space-y-1">
                    <p className="font-bold text-base tracking-wide">กำลังประมวลผลรูปภาพด้วย AI</p>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      โปรดรอสักครู่ ระบบคอมพิวเตอร์วิทัศน์กำลังจับคู่ลักษณะใบ ดอก และผลกับพืชพรรณในสวน...
                    </p>
                  </div>
                </div>
              )}

              {/* Clear button */}
              {!analyzing && (
                <button
                  onClick={resetScanner}
                  className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-xs text-white hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>เลือกรูปภาพใหม่</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Right Side: Scan Analysis Result (5 Columns) */}
        <div className="lg:col-span-5">
          
          {result ? (
            /* Analysis Display */
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400">
                    <Sparkles className="w-3.5 h-3.5 fill-teal-500/10" />
                    ผลการวิเคราะห์โดยปัญญาประดิษฐ์
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                    🌿 {result.identifiedName}
                  </h2>
                  <p className="text-xs font-mono italic text-slate-500 dark:text-slate-400">
                    {result.scientificName}
                  </p>
                </div>

                {/* TTS Audio Guide button */}
                <button
                  onClick={handleSpeakResult}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 border min-h-[44px] cursor-pointer ${
                    isSpeaking
                      ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 animate-pulse"
                      : "bg-emerald-900 text-emerald-100 border-emerald-700 hover:bg-emerald-800"
                  }`}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
                  <span>{isSpeaking ? "หยุดเสียงบรรยาย" : "🔊 ฟังเสียงบรรยายภาษาไทย"}</span>
                </button>
              </div>

              {/* Confidence Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>ความแม่นยำในการคาดการณ์</span>
                  <span className="text-teal-600 dark:text-teal-400">{result.confidence}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${result.confidence}%` }}
                  ></div>
                </div>
              </div>

              {/* Botanical Analysis text details */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400 dark:text-slate-500 block">
                  คำอธิบายทางกายภาพและพฤกษศาสตร์:
                </span>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                  {result.analysisText}
                </p>
              </div>

              {/* Matched Database Link */}
              {result.matchedHerbId ? (
                <div className="p-4 rounded-xl bg-teal-600/5 dark:bg-teal-400/5 border border-teal-500/15 flex items-center justify-between text-left">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block">พบต้นไม้พันธุ์นี้ในสวน!</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      มีบอร์ดป้ายชื่อเรียนรู้ในระบบ
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/herbs/${result.matchedHerbId}`)}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    ดูข้อมูลพืช
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5 text-left">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">ไม่พบข้อมูลในสวนหลัก</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      ขออภัยด้วยครับ พืชสมุนไพรชนิดนี้ยังไม่ได้เพาะปลูกในสวน <span className="font-semibold text-slate-700 dark:text-slate-300">{currentGarden.name}</span> ขณะนี้
                    </p>
                  </div>
                </div>
              )}

              {/* Similar plants list */}
              {result.similarHerbs && result.similarHerbs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400 dark:text-slate-500 block">
                    สายพันธุ์ใกล้เคียงหรือสับสนได้ง่าย:
                  </span>
                  <div className="flex flex-col gap-2">
                    {result.similarHerbs.map((sh, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="text-teal-500">🌿</span>
                        <span>{sh}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Standby State */
            <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-600 dark:text-slate-400">รอรับข้อมูลประมวลผล</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-500 max-w-xs leading-normal mx-auto">
                  เมื่อคุณเลือกถ่ายภาพสมุนไพรหรือใช้ตัวอย่างใบไม้ ผลลัพธ์วิเคราะห์สายพันธุ์จะแสดงขึ้นที่นี่ทันที
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
export default Vision;
