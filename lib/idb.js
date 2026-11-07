// lib/idb.js - FIXED - ai_bridge_db + Supabase compatible
import { openDB } from 'idb';

export const dbPromise = openDB('ai_bridge_db', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('memories')) {
      const store = db.createObjectStore('memories', { keyPath: 'id' });
      store.createIndex('workspace_id', 'workspace_id');
      store.createIndex('synced', 'synced');
      store.createIndex('created_at', 'created_at');
    }
    if (!db.objectStoreNames.contains('sync_queue')) {
      db.createObjectStore('sync_queue', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('workspaces')) {
      db.createObjectStore('workspaces', { keyPath: 'id' });
    }
  }
});

// --- NEW API used by memory.js ---
export async function saveLocal(text, embedding = []) {
  const id = Date.now().toString();
  const memory = { 
    id, 
    text, 
    embedding, 
    workspace_id: 'default',
    synced: 0, 
    created_at: Date.now(),
    created: new Date().toISOString()
  };
  return saveMemoryLocal(memory);
}

export async function getAllLocal() {
  const db = await dbPromise;
  return db.getAll('memories');
}

export async function getQueue() {
  const db = await dbPromise;
  return db.getAll('sync_queue');
}

export async function clearQueue() {
  const db = await dbPromise;
  await db.clear('sync_queue');
}

// --- YOUR OLD API (keep for Supabase sync) ---
export async function saveMemoryLocal(memory) {
  const db = await dbPromise;
  const mem = { ...memory, synced: memory.synced ?? 0, created_at: memory.created_at ?? Date.now() };
  await db.put('memories', mem);
  await db.put('sync_queue', { id: mem.id, action: 'upsert', payload: mem, text: mem.text });
}

export async function getAllUnsynced() {
  const db = await dbPromise;
  return db.getAll('sync_queue');
}

export async function markSynced(id) {
  const db = await dbPromise;
  const mem = await db.get('memories', id);
  if (mem) {
    mem.synced = 1;
    await db.put('memories', mem);
  }
  await db.delete('sync_queue', id);
}
