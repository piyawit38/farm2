import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGarden } from "../contexts/GardenContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getUsers, getVisitorCount, incrementVisitorCount, getStatsDateRange, getScanCount, getChatCount, formatThaiDate } from "../services/db";
import { DateRangeSelector, DateRange } from "../components/DateRangeSelector";
import { Herb } from "../types";
import { 
  Leaf, 
  HelpCircle, 
  Trophy, 
  Award, 
  Info, 
  Sparkles, 
  Search, 
  ArrowRight, 
  Calendar, 
  Camera, 
  MessageSquare, 
  Eye, 
  X, 
  BookOpen, 
  MapPin, 
  Star,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal
} from "lucide-react";

export const Home: React.FC = () => {
  const { currentGarden, getGardenHerbs, getGardenQuizzes, getGardenAnnouncements } = useGarden();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showSampleCertModal, setShowSampleCertModal] = useState(false);
  const [sampleType, setSampleType] = useState<"cert" | "passport">("cert");
  const [searchQuery, setSearchQuery] = useState("");

  const herbs = getGardenHerbs();
  const quizzes = getGardenQuizzes();

  // Helper for plot location fallback
  const getDisplayLocation = (herbData: Partial<Herb>) => {
    const loc = herbData.location?.trim() || "";
    if (loc.includes("แปลงที่ 2") || loc.includes("แปลง 2")) return "แปลงสมุนไพร แปลงที่ 2";
    if (loc.includes("แปลงที่ 1") || loc.includes("แปลง 1")) return "แปลงสมุนไพร แปลงที่ 1";
    const idStr = herbData.herbId || herbData.thaiName || "1";
    let charSum = 0;
    for (let i = 0; i < idStr.length; i++) charSum += idStr.charCodeAt(i);
    const plotNum = (charSum % 2) + 1;
    return `แปลงสมุนไพร แปลงที่ ${plotNum}`;
  };

  // Date range state for real telemetry statistics
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: "all",
    startDate: "",
    endDate: ""
  });
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    incrementVisitorCount(currentGarden.gardenId);
  }, [currentGarden.gardenId]);

  useEffect(() => {
    const handleSync = () => setDataVersion(prev => prev + 1);
    window.addEventListener("db_synced", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("stats_cleared", handleSync);
    return () => {
      window.removeEventListener("db_synced", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("stats_cleared", handleSync);
    };
  }, []);

  const registeredUsersCount = getUsers().length;
  const totalVisits = getVisitorCount(currentGarden.gardenId, dateRange.startDate, dateRange.endDate);
  const totalScans = getScanCount(currentGarden.gardenId, dateRange.startDate, dateRange.endDate);
  const totalChats = getChatCount(currentGarden.gardenId, dateRange.startDate, dateRange.endDate);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/herbs?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/herbs");
    }
  };

  const getDateRangeLabel = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return getStatsDateRange(currentGarden.gardenId).rangeText;
    }
    const startThai = dateRange.startDate ? formatThaiDate(dateRange.startDate) : "เริ่มต้น";
    const endThai = dateRange.endDate ? formatThaiDate(dateRange.endDate) : "ปัจจุบัน";
    return `ข้อมูลช่วง ${startThai} ถึง ${endThai}`;
  };

  // Grab Services Grid Items
  const grabServices = [
    { title: "คลังสมุนไพร", subtitle: "สำรวจพืชพรรณ", path: "/herbs", icon: Leaf, color: "bg-[#00B14F] text-white" },
    { title: "สแกนพืช AI", subtitle: "ถ่ายภาพวิเคราะห์", path: "/vision", icon: Camera, color: "bg-sky-500 text-white" },
    { title: "หมอพฤกษา AI", subtitle: "ปรึกษาอาการโรค", path: "/chatbot", icon: MessageSquare, color: "bg-amber-500 text-white" },
    { title: "แบบทดสอบ", subtitle: "สะสมแต้มความรู้", path: "/challenge", icon: Award, color: "bg-indigo-500 text-white" },
    { title: "จัดอันดับ", subtitle: "ลีดเดอร์บอร์ด", path: "/leaderboard", icon: Trophy, color: "bg-purple-500 text-white" },
    { title: "เกียรติบัตร", subtitle: "วุฒิบัตรดิจิทัล", path: "/certificate", icon: ShieldCheck, color: "bg-rose-500 text-white" },
    { title: "แผนที่แปลง", subtitle: "พิกัดแปลงที่ 1 - 2", path: "/herbs", icon: MapPin, color: "bg-teal-600 text-white" },
    { title: "เกี่ยวกับเรา", subtitle: "1 อปท. 1 สวน", path: "/about", icon: Info, color: "bg-slate-700 text-white" },
  ];

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-6">
      
      {/* 1. Grab Superapp Header & Search Bar Bar */}
      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        
        {/* Top Location Bar */}
        <div className="flex items-center justify-between text-xs font-bold gap-2">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#00B14F] animate-pulse"></span>
            <span className="text-slate-400 font-medium">ตำแหน่งปัจจุบัน:</span>
            <span className="text-slate-900 dark:text-white font-extrabold truncate max-w-[220px] sm:max-w-none">
              📍 {currentGarden.name}
            </span>
          </div>
          <Link to="/dashboard" className="text-[#00B14F] hover:underline flex items-center gap-0.5 text-[11px] font-extrabold shrink-0">
            <span>ดูประวัติ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Grab Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาสมุนไพร, สรรพคุณ, โรคที่รักษา..."
            className="w-full pl-11 pr-24 py-3 bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 font-semibold rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00B14F] border border-transparent transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-4 py-1.5 bg-[#00B14F] hover:bg-[#009643] text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            ค้นหา
          </button>
        </form>

      </div>

      {/* 2. Grab Superapp Services Grid (8 Iconic Quick Action Badges) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00B14F]"></span>
            บริการยอดนิยม (Services)
          </span>
          <span className="text-[11px] font-bold text-slate-400">1 อปท. 1 สวนสมุนไพร</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
          {grabServices.map((service, idx) => {
            const Icon = service.icon;
            return (
              <Link
                key={idx}
                to={service.path}
                className="flex flex-col items-center justify-center text-center group cursor-pointer"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${service.color} flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-2 leading-tight group-hover:text-[#00B14F] transition-colors">
                  {service.title}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5 hidden sm:block">
                  {service.subtitle}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Grab Hero Promo Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#00B14F] via-[#009E46] to-[#00873C] text-white p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>เรียนรู้สมุนไพรไทยดิจิทัล</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
              ค้นพบคุณค่าสมุนไพรไทย <br />
              <span className="text-amber-200">ผ่านระบบผู้ช่วย AI อัจฉริยะ</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-medium">
              สแกนภาพถ่าย AI, สนทนากับหมอพฤกษา AI และร่วมทำแบบทดสอบเพื่อรับเกียรติบัตรและพาสปอร์ตดิจิทัล ณ {currentGarden.name}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Link
                to="/herbs"
                className="px-5 py-2.5 bg-white text-[#00B14F] hover:bg-emerald-50 font-extrabold rounded-full text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>เข้าสู่คลังสมุนไพร</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Municipal Badges */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col items-center text-center gap-2 shrink-0 self-stretch justify-center">
            <div className="flex items-center gap-2">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYtvMROhAk-78kqt5ystTJDn8bZTnBvUjDzaiZy2dcVnzi0XvL6stUWUac&s=10"
                alt="ตรา 1"
                referrerPolicy="no-referrer"
                className="w-10 h-10 object-contain"
              />
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7hdvnlQyEc-QTzRaPmQiqPELTto5wAR1F4b3ueUBHpQ&s=10"
                alt="ตรา 2"
                referrerPolicy="no-referrer"
                className="w-10 h-10 object-contain"
              />
            </div>
            <span className="text-[10px] text-emerald-100 font-bold max-w-[160px] leading-tight">
              ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข
            </span>
          </div>
        </div>
      </div>

      {/* 4. Grab Food-Style Horizontal Scroll: Recommended Herbs ("สมุนไพรเด่นประจำวัน") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Leaf className="w-5 h-5 text-[#00B14F]" />
              <span>สมุนไพรแนะนำในสวน (Popular Herbs)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              คลิกเพื่อดูสรรพคุณทางยา ตำรับยา และพิกัดแปลงปลูก
            </p>
          </div>
          <Link to="/herbs" className="text-xs font-extrabold text-[#00B14F] hover:underline flex items-center gap-1">
            <span>ดูทั้งหมด ({herbs.length})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Horizontal Carousel */}
        <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
          {herbs.slice(0, 8).map((herb) => (
            <Link
              key={herb.herbId}
              to={`/herbs/${herb.herbId}`}
              className="snap-start shrink-0 w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md hover:border-[#00B14F]/40 transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Herb Image with Location Tag */}
                <div className="relative h-36 sm:h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={herb.imageUrl}
                    alt={herb.thaiName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-black rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#00B14F]" />
                    <span>{getDisplayLocation(herb)}</span>
                  </div>
                  {herb.family && (
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-white/90 dark:bg-slate-900/90 text-[#00B14F] text-[10px] font-extrabold rounded-lg shadow-xs">
                      {herb.family}
                    </div>
                  )}
                </div>

                {/* Body Details */}
                <div className="p-3.5 space-y-1.5 text-left">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-[#00B14F] transition-colors">
                    {herb.thaiName}
                  </h3>
                  {herb.scientificName && (
                    <p className="text-xs font-serif italic text-teal-800 dark:text-teal-400 font-bold truncate">
                      {herb.scientificName}
                    </p>
                  )}
                  {herb.properties && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed pt-0.5">
                      {herb.properties}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="p-3.5 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-2">
                <span className="text-[10px] font-extrabold text-[#00B14F] bg-[#E6F7ED] dark:bg-[#00B14F]/20 px-2 py-0.5 rounded-md">
                  ⭐ 4.9 (สรรพคุณเด่น)
                </span>
                <span className="text-xs font-extrabold text-[#00B14F] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  <span>รายละเอียด</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 5. Telemetry & Real Stats Section */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00B14F]" />
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              สถิติการใช้งานระบบ AI สวนสมุนไพร
            </h2>
          </div>
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "สมุนไพรในสวน", value: `${herbs.length} ชนิด`, icon: Leaf, col: "text-[#00B14F]" },
            { label: "สมาชิกผู้เรียน", value: `${registeredUsersCount} คน`, icon: Trophy, col: "text-indigo-600" },
            { label: "ยอดเข้าชมสะสม", value: `${totalVisits.toLocaleString()} ครั้ง`, icon: Award, col: "text-emerald-600" },
            { label: "สแกนพืช & แชท AI", value: `${(totalScans + totalChats).toLocaleString()} ครั้ง`, icon: Camera, col: "text-sky-600" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center flex flex-col items-center justify-center gap-1">
                <Icon className={`w-5 h-5 ${stat.col}`} />
                <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{stat.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Certificate & Passport Callout Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold">
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>ใบเกียรติบัตร & พาสปอร์ตดิจิทัล</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            รับเกียรติบัตรและพาสปอร์ตรับรองความรู้หลังผ่านแบบทดสอบ
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
            สะสมคะแนนจากการเรียนรู้พืชสมุนไพร เพื่อขอรับวุฒิบัตรรับรองจากหัวหน้าศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSampleType("cert");
              setShowSampleCertModal(true);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Eye className="w-4 h-4 text-[#00B14F]" />
            <span>ตัวอย่าง</span>
          </button>
          <Link
            to="/challenge"
            className="px-4 py-2.5 bg-[#00B14F] hover:bg-[#009643] text-white font-extrabold rounded-xl shadow-xs text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>ทำแบบทดสอบ</span>
          </Link>
        </div>
      </div>

      {/* 7. SAMPLE CERTIFICATE & PASSPORT PREVIEW MODAL */}
      {showSampleCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  {sampleType === "cert" ? <Award className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {sampleType === "cert" ? "รูปตัวอย่างเกียรติบัตรรับรองความรู้ดิจิทัล" : "รูปตัวอย่างพาสปอร์ตท่องเที่ยวสวนสมุนไพร"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {sampleType === "cert"
                      ? "ตัวอย่างเกียรติบัตรที่จะได้รับหลังผ่านการทดสอบประเมินความรู้"
                      : "ตัวอย่างพาสปอร์ตท่องเที่ยวและอนุรักษ์พืชสมุนไพรดิจิทัล"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleCertModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Switcher Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setSampleType("cert")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  sampleType === "cert"
                    ? "bg-white dark:bg-slate-900 text-[#00B14F] shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Award className="w-4 h-4" />
                <span>ตัวอย่างเกียรติบัตร</span>
              </button>
              <button
                type="button"
                onClick={() => setSampleType("passport")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  sampleType === "passport"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>ตัวอย่างพาสปอร์ต</span>
              </button>
            </div>

            {/* Rendered Sample Frame */}
            {sampleType === "cert" ? (
              <div className="relative p-6 sm:p-8 bg-amber-500/5 dark:bg-amber-950/20 border-2 border-amber-500/30 rounded-2xl text-center space-y-5 shadow-inner overflow-hidden font-sans">
                <div className="flex justify-center mb-1">
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpjm_Yo-6e2HgR7GsSNQiGL7q_Y4l-TasybXnDrNZJxw&s=10"
                    alt="ตราสัญลักษณ์"
                    className="h-16 sm:h-20 w-auto object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 tracking-wider block uppercase">
                    ใบเกียรติบัตรรับรองความรู้สมุนไพรดิจิทัล
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#00B14F] block">
                    {currentGarden.name}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</span>
                  <h4 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5 max-w-xs mx-auto">
                    {user?.displayName || "นายสมชาย ใจดี (ตัวอย่าง)"}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                    ได้สำเร็จหลักสูตรศึกษาระดับพฤกษศาสตร์สมุนไพรอัจฉริยะ ผ่านการเรียนรู้พืชพรรณพฤกษเวชศาสตร์และการทดสอบประเมินคำตอบด้วยระบบตรวจข้อสอบปัญญาประดิษฐ์
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 items-end">
                  <div className="space-y-1 flex flex-col items-center text-center">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">พว.อาบทิพย์ เพ็ชรสกุล</span>
                    <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-tight block">หัวหน้าศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข</span>
                  </div>
                  <div className="space-y-0.5 text-center sm:text-right">
                    <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold block">
                      {currentGarden.gardenId}-CERT-SAMPLE
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative p-5 sm:p-7 bg-slate-950 border-2 border-amber-500/40 rounded-2xl text-slate-100 space-y-5 shadow-2xl overflow-hidden font-sans">
                <div className="border-b border-amber-500/20 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpjm_Yo-6e2HgR7GsSNQiGL7q_Y4l-TasybXnDrNZJxw&s=10"
                      alt="ตราสัญลักษณ์"
                      className="h-14 sm:h-16 w-auto object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-amber-400 tracking-wider uppercase font-mono">
                        SMART HERBAL PASSPORT
                      </h3>
                      <span className="text-[10px] text-[#00B14F] font-extrabold block mt-0.5">
                        {currentGarden.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                  <div className="flex flex-col items-center justify-center relative">
                    <div className="relative p-1 bg-amber-500/30 rounded-xl border-2 border-amber-500/40 w-32 h-32 sm:w-36 sm:h-36 overflow-hidden shadow-lg bg-slate-900">
                      <img 
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop" 
                        alt="ตัวอย่างรูป"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-3 text-left font-mono">
                    <div className="col-span-2 border-b border-slate-800 pb-1.5">
                      <span className="text-[9px] text-slate-400 block">NAME / ชื่อผู้ถือพาสปอร์ต</span>
                      <span className="text-sm sm:text-base font-extrabold text-white font-sans">
                        {user?.displayName || "นายสมชาย ใจดี (ตัวอย่าง)"}
                      </span>
                    </div>
                    <div className="border-b border-slate-800 pb-1.5">
                      <span className="text-[9px] text-slate-400 block">LEVEL / ระดับ</span>
                      <span className="text-xs font-extrabold text-amber-400 font-sans">
                        EXPERT (เชี่ยวชาญ)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">
                💡 ทำแบบทดสอบสะสมคะแนนเพื่อรับ{sampleType === "cert" ? "เกียรติบัตร" : "พาสปอร์ต"}จริง
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowSampleCertModal(false);
                  navigate("/challenge");
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#00B14F] hover:bg-[#009643] text-white font-extrabold rounded-xl shadow-md cursor-pointer text-xs sm:text-sm"
              >
                ไปที่หน้าแบบทดสอบ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default Home;
