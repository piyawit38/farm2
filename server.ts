import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit to support Base64 images for AI Vision
app.use(express.json({ limit: "15mb" }));

// Persistent File-backed Database Store
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "app_store.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let serverDbStore: Record<string, any> = {};

function loadServerStore() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const fileData = fs.readFileSync(DATA_FILE, "utf-8");
      serverDbStore = JSON.parse(fileData);
    } catch (e) {
      console.error("Failed to read server data file, initializing new store", e);
      serverDbStore = {};
    }
  }
}

function saveServerStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(serverDbStore, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write server data file", e);
  }
}

loadServerStore();

// --- SERVER DATABASE ENDPOINTS ---
function getItemUniqueKey(item: any): string {
  if (!item || typeof item !== "object") return String(item);
  return item.logId || item.chatId || item.recordId || item.certificateId || item.certId || item.userId || item.email || item.herbId || item.gardenId || item.quizId || item.announcementId || JSON.stringify(item);
}

function mergeArrayItems(existingArr: any[], incomingArr: any[]): any[] {
  if (!Array.isArray(existingArr) || existingArr.length === 0) return incomingArr;
  if (!Array.isArray(incomingArr) || incomingArr.length === 0) return existingArr;

  const map = new Map<string, any>();
  existingArr.forEach(item => {
    map.set(getItemUniqueKey(item), item);
  });

  incomingArr.forEach(item => {
    const k = getItemUniqueKey(item);
    if (!map.has(k)) {
      map.set(k, item);
    } else {
      const existing = map.get(k);
      map.set(k, { ...existing, ...item });
    }
  });

  return Array.from(map.values());
}

app.get("/api/db", (req, res) => {
  res.json(serverDbStore || {});
});

