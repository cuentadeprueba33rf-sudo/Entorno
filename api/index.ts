import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`OpenRouter API Key present: ${!!process.env.OPENROUTER_API_KEY}`);

app.use(express.json());

const MODELS = [
  "nvidia/llama-3.1-nemotron-70b-instruct"
];

// API Route for OpenRouter Chat
app.post("/api/chat", async (req, res) => {
  const { messages, model: requestedModel } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is missing from environment variables");
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not set" });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  const modelsToTry = requestedModel 
    ? [requestedModel, ...MODELS.filter(m => m !== requestedModel)]
    : MODELS;

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "SAM IA",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: req.body.personality || "Tu nombre es SAM IA. Eres un asistente útil y directo. Responde de manera concisa." },
            ...messages.map((m: any) => ({
              role: m.role,
              content: m.content,
              ...(m.reasoning_details ? { reasoning_details: m.reasoning_details } : {}),
              ...(m.reasoning ? { reasoning: m.reasoning } : {})
            }))
          ],
          reasoning: { enabled: true }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error(`Model ${model} failed with status ${response.status}:`, JSON.stringify(errorData, null, 2));
    } catch (error) {
      console.warn(`Model ${model} failed with error:`, error);
    }
  }

  res.status(500).json({ error: "All models failed to respond. Please check your OpenRouter API key and balance." });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Only start server if not in Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
