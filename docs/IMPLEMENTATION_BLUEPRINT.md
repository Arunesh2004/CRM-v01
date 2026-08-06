# Implementation Blueprint

## 1. Final Repository Structure
The repository is structured as a monolithic repository (monorepo-style) to house all parts of the platform while maintaining clear boundaries. 

*   **`/frontend` & `/backend` context**: Because we are utilizing Next.js 15 with Server Actions and API Routes, the Next.js application acts as the full-stack core. The Next.js app will likely reside at the root or within a main `/web` directory.
*   **`/modules`**: Contains the core business logic, separated by domain (CRM, Billing, Security, Communication).
*   **`/database`**: Contains Prisma schemas, migrations, seed scripts, and database utility functions.
*   **`/docs`**: Project documentation, architecture decisions, and module statuses.
*   **`/shared`** or **`/lib`**: Shared types, validation schemas (Zod), API contracts, and cross-cutting utilities.
*   **`/infrastructure`**: IaC (Infrastructure as Code) configurations, Dockerfiles, and CI/CD pipelines.

---

## 2. Next.js Application Structure
Within the Next.js full-stack application layer:

*   **`app/`**: Next.js App Router. Contains page components, API routes (`app/api/`), layouts, and global styles. Strictly handles routing and UI rendering.
*   **`components/`**: Reusable UI components. Sub-divided into `/ui` (shadcn primitives) and `/business` (complex domain components).
*   **`modules/`**: The core domain logic (see section 3).
*   **`services/`**: External service integrations (e.g., AWS S3 wrappers, Resend, Razorpay).
*   **`lib/`**: Generic utilities and configurations (e.g., Prisma client initialization, standard fetch wrappers).
*   **`hooks/`**: Custom React hooks for client-side state and side effects.
*   **`types/`**: Global TypeScript type definitions and interfaces.
*   **`utils/`**: Pure functions, formatters, and helpers.

---

## 3. Backend Module Structure
The core business logic is organized into domains to enforce the modular monolith pattern, ensuring clear separation of concerns without network overhead.

**Directory Example:**
`modules/`
  ├── `auth/`
  ├── `crm/`
  ├── `communication/`
  ├── `billing/`
  └── `security/`

**Internal Structure of a Module:**
*   **Controllers (Server Actions / API Handlers)**: The entry points for requests. They validate input payloads and pass them to services.
*   **Services**: The actual business logic. They enforce RBAC, tenant isolation, orchestrate database calls, and trigger background jobs.
*   **Repositories**: Data access layer wrappers around Prisma to enforce standard queries and RLS context injection.
*   **Validation**: Zod schemas specific to the module's domain (e.g., `createLeadSchema`).
*   **Authorization**: Module-specific permission logic.

---

## 4. Database Structure
All database-related files reside in the dedicated `/database` directory to keep the root application clean.

*   **Location of `schema.prisma`**: `/database/schema.prisma` - The single source of truth for the DB schema.
*   **Migrations**: `/database/migrations/` - Prisma-generated SQL migrations.
*   **Seed Scripts**: `/database/seeds/` - Scripts for populating default roles, permissions, and test tenants.
*   **Database Utilities**: `/database/utils/` - Helper functions for DB connections, RLS context injection, and health checks.

---

## 5. Shared Code Strategy
To ensure consistency across the modular monolith:
*   **Types**: Extracted into a global `/types` directory or generated directly from Prisma/Zod.
*   **Validation Schemas**: Defined using Zod. They serve as both runtime validation for API routes/Server Actions and build-time type inference for the frontend.
*   **API Contracts**: Defined by Zod schemas to ensure both client payloads and server responses match perfectly.
*   **Constants**: Kept in `/lib/constants` (e.g., error codes, pagination limits, enum definitions) to prevent magic strings and drift.

---

## 6. Background Job Architecture
Long-running or async tasks must not block Next.js Server Actions.

*   **Future Location**: Jobs will be defined within their respective modules (e.g., `modules/communication/jobs`).
*   **Use Cases**: Email burst sending, WhatsApp message queuing, background AI processing/summarization, complex report generation, and async CCTV processing.
*   **Queue System Strategy**: We will utilize a serverless-friendly queue system like **Upstash (QStash)** or **Inngest**. This allows us to maintain a serverless deployment (Vercel) without needing a constantly running background worker container.

---

## 7. Realtime Architecture
Realtime updates (notifications, chat, active alert streams).

*   **Socket.io Placement**: Because Vercel serverless functions do not support persistent WebSockets, Socket.io must be deployed as a separate Node.js microservice (e.g., on Render or AWS ECS), located in `/infrastructure/realtime`. Alternatively, we may pivot to a managed service like Pusher to remain fully serverless.
*   **Connection Flow**: Client authenticates via Next.js -> Connects to WebSocket server -> Server verifies token -> Client subscribes to tenant-specific channels.
*   **Authentication**: Socket connections must pass the Clerk JWT in the initial connection handshake.
*   **Tenant Isolation**: Sockets join rooms prefixed strictly with their `tenantId` (e.g., `tenant_abc123_alerts`). The server enforces that users can only join rooms matching their authenticated `tenantId`.

---

## 8. Environment Management
*   **Development Environment**: Uses `.env.local`. Connected to a local PostgreSQL instance (via Docker) or a dedicated development cloud DB.
*   **Production Environment**: Environment variables are managed securely in the Vercel dashboard.
*   **Secret Handling**: Keys are never committed to Git. Tenant integrations (like a user's specific WhatsApp API key) are symmetrically encrypted in the database using the `ENCRYPTION_KEY` environment variable.

**Required Variables (`.env.example`)**:
```env
# Database
DATABASE_URL=

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Application Secrets
ENCRYPTION_KEY=

# Third-Party Services
GEMINI_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RESEND_API_KEY=

# Storage (AWS/R2)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=
```

---

## 9. Development Workflow
Feature development must strictly follow this linear sequence to prevent regressions:

1.  **Documentation Update**: Update architecture and rule sets if necessary.
2.  **Database Change**: Modify `schema.prisma` and generate the migration.
3.  **Backend Implementation**: Build Zod schemas, Repositories, Services, and Server Actions for the new feature.
4.  **Frontend Implementation**: Build UI Components and Pages to consume the backend actions.
5.  **Testing**: Write unit/integration tests for the new module logic.
6.  **Deployment**: Merge to main for automated CI/CD deployment.

---

## 10. Implementation Risks
Before coding, the following technical risks have been identified:
1.  **Serverless WebSocket Limitation**: Standard Socket.io does not work natively on Vercel's serverless functions. We must either deploy a separate container for Socket.io or pivot to a managed realtime service.
2.  **Prisma Bundle Size on Serverless**: If the schema grows too large, the Prisma query engine could bloat the Next.js serverless function size, approaching Vercel's 50MB limit.
3.  **Monorepo Complexity**: Ensuring the `/modules` folder doesn't accidentally tightly couple different domains (e.g., CRM directly calling Billing repositories instead of Services). Strict linting rules will be needed.
