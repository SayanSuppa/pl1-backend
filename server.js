import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;
const DB_FILE = "./db.json";

// DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// fetch player (NO node-fetch needed)
async function fetchPlayer(tag) {
  try {
    const cleanTag = encodeURIComponent(tag);

    console.log("TAG RECEIVED:", tag);
    console.log("CLEAN TAG:", cleanTag);
    console.log("API KEY EXISTS:", !!API_KEY);

    const res = await fetch(
      `https://api.brawlstars.com/v1/players/${cleanTag}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`
        }
      }
    );

    const text = await res.text();
    console.log("RAW API RESPONSE:", text);

    if (!res.ok) return null;

    return JSON.parse(text);
  } catch (err) {
    console.log("FETCH ERROR:", err);
    return null;
  }
}

// PL1 check
function isFullPL1(player) {
  return player.brawlers.every(b => b.power === 1);
}

// submit
app.post("/submit", async (req, res) => {
  const tag = req.body.tag;

  if (!tag) {
    return res.json({ ok: false, message: "No tag provided" });
  }

  const player = await fetchPlayer(tag);

  if (!player) {
    return res.json({ ok: false, message: "Player not found (API issue or wrong tag)" });
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
      trophies: player.trophies
    });

    saveDB(db);
  }

  res.json({ ok: true, message: "Added to PL1 leaderboard ✅" });
});

// leaderboard
app.get("/leaderboard", (req, res) => {
  const db = loadDB();

  db.sort((a, b) => b.trophies - a.trophies);

  // add rank here
  const ranked = db.map((p, i) => ({
    ...p,
    rank: i + 1,
    is_full_pl1: true
  }));

  res.json(ranked);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
