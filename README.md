# 🏥 AI Medical Report Simplifier

> Upload a medical lab report (PDF or photo) → get a **plain-language summary** with abnormal values flagged.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native (Expo) – runs on iOS, Android & Web |
| **Backend** | FastAPI (Python 3.12) |
| **Database** | PostgreSQL (async via SQLAlchemy + asyncpg) |
| **OCR** | Tesseract (pytesseract + pdf2image) |
| **AI/NLP** | OpenAI GPT-4o-mini with medical glossary RAG |
| **Deployment** | Docker · Render (backend) · Vercel (frontend web) |

---

## 📁 Project Structure

```
├── backend/                 # FastAPI server
│   ├── app/
│   │   ├── main.py          # App entry point
│   │   ├── api.py           # API routes
│   │   ├── models.py        # Database models
│   │   ├── ocr.py           # Tesseract OCR
│   │   ├── ai.py            # OpenAI integration
│   │   ├── tasks.py         # Background pipeline
│   │   └── data/glossary.json
│   ├── Dockerfile
│   └── requirements.txt
│
├── front-end/               # Expo React Native app
│   ├── App.js
│   └── src/
│       ├── screens/         # Upload, Result, History
│       ├── api.js           # API client
│       └── theme.js         # Dark theme
│
├── docker-compose.yml       # Local dev (PostgreSQL + Backend)
├── render.yaml              # Render deployment blueprint
└── .env.example             # Environment variable template
```

---

## 🚀 Quick Start (Local)

### 1. Clone & configure
```bash
git clone https://github.com/SAKSHAM237/m-r-s.git
cd m-r-s
cp .env.example .env
# Edit .env → add your OPENAI_API_KEY
```

### 2. Start backend (Docker)
```bash
docker compose up --build -d
# Backend → http://localhost:8000
# Health check → http://localhost:8000/health
```

### 3. Start frontend
```bash
cd front-end
npm install
npx expo start
```
> Install **Expo Go** on your phone and scan the QR code.

---

## 🌐 Deploy

### Backend → Render
1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect this GitHub repo
3. Render reads `render.yaml` and creates the backend + PostgreSQL automatically
4. Set `OPENAI_API_KEY` in Render dashboard → Environment

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → **Import Project**
2. Select this repo
3. Set **Root Directory** to `front-end`
4. Set **Build Command** to `npx expo export --platform web`
5. Set **Output Directory** to `dist`
6. Add env var `EXPO_PUBLIC_API_URL` = your Render backend URL

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/upload?language=en` | Upload PDF/image → starts OCR + AI |
| `GET` | `/api/report/{report_id}` | Get a single report (polling) |
| `GET` | `/api/history/{user_id}` | All reports for a user |

---

## 🔒 Security
- Data encrypted **in transit** (HTTPS via Render/Vercel)
- Database encryption **at rest** (Render PostgreSQL)
- API key stored in environment variables, never in source code

---

## ⚠️ Disclaimer
This tool provides **simplified summaries for informational purposes only**. It does **not** provide medical diagnoses. Always consult a qualified healthcare professional.

---

## 📄 License
MIT
