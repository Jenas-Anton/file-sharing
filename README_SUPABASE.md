Supabase setup for file-sharing-app


- Create a Storage bucket named `uploads` (or another name) in your Supabase project.
- You can set a custom bucket name via `NEXT_PUBLIC_SUPABASE_BUCKET`. If not set, the app defaults to `uploads`.
- Make the bucket public (or configure appropriate policies). If the bucket is private, replace `getPublicUrl` calls with `createSignedUrl` and adjust code accordingly.
- Ensure the following environment variables are set in your Next.js environment (e.g. `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_BUCKET=uploads
```

- Install dependencies:

```bash
npm install
```

- Run dev server:

```bash
npm run dev
```

Notes:
- The UI components are simple examples; adjust styling and error handling for production.
- The app expects a bucket named `uploads`.
