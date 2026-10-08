# CampusLoop

A student marketplace with real buyer/seller authentication, private owner operations, listing moderation, favorites, direct contact analytics, private evidence review, and responsive server-rendered pages. CampusLoop does not process payments.

## Start on Windows

Install Node.js 22 or newer from https://nodejs.org. Double-click `START_CAMPUSLOOP.bat`. It installs dependencies, generates local secrets, initializes SQLite, and starts the server. Open **http://localhost:3000**. On macOS/Linux run `sh START_CAMPUSLOOP.command` from the project directory. Alternatively: `npm install`, `npm run setup`, `npm start`.

## Create the owner

1. Open the generated `.env` locally and copy `OWNER_SETUP_KEY` privately.
2. Visit **http://localhost:3000/owner/setup**.
3. Enter your name, email, a unique password of at least 12 characters, and the setup key.
4. You are redirected to `/control`. First-owner setup becomes inaccessible once an owner exists. An atomic database insert prevents simultaneous first-setup requests creating extra owners.
5. Subsequently use `/owner/login`. Standard `/login` deliberately rejects owners. Public registration accepts only buyer and seller roles.

Never share `.env`, commit credentials, or expose the setup key in URLs. Back up the database before maintenance; do not delete the owner record to reset a password.

## Two owner logins

CampusLoop supports **up to two separate owner accounts**, each with full owner permissions. Existing accounts and data are preserved automatically when the updated app starts.

1. Sign in at `/owner/login` with the existing owner account.
2. Open **Control panel → Owner logins** (`/control/owners`).
3. Enter the second owner's name, separate email, and a new password twice.
4. Confirm your current owner password and select **Create second owner login**.
5. The second owner signs in at the same `/owner/login` page using their own credentials.

The backend requires an authenticated owner, valid CSRF token, and current-password confirmation. Creation is rate limited. Database triggers enforce the two-owner maximum even when requests arrive simultaneously. The public setup page stays closed after the first owner; public signup still cannot create owners. Neither owner can be suspended using the user-management page. Credentials are chosen by you; no second account or default password is created automatically.

## HTTPS locally and publicly

`localhost` is the development server on your computer. It originally used HTTP because no TLS certificate was configured. A public HTTPS address also requires deployment; changing the URL text does not publish the app.

**Windows local HTTPS:** run `ENABLE_LOCAL_HTTPS.bat` once, then restart `START_CAMPUSLOOP.bat`. Open **https://localhost:3443**. The old http://localhost:3000 address redirects to HTTPS, preserving paths and search queries. Owner login is https://localhost:3443/owner/login and owner management is https://localhost:3443/control/owners.

The HTTPS setup creates a localhost-only server certificate, valid for one year, and trusts that specific certificate in the current Windows user's certificate store. It is not a certificate authority and cannot issue certificates for other websites. The encrypted private key and its passphrase stay in `.certs/`, excluded from Git and readable only by your Windows user and SYSTEM. The batch file permits only its own PowerShell process to run the local setup script; it does not change the system execution policy. Local HTTPS is automatically enabled only after the trust step succeeds. If the browser was already open, restart it to refresh certificate trust. Do not bypass a certificate warning.

