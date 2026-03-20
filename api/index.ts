import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`OpenRouter API Key present: ${!!process.env.OPENROUTER_API_KEY}`);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const MODELS = [
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "meta-llama/llama-3.3-70b-instruct:free",
  "z-ai/glm-4.5-air:free",
  "deepseek/deepseek-r1:free",
  "mistralai/mistral-7b-instruct:free",
  "openrouter/auto"
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        const payload: any = {
          model: model,
          messages: [
            { role: "system", content: req.body.personality || "Tu nombre es SAM IA. Eres un asistente útil y directo. Responde de manera concisa." },
            ...messages.map((m: any) => {
              // Ensure content is handled correctly for different models
              let content = m.content;
              if (Array.isArray(content)) {
                // Some models prefer string content if it's just text
                if (content.length === 1 && content[0].type === 'text') {
                  content = content[0].text;
                }
              }
              
              return {
                role: m.role,
                content: content,
                ...(m.reasoning_details ? { reasoning_details: m.reasoning_details } : {}),
                ...(m.reasoning ? { reasoning: m.reasoning } : {})
              };
            })
          ]
        };

        // Only enable reasoning for models that explicitly support it to avoid slow responses on others
        // GLM is explicitly disabled as per user request due to slow response times
        const isReasoningModel = model.includes('r1') || model.includes('nemotron');
        if (isReasoningModel && !model.includes('glm')) {
          payload.reasoning = { enabled: true };
        } else {
          payload.reasoning = { enabled: false };
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
            "X-OpenRouter-Title": "SAM IA",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          // Strip reasoning if not a reasoning model to avoid unwanted UI display
          if (!model.includes('r1') && !model.includes('nemotron')) {
            if (data.choices?.[0]?.message) {
              delete data.choices[0].message.reasoning;
              delete data.choices[0].message.reasoning_details;
            }
          }
          return res.json(data);
        }
        
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429 && retries < maxRetries) {
          console.warn(`Model ${model} rate limited (429). Retrying in ${1000 * (retries + 1)}ms...`);
          retries++;
          await sleep(1000 * retries);
          continue;
        }

        // If 404, the model ID is likely wrong or unavailable, don't retry, just try next model
        if (response.status === 404) {
          console.error(`Model ${model} not found (404). Trying next model...`);
          break;
        }

        // If 400, the payload might be invalid for this specific model
        if (response.status === 400) {
          console.error(`Model ${model} returned 400 (Bad Request). Payload might be invalid for this model.`, JSON.stringify(errorData, null, 2));
          break;
        }

        console.error(`Model ${model} failed with status ${response.status}:`, JSON.stringify(errorData, null, 2));
        break; // Try next model
      } catch (error) {
        console.warn(`Model ${model} failed with error:`, error);
        break; // Try next model
      }
    }
  }

  res.status(500).json({ error: "¡Ups! Parece que nuestros modelos están tomando un pequeño descanso. ¿Podrías intentarlo de nuevo en unos momentos?" });
});

// API Route for Image Generation
app.post("/api/generate-image", async (req, res) => {
  const { prompt, model: requestedModel } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not set" });
  }

  const model = requestedModel || "bytedance-seed/seedream-4.5";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-OpenRouter-Title": "SAM IA",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image"]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: "¡Ups! El servicio de imágenes no está disponible por el momento. ¿Podrías intentarlo un poco más tarde?" });
  }
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
