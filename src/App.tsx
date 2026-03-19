import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, Loader2, Menu, Info, User, Globe, Image, Plus, Mic, AudioLines } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  reasoning_details?: string | any;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const selectedModel = "stepfun/step-3.5-flash:free";
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
    <div className="flex flex-col h-screen bg-black text-zinc-100 font-sans">
      {/* Header */}
      <header className="p-4 flex items-center justify-between sticky top-0 z-10">
        <Menu className="w-6 h-6 text-zinc-400" />
        <button className="flex items-center gap-2 bg-zinc-900 px-4 py-1.5 rounded-full text-sm text-zinc-300 border border-zinc-800">
          <Info className="w-4 h-4" />
          ¿Quién es SAM?
        </button>
        <div className="flex items-center gap-4">
          <User className="w-6 h-6 text-zinc-400" />
          <Globe className="w-6 h-6 text-zinc-400" />
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8">
              <h2 className="text-4xl font-semibold text-zinc-100 tracking-tight">¿En qué puedo ayudarte?</h2>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 bg-zinc-900 px-5 py-3 rounded-full text-sm text-zinc-300 border border-zinc-800 hover:bg-zinc-800">
                  <Image className="w-4 h-4" />
                  Crea una imagen
                </button>
                <button className="flex items-center gap-2 bg-zinc-900 px-5 py-3 rounded-full text-sm text-zinc-300 border border-zinc-800 hover:bg-zinc-800">
                  <Bot className="w-4 h-4" />
                  Analiza imágenes
                </button>
                <button className="bg-zinc-900 px-5 py-3 rounded-full text-sm text-zinc-300 border border-zinc-800 hover:bg-zinc-800">
                  Más
                </button>
              </div>
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
                
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : ""}`}>
                  <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
                    msg.role === "user" 
                      ? "bg-zinc-800 text-zinc-100 rounded-br-none" 
                      : "bg-zinc-900 text-zinc-200 rounded-bl-none border border-zinc-800"
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
      <footer className="p-4 md:p-6 bg-black">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative bg-zinc-900 rounded-full border border-zinc-800 flex items-center px-4 py-2">
          <button type="button" className="p-2 text-zinc-400 hover:text-zinc-200">
            <Plus className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Preguntar a SAM IA..."
            className="flex-1 bg-transparent py-3 px-4 focus:outline-none text-zinc-200 placeholder:text-zinc-600"
            disabled={isLoading}
          />
          <button type="button" className="p-2 text-zinc-400 hover:text-zinc-200">
            <Mic className="w-6 h-6" />
          </button>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 text-blue-500 hover:text-blue-400 disabled:opacity-50"
          >
            <AudioLines className="w-6 h-6" />
          </button>
        </form>
        <p className="text-[10px] text-center text-zinc-700 mt-4">
          SAM IA puede cometer errores. Considera verificar la información importante.
        </p>
      </footer>
    </div>
  );
}
