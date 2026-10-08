# CampusLoop — complete application, migration, and deployment specification

Use this specification with the accompanying full website source code. It does not require a particular development platform or web host.

## Goal and working approach

Deliver a complete, working **CampusLoop** full-stack student marketplace. Preserve the existing design, functionality, security, two-owner account model, and any real data supplied. Configure it for local development and a suitable production environment with a public HTTPS address. Do not substitute a landing page, static mockup, fake login, or frontend-only prototype.

This is an existing Node/Express application. Read the source, README, schema, and tests first. Complete any missing implementation or hosting integration, run tests, and fix regressions. Retain the stack unless there is a demonstrated incompatibility. Do not unnecessarily rewrite EJS as React, replace the database, redesign the interface, or change authentication providers.

If source or data is missing, identify exactly what is needed rather than guessing. Request credentials through the chosen environment's secret manager or private environment configuration, not the chat, source files, or public forms. Never print secret values. Continue independent work while waiting for genuinely necessary account access.

Prioritize functionality, reliability, security, and maintainability. Choose hosting based on technical requirements and expected usage. Document operational costs and obtain approval before purchasing a domain or subscribing to a service. A custom domain is optional. Do not impose a zero-cost hosting requirement.

## 1. Current code and runtime

The source uses:

- Node.js 22+, ES modules, Express 5, EJS, plain CSS, and browser JavaScript.
- `@libsql/client`: persistent local SQLite during development and remote Turso/libSQL in production.
- Cloudinary: public product images and authenticated private verification evidence in production.
- bcrypt password hashes; HMAC-signed opaque session cookies; database-backed sessions.
- Helmet, rate limiting, CSRF tokens, multer upload limits, and file-signature/MIME validation.

Important files:

- `src/server.js`: application routes and middleware.
- `src/auth.js`: authentication, sessions, CSRF, role checks.
- `src/owners.js`: protected second-owner creation and management.
- `src/schema.sql`, `src/db.js`: schema, queries, initialization, owner-limit migration.
- `src/transport.js`: HTTP/HTTPS listeners and local redirects.
- `src/media.js`: public/private media storage and authorized evidence delivery.
- `src/verification.js`: identifier validation and verification disclosure.
- `views/`, `public/`: interface and assets.
- `test/`: application workflows, owner security, transport, and local TLS tests.

Install locked dependencies using `npm ci`, run locally with `npm run setup` followed by `npm start`, and run tests with `npm test`. Preserve the startup scripts for their supported operating systems. Do not run local secret generation as a production startup step. This EJS application has no mandatory frontend build step.

Provide clear deployment instructions for a server-capable Node environment. The existing Render configuration is an optional deployment example, not a hosting requirement. Document any host-specific configuration separately from the application.

Respect the environment's `PORT`. Production already binds to `0.0.0.0`; local development binds to loopback. If a remote development environment or container must forward requests, configure its listener and port mapping appropriately. Expose the intended application port and keep the backend reachable. Do not introduce a frontend-only server.

**HTTPS:** serve the public website through a valid, trusted TLS certificate. Prefer the host's HTTPS proxy or a properly configured reverse proxy when available. In that arrangement, the Node app serves internal HTTP and the browser uses HTTPS. Do not expose local self-signed certificates in production or redirect public visitors to localhost. Keep local certificate settings unset when the host terminates TLS.

Review `trust proxy` against the actual proxy topology so `req.secure`, Secure cookies, client IPs, redirects, and rate limiting work correctly. Do not blindly trust all forwarded headers. Test HTTPS authentication in staging and production. Use relative internal links or an explicitly trusted public origin.

Keep `/health` safe and functional. Provide appropriate startup/shutdown handling. Report actual local, staging, and public URLs separately. Do not claim a local server is published or invent a production URL.

## 2. Secrets, persistent storage, and data migration

Configure private environment variables for the deployed runtime:

```text
NODE_ENV=production
PORT=<application port required by the environment>
SESSION_SECRET=<strong random server secret>
OWNER_SETUP_KEY=<strong random first-owner setup secret>
TURSO_DATABASE_URL=libsql://<database-host>
TURSO_AUTH_TOKEN=<private database token>
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<API key>
CLOUDINARY_API_SECRET=<private API secret>
```

Keep `.env.example` free of real credentials. Never put secrets in frontend assets, URLs, source control, logs, or exported code archives. Do not regenerate session/setup secrets at every restart.

Production currently requires remote Turso, Cloudinary, and the necessary secrets. Preserve fail-closed checks. Do not silently substitute an ephemeral filesystem for durable storage. Retain these integrations unless a provider migration is explicitly approved and implemented with tested data conversion.

