import dotenv from 'dotenv';
dotenv.config();
// --- ALL IMPORTS AT THE TOP ---
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { initializeApp } from 'firebase/app'; // <-- Add this new import
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
//<!--CHANGE -------------------------------------------- 6-->
import leaderboardRoute from './routes/leaderboard.js';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App on the server
const firebaseApp = initializeApp(firebaseConfig);

// Import your route files
import lobbyRoute from './routes/lobby.js'; // Make sure file has .js extension if needed
import playRoute from './routes/play.js';   // Make sure file has .js extension if needed

// --- FIX FOR __dirname in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Use the imported routes ---
app.use('/lobby', lobbyRoute);
app.use('/play', playRoute);
//<!--CHANGE -------------------------------------------- 6-->
app.use('/leaderboard', leaderboardRoute);

app.get('/', (req, res) => {
  console.log("I am here");
  res.redirect('/lobby'); // It's good practice to send a response
});

app.get('/generate-quiz', async (req, res) => {
  const { roomCode, userId, city } = req.query;

  if (!roomCode || !userId || !city) {
    return res.status(400).json({ error: "Missing required information." });
  }

  try {
    const db = getFirestore();
    const roomRef = doc(db, 'rooms', roomCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: "Room not found." });
    }

    const roomData = roomSnap.data();
    const playerIndex = roomData.players.findIndex(p => p.userId === userId);

    if (playerIndex === -1) {
      return res.status(404).json({ error: "Player not found in this room." });
    }

    const player = roomData.players[playerIndex];
    const hasTakenQuiz = player.quizzesTaken?.[city] || false;

    if (hasTakenQuiz) {
      return res.status(403).json({ error: `You have already taken the quiz for ${city}.` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API key is not configured." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Generate 5 very easy multiple-choice cultural quiz questions about ${city}.
      Your entire response MUST be a valid JSON array of objects. Do not include any text or markdown.
      Each object must have keys: "question", "options" (an array of 4 strings), and "correctAnswer".
    `;

    const result = await model.generateContent(prompt);
    const jsonText = result.response.text();

    const startIndex = jsonText.indexOf('[');
    const endIndex = jsonText.lastIndexOf(']');
    const jsonString = jsonText.substring(startIndex, endIndex + 1);

    const quizData = JSON.parse(jsonString);

    // --- NEW: Shuffle the options for each question ---
    quizData.forEach(question => {
      // Using the standard Fisher-Yates shuffle algorithm
      for (let i = question.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [question.options[i], question.options[j]] = [question.options[j], question.options[i]];
      }
    });
    // ----------------------------------------------------

    const updatedPlayers = [...roomData.players];
    if (!updatedPlayers[playerIndex].quizzesTaken) {
      updatedPlayers[playerIndex].quizzesTaken = {};
    }
    updatedPlayers[playerIndex].quizzesTaken[city] = true;

    await updateDoc(roomRef, { players: updatedPlayers });

    res.json(quizData);

  } catch (error) {
    console.error("Error in /generate-quiz:", error);
    res.status(500).json({ error: "Failed to generate the quiz." });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});