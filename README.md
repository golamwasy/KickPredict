# KickPredict

A fully functional, responsive web application for predicting FIFA World Cup match results and competing on a global leaderboard.

---

## 🏗️ Project Architecture (Monorepo)

This project is structured as a **monorepo** containing both the frontend client and the backend server:

```
KickPredict/
├── backend/          # Express API server with TypeScript, Prisma ORM, and Cron Jobs
├── frontend/         # Next.js web application built with TypeScript and CSS Module
├── docker-compose.yml# Docker configuration for local PostgreSQL database
└── README.md         # Project documentation (this file)
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js (React), CSS Modules (Vanilla CSS for maximum control and speed)
- **Backend**: Node.js, Express, TypeScript, `node-cron`
- **Database**: PostgreSQL with Prisma ORM
- **Infrastructure**: Docker Compose (for local database instance)
- **APIs**: ESPN Scoreboard API for live fixtures, scores, and status sync

---

## ⚽ Core Features

### 🔄 ESPN Sync & Automated Match Flow
Matches are synchronized from the ESPN Scoreboard API every minute via an automated backend cron job. The state machine for a match is structured as follows:

| Match Status | Time Window / Condition | Prediction Status | Scoring State |
| :--- | :--- | :--- | :--- |
| **`UPCOMING`** | Kickoff is more than 24 hours away. | ❌ Disabled | N/A |
| **`OPEN`** | Kickoff is within 24 hours. |  Active (Predictable) | N/A |
| **`LOCKED`** | Kickoff time has passed, but the match is not live yet. | 🔒 Closed | N/A |
| **`LIVE`** | Match is actively in progress. | 🔒 Closed | N/A |
| **`FINISHED`** | Match is completed on the ESPN feed. | 🔒 Closed |  Points calculated |

*Note: If the ESPN API is delayed, the backend scheduler runs a fallback mechanism to forcefully lock `OPEN` matches once their scheduled kickoff time is reached.*

### 🛡️ Authentication & Admin Management
- Complete authentication flow: User registration, secure login, and email-based code verification.
- Initial Admin user seeding script for administration tasks.

### 📊 Prediction & Scoring Logic
Points are calculated dynamically once a match status transitions to `FINISHED` according to the following scoring rules:
- **Correct Outcome (Win/Loss/Draw)**: `+3 points`
- **Exact Score**: `+5 points` (awarded for matching the exact scoreline)
- **Correct Goals (Home/Away)**: `+1 point` per team for predicting that specific team's exact goal count

### 🏆 Global Leaderboard
- Interactive global leaderboard listing users ranked by their total accumulated points.
- Real-time updates with performance metrics and accuracy tracking.

### 🌐 Timezone Consistency
- All dates and kickoff times are saved in **UTC** within the PostgreSQL database.
- The Next.js frontend automatically converts and formats timestamps into the **`Europe/Helsinki`** timezone for display, ensuring a consistent user experience.

---

## 🚀 Local Development Setup

### Prerequisite
Ensure you have [Docker](https://www.docker.com/) installed and running.

---

### Step 1: Start the PostgreSQL Database
From the project root:
```bash
docker compose up -d
```
This spins up a local PostgreSQL container mapped to port `5432` with credentials configured in `docker-compose.yml`.

---

### Step 2: Configure & Launch the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database schema & seed the database:
   ```bash
   # Run migrations to push the Prisma schema to PostgreSQL
   npx prisma db push

   # Seed the Admin user and initial workspace state
   npm run seed
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
The backend API will run on [http://localhost:5001](http://localhost:5001).

---

### Step 3: Configure & Launch the Frontend
1. In a new terminal tab, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
The frontend will run on [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Environment Variables

### Backend (`/backend/.env`)
The database and auth configurations are set up in `/backend/.env`:
- `DATABASE_URL`: Connection string to the PostgreSQL database.
- `JWT_SECRET`: Secret key used for signing JWT login tokens.
- `PORT`: Port the Express server listens on (`5001`).
- `FRONTEND_URL`: URL of the Next.js client for CORS policy checks (`http://localhost:3000`).
- `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_FULL_NAME`, `ADMIN_PASSWORD`: Seeding credentials.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: SMTP configuration for sending verification emails.

### Frontend (`/frontend/.env.local`)
Create a `.env.local` inside the `frontend` folder to hook up the backend API:
```env
NEXT_PUBLIC_API_URL="http://localhost:5001"
```

---

## 📦 Production Deployment Recommendation

### Frontend (Next.js) -> **Vercel**
Deploy the `frontend` directory as a Next.js project on Vercel. Set the **Root Directory** setting to `frontend` in your Vercel project configuration.

### Backend (Express) & Database -> **Render**
1. **Database**: Spin up a managed PostgreSQL database on Render.
2. **Backend**: Spin up a **Web Service** on Render pointing to your GitHub repository:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `node dist/index.js`
   - Configure the environment variables to hook up your Render Database URL.
