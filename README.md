# KickPredict

A fully functional responsive web application for FIFA World Cup match predictions.

## Tech Stack
*   **Frontend**: Next.js (React), CSS Modules
*   **Backend**: Node.js, Express, TypeScript
*   **Database**: PostgreSQL with Prisma ORM
*   **Infrastructure**: Docker Compose

## Features
*   User Signup, Login, Email Verification.
*   Automated match locking exactly 12 hours before kickoff.
*   Prediction constraints (only OPEN matches can be predicted).
*   Scoring calculation (Correct Result: 3pts, Exact Score: 5pts, Correct Goals: 1pt/team).
*   Global Leaderboard with accuracy tracking.
*   Timezones handled efficiently (Stored in UTC, displayed as Europe/Helsinki in UI).

## Local Development Setup

### 1. Start the Database
Ensure Docker is installed and running.
```bash
docker compose up -d
```

### 2. Setup Backend
```bash
cd backend
npm install
# The .env file is already created for you in /backend/.env
# Run database migrations and generate Prisma client
npx prisma db push
npm run dev
```

### 3. Setup Frontend
In a new terminal tab:
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000) and the backend API at [http://localhost:5000](http://localhost:5000).

## Note on Timezones
All match kickoff times are stored in UTC in PostgreSQL. The Next.js frontend is responsible for converting the UTC dates to `Europe/Helsinki` time upon displaying them to the user, ensuring a consistent experience regardless of the local timezone of the client's device.
