# SAHAAYAA AI (AI-Powered Homeless & Needy Resource Matching Platform)

> **"Connecting the right help to the right person at the right time."**
> 
> *Full-Stack Deep Neural Network (DNN) + PWA Mobile App + Netlify Production Setup*

---

## 1. Project Overview

**SAHAAYAA AI** is a genuinely functional, end-to-end full-stack social impact platform engineered to bridge the gap between destitute individuals experiencing basic-need hardships (food starvation, homelessness, lack of warm clothing, emergency medical trauma, disaster displacement, education disruption, and unemployment) and nearby community resources (NGOs, community kitchens, night shelters, volunteer task forces, and individual donors).

### Key Highlights
1. **PWA Mobile-First Application**: Installable as a Progressive Web App (PWA) on Android, iOS, and Desktop with offline app shell caching (`sw.js`), standalone display, custom PWA icons (192x192, 512x512, maskable, apple-touch-icon), safe-area inset support, and an in-app installation prompt banner (`beforeinstallprompt`).
2. **Netlify Production Ready**: Pre-configured with SPA wildcard fallback routing (`netlify.toml` & `public/_redirects`), asset optimization, and environment-driven API resolution (`VITE_API_URL`, `VITE_SOCKET_URL`).
3. **Real TensorFlow/Keras Deep Neural Network (DNN)**: Built using Keras with an NLP pipeline (`TextVectorization -> Embedding -> GlobalAveragePooling1D -> Dense -> Dropout -> Dense(Softmax)`). Parses natural language distress descriptions into 7 category classes without hardcoded rules.
4. **Multi-Factor Urgency Engine**: Analyzes critical linguistic keywords (`"tonight"`, `"starving"`, `"bleeding"`, `"trapped"`), vulnerable demographics (infants, elderly, dependents), and category indicators to compute deterministic urgency scores (0–100) and urgency tiers (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
5. **Haversine Geo-Proximity Matching Engine**: Computes great-circle distances between re-scaled coordinates and community facilities around Coimbatore, Tamil Nadu, calculating multi-variable compatibility scores (Category 40%, Distance 30%, Availability 15%, Capacity 15%).
6. **Mobile App Shell & Glass Navigation**: Compact mobile top header, mobile view switcher for Leaflet map canvas vs list view, slide-up bottom sheet inspector modal, turn-by-turn Google Maps navigation, and fixed bottom navigation bar with active route indicators.
7. **Real-Time WebSocket Synchronization**: Utilizes **Flask-SocketIO** to broadcast status transitions (`PENDING_VERIFICATION` → `VERIFIED` → `ACCEPTED` → `IN_PROGRESS` → `DELIVERED` → `COMPLETED`) across connected client dashboards instantly.
8. **Vulnerable Person Privacy Safeguards**: Exact addresses and phone numbers are hidden on public maps. Public views use perturbed approximate coordinates (~300m–500m jitter) and masked contact details.

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│               REACT + TYPESCRIPT FRONTEND (Vite / Netlify)             │
│                                                                        │
│   [ App Shell ] ──► [ Top Header ] + [ Mobile Bottom Navigation ]      │
│   [ /request-help ]     [ /ai-demo ]       [ /map ]     [ /dashboard ] │
│     Intake Wizard       DNN Showcase     Leaflet Map     Role Portals  │
│           │                   │                │              │        │
└───────────┼───────────────────┼────────────────┼──────────────┼────────┘
            │ (REST APIs)       │                │              │
            ▼                   ▼                ▼              │
┌──────────────────────────────────────────────────────────────┼────────┐
│               FLASK + FLASK-SOCKETIO BACKEND (Port 5000)      │        │
│                                                              │ (WS)   │
│   Routes: /api/auth   /api/requests   /api/resources  /api/ai│        │
│           /api/admin  /api/matching   /api/dashboard         ▼        │
│                                                       Socket.IO Hub   │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                 AI & INFERENCE SUBSYSTEMS                      │  │
│   │                                                                │  │
│   │  1. Real Keras DNN Model (resource_classifier.keras)           │  │
│   │  2. Urgency Detection Module (Keyword + Demographic Scoring)  │  │
│   │  3. Duplicate Detection Service (Phone, String & Proximity)   │  │
│   │  4. Haversine Geo-Proximity Matcher (Deterministic Scoring)   │  │
│   └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ SQLAlchemy ORM
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SQLITE DATABASE (sahaayaa.db)                   │
│                                                                        │
│   • users                     • requests              • resources      │
│   • matches                   • donations             • audit_logs     │
│   • request_status_history    • verifications         • notifications  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

- **Frontend**:
  - **React 19** & **TypeScript**
  - **Vite** (Optimized bundler & PWA builder)
  - **Tailwind CSS** (Utility styling with safe area inset variables)
  - **PWA Service Worker** (`sw.js` & `manifest.webmanifest`)
  - **GSAP** (Parallax entrance and interactive effects)
  - **Leaflet & React-Leaflet** (OpenStreetMap live geospatial network)
  - **Recharts** (Interactive administrative charts)
  - **Socket.IO Client** (Instant real-time status propagation)
  - **Lucide React** (UI iconography)
  - **Axios** (REST client with JWT interceptors)

- **Backend**:
  - **Python 3.11+**
  - **Flask 3.0** & **Flask-CORS**
  - **Flask-SocketIO** (Bi-directional WebSockets)
  - **Flask-SQLAlchemy** & **SQLite**
  - **PyJWT** (Stateless JWT authentication)
  - **bcrypt** (Salted password hashing)

- **Machine Learning**:
  - **TensorFlow 2.21.0** / **Keras 3.15.1**
  - **NLP Architecture**: `TextVectorization` (Vocabulary 3000, Sequence length 50) → `Embedding` (Dim 64) → `GlobalAveragePooling1D` → `Dense` (64, ReLU) → `Dropout` (0.3) → `Dense` (32, ReLU) → `Dense` (7, Softmax)
  - Classes: `CLOTHING`, `EDUCATION`, `EMERGENCY`, `EMPLOYMENT`, `FOOD`, `MEDICAL`, `SHELTER`

---

## 4. Demo Accounts & Credentials

Academic and demonstration accounts pre-seeded in the database:

| Role | Email | Password | Pre-Assigned Name / Org |
|---|---|---|---|
| **Admin** | `admin@sahaayaa.org` | `admin123` | Dr. V. Rajesh (Central Directorate) |
| **NGO** | `aravind.ngo@sahaayaa.org` | `ngo123` | Aravind Relief Mission |
| **Donor** | `donor@sahaayaa.org` | `donor123` | Kavitha Sundaram (Donor) |
| **Requester** | `requester@sahaayaa.org` | `requester123` | Murugan S. (Needy Requester) |
| **Volunteer** | `volunteer@sahaayaa.org` | `volunteer123` | Praveen Kumar (City Youth Volunteer) |

> **Quick Switcher**: Switch demo roles instantly using the **"Demo Roles"** pill in the top navigation bar or the 1-click quick login buttons on `/login`.

---

## 5. Mobile App & PWA Installation Guide

### Android (Chrome / Edge / Brave)
1. Open SAHAAYAA AI in Chrome.
2. Tap the **"Install SAHAAYAA App"** banner at the top or open Chrome Menu ($\vdots$) $\rightarrow$ **Add to Home screen** / **Install app**.
3. Confirm installation. The application icon will appear on your home screen and launcher.

### iOS (Safari)
1. Open SAHAAYAA AI in Safari.
2. Tap the **Share** icon ($\uparrow$) in Safari toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm app title **SAHAAYAA**.

### Desktop (Chrome / Edge)
1. Open SAHAAYAA AI in Desktop Chrome.
2. Click the **Install Icon** ($\oplus$) in the browser address bar or click **Install Now** on the banner.

---

## 6. Local Setup & Execution (Windows / macOS / Linux)

### Option A: 1-Click Launcher (Windows)
Double-click:
```bat
start.bat
```
This script will:
1. Check the trained TensorFlow model (`resource_classifier.keras`). If missing, it trains the model automatically.
2. Launch the Flask-SocketIO backend on `http://127.0.0.1:5000`.
3. Launch the Vite React development server on `http://localhost:5173`.
4. Open your default browser to `http://localhost:5173`.

---

### Option B: Manual Setup

#### 1. Backend Setup
Open a terminal in `sahaayaa-ai/backend`:
```bash
# Install Python requirements
pip install -r requirements.txt

# (Optional) Retrain DNN model if desired
python ml/generate_dataset.py
python ml/train.py

# Run backend test suite
python tests/test_app.py

# Run Flask Backend
python app.py
```
Backend runs at: `http://127.0.0.1:5000`

#### 2. Frontend Setup
Open a second terminal in `sahaayaa-ai/frontend`:
```bash
# Install npm packages
npm install

# Start Vite dev server
npm run dev

# Or test production build locally
npm run build
npm run preview
```
Frontend runs at: `http://localhost:5173`

---

## 7. Netlify Deployment Setup

### Build Settings
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Root Directory**: `frontend` (if deploying from repository root)

### Environment Variables on Netlify
Configure environment variables under **Site settings** $\rightarrow$ **Environment variables**:

| Variable | Recommended Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://your-flask-backend.onrender.com/api` | Deployed Flask API endpoint |
| `VITE_SOCKET_URL` | `https://your-flask-backend.onrender.com` | Deployed Flask-SocketIO server URL |

### Netlify SPA Redirect Configuration
Handled automatically via `frontend/netlify.toml` and `frontend/public/_redirects`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 8. GitHub Repository Security Guidelines

The repository is configured with strict `.gitignore` rules:
- **`backend/sahaayaa.db`**: Local database file is excluded from git commits to protect user data and privacy. Fresh database instances automatically seed initial demo data on first run via `seed_data()`.
- **`backend/uploads/`**: User uploaded files and images are kept local.
- **`.env` & Secrets**: Environment variables and API keys are excluded.

---

## 9. Verification & Automated Tests

To execute the backend ML, matching, and API test suite:
```bash
cd backend
python tests/test_app.py
```

To run the frontend production build check:
```bash
cd frontend
npm run build
```

---
*Developed for College Social-Impact Demonstration & Advanced Agentic Engineering.*
