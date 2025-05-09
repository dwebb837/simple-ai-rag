import express from "express";
import bodyParser from "body-parser";
import ViteExpress from "vite-express";
import OpenAI from "openai";
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Configure OpenAI with timeout
const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_KEY,
  timeout: 10000 // 10-second timeout
});

const WEATHER_API_KEY = process.env.VITE_OPENWEATHER_API_KEY;

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

const app = express();

// Essential middleware
app.use(bodyParser.json());
app.use((req, res, next) => {
  // Simple CORS handling
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: "City parameter required" });

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${WEATHER_API_KEY}`
    );

    res.json({
      temp: response.data.main.temp,
      description: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      wind: response.data.wind.speed
    });
  } catch (error) {
    console.error("Weather API error:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// Robust chat api endpoint
app.post('/api/chat', async (req, res) => {
  try {
    // Destructure both question and context from request body
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Missing question parameter" });
    }

    let weatherContext = "";
    const messages: any[] = [];

    // Detect weather query
    const weatherMatch = question.match(/weather (?:in|for) ([\w\s]+)/i);
    if (weatherMatch) {
      try {
        const city = weatherMatch[1];
        const weatherRes = await axios.get(`http://localhost:3000/api/weather?city=${city}`);
        weatherContext = `Current weather in ${city}: ${weatherRes.data.temp}°C, ${weatherRes.data.description}. Humidity: ${weatherRes.data.humidity}%, Wind: ${weatherRes.data.wind} m/s`;
      } catch (error) {
        weatherContext = "Weather data unavailable";
      }
    }

    if (context) messages.push({ role: "system", content: context });
    if (weatherContext) messages.push({ role: "system", content: weatherContext });
    messages.push({ role: "user", content: question });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
    });

    const tokenUsage: TokenUsage = {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0
    };

    res.json({
      reply: completion.choices[0].message.content,
      tokens: tokenUsage
    });
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
