# Capstone Project Architecture

This repository contains the architecture for the Capstone project, divided into a NestJS backend and a ReactJS (Vite) frontend.

## Project Structure

```
CAPSTONE/
├── backend/            # NestJS Backend (Node.js + TypeScript)
├── frontend/           # ReactJS Frontend (Vite + TypeScript)
├── docs/               # Project Documentation and Assets
│   ├── database/       # Database designs & ERD diagrams
│   ├── ui-ux/          # UI/UX design screenshots & assets
│   └── specification/  # Business requirements & documentation
└── README.md           # This file
```

---

## Setup & Running the Applications

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed on your system.

### 2. Backend (NestJS)

To install dependencies and start the NestJS backend in development mode:

```bash
cd backend
npm install
npm run start:dev
```

The server will start, typically running on [http://localhost:3000](http://localhost:3000).

### 3. Frontend (ReactJS + Vite)

To install dependencies and start the ReactJS frontend:

```bash
cd frontend
npm install
npm run dev
```

The app will run in development mode, typically accessible on [http://localhost:5173](http://localhost:5173).

---

## Running with Docker (Recommended for Dev)

To start the entire application stack (Database + NestJS Backend + React Frontend) using Docker Compose:

### 1. Prerequisites
Ensure you have **Docker Desktop** installed and running on your system.

### 2. Startup Containers
Run the following command at the root directory of the project:
```bash
docker compose up --build
```

This will automatically:
- Pull and run a **PostgreSQL** database on port `5432`
- Build and run the **NestJS Backend** on port `3000` (accessible at [http://localhost:3000/api](http://localhost:3000/api))
- Build and run the **React Frontend** on port `5173` (accessible at [http://localhost:5173](http://localhost:5173))

### 3. Database Management (Prisma)
To run database migrations inside the backend docker container, run:
```bash
docker compose exec backend npx prisma migrate dev
```

---

## Git Operations

The project git remote is set to:
`https://github.com/thang-nt25/project-capstone-fall26.git`

To commit and push changes:
```bash
git add .
git commit -m "Initialize project structure with NestJS and ReactJS"
git branch -M main
git push -u origin main
```

