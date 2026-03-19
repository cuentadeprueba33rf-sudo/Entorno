import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, Loader2, Menu, Info, User, Globe, Image as ImageIcon, Plus, Mic, X, FileUp, MonitorUp, FileText, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  reasoning_details?: string | any;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const selectedModel = "stepfun/step-3.5-flash:free";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isPlusMenuOpen && !(e.target as Element).closest('.plus-menu-container')) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPlusMenuOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setIsPlusMenuOpen(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, model: selectedModel }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message;
      
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: assistantMessage.content,
        reasoning_details: assistantMessage.reasoning_details
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    setInput(action);
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInput((prev) => prev + (prev ? " " : "") + `[Archivo: ${file.name}]`);
      inputRef.current?.focus();
    }
    setIsPlusMenuOpen(false);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      // Simulate listening for 3 seconds
      setTimeout(() => {
        setIsListening(false);
        setInput((prev) => prev + (prev ? " " : "") + "¿Puedes ayudarme con esto?");
      }, 3000);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed md:relative z-50 w-[260px] h-full bg-[#171717] flex flex-col border-r border-white/10"
            >
              <div className="p-3 flex justify-between items-center">
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
                <button onClick={handleNewChat} className="flex-1 flex items-center gap-2 hover:bg-white/10 p-2 rounded-lg transition-colors text-sm font-medium">
                  <Bot className="w-5 h-5" />
                  Nuevo Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-xs font-semibold text-zinc-500 mb-2 px-2">Hoy</div>
                <button className="w-full text-left px-2 py-2 rounded-lg hover:bg-white/10 text-sm text-zinc-300 truncate">
                  Diseño de interfaz SAM
                </button>
              </div>
              <div className="p-3 border-t border-white/10">
                <button onClick={() => alert("Configuración de cuenta")} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 text-sm text-zinc-300">
                  <User className="w-5 h-5" />
                  Mi Cuenta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Menu className="w-5 h-5 text-zinc-400" />
              </button>
            )}
            <button 
              onClick={() => setIsAboutOpen(true)} 
              className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-xl text-sm text-zinc-300 transition-colors font-medium"
            >
              SAM IA <Info className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Cambiar idioma")} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Globe className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 scroll-smooth">
          <div className="max-w-3xl mx-auto pb-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold text-zinc-100 mb-8">¿En qué puedo ayudarte?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
                  <button onClick={() => handleActionClick("Crea una imagen de un paisaje futurista")} className="flex flex-col items-start gap-2 bg-[#2f2f2f] p-4 rounded-2xl hover:bg-[#3f3f3f] transition-colors text-left border border-transparent hover:border-white/10">
                    <ImageIcon className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm text-zinc-200 font-medium">Crea una imagen</span>
                    <span className="text-xs text-zinc-400">Genera arte visual con IA</span>
                  </button>
                  <button onClick={() => handleActionClick("Analiza esta imagen y describe lo que ves")} className="flex flex-col items-start gap-2 bg-[#2f2f2f] p-4 rounded-2xl hover:bg-[#3f3f3f] transition-colors text-left border border-transparent hover:border-white/10">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-zinc-200 font-medium">Analiza imágenes</span>
                    <span className="text-xs text-zinc-400">Sube una foto para analizar</span>
                  </button>
                  <button onClick={() => handleActionClick("Ayúdame a redactar un correo formal")} className="flex flex-col items-start gap-2 bg-[#2f2f2f] p-4 rounded-2xl hover:bg-[#3f3f3f] transition-colors text-left border border-transparent hover:border-white/10">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-zinc-200 font-medium">Redactar texto</span>
                    <span className="text-xs text-zinc-400">Escribe correos o ensayos</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-6">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      
                      <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        {msg.role === "user" ? (
                          <div className="bg-[#2f2f2f] text-zinc-100 px-5 py-3 rounded-3xl text-sm md:text-base whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="text-zinc-200 text-sm md:text-base leading-relaxed prose prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Pensando...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <div className="px-4 pb-4 md:pb-6 pt-2 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-[#2f2f2f] rounded-3xl border border-white/10 px-2 py-2 focus-within:border-white/20 transition-colors shadow-lg">
              
              {/* Plus Menu Container */}
              <div className="relative plus-menu-container">
                <button 
                  type="button" 
                  onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                  className={`p-2.5 rounded-full transition-colors ${isPlusMenuOpen ? 'bg-white/20 text-white' : 'text-zinc-400 hover:bg-white/10 hover:text-zinc-200'}`}
                >
                  <Plus className={`w-5 h-5 transition-transform ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isPlusMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-3 w-56 bg-[#2f2f2f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20 py-1"
                    >
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-zinc-200 flex items-center gap-3 transition-colors">
                        <FileUp className="w-4 h-4 text-blue-400" /> Subir archivo
                      </button>
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-zinc-200 flex items-center gap-3 transition-colors">
                        <ImageIcon className="w-4 h-4 text-emerald-400" /> Subir imagen
                      </button>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-zinc-200 flex items-center gap-3 transition-colors">
                        <MonitorUp className="w-4 h-4 text-purple-400" /> Tomar foto
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hidden File Inputs */}
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleFileUpload} />
              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileUpload} />

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Envía un mensaje a SAM..."
                className="flex-1 bg-transparent py-3 px-2 focus:outline-none text-zinc-100 placeholder:text-zinc-500 min-w-0"
                disabled={isLoading}
              />
              
              <div className="flex items-center gap-1 pr-1 pb-1">
                {!input.trim() ? (
                  <button 
                    type="button" 
                    onClick={toggleListening} 
                    className={`p-2.5 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-zinc-400 hover:bg-white/10 hover:text-zinc-200'}`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="p-2.5 bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-50 disabled:bg-zinc-600 disabled:text-zinc-400 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
            <p className="text-xs text-center text-zinc-500 mt-3">
              SAM puede cometer errores. Considera verificar la información importante.
            </p>
          </div>
        </div>
      </div>

      {/* About Modal */}
      <AnimatePresence>
        {isAboutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsAboutOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#2f2f2f] border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">SAM IA</h3>
                  <p className="text-xs text-zinc-400">Versión 2.0 • Nemotron 3.5</p>
                </div>
              </div>
              <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
                SAM es un asistente de inteligencia artificial avanzado diseñado para ayudarte con tareas creativas, análisis de datos y productividad diaria. Desarrollado con tecnología de vanguardia.
              </p>
              <button 
                onClick={() => setIsAboutOpen(false)} 
                className="w-full bg-white text-black font-medium py-2.5 rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
