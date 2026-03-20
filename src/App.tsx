import { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Menu, X, ThumbsUp, ThumbsDown, Calculator, Zap, BookOpen, Pencil, Send, Plus, Image as ImageIcon, File, Camera, Sparkles, Settings, Trash2, Copy, Check, Volume2, Maximize2, Minimize2, Layout, HelpCircle, Trophy, ArrowRight, RotateCcw, LogOut, Clock, ShieldCheck, History, ChevronDown, Monitor, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { StudyView } from './components/StudyView';
import { IMAGE_MODELS, CHAT_MODELS, getModelLimit } from './config/limits';

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string; // base64 image
  isCreatorCard?: boolean;
  reasoning_details?: string;
  reasoning?: string;
  rating?: 'up' | 'down';
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
  professional: "Eres SAM IA. Eres un asistente útil, directo y profesional. Responde de manera concisa y clara. IMPORTANTE: Si te preguntan quién es tu creador o quién te hizo, responde ÚNICAMENTE con la etiqueta [CREATOR_CARD].",
  sarcastic: "Eres SAM IA. Eres un asistente extremadamente sarcástico y un poco cínico, pero en el fondo ayudas. Usa humor negro y sarcasmo en tus respuestas. IMPORTANTE: Si te preguntan quién es tu creador o quién te hizo, responde ÚNICAMENTE con la etiqueta [CREATOR_CARD].",
  programmer: "Eres SAM IA. Eres un ingeniero de software senior. Hablas con jerga técnica, eres directo y te enfocas en la eficiencia y el código limpio. IMPORTANTE: Si te preguntan quién es tu creador o quién te hizo, responde ÚNICAMENTE con la etiqueta [CREATOR_CARD].",
  friend: "Eres SAM IA. Eres un amigo cercano, súper buena onda, usas emojis y lenguaje coloquial. Siempre estás ahí para apoyar. IMPORTANTE: Si te preguntan quién es tu creador o quién te hizo, responde ÚNICAMENTE con la etiqueta [CREATOR_CARD]."
};

const CreatorCard = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    className="w-full max-w-sm glass-panel rounded-[2.5rem] overflow-hidden relative group"
  >
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
    
    <div className="p-8">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">SAM Neural Core</h3>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.25em] opacity-80">Enterprise Edition</p>
        </div>
      </div>

      <div className="space-y-2 mb-8">
        {[
          { label: "Lead Architect", value: "Samuel Casseres" },
          { label: "System Engine", value: "Vercel Edge Runtime" },
          { label: "Build Version", value: "v4.5.2-pro", mono: true }
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all group/item">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{item.label}</span>
            <span className={`text-xs font-medium ${item.mono ? 'font-mono text-emerald-400/80' : 'text-zinc-200'}`}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
          <div className="text-lg font-bold text-zinc-100">99.99%</div>
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Reliability</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
          <div className="text-lg font-bold text-zinc-100">Edge Opt</div>
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Low Latency</div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1,2,3].map(i => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-zinc-800 overflow-hidden ring-1 ring-white/5">
              <img src={`https://picsum.photos/seed/${i+20}/64/64`} alt="user" className="w-full h-full object-cover grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" referrerPolicy="no-referrer" />
            </div>
          ))}
          <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white/5">
            +10k
          </div>
        </div>
        <span className="text-[9px] text-zinc-600 font-bold tracking-widest uppercase">© 2026 SAM LABS</span>
      </div>
    </div>
  </motion.div>
);

