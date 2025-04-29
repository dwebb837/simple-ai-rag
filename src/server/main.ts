import express from "express";
import bodyParser from "body-parser";
import ViteExpress from "vite-express";
import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_KEY });

const app = express();
app.use(bodyParser.json());

app.post('/api/chat', async (req, res) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: req.body.question }]
  });
  res.json({ reply: completion.choices[0].message.content });
});

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000...")
);
