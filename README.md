# MyTube — Setup & Deploy

This app now uses **Supabase** for real auth, a real database, and real file storage
(video files, thumbnails, avatars) — no more localStorage, so it will actually work
once deployed as a static site on GitHub Pages.

## 1. Create a Supabase project
Go to https://supabase.com → New project (free tier is fine).

## 2. Run the SQL setup
- Open your project → **SQL Editor** → New query
- Paste the entire contents of `supabase_setup.sql` and run it.
- This creates the `profiles`, `videos`, `likes`, `comments`, `subscriptions`,
  `watch_history` tables (with row-level security), plus three storage buckets:
  `videos`, `thumbnails`, `avatars`.

## 3. Configure email auth
Project → **Authentication → Providers → Email**
- Turn **Confirm email OFF** if you want people to sign up and be logged in instantly.
- Leave it **ON** if you want them to click a confirmation link first (the app
  already handles this — it'll show "check your email" and switch to the sign-in form).

## 4. Get your API keys
Project → **Settings → API**
- Copy the **Project URL**
- Copy the **anon public** key

## 5. Paste keys into index.html
Near the top of the `<script>` block in `index.html`:

```js
const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON = 'your-anon-public-key';
```

Until these are filled in, the app shows a banner telling you it isn't configured yet.

## 6. Deploy to GitHub Pages
- Push `index.html` to a GitHub repo (root, or a `/docs` folder — your choice).
- Repo → **Settings → Pages** → set source to that branch/folder.
- Your app will be live at `https://<username>.github.io/<repo>/`.

That's it — no server needed, Supabase handles auth, database, and file storage
directly from the browser.

## Notes / limits
- Free Supabase tier: 1GB file storage, 500MB database, 2GB bandwidth/month.
  Fine for testing, not for a real video platform at scale.
- Client-side upload cap in the app is 200MB per file (`MAX_UPLOAD_MB` in the script) —
  raise or lower it as needed, but also check your Supabase plan's actual upload limits.
- Auth is email + password only, as requested — no display-name field; the part
  before `@` in the email is used as the default display name (editable later if
  you add a "rename channel" feature).
- Row Level Security is on for everything: users can only edit/delete their own
  videos, comments, likes, subscriptions, and avatar.
