# SalonBook Server

REST API and payment webhook service for SalonBook, built with Node.js, Express.js, TypeScript, MongoDB (Mongoose), `jose` JWT verification, Stripe, and ImgBB.

- **Live Website:** https://salonbook-client-black.vercel.app
- **Live Backend API:** https://salonbook-server-ruddy.vercel.app
- **Client Repository:** https://github.com/SamJU25/salonbook-client
- **Server Repository:** https://github.com/SamJU25/salonbook-server

## Important Features

- **JWT & Live Role Verification:** Validates Better Auth EdDSA/JWKS Bearer tokens with `jose`, fetches live user `role` and `isBlocked` flags from MongoDB, and rejects blocked or unauthorized requests server-side.
- **Service Management:** Public active-only service listing with search, category filter, and price/duration sorting, plus Admin create/update/toggle/delete endpoints (deletion is blocked if active bookings exist).
- **Appointment Workflow:** Validates appointment dates and predefined time slots, prevents double-booking via a MongoDB partial unique index (`unique_active_service_slot`), restricts customer cancellations to pending requests, and enforces Admin state transitions (`pending` -> `confirmed`/`cancelled`, unpaid `confirmed` -> `cancelled`).
- **Stripe Checkout & Verified Webhooks:** Creates Stripe Checkout sessions only for confirmed unpaid appointments belonging to the signed-in customer. Payment records (`transactions`) and `appointments.paymentStatus = "paid"` are updated exclusively after Stripe webhook signature verification (`stripe.webhooks.constructEvent`) on the raw request buffer.
- **Image Upload Proxy:** `POST /api/v1/uploads/image` validates MIME types (`jpeg`, `png`, `webp`, `gif`) and 5 MB max size in memory before forwarding uploads to ImgBB so API keys stay server-side.
- **User & Profile Controls:** Admins can view customer details and toggle `isBlocked`; users can update only whitelisted profile fields (`name`, `phone`, `image`).

## Technology Stack

- **Runtime & Framework:** Node.js, Express.js, TypeScript
- **Database:** MongoDB with Mongoose (`users`, `services`, `appointments`, `transactions`)
- **Auth Verification:** `jose` (local `jwks` lookup with remote JWKS fallback)
- **Payments & Uploads:** `stripe`, `multer`, ImgBB API
- **Validation & Testing:** Zod, ESLint, `tsx --test`

## API Endpoints Overview

| Prefix | Role | Responsibility |
|---|---|---|
| `/api/v1/health` | Public | Health check with lazy MongoDB connectivity verification |
| `/api/v1/services` | Public | List active services (search, filter, sort) and single service details |
| `/api/v1/uploads` | Public | Image upload proxy to ImgBB (`multer` + size/type checks) |
| `/api/v1/appointments` | Customer | Book slots, check booked slots, view own appointments, cancel pending |
| `/api/v1/payments` | Customer | Create Stripe Checkout session and poll verified session status |
| `/api/v1/webhooks` | Stripe | Signature-verified raw webhook (`checkout.session.completed`, `async_payment_failed`, `expired`) |
| `/api/v1/profile` | Authenticated | Read and update own whitelisted profile fields |
| `/api/v1/dashboard` | Customer / Admin | Role-scoped overview metrics |
| `/api/v1/admin/*` | Admin | Manage services, appointments, users (block/unblock), and read-only transactions |

## Installation Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/SamJU25/salonbook-server.git
   cd salonbook-server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and populate your credentials (never commit `.env`):
   ```bash
   cp .env.example .env
   ```

## How to Run the Project Locally

1. Seed the Admin account and initial salon services:
   ```bash
   npm run seed
   ```
2. Start the development server (`http://localhost:5000`):
   ```bash
   npm run dev
   ```
3. Forward Stripe webhook events locally while testing payments:
   ```bash
   stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
   ```
4. Run type checks, linter, tests, and production build:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   npm start
   ```

## Required Environment Variables

Provide these variable names in `.env` or your hosting environment (keep real keys secret):

| Variable | Description |
|---|---|
| `PORT` | Server port (defaults to `5000` locally) |
| `NODE_ENV` | Runtime mode (`development`, `test`, or `production`) |
| `CLIENT_URL` | Allowed frontend origin(s), comma-separated for CORS and Stripe redirects |
| `MONGODB_URI` | MongoDB connection string |
| `BETTER_AUTH_URL` | Client Better Auth base URL used to resolve JWKS if needed |
| `BETTER_AUTH_SECRET` | Better Auth secret matching the client deployment |
| `STRIPE_SECRET_KEY` | Stripe secret API key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `IMGBB_API_KEY` | ImgBB API key used by the upload endpoint |
| `SEED_ADMIN_NAME` | Default display name for the seeded admin account |
| `SEED_ADMIN_EMAIL` | Email address for the seeded admin account |
| `SEED_ADMIN_PASSWORD` | Password for the seeded admin account |