For macOS/Linux, generate a trusted localhost certificate using a local development certificate tool such as [mkcert](https://github.com/FiloSottile/mkcert), then set `HTTPS_KEY_FILE` and `HTTPS_CERT_FILE` to those PEM files in `.env`. The HTTPS port defaults to 3443. The HTTP redirect server uses `PORT` (default 3000). TLS accepts version 1.2 or newer. Session cookies are Secure over local HTTPS and in production.

**Public HTTPS:** deploy using `render.yaml`. Render provides a trusted HTTPS certificate for the assigned `onrender.com` address and redirects HTTP to HTTPS automatically: [Render TLS documentation](https://render.com/docs/tls). Keep local certificate environment variables blank in Render; its proxy handles public TLS. Local certificates are never automatically loaded in production. Your public URL will be the actual URL assigned to your Render service, and works for other students; `localhost` works only on the computer running CampusLoop.

## Workflows

Buyers register at `/register`, browse `/marketplace`, use shareable search/filter URLs, inspect listings, save/remove favorites, contact sellers by WhatsApp/email, report suspicious products, and edit their profile at `/account`.

Sellers register with the seller role, add detailed listings and 1–6 images at `/sell`, and manage listings at `/account`. Textbooks require an author. Listings begin PENDING. Owner approval makes them ACTIVE. Seller edits and image removal return listings to PENDING and reset verification for review. Sellers can delete or mark their own listings sold, see views/contacts, and submit identifier evidence through their listing’s Verification link.

The owner uses `/control` for metrics, listings, verification, users, categories, analytics, reports, and website settings. Listing actions include approve/reject/request changes/activate/deactivate/feature/unfeature/sold/delete. The owner can edit any listing. Suspending a seller invalidates sessions and deactivates active products immediately. Restoring the seller does not automatically republish those products; review and reactivate them explicitly. Owner suspension is disallowed.

Verification checks IMEI Luhn and ISBN-10/13 checksums, serial format, and evidence completeness. The owner decides Verified / Verification failed / Needs more evidence / Not submitted and leaves notes. Review history is retained. Only the owner and submitting seller can access `/evidence/:id`. Public product queries never include identifiers or evidence. Apple devices include an official coverage lookup link; external device-status integration can be added through `src/verification.js` without scraping.

## Stack and structure

- Node.js, Express 5, EJS, plain CSS and progressive JavaScript.
- Turso/libSQL; local persistent SQLite during development.
- bcrypt password hashes, HMAC-signed opaque cookie sessions backed by the database.
- Cloudinary public product images and authenticated verification assets.
- `src/server.js`: route handlers and authorization orchestration.
- `src/auth.js`: sessions, CSRF, owner/seller access policies.
- `src/db.js`, `src/schema.sql`: parameterized queries, schema, indexes, initialization.
- `src/media.js`: upload validation and interchangeable storage service.
- `src/verification.js`: identifier validation and verification disclosure.
- `views/`, `public/`: escaped templates, responsive design, interactions.
- `scripts/setup.js`: local bootstrap. `test/workflows.test.js`: isolated integration tests.

## Environment

Copy `.env.example` or let the startup script create `.env`.

| Variable | Purpose |
|---|---|
| NODE_ENV | `development` locally, `production` when deployed |
| PORT | Local default 3000; Render supplies its port |
| SESSION_SECRET | Random secret, at least 32 characters |
| OWNER_SETUP_KEY | Random first-owner setup secret |
| TURSO_DATABASE_URL | `file:data/campusloop.db` locally, `libsql://...` remotely |
| TURSO_AUTH_TOKEN | Turso database token |
| CLOUDINARY_CLOUD_NAME | Cloudinary environment name |
| CLOUDINARY_API_KEY | Cloudinary API key |
| CLOUDINARY_API_SECRET | Private Cloudinary API secret |
| HTTPS_PORT | Local HTTPS port, default 3443 |
| HTTPS_KEY_FILE / HTTPS_CERT_FILE | Optional local PEM private key and certificate paths |
| HTTPS_PFX_FILE / HTTPS_PASSPHRASE_FILE | Optional PFX bundle and private passphrase-file paths |

Local uploads are stored inside the persistent development database for a zero-credential first run. Production startup refuses local databases or missing Cloudinary credentials. All critical production data lives in Turso and media in Cloudinary, never Render’s ephemeral filesystem. Changing storage providers requires implementing the `store`/`privateBytes` contract in `src/media.js`.

## Render deployment

1. Create your own **private GitHub repository**, commit source including `package-lock.json`, and push. `.gitignore` excludes local secrets and data.
2. Create a Turso database and token in the Turso dashboard. Copy the `libsql://` URL and token. Schema initializes automatically on startup. Enable backups appropriate to your launch needs.
3. Create a Cloudinary product environment. Copy cloud name, API key and secret. Evidence uploads use **authenticated** delivery, not public or unrestricted unsigned upload presets. Do not enable public access or unsigned transformations for evidence assets.
4. In Render, create a Blueprint from `render.yaml`, or create a Node web service manually: build command `npm install` (the Blueprint uses reproducible `npm ci`), start command `npm start`, health path `/health`. Choose the free plan if suitable.
5. Fill all Turso and Cloudinary secrets in Render’s Environment screen. The Blueprint generates session/setup secrets. For a manual service, generate them using `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Set NODE_ENV=production.
6. Deploy. Open the assigned `https://YOUR-SERVICE.onrender.com/owner/setup` and create your owner using the Render setup secret. Then log in at `/owner/login` and use `/control`.
7. Register a seller, upload a photo and private proof, review both as owner, approve, and check buyer browsing/contact flows before announcing launch.

No paid domain is required. Free plan availability and quotas change; review provider terms and usage before launch. Render free services sleep after idle time and can have slow cold starts; their filesystem is ephemeral: https://render.com/docs/free. Cloudinary authenticated media details: https://cloudinary.com/documentation/control_access_to_media. Production deployment requires your own provider accounts and credentials; this source does not create those accounts or publish itself.

## Custom domain

In Render service Settings → Custom Domains, add your domain and follow Render’s DNS instructions. Wait for TLS provisioning. All app links are relative, and cookies do not hardcode a domain, so buyer login `/login`, owner login `/owner/login`, and `/control` work on the hosting URL or custom domain without code changes.

## Security and operating notes

- HTTP-only, SameSite=Lax session cookies; Secure in production; seven-day server expiry; session rotation on login; suspension invalidates sessions.
- Server-side owner/ownership checks on every protected mutation. Private control URLs return 404 for non-owners.
- CSRF tokens on every form mutation, including login/logout/setup. Multipart requests validate CSRF before storing media. Upload parsing uses bounded in-memory buffers; global rate limiting also applies.
- Helmet CSP/security headers, escaped EJS text, parameterized SQL, no public stack traces.
- Image magic-byte and declared-MIME checks; JPG/PNG/WEBP only; 5 MB per file, maximum six per upload/listing.
- Contact links only use constructed WhatsApp and email URLs. The contact action records a click then presents the link; it does not claim a completed conversation or transaction.
- Public evidence is never served from an uploads directory. Owner-authorized evidence requests are proxied with `private, no-store` headers; no signed cloud URL is returned to the browser.
- Review secrets, HTTPS, authenticated Cloudinary settings, Turso permissions/backups, rate-limit settings and provider quotas before launch. Never commit `.env`.
- Rate limiting is process-local. For multi-instance/high-volume deployment, use a shared rate-limit store and stronger abuse controls. View/contact counters count requests/clicks, not unique visitors. Public queries cap results at 200; refine filters beyond that.
- Deleting a listing removes database records through cascading foreign keys. Cloudinary assets are retained; periodically reconcile/delete orphan cloud assets according to your retention policy. Evidence uploads are images, including receipt photos; PDFs are not supported.
- Account recovery and email verification are outside this MVP. Set a strong owner password and retain provider access. No default credentials or demo users are created.

## Tests

Run `npm test`. Integration tests use a disposable SQLite database and separate cookie agents. They exercise buyer registration/login/search/favorites/contact/profile/logout; seller pending listings/edit/photos/private evidence/sold/delete/analytics; owner setup lockout/login/moderation/verification/feature/suspend/restore/content/categories/reports; role escalation, unauthorized ownership, private evidence access, CSRF, bad MIME, and oversized uploads. Identifier unit checks cover known IMEI/ISBN checksums. Real Turso/Cloudinary and hosted TLS require a post-deployment smoke test with your credentials.

Additional tests migrate a previous single-owner database, create the second owner under concurrent requests, enforce the two-account cap in SQL and HTTP, and verify both login separation and full owner access. Transport tests check HTTPS redirects and reject attacker-controlled destinations. When a local certificate has been generated, the TLS integration test validates the actual certificate, hostname, and Secure/HttpOnly/SameSite cookie flags without disabling certificate verification.
