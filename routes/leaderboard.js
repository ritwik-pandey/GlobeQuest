import express from 'express';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const router = express.Router();

router.get('/', async (req, res) => {
    const { roomCode } = req.query;
    if (!roomCode) return res.redirect('/lobby');

    try {
        const db = getFirestore();
        const roomRef = doc(db, 'rooms', roomCode);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) return res.redirect('/lobby');

        const roomData = roomSnap.data();
        
        // 1. Filter players into winners (in Delhi) and others
        const winners = roomData.players.filter(p => p.currentCity === "Delhi");
        const others = roomData.players.filter(p => p.currentCity !== "Delhi");

        // 2. Sort the winners based on the new rules
        winners.sort((a, b) => {
            // Use a very large number (Infinity) if timeTaken is missing. Lower is better.
            const timeA = a.timeTaken ?? Infinity;
            const timeB = b.timeTaken ?? Infinity;

            if (timeA < timeB) return -1;
            if (timeA > timeB) return 1;

            // If time is the same, sort by gold (higher is better)
            if (a.gold > b.gold) return -1;
            if (a.gold < b.gold) return 1;

            return 0; // It's a tie
        });
        
        // 3. Sort other players by gold for display
        others.sort((a, b) => b.gold - a.gold);

        res.render('leaderboard', { winners, others, roomCode });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.redirect('/lobby');
    }
});

export default router;