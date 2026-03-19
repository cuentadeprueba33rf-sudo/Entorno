import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  reasoning_details?: string | any;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("stepfun/step-3.5-flash:free");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MODELS = [
    { id: "stepfun/step-3.5-flash:free", name: "Nemotron 3.5" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
    { id: "minimax/minimax-m2.5:free", name: "Minimax M2.5" }
  ];

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
        body: JSON.stringify({ messages: newMessages, model: selectedModel }),
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
      <header className="border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <Bot className="w-5 h-5 text-zinc-300" />
          </div>
          <h1 className="font-semibold text-base tracking-tight text-zinc-200">SAM IA</h1>
        </div>
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="text-xs text-zinc-300 font-medium bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        >
          {MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <Bot className="w-10 h-10 text-zinc-400" />
              </div>
              <h2 className="text-3xl font-semibold text-zinc-100">¿En qué puedo ayudarte hoy?</h2>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                    <Bot className="w-5 h-5 text-zinc-300" />
                  </div>
                )}
                
                <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-zinc-800 text-zinc-100" 
                      : "text-zinc-200"
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
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
              </div>
              <div className="text-zinc-500 p-4 text-sm">SAM IA está pensando...</div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 md:p-6 bg-[#0a0a0a]">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Preguntar a SAM IA..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-6 pr-16 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-600 text-zinc-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-zinc-700 text-zinc-200 flex items-center justify-center hover:bg-zinc-600 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-center text-zinc-700 mt-4">
          SAM IA puede cometer errores. Considera verificar la información importante.
        </p>
      </footer>
    </div>
  );
}
