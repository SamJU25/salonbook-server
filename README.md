# SalonBook Server — REST API & Payment Backend

Backend API service for **SalonBook**, a role-based salon appointment booking and payment platform built with Node.js, Express.js, TypeScript, MongoDB (Mongoose), `jose` JWT verification, Stripe Checkout & Webhooks, and ImgBB image hosting.

## Important Features

- **JWT Verification Middleware (`jose`):** Verifies Better Auth JWTs (EdDSA/JWKS via MongoDB `jwks` collection or remote JWKS endpoint) and checks live `role` and `isBlocked` status in MongoDB on every protected request.
- **Role-Based Access Control:** Strict server-side `customer` and `admin` guards across all protected endpoints.
- **Salon Service Management:** Public active-service search, category filtering, and price sorting, plus Admin CRUD and status activation/deactivation.
- **Atomic Appointment Booking:** Predefined time slots, past-date rejection, customer pending-only cancellation, Admin confirm/cancel state transitions, and a MongoDB partial unique index preventing duplicate active bookings on the same service, date, and slot.
- **Verified Stripe Payments:** Creates Stripe Checkout sessions for confirmed appointments and updates `paymentStatus` to `paid` **only** inside a signature-verified, idempotent Stripe webhook handler (`POST /api/v1/webhooks/stripe`).
- **ImgBB Upload Proxy:** Server-side multipart image upload with MIME type and 5 MB size validation so the ImgBB API key never leaves the server.
- **Read-Only Transactions & User Moderation:** Admin transaction ledger, customer blocking/unblocking, and strictly whitelisted user profile updates.

## Technology Stack

- **Runtime & Framework:** Node.js, Express.js, TypeScript
- **Database:** MongoDB with Mongoose
- **Authentication Verification:** `jose` (JWKS / JWT verification compatible with Better Auth)
- **Validation:** Zod
- **Payments:** Stripe Checkout & Webhooks
- **Image Hosting:** ImgBB (`multer` memory storage + server-side upload)

## Installation Instructions

1. Clone the server repository and enter the directory:
   ```bash
   git clone <SERVER_REPO_URL>
   cd salonbook-server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your environment variables in `.env` (never commit `.env`).

## How to Run the Project Locally

1. **Seed the database** (creates the Admin account and sample salon services):
   ```bash
   npm run seed
   ```
2. **Start the development server:**
   ```bash
   npm run dev
   ```
   The API will run at `http://localhost:5000` (health check: `GET /api/v1/health`).
3. **Run type checks, lint, tests, and production build:**
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   npm start
   ```
4. **Testing Stripe Webhooks Locally:**
   ```bash
   stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
   ```

## Required Environment Variables

Provide these variable names in `.env` (never commit real values):

- `PORT`
- `NODE_ENV`
- `CLIENT_URL`
- `MONGODB_URI`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `IMGBB_API_KEY`
- `SEED_ADMIN_NAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

## Live Website Link

- Live Application: `https://your-salonbook-live-url.vercel.app` *(update after deployment)*

## Client and Server Repository Links

- **Client Repository:** `https://github.com/SamJU25/salonbook-client` *(update with final repo URL)*
- **Server Repository:** `https://github.com/SamJU25/salonbook-server` *(update with final repo URL)*
