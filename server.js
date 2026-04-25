import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "BSPL1-leaderboards";
const DB_FILE = "./db.json";

// load db
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE));
}

// save db
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// fetch player from Brawl Stars API
async function fetchPlayer(tag) {
  const cleanTag = tag.replace("#", "%23");

  const res = await fetch(
    `https://api.brawlstars.com/v1/players/${cleanTag}`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`
      }
    }
  );

  if (!res.ok) return null;
  return await res.json();
}

// PL1 check
function isFullPL1(player) {
  return player.brawlers.every(b => b.power === 1);
}

// SUBMIT PLAYER
app.post("/submit", async (req, res) => {
  const tag = req.body.tag;

  const player = await fetchPlayer(tag);

  if (!player) {
    return res.json({ ok: false, message: "Player not found" });
  }

  if (!isFullPL1(player)) {
    return res.json({ ok: false, message: "Not full PL1 ❌" });
  }

  const db = loadDB();

  const exists = db.find(p => p.tag === player.tag);

  if (!exists) {
    db.push({
      tag: player.tag,
      name: player.name,
      trophies: player.trophies,
      updated: Date.now()
    });

    saveDB(db);
  }

  res.json({ ok: true, message: "Added to PL1 leaderboard ✅" });
});

// GET leaderboard
app.get("/leaderboard", (req, res) => {
  const db = loadDB();

  db.sort((a, b) => b.trophies - a.trophies);

  res.json(db);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});