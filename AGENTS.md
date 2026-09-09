# Agents Guide: Trade Brain

## 🚀 Project Overview
Trade Brain is a financial tool designed to "orient" Dollar Cost Averaging (DCA) strategies (specifically for Trade Republic users). It analyzes market data to provide recommendations on whether to reinforce, maintain, or reduce DCA plans based on technical indicators and market regimes.

## 🛠 Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [better-auth](https://orm.better-auth.com/) (Email OTP, Passkey, Organizations)
- **Database**: [better-sqlite3](https://github.com/better-sqlite3/better-sqlite3) (SQLite with WAL)
- **Charts**: [Recharts](https://recharts.org/)

## 🏗 Architecture & Code Organization

### Directory Structure
- `app/`: Next.js App Router (Pages, Layouts, API routes).
- `components/`: React components (mix of Server and Client components).
- `lib/`: Core business logic, database utilities, and authentication.
    - `indicators.ts`: Pure mathematical/technical analysis primitives (SMA, EMA, RSI, MACD, etc.).
    - `advice.ts`: The "Advice Engine" that weighs indicators to produce recommendations.
    - `dcaProjection.ts`: Logic for projecting cash flows and investment growth.
    - `auth.ts`: Authentication configuration and lifecycle hooks.
    - `db.ts`: SQLite connection management and migrations.
    - `tenant.tsx`: Multi-tenancy/Organization management (Client component).
- `scripts/`: Maintenance scripts (e.g., invitations, database migrations).

### Core Data Flow
1. **Auth/Tenant Lifecycle**: User logs in via `better-auth` $\rightarrow$ `lib/auth.ts` (hook) triggers `ensurePersonalOrganization` $\rightarrow$ User is scoped to an `organization_id`.
2. **Market Data $\rightarrow$ Advice**: Market data $\rightarrow$ `lib/indicators.ts` (technical primitives) $\rightarrow$ `lib/advice.ts` (weighted scoring) $\rightarrow$ UI `RecommendationBadge`.
3. **DCA Projection**: Active plans $\rightarrow$ `lib/dcaProjection.ts` $\rightarrow$ UI `AllocationChart` / `PortfolioTrend`.

## ⚙️ Essential Commands
- `npm run dev`: Starts development server.
- `npm run build`: Builds the production application.
- `npm run test`: Runs the Vitest test suite.
- `npm run test:watch`: Runs tests in watch mode.
- `npm run auth:migrate`: Runs database migrations for Better Auth.
- `npm run invite`: Generates/manages invitations via `scripts/invite.mjs`.

## ⚠️ Critical Gotchas & Patterns

### 1. Multi-Tenancy (Crucial)
Everything in the system is scoped by `organization_id` (tenants).
- Database tables (like `signal_journal`) use `organization_id` to segregate data.
- Ensure all data fetching and creation logic respects the active organization context.

### 2. SQLite & Build Process
- **The `SQLITE_BUSY` Problem**: During `next build`, multiple workers attempt to access the SQLite file, causing locks.
- **Mitigation**: `lib/auth.ts` checks `process.env.NEXT_PHASE === 'phase-production-build'` and uses an in-memory database (`:memory:`) for the build environment. **Do not remove this check.**
- **WAL Mode**: The database uses Write-Ahead Logging for better concurrency.

### 3. Strict Access Control
The application uses an "Invite-Only" model. 
- New users cannot simply sign up; their email must be pre-registered in the `invites` table.
- Authentication hooks in `lib/auth.ts` enforce this via `isEmailInvited`.

### 4. Pure Logic vs. I/O
- Keep mathematical/technical logic (indicators, advice calculations) in pure functions in `lib/` without I/O. This makes them highly testable and portable.
- Use `lib/db.ts` for all direct SQLite interactions.

### 5. Authentication Troubleshooting
- `better-auth` can sometimes fail to deduplicate OTP rows correctly. `lib/db.ts` contains `ensureOtpVerificationSingleton` to handle this specifically.

## 🧪 Testing Strategy
- **Unit Tests**: Most business logic (indicators, advice, projections) is tested using `vitest`.
- **Integration Tests**: Data integrity and auth flows are verified via tests in `lib/` (e.g., `db-otp-index.test.ts`).
- **Pattern**: Always write tests for new mathematical/logic functions in `lib/`.
