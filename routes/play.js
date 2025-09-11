import express from "express"; // <-- CHANGE THIS LINE
const router = express.Router();

router.get("/", (req, res) => {
  res.render("play");
});


// At the end of the file
export default router;