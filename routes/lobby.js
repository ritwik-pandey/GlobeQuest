const express = require("express");
const router = express.Router();

// GET /lobby → render EJS
router.get("/", (req, res) => {
    res.render("lobby"); 
});

module.exports = router;
