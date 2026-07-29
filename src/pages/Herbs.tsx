import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGarden } from "../contexts/GardenContext";
import { HERBAL_CATEGORIES } from "../constants";
import { Search, Sparkles, Filter, AlertCircle, ArrowRight, Eye, Tag } from "lucide-react";

export const Herbs: React.FC = () => {
  const { currentGarden, getGardenHerbs, dataVersion } = useGarden();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const herbs = useMemo(() => getGardenHerbs(), [currentGarden.gardenId, dataVersion]);

  // Filter and search herbs
  const filteredHerbs = useMemo(() => {
    return herbs.filter((herb) => {
      // 1. Search Query Match
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        query === "" ||
        herb.thaiName.toLowerCase().includes(query) ||
        (herb.localName && herb.localName.toLowerCase().includes(query)) ||
        herb.scientificName.toLowerCase().includes(query) ||
        herb.family.toLowerCase().includes(query) ||
        herb.properties.some((prop) => prop.toLowerCase().includes(query)) ||
        herb.description.toLowerCase().includes(query);

      // 2. Category Match
      const matchCategory = selectedCategory === "all" || herb.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [herbs, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Page Title & Breadcrumbs */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>🌿 ฐานข้อมูลสมุนไพร</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          สำรวจพืชพรรณทางการแพทย์แผนไทยที่เพาะปลูกในสวน <span className="font-semibold text-teal-600 dark:text-teal-400">{currentGarden.name}</span>
        </p>
      </div>

      {/* Search and Filters Hub */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
        
        {/* Search Bar Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อไทย, ชื่อท้องถิ่น, ชื่อวิทยาศาสตร์, หรือสรรพคุณรักษาอาการ..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-sm placeholder-slate-400 dark:text-slate-100"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wide text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>จำแนกตามหมวดหมู่สมุนไพร</span>
          </label>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800/80"
              }`}
            >
              🌐 ทั้งหมด ({herbs.length})
            </button>
            {HERBAL_CATEGORIES.map((cat) => {
              const count = herbs.filter((h) => h.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    selectedCategory === cat.id
                      ? "text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800/80"
                  }`}
                  style={{
                    backgroundColor: selectedCategory === cat.id ? cat.color : undefined
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Results Overview */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>พบพืชพรรณสมุนไพรทั้งหมด {filteredHerbs.length} รายการ</span>
        {selectedCategory !== "all" && (
          <button
            onClick={() => setSelectedCategory("all")}
            className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        )}
      </div>

      {/* Herbs Grid */}
      {filteredHerbs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredHerbs.map((herb) => {
            const catInfo = HERBAL_CATEGORIES.find((c) => c.id === herb.category);
            return (
              <div
                key={herb.herbId}
                onClick={() => navigate(`/herbs/${herb.herbId}`)}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between text-left group"
              >
                {/* Image slot */}
                <div className="relative h-44 bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={herb.images?.[0] || "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=400&auto=format&fit=crop"}
                    alt={herb.thaiName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                  />
                  {/* Category tag bubble */}
                  {catInfo && (
                    <span
                      className="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full text-white shadow-sm flex items-center gap-1"
                      style={{ backgroundColor: catInfo.color }}
                    >
                      <span>{catInfo.icon}</span>
                      <span>{catInfo.name}</span>
                    </span>
                  )}
                  {/* View count tag */}
                  <span className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-black/55 backdrop-blur-xs text-white flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{herb.viewCount || 0}</span>
                  </span>
                </div>

                {/* Info block */}
                <div className="p-4 flex-grow flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      🌿 {herb.thaiName}
                    </h3>
                    {herb.scientificName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic font-mono truncate">
                        {herb.scientificName}
                      </p>
                    )}
                    
                    {/* Brief properties */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {herb.properties?.slice(0, 2).map((p, idx) => (
                        <span key={idx} className="text-[10px] font-bold text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/30 px-2 py-0.5 rounded border border-teal-500/10">
                          {p}
                        </span>
                      ))}
                      {herb.properties?.length > 2 && (
                        <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 self-center pl-1">
                          +{herb.properties.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* bottom action CTA */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400">
                    <span>เรียนรู้สรรพคุณ</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-2xl shadow-sm text-center max-w-lg mx-auto flex flex-col items-center gap-3">
          <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500" />
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">ไม่พบสมุนไพรที่ตรงตามเงื่อนไข</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ลองตรวจสอบคำค้นหาใหม่อีกครั้ง หรือล้างตัวกรองเพื่อค้นหาพืชพรรณสมุนไพรชนิดอื่นๆ ในฐานข้อมูล
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="mt-2 text-xs font-bold bg-teal-600 text-white px-4 py-2 rounded-xl"
          >
            แสดงผลลัพธ์ทั้งหมด
          </button>
        </div>
      )}

    </div>
  );
};
export default Herbs;
