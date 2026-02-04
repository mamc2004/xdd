
import React, { useState, useEffect, useRef } from 'react';
import { Info, Copy, Check, BookOpen, Quote, MessageSquare, ChevronRight, Volume2, Loader2, BrainCircuit, FileText } from 'lucide-react';
import { generateTTS, decodeBase64, decodeAudioData } from '../services/geminiService';

interface ResponseBlockProps {
  content: string;
  thinking?: string;
  onFollowUpClick?: (question: string) => void;
}

const ResponseBlock: React.FC<ResponseBlockProps> = ({ content, thinking, onFollowUpClick }) => {
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [prefetchedAudio, setPrefetchedAudio] = useState<string | null>(null);
  const prefetchLock = useRef(false);

  // Phân tách nội dung theo cấu trúc headers mới
  const sections = content.split(/\*\*(NỘI DUNG THAM MƯU|CĂN CỨ TRI THỨC|CÂU HỎI GỢI Ý)\*\*/i);
  
  let mainContent = "";
  let sourceContent = "";
  let suggestionsRaw = "";

  for (let i = 1; i < sections.length; i += 2) {
    const header = sections[i].toUpperCase();
    const body = sections[i+1]?.trim();
    
    if (header.includes("NỘI DUNG")) mainContent = body;
    else if (header.includes("CĂN CỨ")) sourceContent = body;
    else if (header.includes("CÂU HỎI")) suggestionsRaw = body;
  }

  const textToSpeak = mainContent || content.trim();

  useEffect(() => {
    if (textToSpeak && textToSpeak.length > 10 && !prefetchedAudio && !prefetchLock.current) {
      prefetchLock.current = true;
      const prefetch = async () => {
        try {
          const audioData = await generateTTS(textToSpeak);
          if (audioData) setPrefetchedAudio(audioData);
        } catch (err) {
          console.error("Prefetch TTS Error:", err);
          prefetchLock.current = false;
        }
      };
      prefetch();
    }
  }, [textToSpeak, prefetchedAudio]);

  const suggestions = suggestionsRaw 
    ? suggestionsRaw.split('\n')
        .map(s => s.replace(/^[-*•\d.\s]+/, '').trim())
        .filter(s => s.length > 5)
        .slice(0, 3)
    : [];

  const handleCopy = async () => {
    const shareText = `THAM MƯU NGHIỆP VỤ ĐẢNG - NIÊM SƠN:\n\n${content}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Lỗi khi sao chép:", err);
    }
  };

  const handlePlayTTS = async () => {
    if (playing) return;
    setPlaying(true);
    
    let audioData = prefetchedAudio;
    if (!audioData) {
      audioData = await generateTTS(textToSpeak);
    }

    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setPlaying(false);
      source.start();
    } else {
      setPlaying(false);
    }
  };

  return (
    <div className="space-y-8 w-full animate-fadeIn pb-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center px-4">
        <span className="text-[11px] font-black text-[#B30000] uppercase tracking-[0.2em] italic flex items-center gap-2 bg-red-50 py-2 px-4 rounded-full border border-red-100">
          <FileText className="w-4 h-4" /> Phiếu tham mưu điện tử
        </span>
        <div className="flex gap-3">
          <button 
            onClick={handlePlayTTS}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-90 border-2 ${playing ? 'bg-red-600 border-amber-400 text-white' : 'bg-white border-red-100 text-[#B30000] hover:bg-red-50'}`}
          >
            {playing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
            <span className="text-[11px] font-black uppercase tracking-wider">{playing ? 'Đang đọc...' : 'Nghe Tham mưu'}</span>
          </button>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-white border-2 border-[#FFD700] rounded-2xl shadow-lg hover:shadow-xl hover:bg-[#FFF9F0] transition-all active:scale-90 text-[#B30000]"
          >
            {copied ? (
              <><Check className="w-4 h-4 text-green-600" /><span className="text-[11px] font-black uppercase tracking-wider text-green-600">Đã sao chép</span></>
            ) : (
              <><Copy className="w-4 h-4" /><span className="text-[11px] font-black uppercase tracking-wider">Sao chép văn bản</span></>
            )}
          </button>
        </div>
      </div>

      {/* Thinking Process */}
      {thinking && (
        <div className="bg-amber-50/50 border-2 border-amber-200 rounded-[32px] p-6 transition-all shadow-inner">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-5 h-5 text-amber-600" />
            <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-[0.15em]">Tiến trình phân tích nghiệp vụ Pro</h4>
          </div>
          <div className="text-slate-600 text-[12px] italic leading-relaxed whitespace-pre-wrap font-medium">
            {thinking}
          </div>
        </div>
      )}

      {/* Main Content Block - Deep Red & Gold Accent */}
      <div className="bg-white border-4 border-[#FFD700] shadow-[0_30px_60px_rgba(179,0,0,0.08)] rounded-[50px] overflow-hidden transition-all">
        <div className="bg-[#B30000] px-8 py-5 border-b-4 border-[#FFD700] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[#FFD700]" />
            <h3 className="font-black text-white uppercase tracking-tight text-sm md:text-base italic">
              Nội dung tham mưu chuyên môn
            </h3>
          </div>
          <div className="hidden sm:block h-2 w-2 bg-[#FFD700] rounded-full animate-pulse"></div>
        </div>
        <div className="p-10 text-slate-900 leading-[1.6] whitespace-pre-wrap text-base md:text-2xl font-black">
          {mainContent || "Hệ thống đang trích xuất dữ liệu nghiệp vụ..."}
        </div>
      </div>

      {/* Sources Block */}
      {sourceContent && (
        <div className="bg-[#FFF9F0] border-2 border-amber-200/50 rounded-[40px] p-8 transition-all shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Quote className="w-5 h-5 text-[#B30000]" />
            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em]">Căn cứ quy định & văn bản pháp lý</h4>
          </div>
          <div className="text-slate-700 text-sm md:text-base italic font-bold leading-relaxed whitespace-pre-wrap pl-6 border-l-4 border-[#B30000]">
            {sourceContent}
          </div>
        </div>
      )}

      {/* Interactive Suggestion Chips */}
      {suggestions.length > 0 && (
        <div className="pt-4 space-y-5">
          <div className="flex items-center gap-4 px-2">
            <div className="h-1 bg-[#FFD700]/30 flex-1 rounded-full"></div>
            <p className="text-[11px] font-black text-[#B30000] uppercase tracking-[0.3em] flex items-center gap-3 px-4">
              <MessageSquare className="w-4 h-4" /> Nghiệp vụ liên quan
            </p>
            <div className="h-1 bg-[#FFD700]/30 flex-1 rounded-full"></div>
          </div>
          <div className="flex flex-col gap-4">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => onFollowUpClick?.(s)}
                className="flex items-center justify-between gap-6 text-left p-6 bg-white hover:bg-red-50 border-2 border-slate-100 hover:border-[#B30000] rounded-[32px] transition-all group active:scale-[0.98] shadow-md hover:shadow-xl"
              >
                <span className="text-sm md:text-lg text-slate-800 font-black leading-tight group-hover:text-[#B30000] uppercase tracking-tight">
                  {s}
                </span>
                <div className="bg-red-50 text-[#B30000] p-3 rounded-2xl group-hover:bg-[#B30000] group-hover:text-white transition-all shadow-sm">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseBlock;
