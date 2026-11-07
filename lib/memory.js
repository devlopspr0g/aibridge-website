// lib/memory.js - REAL memory brain (uses idb.js + sync.js)
import { saveLocal, getAllLocal, getQueue } from "./idb.js";
import { syncToCloud } from "./sync.js";

const API = "https://aibridge-api-render-1.onrender.com";

// Save anything - offline first
export async function remember(text) {
  try {
    // 1. Get embedding from Render (free 384-dim)
    const res = await fetch(`${API}/api/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();

    // 2. Save to ai_bridge_db (offline)
    await saveLocal(text, data.saved ? [] : []);

    // 3. Sync queue
    await syncToCloud();

    console.log("Remembered:", text);
    return data;
  } catch (e) {
    // Offline? Save locally anyway
    await saveLocal(text, []);
    console.log("Saved offline:", text);
  }
}

// Recall memories - offline first
export async function recall(query = "") {
  const local = await getAllLocal();
  if (query === "") return local;

  // If query, search on Render
  const res = await fetch(`${API}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  return data.results;
}

// For Nova twin
export async function getMemoriesForNova() {
  return await getAllLocal();
}
