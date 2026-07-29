export interface Garden {
  gardenId: string;          // "HATYAI001"
  name: string;              // "ศูนย์บริการสาธารณสุขหาดใหญ่ชีวาสุข"
  logo: string;              // Storage URL or fallback placeholder
  banner: string;            // Storage URL or fallback placeholder
  description: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  googleMap: string;         // Embed URL or map location
  herbCount: number;         // Auto-updated or manual count
  facebook?: string;
  website?: string;
  themeColor?: string;       // e.g. "teal", "emerald", "indigo", "rose"
  enableQuiz?: boolean;
  enableAI?: boolean;
  enableLeaderboard?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Herb {
  herbId: string;            // "HERB001"
  gardenId: string;          // "HATYAI001" ← FK
  thaiName: string;
  localName: string;
  scientificName: string;
  family: string;
  category: string;          // corresponding to HERBAL_CATEGORIES id
  description: string;
  properties: string[];      // ["ลดไข้", "แก้หวัด"]
  usage: string;
  precautions: string;
  images: string[];          // Image URLs
  location: string;          // "โซนแก้ไข้ ต้นที่ 5"
  locationMap: string;       // Google Map URL
  qrCode: string;            // QR Code URL (Base64 or external)
  reference: string[];       // ["ตำรับยาไทย", "งานวิจัย"]
  relatedHerbs: string[];    // herbId array
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  quizId: string;
  gardenId: string;          // "HATYAI001" ← FK
  herbId: string;            // FK
  category?: string;         // "โรคทั่วไปกับสมุนไพรใกล้ตัว" | "อาหารเป็นยาสมุนไพรในอาหาร" | "ยาสมุนไพรในท้องตลาด"
  question: string;
  answer: string;            // Correct answer
  options?: string[];        // 4 Multiple choices
  score: number;             // 1-5
  createdAt: string;
  updatedAt: string;
}

export interface VisitLog {
  logId: string;
  gardenId: string;
  page: string;
  timestamp: string;
}

export interface ScanLog {
  logId: string;
  gardenId: string;
  herbName?: string;
  timestamp: string;
}

export interface HerbViewLog {
  logId: string;
  gardenId: string;
  herbId: string;
  timestamp: string;
}

export interface User {
  userId: string;            // Firebase UID or guest UID
  email: string;
  displayName: string;
  photoURL: string;
  role: "user" | "admin";    // Claims synced
  gardenId: string;          // "HATYAI001"
  totalScore: number;
  completedHerbs: string[];  // herbId array
  level: "beginner" | "explorer" | "specialist" | "expert";
  levelProgress: number;     // % to next level
  createdAt: string;
  updatedAt: string;
}

export interface QuestionRecord {
  question: string;
  userAnswer: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
}

export interface LearningRecord {
  recordId: string;
  userId: string;            // FK
  gardenId: string;          // "HATYAI001" ← FK
  herbId: string;            // FK
  score: number;
  answered: boolean;
  date: string;
  questions: QuestionRecord[];
}

export interface Certificate {
  certificateId: string;
  userId: string;            // FK
  gardenId: string;          // "HATYAI001"
  gardenName: string;
  displayName: string;
  level: "beginner" | "explorer" | "specialist" | "expert";
  score: number;
  qrCode: string;            // verification link QR
  issuedAt: string;
}

export interface Announcement {
  announcementId: string;
  gardenId: string;          // "HATYAI001" ← FK
  title: string;
  content: string;
  image: string;
  priority: "normal" | "important" | "urgent";
  publishedAt: string;
  expiresAt: string;
}

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

export interface ChatLog {
  chatId: string;
  gardenId: string;          // "HATYAI001" ← FK
  userId: string;            // FK or anonymous
  sessionId: string;
  messages: ChatMessage[];
  herbId?: string;           // Optional context herb
  createdAt: string;
}

export interface HerbalCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}
