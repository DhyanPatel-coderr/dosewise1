import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// In-memory analytics for demo
let analysisCount = 0;
const errorLogs: any[] = [];

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Helper for retrying with backoff
const withRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < retries - 1) {
        console.log(`Rate limited. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
};

// API Routes
app.post("/api/gemini", async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] POST /api/gemini - Start`);
    analysisCount++;
    const { model, contents, config } = req.body;
    console.log(`Model: ${model}`);

    // Check for multiple possible environment variable names
    const apiKey = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
      console.error("Gemini API Key is missing in environment variables.");
      return res.status(400).json({ error: "Gemini API Key is missing. Please set GEMINI_API_KEYS in the Settings menu." });
    }

    const trimmedKey = apiKey.trim();
    // Log key info for debugging (masked)
    console.log(`Using API Key for /api/gemini: ${trimmedKey.substring(0, 4)}...${trimmedKey.substring(trimmedKey.length - 4)} (length: ${trimmedKey.length})`);
    
    const genAIInstance = new GoogleGenAI({ apiKey: trimmedKey });

    const response = await withRetry(() => 
      genAIInstance.models.generateContent({
        model,
        contents,
        config: {
          ...config,
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
          ]
        }
      })
    );

    // Explicitly include the 'text' property in the JSON response
    // because getters are not serialized by default in res.json()
    const serializedResponse = JSON.parse(JSON.stringify(response));
    const text = response.text;
    const finishReason = response.candidates?.[0]?.finishReason;
    
    // Check if there's any inline data (like audio) in the response
    const hasInlineData = response.candidates?.[0]?.content?.parts?.some(part => part.inlineData);
    
    console.log(`Gemini response received. Text length: ${text?.length || 0}. Has Inline Data: ${!!hasInlineData}. Finish Reason: ${finishReason}`);
    
    if (!text && !hasInlineData) {
      console.warn("Gemini returned an empty response. Finish Reason:", finishReason);
      let errorMessage = "The AI returned an empty response.";
      
      if (finishReason === "SAFETY") {
        errorMessage = "The AI response was blocked by safety filters. Please ensure the document is a standard medical record.";
      } else if (finishReason === "RECITATION") {
        errorMessage = "The AI response was blocked due to recitation filters.";
      } else if (finishReason === "OTHER") {
        errorMessage = "The AI response was blocked for an unknown reason.";
      }
      
      return res.status(500).json({ 
        error: errorMessage,
        finishReason,
        promptFeedback: response.promptFeedback 
      });
    }
    
    res.json({
      ...serializedResponse,
      text: text
    });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    errorLogs.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Legacy route for backward compatibility if needed, but we'll update App.tsx
app.post("/api/analyze", async (req, res) => {
  try {
    analysisCount++;
    const { prompt, contents, model = "gemini-3-flash-preview" } = req.body;

    // Check for multiple possible environment variable names
    const apiKey = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
      console.error("Gemini API Key is missing in environment variables.");
      return res.status(400).json({ error: "Gemini API Key is missing. Please set GEMINI_API_KEYS in the Settings menu." });
    }

    const trimmedKey = apiKey.trim();
    // Log key info for debugging (masked)
    console.log(`Using API Key for /api/analyze: ${trimmedKey.substring(0, 4)}...${trimmedKey.substring(trimmedKey.length - 4)} (length: ${trimmedKey.length})`);
    
    const genAIInstance = new GoogleGenAI({ apiKey: trimmedKey });

    const response = await withRetry(() => 
      genAIInstance.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
          ]
        }
      })
    );

    const text = response.text;
    const finishReason = response.candidates?.[0]?.finishReason;
    
    if (!text) {
      let errorMessage = "The AI returned an empty response.";
      if (finishReason === "SAFETY") {
        errorMessage = "The AI response was blocked by safety filters.";
      }
      return res.status(500).json({ error: errorMessage });
    }

    res.json({ text: text });
  } catch (error: any) {
    console.error("Analysis Error:", error);
    errorLogs.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.get("/api/stats", (req, res) => {
  res.json({
    analysisCount,
    errorCount: errorLogs.length,
    uptime: process.uptime()
  });
});

app.get("/api/logs", (req, res) => {
  res.json(errorLogs.slice(-10)); // Last 10 errors
});

// Catch-all for API routes to prevent HTML fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
