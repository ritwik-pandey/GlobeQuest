// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDcoLHRVLcuAu02hz4YXkriRLuJwZv_imc",
  authDomain: "globequest-4616a.firebaseapp.com",
  projectId: "globequest-4616a",
  storageBucket: "globequest-4616a.firebasestorage.app",
  messagingSenderId: "711348925342",
  appId: "1:711348925342:web:5c6fd823666c06847ddc8f",
  measurementId: "G-44WK01SXHC"

};


// --- App Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global State Variables ---
let currentUser = null;
let currentRoomCode = null;
let unsubscribeFromRoom = null;
let isStartingGame = false;
const PLAYER_AVATARS = ['🧑‍🚀', '🕵️‍♀️', '👩‍🔬', '👨‍🎨', '👩‍💻', '👨‍✈️', '🌍', '🚀'];


// --- DOM Element References ---
const loginView = document.getElementById('loginView');
const lobbyView = document.getElementById('lobbyView');
const gameView = document.getElementById('gameView');
const nicknameInput = document.getElementById('nicknameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playerList = document.getElementById('playerList');
const readyBtn = document.getElementById('readyBtn');
const allReadyMessage = document.getElementById('allReadyMessage');
const copyCodeBtn = document.getElementById('copyCodeBtn');

// --- Helper Functions ---

function showMessage(message, isError = true) {
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    messageText.textContent = message;
    messageBox.className = `fixed bottom-5 right-5 text-white py-3 px-5 rounded-lg shadow-xl opacity-0 transform translate-y-2 ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    messageBox.classList.remove('hidden', 'opacity-0', 'translate-y-2');
    messageBox.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        messageBox.classList.remove('opacity-100', 'translate-y-0');
        messageBox.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => messageBox.classList.add('hidden'), 500);
    }, 3000);
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function getAvatarForUser(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash % PLAYER_AVATARS.length);
    return PLAYER_AVATARS[index];
}

// --- View Rendering & Switching ---

function renderLobby(roomData) {
    if (isStartingGame) return;
    const players = roomData.players;
    const existingPlayerIds = new Set([...playerList.children].map(el => el.dataset.userId));
    const incomingPlayerIds = new Set(players.map(p => p.userId));
    let allReady = players.length > 0;

    existingPlayerIds.forEach(id => {
        if (!incomingPlayerIds.has(id)) {
            const el = playerList.querySelector(`[data-user-id="${id}"]`);
            if (el) el.remove();
        }
    });

    players.forEach(player => {
        if (!player.isReady) allReady = false;
        let playerElement = playerList.querySelector(`[data-user-id="${player.userId}"]`);
        if (!playerElement) {
            playerElement = document.createElement('div');
            playerElement.dataset.userId = player.userId;
            playerElement.className = 'player-row flex items-center justify-between bg-slate-900/50 p-3 rounded-lg';
            playerList.appendChild(playerElement);
        }
        playerElement.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="player-avatar ${player.isReady ? 'ready' : ''}">${getAvatarForUser(player.userId)}</div>
                <span class="font-semibold text-gray-200">${player.nickname} ${player.userId === currentUser.uid ? '<span class="text-xs text-teal-400">(You)</span>' : ''}</span>
            </div>
            ${player.isReady ? '<span class="text-green-400 font-bold">Ready</span>' : '<span class="text-yellow-400 font-semibold">Not Ready</span>'}`;
        
        if (player.userId === currentUser.uid) {
            readyBtn.textContent = player.isReady ? 'Unready' : 'Ready Up';
            readyBtn.classList.toggle('btn-ready', !player.isReady);
            readyBtn.classList.toggle('btn-unready', player.isReady);
        }
    });
    
    if (allReady ) {
        allReadyMessage.classList.remove('hidden');
        if (currentUser.uid === roomData.hostId && !isStartingGame) {
            isStartingGame = true;
            startGameWithCountdown(currentRoomCode);
        }
    } else if(allReady && players.length < 2){
        allReadyMessage.classList.remove('hidden');
        allReadyMessage.textContent = "Only one player is available";
    }else{
        allReadyMessage.classList.add('hidden');
    }
}

function switchToLoginView() {
    if (unsubscribeFromRoom) unsubscribeFromRoom();
    unsubscribeFromRoom = null;
    currentRoomCode = null;
    isStartingGame = false;
    playerList.innerHTML = '';
    sessionStorage.removeItem('roomCode');  // <-- CLEAR
    lobbyView.classList.add('hidden');
    gameView.classList.add('hidden');
    loginView.classList.remove('hidden');
}

function switchToLobbyView(roomCode) {
    currentRoomCode = roomCode;
    roomCodeDisplay.textContent = roomCode;
        sessionStorage.setItem('roomCode', roomCode);   
    loginView.classList.add('hidden');
    gameView.classList.add('hidden');
    lobbyView.classList.remove('hidden');
}

function switchToGameView() {
    if (unsubscribeFromRoom) unsubscribeFromRoom();
    unsubscribeFromRoom = null;
    loginView.classList.add('hidden');
    lobbyView.classList.add('hidden');
    gameView.classList.remove('hidden');
}

// --- Core Firestore Logic ---

