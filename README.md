# GlobeQuest 🌍

## Overview
GlobeQuest is an interactive web-based multiplayer trivia and cultural exploration game. Players can join rooms, explore various cities around the world, and test their knowledge with dynamically generated quizzes.

### 🔗 Live Preview
The application is currently hosted and playable at: **[https://globequest.onrender.com](https://globequest.onrender.com)**

## Key Features
- **Lobby System:** Create or join multiplayer rooms to play with friends.
- **AI-Powered Quizzes:** Uses the Google Gemini API to dynamically generate unique cultural and geographical quiz questions for different cities.
- **Real-time Database:** Utilizes Firebase Firestore to keep track of players, room states, and score data in real-time.
- **Seamless Authentication:** Frictionless integration with Firebase Anonymous Auth so players can jump straight into the action.
- **Leaderboards:** Competitive scoring system tracks who knows the most about the globe.

## Tech Stack
- **Backend Framework:** Node.js with Express.js
- **Templating Engine:** EJS (Embedded JavaScript)
- **Database & Auth:** Firebase (Firestore & Authentication)
- **AI Integration:** Google Gemini API (`gemini-1.5-flash`)

## Prerequisites
To run this project locally, you will need:
- [Node.js](https://nodejs.org/) installed on your machine.
- A Firebase project set up with Firestore Database and Anonymous Authentication enabled.
- A Google Gemini API Key.

## Local Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd GlobeQuest
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and configure the following environment variables:
   ```env
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   FIREBASE_APP_ID=your_firebase_app_id
   FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
   
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```
   *The server uses `nodemon` and will run on `http://localhost:4000` by default. Navigate to the URL in your browser to start playing!*

## Project Structure
- `/public` - Contains static assets (CSS stylesheets, client-side scripts, images).
- `/routes` - Express route handlers (`lobby.js`, `play.js`, `leaderboard.js`).
- `/views` - EJS templates for rendering the user interface.
- `server.js` - The main entry point of the application handling main configurations, Firebase initialization, and AI integration logic.

## License
This project is licensed under the ISC License.
