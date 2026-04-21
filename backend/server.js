// CodeHelper AI — Node.js + Express backend
require("dotenv").config({ path: require("path").join(__dirname, "..", "config", ".env") });

const express = require("express");
const cors = require("cors");
const path = require("path");
const chatRoute = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve frontend statically (so visiting http://localhost:3000 works)
app.use(express.static(path.join(__dirname, "..", "frontend")));

// API
app.use("/chat", chatRoute);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`CodeHelper AI server running on http://localhost:${PORT}`);
});