The source archive excludes `.env`, `.certs/`, `data/`, `node_modules/`, and real user data. Importing source alone does not transfer existing accounts, products, or media.

Handle the applicable migration scenario:

1. **Existing remote services:** reconnect using private environment configuration; preserve records and asset references; avoid destructive reseeding or schema changes.
2. **Existing local SQLite records:** obtain a consistent private backup, then implement and test a repeatable import into remote Turso. Preserve IDs, password hashes, relationships, statuses, favorites, verification records, settings, and audit history. Local public photos may be data URLs and private proof may be database BLOBs; migrate them into the correct public/authenticated Cloudinary storage without exposing evidence. Validate row counts, relationships, and accessible media. Provide rollback instructions.
3. **No real existing data:** initialize a clean database and use first-owner setup. Do not invent production users or claim old records were transferred.

Keep development and test databases separate from production. Never run destructive tests against live records. Back up before changes, use repeatable migrations, and retain the old deployment until the replacement is verified. Explain that a new hostname normally requires users to sign in again; browser cookies do not automatically transfer between domains.

## 3. Business, look, and pages

CampusLoop is a **student-to-student marketplace for university essentials**. It does not process payments or provide an escrow service. Buyers contact sellers directly, inspect items, and arrange payment themselves.

Tagline: **Campus essentials, passed from student to student.**

Supporting message: **Buy less. Save more. Keep campus essentials in the loop.**

Preserve the polished existing visual identity: light backgrounds, navy text, blue/purple primary accents, mint highlights, generous spacing, rounded cards, clean typography, subtle interactions, and uncluttered navigation. Reference colors: `#4F6CFF`, `#101728`, `#111B35`, `#F7F8FB`, `#77E7C4`. Keep the experience responsive across desktop, tablet, and small iPhone/Android screens.

Retain:

- Home with logo/navigation, configurable announcement, headline, description, prominent search, Explore Marketplace and Start Selling actions, real listing/view/contact counts, category cards, featured and newest listings, how-it-works explanation, trust information, seller CTA, and footer.
- Marketplace, individual product pages, registration, login, account/profile, seller listing forms, seller verification pages, and private owner pages.
- Accessible labels, keyboard navigation, visible focus, meaningful image alt text, readable contrast, proportional images, and touch-friendly controls.
- Polished empty states, invalid-form feedback, unavailable listing pages, access-denied/404 handling, and safe server errors without exposed stack traces.

Categories: Textbooks, Laptops, Tablets, Calculators, Electronics, Bags, Accessories, Study Materials, Dorm & Campus, and Other. Owners can change them.

## 4. Roles and exactly two possible owner accounts

There are exactly **three permission levels**: buyer, seller, and admin/owner. The marketplace supports **at most two separate owner accounts**, both with full owner permissions and their own email/password. Two owners are accounts, not additional roles.

### Buyer

Can register, log in/out, browse/search/filter, view product details, save/remove favorites, contact sellers, report suspicious listings, and edit name/university/location. Cannot create listings, change verification, or access owner controls.

### Seller

Has buyer capabilities plus create/edit/delete their own listings, upload photos, mark sold, manage seller contact details, submit private verification evidence, review moderation/verification status, and see their own views/contact counts. Server checks must prevent accessing another seller's editable data or private proof.

### Owner accounts

- `/owner/setup`: first account only, when no owner exists, protected by `OWNER_SETUP_KEY`. Use an atomic insert so concurrent setup requests cannot create extra owners. Close setup once any owner exists.
- `/owner/login`: login for either owner.
- `/login`: buyer/seller login; must reject owner accounts.
- `/control/owners`: existing authenticated owner can create the second owner after valid CSRF verification and confirmation of their current password. Require a separate email, strong new password and confirmation. Rate-limit attempts.
- Preserve the database triggers that enforce the two-owner maximum during inserts and role updates, including concurrent requests. Migrate the old single-owner index without losing the first account.
- Reject a third owner at both application and database levels. Do not reopen public setup to add the second account, expose an admin signup option, or accept `role=admin` in public registration.
- Neither owner can be suspended through ordinary user-management controls.
- Do not create either real owner account or choose real owner passwords for me; provide the secure UI for me to do so.

Owner routes must enforce authorization on the server. Buyers, sellers, and anonymous users accessing `/control` or its sections should receive a normal 404.

## 5. Marketplace and product details

Product cards show photo, exact title, price, condition, category, university, location, verification status when approved, and featured status where applicable.

Search across title, description, brand, model, category, university, and location. Filters: category, university, condition, minimum/maximum price, verified-only. Sorting: newest, price ascending/descending, most viewed, and most contacted/popular. Preserve query parameters for shareable searches. Handle larger result sets through clear limits or pagination rather than quietly dropping results.