async function startGameWithCountdown(roomCode) {
    const roomRef = doc(db, 'rooms', roomCode);
    let countdown = 6;
    allReadyMessage.textContent = `All players are ready! Starting game in ${countdown}...`;

    const interval = setInterval(async () => {
        countdown--;
        allReadyMessage.textContent = `All players are ready! Starting game in ${countdown}...`;
        if (countdown === 0) {
            clearInterval(interval);
            await updateDoc(roomRef, { gameState: 'in-game' });
            window.location.href = `/play?roomCode=${encodeURIComponent(roomCode)}`;
        }
    }, 1000);
}


function listenToRoom(roomCode) {
    const roomRef = doc(db, 'rooms', roomCode);
    if (unsubscribeFromRoom) unsubscribeFromRoom();

    unsubscribeFromRoom = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
            const roomData = docSnap.data();
            if (roomData.gameState === 'lobby') {
                renderLobby(roomData);
            } else if (roomData.gameState === 'in-game') {
                switchToGameView();
                window.location.href = `/play?roomCode=${encodeURIComponent(roomCode)}`;
            }
        } else {
            showMessage("The host has closed the room.");
            switchToLoginView();
        }
    });
}

// --- Event Handlers ---

createRoomBtn.onclick = async () => {
    if (!currentUser) return showMessage("Connecting... please wait a moment.");
    const nickname = nicknameInput.value.trim();
    if (!nickname) return showMessage("Please enter a nickname.");

    const roomCode = generateRoomCode();
    const roomRef = doc(db, 'rooms', roomCode);
    //HOST GOLD
    const newPlayer = { userId: currentUser.uid, nickname: nickname, isReady: false, gold: 5000, currentCity: "San-Francisco", citiesVisited: ["San-Francisco"]};
    try {
        await setDoc(roomRef, {
            roomCode: roomCode, hostId: currentUser.uid, gameState: "lobby",
            players: [newPlayer], createdAt: new Date()
        });
        switchToLobbyView(roomCode);
        listenToRoom(roomCode);
    } catch (error) {
        console.error("Error creating room: ", error);
        showMessage("Could not create room. Please try again.");
    }
};

joinRoomBtn.onclick = async () => {
    if (!currentUser) return showMessage("Connecting... please wait a moment.");
    const nickname = nicknameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!nickname || !roomCode) return showMessage("Please enter both a nickname and a room code.");

    const roomRef = doc(db, 'rooms', roomCode);
    try {
        const docSnap = await getDoc(roomRef);
        if (!docSnap.exists()) return showMessage("Room not found. Check the code.");
        
        const roomData = docSnap.data();
        if (roomData.gameState !== 'lobby') return showMessage("This game has already started.");
        
        if (roomData.players.some(p => p.userId === currentUser.uid)) {
             switchToLobbyView(roomCode);
             return listenToRoom(roomCode);
        }
        //USER GOLD
        const newPlayer = { userId: currentUser.uid, nickname: nickname, isReady: false, gold: 5000,currentCity: "San-Francisco", citiesVisited: ["San-Francisco"]};
        await updateDoc(roomRef, { players: arrayUnion(newPlayer) });
        switchToLobbyView(roomCode);
        listenToRoom(roomCode);
    } catch (error) {
        console.error("Error joining room: ", error);
        showMessage("Could not join room. Please try again.");
    }
};

readyBtn.onclick = async () => {
    if (!currentUser || !currentRoomCode) return showMessage("Connecting... please wait a moment.");

    const roomRef = doc(db, 'rooms', currentRoomCode);
    try {
        const docSnap = await getDoc(roomRef);
        if (docSnap.exists()) {
            const players = docSnap.data().players;
            const playerIndex = players.findIndex(p => p.userId === currentUser.uid);
            if (playerIndex > -1) {
                players[playerIndex].isReady = !players[playerIndex].isReady;
                await updateDoc(roomRef, { players: players });
            }
        }
    } catch (error) {
        console.error("Error toggling ready status: ", error);
        showMessage("Could not update ready status.");
    }
};

copyCodeBtn.onclick = () => {
    navigator.clipboard.writeText(roomCodeDisplay.textContent).then(() => {
        showMessage("Room code copied to clipboard!", false);
    }, () => showMessage("Failed to copy code."));
};

// --- Lifecycle Handlers ---

window.addEventListener('beforeunload', async (event) => {
    if (currentUser && currentRoomCode) {
        const roomRef = doc(db, 'rooms', currentRoomCode);
        const docSnap = await getDoc(roomRef);
        if (docSnap.exists()) {
            const roomData = docSnap.data();
            if (roomData.hostId === currentUser.uid) {
                // If host leaves, delete the room for everyone
                await deleteDoc(roomRef);
            } else {
                // If a player leaves, just remove them from the list
                const playerToRemove = roomData.players.find(p => p.userId === currentUser.uid);
                if (playerToRemove) {
                    await updateDoc(roomRef, {
                        players: arrayRemove(playerToRemove)
                    });
                }
            }
        }
    }
});


window.onload = async () => {
    try {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
        console.log("Signed in anonymously with UID:", currentUser.uid);
    } catch (error) {
        console.error("Anonymous sign-in failed: ", error);
        showMessage("Could not connect to the server. Please refresh.");
    }
};