import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Menu, X, Calculator, Zap, BookOpen, Pencil, Send, Plus, Image, File, Camera, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showNotice, setShowNotice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const hasSeenNotice = localStorage.getItem('sam_notice_seen');
    // Simulate epic loading time
    const timer = setTimeout(() => {
      setIsAppLoading(false);
      if (!hasSeenNotice) {
        setShowNotice(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismissNotice = () => {
    localStorage.setItem('sam_notice_seen', 'true');
    setShowNotice(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMessage]
        }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.choices[0].message.content }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error al procesar la solicitud." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { icon: <BookOpen className="w-5 h-5 text-emerald-400" />, text: "Ayúdame a aprender", action: "Explícame un tema complejo" },
    { icon: <Zap className="w-5 h-5 text-yellow-400" />, text: "Potencia mi día", action: "Dame consejos de productividad" },
    { icon: <Pencil className="w-5 h-5 text-purple-400" />, text: "Escribe algo", action: "Escribe un ensayo sobre..." },
    { icon: <Calculator className="w-5 h-5 text-blue-400" />, text: "Math Solver", action: "Resuelve este problema matemático: " },
  ];

  return (
    <div className="flex h-[100dvh] bg-[#000000] text-zinc-100 font-sans overflow-hidden selection:bg-purple-500/30 relative">
      {/* Epic Loading Screen */}
      <AnimatePresence>
        {isAppLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Minimalist Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* Scanning light effect */}
            <motion.div
              animate={{ top: ['-10%', '110%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="flex items-center gap-6 md:gap-10">
                <motion.span 
                  initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}
                  className="text-zinc-700 text-6xl md:text-8xl font-light"
                >[</motion.span>
                
                <h1 className="text-7xl md:text-9xl font-black text-white tracking-[0.2em] drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  SAM
                </h1>

                <motion.span 
                  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}
                  className="text-zinc-700 text-6xl md:text-8xl font-light"
                >]</motion.span>
              </div>

              {/* Progress bar */}
              <div className="w-48 md:w-64 h-[1px] bg-zinc-800 mt-10 relative overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-white"
                />
              </div>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="text-zinc-500 mt-6 text-xs tracking-[0.4em] uppercase font-mono"
              >
                Inicializando
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Under Construction Notice */}
      <AnimatePresence>
        {showNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(255,255,255,0.05)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-600 via-zinc-200 to-zinc-600" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                  <Sparkles className="w-6 h-6 text-zinc-100" />
                </div>
                <h2 className="text-2xl font-semibold text-zinc-100">Aviso Importante</h2>
              </div>
              <p className="text-zinc-400 leading-relaxed mb-8">
                SAM IA sigue en <span className="text-zinc-100 font-medium">fase de construcción y desarrollo</span>. Es posible que algunas funciones sean inestables, estén limitadas o cambien en el futuro.
                <br/><br/>
                Gracias por ser parte de esta etapa épica.
              </p>
              <button
                onClick={handleDismissNotice}
                className="w-full py-4 bg-white text-black rounded-xl font-medium text-lg hover:bg-zinc-200 transition-colors active:scale-[0.98]"
              >
                Entendido, vamos allá
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle futuristic background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm" />
            <motion.div initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="absolute z-50 h-full w-[280px] bg-[#131314]/95 backdrop-blur-xl border-r border-white/5 p-4 flex flex-col shadow-2xl">
              <button onClick={() => setIsSidebarOpen(false)} className="self-end p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              <button onClick={() => { setMessages([]); setIsSidebarOpen(false); }} className="mt-6 flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"><Plus className="w-5 h-5" /> Nuevo Chat</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Menu className="w-6 h-6" /></button>
          <h1 className="text-xl font-medium tracking-wide flex items-center gap-2 text-zinc-200">
            SAM <Sparkles className="w-4 h-4 text-purple-400" />
          </h1>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-sm font-medium shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer hover:scale-105 transition-transform">S</div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-40 scroll-smooth scrollbar-hide">
          <div className="max-w-3xl mx-auto h-full flex flex-col">
            {messages.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-12 md:mt-24 flex-1">
                <h2 className="text-3xl md:text-4xl font-medium mb-2 text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">Hola, Sam</h2>
                <h1 className="text-4xl md:text-5xl font-semibold mb-12 text-zinc-100 tracking-tight">
                  ¿Por dónde empezamos?
                </h1>
                <div className="flex flex-col items-start gap-3">
                  {suggestions.map((s, i) => (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={i} onClick={() => setInput(s.action)} className="flex items-center gap-3 bg-[#131314] border border-white/5 px-5 py-3.5 rounded-full hover:bg-[#1e1e1f] transition-all duration-300 shadow-lg shadow-black/20">
                      {s.icon} <span className="text-sm font-medium text-zinc-300">{s.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {messages.map((msg, i) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    <div className={`py-2 rounded-3xl max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-[#1e1e1f] text-zinc-100 rounded-tr-sm px-4' : 'bg-transparent text-zinc-200 px-1'}`}>
                      <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#131314] prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 items-center text-zinc-500 px-1">
                    <span className="animate-pulse text-sm">SAM está pensando...</span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </main>

        {/* Input Area (Gemini style bottom sheet) */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#131314] rounded-t-[2rem] border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] p-4 md:p-6 z-20">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-transparent px-4 py-2 outline-none text-zinc-100 placeholder:text-zinc-500 text-lg"
                placeholder="Pregúntale a SAM"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 relative">
                  <button type="button" onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)} className="p-3 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-full transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>

                  <AnimatePresence>
                    {isPlusMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 mb-4 bg-[#1e1e1f]/95 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col gap-1 w-56 overflow-hidden"
                      >
                        <button type="button" onClick={() => { fileInputRef.current?.click(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-zinc-200 transition-colors"><Image className="w-5 h-5 text-blue-400" /> Subir Imagen</button>
                        <button type="button" onClick={() => { fileInputRef.current?.click(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-zinc-200 transition-colors"><File className="w-5 h-5 text-emerald-400" /> Subir Archivo</button>
                        <button type="button" onClick={() => { cameraInputRef.current?.click(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-zinc-200 transition-colors"><Camera className="w-5 h-5 text-purple-400" /> Abrir Cámara</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-white/10 text-zinc-300 rounded-full hover:bg-white/20 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => console.log(e.target.files)} />
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => console.log(e.target.files)} />
          </div>
        </div>
      </div>
    </div>
  );
}
