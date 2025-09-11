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

let nextDestination = null;

// --- NEW: Function to render player icons --- gaurav_1
function renderPlayerIcons(players) {
    if (!imageContainer) return;

    // First, remove all previously rendered player icons to prevent duplicates
    const existingIcons = document.querySelectorAll('.player-icon');
    existingIcons.forEach(icon => icon.remove());

    // Loop through each player and draw their icon on the map
    players.forEach(player => {
        if (player.currentCity && cityCoordinates[player.currentCity]) {
            const coords = cityCoordinates[player.currentCity];

            // Create the icon element
            const iconElement = document.createElement('img');
            iconElement.src = '/img/player-icon.png'; // Make sure you have this image!
            iconElement.className = 'player-icon';
            iconElement.title = player.nickname; // Shows player name on hover

            // Apply coordinates from our object
            iconElement.style.top = coords.top;
            if (coords.left) {
                iconElement.style.left = coords.left;
            }
            if (coords.right) {
                iconElement.style.right = coords.right;
            }

            // Add the icon to the map container
            imageContainer.appendChild(iconElement);
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

    const cityElement = document.getElementById('current-city');
    if (cityElement && rd.players && auth.currentUser) {
      const currentUser = rd.players.find(player => player.userId === auth.currentUser.uid);
      if (currentUser && currentUser.currentCity) {
        cityElement.textContent = `Current City: ${currentUser.currentCity}`;
        if (gotoBtn) {
          gotoBtn.style.display = "none";
        }
      }
    }
    const currentUser = rd.players.find(player => player.userId === auth.currentUser.uid);
    const markers = document.querySelectorAll('.marker');
    const cityImage = document.querySelector(".city-photo-img");
    markers.forEach(marker => {
      marker.onclick = async () => {
        if (currentUser.currentCity && marker.id !== currentUser.currentCity) {
            nextDestination = marker.id; // ✅ save clicked city
            cityElement.textContent = `Next Destination = ${marker.id}`;
            cityImage.src = `/img/${marker.id}.png`;   
        }else if(currentUser.currentCity && marker.id === currentUser.currentCity){
            cityElement.textContent = `Current Destination = ${marker.id}`;
            cityImage.src = `/img/${marker.id}.png`;  
        }
        const cityDocRef = doc(db, "citiesGraph", currentUser.currentCity);
        const citySnap = await getDoc(cityDocRef);
        if (!citySnap.exists()) return;

        const cityData = citySnap.data();
        const cost = cityData[nextDestination];

        if (cost === undefined) {
          // no direct path → hide button
          gotoBtn.style.display = "none";
          console.log(`⚠️ No path from ${currentUser.currentCity} → ${nextDestination}`);
          return;
        }

        if (currentUser.gold < cost) {
          // not enough gold → hide button
          gotoBtn.style.display = "none";
        } else {
          // enough gold → show button
          gotoBtn.style.display = "inline-block";
        }
      };
    });

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
      const cost = cityData[nextDestination]; 
      
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



