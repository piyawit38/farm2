import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUsers } from "../services/db";
import { Trophy, Medal, Star, User, Flame, Award } from "lucide-react";

interface RankingUser {
  rank: number;
  displayName: string;
  photoURL: string;
  level: string;
  completedCount: number;
  totalScore: number;
  isCurrentUser: boolean;
}

export const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"monthly" | "allTime">("monthly");
  const [refreshCount, setRefreshCount] = useState(0);

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
  const rankingList = useMemo<RankingUser[]>(() => {
    const rawUsers = getUsers();

    let combined = rawUsers.map((u) => ({
      displayName: u.displayName,
      photoURL: u.photoURL,
      level: u.level,
      completedCount: u.completedHerbs?.length || 0,
      totalScore: u.totalScore,
      isCurrentUser: user?.userId === u.userId
    }));

    // If current user is logged in but not in database list yet, include them
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

    // Apply ranking number
    return combined.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }, [user, refreshCount]);

  // Split top 3 for the podium
  const topThree = rankingList.slice(0, 3);
  const remainingList = rankingList.slice(3);

  // Find active user's ranking object
  const currentUserRanking = rankingList.find((u) => u.isCurrentUser);

  if (!user || user.totalScore === 0) {
    return (
      <div className="py-12 sm:py-20 max-w-md mx-auto text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm animate-fade-in font-sans">
        <div className="relative inline-block">
          <div className="p-5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
            <Trophy className="w-16 h-16 animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white p-1 px-2.5 rounded-full text-[10px] font-bold border-2 border-white uppercase tracking-wider">
            Locked
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans">จัดอันดับถูกจำกัดการเข้าถึง</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            ตามนโยบายบุกเบิก สิทธิ์การดูตารางจัดอันดับจำกัดไว้เฉพาะสมาชิกระดับ <span className="font-bold text-teal-600 dark:text-teal-400">หลังประเมินผลออกสมุดเดินทาง (Passport) หรือเกียรติบัตร (Certificate)</span> เรียบร้อยแล้วเท่านั้น!
          </p>
          <p className="text-[11px] text-slate-400 leading-normal">
            *กรุณาเล่นเกมสแกนพืชเพื่อเรียนรู้หรือตอบแบบทดสอบความรู้ให้ได้คะแนนสะสมอย่างน้อย 1 คะแนนเพื่อปลดล็อก
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate("/challenge")}
            className="w-full px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>ไปตอบแบบทดสอบสะสมคะแนน</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* Header and description */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>🏆 ทำเนียบเกียรติยศและอันดับคะแนน</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          ทำเนียบอันดับ
        </p>
      </div>

      {/* Tabs navigation switch */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("monthly")}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === "monthly"
              ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          อันดับสะสมประจำเดือนนี้
        </button>
        <button
          onClick={() => setActiveTab("allTime")}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === "allTime"
              ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          ตารางเกียรติยศตลอดกาล (All-Time Hall of Fame)
        </button>
      </div>

      {/* Podium Display (Top 3 Users) */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto pt-6 items-end text-center">
          
          {/* 2nd Place Podium */}
          {topThree[1] && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <img
                  src={topThree[1].photoURL}
                  alt={topThree[1].displayName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-slate-300 bg-white"
                />
                <span className="absolute -top-1 -right-1 bg-slate-300 text-slate-900 font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  2
                </span>
              </div>
              <div className="space-y-0.5 text-slate-800 dark:text-slate-200">
                <span className="text-[11px] font-bold block truncate max-w-[80px] sm:max-w-[120px]">
                  {topThree[1].displayName}
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block">⭐ {topThree[1].totalScore} pts</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 border-x border-t border-slate-200/60 dark:border-slate-800/80 h-20 rounded-t-xl flex items-center justify-center font-extrabold text-slate-400 text-sm sm:text-base shadow-inner">
                🥈 เงิน
              </div>
            </div>
          )}

          {/* 1st Place Podium (Centered & Taller) */}
          {topThree[0] && (
            <div className="flex flex-col items-center gap-2 -translate-y-2">
              <div className="relative">
                <Trophy className="w-5 h-5 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow-md animate-pulse" />
                <img
                  src={topThree[0].photoURL}
                  alt={topThree[0].displayName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-400 bg-white shadow-md shadow-amber-500/10"
                />
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-extrabold text-[11px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                  1
                </span>
              </div>
              <div className="space-y-0.5 text-slate-900 dark:text-slate-100">
                <span className="text-xs sm:text-sm font-black block truncate max-w-[90px] sm:max-w-[140px]">
                  {topThree[0].displayName}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-extrabold block">⭐ {topThree[0].totalScore} pts</span>
              </div>
              <div className="w-full bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border-x border-t border-amber-200/50 dark:border-amber-900/50 h-28 rounded-t-xl flex flex-col items-center justify-center font-extrabold text-amber-600 text-sm sm:text-base shadow-sm">
                <span>🥇 ทอง</span>
              </div>
            </div>
          )}

          {/* 3rd Place Podium */}
          {topThree[2] && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <img
                  src={topThree[2].photoURL}
                  alt={topThree[2].displayName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-650 bg-white"
                />
                <span className="absolute -top-1 -right-1 bg-amber-700 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  3
                </span>
              </div>
              <div className="space-y-0.5 text-slate-800 dark:text-slate-200">
                <span className="text-[11px] font-bold block truncate max-w-[80px] sm:max-w-[120px]">
                  {topThree[2].displayName}
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block">⭐ {topThree[2].totalScore} pts</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 border-x border-t border-slate-200/60 dark:border-slate-800/80 h-16 rounded-t-xl flex items-center justify-center font-extrabold text-amber-700 text-sm sm:text-base shadow-inner">
                🥉 ทองแดง
              </div>
            </div>
          )}

        </div>
      )}

      {/* Leaderboard Rankings List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5 text-left w-16">อันดับ</th>
                <th className="px-5 py-3.5 text-left">ชื่อผู้ร่วมเรียนรู้</th>
                <th className="px-5 py-3.5 text-center">สมุนไพรที่เรียน</th>
                <th className="px-5 py-3.5 text-right pr-6">คะแนนรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {remainingList.map((rankUser) => {
                let rankIcon = <span className="font-extrabold text-slate-400">{rankUser.rank}</span>;
                return (
                  <tr
                    key={rankUser.displayName}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                      rankUser.isCurrentUser ? "bg-teal-600/5 dark:bg-teal-400/5 font-semibold" : ""
                    }`}
                  >
                    <td className="px-5 py-4 text-left font-bold">{rankIcon}</td>
                    <td className="px-5 py-4 text-left">
                      <div className="flex items-center gap-3">
                        <img
                          src={rankUser.photoURL}
                          alt={rankUser.displayName}
                          className="w-8 h-8 rounded-full border border-slate-200/50 bg-slate-100 shrink-0"
                        />
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            {rankUser.displayName}
                          </span>
                          {rankUser.isCurrentUser && (
                            <span className="ml-2 text-[9px] font-extrabold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-500/10">
                              คุณเอง
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">{rankUser.level}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-500 dark:text-slate-400 font-bold">
                      🌿 {rankUser.completedCount} ชนิด
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-slate-800 dark:text-slate-200 pr-6">
                      ⭐ {rankUser.totalScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anchored current user progress reminder drawer */}
      {currentUserRanking && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 bg-teal-500/15 text-teal-400 rounded-xl shrink-0">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-wide">อันดับความคืบหน้าปัจจุบันของคุณ:</span>
              <p className="text-sm font-bold leading-normal">
                คุณอยู่ที่อันดับ #<span className="font-black text-amber-400">{currentUserRanking.rank}</span> ในสวนของท้องถิ่น มีทั้งหมด <span className="font-extrabold text-teal-400">{currentUserRanking.totalScore} คะแนน</span>
              </p>
            </div>
          </div>
          
          <div className="text-right shrink-0">
            {currentUserRanking.rank > 1 ? (
              <span className="text-[11px] text-slate-400 font-medium">
                ต้องการอีกเพียง <span className="font-bold text-white">{(rankingList[currentUserRanking.rank - 2]?.totalScore || 0) - currentUserRanking.totalScore + 1} คะแนน</span> เพื่อแซงอันดับถัดไป!
              </span>
            ) : (
              <span className="text-xs text-amber-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                🏆 คุณครองอันดับที่ 1 แชมป์ผู้เรียนรู้ยอดเยี่ยม!
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
export default Leaderboard;
