# Punjab Handicrafts Marketplace - Sanatzar

## Overview

Sanatzar is a district-wise handicrafts marketplace that connects Punjab's traditional artisans with customers through an authentic e-commerce platform. The application enables vendors to create stores featuring Geographical Indication (GI) branded crafts from specific districts across Punjab, Pakistan. The platform emphasizes cultural authenticity, trust through GI certification, and accessibility for artisans with varying levels of digital literacy.

The application serves three primary user roles:
- **Buyers**: Browse and purchase authentic handicrafts filtered by district and GI brand
- **Vendors**: Manage stores, products, orders, and receive payouts for their crafts
- **Admins**: Approve stores, moderate products, and oversee platform operations

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**:
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Framework**:
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Custom theme system supporting light/dark modes through CSS variables
- Design inspired by Etsy's artisan marketplace aesthetics with cultural Pakistani craft motifs

**Component Organization**:
- Reusable UI components in `client/src/components/ui/`
- Feature-specific components (DistrictCard, ProductCard, VendorCard, etc.) in `client/src/components/`
- Example components demonstrating usage patterns in `client/src/components/examples/`
- Page components in `client/src/pages/`

**State Management Approach**:
- Server state managed via TanStack Query with custom query client configuration
- Authentication state handled through useAuth hook
- Form state managed with React Hook Form and Zod validation
- Local UI state using React hooks

### Backend Architecture

**Technology Stack**:
- Node.js with Express.js for the REST API server
- TypeScript for type safety across the entire backend
- Session-based authentication using express-session with PostgreSQL session store

**API Design Pattern**:
- RESTful API endpoints under `/api/*` namespace
- Route handlers in `server/routes.ts` with middleware-based authentication and authorization
- Role-based access control with middleware guards (isVendor, isAdmin)
- Request/response logging middleware for API monitoring

**Authentication System**:
- Standard username/password authentication using passport-local strategy
- Password hashing with bcrypt (salt rounds: 12)
- Session management with express-session and PostgreSQL session store
- Secure cookies (httpOnly, secure in production, sameSite: lax)
- Role-based authorization (buyer, vendor, admin) stored in user records
- Authentication middleware (`isAuthenticated`, `isVendor`, `isAdmin`) for protected routes
- All auth responses sanitize sensitive fields (passwordHash, verification/reset tokens)

**Data Access Layer**:
- Storage abstraction pattern in `server/storage.ts` defining IStorage interface
- Database operations centralized through storage service
- Type-safe data operations using shared schema definitions

### Data Storage

**Database Solution**:
- PostgreSQL database via Neon serverless driver (@neondatabase/serverless)
- Drizzle ORM for type-safe database queries and schema management
- WebSocket connection support for serverless PostgreSQL access

**Schema Design** (in `shared/schema.ts`):
- **users**: Authentication and role management (buyer/vendor/admin)
- **sessions**: Express session storage for Replit Auth
- **stores**: Vendor store information with district and GI brand associations
- **products**: Product catalog with pricing, stock, images, and GI certification
- **categories**: Craft category taxonomy
- **orders**: Order records with status tracking
- **orderItems**: Line items for each order
- **messages**: Communication system between users
- **subscriptions**: Vendor subscription management
- **transactions**: Financial transaction records
- **payouts**: Vendor payout tracking

**Data Validation**:
- Zod schemas generated from Drizzle schema using drizzle-zod
- Runtime validation on API endpoints using Zod insert schemas
- Type safety enforced across client and server through shared schema exports

### District and GI Brand System

**Core Concept**:
The application is built around Punjab's district-based craft ecosystem, where each district has associated GI brands and specific traditional crafts. This geographic authenticity system is fundamental to the platform's value proposition.

**Implementation**:
- District and GI brand data seeded from `server/seed.ts`
- Products and stores must be associated with valid district/GI brand combinations
- Filtering and browsing primarily organized by district and GI brand
- Badge and tag components (DistrictBadge, GITag) provide visual GI certification indicators

### File Upload and Asset Management

**Static Assets**:
- Generated product images stored in `attached_assets/generated_images/`
- Images referenced via Vite's asset import system with `@assets` alias
- Product images array stored as text[] in database, supporting multiple images per product

### Build and Deployment

**Development Mode**:
- Vite dev server with HMR (Hot Module Replacement)
- Express API server with nodemon-like reloading via tsx
- Concurrent client and server development

**Production Build**:
- Client built to `dist/public` via Vite
- Server bundled to `dist/index.js` via esbuild with ESM format
- Static file serving from built client assets
- Environment variable configuration for database connection

**Module System**:
- ESM modules throughout (type: "module" in package.json)
- Path aliases: @/ for client, @shared for shared code, @assets for static assets
- Shared schema types between client and server for consistency

## External Dependencies

### Third-Party Services

**Authentication**:
- Replit Auth (OpenID Connect provider)
  - Issuer URL: configurable via ISSUER_URL environment variable
  - Client ID derived from REPL_ID
  - User profile information (email, name, profile image) synced to local users table

**Database**:
- Neon Serverless PostgreSQL
  - Connection string via DATABASE_URL environment variable
  - WebSocket protocol for serverless compatibility
  - Session storage for authentication state

### Key NPM Packages

**UI Components**:
- @radix-ui/* primitives (29+ component packages) for accessible, unstyled UI primitives
- class-variance-authority for type-safe component variant management
- cmdk for command palette functionality
- lucide-react for icon system
- date-fns for date formatting

**Data Management**:
- drizzle-orm and drizzle-kit for database ORM and migrations
- drizzle-zod for schema-to-validation bridge
- zod for runtime type validation
- @tanstack/react-query for server state management

**Authentication & Sessions**:
- openid-client for OIDC protocol implementation
- passport and openid-client/passport for authentication strategy
- express-session for session management
- connect-pg-simple for PostgreSQL session store

**Development Tools**:
- @replit/vite-plugin-runtime-error-modal for error overlay
- @replit/vite-plugin-cartographer for code navigation
- @replit/vite-plugin-dev-banner for development environment indication

### Environment Variables

Required configuration:
- `DATABASE_URL`: PostgreSQL connection string (Neon serverless)
- `SESSION_SECRET`: Secure random string for session encryption
- `ISSUER_URL`: OIDC issuer URL (defaults to https://replit.com/oidc)
- `REPL_ID`: Replit environment identifier used as OIDC client ID
- `NODE_ENV`: Environment mode (development/production)