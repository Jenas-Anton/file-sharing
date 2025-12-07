import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'uploads';

if (!supabaseUrl || !supabaseServiceKey) {
  // This file runs on the server. Throw at import time to make misconfiguration obvious.
  throw new Error('Missing Supabase server-side configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server env.');
}

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabaseServer.storage
      .from(bucket)
      .upload(fileName, buffer, { contentType: file.type, cacheControl: '3600', upsert: false });

    if (error) {
      console.error('Supabase upload error:', error);
      return new Response(JSON.stringify({ error: error.message || error }), { status: 500 });
    }

    // Return public URL (bucket must be public) — if private, consider returning path and creating signed URL
    const { data: urlData } = supabaseServer.storage.from(bucket).getPublicUrl(data.path);

    return new Response(JSON.stringify({ publicUrl: urlData.publicUrl, path: data.path }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Upload route error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
