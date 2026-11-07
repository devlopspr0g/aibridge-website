// lib/idb.js
import { openDB } from 'idb';

export const dbPromise = openDB('ai-bridge-core', 1, {
  upgrade(db) {
    // Main memories - same shape as Supabase
    if (!db.objectStoreNames.contains('memories')) {
      const store = db.createObjectStore('memories', { keyPath: 'id' });
      store.createIndex('workspace_id', 'workspace_id');
      store.createIndex('synced', 'synced');
      store.createIndex('created_at', 'created_at');
    }
    // Queue for Supabase sync
    if (!db.objectStoreNames.contains('sync_queue')) {
      db.createObjectStore('sync_queue', { keyPath: 'id' });
    }
    // Workspaces
    if (!db.objectStoreNames.contains('workspaces')) {
      db.createObjectStore('workspaces', { keyPath: 'id' });
    }
  }
});

// Save local first
export async function saveMemoryLocal(memory) {
  const db = await dbPromise;
  await db.put('memories', { ...memory, synced: 0, created_at: Date.now() });
  await db.put('sync_queue', { id: memory.id, action: 'upsert', payload: memory });
}

export async function getAllUnsynced() {
  const db = await dbPromise;
  return db.getAll('sync_queue');
}
