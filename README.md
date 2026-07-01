# MyTube — Firebase Setup & Deploy

This app uses **Firebase** for auth, database, and file storage — a fully
client-side static site, so it works on GitHub Pages with no server needed.

- **Firebase Authentication** — email + password sign-in
- **Firestore** — videos, likes, comments, subscriptions, watch history, profiles
- **Firebase Storage** — actual video files, thumbnails, avatars

## 1. Create a Firebase project
Go to https://console.firebase.google.com → **Add project** (the free Spark plan works
for testing; Storage requires the pay-as-you-go **Blaze** plan for any real usage since
Spark's Storage quota is very small — see note at the bottom).

## 2. Register a Web App
In your project: **Project settings (gear icon) → General → Your apps → Add app → Web (`</>`)**.
Give it a nickname, skip Firebase Hosting (you're using GitHub Pages instead).
Firebase will show you a `firebaseConfig` object — copy it.

## 3. Paste config into index.html
Near the top of the first `<script>` block in `index.html`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Until these are filled in with real values, the app shows a "not configured" banner.

## 4. Enable Email/Password auth
**Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
(Leave "Email link" off — this app uses plain email + password.)

## 5. Create Firestore database
**Build → Firestore Database → Create database** (production mode is fine — you'll
paste the rules below to control access; start it in any region close to your users).

Then go to the **Rules** tab and paste the contents of `firestore.rules`, then **Publish**.

## 6. Enable Storage
**Build → Storage → Get started** (accept defaults). Then go to the **Rules** tab
and paste the contents of `storage.rules`, then **Publish**.

> Note: new Firebase projects on the Spark (free) plan have a small Storage
> quota and, as of recent changes, Storage generally requires upgrading to the
> **Blaze** (pay-as-you-go) plan to enable at all — Blaze still has a generous
> free tier underneath it, you only pay for usage beyond that.

## 7. Deploy to GitHub Pages
- Push `index.html` to a GitHub repo (root, or a `/docs` folder).
- Repo → **Settings → Pages** → set source to that branch/folder.
- Your app will be live at `https://<username>.github.io/<repo>/`.
- In Firebase Console → Authentication → Settings → **Authorized domains**,
  add your GitHub Pages domain (e.g. `<username>.github.io`) so auth works there.

That's it — Firebase handles auth, database, and file storage directly from the browser,
no backend server required.

## Notes / limits
- Client-side upload cap in the app is 200MB per file (`MAX_UPLOAD_MB` in the script),
  matching the Storage rules' 200MB video cap — adjust both together if you change it.
- Auth is email + password only, no display-name field — the part before `@` in the
  email is used as the default display name.
- Firestore security rules restrict videos/comments/likes/subscriptions writes to
  their owner; anyone can read public data. Watch history is private per-user.
- The `views`/`likes` counter fields on `videos` are updated via Firestore's atomic
  `increment()`, and the rules specifically allow any signed-in user to update *only*
  those two fields (not title/description/etc.) on someone else's video document,
  which is what makes public view-counting and liking work without giving away
  broader write access.
