import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cadelAuthUid = process.env.CADEL_AUTH_UID;
const cadelAppUserId = 'u_mihzrqzy_wjurihrkb';

if (!supabaseUrl || !supabaseKey || !cadelAuthUid) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const run = async () => {
  try {
    console.log(`Starting migration for Cadel (Auth UID: ${cadelAuthUid}, App ID: ${cadelAppUserId})`);

    // 1. Delete old credits
    console.log('Deleting existing credits...');
    const { error: deleteError } = await supabase
      .from('credits')
      .delete()
      .eq('owner_id', cadelAuthUid)
      .eq('user_id', cadelAppUserId);

    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
    console.log('Old credits deleted successfully.');

    // 2. Read new credits
    const jsonPath = path.resolve(__dirname, '../CoasterCount_Backup_2026-06-05.json');
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    console.log(`Found ${data.credits.length} credits in backup.`);

    // 3. Transform and insert coasters
    console.log(`Found ${data.coasters.length} coasters in backup. Upserting...`);
    const coastersToInsert = data.coasters.map((c) => ({
      id: c.id,
      name: c.name,
      park: c.park,
      country: c.country,
      type: c.type,
      manufacturer: c.manufacturer,
      image_url: c.imageUrl ?? null,
      is_custom: Boolean(c.isCustom),
      specs: c.specs ?? null,
      variants: Array.isArray(c.variants) ? c.variants.filter((v) => typeof v === 'string') : null,
      audio_url: c.audioUrl ?? null,
    }));
    
    const chunk = (arr, size) => {
      const out = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const cBatches = chunk(coastersToInsert, 500);
    for (let i = 0; i < cBatches.length; i++) {
      const batch = cBatches[i];
      const { error: cError } = await supabase.from('coasters').upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
      if (cError) throw new Error(`Coasters insert failed: ${cError.message}`);
    }
    console.log('Coasters inserted successfully.');

    // 4. Transform credits
    const creditsToInsert = data.credits.map((c) => ({
      id: c.id,
      owner_id: cadelAuthUid,
      user_id: cadelAppUserId,
      coaster_id: c.coasterId,
      date: new Date(c.date).toISOString().slice(0, 10),
      ride_count: Math.max(1, Math.floor(Number(c.rideCount || 1))),
      photo_url: c.photoUrl ?? null,
      gallery: Array.isArray(c.gallery) ? c.gallery.filter((v) => typeof v === 'string') : null,
      notes: c.notes ?? null,
      restraints: c.restraints ?? null,
      variant: c.variant ?? null,
    }));

    // 5. Upsert credits in chunks

    const batches = chunk(creditsToInsert, 500);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const { error: insertError } = await supabase.from('credits').upsert(batch, { onConflict: 'id' });
      if (insertError) throw new Error(`Insert failed for batch ${i}: ${insertError.message}`);
      console.log(`Inserted batch ${i + 1}/${batches.length} (${batch.length} credits)`);
    }

    // 5. Transform and insert wishlist
    const wishlistToInsert = (data.wishlist || []).map((w) => ({
      id: w.id,
      owner_id: cadelAuthUid,
      user_id: cadelAppUserId,
      coaster_id: w.coasterId,
      added_at: new Date(w.addedAt || Date.now()).toISOString(),
      notes: w.notes ?? null,
    }));

    if (wishlistToInsert.length > 0) {
      console.log(`Found ${wishlistToInsert.length} wishlist items. Inserting...`);
      const wBatches = chunk(wishlistToInsert, 500);
      for (let i = 0; i < wBatches.length; i++) {
        const batch = wBatches[i];
        const { error: wInsertError } = await supabase.from('wishlist').upsert(batch, { onConflict: 'id' });
        if (wInsertError) throw new Error(`Wishlist insert failed: ${wInsertError.message}`);
      }
      console.log('Wishlist inserted successfully.');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

run();
