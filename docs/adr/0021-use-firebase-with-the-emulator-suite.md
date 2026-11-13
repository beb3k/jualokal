# Use Firebase with the Emulator Suite for the account foundation

Status: accepted on 2026-11-13 ([#58](https://github.com/beb3k/jualokal/issues/58)). Supersedes the hosted-Supabase decision in `docs/REAL_APP_BUILD.md`.

The persisted account foundation (registration, login, sign-out, the protected dashboard, and `member_profiles`) used hosted Supabase. Every contributor needed a hosted project and its keys before `/login` would even render: without `VITE_SUPABASE_URL` the page crashed. That made the real-account flow hard to run, review, and test locally, and it tied the browser suite to a remote service.

Jualokal now uses Firebase Auth for accounts and Firestore for `member_profiles`. Local development and the browser suite run fully on the Firebase Emulator Suite with the `demo-jualokal` project, which needs no Firebase account, no hosted project, and no secrets. In development the app connects to the emulators automatically; `npm test` starts them around Playwright. The Firestore emulator needs Java 11 or newer, which is the main new local requirement.

The privacy boundaries stay the same:

- Route guards stay on the server. The browser signs in with the Firebase client SDK only to obtain an ID token, keeps it in memory, and signs out right after the server exchanges it for an httpOnly `__session` cookie. Server functions verify that cookie with the Admin SDK and check revocation. Sign-out revokes the member's refresh tokens, so it ends every session, as the previous global sign-out did.
- `firestore.rules` port the former row-level security: anonymous visitors get nothing, and a signed-in member may read only their own profile. Clients cannot write any profile. Verification state, trust counters, buyer tier, and restriction are privileged, so only the server (Admin SDK) creates profiles and applies validated changes, the same role the former `security definer` functions had.
- The server creates the unverified profile on a member's first authenticated request, replacing the signup trigger. Simulated verification still keeps only the public first name and last initial.
- Demo Mode (`?demo=1`) stays fully client-side and needs no backend.

Email confirmation is no longer part of registration, because Firebase email/password accounts can sign in immediately; the `/auth/callback` route is removed. Google sign-in uses a popup, which the Auth emulator serves as a fake account picker. Member IDs are now Firebase UIDs rather than UUIDs. Firestore has no SQL constraints, so the server functions own field validation.

Considered alternatives: the Supabase CLI local stack also removes the hosted-project need, but it requires Docker and several containers, which is heavier for this team than one Java-backed emulator process. Keeping the hosted Supabase project kept the setup problem that prompted this change.

Production use needs a real Firebase project: the `VITE_FIREBASE_*` web settings and Application Default Credentials for the Admin SDK (see `.env.example`). Private listing photos will need a storage decision; Cloud Storage for Firebase is the expected fit.
