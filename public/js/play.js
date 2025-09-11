// public/js/play.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, onSnapshot,updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- NEW QUIZ MODAL & STATE MANAGEMENT ---
const quizModal = document.getElementById('quiz-modal');
const quizQuestionEl = document.getElementById('quiz-question');
const quizOptionsEl = document.getElementById('quiz-options');
const quizFeedbackEl = document.getElementById('quiz-feedback');

let currentQuizData = [];
let currentQuestionIndex = 0;
// ------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyDcoLHRVLcuAu02hz4YXkriRLuJwZv_imc",
  authDomain: "globequest-4616a.firebaseapp.com",
  projectId: "globequest-4616a",
  storageBucket: "globequest-4616a.firebasestorage.app",
  messagingSenderId: "711348925342",
  appId: "1:711348925342:web:5c6fd823666c06847ddc8f",
  measurementId: "G-44WK01SXHC"

};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// This object translates city names into the CSS coordinates from your stylesheet.
const cityCoordinates = {
    "Delhi": { top: '40%', right: '20%' },
    "San-Francisco": { top: '30%', left: '20%' },
    "Paris": { top: '25%', right: '41%' },
    "Cape-town": { top: '71%', right: '37%' },
    "Toronto": { top: '26%', left: '35%' }
};

function goToLobby() { window.location.href = "/lobby"; }

const imageElement = document.getElementById('clickableImage');
const outputElement = document.getElementById('coordinatesOutput');
const imageContainer = document.querySelector('.image-container');
const flightCostElement = document.getElementById("flight-cost");
const ShipCostElement = document.getElementById("ship-cost");


let nextDestination = null;

// --- NEW: Function to render player icons --- gaurav_1
function renderPlayerIcons(players) {
  if (!imageContainer) return;

  document.querySelectorAll(".player-icon").forEach((icon) => icon.remove());

  if (!Array.isArray(players)) return;

  const user = auth.currentUser; // ✅ get current logged-in user
  const userPhotoElement = document.querySelector(".user-photo img");

  players.forEach((player) => {
    if (!player) return;

    const currentCity = player.currentCity;
    if (!currentCity || !cityCoordinates[currentCity]) return;

    const coords = cityCoordinates[currentCity];
    const iconIndex = player.iconIndex !== undefined ? player.iconIndex : 4;

    const iconElement = document.createElement("img");
    iconElement.src = `/img/player-icon${iconIndex}.png`;
    iconElement.className = "player-icon";
    iconElement.title = player.nickname || "Anonymous";
    iconElement.style.top = coords.top;
    if (coords.left) iconElement.style.left = coords.left;
    if (coords.right) iconElement.style.right = coords.right;

    imageContainer.appendChild(iconElement);

    if (user && player.userId === user.uid && userPhotoElement) {
      userPhotoElement.src = `/img/player-icon${iconIndex}.png`;
    }
  });
}
// -----------------------------------------gaurav_1

// Add a click event listener to the image
imageElement.addEventListener('click', (event) => {
    // Get the bounding box of the image, which gives us its position on the page
    const rect = imageElement.getBoundingClientRect();

    // Calculate the x-coordinate relative to the image
    const x = Math.floor(event.clientX - rect.left);

    // Calculate the y-coordinate relative to the image
    const y = Math.floor(event.clientY - rect.top);
    
    // Check if a highlight dot already exists
    let highlightDot = document.getElementById('highlight-dot');
    if (!highlightDot) {
        // If not, create a new one
        highlightDot = document.createElement('div');
        highlightDot.id = 'highlight-dot';
        imageContainer.appendChild(highlightDot);
    }

    // Position the dot at the clicked coordinates. 
    // The 'transform' CSS property centers it on the click point.
    highlightDot.style.left = `${x}px`;
    highlightDot.style.top = `${y}px`;

    // Update the text in the output element with the coordinates
    console.log(x);
    console.log(y);
    
    
});

