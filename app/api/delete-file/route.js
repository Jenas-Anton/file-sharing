import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'uploads';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase server-side configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server env.');
}

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { path } = body || {};
    if (!path) return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400 });

    const { data, error } = await supabaseServer.storage.from(bucket).remove([path]);
    if (error) {
      console.error('Supabase remove error:', error);
      return new Response(JSON.stringify({ error: error.message || error }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Delete route error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
