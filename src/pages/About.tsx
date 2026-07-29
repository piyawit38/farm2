import React from "react";
import { useGarden } from "../contexts/GardenContext";
import { Phone, Mail, Clock, MapPin, Leaf, Shield, Award, Landmark } from "lucide-react";

export const About: React.FC = () => {
  const { currentGarden } = useGarden();

  const objectives = [
    "เพื่อเป็นแหล่งรวบรวม ขยายพันธุ์ และอนุรักษ์สมุนไพรไทยท้องถิ่นในเขตพื้นที่เทศบาลและภูมิภาคใต้",
    "เพื่อส่งเสริมให้ประชาชนและเยาวชนตระหนักถึงคุณค่าของสมุนไพรไทยและภูมิปัญญาการแพทย์แผนไทยโบราณ",
    "เพื่อเป็นสถานบริการสาธารณสุขทางเลือกและการบำบัดฟื้นฟูสุขภาพชุมชนด้วยสมุนไพรท้องถิ่นอย่างปลอดภัย",
    "เพื่อขับเคลื่อนนโยบายสาธารณะ '1 อปท. 1 สวนสมุนไพร' ส่งต่อองค์ความรู้และเทคโนโลยีสุขภาพชุมชน"
  ];

  return (
    <div className="space-y-10 animate-fade-in text-left">
      
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 shadow-md">
        <img
          src={currentGarden.banner}
          alt={currentGarden.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
        <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500 text-slate-950 uppercase tracking-wider">
            ข้อมูลสวนพฤกษศาสตร์
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-sans">
            {currentGarden.name}
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm max-w-2xl leading-normal line-clamp-2">
            {currentGarden.address}
          </p>
        </div>
      </div>

      {/* 2. Main Narrative & Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: History & Objectives (2 Columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Landmark className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>ประวัติและความเป็นมา</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed indent-8">
              {currentGarden.description}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>วัตถุประสงค์โครงการ</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {objectives.map((obj, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-sm flex gap-3">
                  <span className="font-extrabold text-teal-600 dark:text-teal-400 text-lg">0{idx + 1}</span>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{obj}</p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Side: Sidebar Information (1 Column) */}
        <div className="space-y-6">
          
          {/* Quick Contact & Details Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 pb-3">
              ข้อมูลทั่วไป & การติดต่อ
            </h3>

            <div className="space-y-4">
              
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block">เวลาเปิดให้บริการ</span>
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                    {currentGarden.openingHours}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Phone className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block">เบอร์โทรศัพท์ติดต่อ</span>
                  <a href={`tel:${currentGarden.phone}`} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium hover:underline">
                    {currentGarden.phone}
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block">อีเมลติดต่อกลับ</span>
                  <a href={`mailto:${currentGarden.email}`} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium hover:underline">
                    {currentGarden.email}
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block">ที่ตั้ง / ที่อยู่สวน</span>
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed block">
                    {currentGarden.address}
                  </span>
                </div>
              </div>

            </div>

            {/* Quick Municipal Badge */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
              <Landmark className="w-10 h-10 text-teal-600/25 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">สังกัดองค์กรปกครองส่วนท้องถิ่น</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">เทศบาลนครหาดใหญ่</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Embedded Google Map Location */}
      {currentGarden.googleMap && (
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-red-500" />
            <span>แผนที่ตั้งและการเดินทาง</span>
          </h2>
          <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm h-80 sm:h-96">
            <iframe
              src={currentGarden.googleMap}
              className="w-full h-full border-0"
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer"
              title="ตำแหน่งแผนที่ Google Maps"
            ></iframe>
          </div>
        </section>
      )}

    </div>
  );
};
export default About;
