import { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Menu, X, Calculator, Zap, BookOpen, Pencil, Send, Plus, Image as ImageIcon, File, Camera, Sparkles, Settings, Trash2, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string; // base64 image
}

type Personality = "professional" | "sarcastic" | "programmer" | "friend";

const PERSONALITY_PROMPTS = {
  professional: "Eres SAM IA. Eres un asistente útil, directo y profesional. Responde de manera concisa y clara.",
  sarcastic: "Eres SAM IA. Eres un asistente extremadamente sarcástico y un poco cínico, pero en el fondo ayudas. Usa humor negro y sarcasmo en tus respuestas.",
  programmer: "Eres SAM IA. Eres un ingeniero de software senior. Hablas con jerga técnica, eres directo y te enfocas en la eficiencia y el código limpio.",
  friend: "Eres SAM IA. Eres un amigo cercano, súper buena onda, usas emojis y lenguaje coloquial. Siempre estás ahí para apoyar."
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showNotice, setShowNotice] = useState(false);
  const [personality, setPersonality] = useState<Personality>("professional");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      localStorage.setItem('sam_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const hasSeenNotice = localStorage.getItem('sam_notice_seen');
    const savedHistory = localStorage.getItem('sam_chat_history');
    const savedPersonality = localStorage.getItem('sam_personality') as Personality;
    
    if (savedHistory) {
      try { setMessages(JSON.parse(savedHistory)); } catch (e) {}
    }
    if (savedPersonality && PERSONALITY_PROMPTS[savedPersonality]) {
      setPersonality(savedPersonality);
    }

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

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsPlusMenuOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val === '/') {
      setShowSlashCommands(true);
    } else if (!val.startsWith('/')) {
      setShowSlashCommands(false);
    }
  };

  const handleSlashCommand = (cmd: string) => {
    setInput(cmd + ' ');
    setShowSlashCommands(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback on send

    const userMessage: Message = { role: "user", content: input, image: selectedImage || undefined };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setSelectedImage(null);
    setShowSlashCommands(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          personality: PERSONALITY_PROMPTS[personality]
        }),
      });
      
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.choices[0].message.content }]);
      
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // Haptic feedback on completion

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error al procesar la solicitud con OpenRouter." }]);
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
              
              <div className="mt-auto mb-4">
                <button onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-all text-zinc-300">
                  <Settings className="w-5 h-5" /> Configuración
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#131314] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2"><Settings className="w-5 h-5"/> Configuración</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Personalidad de SAM</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['professional', 'sarcastic', 'programmer', 'friend'] as Personality[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPersonality(p);
                          localStorage.setItem('sam_personality', p);
                        }}
                        className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${personality === p ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' : 'bg-[#1e1e1f] border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        {p === 'professional' ? 'Profesional' : p === 'sarcastic' ? 'Sarcástico' : p === 'programmer' ? 'Programador' : 'Amigo'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
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
                      {msg.image && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-white/10 max-w-sm">
                          <img src={msg.image} alt="Uploaded" className="w-full h-auto" />
                        </div>
                      )}
                      <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#131314] prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '')
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  {...props}
                                  children={String(children).replace(/\n$/, '')}
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                />
                              ) : (
                                <code {...props} className={className}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
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

        {/* Input Area (Professional Elongated Bar) */}
        <div className="absolute bottom-6 left-4 right-4 md:left-auto md:right-auto md:w-full md:max-w-3xl md:mx-auto z-20">
          <div className="bg-[#1e1e1f] border border-white/10 rounded-full shadow-lg h-14 flex items-center px-2 md:px-4">
            
            {/* Slash Commands */}
            <AnimatePresence>
              {showSlashCommands && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 bg-[#1e1e1f] border border-white/10 rounded-2xl shadow-xl overflow-hidden w-64 z-50"
                >
                  <div className="p-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Comandos</div>
                  <button type="button" onClick={() => handleSlashCommand('/resumir')} className="w-full text-left px-4 py-2 hover:bg-white/5 text-zinc-200 flex items-center gap-2"><File className="w-4 h-4 text-blue-400"/> Resumir texto</button>
                  <button type="button" onClick={() => handleSlashCommand('/explicar')} className="w-full text-left px-4 py-2 hover:bg-white/5 text-zinc-200 flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-400"/> Explicar concepto</button>
                  <button type="button" onClick={() => handleSlashCommand('/codigo')} className="w-full text-left px-4 py-2 hover:bg-white/5 text-zinc-200 flex items-center gap-2"><Pencil className="w-4 h-4 text-purple-400"/> Escribir código</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 w-16 h-16 rounded-2xl overflow-hidden border border-white/10"
                >
                  <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-1 right-1 bg-black/50 p-1 rounded-full hover:bg-black/80 text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
              <button type="button" onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-full transition-colors">
                <Plus className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                className="flex-1 bg-transparent px-2 py-2 outline-none text-zinc-100 placeholder:text-zinc-500"
                placeholder="Pregúntale a SAM..."
              />

              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className="p-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <AnimatePresence>
              {isPlusMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full right-0 mb-4 bg-[#1e1e1f]/95 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col gap-1 w-56 overflow-hidden"
                >
                  <button type="button" onClick={() => { fileInputRef.current?.click(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-zinc-200 transition-colors"><ImageIcon className="w-5 h-5 text-blue-400" /> Subir Imagen</button>
                  <button type="button" onClick={() => { fileInputRef.current?.click(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-zinc-200 transition-colors"><File className="w-5 h-5 text-emerald-400" /> Subir Archivo</button>
                  <button type="button" onClick={() => { cameraInputRef.current?.click(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-zinc-200 transition-colors"><Camera className="w-5 h-5 text-purple-400" /> Abrir Cámara</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
