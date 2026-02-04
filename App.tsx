
import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Trash2, FileText, Loader2, Database, X, ChevronRight, BrainCircuit, Sparkles, ShieldCheck, Book, RotateCcw, AlertTriangle } from 'lucide-react';
import { callGeminiStream } from './services/geminiService';
import { Message } from './types';
import ResponseBlock from './components/ResponseBlock';
import { getAllFilesFromDB, saveFileToDB, deleteFileFromDB, addDeletedDefault, getDeletedDefaults, clearDeletedDefaults } from './services/dbService';
import { getAllFilesFromFirestore, saveFileToFirestore, deleteFileFromFirestore } from './services/remoteDbService';
import type { KnowledgeFile } from './services/remoteDbService';

const KNOWLEDGE_BASE_1 = {
  "id": "KB1",
  "title": "Tổ chức - Xây dựng Đảng",
  "docs": [
    "Kết luận 228-KL/TW (31/12/2025) - Bộ máy & Chính quyền 2 cấp",
    "Báo cáo 613-BC/BTCTW (29/12/2025) - Hoạt động hệ thống chính trị",
    "Quyết định 368-QĐ/TW (08/9/2025) - Chức danh lãnh đạo",
    "Kết luận 195-KL/TW (26/9/2025) - Chính quyền 2 cấp",
    "Quyết định 294-QĐ/TW (26/5/2025) - Điều lệ Đảng",
    "Hướng dẫn 04-HD/TW (31/12/2024) - Quy chế bầu cử",
    "Quyết định 366-QĐ/TW (30/8/2025) - Đánh giá xếp loại"
  ]
};

const KNOWLEDGE_BASE_2 = {
  "id": "KB2",
  "title": "Tuyên giáo - Dân vận",
  "docs": [
    "Chỉ thị 50-CT/TW (23/7/2025) - Sinh hoạt chi bộ",
    "Chỉ thị 51-CT/TW (08/8/2025) - Thẻ Đảng viên",
    "Hướng dẫn 31-HD/VPTW - Danh mục hồ sơ nghiệp vụ"
  ]
};

const KEYWORDS_KB1 = ["tổ chức", "bộ máy", "cán bộ", "bầu cử", "điều lệ", "xếp loại", "đánh giá", "bổ nhiệm", "chức danh", "quy định 294", "quy định 368", "hướng dẫn 04", "kết luận 195", "xây dựng đảng", "228-kl/tw", "613-bc/btctw", "nhân sự", "quy hoạch"];
const KEYWORDS_KB2 = ["sinh hoạt chi bộ", "thẻ đảng viên", "dân vận", "tuyên truyền", "đại hội", "chỉ thị 50", "chỉ thị 51", "hồ sơ", "văn thư", "tuyên giáo", "tư tưởng", "học tập", "đạo đức"];

