const express = require("express");
const cors = require("cors");
const path = require("path");

const { startAutoRefresh, getData } = require("./dataFeed");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 🔥 Serve frontend
app.use(express.static(path.join(__dirname)));

// Start background data
startAutoRefresh();

// Home route → open UI directly
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// API route
app.get("/api/prices", (req, res) => {
  res.json(getData());
});

// Start server
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
