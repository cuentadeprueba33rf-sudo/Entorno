import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Menu, X, Calculator, Zap, BookOpen, Pencil, Send } from "lucide-react";
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        body: JSON.stringify({ messages: [...messages, userMessage] }),
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
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} className="w-[260px] bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col">
            <button onClick={() => setIsSidebarOpen(false)} className="self-end p-2 hover:bg-zinc-800 rounded-lg"><X /></button>
            <button onClick={() => { setMessages([]); setIsSidebarOpen(false); }} className="mt-4 flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg">Nuevo Chat</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-800 rounded-lg"><Menu /></button>
          <h1 className="text-xl font-semibold">SAM</h1>
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">S</div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 ? (
              <div className="mt-20">
                <h2 className="text-4xl font-medium mb-12">Hola, Sam<br/><span className="text-zinc-500">¿Por dónde empezamos?</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => setInput(s.action)} className="flex items-center gap-3 bg-zinc-900 p-4 rounded-2xl hover:bg-zinc-800 text-left">
                      {s.icon} {s.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && <Bot className="w-8 h-8 mt-1" />}
                    <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-zinc-800' : ''}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isLoading && <div className="text-zinc-500">SAM está pensando...</div>}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-zinc-900 rounded-full flex items-center p-2 border border-zinc-700">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent p-4 outline-none" placeholder="Pregúntale a SAM" />
            <button type="submit" className="p-3 bg-white text-black rounded-full"><Send /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
