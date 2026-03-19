import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Loader2, BrainCircuit, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  reasoning_details?: string | any;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || errorData.error || "Failed to get response");
        } else {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to get response");
        }
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

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight">Nemotron Reasoning</h1>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              stepfun/step-3.5-flash:free
            </p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-zinc-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">¿En qué puedo ayudarte hoy?</h2>
              <p className="text-zinc-500 max-w-md">
                Este chat utiliza el modelo Nemotron con capacidades de razonamiento avanzadas a través de OpenRouter.
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  msg.role === "user" 
                    ? "bg-zinc-800 border-zinc-700" 
                    : "bg-emerald-500/10 border-emerald-500/20"
                }`}>
                  {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-emerald-400" />}
                </div>
                
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : ""}`}>
                  {msg.reasoning_details && (
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-400 font-mono">
                      <div className="flex items-center gap-2 mb-2 text-zinc-500 uppercase tracking-widest text-[10px] font-bold">
                        <BrainCircuit className="w-3 h-3" />
                        Pensamiento del Modelo
                      </div>
                      {typeof msg.reasoning_details === 'string' 
                        ? msg.reasoning_details 
                        : (msg.reasoning_details.text || JSON.stringify(msg.reasoning_details))}
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 md:p-6 bg-gradient-to-t from-[#0a0a0a] to-transparent">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[10px] text-center text-zinc-600 mt-4 uppercase tracking-widest font-medium">
          Powered by OpenRouter & Nvidia Nemotron
        </p>
      </footer>
    </div>
  );
}
