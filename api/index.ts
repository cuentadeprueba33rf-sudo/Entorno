import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

const MODELS = [
  "stepfun/step-3.5-flash:free"
];

// API Route for OpenRouter Chat
app.post("/api/chat", async (req, res) => {
  const { messages, model: requestedModel } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not set" });
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
            { role: "system", content: "Tu nombre es SAM IA. Eres un asistente útil y directo. Responde de manera concisa y no muestres procesos de razonamiento." },
            ...messages
          ],
          reasoning: { enabled: true }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
      console.warn(`Model ${model} failed with status ${response.status}`);
    } catch (error) {
      console.warn(`Model ${model} failed with error:`, error);
    }
  }

  res.status(500).json({ error: "All models failed to respond" });
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
