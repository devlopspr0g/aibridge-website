// lib/sync.js
export async function syncToSupabase(supabase) {
  const unsynced = await getAllUnsynced();
  for (const item of unsynced) {
    try {
      await supabase.from('memories').upsert(item.payload);
      const db = await dbPromise;
      await db.delete('sync_queue', item.id);
      // mark synced
      const mem = await db.get('memories', item.id);
      await db.put('memories', { ...mem, synced: 1 });
    } catch (e) {
      console.log('sync failed, keep in queue', e);
    }
  }
}
