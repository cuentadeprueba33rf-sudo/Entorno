import { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Menu, X, Calculator, Zap, BookOpen, Pencil, Send, Plus, Image as ImageIcon, File, Camera, Sparkles, Settings, Trash2, Copy, Check, Volume2, Maximize2, Minimize2, Layout, HelpCircle, Trophy, ArrowRight, RotateCcw, LogOut, Clock, ShieldCheck, History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { GoogleGenAI, Type } from "@google/genai";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string; // base64 image
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

type Personality = "professional" | "sarcastic" | "programmer" | "friend";
type AppMode = 'chat' | 'canvas' | 'quiz';

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
  const [settingsTab, setSettingsTab] = useState<'general' | 'updates'>('general');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [mode, setMode] = useState<AppMode>('chat');
  const [canvasCode, setCanvasCode] = useState<string>("");
  const [canvasView, setCanvasView] = useState<'chat' | 'preview'>('preview');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [quizTopic, setQuizTopic] = useState("");
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [isExitQuizModalOpen, setIsExitQuizModalOpen] = useState(false);
  const [isQuizSetupOpen, setIsQuizSetupOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

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

    // Simulate optimal loading time
    const timer = setTimeout(() => {
      setIsAppLoading(false);
      if (!hasSeenNotice) {
        setShowNotice(true);
      }
    }, 2000);
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

  const generateQuiz = async (topic: string, count: number) => {
    setQuizTopic(topic);
    setIsGeneratingQuiz(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Eres un experto en educación. Genera un cuestionario de alta calidad con ${count} preguntas sobre el tema: "${topic}". 
        Las preguntas deben ser desafiantes pero justas, de opción múltiple con exactamente 4 opciones cada una.
        Asegúrate de que solo una opción sea correcta.
        Incluye una explicación detallada de por qué la respuesta es correcta para ayudar al aprendizaje.
        Responde estrictamente en formato JSON con la siguiente estructura:
        [{ "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0, "explanation": "..." }]`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "4 opciones de respuesta"
                },
                correctAnswer: { 
                  type: Type.INTEGER,
                  description: "Índice de la respuesta correcta (0-3)"
                },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation"]
            }
          }
        }
      });

      const questions = JSON.parse(response.text);
      setQuizQuestions(questions);
      setQuizTopic(topic);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setIsQuizFinished(false);
      setMode('quiz');
    } catch (error) {
      console.error("Error generating quiz:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, no pude generar el cuestionario en este momento. Inténtalo de nuevo." }]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback on send

    const userMessage: Message = { role: "user", content: input, image: selectedImage || undefined };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const currentInput = input;
    setInput("");
    setSelectedImage(null);
    setShowSlashCommands(false);
    setIsLoading(true);

    // Check for Quiz trigger
    if (currentInput.toLowerCase().includes('cuestionario') || currentInput.toLowerCase().includes('quiz')) {
      // Try to extract topic and count
      const countMatch = currentInput.match(/(\d+)\s*preguntas/i);
      const count = countMatch ? parseInt(countMatch[1]) : 5;
      const topic = currentInput.replace(/cuestionario|quiz|\d+\s*preguntas/gi, '').trim() || "Cultura General";
      
      await generateQuiz(topic, count);
      return;
    }

    try {
      const systemPrompt = mode === 'canvas' 
        ? `${PERSONALITY_PROMPTS[personality]}\nIMPORTANTE: Estás en MODO CANVAS. Tu objetivo es escribir código funcional (HTML/CSS/JS) que se pueda previsualizar. Responde ÚNICAMENTE con el bloque de código necesario. No des explicaciones en el chat.`
        : PERSONALITY_PROMPTS[personality];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          personality: systemPrompt
        }),
      });
      
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      
      const data = await response.json();
      const assistantContent = data.choices[0].message.content;

      if (mode === 'canvas') {
        const codeMatch = assistantContent.match(/```(?:html|javascript|typescript|css|jsx|tsx)?\n([\s\S]*?)```/) || 
                          assistantContent.match(/```([\s\S]*?)```/);
        const extractedCode = codeMatch ? codeMatch[1] : assistantContent;
        setCanvasCode(extractedCode);
        setMessages((prev) => [...prev, { role: "assistant", content: "✨ Código generado en el Sandbox." }]);
        if (window.innerWidth < 768) setCanvasView('preview');
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
        if (isVoiceEnabled) {
          const utterance = new SpeechSynthesisUtterance(assistantContent);
          utterance.lang = 'es-ES';
          window.speechSynthesis.speak(utterance);
        }
      }
      
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
    { icon: <Trophy className="w-5 h-5 text-yellow-400" />, text: "Hazme un cuestionario", action: "Cuestionario de 5 preguntas sobre cultura general" },
    { icon: <Calculator className="w-5 h-5 text-blue-400" />, text: "Math Solver", action: "Resuelve este problema matemático: " },
  ];

  return (
    <div className="flex h-[100dvh] bg-[#000000] text-zinc-100 font-sans overflow-hidden selection:bg-purple-500/30 relative">
      {/* Optimal Minimalist Loading Screen */}
      <AnimatePresence>
        {isAppLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(20px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] bg-[#000000] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Subtle Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px]" />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              {/* SAM Animated Logo - Neural Core Style */}
              <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
                {/* Outer Pulsing Rings */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.1, 0.05, 0.1]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 border border-purple-500/30 rounded-full"
                />
                <motion.div
                  animate={{ 
                    scale: [1.2, 0.8, 1.2],
                    opacity: [0.05, 0.1, 0.05]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 border border-blue-500/20 rounded-full"
                />

                {/* The Core Morphing Shape */}
                <div className="relative w-16 h-16">
                  <motion.div
                    animate={{ 
                      borderRadius: ["40% 60% 60% 40% / 40% 40% 60% 60%", "60% 40% 40% 60% / 60% 60% 40% 40%", "40% 60% 60% 40% / 40% 40% 60% 60%"],
                      rotate: [0, 90, 180, 270, 360],
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-blue-500 to-emerald-400 opacity-80 blur-[2px] shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                  />
                  
                  {/* Inner Core Sparkle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ 
                        scale: [0.8, 1.1, 0.8],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                    </motion.div>
                  </div>
                </div>

                {/* Orbiting Particles */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotate: 360 
                    }}
                    transition={{ 
                      duration: 3 + i, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="absolute inset-0"
                  >
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]"
                    />
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold tracking-[0.5em] text-white uppercase"
                >
                  SAM
                </motion.h1>
                
                <div className="flex items-center gap-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: 100 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="h-[1px] bg-gradient-to-r from-transparent via-zinc-500 to-transparent"
                  />
                </div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-[10px] font-medium text-zinc-500 tracking-[0.3em] uppercase"
                >
                  Neural Interface Active
                </motion.p>
              </div>
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
              
              <div className="mt-8 flex-1 overflow-y-auto pr-2 space-y-8 scrollbar-hide">
                {/* Sidebar content simplified */}
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
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

              <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
                <button 
                  onClick={() => setSettingsTab('general')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${settingsTab === 'general' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  General
                </button>
                <button 
                  onClick={() => setSettingsTab('updates')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${settingsTab === 'updates' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Actualizaciones
                </button>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {settingsTab === 'general' ? (
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
                ) : (
                  <div className="space-y-6">
                    {/* Future Updates Section */}
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-2">
                        <History className="w-3 h-3" /> Próximas Funciones
                      </h3>
                      <div className="space-y-3">
                        {[
                          { name: "Modo Tutor", version: "1.0.00v", date: "19 marzo", active: true },
                          { name: "Generar Cuestionarios", version: "1.0.40v", date: "19 marzo", active: true },
                          { name: "Investigación Profunda", version: "1.0.20v", date: "20 marzo", active: false },
                          { name: "Creación de Imágenes", version: "1.0.30v", date: "22 marzo", active: false },
                          { name: "Búsqueda en Internet", version: "1.3.01v", date: "24 marzo", active: false },
                          { name: "Generar Diapositivas/PDF", version: "1.07.1", date: "24 marzo", active: false },
                        ].map((update, idx) => (
                          <div key={idx} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className={`text-xs font-medium ${update.active ? 'text-zinc-200' : 'text-zinc-500'}`}>{update.name}</span>
                              {update.active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-600">
                              <span>{update.version}</span>
                              <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {update.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Usage Limits Section */}
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> Límites de Uso
                      </h3>
                      <div className="grid gap-2">
                        {[
                          { name: "Generación de Imagen", limit: "12 tokens/día" },
                          { name: "Cuestionarios", limit: "Sin límites" },
                          { name: "Investigación Profunda", limit: "3 tokens/día" },
                          { name: "Búsqueda en Internet", limit: "Sin límites" },
                          { name: "Modo Tutor", limit: "Sin límites" },
                          { name: "Diapositivas/PDF", limit: "5 tokens/día" },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                            <span className="text-[11px] text-zinc-400">{item.name}</span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded-md">{item.limit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Quiz Confirmation Modal */}
      <AnimatePresence>
        {isExitQuizModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#131314] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-semibold text-zinc-100 mb-4">¿Salir del cuestionario?</h2>
              <p className="text-zinc-400 mb-6">Perderás todo tu progreso actual en este cuestionario.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsExitQuizModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-100 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setMode('chat');
                    setIsExitQuizModalOpen(false);
                    setQuizQuestions([]);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Salir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Setup Modal */}
      <AnimatePresence>
        {isQuizSetupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#131314] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-400" /> Nuevo Cuestionario
                </h2>
                <button onClick={() => setIsQuizSetupOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Tema del cuestionario</label>
                  <input 
                    type="text"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder="Ej: Historia, Ciencia, Cine..."
                    className="w-full bg-[#1e1e1f] border border-white/5 rounded-xl p-3 text-zinc-100 outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Número de preguntas: {quizQuestionCount}</label>
                  <input 
                    type="range"
                    min="3"
                    max="15"
                    step="1"
                    value={quizQuestionCount}
                    onChange={(e) => setQuizQuestionCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                    <span>3</span>
                    <span>15</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (quizTopic.trim()) {
                      generateQuiz(quizTopic, quizQuestionCount);
                      setIsQuizSetupOpen(false);
                    }
                  }}
                  disabled={!quizTopic.trim() || isLoading}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? 'Generando...' : 'Comenzar Cuestionario'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative z-10">
        {/* Precision Minimalist Floating Header */}
        <header className="absolute top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="h-12 px-2 bg-[#0a0a0a]/40 backdrop-blur-2xl border border-white/10 rounded-full flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] pointer-events-auto"
          >
            {/* Menu Button */}
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-[1px] h-4 bg-white/10 mx-1" />

            {/* Brand Identity */}
            <div className="flex items-center gap-3 px-2 cursor-default group">
              <h1 className="text-sm font-semibold tracking-[0.2em] text-zinc-100">
                SAM
              </h1>
              <div className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400/40 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
              </div>
            </div>

            <div className="w-[1px] h-4 bg-white/10 mx-1" />

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-95"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center group cursor-pointer hover:border-white/20 transition-all overflow-hidden">
                <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-100 transition-colors">S</span>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Chat Area / Canvas Area / Quiz Area */}
        <main className="flex-1 overflow-hidden flex relative pt-20">
          {isGeneratingQuiz && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8"
            >
              <div className="relative mb-8">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 rounded-full border-t-2 border-b-2 border-purple-500/50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2 tracking-tight">Preparando tu Cuestionario</h2>
              <p className="text-zinc-500 max-w-xs mx-auto text-sm leading-relaxed">
                SAM está diseñando preguntas personalizadas sobre <span className="text-purple-400 font-medium">{quizTopic}</span> para poner a prueba tus conocimientos.
              </p>
              
              <div className="mt-12 flex gap-1">
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-purple-500 rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 bg-purple-500 rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 bg-purple-500 rounded-full" />
              </div>
            </motion.div>
          )}

          {mode === 'quiz' ? (
            <div className="flex-1 bg-[#000000] flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
              <div className="max-w-2xl w-full">
                {!isQuizFinished ? (
                  <motion.div 
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                          <HelpCircle className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">Pregunta {currentQuestionIndex + 1} de {quizQuestions.length}</h2>
                          <p className="text-zinc-300 font-medium">{quizTopic}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsExitQuizModalOpen(true)}
                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <LogOut className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mb-8">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                      />
                    </div>

                    <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 leading-tight">
                      {quizQuestions[currentQuestionIndex]?.question}
                    </h1>

                    <div className="grid gap-3">
                      {quizQuestions[currentQuestionIndex]?.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const newAnswers = [...userAnswers, idx];
                            setUserAnswers(newAnswers);
                            if (currentQuestionIndex < quizQuestions.length - 1) {
                              setCurrentQuestionIndex(prev => prev + 1);
                            } else {
                              setIsQuizFinished(true);
                            }
                          }}
                          className="w-full text-left p-5 rounded-2xl bg-[#131314] border border-white/5 hover:border-purple-500/50 hover:bg-[#1e1e1f] transition-all group relative overflow-hidden"
                        >
                          <div className="flex items-center gap-4 relative z-10">
                            <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors">{option}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-8"
                  >
                    <div className="w-24 h-24 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                      <Trophy className="w-12 h-12 text-white" />
                    </div>
                    
                    <div>
                      <h1 className="text-4xl font-bold text-zinc-100 mb-2">¡Cuestionario Completado!</h1>
                      <p className="text-zinc-400">Has terminado el cuestionario sobre {quizTopic}</p>
                    </div>

                    <div className="bg-[#131314] border border-white/5 rounded-3xl p-8">
                      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
                        {userAnswers.filter((ans, idx) => ans === quizQuestions[idx].correctAnswer).length} / {quizQuestions.length}
                      </div>
                      <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">Puntuación Final</p>
                    </div>

                    <div className="space-y-4 text-left max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                      <h3 className="text-lg font-semibold text-zinc-200 px-2">Revisión de respuestas:</h3>
                      {quizQuestions.map((q, i) => (
                        <div key={i} className={`p-4 rounded-2xl border ${userAnswers[i] === q.correctAnswer ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                          <p className="text-sm font-medium text-zinc-200 mb-2">{i + 1}. {q.question}</p>
                          <div className="flex flex-col gap-1 text-xs">
                            <p className={userAnswers[i] === q.correctAnswer ? 'text-emerald-400' : 'text-red-400'}>
                              Tu respuesta: {q.options[userAnswers[i]]}
                            </p>
                            {userAnswers[i] !== q.correctAnswer && (
                              <p className="text-emerald-400">Correcta: {q.options[q.correctAnswer]}</p>
                            )}
                            <p className="text-zinc-500 mt-2 italic">"{q.explanation}"</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          setCurrentQuestionIndex(0);
                          setUserAnswers([]);
                          setIsQuizFinished(false);
                        }}
                        className="flex-1 py-4 bg-zinc-800 text-zinc-100 rounded-2xl font-semibold hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-5 h-5" /> Reintentar
                      </button>
                      <button 
                        onClick={() => {
                          setMode('chat');
                          setQuizQuestions([]);
                        }}
                        className="flex-1 py-4 bg-white text-black rounded-2xl font-semibold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                      >
                        Volver al Chat <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Chat */}
              <div className={`flex-1 overflow-y-auto p-4 pb-40 scroll-smooth scrollbar-hide transition-all duration-500 ${mode === 'canvas' ? (canvasView === 'preview' ? 'hidden md:block md:w-1/3 opacity-50' : 'w-full md:w-1/3') : 'w-full'}`}>
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
                        <motion.div 
                          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} 
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} 
                          transition={{ duration: 0.6, ease: "easeOut", delay: msg.role === 'assistant' ? 0.1 : 0 }}
                          key={i} 
                          className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                        >
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
                          <div className="flex gap-1">
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                          </div>
                          <span className="text-xs font-mono tracking-widest uppercase opacity-50">Procesando</span>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} className="h-4" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Canvas */}
              {mode === 'canvas' && (
                <div className={`flex-1 bg-[#1e1e1f] border-l border-white/5 p-4 flex flex-col transition-all duration-500 ${canvasView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" /> Sandbox
                    </h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const blob = new Blob([canvasCode], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                        }}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="Abrir en nueva pestaña"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setCanvasCode("")}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="Limpiar Sandbox"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-2xl relative">
                    {canvasCode ? (
                      <iframe
                        srcDoc={canvasCode.includes('<!DOCTYPE html>') ? canvasCode : `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="utf-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1">
                              <script src="https://cdn.tailwindcss.com"></script>
                              <style>body { font-family: sans-serif; margin: 0; padding: 20px; }</style>
                            </head>
                            <body>
                              ${canvasCode.includes('<script') || canvasCode.includes('<style') ? canvasCode : `<div>${canvasCode}</div>`}
                            </body>
                          </html>
                        `}
                        className="w-full h-full border-none"
                        title="Sandbox Preview"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                          <Bot className="w-8 h-8 text-zinc-300" />
                        </div>
                        <p className="text-lg font-medium text-zinc-600 mb-2">Sandbox Vacío</p>
                        <p className="text-sm">Activa el modo Canvas y pídele a SAM que programe algo para verlo aquí.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile View Toggle */}
              {mode === 'canvas' && (
                <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex bg-[#1e1e1f] border border-white/10 rounded-full p-1 shadow-2xl">
                  <button 
                    onClick={() => setCanvasView('chat')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${canvasView === 'chat' ? 'bg-white text-black' : 'text-zinc-400'}`}
                  >
                    <Bot className="w-4 h-4" /> Chat
                  </button>
                  <button 
                    onClick={() => setCanvasView('preview')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${canvasView === 'preview' ? 'bg-white text-black' : 'text-zinc-400'}`}
                  >
                    <Layout className="w-4 h-4" /> Preview
                  </button>
                </div>
              )}
            </>
          )}
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
                  initial={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(10px)" }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="absolute bottom-full left-0 mb-6 bg-[#131314]/90 backdrop-blur-2xl rounded-[2rem] p-4 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[320px] overflow-hidden z-50"
                >
                  <div className="flex flex-col gap-4">
                    {/* Media & Files Section */}
                    <div>
                      <div className="px-2 mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Herramientas</span>
                        <div className="h-[1px] flex-1 bg-white/5 ml-4" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button" 
                          onClick={() => { fileInputRef.current?.click(); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-2 p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl text-zinc-200 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <span className="text-[11px] font-medium">Imagen</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { fileInputRef.current?.click(); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-2 p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl text-zinc-200 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <File className="w-5 h-5 text-emerald-400" />
                          </div>
                          <span className="text-[11px] font-medium">Archivo</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { cameraInputRef.current?.click(); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-2 p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl text-zinc-200 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera className="w-5 h-5 text-purple-400" />
                          </div>
                          <span className="text-[11px] font-medium">Cámara</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setIsQuizSetupOpen(true); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-2 p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl text-zinc-200 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <HelpCircle className="w-5 h-5 text-yellow-400" />
                          </div>
                          <span className="text-[11px] font-medium">Quiz</span>
                        </button>
                      </div>
                    </div>

                    {/* Modes Section */}
                    <div>
                      <div className="px-2 mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Modos Especiales</span>
                        <div className="h-[1px] flex-1 bg-white/5 ml-4" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          type="button" 
                          onClick={() => { setMode(mode === 'chat' ? 'canvas' : 'chat'); setIsPlusMenuOpen(false); }} 
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${mode === 'canvas' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.05]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${mode === 'canvas' ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium">Modo Canvas</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full relative transition-colors ${mode === 'canvas' ? 'bg-indigo-500' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${mode === 'canvas' ? 'left-5' : 'left-1'}`} />
                          </div>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { setIsVoiceEnabled(!isVoiceEnabled); setIsPlusMenuOpen(false); }} 
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isVoiceEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.05]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isVoiceEnabled ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium">Respuesta por Voz</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full relative transition-colors ${isVoiceEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isVoiceEnabled ? 'left-5' : 'left-1'}`} />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
