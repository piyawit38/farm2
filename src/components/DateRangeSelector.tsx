import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, RotateCcw, Filter, Check, X } from "lucide-react";

export type DatePreset = "today" | "7days" | "30days" | "yearToDate" | "all" | "custom";

export interface DateRange {
  preset: DatePreset;
  startDate: string; // YYYY-MM-DD or ""
  endDate: string;   // YYYY-MM-DD or ""
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };

  const getDateDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  const handleSelectPreset = (preset: DatePreset) => {
    const today = getTodayStr();

    if (preset === "today") {
      onChange({ preset, startDate: today, endDate: today });
      setIsOpen(false);
    } else if (preset === "7days") {
      onChange({ preset, startDate: getDateDaysAgoStr(7), endDate: today });
      setIsOpen(false);
    } else if (preset === "30days") {
      onChange({ preset, startDate: getDateDaysAgoStr(30), endDate: today });
      setIsOpen(false);
    } else if (preset === "yearToDate") {
      onChange({ preset, startDate: "2026-08-01", endDate: today });
      setIsOpen(false);
    } else if (preset === "all") {
      onChange({ preset, startDate: "", endDate: "" });
      setIsOpen(false);
    } else {
      onChange({ ...value, preset: "custom" });
      // Keep open so user can pick start and end dates
    }
  };

  const currentYearBE = new Date().getFullYear() + 543;

  const getPresetLabel = () => {
    switch (value.preset) {
      case "today":
        return "วันนี้";
      case "7days":
        return "7 วันล่าสุด";
      case "30days":
        return "30 วันล่าสุด";
      case "yearToDate":
        return `ปีนี้ (${currentYearBE})`;
      case "all":
        return "สะสมทั้งหมด";
      case "custom":
        if (value.startDate || value.endDate) {
          return `${value.startDate || "..."} ถึง ${value.endDate || "..."}`;
        }
        return "ระบุวันเอง";
      default:
        return "30 วันล่าสุด";
    }
  };

  const options: { id: DatePreset; label: string; icon: string }[] = [
    { id: "30days", label: "30 วันล่าสุด (รายเดือน)", icon: "🗓️" },
    { id: "today", label: "วันนี้", icon: "⚡" },
    { id: "7days", label: "7 วันล่าสุด", icon: "📊" },
    { id: "yearToDate", label: `ปีนี้ (${currentYearBE}-ปัจจุบัน)`, icon: "📅" },
    { id: "all", label: "สะสมทั้งหมด", icon: "🌐" },
    { id: "custom", label: "ระบุวันเอง...", icon: "🔍" },
  ];

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Space-saving Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group"
      >
        <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
        <span>ดูสถิติตามช่วงเวลา:</span>
        <span className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 font-black text-xs">
          {getPresetLabel()}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-3 space-y-3 animate-fade-in text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 px-1">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              เลือกช่วงเวลาสถิติ
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Options List */}
          <div className="space-y-1">
            {options.map((opt) => {
              const isSelected = value.preset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPreset(opt.id)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          {value.preset === "custom" && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block">วันที่เริ่มต้น:</span>
                <input
                  type="date"
                  value={value.startDate}
                  onChange={(e) => onChange({ ...value, preset: "custom", startDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium dark:text-white focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block">ถึงวันที่:</span>
                <input
                  type="date"
                  value={value.endDate}
                  onChange={(e) => onChange({ ...value, preset: "custom", endDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium dark:text-white focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full mt-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-all"
              >
                ตกลง
              </button>
            </div>
          )}

          {/* Reset button */}
          {value.preset !== "all" && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => handleSelectPreset("all")}
                className="text-[11px] font-extrabold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer transition-colors p-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>รีเซ็ตเป็นสะสมทั้งหมด</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

