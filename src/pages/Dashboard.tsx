import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, calculateUserLevel } from "../contexts/AuthContext";
import { useGarden } from "../contexts/GardenContext";
import { getHerb } from "../services/db";
import { Trophy, Leaf, Award, Calendar, ChevronRight, Zap, CheckCircle, HelpCircle } from "lucide-react";

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentGarden, getGardenHerbs } = useGarden();
  const navigate = useNavigate();
  const [, setVersion] = React.useState(0);

  React.useEffect(() => {
    const handleSync = () => setVersion(v => v + 1);
    window.addEventListener("db_synced", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("stats_cleared", handleSync);
    return () => {
      window.removeEventListener("db_synced", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("stats_cleared", handleSync);
    };
  }, []);

  if (!user) {
    return (
      <div className="py-20 max-w-sm mx-auto text-center space-y-4 animate-fade-in">
        <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold">เข้าสู่ระบบเพื่อสะสมคะแนน</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          ร่วมบันทึกกิจกรรม สแกนป้ายบอร์ดคิวอาร์สมุนไพร และร่วมทำแบบทดสอบเพื่อสะสมผลงานในการรับเกียรติบัตร
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm"
        >
          กลับไปหน้าหลักเพื่อเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  const herbs = getGardenHerbs();
  const levelInfo = calculateUserLevel(user.totalScore);

  // Map level key to beautiful Thai displays and gradient borders
  const badgeMap: Record<string, { title: string; color: string; desc: string; banner: string }> = {
    beginner: {
      title: "🌱 ผู้เริ่มเรียนรู้ (Beginner)",
      color: "border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-950/20 dark:text-teal-400",
      banner: "bg-slate-100 text-slate-800",
      desc: "กำลังเริ่มต้นค้นพบความลับแพทย์แผนไทยอักษรพืชพรรณ"
    },
    explorer: {
      title: "🔍 นักสำรวจสมุนไพร (Explorer)",
      color: "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400",
      banner: "bg-emerald-500 text-slate-950",
      desc: "มีความรอบรู้ในการจำแนกพืชและลักษณะทางพฤกษศาสตร์ทั่วไป"
    },
    specialist: {
      title: "🧠 ผู้ชำนาญการ (Specialist)",
      color: "border-indigo-400 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-400",
      banner: "bg-indigo-600 text-white",
      desc: "เข้าใจสรรพคุณ วิธีใช้ และข้อจำกัดในการปรุงยาสมุนไพรลึกซึ้ง"
    },
    expert: {
      title: "🌟 ผู้เชี่ยวชาญสมุนไพร (Expert)",
      color: "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400",
      banner: "bg-amber-500 text-slate-950",
      desc: "ผู้รอบรู้ด้านพืชสมุนไพรและการวิเคราะห์เชิงคลินิกยาแผนไทยขั้นสูง"
    }
  };

  const badge = badgeMap[user.level] || badgeMap.beginner;

  // Render list of completed herbs
  const completedHerbsModels = user.completedHerbs
    .map((id) => getHerb(id))
    .filter((h): h is NonNullable<typeof h> => h !== null);

  // Requirements for certificate: e.g. score >= 10
  const canClaimCert = user.totalScore >= 10;
  const missingPoints = 10 - user.totalScore;

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* 1. Header Profile Banner card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        <div className="flex items-center gap-4">
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-teal-500/20 bg-teal-50 shrink-0"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {user.displayName}
              </h1>
              {user.role === "admin" && (
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-wide">
                  ผู้ดูแลสวน
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              อีเมลผู้ใช้งาน: <span className="font-semibold">{user.email}</span>
            </p>
            <p className="text-xs text-slate-400">
              📅 สมาชิกเมื่อ {new Date(user.createdAt).toLocaleDateString("th-TH")}
            </p>
          </div>
        </div>

        {/* Level badge card */}
        <div className={`p-4 rounded-2xl border ${badge.color} max-w-sm w-full md:w-auto text-left space-y-1`}>
          <span className="text-[10px] font-extrabold uppercase tracking-wide opacity-75 block">ยศระดับทักษะปัจจุบัน:</span>
          <span className="text-sm font-extrabold block">{badge.title}</span>
          <p className="text-[11px] opacity-80 leading-normal max-w-xs">{badge.desc}</p>
        </div>

      </div>

      {/* 2. Stats Grid & Progress section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Stats Section: Score Progress and Certificate Claim Widget */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Level Progress Circle / Bar Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500/10" />
              <span>ความก้าวหน้าทักษะ</span>
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>คะแนนสะสมรวม:</span>
                <span className="text-lg text-teal-600 dark:text-teal-400">{user.totalScore} คะแนน</span>
              </div>

              {/* Progress bar to next level */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>เป้าหมายชั้นถัดไป</span>
                  <span>{user.levelProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${user.levelProgress}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl text-left text-[11px] text-slate-500 leading-normal">
                💡 สะสมคะแนนจากการอ่านบอร์ดป้ายชื่อเรียนรู้ (+10 ต่อต้น) และจากการตอบแบบทดสอบกับ AI (+1) เพื่อรับเลื่อนระดับยศ
              </div>
            </div>
          </div>

          {/* Certificate Claim Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Award className="w-5 h-5 text-indigo-500" />
              <span>เกียรติบัตรอิเล็กทรอนิกส์</span>
            </h3>

            {canClaimCert ? (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-700 dark:text-indigo-400 leading-relaxed font-semibold">
                  🎉 ยินดีด้วยอย่างยิ่ง! คะแนนของคุณผ่านเกณฑ์รับเกียรติบัตรหลัก (10 คะแนนขึ้นไป) เรียบร้อยแล้ว
                </div>
                <button
                  onClick={() => navigate("/certificate")}
                  className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>คลิกไปรับเกียรติบัตรของคุณ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  คุณยังสะสมคะแนนไม่ครบเกณฑ์รับเกียรติบัตรผู้เรียนรู้ดีเด่น (ต้องการอย่างน้อย <span className="font-bold text-slate-700 dark:text-slate-200">10 คะแนน</span>)
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-150 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-slate-400 font-bold block uppercase">ต้องการอีก:</span>
                  <span className="text-base font-extrabold text-teal-600 dark:text-teal-400">{missingPoints} คะแนน</span>
                </div>
                <button
                  onClick={() => navigate("/herbs")}
                  className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold text-center cursor-pointer"
                >
                  ค้นหาพืชเพื่ออ่านบอร์ดเรียนรู้ต่อ
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Section: Learning History Checklist (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                <Leaf className="w-5 h-5 text-teal-600" />
                <span>ประวัติเรียนรู้พืชพรรณ ({user.completedHerbs.length} ชนิด)</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                สวนทั้งหมด {herbs.length} ชนิด
              </span>
            </div>

            {completedHerbsModels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completedHerbsModels.map((h) => (
                  <Link
                    key={h.herbId}
                    to={`/herbs/${h.herbId}`}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-teal-50/40 dark:hover:bg-teal-950/10 border border-slate-150 dark:border-slate-750/80 rounded-xl hover:border-teal-500/20 transition-all text-left group"
                  >
                    <img
                      src={h.images?.[0]}
                      alt={h.thaiName}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="overflow-hidden">
                      <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block truncate group-hover:text-teal-600 dark:group-hover:text-teal-400">
                        🌿 {h.thaiName}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3 fill-emerald-500/10" />
                        <span>เรียนรู้สำเร็จ</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 max-w-sm mx-auto space-y-3">
                <p className="text-xs leading-normal">
                  ท่านยังไม่มีการเรียนรู้พืชชนิดใดในประวัติเลย ลองสแกนป้ายบอร์ดคิวอาร์หรือคลิกปุ่มทำเครื่องหมายว่าเรียนรู้แล้วในหน้ารายละเอียดสมุนไพร
                </p>
                <button
                  onClick={() => navigate("/herbs")}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  ไปดูฐานข้อมูลสมุนไพร
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
export default Dashboard;
