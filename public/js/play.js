// public/js/play.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, onSnapshot,updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

function goToLobby() { window.location.href = "/lobby"; }

const imageElement = document.getElementById('clickableImage');
const outputElement = document.getElementById('coordinatesOutput');
const imageContainer = document.querySelector('.image-container');

let nextDestination = null;

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
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('roomCode') || sessionStorage.getItem('roomCode');
  if (!roomCode) return goToLobby();

  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return goToLobby();

  const roomData = snap.data();
  if (roomData.gameState !== 'in-game') return goToLobby();

  

  // Optionally listen for updates (optional)
  onSnapshot(roomRef, ds => {
    if (!ds.exists()) return goToLobby();
    const rd = ds.data();
    if (rd.gameState !== 'in-game') return goToLobby();
    renderLeaderboard(rd.players || []);
    if (auth.currentUser && rd.players) {
      const currentUser = rd.players.find(player => player.userId === auth.currentUser.uid);
      if (currentUser && currentUser.gold !== undefined) {
        const goldElement = document.getElementById('user-gold');
        if (goldElement) {
          goldElement.textContent = `Gold: ${currentUser.gold}`;
        }
      }
    }
    const cityElement = document.getElementById('current-city');
    if (cityElement && rd.players && auth.currentUser) {
      const currentUser = rd.players.find(player => player.userId === auth.currentUser.uid);
      if (currentUser && currentUser.currentCity) {
        cityElement.textContent = `Current City: ${currentUser.currentCity}`;
      }
    }
    const currentUser = rd.players.find(player => player.userId === auth.currentUser.uid);
    const markers = document.querySelectorAll('.marker');
    const cityImage = document.querySelector(".city-photo-img");
    markers.forEach(marker => {
      marker.onclick = () => {
        if (currentUser.currentCity && marker.id !== currentUser.currentCity) {
            nextDestination = marker.id; // ✅ save clicked city
            cityElement.textContent = `Next Destination = ${marker.id}`;
            cityImage.src = `/img/${marker.id}.png`;
            
        }
      };
    });

    const gotoBtn = document.querySelector('.goto');
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
      if (idx !== -1) {
        // ensure citiesVisited exists
        players[idx].citiesVisited = players[idx].citiesVisited || [];
        // push nextDestination
        players[idx].citiesVisited.push(nextDestination);

        players[idx].currentCity = nextDestination;

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
onAuthStateChanged(auth, (user) => {
  // if your app requires auth, ensure user exists — else redirect
  // optional: if you don't rely on auth here, call initPlay() directly
  initPlay();
});

const leaderboardList = document.getElementById("leaderboard-list");

function renderLeaderboard(players) {
  // sort by points descending
  players.sort((a, b) => (b.points || 0) - (a.points || 0));

  leaderboardList.innerHTML = "";
  players.forEach((p, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${index + 1}. ${p.nickname}</span>
      <span>${p.points || 0}</span>
    `;
    leaderboardList.appendChild(li);
  });
}

//Destination
 // keep track of clicked city