Product detail pages include a working multiple-photo gallery, exact product information, description, brand, model/edition, textbook author where relevant, condition, price, campus/location, seller profile and join date, verification explanation, related listings, favorites, sharing, direct contact, and reporting.

Use WhatsApp where the seller has a valid international number and email as fallback. Prepopulate a message such as: “Hi, I found your Apple MacBook Air M1 listing on CampusLoop. Is it still available?” Track the contact action honestly as a click, not a completed sale or conversation.

Display this safety message on product/contact pages:

**CampusLoop does not process payments. Inspect the item, verify its condition, meet in a safe public location, and confirm all details before paying.**

Never expose private identifiers or evidence in public templates, API responses, markup, client state, or related-listing data.

## 6. Listing creation, images, and moderation

Require exact product title, category, brand/publisher, model/edition, condition, positive price, university, pickup location, and meaningful full description. Require an author for textbooks. Validate server-side; “Laptop” alone is not an adequate title.

Support up to six product photos with a main photo and additional photos. Accept JPG, PNG, WEBP only, at most 5 MB each, with file-signature and MIME validation. Reject spoofed, unsupported, oversized, and excess uploads. Preserve the last required photo. Store production photos in Cloudinary; no temporary local `/uploads` dependency.

New listings start **PENDING** and are not public. Owner actions include approve, reject, request changes with notes, edit, deactivate/reactivate, feature/unfeature, mark sold, and delete. Statuses: PENDING, ACTIVE, INACTIVE, REJECTED, SOLD.

Seller edits to approved content, including image changes, must return the listing to PENDING and reset verification for owner review. Approval is never inferred from browser-submitted status/featured/verification fields. Only eligible active listings from unsuspended sellers and visible categories appear publicly.

## 7. CampusLoop Verification Center

Sellers may submit private serial, IMEI, ISBN, SKU or manufacturer-identification evidence, plus proof photos such as serial labels, device-information screens, receipts, original packaging, or other relevant proof. Preserve existing supported types and use serial/manufacturer format rules where appropriate.

Automated checks should cover:

- Exact title and brand/model supplied.
- Identifier and proof present.
- Reasonable serial/SKU character format and length.
- IMEI length, digits, and Luhn checksum.
- ISBN-10/13 format and checksum.

These are evidence checks, not automatic authenticity guarantees. Owners manually assign: Not submitted, Under review, Needs more evidence, Verified, or Verification failed. Keep review notes and history, and support requesting more evidence or resetting verification.

Only the submitting seller and either owner may access identifiers and proof. Use authenticated Cloudinary assets and the server's authorized `/evidence/:id` endpoint. Return private/no-store cache headers. Do not return unrestricted media URLs, expose private proof through static serving, or put signed proof URLs into public pages.

Show masked identifiers in owner overviews, with protected detail access when needed. Preserve the official Apple coverage helper link for Apple products. Allow future external device-status integrations without scraping or bypassing manufacturer security.

Display **✓ CampusLoop Verified** only after owner approval, together with:

**CampusLoop reviewed identity evidence associated with this listing. Verification does not guarantee legal ownership, future condition, or authenticity beyond the evidence reviewed. Buyers should still inspect items before payment.**

## 8. Dashboards and website operations

Seller dashboard: total/active/pending/sold listings, views, contact clicks, listing table with price/status/verification/metrics/actions, moderation notes, edit/delete/sold controls, and verification access. Empty state: “You haven't listed anything yet. Put your first item in the loop.”

Buyer account: editable profile and saved listings with working removal. Empty state: “You haven't saved any listings yet.”

Owner panel must include:

- Overview: users by role, live/pending/rejected/verified listings, verification requests, views, contacts, and contact rate (`contacts / views`, handling zero views).
- Listings: all listings, search/filter, seller identification, complete moderation actions and editing.
- Verification: evidence checks, private files, identifiers, notes, status/history and decisions.
- Users: name, email, role, university, location, joining date, listing count and account state; inspect seller listings, suspend and restore users. Suspension must immediately revoke access and hide/deactivate active listings. Restoration must not silently republish previously deactivated listings.
- Owner logins: secure second-owner creation described above.
- Analytics: most viewed/contacted products; category, university and seller activity; recent marketplace events and new users. Keep actual counts; do not invent activity.
- Reports: inspect suspicious-listing reports, navigate to moderation, resolve reports.
- Categories: add, edit, hide, reorder.
- Website settings: announcement, homepage headline/description, marketplace headline, featured-category configuration, safety notice; changes must affect the public UI without code changes.

Keep admin tables usable on phones through responsive layouts or contained horizontal scrolling, not page-wide overflow. Retain clear empty states such as “You're all caught up. Nothing is waiting for review.”

