import express from "express";
import bodyParser from "body-parser";
import ViteExpress from "vite-express";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

// Configure OpenAI with timeout
const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_KEY,
  timeout: 10000 // 10-second timeout
});

const app = express();

// Essential middleware
app.use(bodyParser.json());
app.use((req, res, next) => {
  // Simple CORS handling
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Robust chat api endpoint
app.post('/api/chat', async (req, res) => {
  try {
    // Destructure both question and context from request body
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: "Missing question parameter" });
    }

    // Build context-aware prompt
    const messages: any = [];
    if (context) {
      messages.push({
        role: "system",
        content: `Use this context to answer the question: ${context}`
      });
    }
    messages.push({
      role: "user",
      content: question
    });

    // Get completion from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// Configure server properly
const server = app.listen(3000, () => {
  server.keepAliveTimeout = 15000; // Keep-alive timeout
  server.headersTimeout = 20000;   // Headers timeout
  console.log("Server is listening on port 3000...");
});

ViteExpress.bind(app, server);
