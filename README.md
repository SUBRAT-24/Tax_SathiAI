# 🧾 TaxSathi AI

> **Your AI-Powered GST & Tax Compliance Partner**

TaxSathi AI is a full-stack, production-grade RAG (Retrieval-Augmented Generation) chatbot built specifically for Indian GST and tax compliance. It combines cutting-edge AI with comprehensive tax knowledge to help businesses navigate complex tax regulations.

---

## ✨ Features

### 🤖 AI Chat (RAG Pipeline)
- **Multi-source retrieval**: Hybrid search combining BM25 keyword search + vector semantic search
- **Query expansion**: LLM-based query variants for better recall
- **Cohere reranking**: Cross-encoder reranking for precision
- **Streaming responses**: Real-time token-by-token streaming
- **Source citations**: Every answer linked to authoritative CBIC sources
- **Contextual follow-ups**: AI-suggested next questions

### 🧮 Tax Tools
- **GST Calculator**: Compute CGST, SGST, IGST for any amount and slab
- **ITC Eligibility Checker**: Verify Input Tax Credit eligibility
- **HSN Code Finder**: Search and validate HSN/SAC codes
- **Due Date Calendar**: Upcoming GST filing deadlines
- **Late Fee Calculator**: Compute penalties for delayed filing

### 📄 Document Management
- **PDF upload & parsing**: PyMuPDF + pdfplumber for text extraction
- **Auto-chunking**: Smart document splitting for RAG ingestion
- **Status tracking**: Real-time processing status indicators

### 🛡️ Admin Panel
- **Dashboard**: User stats, query analytics, revenue charts
- **User Management**: Search, filter, ban/unban, CSV export
- **Activity Tracker**: Real-time activity feed + usage heatmap
- **Knowledge Base**: Upload, index, and manage tax documents
- **Security Panel**: Failed logins, blocked IPs, session management
- **App Settings**: Maintenance mode, rate limits, LLM configuration

### 🎨 Premium UI
- **Dark mode first**: Sleek dark theme with glassmorphism
- **Framer Motion**: Page transitions, stagger animations, spring physics
- **Responsive**: Works on desktop, tablet, and mobile

---

## 🏗️ Architecture

```
taxsathi-ai/
├── backend/                  # FastAPI + Python
│   ├── app/
│   │   ├── api/v1/          # REST API routes
│   │   ├── core/            # RAG pipeline, LLM, embeddings
│   │   ├── models/          # SQLAlchemy models
│   │   ├── middleware/      # Auth, rate limiting, activity tracking
│   │   ├── services/       # Business logic services
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py        # Pydantic settings
│   │   └── database.py      # Async SQLAlchemy setup
│   ├── requirements.txt
│   └── Dockerfile
├── frontend-web/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/           # All app pages (12 pages)
│   │   ├── components/      # Reusable components
│   │   ├── animations/      # Framer Motion variants & hooks
│   │   ├── store/           # Redux Toolkit slices
│   │   ├── utils/           # API client, helpers
│   │   └── App.tsx          # Root component with routing
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml        # Full local stack
├── nginx.conf               # Reverse proxy config
├── .github/workflows/       # CI/CD pipelines
└── .env.example             # Environment template
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 20
- **Python** ≥ 3.11
- **Docker** & **Docker Compose** (optional, for full stack)

### Option 1: Local Development (Recommended)

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with your API keys (at minimum, set GEMINI_API_KEY)

# Start server
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend-web

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Option 2: Docker Compose

```bash
# Configure environment
cp .env.example backend/.env

# Start all services
docker-compose up --build

# Access:
#   Frontend: http://localhost:80
#   Backend:  http://localhost:8000
#   API Docs: http://localhost:8000/docs
```

---

## ⚙️ Configuration

### Required API Keys

| Key | Provider | Purpose | Required? |
|-----|----------|---------|-----------|
| `GEMINI_API_KEY` | Google AI Studio | Primary LLM | ✅ Yes |
| `OPENAI_API_KEY` | OpenAI | Fallback LLM | ❌ Optional |
| `COHERE_API_KEY` | Cohere | Reranking | ❌ Optional |

> **Note**: The app works with just a Gemini API key. OpenAI and Cohere degrade gracefully if not configured.

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@taxsathi.ai` | `admin123456` |

---

## 📡 API Documentation

Once the backend is running, access:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | User registration |
| `POST` | `/api/v1/auth/login` | User login |
| `POST` | `/api/v1/chat/query` | Send RAG query |
| `WS`   | `/api/v1/chat/ws/{session_id}` | Streaming chat |
| `POST` | `/api/v1/documents/upload` | Upload document |
| `POST` | `/api/v1/tools/gst-calculator` | Calculate GST |
| `GET`  | `/api/v1/dashboard/stats` | User dashboard |
| `POST` | `/api/v1/admin/login` | Admin login |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pip install pytest pytest-asyncio httpx
python -m pytest tests/ -v

# Frontend build check
cd frontend-web
npm run build
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | REST API framework |
| SQLAlchemy (async) | ORM with async support |
| ChromaDB | Vector store (dev) |
| Sentence-Transformers | Embeddings (all-MiniLM-L6-v2) |
| Google Gemini | Primary LLM |
| Cohere | Reranking |
| PyMuPDF | PDF parsing |
| slowapi | Rate limiting |
| PyJWT | JWT authentication |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Framer Motion | Animations |
| Redux Toolkit | State management |
| React Query | Server state |
| Recharts | Charts & graphs |
| Lucide React | Icons |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker Compose | Local orchestration |
| Nginx | Reverse proxy |
| PostgreSQL | Production database |
| Redis | Caching & Celery broker |
| GitHub Actions | CI/CD |

---

## 📝 License

This project is proprietary. All rights reserved.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Built with ❤️ for Indian tax compliance
