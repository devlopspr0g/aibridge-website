// lib/sync.js - FIXED - syncs to Render + Supabase
import { getQueue, dbPromise } from "./idb.js";

const RENDER_API = "https://aibridge-api-render-1.onrender.com";

// Called by memory.js
export async function syncToCloud() {
  const queue = await getQueue();
  if (queue.length === 0) return;

  for (const item of queue) {
    try {
      const text = item.payload?.text || item.text;
      if (!text) continue;
      
      await fetch(`${RENDER_API}/api/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
    } catch (e) {
      console.log("Render sync failed, keep offline", e.message);
      return; // stop, keep queue for later
    }
  }
  console.log(`Synced ${queue.length} to Render`);
  // Don't clear queue here - Supabase sync will clear after both succeed
}

// Called by dashboard for Supabase
export async function syncToSupabase(supabase) {
  const { getAllUnsynced } = await import("./idb.js");
  const unsynced = await getAllUnsynced();
  
  for (const item of unsynced) {
    try {
      // 1. Sync to Supabase
      if (supabase && item.payload) {
        await supabase.from('memories').upsert(item.payload);
      }
      
      // 2. Sync to Render
      await syncToCloud();
      
      // 3. Mark synced + clear queue
      const db = await dbPromise;
      await db.delete('sync_queue', item.id);
      const mem = await db.get('memories', item.id);
      if (mem) {
        await db.put('memories', { ...mem, synced: 1 });
      }
    } catch (e) {
      console.log('sync failed, keep in queue', e.message);
    }
  }
}

// Full sync - both Render + Supabase
export async function syncAll(supabase = null) {
  await syncToCloud();
  if (supabase) await syncToSupabase(supabase);
}