app.post("/api/db/sync", (req, res) => {
  try {
    const { key, value, data, replace } = req.body;

    if (key) {
      if (key === "herbal_platform_stats_cleared" && value === "true") {
        serverDbStore["herbal_platform_stats_cleared"] = "true";
        serverDbStore["herbal_platform_visit_logs"] = [];
        serverDbStore["herbal_platform_scan_logs"] = [];
        serverDbStore["herbal_platform_herb_view_logs"] = [];
        serverDbStore["herbal_platform_chat_logs"] = [];
        serverDbStore["herbal_platform_certificates"] = [];
        serverDbStore["herbal_platform_learning_records"] = [];
      } else if (replace) {
        serverDbStore[key] = value;
      } else if (key.includes("logs") || key.includes("records") || key.includes("certificates")) {
        if (Array.isArray(value)) {
          if (value.length === 0 && serverDbStore["herbal_platform_stats_cleared"] === "true") {
            serverDbStore[key] = [];
          } else if (Array.isArray(serverDbStore[key])) {
            serverDbStore[key] = mergeArrayItems(serverDbStore[key], value);
          } else {
            serverDbStore[key] = value;
          }
        } else {
          serverDbStore[key] = value;
        }
      } else {
        // For entity tables (herbs, quizzes, gardens, announcements, users, etc.)
        if (Array.isArray(value) && Array.isArray(serverDbStore[key])) {
          serverDbStore[key] = mergeArrayItems(serverDbStore[key], value);
        } else {
          serverDbStore[key] = value;
        }
      }
    }

    if (data && typeof data === "object") {
      Object.keys(data).forEach(k => {
        const val = data[k];
        if (k.includes("logs") || k.includes("records") || k.includes("certificates")) {
          if (Array.isArray(val) && Array.isArray(serverDbStore[k])) {
            serverDbStore[k] = mergeArrayItems(serverDbStore[k], val);
          } else {
            serverDbStore[k] = val;
          }
        } else {
          if (val !== undefined) {
            serverDbStore[k] = val;
          }
        }
      });
    }

    saveServerStore();
    res.json({ success: true, timestamp: new Date().toISOString(), keys: Object.keys(serverDbStore) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to sync server store" });
  }
});

// Initialize Google GenAI SDK server-side
// The platform automatically injects GEMINI_API_KEY from Secrets panel
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Check API key configuration on startup
if (!geminiApiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not configured in the environment.");
}

// --- API ENDPOINTS ---

// 1. AI Herbal Chatbot Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, gardenName, gardenId, herbsDatabase } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const SYSTEM_PROMPT = `
คุณคือ "AI Herbal Learning Companion" ผู้ช่วยเรียนรู้สมุนไพรอัจฉริยะ
ประจำสวนสมุนไพร: ${gardenName || "ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข"} (Garden ID: ${gardenId || "HATYAI001"})

กฎการตอบ:
1. ตอบจากฐานข้อมูลสมุนไพรของสวนนี้เท่านั้นที่ระบุไว้ด้านล่างนี้
2. หากไม่มีข้อมูลในฐานข้อมูล ให้ตอบว่า "ไม่พบข้อมูลสมุนไพรนี้ในฐานข้อมูลของสวน ${gardenName}" เท่านั้น และห้ามแนะนำข้อมูลผิดๆ
3. ห้ามสร้างข้อมูลสมุนไพรหรือสมมติข้อมูลสมุนไพรภายนอกขึ้นมาเอง
4. หากผู้ใช้ถามเรื่องที่ไม่เกี่ยวข้องกับสมุนไพร ให้ตอบอย่างสุภาพว่า "ขออภัยด้วยครับ ฉันได้รับการออกแบบมาเพื่อเป็นผู้ช่วยเรียนรู้สมุนไพรประจำสวนเท่านั้นครับ"
5. ตอบด้วยภาษาไทยเสมอ
6. ตอบอย่างเป็นมิตร กระชับ เข้าใจง่าย และถูกต้องตามหลักการแพทย์แผนไทย
7. นำเสนอข้อมูลให้อ่านง่ายเป็นข้อๆ ในรูปแบบ Markdown

ข้อมูลสมุนไพรทั้งหมดที่มีในสวนนี้ (ใช้ข้อมูลด้านล่างนี้เป็นข้ออ้างอิงเท่านั้น):
${JSON.stringify(herbsDatabase || [])}
`;

    // Map history to the required content parts if needed, or send as a chat session.
    // For simplicity and high precision, we construct a conversation history for generateContent
    const contents: any[] = [];
    
    // Add history
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "ai" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      });
    }

    // Add current user query
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2, // Low temperature for high factual accuracy
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error in Gemini Chat" });
  }
});

// 2. AI Vision Analysis Endpoint
app.post("/api/gemini/vision", async (req, res) => {
  try {
    const { imageBase64, mimeType, gardenName, herbsList } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required." });
    }

    const cleanMimeType = mimeType || "image/jpeg";
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const herbNamesText = (herbsList || [])
      .map((h: any) => `- ${h.thaiName} (${h.scientificName}) - สรรพคุณหลัก: ${h.properties?.join(", ")}`)
      .join("\n");

    const VISION_PROMPT = `
วิเคราะห์ภาพถ่ายสมุนไพรนี้และระบุคำตอบตามเงื่อนไขต่อไปนี้:
1. ระบุชนิดสมุนไพร (ชื่อไทย และ ชื่อวิทยาศาสตร์)
2. ให้เปอร์เซ็นต์ความมั่นใจ (Confidence % ระหว่าง 0 ถึง 100%)
3. ระบุสมุนไพรที่มีลักษณะทางพฤกษศาสตร์ใกล้เคียงกันมาอย่างน้อย 3 ชนิด
4. ตรวจสอบเปรียบเทียบกับรายชื่อสมุนไพรที่มีในสวน "${gardenName || "ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข"}" ด้านล่างนี้:
   - หากตรงกับสมุนไพรที่มีในสวน ให้บอกตำแหน่งและดึงไอดีสมุนไพรจากชื่อที่ให้
   - หากไม่พบสมุนไพรนี้ในรายชื่อของสวน ให้เขียนข้อความระบุชัดเจนว่า "ไม่พบข้อมูลสมุนไพรนี้ในสวน ${gardenName}"

รายชื่อสมุนไพรในสวนนี้ (สำหรับใช้เปรียบเทียบ):
${herbNamesText}

ตอบกลับในรูปแบบ JSON เสมอ โดยให้มีโครงสร้างคีย์ดังนี้:
{
  "identifiedName": "ชื่อภาษาไทยของสมุนไพร",
  "scientificName": "ชื่อวิทยาศาสตร์",
  "confidence": 85, // ตัวเลขเท่านั้น
  "matchedHerbId": "ไอดีสมุนไพรที่ตรงกันในสวน (เช่น HERB001) หรือค่า null ถ้าไม่พบในสวน",
  "similarHerbs": ["สมุนไพรใกล้เคียง 1", "สมุนไพรใกล้เคียง 2", "สมุนไพรใกล้เคียง 3"],
  "analysisText": "คำอธิบายลักษณะพฤกษศาสตร์ที่ตรวจพบ สรรพคุณทั่วไป และข้อความเตือนถ้าไม่พบในสวนนี้ตามความเหมาะสม"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: cleanBase64,
            },
          },
          {
            text: VISION_PROMPT,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedName: { type: Type.STRING },
            scientificName: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            matchedHerbId: { type: Type.STRING },
            similarHerbs: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            analysisText: { type: Type.STRING },
          },
          required: ["identifiedName", "scientificName", "confidence", "matchedHerbId", "similarHerbs", "analysisText"],
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error in Gemini Vision" });
  }
});

