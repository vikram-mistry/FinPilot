# FinPilot — Personal Finance Operating System

A premium Progressive Web App (PWA) for Indian salaried individuals to manage monthly cash flow, expenses, investments, emergency fund, home loan prepayments, and net worth.

> **"Based on my salary and expenses, how much should I invest, keep for emergencies, and prepay towards my home loan?"**

## Features

- 📊 **Smart Planner** — Rule-based financial advisor that allocates your monthly surplus
- 🏠 **Home Loan Tracker** — SBI daily reducing balance amortization with prepayment analysis
- 🛡️ **Emergency Fund** — Track progress towards your emergency corpus target
- 📈 **Investment Dashboard** — Monitor MF, EPF, NPS, and SIP portfolios
- 💰 **Net Worth** — Track assets vs liabilities over time
- 📅 **Monthly Planner** — Plan and finalize each month's finances
- 📱 **PWA** — Install on iPhone & Android, works offline

## Tech Stack

React 18 · TypeScript · Vite · Tailwind CSS · ShadCN UI · Framer Motion · Recharts · Firebase Auth & Firestore · PWA (Workbox)

---

## 🔧 Setup Instructions

### Prerequisites

- Node.js 20+ and npm 9+
- A Firebase project with Firestore and Google Authentication enabled
- A GitHub repository (for deployment)

### 1. Firebase Project Setup

Since you already have a Firebase account, follow these steps to set up FinPilot:

#### Option A: Use Existing Firebase Project (Recommended if you want shared billing)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Open your existing project
3. Go to **Project Settings** → **General** → scroll to **Your apps**
4. Click **Add app** → select **Web** (</> icon)
5. Register with nickname "FinPilot"
6. Copy the `firebaseConfig` values — you'll need them for environment variables
7. Click **Continue to console**

#### Option B: Create New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → name it (e.g., "FinPilot")
3. Disable Google Analytics (not needed) → **Create Project**
4. Go to **Project Settings** → **General** → **Add app** → Web
5. Copy the config values

#### Enable Google Sign-In

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Google** → **Enable**
3. Set a support email → **Save**

#### Enable Cloud Firestore

1. Go to **Firestore Database** → **Create database**
2. Select **Start in production mode**
3. Choose a location close to your users (e.g., `asia-south1` for India)
4. Click **Create**

#### Deploy Security Rules

Copy the contents of `firestore.rules` in this repo to:
**Firestore Database** → **Rules** tab → paste → **Publish**

#### Add Authorized Domain (for GitHub Pages)

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your GitHub Pages domain: `vikram-mistry.github.io`

### 2. Local Development

```bash
# Clone the repository
git clone https://github.com/vikram-mistry/FinPilot.git
cd FinPilot

# Install dependencies
npm install --legacy-peer-deps

# Create environment file
cp .env.example .env

# Edit .env with your Firebase config values
# VITE_FIREBASE_API_KEY=AIzaSy...
# VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your-project-id
# VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
# VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
# VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
# VITE_BASE_PATH=/

# Start development server
npm run dev
```

### 3. GitHub Pages Deployment

#### Set up GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add each of these secrets:

| Secret Name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | your-project.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | your-project-id |
| `VITE_FIREBASE_STORAGE_BUCKET` | your-project.appspot.com |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

#### Enable GitHub Pages

1. Go to repo **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` branch — the workflow will build and deploy automatically

Your app will be live at: `https://vikram-mistry.github.io/FinPilot/`

### 4. Syncing Data with Your Existing App

Since your existing app already writes to Firebase, FinPilot can coexist in the same Firebase project. Both apps share the same Firestore database, but FinPilot stores all its data under `users/{uid}/` paths that are unique to this app's data structure. Your existing app's data won't be affected.

To share authentication between apps:
- Both apps use the same Firebase project, so users who sign in with Google will have the same UID
- Add both domains to **Authorized domains** in Firebase Auth settings

---

## 📁 Project Structure

```
src/
  components/
    ui/          — ShadCN base + custom extensions
    charts/      — Recharts wrappers
    layout/      — NavBar, Sidebar, PageShell
  features/
    auth/        — Login page
    dashboard/   — Dashboard with summary cards & charts
    planner/     — Monthly Planner (core feature)
    loan/        — Home Loan module with amortization
    settings/    — App settings & data management
    onboarding/  — First-time setup wizard
  lib/
    firebase.ts  — Firebase init + offline persistence
    advisor.ts   — Rule-Based Financial Advisor Engine
    loanCalculator.ts — SBI daily reducing balance math
    formatters.ts — Currency, date, number formatters
    cn.ts        — Tailwind class merge utility
  hooks/
    useAuth.ts   — Google Sign-In hook
    useFirestore.ts — Firestore CRUD hooks
    useOffline.ts — Offline detection
  store/
    authStore.ts — Auth state (Zustand)
    appStore.ts  — App state (Zustand)
  types/
    index.ts     — All TypeScript interfaces
```

## 🏗️ Architecture

- **Authentication**: Firebase Auth with Google Sign-In (popup mode for HashRouter compatibility)
- **Database**: Cloud Firestore with offline persistence (IndexedDB)
- **Routing**: HashRouter for GitHub Pages compatibility
- **State**: Zustand for client state, Firestore for persistent state
- **Styling**: Tailwind CSS + ShadCN UI + Framer Motion animations
- **PWA**: Vite PWA Plugin with Workbox service worker

## 📄 License

Private — Single-user personal finance application.