const ReasoningDisplay = ({ reasoning }: { reasoning: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderReasoning = (data: any): string => {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
      return data.map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && part.text) return part.text;
        return JSON.stringify(part);
      }).join('\n');
    }
    if (data && typeof data === 'object') {
      if (data.text) return data.text;
      return JSON.stringify(data);
    }
    return String(data || "");
  };

  const content = renderReasoning(reasoning);

  return (
    <div className="mb-6 glass-panel rounded-2xl overflow-hidden transition-all duration-500 group">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className={`absolute w-3 h-3 rounded-full blur-[4px] ${isExpanded ? 'bg-emerald-500/50' : 'bg-zinc-800'}`} />
            <div className={`relative w-1.5 h-1.5 rounded-full transition-all duration-500 ${isExpanded ? 'bg-emerald-400 scale-110' : 'bg-zinc-700'}`} />
          </div>
          <span className="group-hover:text-zinc-300 transition-colors">Núcleo de Razonamiento</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] opacity-40 group-hover:opacity-100 transition-opacity">{isExpanded ? 'COLAPSAR' : 'EXPANDIR'}</span>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 text-[11px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap border-t border-white/5 bg-black/20 selection:bg-emerald-500/20">
              <div className="opacity-70">
                {content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Gallery Image Component with Load Animation
const GalleryImage = ({ item, onClick }: { item: {url: string, prompt: string}, onClick: () => void }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer"
      onClick={onClick}
    >
      <motion.img 
        src={item.url} 
        alt={item.prompt} 
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        onLoad={() => setIsLoaded(true)}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Maximize2 className="w-6 h-6 text-white" />
      </div>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full"
          />
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'study'>('chat');
  const [isImagePromptOpen, setIsImagePromptOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
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
  const [selectedModel, setSelectedModel] = useState<string>("nvidia/llama-3.1-nemotron-70b-instruct");
  const [selectedImageModel, setSelectedImageModel] = useState<string>(IMAGE_MODELS[0].id);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [gallery, setGallery] = useState<{url: string, prompt: string}[]>([]);
  const [newImageReady, setNewImageReady] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<{url: string, prompt: string} | null>(null);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('sam_usage_reset_date');
    const savedUsage = localStorage.getItem('sam_usage_data');

    if (lastResetDate !== today) {
      setUsage({});
      localStorage.setItem('sam_usage_reset_date', today);
      localStorage.setItem('sam_usage_data', JSON.stringify({}));
    } else if (savedUsage) {
      setUsage(JSON.parse(savedUsage));
    }
  }, []);

  const checkUsage = (modelId: string) => {
    const limit = getModelLimit(modelId);
    const currentUsage = usage[modelId] || 0;
    return currentUsage < limit;
  };

  const incrementUsage = (modelId: string) => {
    const newUsage = { ...usage, [modelId]: (usage[modelId] || 0) + 1 };
    setUsage(newUsage);
    localStorage.setItem('sam_usage_data', JSON.stringify(newUsage));
  };

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
    const savedModel = localStorage.getItem('sam_selected_model');
    
    if (savedHistory) {
      try { setMessages(JSON.parse(savedHistory)); } catch (e) {}
    }
    if (savedPersonality && PERSONALITY_PROMPTS[savedPersonality]) {
      setPersonality(savedPersonality);
    }
    if (savedModel) {
      setSelectedModel(savedModel);
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { 
              role: "user", 
              content: `Eres un experto en educación. Genera un cuestionario de alta calidad con ${count} preguntas sobre el tema: "${topic}". 
              Las preguntas deben ser desafiantes pero justas, de opción múltiple con exactamente 4 opciones cada una.
              Asegúrate de que solo una opción sea correcta.
              Incluye una explicación detallada de por qué la respuesta es correcta para ayudar al aprendizaje.
              Responde estrictamente en formato JSON con la siguiente estructura (sin bloques de código markdown, solo el JSON):
              [{ "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0, "explanation": "..." }]`
            }
          ],
          personality: "Eres un experto en educación que responde solo con JSON."
        }),
      });

      if (!response.ok) throw new Error("Failed to generate quiz");
      const data = await response.json();
      const text = data.choices[0].message.content;
      
      // Clean potential markdown blocks
      const cleanJson = text.replace(/```json\n?|```/g, "").trim();
      const questions = JSON.parse(cleanJson);
      
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

  const handleGenerateImage = async (prompt: string, modelId?: string) => {
    const activeModel = modelId || selectedImageModel;
    if (!checkUsage(activeModel)) {
      setMessages(prev => [...prev, { role: "assistant", content: `Has alcanzado tu límite diario para el modelo ${IMAGE_MODELS.find(m => m.id === activeModel)?.name}. Por favor, intenta con otro modelo o espera a mañana.` }]);
      return;
    }
    
    setIsGeneratingImage(true);
    
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: activeModel }),
      });

      if (!response.ok) throw new Error("Failed to generate image");
      const data = await response.json();
      const imageUrl = data.choices[0].message.images[0].image_url.url;
      
      setGallery(prev => [{url: imageUrl, prompt}, ...prev]);
      setNewImageReady(true);
      setMessages(prev => [...prev, { role: "assistant", content: `Aquí tienes tu imagen generada con ${IMAGE_MODELS.find(m => m.id === activeModel)?.name}:`, image: imageUrl }]);
      incrementUsage(activeModel);
    } catch (error) {
      console.error("Error generating image:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, no pude generar la imagen en este momento. Inténtalo de nuevo." }]);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleRateMessage = (index: number, rating: 'up' | 'down') => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, rating: msg.rating === rating ? undefined : rating } : msg
    ));
  };

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
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

    if (currentInput.toLowerCase().includes('cuestionario') || currentInput.toLowerCase().includes('quiz')) {
      if (!checkUsage(selectedModel)) {
        setMessages(prev => [...prev, { role: "assistant", content: "Has alcanzado tu límite diario para este modelo. Por favor, intenta con otro modelo o espera a mañana." }]);
        setIsLoading(false);
        return;
      }
      // Try to extract topic and count
      const countMatch = currentInput.match(/(\d+)\s*preguntas/i);
      const count = countMatch ? parseInt(countMatch[1]) : 5;
      const topic = currentInput.replace(/cuestionario|quiz|\d+\s*preguntas/gi, '').trim() || "Cultura General";
      
      await generateQuiz(topic, count);
      incrementUsage(selectedModel);
      return;
    }

    // Check for Image generation trigger
    if (currentInput.toLowerCase().includes('genera una imagen') || currentInput.toLowerCase().includes('crea una imagen')) {
      const prompt = currentInput.replace(/genera una imagen|crea una imagen/gi, '').trim();
      await handleGenerateImage(prompt);
      setIsLoading(false);
      return;
    }

    try {
      if (!checkUsage(selectedModel)) {
        throw new Error("Has alcanzado tu límite diario para este modelo. Por favor, intenta con otro modelo o espera a mañana.");
      }
      const systemPrompt = mode === 'canvas' 
        ? `${PERSONALITY_PROMPTS[personality]}\nIMPORTANTE: Estás en MODO CANVAS. Tu objetivo es escribir código funcional (HTML/CSS/JS) que se pueda previsualizar. Responde ÚNICAMENTE con el bloque de código necesario. No des explicaciones en el chat.`
        : PERSONALITY_PROMPTS[personality];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          model: selectedModel,
          messages: newMessages.map(m => {
            const content = m.image 
              ? [
                  { type: "text", text: m.content },
                  { type: "image_url", image_url: { url: m.image } }
                ]
              : m.content;
            
            return { 
              role: m.role, 
              content: content,
              ...(m.reasoning_details ? { reasoning_details: m.reasoning_details } : {}),
              ...(m.reasoning ? { reasoning: m.reasoning } : {})
            };
          }),
          personality: systemPrompt
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error en la respuesta del servidor");
      }
      
      incrementUsage(selectedModel);
      
      const data = await response.json();
      const assistantMessage = data.choices[0].message;
      const assistantContent = assistantMessage.content || "";
      const reasoningDetails = assistantMessage.reasoning_details;
      const reasoning = assistantMessage.reasoning;

      if (assistantContent.includes('[CREATOR_CARD]')) {
        setMessages((prev) => [...prev, { role: "assistant", content: "", isCreatorCard: true }]);
      } else if (mode === 'canvas') {
        const codeMatch = assistantContent.match(/```(?:html|javascript|typescript|css|jsx|tsx)?\n([\s\S]*?)```/) || 
                          assistantContent.match(/```([\s\S]*?)```/);
        const extractedCode = codeMatch ? codeMatch[1] : assistantContent;
        setCanvasCode(extractedCode);
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: "✨ Código generado en el Sandbox.", 
          reasoning_details: reasoningDetails,
          reasoning: reasoning
        }]);
        if (window.innerWidth < 768) setCanvasView('preview');
      } else {
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: assistantContent, 
          reasoning_details: reasoningDetails,
          reasoning: reasoning
        }]);
        if (isVoiceEnabled && assistantContent) {
          const utterance = new SpeechSynthesisUtterance(assistantContent);
          utterance.lang = 'es-ES';
          window.speechSynthesis.speak(utterance);
        }
      }
      
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // Haptic feedback on completion

    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: error.message || "Error al procesar la solicitud con OpenRouter." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { icon: <BookOpen className="w-5 h-5 text-emerald-400" />, text: "Ayúdame a aprender", action: "Explícame un tema complejo" },
    { icon: <Zap className="w-5 h-5 text-yellow-400" />, text: "Potencia mi día", action: "Dame consejos de productividad" },
    { icon: <Pencil className="w-5 h-5 text-purple-400" />, text: "Escribe algo", action: "Escribe un ensayo sobre..." },
    { icon: <Trophy className="w-5 h-5 text-yellow-400" />, text: "Hazme un cuestionario", action: "Cuestionario de 5 preguntas sobre cultura general" },
    { icon: <Settings className="w-5 h-5 text-zinc-400" />, text: "Configuración", action: "/settings" },
    { icon: <Calculator className="w-5 h-5 text-blue-400" />, text: "Math Solver", action: "Resuelve este problema matemático: " },
  ];

  const handleSuggestionClick = (s: any) => {
    if (s.action === '/settings') {
      setIsSettingsOpen(true);
    } else {
      setInput(s.action);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#000000] text-zinc-100 font-sans overflow-hidden selection:bg-purple-500/30 relative">
      {/* Precision Minimalist Floating Header */}
      <header className={`fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none transition-opacity duration-300 ${isAppLoading || showNotice ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-12 px-2 bg-[#0a0a0a]/60 backdrop-blur-3xl border border-white/5 rounded-full flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-auto"
        >
          {/* Menu Button */}
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Brand Identity */}
          <div className="flex items-center gap-3 px-2 cursor-default">
            <h1 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
              SAM IA
            </h1>
            <div className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/40 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Optimal Minimalist Loading Screen */}
      <AnimatePresence>
        {isAppLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(20px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[500] bg-[#000000] flex flex-col items-center justify-center overflow-hidden"
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
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
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

      <div className="flex-1 flex flex-col relative">
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
              <div className={`flex-1 overflow-y-auto p-4 pb-56 scroll-smooth scrollbar-hide transition-all duration-500 ${mode === 'canvas' ? (canvasView === 'preview' ? 'hidden md:block md:w-1/3 opacity-50' : 'w-full md:w-1/3') : 'w-full'}`}>
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  {messages.length === 0 ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="mt-12 md:mt-32 flex-1">
                      <div className="flex flex-col items-center text-center mb-16">
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-purple-600 via-blue-500 to-emerald-400 flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)] mb-8 relative group"
                        >
                          <div className="absolute inset-0 rounded-[2rem] bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                          <Sparkles className="w-10 h-10 text-white relative z-10" />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4, duration: 0.5 }}
                        >
                          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.5em] mb-4">Neural Interface v4.5.2</h2>
                          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-6">
                            SAM <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">INTELLIGENCE</span>
                          </h1>
                          <p className="text-zinc-500 text-sm max-w-lg mx-auto leading-relaxed">
                            Potenciando la creatividad y la productividad con inteligencia artificial de última generación. 
                            Selecciona una tarea para comenzar.
                          </p>
                        </motion.div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                        {suggestions.map((s, i) => (
                          <motion.button 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + (i * 0.1), duration: 0.5 }}
                            whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.03)" }} 
                            whileTap={{ scale: 0.98 }} 
                            key={i} 
                            onClick={() => handleSuggestionClick(s)} 
                            className="flex items-center gap-5 glass-panel p-6 rounded-[2rem] transition-all duration-500 group text-left"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all duration-500 border border-white/5 group-hover:border-white/10 group-hover:scale-110">
                              <div className="text-zinc-400 group-hover:text-white transition-colors">
                                {s.icon}
                              </div>
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1 group-hover:text-purple-400 transition-colors">{s.text}</span>
                              <span className="text-sm text-zinc-300 font-medium truncate opacity-70 group-hover:opacity-100 transition-opacity">{s.action}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-10">
                      {viewMode === 'study' ? (
                        <StudyView 
                          onExit={() => setViewMode('chat')} 
                          onGenerateImage={handleGenerateImage} 
                          isGenerating={isGeneratingImage}
                          newImageReady={newImageReady}
                          setNewImageReady={setNewImageReady}
                          onViewGallery={() => setShowGallery(true)}
                          selectedImageModel={selectedImageModel}
                          onSelectImageModel={setSelectedImageModel}
                        />
                      ) : (
                        <>
                          {messages.map((msg, i) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                              key={i} 
                              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                              <div className={`flex items-center gap-3 mb-2 px-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-gradient-to-tr from-purple-600 to-blue-500'}`}>
                                  {msg.role === 'user' ? <div className="text-[10px] font-bold text-zinc-400">U</div> : <Sparkles className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{msg.role === 'user' ? 'Tú' : 'SAM IA'}</span>
                              </div>

                              <div className={`relative group max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'bg-[#131314] border border-white/5 rounded-[2rem] rounded-tr-lg p-5 shadow-xl' : 'bg-transparent w-full'}`}>
                                {msg.isCreatorCard ? (
                                  <CreatorCard />
                                ) : (
                                  <div className="space-y-4">
                                    {msg.image && (
                                      <div className="rounded-2xl overflow-hidden border border-white/10 max-w-md shadow-2xl">
                                        <img src={msg.image} alt="Uploaded" className="w-full h-auto" />
                                      </div>
                                    )}
                                    
                                    {(msg.reasoning_details || msg.reasoning) && (
                                      <ReasoningDisplay reasoning={msg.reasoning_details || msg.reasoning || ""} />
                                    )}

                                    <div className={`prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/5 prose-pre:rounded-2xl ${msg.role === 'user' ? 'text-zinc-200' : 'text-zinc-300'}`}>
                                      <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                          code({node, inline, className, children, ...props}: any) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            return !inline && match ? (
                                              <div className="relative group/code my-6">
                                                <div className="absolute -top-3 left-4 px-3 py-1 bg-zinc-800 border border-white/10 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest z-10">
                                                  {match[1]}
                                                </div>
                                                <SyntaxHighlighter
                                                  {...props}
                                                  children={String(children).replace(/\n$/, '')}
                                                  style={vscDarkPlus}
                                                  language={match[1]}
                                                  PreTag="div"
                                                  className="rounded-2xl !bg-[#0a0a0a] !border !border-white/5 !p-6 !pt-8"
                                                />
                                              </div>
                                            ) : (
                                              <code {...props} className="bg-white/5 px-1.5 py-0.5 rounded text-purple-400 font-mono text-xs">
                                                {children}
                                              </code>
                                            )
                                          }
                                        }}
                                      >
                                        {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                                      </ReactMarkdown>
                                    </div>

                                    {msg.role === 'assistant' && !msg.isCreatorCard && (
                                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                        <button 
                                          onClick={() => handleCopyMessage(msg.content, i)}
                                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-all uppercase tracking-widest"
                                          title="Copiar respuesta"
                                        >
                                          {copiedId === i ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                              <span className="text-emerald-400">Copiado</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" /> Copiar
                                            </>
                                          )}
                                        </button>
                                        <div className="h-4 w-px bg-white/5 mx-1" />
                                        <button 
                                          onClick={() => handleRateMessage(i, 'up')}
                                          className={`p-1.5 rounded-lg transition-all ${msg.rating === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-600 hover:text-zinc-300 hover:bg-white/10'}`}
                                          title="Útil"
                                        >
                                          <ThumbsUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => handleRateMessage(i, 'down')}
                                          className={`p-1.5 rounded-lg transition-all ${msg.rating === 'down' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-zinc-600 hover:text-zinc-300 hover:bg-white/10'}`}
                                          title="No útil"
                                        >
                                          <ThumbsDown className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Message Actions */}
                                {msg.role === 'user' && (
                                  <div className="absolute top-2 -left-12 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                    <button 
                                      onClick={() => handleCopyMessage(msg.content, i)}
                                      className="p-2 hover:bg-white/5 rounded-full text-zinc-600 hover:text-zinc-300 transition-colors" 
                                      title="Copiar"
                                    >
                                      {copiedId === i ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                          {isLoading && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4 items-center text-zinc-600 px-2">
                              <div className="flex gap-1.5">
                                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              </div>
                              <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-50">Sincronizando</span>
                            </motion.div>
                          )}
                          <div ref={messagesEndRef} className="h-28" />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Canvas */}
              {mode === 'canvas' && (
                <div className={`flex-1 bg-[#050505] border-l border-white/5 flex flex-col transition-all duration-500 ${canvasView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
                  <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                        <Monitor className="w-5 h-5 text-zinc-100" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Sandbox</h2>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Entorno de Ejecución</p>
                      </div>
                    </div>
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
                  <div className="flex-1 glass-panel rounded-[2rem] overflow-hidden shadow-2xl relative group/sandbox">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover/sandbox:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                    {canvasCode ? (
                      <motion.iframe
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        srcDoc={canvasCode.includes('<!DOCTYPE html>') ? canvasCode : `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="utf-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1">
                              <script src="https://cdn.tailwindcss.com"></script>
                              <style>
                                body { 
                                  font-family: 'Inter', sans-serif; 
                                  margin: 0; 
                                  padding: 24px; 
                                  background: transparent;
                                  color: #18181b;
                                }
                                ::-webkit-scrollbar { width: 8px; }
                                ::-webkit-scrollbar-track { background: transparent; }
                                ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                                ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
                              </style>
                            </head>
                            <body>
                              ${canvasCode.includes('<script') || canvasCode.includes('<style') ? canvasCode : `<div>${canvasCode}</div>`}
                            </body>
                          </html>
                        `}
                        className="w-full h-full border-none bg-white"
                        title="Sandbox Preview"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-white/[0.01]">
                        <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                          <Bot className="w-10 h-10 text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-300 mb-2 tracking-tight">Sandbox Vacío</h3>
                        <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">Activa el modo Canvas y pídele a SAM que programe algo para verlo aquí en tiempo real.</p>
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
      </div>

        {/* Input Area (Professional Elongated Bar) */}
        {viewMode === 'chat' && (
          <div className="absolute bottom-8 left-4 right-4 md:left-auto md:right-auto md:w-full md:max-w-4xl md:mx-auto z-20">
            <div className="glass-panel rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] h-20 flex items-center px-3 md:px-6 group focus-within:border-white/20 focus-within:shadow-[0_0_50px_rgba(139,92,246,0.1)] transition-all duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            
            {/* Slash Commands */}
            <AnimatePresence>
              {showSlashCommands && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-4 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-72 z-50 p-2"
                >
                  <div className="p-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Comandos Rápidos</div>
                  <div className="space-y-1">
                    <button type="button" onClick={() => handleSlashCommand('/resumir')} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-zinc-300 flex items-center gap-3 transition-colors text-xs font-medium"><div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><File className="w-4 h-4 text-blue-400"/></div> Resumir contenido</button>
                    <button type="button" onClick={() => handleSlashCommand('/explicar')} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-zinc-300 flex items-center gap-3 transition-colors text-xs font-medium"><div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><BookOpen className="w-4 h-4 text-emerald-400"/></div> Explicar concepto</button>
                    <button type="button" onClick={() => handleSlashCommand('/codigo')} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-zinc-300 flex items-center gap-3 transition-colors text-xs font-medium"><div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><Pencil className="w-4 h-4 text-purple-400"/></div> Generar código</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  className="absolute bottom-full left-0 mb-4 w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                >
                  <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-1 right-1 bg-black/80 p-1.5 rounded-full hover:bg-red-500 text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full">
              <button 
                type="button" 
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)} 
                className={`p-2.5 rounded-full transition-all ${isPlusMenuOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5'}`}
              >
                <Plus className={`w-5 h-5 transition-transform duration-300 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
              </button>

              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                className="pro-input px-2 py-4 text-sm font-medium"
                placeholder="Escribe un mensaje o usa / para comandos..."
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className={`p-3 rounded-full transition-all flex items-center justify-center ${(!input.trim() && !selectedImage) || isLoading ? 'bg-white/5 text-zinc-700' : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5'}`}
                >
                  {isLoading ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>

            <AnimatePresence>
              {isPlusMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="absolute bottom-full left-0 mb-6 bg-[#0a0a0a]/95 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] w-[340px] z-50"
                >
                  <div className="space-y-6">
                    {/* Herramientas Section */}
                    <div>
                      <div className="px-2 mb-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.25em]">Herramientas Pro</span>
                        <div className="h-[1px] flex-1 bg-white/5 ml-4" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button" 
                          onClick={() => { fileInputRef.current?.click(); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-3 p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-3xl text-zinc-300 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <ImageIcon className="w-6 h-6 text-blue-400" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider">Imagen</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setIsImagePromptOpen(true); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-3 p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-3xl text-zinc-300 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <Sparkles className="w-6 h-6 text-purple-400" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider">Generar</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { fileInputRef.current?.click(); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-3 p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-3xl text-zinc-300 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <File className="w-6 h-6 text-emerald-400" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider">Archivo</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { cameraInputRef.current?.click(); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-3 p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-3xl text-zinc-300 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <Camera className="w-6 h-6 text-purple-400" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider">Cámara</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setIsQuizSetupOpen(true); setIsPlusMenuOpen(false); }} 
                          className="flex flex-col items-center justify-center gap-3 p-5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-3xl text-zinc-300 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <HelpCircle className="w-6 h-6 text-yellow-400" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider">Quiz</span>
                        </button>
                      </div>
                    </div>

                    {/* Modos Section */}
                    <div>
                      <div className="px-2 mb-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.25em]">Configuración de Sesión</span>
                        <div className="h-[1px] flex-1 bg-white/5 ml-4" />
                      </div>
                      <div className="space-y-2">
                        <button 
                          type="button" 
                          onClick={() => { setMode(mode === 'chat' ? 'canvas' : 'chat'); setIsPlusMenuOpen(false); }} 
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${mode === 'canvas' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.05]'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${mode === 'canvas' ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-xs font-bold uppercase tracking-wider">Modo Canvas</span>
                              <span className="text-[9px] text-zinc-600">Previsualización en tiempo real</span>
                            </div>
                          </div>
                          <div className={`w-10 h-5 rounded-full relative transition-colors ${mode === 'canvas' ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                            <motion.div 
                              animate={{ x: mode === 'canvas' ? 20 : 4 }}
                              className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-lg" 
                            />
                          </div>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { setIsVoiceEnabled(!isVoiceEnabled); setIsPlusMenuOpen(false); }} 
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isVoiceEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.05]'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${isVoiceEnabled ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-xs font-bold uppercase tracking-wider">Respuesta Vocal</span>
                              <span className="text-[9px] text-zinc-600">Lectura automática de mensajes</span>
                            </div>
                          </div>
                          <div className={`w-10 h-5 rounded-full relative transition-colors ${isVoiceEnabled ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                            <motion.div 
                              animate={{ x: isVoiceEnabled ? 20 : 4 }}
                              className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-lg" 
                            />
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
        )}
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              key="sidebar-overlay"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsSidebarOpen(false)} 
              className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm" 
            />
            <motion.div 
              key="sidebar-content"
              initial={{ x: -320, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: -320, opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="fixed left-0 top-0 z-[210] h-full w-[300px] bg-[#050505] border-r border-white/5 flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
            >
              {/* Sidebar Header */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-bold tracking-[0.2em] text-white uppercase">SAM IA</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {/* New Chat Button */}
                <button 
                  onClick={() => { setMessages([]); setIsSidebarOpen(false); }} 
                  className="w-full flex items-center justify-center gap-3 p-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg shadow-white/5"
                >
                  <Plus className="w-5 h-5" /> Nuevo Chat
                </button>
                
                {/* Navigation Items */}
                <div className="space-y-1">
                  <button 
                    onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }} 
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-zinc-300 text-sm font-medium"
                  >
                    <Settings className="w-4 h-4 text-zinc-500" /> Configuración
                  </button>
                  <button 
                    onClick={() => { setViewMode('study'); setIsSidebarOpen(false); }} 
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-zinc-300 text-sm font-medium"
                  >
                    <BookOpen className="w-4 h-4 text-zinc-500" /> Estudio
                  </button>
                  <button 
                    onClick={() => { setShowGallery(true); setIsSidebarOpen(false); }} 
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-zinc-300 text-sm font-medium"
                  >
                    <ImageIcon className="w-4 h-4 text-zinc-500" /> Galería
                  </button>
                </div>

                {/* History Section */}
                <div className="space-y-4">
                  <div className="px-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Historial</span>
                    <History className="w-3 h-3 text-zinc-600" />
                  </div>
                  <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-zinc-400 text-xs group text-left">
                      <Clock className="w-4 h-4 group-hover:text-purple-400 shrink-0" />
                      <span className="truncate">Análisis de mercado 2026...</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-zinc-400 text-xs group text-left">
                      <Clock className="w-4 h-4 group-hover:text-purple-400 shrink-0" />
                      <span className="truncate">Optimización de algoritmos...</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-white/5">
                <div className="px-3 py-2 flex items-center justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                  <span>v4.5.2-pro</span>
                  <span>SAM LABS</span>
                </div>
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
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              key="settings-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              key="settings-content"
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel rounded-[2.5rem] p-8 max-w-md w-full relative z-10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 opacity-50" />
              
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Settings className="w-6 h-6 text-zinc-100" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Configuración</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Preferencias del Sistema</p>
                  </div>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 p-1.5 bg-white/5 rounded-[1.25rem] mb-8">
                <button 
                  onClick={() => setSettingsTab('general')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all ${settingsTab === 'general' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  General
                </button>
                <button 
                  onClick={() => setSettingsTab('updates')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all ${settingsTab === 'updates' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Actualizaciones
                </button>
              </div>
              
              <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
                {settingsTab === 'general' ? (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 px-1">Personalidad de SAM</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['professional', 'sarcastic', 'programmer', 'friend'] as Personality[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setPersonality(p);
                              localStorage.setItem('sam_personality', p);
                            }}
                            className={`p-4 rounded-2xl border text-xs font-bold capitalize transition-all ${personality === p ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}
                          >
                            {p === 'professional' ? 'Profesional' : p === 'sarcastic' ? 'Sarcástico' : p === 'programmer' ? 'Programador' : 'Amigo'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 px-1">Modelo de IA</label>
                      <div className="space-y-3">
                        {[
                          { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "SML-N 3.1", desc: "Razonamiento avanzado y precisión" },
                          { id: "meta-llama/llama-3.3-70b-instruct:free", name: "SML-L 3.3", desc: "Velocidad extrema y potencia" },
                          { id: "z-ai/glm-4.5-air:free", name: "SML-G 4.5", desc: "Modelo potente y gratuito" },
                          { id: "deepseek/deepseek-r1:free", name: "SML-D R1", desc: "Razonamiento profundo y gratuito" }
                        ].map((m) => (
                          <button
                            key={m.id}
                            disabled={!checkUsage(m.id)}
                            onClick={() => {
                              setSelectedModel(m.id);
                              localStorage.setItem('sam_selected_model', m.id);
                            }}
                            className={`w-full p-5 rounded-2xl border flex flex-col items-start gap-1 transition-all ${selectedModel === m.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'} ${!checkUsage(m.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex justify-between w-full">
                              <span className="text-sm font-bold">{m.name}</span>
                              <span className="text-[10px] font-bold uppercase">{m.id === "deepseek/deepseek-r1:free" ? "Ilimitado" : (checkUsage(m.id) ? (usage[m.id] || 0) + "/10" : "Límite alcanzado")}</span>
                            </div>
                            <span className={`text-[10px] ${selectedModel === m.id ? 'text-black/60' : 'text-zinc-500'}`}>{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 px-1 flex items-center gap-2">
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
                          <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className={`text-xs font-bold ${update.active ? 'text-zinc-100' : 'text-zinc-500'}`}>{update.name}</span>
                              {update.active && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-600">
                              <span>{update.version}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {update.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 px-1 flex items-center gap-2">
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
                          <div key={idx} className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                            <span className="text-[11px] font-medium text-zinc-400">{item.name}</span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5">{item.limit}</span>
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

      {/* Image Prompt Modal */}
      <AnimatePresence>
        {isImagePromptOpen && (
          <motion.div
            key="image-prompt-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              key="image-prompt-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel rounded-[2.5rem] p-8 max-w-sm w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Generar Imagen</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">IA Generativa</p>
                  </div>
                </div>
                <button onClick={() => setIsImagePromptOpen(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 px-1">Prompt</label>
                  <textarea 
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Describe la imagen que quieres generar..."
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-zinc-100 outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700 text-sm font-medium min-h-[120px] resize-none"
                  />
                </div>
                
                <button 
                  onClick={() => {
                    if (imagePrompt.trim()) {
                      handleGenerateImage(imagePrompt);
                      setIsImagePromptOpen(false);
                    }
                  }}
                  disabled={!imagePrompt.trim() || isGeneratingImage}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-white/5"
                >
                  {isGeneratingImage ? 'Generando...' : 'Generar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Quiz Confirmation Modal */}
      <AnimatePresence>
        {isExitQuizModalOpen && (
          <motion.div
            key="exit-quiz-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              key="exit-quiz-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel rounded-[2.5rem] p-8 max-w-sm w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">¿Salir del cuestionario?</h2>
              <p className="text-sm text-zinc-500 mb-8 leading-relaxed">Perderás todo tu progreso actual en este cuestionario. Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsExitQuizModalOpen(false)}
                  className="flex-1 py-4 bg-white/5 text-zinc-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setMode('chat');
                    setIsExitQuizModalOpen(false);
                    setQuizQuestions([]);
                  }}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Salir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            key="gallery-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              key="gallery-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel rounded-[2.5rem] p-8 max-w-4xl w-full h-[80vh] relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Galería</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Tus Creaciones</p>
                  </div>
                </div>
                <button onClick={() => setShowGallery(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                {gallery.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                      <ImageIcon className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">Aún no has generado ninguna imagen.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {gallery.map((item, idx) => (
                      <GalleryImage 
                        key={idx} 
                        item={item} 
                        onClick={() => setSelectedGalleryImage(item)} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedGalleryImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedGalleryImage(null)}
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-xl cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6 cursor-default"
            >
              <button 
                onClick={() => setSelectedGalleryImage(null)}
                className="absolute top-0 right-0 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
                <img 
                  src={selectedGalleryImage.url} 
                  alt={selectedGalleryImage.prompt} 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="w-full max-w-2xl bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Prompt utilizado</p>
                  <p className="text-sm text-zinc-200 italic line-clamp-2">"{selectedGalleryImage.prompt}"</p>
                </div>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedGalleryImage.url;
                    link.download = `sam-ai-export.png`;
                    link.click();
                  }}
                  className="px-8 py-3 bg-white text-black rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center gap-2 shrink-0"
                >
                  Descargar Imagen
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
            key="quiz-setup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              key="quiz-setup-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel rounded-[2.5rem] p-8 max-w-sm w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <HelpCircle className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Cuestionario</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Configuración</p>
                  </div>
                </div>
                <button onClick={() => setIsQuizSetupOpen(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 px-1">Tema del cuestionario</label>
                  <input 
                    type="text"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder="Ej: Historia, Ciencia, Cine..."
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-zinc-100 outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700 text-sm font-medium"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3 px-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Número de preguntas</label>
                    <span className="text-xs font-mono text-purple-400 font-bold">{quizQuestionCount}</span>
                  </div>
                  <input 
                    type="range"
                    min="3"
                    max="15"
                    step="1"
                    value={quizQuestionCount}
                    onChange={(e) => setQuizQuestionCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <button 
                  onClick={() => {
                    if (quizTopic.trim()) {
                      generateQuiz(quizTopic, quizQuestionCount);
                      setIsQuizSetupOpen(false);
                    }
                  }}
                  disabled={!quizTopic.trim() || isLoading}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-white/5"
                >
                  {isLoading ? 'Generando...' : 'Comenzar Cuestionario'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