## 9. Database, security, and operational requirements

Preserve tables and relationships for users, sessions, products, product_images, favorites, product_verifications, verification_evidence, categories, site_settings, activity_logs, and reports. Maintain foreign keys, uniqueness, indexes, and owner-cap triggers. Never remove constraints just to get a failing test to pass.

Keep password hashes, HTTP-only/SameSite cookies, Secure cookies over HTTPS, server-side session expiry, login session rotation, logout invalidation, suspension invalidation, and all authorization/ownership checks. Handle bcrypt's password-length limits consistently rather than silently truncating new credentials.

Preserve CSRF protection on every state-changing action, including login, logout, setup, multipart submissions, owner creation and owner controls. Keep upload limits before persistent storage, parameterized SQL, output escaping, validated URLs/inputs, safe error pages, and security headers. Do not disable CSP, CSRF, or Secure cookies to make the development preview work; diagnose the host/proxy configuration.

The current rate limiter is process-local. Assess the chosen deployment: use a shared rate-limit store when multiple instances would otherwise bypass limits, or document and configure the appropriate single-instance constraint. Keep session state persistent and shared across workers. Bound memory usage and add expired-session cleanup as appropriate. Analytics are request/click counts, not unique people or completed payments.

Document media retention and cleanup so deleted/replaced product or evidence files do not accumulate indefinitely or leak. Preserve private storage during any cleanup. Do not automatically purchase email services, add payment processing, or replace the application login with a hosting-provider account requirement. If account recovery/email verification is not implemented, identify that limitation honestly rather than displaying nonfunctional buttons.

## 10. Verification before delivery

Run and preserve the current `npm test` suite. Add migration-specific checks and verify through the browser. Do not use real production user accounts or data as disposable test fixtures.

Required acceptance checks:

1. App starts through the documented startup command; the development environment loads assets and all major pages without console/server errors.
2. Buyer registration/login/profile/search/filter/details/favorite/remove/contact/report/logout work.
3. Seller creation remains pending; owner approval publishes; seller edits withdraw it for review; image uploads, private evidence, sold/delete actions and metrics work.
4. First-owner setup is secret-protected and closes after the first account, including concurrent requests.
5. Existing owner survives migration; authenticated owner creates the second after password confirmation; both owners can sign in and manage the site; normal login rejects both; creation of a third is rejected, including concurrency and direct database role changes.
6. Buyer/seller/anonymous owner access, role escalation, other-seller edits, private-proof access, invalid CSRF, bad MIME, oversized files and excessive uploads are rejected.
7. Verification review and badge rendering work; identifiers/evidence stay absent from public output; edited listings lose their approved verification state.
8. Suspension revokes seller access and removes active listings; restoration works; owners cannot be suspended.
9. Category/settings/report changes persist and render correctly.
10. Real Turso data and Cloudinary media survive restart and republish. Verify private evidence delivery against Cloudinary when credentials are supplied; do not claim that local-only upload tests verify cloud behavior.
11. HTTPS login works behind the configured production proxy; inspect cookie flags, CSRF, redirects, asset URLs and client-IP/rate-limit behavior. No links point to localhost, Windows paths, or the old host.
12. Validate desktop and mobile layouts, keyboard access and forms, with screenshots of representative pages.
13. After publishing, test the actual public URL, not just the development environment. Verify health and key workflows. If publishing is blocked by missing credentials, account access, or service provisioning, state the exact blocker and distinguish tested development/staging behavior from untested production behavior.

The local-certificate integration test may legitimately skip on a host where `.certs/` is intentionally absent. Perform hosted HTTPS checks instead; a skipped local TLS test does not verify production HTTPS.

## 11. Final handoff

Deliver the complete source, environment template, deployment configuration, tests/results, and a concise implementation/migration report. Update README and provide `DEPLOYMENT.md` and `DATA_MIGRATION.md` with:

- What changed and why; any remaining limitations.
- Exact install/start/deploy settings and runtime/port configuration.
- Required secret names and where to enter them, without real values.
- Whether data was preserved, imported, or initialized fresh; validation and rollback steps.
- First-owner setup and second-owner creation instructions.
- Public marketplace, buyer/seller login, owner login, and owner control URLs.
- How to edit the project, test, and republish safely.
- Current publishing/storage cost conditions relevant to my account.
- Clear separation between verified results and anything still requiring account access or a deployment smoke test.

Do not stop at a migration plan. Make the imported application work, verify it, and prepare it for publication using the supplied account access and approved infrastructure.

## Documentation verification

Verify the current official documentation for the selected runtime, hosting provider, database, and media service before changing configuration. Keep provider-specific details in deployment documentation and preserve the application's portability.
