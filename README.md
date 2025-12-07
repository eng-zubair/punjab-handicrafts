# Punjab Handicrafts v2

An end-to-end marketplace platform for Punjab’s handicrafts. The project provides a full-stack web application enabling buyers to browse and purchase products, vendors to manage stores and fulfill orders, and admins to oversee platform operations. It includes robust order management with Cash on Delivery (COD) support, vendor dashboards, analytics, reviews, promotions, and secure authentication.

## Description

This application is a TypeScript-based monorepo that combines a React client (built with Vite) and an Express server. Data persistence uses PostgreSQL via Drizzle ORM. In development, the server integrates Vite middleware to serve the client with HMR; in production, the server serves the built client from `dist/public`.

Key modules:
- Client: React 18 + Radix UI components, Tailwind-compatible styles, and `@tanstack/react-query` for data fetching and caching
- Server: Express 4 with session-based authentication via `passport-local`, and REST endpoints for users, stores, products, orders, messages, and admin operations
- Database: PostgreSQL with Drizzle ORM; includes bootstrapping and schema verification

## Installation

Prerequisites:
- Node.js 18+ (recommended)
- PostgreSQL 13+ (local or remote)

Steps:
1. Clone the repository
   ```bash
   git clone <repo-url>
   cd PunjabHandicrafts
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Configure environment variables by creating a `.env` file in the project root:
   ```env
   # Server
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=postgres://<user>:<password>@localhost:5432/handicrafts
   SESSION_SECRET=<replace-with-strong-secret>

   # Admin bootstrap (optional but recommended)
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=<change-me>

   # Optional controls
   COD_RISK_CHECK_STRICT=false
   SEED_SECRET=<token-for-seed-endpoints>
   ```
4. Provision the database and push schema
   ```bash
   npm run db:push
   ```
5. Start development server (API + client via Vite middleware)
   ```bash
   npm run dev
   ```
6. Open the app at `http://127.0.0.1:5000`

## Usage

- Development
  - `npm run dev` starts the Express server and serves the React client with HMR
  - Navigate to `http://127.0.0.1:5000` to use the app

- Production build
  - `npm run build` builds the client to `dist/public` and bundles the server to `dist/index.js`
  - `npm start` runs the production server (serves APIs and static client)

- Testing and type-checking
  - `npm test` runs unit and UI tests with Vitest
  - `npm run check` runs TypeScript type-checking

- Common flows
  - Buyer: browse products, add to cart, checkout (COD supported), view orders and receipts
  - Vendor: manage stores/products, track and update order status, verify payments, check Payment Status table and analytics
  - Admin: manage users, stores, products, and view platform analytics

## Features

- Multi-role access: buyer, vendor, admin
- Secure session-based authentication
- Product catalog with GI brand categorization
- Vendor store management and product promotions
- Orders with statuses (pending → processing → shipped → delivered; with cancellation/reactivation flow)
- Cash on Delivery (COD) support with payment collection and verification
- Order receipts and downloadable PDF
- Messaging between buyer and vendor tied to orders
- Admin analytics for revenue and COD performance
- Drizzle ORM-based models and schema verification

## Configuration

Environment variables:
- `PORT` (default: `5000`): server port
- `NODE_ENV` (`development` or `production`): affects cookie security and dev middleware
- `DATABASE_URL` (required): PostgreSQL connection string
- `SESSION_SECRET` (required): session signing secret
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (optional): bootstrap a default admin account at startup
- `COD_RISK_CHECK_STRICT` (optional, default `false`): enable stricter COD validation logic
- `SEED_SECRET` (optional): token for seed-related endpoints

Behavioral notes:
- In development, the server sets up Vite middleware for the client; in production, it serves static assets from `dist/public`
- Cookies are marked `secure` when `NODE_ENV==='production'`

## Dependencies

Runtime (selected):
- `express@^4.21.2`
- `react@^18.3.1`, `react-dom@^18.3.1`
- `@tanstack/react-query@^5.60.5`
- `drizzle-orm@^0.39.1`, `pg@^8.13.1`
- `passport@^0.7.0`, `passport-local@^1.0.0`, `express-session@^1.18.1`, `connect-pg-simple@^10.0.0`
- `dotenv@^17.2.3`
- `lucide-react@^0.453.0`, Radix UI packages (accordions, dialogs, tabs, etc.)

Development (selected):
- `vite@^5.4.20`, `@vitejs/plugin-react@^4.7.0`
- `typescript@5.6.3`, `tsx@^4.20.5`, `esbuild@^0.25.0`
- `vitest@^1.6.0`, `@testing-library/react@^14.0.0`, `@testing-library/user-event@^14.4.3`, `jsdom@^24.0.0`
- `tailwindcss@^3.4.17`, `postcss@^8.4.47`, `autoprefixer@^10.4.20`

For the complete list (including Radix UI packages and utility libraries), see `package.json`.

## Contributing

1. Fork the repository and create a feature branch
2. Install dependencies and set up `.env`
3. Run `npm run db:push` to ensure schema is up-to-date
4. Implement changes with TypeScript and follow existing patterns and imports
5. Run `npm run check` and `npm test` to ensure type and test coverage
6. Open a pull request with a clear description and references to affected areas

Guidelines:
- Keep changes small and focused; add tests for new behavior
- Avoid committing secrets; use environment variables
- Follow existing component and API conventions and data typings

## License

This project is licensed under the MIT License. See the `LICENSE` field in `package.json`. You may include a copy of the MIT license text in a `LICENSE` file if desired.

