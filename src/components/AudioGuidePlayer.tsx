import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Pause, Play, RotateCcw, Sliders, Sparkles, Activity } from "lucide-react";

interface AudioGuidePlayerProps {
  herbName: string;
  localName?: string;
  scientificName?: string;
  family?: string;
  description: string;
  properties: string[];
  usage: string;
  precautions: string;
  className?: string;
}

export const AudioGuidePlayer: React.FC<AudioGuidePlayerProps> = ({
  herbName,
  localName,
  scientificName,
  family,
  description,
  properties,
  usage,
  precautions,
  className = ""
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.85); // Default slightly slower for clarity (ผู้สูงอายุ)
  const [readMode, setReadMode] = useState<"full" | "properties" | "precautions">("full");
  const [currentText, setCurrentText] = useState<string>("");
  const [supported, setSupported] = useState<boolean>(true);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setSupported(false);
    }
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Construct text based on chosen read mode
  const getSpeechText = (mode: "full" | "properties" | "precautions") => {
    const alias = localName && localName !== herbName ? `หรือเรียกว่า ${localName}` : "";
    const sci = scientificName ? `มีชื่อวิทยาศาสตร์ว่า ${scientificName}` : "";
    const fam = family ? `อยู่ในวงศ์ ${family}` : "";

    if (mode === "properties") {
      return `สรรพคุณและวิธีใช้ของ ${herbName} สรรพคุณคือ ${properties.join(", ")} วิธีใช้คือ ${usage}`;
    }

    if (mode === "precautions") {
      return `ข้อควรระวังสำคัญสำหรับ ${herbName} คือ ${precautions}`;
    }

    // Default Full text
    return `
      ข้อมูลสมุนไพร ${herbName} ${alias} ${sci} ${fam}
      ลักษณะทั่วไป: ${description}
      สรรพคุณสำคัญ: ${properties.join(", ")}
      วิธีใช้: ${usage}
      ข้อควรระวังความปลอดภัย: ${precautions}
    `.trim();
  };

  const handlePlay = (modeOverride?: "full" | "properties" | "precautions") => {
    if (!supported) return;

    const modeToUse = modeOverride || readMode;

    if (isPaused && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = getSpeechText(modeToUse);
    setCurrentText(textToSpeak);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "th-TH";
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(v => v.lang.startsWith("th") || v.lang.includes("TH") || v.lang.includes("th"));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (window.speechSynthesis && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isPlaying || isPaused) {
      handleStop();
      // Small timeout to restart with new rate seamlessly
      setTimeout(() => {
        handlePlay();
      }, 150);
    }
  };

  if (!supported) {
    return (
      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl text-xs">
        ⚠️ อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับระบบอ่านออกเสียงอัตโนมัติ (Web Speech API)
      </div>
    );
  }

  return (
    <div
      id="audio-guide-player"
      className={`bg-emerald-950 text-white rounded-2xl p-5 shadow-lg border border-emerald-800/60 relative overflow-hidden ${className}`}
    >
      {/* Background Decorative Gradient Wave */}
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-800/80 rounded-xl text-emerald-300 shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm sm:text-base text-emerald-100">
                🔊 เสียงบรรยาย Audio Guide
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-800/90 text-emerald-300 text-[10px] font-extrabold tracking-wide">
                เพื่อผู้สูงอายุและผู้พิการสายตา
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/80">
              กดฟังเสียงอ่านสรรพคุณและวิธีใช้สมุนไพร {herbName} ภาษาไทย
            </p>
          </div>
        </div>

        {/* Audio Waves Animation when active */}
        {isPlaying && (
          <div className="flex items-center gap-1 bg-emerald-900/80 px-3 py-1.5 rounded-full border border-emerald-700/60">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-300">กำลังเปิดเสียงอ่าน...</span>
            <div className="flex items-end gap-0.5 h-3 ml-1">
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2" style={{ animationDelay: "0ms" }}></span>
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3" style={{ animationDelay: "150ms" }}></span>
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="mt-4 space-y-4">
        {/* Playback Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isPlaying && !isPaused && (
              <button
                onClick={() => handlePlay()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>เล่นเสียงบรรยาย (ฟังทั้งหมด)</span>
              </button>
            )}

            {isPlaying && (
              <button
                onClick={handlePause}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer min-h-[44px]"
              >
                <Pause className="w-4 h-4 fill-slate-950" />
                <span>พักเสียงชั่วคราว</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={() => handlePlay()}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>ฟังต่อ</span>
              </button>
            )}

            {(isPlaying || isPaused) && (
              <button
                onClick={handleStop}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-all cursor-pointer min-h-[44px]"
              >
                <VolumeX className="w-4 h-4" />
                <span>หยุดเล่น</span>
              </button>
            )}
          </div>

          {/* Speed Selector (0.7x, 0.85x, 1.0x, 1.25x) */}
          <div className="flex items-center gap-1.5 bg-emerald-900/60 p-1 rounded-xl border border-emerald-800">
            <span className="text-[10px] text-emerald-300 font-bold px-2 flex items-center gap-1">
              <Sliders className="w-3 h-3" />
              <span>ความเร็ว:</span>
            </span>
            {[
              { rate: 0.7, label: "0.7x ช้ามาก" },
              { rate: 0.85, label: "0.85x เหมาะแก่ผู้สูงอายุ" },
              { rate: 1.0, label: "1.0x ปกติ" }
            ].map((item) => (
              <button
                key={item.rate}
                onClick={() => handleRateChange(item.rate)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer min-h-[36px] ${
                  speechRate === item.rate
                    ? "bg-emerald-400 text-slate-950 font-black shadow-xs"
                    : "text-emerald-200 hover:bg-emerald-800/60"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Filter Play Mode Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-900/80">
          <span className="text-[11px] font-bold text-emerald-300/80">โหมดการฟังเร็ว:</span>
          <button
            onClick={() => {
              setReadMode("properties");
              handlePlay("properties");
            }}
            className="px-3 py-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white rounded-lg text-xs font-medium border border-emerald-700/50 transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>💊 ฟังเฉพาะสรรพคุณและวิธีใช้</span>
          </button>
          <button
            onClick={() => {
              setReadMode("precautions");
              handlePlay("precautions");
            }}
            className="px-3 py-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white rounded-lg text-xs font-medium border border-emerald-700/50 transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px]"
          >
            <span>⚠️ ฟังเฉพาะข้อควรระวัง</span>
          </button>
        </div>

        {/* Live Subtitle Card */}
        {(isPlaying || isPaused) && currentText && (
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-emerald-700/50 text-emerald-100 text-xs sm:text-sm leading-relaxed animate-fade-in">
            <span className="text-[10px] font-extrabold text-emerald-400 block mb-1">
              📜 ข้อความที่กำลังอ่านออกเสียงขณะนี้:
            </span>
            <p className="font-medium text-emerald-200">{currentText}</p>
          </div>
        )}
      </div>
    </div>
  );
};