// 3. Challenge Mode Answer Grader Endpoint
app.post("/api/gemini/challenge", async (req, res) => {
  try {
    const { question, userAnswer, herbData } = req.body;

    if (!question || !userAnswer || !herbData) {
      return res.status(400).json({ error: "question, userAnswer, and herbData are required." });
    }

    const CHALLENGE_PROMPT = `
ตรวจสอบคำตอบของผู้เรียนเกี่ยวกับการเรียนรู้สมุนไพร:

ข้อมูลสมุนไพรในฐานข้อมูล:
ชื่อสมุนไพร: ${herbData.thaiName}
ชื่อวิทยาศาสตร์: ${herbData.scientificName}
ลักษณะทั่วไป: ${herbData.description}
สรรพคุณหลัก: ${herbData.properties?.join(", ")}
วิธีใช้: ${herbData.usage}
ข้อควรระวัง: ${herbData.precautions}

คำถามจากแบบทดสอบ: ${question}
คำตอบที่ผู้เรียนป้อน/ส่งมา: ${userAnswer}

โปรดประเมินคำตอบของผู้เรียนโดยเปรียบเทียบกับความถูกต้องตามข้อมูลสมุนไพร:
1. ตรวจสอบว่าคำตอบมีความหมายถูกต้องหรือใกล้เคียงความเป็นจริงหรือไม่ (ถูกต้อง = true, ไม่ถูกต้อง/ไม่เกี่ยวข้อง = false)
2. ให้คะแนน (1 คะแนนเต็มสำหรับคำตอบที่ถูกหรือใกล้เคียง, 0 คะแนนสำหรับคำตอบที่ผิดหรือว่างเปล่า)
3. ระบุคำตอบที่ถูกต้องตามหลักวิชาการ
4. อธิบายเหตุผลของคำตอบอย่างเข้าใจง่ายและเป็นมิตร
5. ให้ข้อมูลเสริม/เกร็ดความรู้สั้นๆ เพิ่มเติมเกี่ยวกับสมุนไพรนี้เพื่อการเรียนรู้ที่ยอดเยี่ยม

ตอบกลับในรูปแบบ JSON ตามคีย์ที่ระบุไว้เท่านั้น:
{
  "correct": true,
  "score": 1,
  "correctAnswer": "คำอธิบายคำตอบที่ถูกต้องสมบูรณ์",
  "explanation": "เหตุผลวิเคราะห์คำตอบและคำอธิบายโดยย่อเป็นภาษาไทย",
  "additionalInfo": "เกร็ดความรู้หรือข้อมูลอภิปรายเสริมสำหรับสมุนไพรนี้"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: CHALLENGE_PROMPT,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correct: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            additionalInfo: { type: Type.STRING },
          },
          required: ["correct", "score", "correctAnswer", "explanation", "additionalInfo"],
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Gemini Challenge Error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error in Gemini Challenge" });
  }
});

// --- AI KNOWLEDGE BUILDER ENDPOINT ---
app.post("/api/gemini/builder", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text or description is required." });
    }

    const PROMPT = `
คุณคือผู้เชี่ยวชาญด้านพฤกษศาสตร์และการแพทย์แผนไทย
วิเคราะห์ข้อมูลพืชสมุนไพรจากเนื้อหา/คำอธิบายต่อไปนี้ และสกัดข้อมูลเพื่อสร้างฐานข้อมูลสมุนไพรอย่างละเอียด พร้อมสร้างคำถามข้อสอบประเมินความรู้ผู้เรียน 3 ข้อ

เนื้อหาคำอธิบาย:
"${text}"

โปรดจัดกลุ่มหมวดหมู่ (category) ตามรหัสหมวดหมู่อย่างใดอย่างหนึ่งดังต่อไปนี้เท่านั้น:
- "fever" (แก้ไข้หวัด / ปอด / ระบบทางเดินหายใจ)
- "digestive" (ท้องอืด / กระเพาะอาหาร / ขับถ่าย)
- "skin" (ผิวหนัง / แผลติดเชื้อ / พิษสัตว์กัด)
- "tonic" (บำรุงร่างกาย / ฟื้นฟูสุขภาพ)
- "food" (อาหาร / เครื่องเทศ)
- "flower" (ไม้ดอกไม้ประดับ / อโรมาเทอราปี)
- "rare" (หายาก / อนุรักษ์)

สำหรับรูปภาพ (images): ให้เสนอ URL ภาพสมุนไพรที่น่าจะเหมาะสมจาก Unsplash หรือใช้คำค้นหาภาษาอังกฤษที่มีโอกาสเจอสูง เช่น "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=400&auto=format&fit=crop" หรือใกล้เคียง

และสำหรับข้อสอบวิชาการ 3 ข้อ:
- ตั้งโจทย์ข้อสอบอัตนัย/ประเมินความคิดเชิงลึก (Open-ended) ที่อ้างอิงข้อมูลสรรพคุณหรือวิธีใช้พืชต้นนี้
- กำหนดแนวทางเฉลย (answerScheme) แบบกระชับและตรงประเด็นทางวิชาการ

ตอบกลับในรูปแบบ JSON ตามโครงสร้างคีย์ดังต่อไปนี้เท่านั้น:
{
  "herb": {
    "thaiName": "ชื่อสมุนไพรภาษาไทย",
    "localName": "ชื่อท้องถิ่น / ชื่ออื่นๆ",
    "scientificName": "ชื่อวิทยาศาสตร์",
    "family": "ชื่อวงศ์พืช (Family)",
    "category": "รหัสหมวดหมู่ (เช่น fever, digestive, tonic...)",
    "description": "ลักษณะทางพฤกษศาสตร์โดยละเอียดของพืชชนิดนี้",
    "properties": ["สรรพคุณ 1", "สรรพคุณ 2", "สรรพคุณ 3"],
    "usage": "วิธีปรุงยา ส่วนที่ใช้รักษา และปริมาณการใช้",
    "precautions": "ข้อควรระวัง ผลข้างเคียง หรือกลุ่มคนที่ไม่ควรใช้",
    "location": "พิกัดแปลงที่คาดว่าควรปลูกในสวน",
    "images": ["ลิงก์รูปภาพ Unsplash ที่เกี่ยวข้อง"]
  },
  "quizzes": [
    {
      "question": "โจทย์คำถามประเมินความคิดเชิงลึก ข้อที่ 1",
      "answerScheme": "แนวเฉลยทางวิชาการสำหรับการตรวจของ AI ข้อที่ 1"
    },
    {
      "question": "โจทย์คำถามประเมินความคิดเชิงลึก ข้อที่ 2",
      "answerScheme": "แนวเฉลยทางวิชาการสำหรับการตรวจของ AI ข้อที่ 2"
    },
    {
      "question": "โจทย์คำถามประเมินความคิดเชิงลึก ข้อที่ 3",
      "answerScheme": "แนวเฉลยทางวิชาการสำหรับการตรวจของ AI ข้อที่ 3"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: PROMPT,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            herb: {
              type: Type.OBJECT,
              properties: {
                thaiName: { type: Type.STRING },
                localName: { type: Type.STRING },
                scientificName: { type: Type.STRING },
                family: { type: Type.STRING },
                category: { type: Type.STRING },
                description: { type: Type.STRING },
                properties: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                usage: { type: Type.STRING },
                precautions: { type: Type.STRING },
                location: { type: Type.STRING },
                images: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
              },
              required: ["thaiName", "localName", "scientificName", "family", "category", "description", "properties", "usage", "precautions", "location", "images"]
            },
            quizzes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answerScheme: { type: Type.STRING }
                },
                required: ["question", "answerScheme"]
              }
            }
          },
          required: ["herb", "quizzes"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("AI Knowledge Builder Error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error in AI Builder" });
  }
});