const ADMIN_PASSWORD = "niemson2025";

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [deletedDefaults, setDeletedDefaults] = useState<string[]>([]);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Omit<KnowledgeFile, 'category' | 'addedAt'>[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const knowledgeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        const [filesFromFirestore, deleted] = await Promise.all([
          getAllFilesFromFirestore(),
          getDeletedDefaults()
        ]);
        setKnowledgeFiles(filesFromFirestore);
        setDeletedDefaults(deleted);
      } catch (e) {
        console.error("Lỗi khởi tạo dữ liệu:", e);
      }
    };
    loadKnowledge();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (adminPassInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassInput('');
      showToast("Xác thực thành công", "success");
    } else {
      showToast("Mật khẩu sai", "error");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const classifyFile = (name: string): 'KB1' | 'KB2' | null => {
    const lowerName = name.toLowerCase();
    const isKB1 = KEYWORDS_KB1.some(kw => lowerName.includes(kw));
    const isKB2 = KEYWORDS_KB2.some(kw => lowerName.includes(kw));
    if (isKB1 && !isKB2) return 'KB1';
    if (isKB2 && !isKB1) return 'KB2';
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Supported MIME types by Gemini API
    const SUPPORTED_MIME_TYPES = [
      'application/pdf',
      'text/plain',
      'text/html',
      'text/csv',
      'text/xml',
      'text/markdown',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/x-icon',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'video/mp4',
      'video/mpeg',
      'video/webm'
    ];

    let validCount = 0;
    const newPending: Omit<KnowledgeFile, 'category' | 'addedAt'>[] = [];
    const autoAdded: KnowledgeFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mimeType = file.type || 'application/octet-stream';
      
      // Check if MIME type is supported
      if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
        showToast(`❌ Không hỗ trợ: ${file.name} (${mimeType})`, "error");
        continue;
      }
      
      validCount++;
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve((event.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const fileData = {
        name: file.name,
        mimeType: mimeType,
        data: base64
      };

      const category = classifyFile(file.name);
      if (category) {
        const fullFile: KnowledgeFile = { ...fileData, category, addedAt: Date.now() };
        const fileId = await saveFileToFirestore(fullFile);
        autoAdded.push({ ...fullFile, id: fileId });
      } else {
        newPending.push(fileData);
      }
    }

    if (validCount === 0) {
      showToast("❌ Không có tệp được hỗ trợ", "error");
      e.target.value = '';
      return;
    }

    if (autoAdded.length > 0) {
      setKnowledgeFiles(prev => [...prev, ...autoAdded]);
    }
    if (newPending.length > 0) {
      setPendingFiles(prev => [...prev, ...newPending]);
    } else {
      showToast(`✅ Đã ghi nhớ tri thức`, "success");
    }
    e.target.value = '';
  };

  const finalizeClassification = async (category: 'KB1' | 'KB2') => {
    if (pendingFiles.length > 0) {
      const currentFile = pendingFiles[0];
      const fullFile: KnowledgeFile = { ...currentFile, category, addedAt: Date.now() };
      try {
        const fileId = await saveFileToFirestore(fullFile);
        setKnowledgeFiles(prev => [...prev, { ...fullFile, id: fileId }]);
      } catch (e) {
        // Fallback to local DB if Firestore fails
        await saveFileToDB(fullFile);
        setKnowledgeFiles(prev => [...prev, fullFile]);
      }
      setPendingFiles(prev => prev.slice(1));
    }
  };

  const handleDeleteFile = async (fileId: string | undefined) => {
    if (!fileId) return;
    if (!confirm('Xác nhận xóa tệp tri thức này khỏi hệ thống?')) return;
    try {
      await deleteFileFromFirestore(fileId);
      setKnowledgeFiles(prev => prev.filter(f => f.id !== fileId));
      showToast("Đã xóa tệp tri thức", "success");
    } catch (e) {
      showToast("Lỗi khi xóa tệp", "error");
    }
  };

  const handleDeleteDefault = async (name: string) => {
    if (!confirm('Xác nhận ẩn văn bản hệ thống này do đã lỗi thời?')) return;
    await addDeletedDefault(name);
    setDeletedDefaults(prev => [...prev, name]);
    showToast("Đã loại bỏ văn bản lỗi thời", "info");
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('Bạn có muốn khôi phục lại toàn bộ các văn bản mặc định đã bị xóa?')) return;
    await clearDeletedDefaults();
    setDeletedDefaults([]);
    showToast("Đã khôi phục dữ liệu gốc", "success");
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;
    
    const currentInput = textToSend;
    setMessages(prev => [...prev, { role: 'user', text: currentInput }, { role: 'model', text: "" }]);
    setInput('');
    setLoading(true);

    try {
      await callGeminiStream(
        currentInput, 
        messages, 
        knowledgeFiles,
        isPro,
        (fullText, thinking) => {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIdx = newMessages.length - 1;
            if (lastIdx >= 0) newMessages[lastIdx] = { ...newMessages[lastIdx], text: fullText, thinking };
            return newMessages;
          });
          setLoading(false);
        }
      );
    } catch (error: any) {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        newMessages[lastIdx] = { 
          role: 'model', 
          text: `**NỘI DUNG THAM MƯU**\nLỗi hệ thống: ${error.message || "Không thể kết nối AI"}.\n\n**HƯỚNG DẪN KHẮC PHỤC TRÊN LOCALHOST:**\n1. Kiểm tra API Key trong file \`index.html\` xem đã chính xác chưa (Key thường bắt đầu bằng AIza...).\n2. Đảm bảo model \`gemini-3-flash-preview\` đã khả dụng với Key của bạn.\n3. Nếu thấy lỗi 'User location not supported', hãy thử sử dụng VPN.\n\n**CĂN CỨ TRI THỨC**\nHệ thống tham mưu số Niêm Sơn.` 
        };
        return newMessages;
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FFF9F0] relative overflow-hidden text-slate-800">
      {toast && (
        <div className={`fixed bottom-40 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-8 py-4 rounded-full shadow-2xl border-2 animate-fadeIn transition-all ${
          toast.type === 'success' ? 'bg-green-600 border-green-300 text-white' : 
          toast.type === 'error' ? 'bg-red-600 border-red-300 text-white' : 'bg-blue-600 border-blue-300 text-white'
        }`}>
          <span className="font-black uppercase text-[12px] tracking-widest">{toast.message}</span>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 bg-red-950/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full overflow-hidden border-4 border-[#FFD700]">
            <div className="bg-[#B30000] p-8 text-white text-center">
              <h2 className="text-xl font-black uppercase">Xác thực Admin</h2>
            </div>
            <form onSubmit={handleAdminLogin} className="p-8 space-y-6">
              <input 
                type="password" 
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
                placeholder="Mật khẩu..."
                className="w-full p-5 bg-slate-50 border-2 rounded-2xl text-center text-xl font-black"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 py-4 text-slate-400 font-black text-[11px] uppercase">Hủy</button>
                <button type="submit" className="flex-[2] bg-[#B30000] text-white py-4 rounded-2xl font-black text-[12px] uppercase">Vào</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="fixed inset-0 bg-red-950/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden border-4 border-[#FFD700]">
            <div className="bg-[#B30000] p-8 text-white text-center">
              <h2 className="text-xl font-black uppercase">Phân loại tệp ({pendingFiles.length})</h2>
              <p className="text-xs font-bold truncate mt-2">{pendingFiles[0].name}</p>
            </div>
            <div className="p-8 space-y-4">
              <button onClick={() => finalizeClassification('KB1')} className="w-full p-5 bg-red-50 hover:bg-white border-2 border-red-200 rounded-[32px] font-black text-[#B30000] uppercase">Tổ chức - Xây dựng Đảng</button>
              <button onClick={() => finalizeClassification('KB2')} className="w-full p-5 bg-blue-50 hover:bg-white border-2 border-blue-200 rounded-[32px] font-black text-blue-900 uppercase">Tuyên giáo - Dân vận</button>
              <button onClick={() => setPendingFiles(prev => prev.slice(1))} className="w-full py-3 text-slate-400 font-black text-[11px] uppercase">Bỏ qua</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-[#B30000] text-white py-5 px-6 md:px-12 shadow-xl border-b-4 border-[#FFD700] flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-5">
          <div className="bg-[#FFD700] p-2.5 rounded-2xl animate-bounce-subtle">
            <Sparkles className="h-6 w-6 text-[#B30000]" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black tracking-tight uppercase leading-none">TRỢ LÝ NGHIỆP VỤ BAN XÂY DỰNG ĐẢNG</h1>
            <p className="text-[10px] md:text-xs text-[#FFD700] font-black italic uppercase tracking-wider mt-1">Xã Niêm Sơn - 2026 {isAdmin && "| CHẾ ĐỘ QUẢN TRỊ"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsPro(!isPro)} className={`px-5 py-3 rounded-2xl font-black text-[11px] uppercase transition-all shadow-xl ${isPro ? 'bg-amber-500 text-white' : 'bg-red-800 text-red-200'}`}>
            <BrainCircuit className="w-4 h-4 inline mr-2" /> {isPro ? 'PRO' : 'FLASH'}
          </button>
          <button onClick={() => setShowKnowledgeBase(true)} className="relative flex items-center gap-2 bg-[#FFD700] text-[#B30000] px-5 py-3 rounded-2xl font-black text-[11px] uppercase shadow-xl">
            <Database className="w-4 h-4" /> KHO TRI THỨC
            {knowledgeFiles.length > 0 && <div className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-white animate-pulse">{knowledgeFiles.length}</div>}
          </button>
        </div>
      </header>

      <div className={`fixed inset-y-0 right-0 w-80 md:w-[520px] bg-white shadow-[-30px_0_60px_rgba(0,0,0,0.15)] z-[100] transform transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border-l-4 border-[#FFD700] flex flex-col ${showKnowledgeBase ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 bg-[#B30000] text-white flex items-center justify-between border-b-2 border-amber-500/30">
          <div className="flex flex-col">
            <h2 className="font-black uppercase flex items-center gap-3 text-sm italic">
              <Book className="w-5 h-5 text-[#FFD700]" /> DANH MỤC VĂN BẢN SỐ
            </h2>
            <span className="text-[10px] font-bold text-green-200 uppercase mt-1 tracking-widest">Dữ liệu IndexedDB bền vững</span>
          </div>
          <button onClick={() => setShowKnowledgeBase(false)} className="bg-red-800/50 p-3 rounded-[20px] hover:bg-white hover:text-red-700 transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide bg-[#FFFBF5]">
          <section className="bg-[#B30000] rounded-[32px] p-6 text-white shadow-2xl">
            <h3 className="text-xs font-black uppercase text-[#FFD700] mb-4">Quản lý nghiệp vụ</h3>
            <div className="space-y-4">
              {!isAdmin ? (
                <button onClick={() => setShowAdminLogin(true)} className="w-full bg-[#FFD700] text-[#B30000] px-4 py-3 rounded-xl font-black uppercase text-[11px] flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Xác thực Admin
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400 font-black uppercase text-[10px]"><ShieldCheck className="w-4 h-4" /> Đang ở chế độ Admin</div>
                  {deletedDefaults.length > 0 && (
                    <button onClick={handleRestoreDefaults} className="w-full bg-amber-500/20 text-amber-600 border border-amber-500/30 px-4 py-2 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2">
                      <RotateCcw className="w-3 h-3" /> Khôi phục dữ liệu gốc
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {[KNOWLEDGE_BASE_1, KNOWLEDGE_BASE_2].map((kb, i) => (
            <section key={kb.id} className="space-y-6">
              <div className="flex items-center justify-between border-b-4 border-[#FFD700]/30 pb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{kb.title}</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase">
                  SL: {(kb.docs.filter(d => !deletedDefaults.includes(d)).length) + knowledgeFiles.filter(f => f.category === kb.id as 'KB1' | 'KB2').length}
                </span>
              </div>
              <div className="grid gap-3">
                {/* Văn bản tải lên (IndexedDB) */}
                {knowledgeFiles.filter(f => f.category === kb.id as 'KB1' | 'KB2').sort((a,b) => b.addedAt - a.addedAt).map((file, idx) => (
                   <div key={idx} className="flex items-center gap-4 p-5 bg-white border-2 border-red-200 rounded-[24px] shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-[#FFD700] text-[#B30000] text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">INDEXEDDB</div>
                    <FileText className="w-5 h-5 text-red-600" />
                    <div className="flex-1 min-w-0">
                       <span className="text-[11px] font-black text-red-900 uppercase truncate block">{file.name}</span>
                       <span className="text-[8px] text-slate-400 font-bold uppercase">{new Date(file.addedAt).toLocaleDateString()}</span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDeleteFile((file as any).id)} className="text-red-300 hover:text-red-600 p-2.5 transition-all bg-red-50 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                   </div>
                ))}
                
                {/* Văn bản hệ thống (Mặc định) */}
                {kb.docs.filter(doc => !deletedDefaults.includes(doc)).map((doc, idx) => (
                  <div key={`def-${idx}`} className="flex items-center gap-4 p-5 bg-white rounded-[24px] border-2 border-slate-100 hover:border-[#FFD700] transition-all group">
                    <div className={`w-1.5 h-6 rounded-full flex-shrink-0 ${i === 0 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <span className="flex-1 text-[11px] font-black text-slate-700 leading-tight uppercase">{doc}</span>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteDefault(doc)} 
                        title="Xóa văn bản lỗi thời"
                        className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-red-600 p-2.5 transition-all bg-slate-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                {kb.docs.filter(d => !deletedDefaults.includes(d)).length === 0 && knowledgeFiles.filter(f => f.category === kb.id as 'KB1' | 'KB2').length === 0 && (
                  <div className="p-10 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                    <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Danh mục này hiện đang trống</p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
        
        {isAdmin && (
          <div className="p-8 border-t-4 border-[#FFD700] bg-white">
            <input type="file" ref={knowledgeInputRef} onChange={handleFileUpload} className="hidden" multiple />
            <button onClick={() => knowledgeInputRef.current?.click()} className="w-full bg-[#B30000] text-white py-5 rounded-[32px] font-black uppercase flex items-center justify-center gap-4 hover:bg-red-800 shadow-xl transition-all">
              <Upload className="w-5 h-5" /> NẠP TRI THỨC MỚI
            </button>
          </div>
        )}
      </div>
      
      {showKnowledgeBase && <div className="fixed inset-0 bg-red-950/20 backdrop-blur-[4px] z-[90]" onClick={() => setShowKnowledgeBase(false)} />}

      <main className="flex-1 overflow-y-auto w-full flex flex-col items-center scroll-smooth pb-12 pt-8">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[85vh] w-full px-6 py-10 animate-fadeIn">
            <div className="bg-white p-12 md:p-24 rounded-[100px] shadow-2xl border-4 border-[#FFD700] w-full max-w-7xl relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#B30000] text-[#FFD700] px-14 py-3.5 rounded-full text-[12px] font-black uppercase border-4 border-white z-10 italic">HÀNH ĐỘNG - KỶ CƯƠNG - SÁNG TẠO</div>
              <div className="flex flex-col lg:flex-row gap-20 items-center">
                <div className="flex-1 text-center lg:text-left space-y-10">
                  <div className="inline-flex p-8 bg-red-50 rounded-[50px] border-4 border-[#FFD700]/30 shadow-inner"><Sparkles className="w-24 h-24 text-[#B30000]" /></div>
                  <h2 className="text-5xl md:text-8xl font-black text-slate-900 uppercase tracking-tighter leading-[0.9]">Trợ lý <br/> <span className="text-[#B30000]">Nghiệp vụ Đảng</span></h2>
                  <p className="text-slate-500 text-sm md:text-lg font-bold uppercase border-l-4 border-[#FFD700] pl-6 italic">Hệ thống tham mưu số xã Niêm Sơn 2026. Hỗ trợ cập nhật và loại bỏ văn bản lỗi thời tức thì.</p>
                </div>
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                  {["Hướng dẫn bầu cử Chi bộ 2025?", "Tiêu chuẩn xếp loại Đảng viên?", "Quy trình kết nạp Đảng viên?", "Nội dung sinh hoạt Chi bộ mới?"].map((q, i) => (
                    <button key={i} onClick={() => handleSend(q)} className="p-10 bg-[#FFF9F0] hover:bg-white rounded-[50px] border-2 border-[#FFD700]/20 hover:border-[#B30000] transition-all text-left font-black uppercase text-xs tracking-tight group">
                      <ChevronRight className="w-6 h-6 mb-4 text-[#B30000] group-hover:rotate-90 transition-transform" /> {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="w-full px-6 md:px-16 lg:px-32 py-12 space-y-16 max-w-[1700px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn w-full`}>
                {m.role === 'user' ? (
                  <div className="max-w-[80%] bg-[#B30000] text-white p-10 rounded-[60px] rounded-tr-xl shadow-xl border-b-[10px] border-red-950/30 font-black text-sm md:text-xl">
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                ) : (
                  <div className="w-full">{m.text ? <ResponseBlock content={m.text} thinking={m.thinking} onFollowUpClick={handleSend} /> : null}</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-pulse w-full">
                <div className="bg-white p-10 rounded-[60px] shadow-2xl border-2 border-red-50 flex items-center gap-10">
                  <Loader2 className="w-14 h-14 animate-spin text-[#B30000]" />
                  <span className="text-[#B30000] font-black text-base uppercase tracking-tight italic">AI ĐANG TRUY XUẤT TRI THỨC NGHIỆP VỤ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-24" />
          </div>
        )}
      </main>

      <footer className="bg-white p-8 md:px-16 shadow-inner z-40 w-full border-t-4 border-[#FFD700]">
        <div className="w-full max-w-[1700px] mx-auto relative group shadow-2xl rounded-[50px] border-4 border-slate-100 focus-within:border-[#B30000] transition-all">
          <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
            placeholder="Nhập yêu cầu nghiệp vụ Đảng tại đây..." 
            className="w-full p-10 pr-32 rounded-[50px] focus:outline-none resize-none h-28 md:h-36 font-black text-lg md:text-2xl scrollbar-hide bg-white" 
          />
          <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="absolute right-6 bottom-6 p-7 bg-[#B30000] text-[#FFD700] rounded-[32px] hover:bg-red-800 disabled:bg-slate-200 shadow-xl active:scale-90 transition-all border-b-8 border-red-950">
            <Send className="w-8 h-8" />
          </button>
        </div>
      </footer>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-bounce-subtle { animation: bounce-subtle 3s infinite ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default App;
