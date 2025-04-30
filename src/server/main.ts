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

// Robust chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    // Validate input
    if (!req.body?.question) {
      return res.status(400).json({ error: "Missing question" });
    }

    // Process request
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: req.body.question }],
      max_tokens: 150
    });

    // Send response
    return res.json({ reply: completion.choices[0].message.content });

  } catch (error) {
    // Error handling
    console.error("API Error:", error);
    return res.status(500).json({ error: "AI service unavailable" });
  }
});

// Configure server properly
const server = app.listen(3000, () => {
  server.keepAliveTimeout = 15000; // Keep-alive timeout
  server.headersTimeout = 20000;   // Headers timeout
  console.log("Server is listening on port 3000...");
});

ViteExpress.bind(app, server);