// --- AI ANALYTICS ENDPOINT ---
app.post("/api/gemini/analytics", async (req, res) => {
  try {
    const { gardenName, herbsList, quizzesCount, chatLogsCount, usersCount, scoresList } = req.body;

    const PROMPT = `
คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์ข้อมูลสมุนไพรและการเรียนรู้ของสวนพฤกษศาสตร์สมุนไพร
วิเคราะห์สถิติและการทำงานประจำสวนสมุนไพร "${gardenName || "ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข"}" และเขียนรายงานสรุปผลประเมินในรอบเดือน

ข้อมูลระบบที่ป้อนเข้ามา:
- สวนสมุนไพร: ${gardenName}
- จำนวนสมุนไพรทั้งหมดที่มีในระบบ: ${herbsList?.length || 0} ชนิด
- รายชื่อสมุนไพรเด่น: ${(herbsList || []).slice(0, 10).map((h: any) => h.thaiName).join(", ")}
- จำนวนข้อสอบประเมินความรู้ทั้งหมด: ${quizzesCount || 0} ข้อ
- จำนวนคำถามที่ผู้เรียนถาม AI (Chat logs): ${chatLogsCount || 0} ข้อความ
- จำนวนผู้เรียนที่เป็นสมาชิก: ${usersCount || 0} คน
- ประวัติสถิติคะแนนการสอบวัดความรู้: ${JSON.stringify(scoresList || [])}

โปรดเขียนวิเคราะห์สรุปผลข้อมูลเชิงลึกในรูปแบบ JSON โดยมีหัวข้อหลักดังนี้:
1. "summaryText": รายงานสรุปภาพรวมเชิงบริหารแบบกระชับ (2-3 บรรทัดภาษาไทย)
2. "popularHerbsText": สรุปความต้องการและระดับการเข้าชมสมุนไพรเด่นในชุมชน
3. "difficultTopicsText": วิเคราะห์ทักษะ/ความรู้ที่ผู้เรียนมักจะทำคะแนนได้น้อย หรือหัวข้อสมุนไพรที่ควรปรับปรุงเนื้อหาข้อสอบ
4. "aiRecommendationsText": ข้อเสนอแนะในการพัฒนาสวนสมุนไพร และหัวข้อคำถาม/แบบทดสอบเพิ่มในอนาคต

โครงสร้างคีย์ JSON ที่ส่งกลับ:
{
  "summaryText": "...",
  "popularHerbsText": "...",
  "difficultTopicsText": "...",
  "aiRecommendationsText": "..."
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: PROMPT,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryText: { type: Type.STRING },
            popularHerbsText: { type: Type.STRING },
            difficultTopicsText: { type: Type.STRING },
            aiRecommendationsText: { type: Type.STRING }
          },
          required: ["summaryText", "popularHerbsText", "difficultTopicsText", "aiRecommendationsText"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("AI Analytics Error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error in AI Analytics" });
  }
});

// --- VITE DEV SERVER / PRODUCTION SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode: Use Vite dev server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode: Serve built static files from 'dist' directory
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server running on http://0.0.0.0:${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

startServer();
