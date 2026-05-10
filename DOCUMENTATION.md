# Ozone High School Payment System — Full Technical Documentation

---

## Important Note Before You Start

This project does **not** use PHP or XAMPP. It is built with **Node.js** (JavaScript/TypeScript) on the backend and **React** on the frontend, with a **PostgreSQL** database. This is a modern web stack that is different from PHP/MySQL but works similarly in concept. The migration and deployment steps below reflect the actual tools used.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Database Design](#4-database-design)
5. [Backend (API Server) — File-by-File Explanation](#5-backend-api-server--file-by-file-explanation)
6. [Frontend (React App) — File-by-File Explanation](#6-frontend-react-app--file-by-file-explanation)
7. [How the Parts Talk to Each Other](#7-how-the-parts-talk-to-each-other)
8. [Authentication & Security](#8-authentication--security)
9. [Payment Flows](#9-payment-flows)
10. [How to Transfer the Project to Another PC](#10-how-to-transfer-the-project-to-another-pc)
11. [How to Upload to GitHub](#11-how-to-upload-to-github)
12. [How to Export & Import the Database](#12-how-to-export--import-the-database)
13. [Environment Variables & Configuration](#13-environment-variables--configuration)
14. [Running the Project Locally](#14-running-the-project-locally)

---

## 1. System Overview

The Ozone High School Payment System is a web application that allows:

- **Parents** to view their children's payment status and pay school fees online (via mock Chapa payment gateway) or upload a bank transfer receipt.
- **Cashiers** to review manually uploaded receipts and approve or reject them.
- **Admins** to add new students, link students to parent accounts, and view all users.

The system has three separate layers that work together:

```
┌─────────────────────┐        HTTP Requests        ┌─────────────────────┐
│   React Frontend    │ ─────────────────────────► │  Express API Server │
│   (Browser/UI)      │ ◄───────────────────────── │  (Node.js Backend)  │
└─────────────────────┘        JSON Responses        └──────────┬──────────┘
                                                                │
                                                                │ SQL Queries
                                                                ▼
                                                     ┌─────────────────────┐
                                                     │  PostgreSQL Database │
                                                     └─────────────────────┘
```

---

## 2. Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| **React** | UI library for building the web interface |
| **Vite** | Development server and build tool (replaces Webpack) |
| **TypeScript** | Typed JavaScript — catches bugs at compile time |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **shadcn/ui** | Pre-built UI components (buttons, cards, tables, forms) |
| **Zustand** | Lightweight state management (stores the login token) |
| **Wouter** | Lightweight client-side router (handles `/parent`, `/cashier`, etc.) |
| **React Query (@tanstack/react-query)** | Data fetching, caching, and synchronisation |
| **React Hook Form + Zod** | Form validation |

### Backend
| Tool | Purpose |
|------|---------|
| **Node.js** | JavaScript runtime that runs the server |
| **Express 5** | Web framework that handles HTTP routes |
| **TypeScript** | Typed JavaScript |
| **jsonwebtoken (JWT)** | Creates and verifies login tokens |
| **bcryptjs** | Securely hashes passwords before storing them |
| **Drizzle ORM** | Database query builder (replaces raw SQL) |
| **Zod** | Validates incoming request data |
| **pino** | Server-side logging |
| **esbuild** | Bundles the server into a single file for production |

### Database
| Tool | Purpose |
|------|---------|
| **PostgreSQL** | Relational database (stores users, students, payments) |
| **Drizzle ORM** | Talks to PostgreSQL from the Node.js code |
| **drizzle-zod** | Auto-generates Zod validators from the DB schema |

### Shared Libraries (Monorepo)
| Library | Purpose |
|---------|---------|
| **@workspace/db** | Shared DB schema and Drizzle client |
| **@workspace/api-spec** | OpenAPI YAML specification (the API contract) |
| **@workspace/api-client-react** | Auto-generated React Query hooks for every API endpoint |
| **@workspace/api-zod** | Auto-generated Zod validators from the OpenAPI spec |

---

## 3. Project Folder Structure

```
workspace/
├── artifacts/
│   ├── api-server/               ← Backend (Node.js / Express)
│   │   └── src/
│   │       ├── index.ts          ← Entry point, starts the Express server
│   │       ├── lib/
│   │       │   └── auth.ts       ← JWT sign/verify + middleware
│   │       └── routes/
│   │           ├── index.ts      ← Registers all routes
│   │           ├── auth.ts       ← /api/auth/login, /register, /me
│   │           ├── students.ts   ← /api/students
│   │           ├── payments.ts   ← /api/payments (Chapa + manual)
│   │           ├── admin.ts      ← /api/admin/users, /students, /link-student
│   │           └── dashboard.ts  ← /api/dashboard/stats
│   │
│   └── school-payment/           ← Frontend (React / Vite)
│       └── src/
│           ├── App.tsx           ← Router setup + auth token injection
│           ├── lib/
│           │   └── auth.ts       ← Zustand store (holds JWT token)
│           └── pages/
│               ├── login.tsx     ← Login page
│               ├── register.tsx  ← Parent registration page
│               ├── not-found.tsx ← 404 page
│               ├── parent/
│               │   ├── dashboard.tsx  ← Parent home (see children + payment history)
│               │   ├── pay.tsx        ← Choose payment method
│               │   └── success.tsx    ← Chapa payment success page
│               ├── cashier/
│               │   └── dashboard.tsx  ← Review pending manual receipts
│               └── admin/
│                   └── dashboard.tsx  ← Manage students & parent links
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml          ← Full API definition (source of truth)
│   ├── api-client-react/
│   │   └── src/
│   │       ├── generated/api.ts  ← Auto-generated React Query hooks
│   │       └── custom-fetch.ts   ← Adds Bearer token to every request
│   ├── api-zod/
│   │   └── src/generated/        ← Auto-generated Zod validators
│   └── db/
│       └── src/
│           ├── index.ts          ← Exports the Drizzle DB client
│           └── schema/
│               ├── users.ts      ← users table definition
│               ├── students.ts   ← students table definition
│               └── payments.ts   ← payments table definition
│
├── pnpm-workspace.yaml           ← Declares all packages in the monorepo
├── package.json                  ← Root scripts and shared dev tools
└── replit.md                     ← Project overview and preferences
```

---

## 4. Database Design

The database has three tables. Here is how they relate:

```
users
├── id (PK)
├── name
├── email (unique)
├── password  (bcrypt hash, never stored as plain text)
├── role      (parent | cashier | admin)
└── created_at

students
├── id (PK)
├── name
├── grade     (e.g. "10")
├── section   (e.g. "A")
├── parent_id (FK → users.id)   ← links to the parent who owns this student
└── created_at

payments
├── id (PK)
├── student_id    (FK → students.id)  ← which student is being paid for
├── user_id       (FK → users.id)     ← which parent made the payment
├── amount        (numeric, e.g. 500.00)
├── method        (chapa | manual)
├── status        (pending | approved | rejected)
├── transaction_ref   ← Chapa txRef or bank ref number
├── receipt_image_url ← URL of uploaded bank slip image
├── notes         ← cashier notes when approving/rejecting
├── paid_at       ← timestamp when marked approved
└── created_at
```

**Relationships:**
- One parent (`users`) can have many students.
- One student can have many payments.
- Each payment belongs to one student and one user (the parent who paid).

---

## 5. Backend (API Server) — File-by-File Explanation

### `artifacts/api-server/src/index.ts` — Server Entry Point
This file starts the Express server. It:
- Creates the Express app
- Sets up JSON body parsing (so it can read request bodies)
- Mounts all routes under the `/api` prefix
- Starts listening on the port given by the environment variable `PORT` (default 8080)

```
Client sends:  POST /api/auth/login
Express reads: /api/auth/login → handled by authRouter
```

### `artifacts/api-server/src/lib/auth.ts` — JWT Authentication Helpers

**What is a JWT?** A JSON Web Token is a small encoded string that proves who you are. After login, the server creates a JWT containing your user ID and role, signs it with a secret key, and sends it to the browser. The browser sends it back on every request so the server knows who is making the request without needing to check the database every time.

```typescript
// Creates a token:  signToken({ id: 1, role: "cashier", email: "..." })
// Verifies a token: verifyToken("eyJhbGci...")
// Middleware that blocks requests without a valid token:  requireAuth
// Middleware that blocks requests from wrong roles:        requireRole("admin")
```

The token expires after **7 days**. The secret key used to sign it comes from the `SESSION_SECRET` environment variable.

### `artifacts/api-server/src/routes/auth.ts` — Login & Register Routes

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/api/auth/login` | POST | Checks email/password, returns JWT token + user info |
| `/api/auth/register` | POST | Creates a new parent account, returns JWT token |
| `/api/auth/me` | GET | Returns the currently logged-in user's profile (requires token) |

**How login works step by step:**
1. Browser sends `{ email, password }` to `/api/auth/login`
2. Server looks up the user in the database by email
3. If found, it compares the submitted password against the stored bcrypt hash
4. If they match, it creates a JWT and sends it back
5. The browser stores the JWT in `localStorage` and sends it on all future requests

**Password hashing:** Passwords are never stored as plain text. `bcryptjs` converts `"cashier123"` into a long random-looking hash like `"$2a$10$..."`. Even if someone steals the database, they cannot reverse the hash to get the original password.

### `artifacts/api-server/src/routes/students.ts` — Student Routes

| Endpoint | Method | Access | What it does |
|----------|--------|--------|-------------|
| `/api/students` | GET | All logged-in | Parents see their own children; cashiers/admins see all students |
| `/api/students/:id` | GET | All logged-in | Get one student's details |

### `artifacts/api-server/src/routes/payments.ts` — Payment Routes

| Endpoint | Method | Access | What it does |
|----------|--------|--------|-------------|
| `/api/payments` | GET | All logged-in | Parents see their own payments; cashiers/admins see all |
| `/api/payments` | POST | Parent | Initiate a Chapa (mock) payment — returns a checkout URL |
| `/api/payments/manual` | POST | Parent | Submit a manual bank transfer with receipt image URL |
| `/api/payments/verify/:txRef` | GET | Parent | Verify Chapa payment and mark it approved |
| `/api/payments/:id/approve` | POST | Cashier/Admin | Approve a manual payment |
| `/api/payments/:id/reject` | POST | Cashier/Admin | Reject a manual payment with optional notes |

### `artifacts/api-server/src/routes/admin.ts` — Admin-Only Routes

| Endpoint | Method | Access | What it does |
|----------|--------|--------|-------------|
| `/api/admin/users` | GET | Admin | List all user accounts |
| `/api/admin/students` | POST | Admin | Create a new student record |
| `/api/admin/link-student` | POST | Admin | Link a student to a parent account |

### `artifacts/api-server/src/routes/dashboard.ts` — Statistics

| Endpoint | Method | Access | What it does |
|----------|--------|--------|-------------|
| `/api/dashboard/stats` | GET | All logged-in | Returns counts: total students, pending/approved payments, total collected |

---

## 6. Frontend (React App) — File-by-File Explanation

### `artifacts/school-payment/src/App.tsx` — Root Component

This file does three important things:
1. **Sets up the router** — maps URL paths to page components
2. **Injects the auth token** — tells the API client to attach the JWT to every request
3. **Protects routes** — redirects to login if no token is present

```typescript
// Tells the API client to always include the JWT:
setAuthTokenGetter(() => useAuthStore.getState().token);
```

### `artifacts/school-payment/src/lib/auth.ts` — Auth Store (Zustand)

This is a tiny global state store that holds the user's login token. Any component in the app can read or update it.

```typescript
const { token, setToken } = useAuthStore();
setToken("eyJhbGci...");  // called after login
setToken(null);            // called after logout
```

The token is also saved to `localStorage` so it persists after page refresh.

### Pages

#### `pages/login.tsx`
- Shows the login form (email + password)
- On submit: sends `POST /api/auth/login`
- On success: clears the React Query cache (to avoid stale data), saves the token, redirects to the correct dashboard based on the user's role

#### `pages/register.tsx`
- Only for **parents** — no role selection (cashier/admin accounts are created by administrators directly in the database)
- On submit: sends `POST /api/auth/register` with `role: "parent"` hardcoded
- On success: saves token and redirects to the parent dashboard

#### `pages/parent/dashboard.tsx`
- Shows student cards (children linked to this parent)
- Shows full payment history with status badges
- "Pay Fees" button navigates to the payment page for that student

#### `pages/parent/pay.tsx`
- Two options: **Chapa** (online payment) or **Manual Bank Transfer**
- Chapa: sends request to backend → gets a `checkoutUrl` → redirects to `/parent/success?txRef=...`
- Manual: uploads receipt image URL + bank reference number

#### `pages/parent/success.tsx`
- Loaded after Chapa payment
- Reads the `txRef` from the URL query string
- Calls `/api/payments/verify/:txRef` to confirm and mark the payment approved
- Shows success message

#### `pages/cashier/dashboard.tsx`
- Shows all **pending manual payments**
- Search box to filter by student name or transaction reference
- Approve / Reject buttons with optional notes
- Shows summary stats (pending count, total collected, etc.)

#### `pages/admin/dashboard.tsx`
- **Create Student** form (name, grade, section)
- **Link Parent & Student** form (dropdown selectors)
- **Student Directory** table showing all students and which parent they're linked to

---

## 7. How the Parts Talk to Each Other

### Request Flow (Example: Parent views their children)

```
1. Parent opens the browser at /parent
2. React renders ParentDashboard component
3. useListStudents() hook fires (from @workspace/api-client-react)
4. custom-fetch.ts automatically adds: Authorization: Bearer <token>
5. Browser sends GET /api/students to Express
6. requireAuth middleware verifies the JWT token
7. Route handler queries the database: SELECT * FROM students WHERE parent_id = <userId>
8. JSON response sent back to browser
9. React renders the student cards
```

### The OpenAPI Spec as the Contract

The file `lib/api-spec/openapi.yaml` defines every API endpoint in a standard format. From this single file, two things are auto-generated by running `pnpm --filter @workspace/api-spec run codegen`:

- **`lib/api-client-react/src/generated/api.ts`** — React Query hooks like `useListStudents()`, `useLogin()`, `useApprovePayment()` etc.
- **`lib/api-zod/src/generated/`** — Zod validators like `LoginBody`, `CreateStudentBody` etc.

This means the frontend and backend always stay in sync with the same data shapes.

---

## 8. Authentication & Security

### How JWT Works in This System

```
LOGIN:
  Browser ──POST {email,password}──► Server
  Server creates JWT: { id: 2, role: "cashier", email: "cashier@..." }
  Server signs JWT with SESSION_SECRET → sends token back

EVERY SUBSEQUENT REQUEST:
  Browser ──GET /api/students──► Server
  Browser automatically attaches: Authorization: Bearer eyJhbGci...
  Server verifies signature using SESSION_SECRET
  Server reads user ID and role from inside the token
  Server decides what data to return based on role
```

### Role-Based Access Control

| Role | Can do |
|------|--------|
| **parent** | View own children, make payments, view own payment history |
| **cashier** | View all payments, approve/reject manual payments |
| **admin** | Everything cashier can do + create students + link students to parents |

The `requireRole("admin")` middleware on a route will automatically return `403 Forbidden` if a cashier or parent tries to access it.

---

## 9. Payment Flows

### Flow A: Chapa (Mock Online Payment)

```
Parent clicks "Pay via Chapa"
       ↓
POST /api/payments  { studentId, amount, method: "chapa" }
       ↓
Server creates payment record (status: "pending")
Server generates txRef = "OZONE-" + randomString
Server returns { checkoutUrl: "/parent/success?txRef=OZONE-...", txRef }
       ↓
Browser navigates to /parent/success?txRef=OZONE-...
       ↓
GET /api/payments/verify/OZONE-...
       ↓
Server finds the payment by txRef
Server updates status → "approved", sets paid_at = now
Returns success
```

In a real production system, the `checkoutUrl` would point to the real Chapa payment page and Chapa would send a webhook back to your server to confirm payment.

### Flow B: Manual Bank Transfer

```
Parent uploads bank receipt image + transaction reference number
       ↓
POST /api/payments/manual  { studentId, amount, transactionRef, receiptImageUrl }
       ↓
Server creates payment record (status: "pending")
       ↓
Cashier sees it in their dashboard
Cashier clicks Approve or Reject (with optional notes)
       ↓
POST /api/payments/:id/approve  or  POST /api/payments/:id/reject
       ↓
Server updates status → "approved" or "rejected"
Parent can see updated status in their payment history
```

---

## 10. How to Transfer the Project to Another PC

### Step 1: Install Required Software on the New PC

You must install these before anything else:

1. **Node.js 20 or newer** — https://nodejs.org (download the LTS version)
2. **pnpm** (package manager) — after installing Node.js, run:
   ```bash
   npm install -g pnpm
   ```
3. **PostgreSQL** — https://www.postgresql.org/download/
   - During install, set a password for the `postgres` user — remember it.
   - Default port: `5432`

### Step 2: Copy All Project Files

Copy the entire project folder. Every file and folder is needed. The most important ones are:

| What | Where | Why |
|------|-------|-----|
| `artifacts/` | Root | All frontend and backend source code |
| `lib/` | Root | Shared libraries (DB schema, API spec, generated clients) |
| `scripts/` | Root | Utility scripts |
| `package.json` | Root | Root dependencies and scripts |
| `pnpm-workspace.yaml` | Root | Tells pnpm about all packages |
| `tsconfig*.json` | Root | TypeScript configuration |

**You do NOT need to copy:**
- `node_modules/` — these are reinstalled from `package.json`
- `artifacts/api-server/dist/` — this is rebuilt from source

### Step 3: Install Dependencies

Open a terminal in the project folder and run:
```bash
pnpm install
```
This downloads all packages listed in `package.json` files across the entire monorepo.

### Step 4: Set Up the Database

See section 12 below for how to export from the current database and import it on the new PC.

### Step 5: Create the Environment File

Create a file called `.env` in `artifacts/api-server/` with this content:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ozone_school
SESSION_SECRET=pick-any-long-random-string-here
PORT=8080
```

Replace `YOUR_PASSWORD` with the PostgreSQL password you set during install.

### Step 6: Run the Project

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend:**
```bash
pnpm --filter @workspace/school-payment run dev
```

Then open your browser at: `http://localhost:25518`

---

## 11. How to Upload to GitHub

### Step 1: Install Git

Download from https://git-scm.com/ and install it.

### Step 2: Create a GitHub Account and Repository

1. Go to https://github.com and sign in (or create an account)
2. Click the **+** button in the top right → **New repository**
3. Name it (e.g. `ozone-school-payment`)
4. Set it to **Private** (recommended — your code has database configs)
5. Do NOT tick "Initialize with README" — you already have files
6. Click **Create repository**

### Step 3: Protect Your Secrets

Before uploading, create a `.gitignore` file in the project root (if one doesn't exist) with this content:

```
node_modules/
dist/
.env
*.env.local
*.env.production
.DS_Store
```

This prevents your database password and secret key from being uploaded.

### Step 4: Push Your Code

In a terminal at the project root:
```bash
git init
git add .
git commit -m "Initial commit — Ozone High School Payment System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ozone-school-payment.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 12. How to Export & Import the Database

**Note:** This project uses **PostgreSQL**, not MySQL. You cannot import it directly into XAMPP's phpMyAdmin. You need to use PostgreSQL's own tools (`pg_dump` and `psql`).

### Exporting (on the current machine — Replit)

In the Replit shell, run:
```bash
pg_dump $DATABASE_URL --no-owner --no-acl -f ozone_school_backup.sql
```

This creates a file `ozone_school_backup.sql` that contains all your tables and data.

### Importing (on the new PC)

1. First, create a new database:
   ```bash
   psql -U postgres -c "CREATE DATABASE ozone_school;"
   ```

2. Then import the backup:
   ```bash
   psql -U postgres -d ozone_school -f ozone_school_backup.sql
   ```

3. Update your `.env` file to point to the new database:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ozone_school
   ```

### Alternative: Use Drizzle to Recreate the Schema from Scratch

If you only want the table structure (not the data), you can recreate it automatically:
```bash
pnpm --filter @workspace/db run push
```

Then re-run the seed script to get the test accounts back.

### Can I Use XAMPP?

XAMPP bundles **MySQL**, not PostgreSQL. They are two different database systems and are not compatible. Your options are:

- **Option A (Recommended):** Install PostgreSQL alongside XAMPP. They can run on the same PC on different ports.
- **Option B:** Rewrite the database layer to use MySQL (significant work — requires changing all Drizzle schema files and the `DATABASE_URL` connection string format).

---

## 13. Environment Variables & Configuration

The project needs two environment variables to run. Set them in `artifacts/api-server/.env`:

| Variable | Example Value | Description |
|----------|--------------|-------------|
| `DATABASE_URL` | `postgresql://postgres:pass@localhost:5432/ozone_school` | Full PostgreSQL connection string |
| `SESSION_SECRET` | `my-super-secret-32-char-string` | Key used to sign JWT tokens. Keep this private. If you change it, all existing tokens are invalidated and all users will be logged out. |
| `PORT` | `8080` | Port the API server listens on |

The frontend (`school-payment`) does not need any environment variables — it connects to the API through the shared proxy.

---

## 14. Running the Project Locally

### Development (two terminals required)

```bash
# Terminal 1 — Start the API server (backend)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Start the React app (frontend)
pnpm --filter @workspace/school-payment run dev
```

- Frontend: http://localhost:25518
- Backend API: http://localhost:8080

### Regenerating API Code (after changing openapi.yaml)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Applying Database Schema Changes

```bash
pnpm --filter @workspace/db run push
```

### Type-checking the Whole Project

```bash
pnpm run typecheck
```

### Test Accounts (Pre-seeded in the Database)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ozone.edu.et | admin123 |
| Cashier | cashier@ozone.edu.et | cashier123 |
| Parent | parent@ozone.edu.et | parent123 |

The parent account is pre-linked to three students: Liya Bekele (Grade 10-A), Dawit Bekele (Grade 8-B), and Sara Bekele (Grade 11-C).

---

*Documentation generated for the Ozone High School Payment System — May 2026*
