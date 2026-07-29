import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useGarden } from "../contexts/GardenContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getHerb, getHerbs, incrementChatCount, saveChatLog } from "../services/db";
import { Send, Sparkles, RefreshCw, AlertCircle, Leaf, User, Brain } from "lucide-react";

interface Message {
  role: "user" | "ai";
  content: string;
  image?: string;
}

export const Chatbot: React.FC = () => {
  const { currentGarden, getGardenHerbs } = useGarden();
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Quick reply options (removed example questions)
  const quickReplies: string[] = [];

  // Initialize chat with a welcome message on load
  useEffect(() => {
    // If we have an incoming image state from the home quick scan, skip the standard welcome message
    const state = location.state as { imageSrc?: string } | null;
    if (state?.imageSrc) return;

    // Check if there is an active herbId passed from the detail page query
    const params = new URLSearchParams(location.search);
    const herbId = params.get("herb");
    
    let welcomeText = `สวัสดีครับ! ผมคือ **AI Herbal Learning Companion** ผู้ช่วยเรียนรู้สมุนไพรอัจฉริยะ ประจำสวน **"${currentGarden.name}"** ยินดีต้อนรับท่านเข้าสู่แหล่งข้อมูลอัจฉริยะครับ 

ท่านอยากสอบถามสรรพคุณ วิธีใช้ หรือความรู้ด้านการแพทย์แผนไทยโบราณของสมุนไพรในสวนชนิดใด สามารถพิมพ์ถามมาได้เลยครับ!`;

    if (herbId) {
      const targetHerb = getHerb(herbId);
      if (targetHerb) {
        welcomeText = `สวัสดีครับ! ผมเห็นคุณกำลังศึกษาเรื่อง **"${targetHerb.thaiName}"** อยู่พอดีเลย 
        
มีประเด็นไหนเกี่ยวกับ **"${targetHerb.thaiName}"** (ชื่อวิทยาศาสตร์: *${targetHerb.scientificName}*) ที่คุณอยากให้ผมอธิบายเพิ่มเติมไหมครับ? สามารถพิมพ์ถามได้ทันทีเลยครับ`;
        
        // Also pre-fill the search input with a helpful prompt
        setInputText(`สรรพคุณและข้อควรระวังของ ${targetHerb.thaiName}`);
      }
    }

    setMessages([{ role: "ai", content: welcomeText }]);
  }, [currentGarden, location.search, location.state]);

  // Handle image analysis on mount/redirect
  useEffect(() => {
    const state = location.state as { imageSrc?: string } | null;
    if (state?.imageSrc) {
      const imageSrc = state.imageSrc;
      
      // Instantly clear state from history to avoid multiple triggers on page refreshes
      window.history.replaceState({}, document.title);

      // Add user message displaying the uploaded picture
      const userMsg: Message = {
        role: "user",
        content: "สวัสดีครับ AI ช่วยสแกนวิเคราะห์ภาพพืชสมุนไพรตัวนี้ให้หน่อยครับ",
        image: imageSrc
      };

      setMessages([userMsg]);
      setSending(true);

      const runVisionAnalysis = async () => {
        try {
          const herbsList = getGardenHerbs();
          const response = await fetch("/api/gemini/vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: imageSrc,
              mimeType: "image/jpeg",
              gardenName: currentGarden.name,
              herbsList
            })
          });

          if (!response.ok) {
            throw new Error("ระบบ AI ขัดข้องชั่วคราว");
          }

          const visionResult = await response.json();
          
          let aiText = `ผมได้สแกนและวิเคราะห์ภาพสมุนไพรตัวนี้เรียบร้อยแล้วครับ! 

🌿 **พืชที่ระบุได้**: **"${visionResult.identifiedName}"**
*(ชื่อวิทยาศาสตร์: _${visionResult.scientificName}_ - ความเชื่อมั่น: ${visionResult.confidence}%)*

`;

          if (visionResult.matchedHerbId) {
            const foundDbHerb = getGardenHerbs().find(h => h.herbId === visionResult.matchedHerbId);
            if (foundDbHerb) {
              aiText += `📍 **พืชชนิดนี้ได้รับการขึ้นทะเบียนในสวนของคุณแล้ว!** (ไอดี: **${foundDbHerb.herbId}**)\n`;
              aiText += `📖 **สรรพคุณหลักทางยา**: ${foundDbHerb.properties?.join(", ") || "ไม่มีระบุ"}\n`;
              aiText += `🧪 **วิธีประยุกต์ใช้ปรุงยา**: ${foundDbHerb.usage || "ไม่มีระบุ"}\n`;
              aiText += `⚠️ **ข้อควรระวังและผลข้างเคียง**: ${foundDbHerb.precautions || "ไม่มีระบุ"}\n\n`;
            }
          } else {
            aiText += `⚠️ *ไม่พบข้อมูลขึ้นทะเบียนอย่างเป็นทางการของสมุนไพรชนิดนี้ในสวน "${currentGarden.name}"*\n\n`;
          }

          aiText += `🔍 **คำอธิบายลักษณะพฤกษศาสตร์และบทวิเคราะห์จาก AI**:\n${visionResult.analysisText}\n\n`;
          
          if (visionResult.similarHerbs && visionResult.similarHerbs.length > 0) {
            aiText += `🌿 **พืชสมุนไพรที่มีลักษณะพฤกษศาสตร์ใกล้เคียงกัน**:\n${visionResult.similarHerbs.map((h: string) => `- ${h}`).join("\n")}\n\n`;
          }

          aiText += `คุณต้องการสอบถามข้อมูลด้านใดเกี่ยวกับสมุนไพรนี้เพิ่มเติมไหมครับ? เช่น วิธีปลูก วิธีดูแลรักษา หรือข้อมูลพฤกษศาสตร์ส่วนอื่น สามารถถามมาได้เลยครับ!`;

          setMessages((prev) => [
            ...prev,
            { role: "ai", content: aiText }
          ]);
          showToast("วิเคราะห์ภาพด้วย AI สำเร็จเสร็จสิ้น!", "success");
        } catch (err) {
          console.error(err);
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: "⚠️ **การสแกนวิเคราะห์ภาพพืชล้มเหลวชั่วคราว** อย่างไรก็ดีคุณสามารถสอบถามสรรพคุณสมุนไพรตัวนี้หรือตัวอื่นในรูปแบบข้อความได้ทันทีเลยครับ!"
            }
          ]);
          showToast("วิเคราะห์ภาพสมุนไพรล้มเหลว กรุณาลองแชทด้วยข้อความ", "error");
        } finally {
          setSending(false);
        }
      };

      runVisionAnalysis();
    }
  }, [location.state, currentGarden, getGardenHerbs]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    if (sending) return;

    // Add User Message to feed
    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setSending(true);

    // Save Chat Log and increment count
    incrementChatCount();
    saveChatLog({
      chatId: `CHAT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gardenId: currentGarden.gardenId,
      userId: user?.userId || "guest",
      sessionId: `SESS_${Date.now()}`,
      messages: [{ role: "user", content: query, timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString()
    });

    try {
      const herbsDatabase = getGardenHerbs();

      // Submit chat request to server proxy
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-10), // Send last 10 messages context
          gardenName: currentGarden.name,
          gardenId: currentGarden.gardenId,
          herbsDatabase
        })
      });

      if (!response.ok) {
        throw new Error("ขออภัยด้วยครับ ระบบ AI Chatbot กำลังอัปเกรดชั่วคราว");
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: data.text || "ขออภัยด้วยครับ ไม่สามารถประมวลผลคำตอบได้" }
      ]);
    } catch (error: any) {
      console.error(error);
      showToast("ไม่สามารถประมวลผลคำตอบได้ กรุณาลองใหม่อีกครั้ง", "error");
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "⚠️ **เกิดข้อขัดข้องชั่วคราว** ในการเชื่องต่อระบบ AI เพื่อนยากด้านสมุนไพร กรุณาตรวจสอบอินเทอร์เน็ตหรือลองใหม่อีกครั้งครับ"
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] min-h-[500px] flex flex-col justify-between animate-fade-in text-left">
      
      {/* 1. Header Information */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-t-2xl shadow-xs shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl">
            <Brain className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-1">
              <span>ถามตอบ AI สมุนไพรคู่คิด</span>
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" title="พร้อมใช้งาน"></span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-none mt-1">
              ผู้ช่วยอัจฉริยะประจำ {currentGarden.name}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([{
              role: "ai",
              content: `สวัสดีครับ! ผมได้รีเซ็ตระบบแชทแล้ว สอบถามข้อมูลสมุนไพรประจำสวน **"${currentGarden.name}"** ตัวใดมาได้เลยครับ!`
            }]);
            showToast("รีเซ็ตหน้าต่างแชทเรียบร้อย", "info");
          }}
          className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
          title="ล้างหน้าต่างแชท"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Messages Panel */}
      <div className="flex-grow bg-slate-50/50 dark:bg-slate-950/20 border-x border-slate-100 dark:border-slate-800 p-4 sm:p-6 overflow-y-auto space-y-4">
        
        {messages.map((msg, i) => {
          const isAI = msg.role === "ai";
          return (
            <div
              key={i}
              className={`flex gap-3 max-w-2xl text-left ${isAI ? "" : "ml-auto flex-row-reverse"}`}
            >
              {/* Avatar Icon */}
              <div className={`p-2 rounded-xl shrink-0 h-fit ${
                isAI ? "bg-teal-600 text-white" : "bg-emerald-100 dark:bg-slate-800 text-teal-800 dark:text-teal-400"
              }`}>
                {isAI ? <Brain className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
              </div>

              {/* Message Bubble */}
              <div className={`p-4 rounded-2xl shadow-xs border text-xs sm:text-sm leading-relaxed font-sans ${
                isAI
                  ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 text-slate-800 dark:text-slate-100"
                  : "bg-teal-600 text-white border-transparent"
              }`}>
                {/* Render base64 image if uploaded */}
                {msg.image && (
                  <div className="mb-3 max-w-xs overflow-hidden rounded-xl border border-white/20 shadow-sm">
                    <img src={msg.image} alt="Herb capture" className="w-full h-auto object-cover max-h-48" />
                  </div>
                )}
                {/* Format markdown block (bold, linebreaks) since we keep it clean */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content.split("\n").map((line, idx) => {
                    // Match basic markdown bullet and bold headers
                    let cleanLine = line;
                    const isBold = cleanLine.startsWith("**") && cleanLine.endsWith("**");
                    if (isBold) {
                      cleanLine = cleanLine.replaceAll("**", "");
                      return <h4 key={idx} className="font-extrabold text-sm sm:text-base text-teal-600 dark:text-teal-400 mt-2 mb-1">{cleanLine}</h4>;
                    }
                    
                    // Simple replacement of raw markdown double stars
                    const regex = /\*\*(.*?)\*\*/g;
                    const parts = [];
                    let lastIndex = 0;
                    let match;
                    while ((match = regex.exec(line)) !== null) {
                      parts.push(line.substring(lastIndex, match.index));
                      parts.push(<strong key={match.index} className={isAI ? "text-teal-600 dark:text-teal-400 font-bold" : "font-extrabold text-amber-300"}>{match[1]}</strong>);
                      lastIndex = regex.lastIndex;
                    }
                    parts.push(line.substring(lastIndex));

                    return (
                      <p key={idx} className={line.trim() === "" ? "h-2" : "mb-1"}>
                        {parts.length > 0 ? parts : line}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3 max-w-2xl text-left">
            <div className="p-2 rounded-xl shrink-0 h-fit bg-teal-600 text-white">
              <Brain className="w-4.5 h-4.5" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-1.5 shadow-xs">
              <span className="h-2 w-2 bg-teal-600 dark:bg-teal-400 rounded-full animate-bounce"></span>
              <span className="h-2 w-2 bg-teal-600 dark:bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="h-2 w-2 bg-teal-600 dark:bg-teal-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef}></div>
      </div>

      {/* 3. Input & Quick Suggestion Row */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 rounded-b-2xl space-y-3 shrink-0">
        
        {/* Horizontal Quick replies suggestion strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
          {messages.length === 1 && quickReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(reply)}
              className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-150 dark:border-slate-700 hover:border-teal-500/10 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer"
            >
              💡 {reply.length > 40 ? reply.substring(0, 38) + "..." : reply}
            </button>
          ))}
        </div>

        {/* Active Input bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={sending}
            placeholder="พิมพ์คำถามเกี่ยวกับสมุนไพร เช่น ขิงใช้แก้อะไร..."
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/85 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-sm dark:text-white placeholder-slate-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !inputText.trim()}
            className="p-3 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

    </div>
  );
};
export default Chatbot;