async function initPlay() {
  // get roomCode from URL or sessionStorage
  const music = document.getElementById('background-music');
  if (music) {
    music.volume = 0.3;
    music.play().catch(error => {
      console.error("Music autoplay was blocked on the play page.", error);
    });
    
  }
  let timerInterval = null;
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('roomCode') || sessionStorage.getItem('roomCode');
  if (!roomCode) return goToLobby();

    const quizButton = document.getElementById('quiz-button');
    if (quizButton) {
      // Find your quizButton event listener inside the initPlay() function

    quizButton.addEventListener('click', async () => {
      console.log('Fetching quiz question from the server...');
      
      // --- Get the required data ---
      const roomCode = sessionStorage.getItem('roomCode');
      const userId = auth.currentUser ? auth.currentUser.uid : null;
      
      // To get the current city, we need to get the latest room data
      const db = getFirestore();
      const roomRef = doc(db, 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists() || !userId) {
          alert("Could not find your game data. Please refresh.");
          return;
      }
      
      const roomData = roomSnap.data();
      const currentUser = roomData.players.find(p => p.userId === userId);
      const city = currentUser ? currentUser.currentCity : null;

      if (!city) {
          return;
      }
      // -------------------------

      try {
        quizButton.disabled = true;

        // --- Construct the new URL with query parameters ---
        const response = await fetch(`/generate-quiz?roomCode=${roomCode}&userId=${userId}&city=${city}`);
        
        const data = await response.json();

        if (!response.ok) {
          // This will now handle our "limit reached" message
          throw new Error(data.error || `Server error: ${response.status}`);
        }
        
        displayQuiz(data);

      } catch (error) {
        console.error("Failed to fetch quiz:", error);
        // Display the specific error message from the server (e.g., limit reached)
        alert(error.message); 
        quizButton.disabled = false;
      }
    });
    }

  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return goToLobby();

  const roomData = snap.data();
  if (roomData.gameState !== 'in-game') return goToLobby();

  

  // Optionally listen for updates (optional)
  onSnapshot(roomRef, ds => {
    if (!ds.exists()) return goToLobby();
        const rd = ds.data();
        if (roomData.gameEndTime && !timerInterval) {
        const timerElement = document.getElementById('game-timer');

        timerInterval = setInterval(() => {
            const remaining = roomData.gameEndTime - Date.now();

            if (remaining <= 0) {
                clearInterval(timerInterval);
                timerElement.textContent = "Time's Up!";
                // Redirect to the leaderboard page
                window.location.href = `/leaderboard?roomCode=${roomCode}`;
            } else {
                const minutes = Math.floor((remaining / 1000) / 60);
                const seconds = Math.floor((remaining / 1000) % 60);
                timerElement.textContent = `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }, 1000);
    }
    if (!ds.exists()) return goToLobby();
    if (rd.gameState !== 'in-game') return goToLobby();
    renderLeaderboard(rd.players || []);
    renderPlayerIcons(rd.players); // --- MODIFIED: Call the new function here ---
    if (auth.currentUser && rd.players) {
      const currentUser = rd.players.find(player => player.userId === auth.currentUser.uid);
      if (currentUser && currentUser.gold !== undefined) {
        const goldElement = document.getElementById('user-gold');
        if (goldElement) {
          goldElement.textContent = `Gold: ${currentUser.gold}`;
        }
      }
    }
    const gotoBtn = document.querySelector('.goto');
    const flightCost = document.querySelector('.flight-cost');
    const shipCost = document.querySelector('.ship-cost');
    const gotoshipBtn = document.querySelector('.gotoship');



    const cityElement = document.getElementById('current-city');
    if (cityElement && rd.players && auth.currentUser) {
      const currentUser = rd.players.find(player => player.userId === auth.currentUser.uid);
      if (currentUser && currentUser.currentCity) {
        cityElement.textContent = `Current City: ${currentUser.currentCity}`;
        if (gotoBtn) {
          shipCost.style.display = "none";
          flightCost.style.display = "none";
          gotoBtn.style.display = "none";
          gotoshipBtn.style.display = "none";

        }
      }
    }
    const currentUser = rd.players.find(player => player.userId === auth.currentUser.uid);
    const markers = document.querySelectorAll('.marker');
    const cityImage = document.querySelector(".city-photo-img");
    markers.forEach(marker => {
      marker.onclick = async () => {
        if (currentUser.citiesVisited && currentUser.citiesVisited.includes(marker.id) && marker.id !== currentUser.currentCity) {
          cityElement.textContent = `${marker.id} (Already Visited)`;
          cityImage.src = `/img/${marker.id}.png`;
          return;
        }
        if (currentUser.currentCity && marker.id !== currentUser.currentCity) {
            nextDestination = marker.id; // ✅ save clicked city
            cityElement.textContent = `Next Destination: ${marker.id}`;
            cityImage.src = `/img/${marker.id}.png`;   
        }else if(currentUser.currentCity && marker.id === currentUser.currentCity){
            cityElement.textContent = `Current Location: ${marker.id}`;
            cityImage.src = `/img/${marker.id}.png`;  
        }
    
        const cityDocRef = doc(db, "citiesGraph", currentUser.currentCity);
        const citySnap = await getDoc(cityDocRef);
        if (!citySnap.exists()) return;

        const cityData = citySnap.data();
        const cost = cityData[nextDestination];
        flightCostElement.textContent = `Cost: ${cost*200}`;
        ShipCostElement.textContent = `Cost: ${cost*100}`;
        

        if (cost === undefined) {
          // no direct path → hide button
          gotoBtn.style.display = "none";
          gotoshipBtn.style.display = "none";

          flightCost.style.display = "none"
          shipCost.style.display = "none"
          console.log(`⚠️ No path from ${currentUser.currentCity} → ${nextDestination}`);
          return;
        }

        if (currentUser.gold < cost) {
          // not enough gold → hide button
          gotoBtn.style.display = "none";
          gotoshipBtn.style.display = "none";
          flightCost.style.display = "inline-block";
          shipCost.style.display = "inline-block";

        } else {
          // enough gold → show button
          flightCost.style.display = "inline-block";
          gotoBtn.style.display = "inline-block";
          shipCost.style.display = "inline-block";
          gotoshipBtn.style.display = "inline-block";

        }

      }

       const placesElement = document.querySelector(".places-visited");
    if (placesElement) {
      const visitedCount = currentUser.citiesVisited
        ? currentUser.citiesVisited.length
        : 0;

      // If nextDestination is already visited, keep count same
      if (currentUser.citiesVisited?.includes(nextDestination)) {
     
        placesElement.textContent = `Places visited: ${visitedCount}`;
      }
    }
    });

    //Flight Button

if (gotoBtn) {
  gotoBtn.addEventListener('click', async () => {
    
    if (nextDestination) {
      console.log(`User wants to go to: ${nextDestination}`);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;

      

      const roomData = snap.data();
      const players = roomData.players || [];

      // find current user
      const idx = players.findIndex(p => p.userId === auth.currentUser.uid);
      const currentUser = players[idx];
      const fromCity = currentUser.currentCity;

      // get the document of the current city
      const cityDocRef = doc(db, "citiesGraph", fromCity);
      const citySnap = await getDoc(cityDocRef);
      if (!citySnap.exists()) {
        console.log("⚠️ City not found in graph:", fromCity);
        return;
      }
      const cityData = citySnap.data();
      const cost = cityData[nextDestination]*200; 
      
        if (currentUser.gold < cost) {
          console.log(`⚠️ Not enough gold! Need ${cost}, but you have ${currentUser.gold}`);
          return;
        }


      // e.g. 300

      if (cost === undefined) {
        console.log(`⚠️ No direct path from ${fromCity} → ${nextDestination}`);
        return;
      }
      
      if (idx !== -1) {
        // ensure citiesVisited exists
        players[idx].citiesVisited = players[idx].citiesVisited || [];
        // push nextDestination
        players[idx].citiesVisited.push(nextDestination);

        players[idx].currentCity = nextDestination;

        players[idx].gold -= cost;

        players[idx].timeTaken += cost/200;


        // write back updated players array
        await updateDoc(roomRef, {
          players: players
        });

        // also update the UI immediately (optional, snapshot will also update it)
      const cityElement = document.getElementById('current-city');
      if (cityElement) {
        cityElement.textContent = `Current City: ${nextDestination}`;
      }

        console.log("Updated Firestore with new destination!");
      }

    } else {
      console.log("No destination selected yet!");
    }
  });

  //SHIP Button

  } 
    if(gotoshipBtn){
      gotoshipBtn.addEventListener('click', async () => {
        
        if (nextDestination) {
          console.log(`User wants to go to: ${nextDestination}`);
          const snap = await getDoc(roomRef);
          if (!snap.exists()) return;

          

          const roomData = snap.data();
          const players = roomData.players || [];

          // find current user
          const idx = players.findIndex(p => p.userId === auth.currentUser.uid);
          const currentUser = players[idx];
          const fromCity = currentUser.currentCity;

          // get the document of the current city
          const cityDocRef = doc(db, "citiesGraph", fromCity);
          const citySnap = await getDoc(cityDocRef);
          if (!citySnap.exists()) {
            console.log("⚠️ City not found in graph:", fromCity);
            return;
          }
          const cityData = citySnap.data();
          const cost = cityData[nextDestination]*100; 
          
            if (currentUser.gold < cost) {
              console.log(`⚠️ Not enough gold! Need ${cost}, but you have ${currentUser.gold}`);
              return;
            }


          // e.g. 300

          if (cost === undefined) {
            console.log(`⚠️ No direct path from ${fromCity} → ${nextDestination}`);
            return;
          }
          
          if (idx !== -1) {
            // ensure citiesVisited exists
            players[idx].citiesVisited = players[idx].citiesVisited || [];
            // push nextDestination
            players[idx].citiesVisited.push(nextDestination);

            players[idx].currentCity = nextDestination;

            players[idx].gold -= cost;

            players[idx].timeTaken += (cost/100)*3;

            // write back updated players array
            await updateDoc(roomRef, {
              players: players
            });

            // also update the UI immediately (optional, snapshot will also update it)
          const cityElement = document.getElementById('current-city');
          if (cityElement) {
            cityElement.textContent = `Current City: ${nextDestination}`;
          }

            console.log("Updated Firestore with new destination!");
          }

        } else {
          console.log("No destination selected yet!");
        }
      });
    }
  });
}

// wait for auth if necessary
onAuthStateChanged(auth, async (user) => {
  if (!user) return goToLobby();

  const roomCode =
    new URLSearchParams(window.location.search).get("roomCode") ||
    sessionStorage.getItem("roomCode");
  if (!roomCode) return goToLobby();

  const roomRef = doc(db, "rooms", roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return goToLobby();

  const data = snap.data();
  const players = Array.isArray(data.players) ? data.players : [];

  const existingIdx = players.findIndex((p) => p.userId === user.uid);

  // Generate a list of available icon indexes
  const usedIcons = players
    .map((p) => p.iconIndex)
    .filter((i) => i !== undefined);
  const totalIcons = 5; // total player icons available
  let availableIcons = [];
  for (let i = 0; i < totalIcons; i++) {
    if (!usedIcons.includes(i)) availableIcons.push(i);
  }

  let assignedIconIndex;
  if (availableIcons.length > 0) {
    assignedIconIndex =
      availableIcons[Math.floor(Math.random() * availableIcons.length)];
  } else {
    // fallback: if all icons are taken, reuse randomly
    assignedIconIndex = Math.floor(Math.random() * totalIcons);
  }

  if (existingIdx === -1) {
    // Add new player with unique icon
    players.push({
      userId: user.uid,
      nickname: user.displayName || "Anonymous",
      iconIndex: assignedIconIndex,
      currentCity: "San-Francisco",
      gold: 1000,
    });
    await updateDoc(roomRef, { players });
  } else {
    // Ensure existing player has a valid iconIndex
    if (players[existingIdx].iconIndex === undefined) {
      players[existingIdx].iconIndex = assignedIconIndex;
      await updateDoc(roomRef, { players });
    }
  }

  // Start listening to changes
  initPlay();
});
//Leaderboard

const leaderboardList = document.getElementById("leaderboard-list");

function renderLeaderboard(players) {
  // sort by points descending
  players.sort((a, b) => (b.points || 0) - (a.points || 0));

  leaderboardList.innerHTML = "";
  players.forEach((p, index) => {
    const li = document.createElement("li");
    const isCurrentUser = auth.currentUser && p.userId === auth.currentUser.uid;
    li.innerHTML = `
      <span style="color: grey;">${index + 1}.</span>
      <span style="color: ${isCurrentUser ? 'green' : 'black'};"> ${p.nickname}</span>
      <br>
      <span>${p.timeTaken || 0} hr</span>
      <br>
      <span> ${p.gold || 0} 🪙</span>
    `;
    leaderboardList.appendChild(li);
  });
}

//QUIZ

async function displayQuiz(quizArray) {
  // --- State for the current quiz session ---
  let currentQuestionIndex = 0;
  let score = 0;
  // -----------------------------------------

  // This function shows one question at a time
  async function showNextQuestion() {
    const roomCode = sessionStorage.getItem("roomCode") || new URLSearchParams(window.location.search).get("roomCode");
    const roomRef = doc(db, "rooms", roomCode);
    // Clear previous options and feedback
    quizOptionsEl.innerHTML = '';
    quizFeedbackEl.textContent = '';

    // Check if the quiz is over
    if (currentQuestionIndex >= quizArray.length) {
      quizQuestionEl.textContent = "Quiz Complete!";
      
      // --- LOG THE FINAL SCORE TO THE CONSOLE ---
      console.log(`Quiz finished! Final Score: ${score} / ${quizArray.length}`);

      const goldEarned = score * 20; // for example: 100 gold per correct answer

// Fetch current room snapshot
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;

      const roomData = snap.data();
      const players = roomData.players || [];

      // Find current user
      const idx = players.findIndex(p => p.userId === auth.currentUser.uid);
      if (idx !== -1) {
        // Increase gold
        players[idx].gold = (players[idx].gold || 0) + goldEarned;
        players[idx].timeTaken += 1;
        // Save back to Firestore
        await updateDoc(roomRef, { players: players });

        console.log(`Gold updated! +${goldEarned}, total: ${players[idx].gold}`);
      }
      // --------------------------------------------

      setTimeout(() => {
        quizModal.style.display = 'none';
        document.getElementById('quiz-button').disabled = false;
      }, 2000);
      return;
    }

    const questionData = quizArray[currentQuestionIndex];
    quizQuestionEl.textContent = `Q${currentQuestionIndex + 1}: ${questionData.question}`;

    // Create a button for each option
    questionData.options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option;
      button.className = 'option-btn';
      
      button.addEventListener('click', () => {
        document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);

        if (option === questionData.correctAnswer) {
          quizFeedbackEl.textContent = 'Correct!';
          quizFeedbackEl.style.color = '#4CAF50';
          
          // --- INCREMENT THE SCORE ---
          score++;
          // ---------------------------

        } else {
          quizFeedbackEl.textContent = `Wrong! Correct answer: ${questionData.correctAnswer}`;
          quizFeedbackEl.style.color = '#F44336';
        }
        
        currentQuestionIndex++;
        setTimeout(showNextQuestion, 1500);
      });
      
      quizOptionsEl.appendChild(button);
    });
  }

  // --- Start the quiz ---
  quizModal.style.display = 'flex';
  showNextQuestion(); // Show the first question
}

