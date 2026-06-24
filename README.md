<div align="center">

# CalPolice.ai

### AI-Powered Calorie Tracker & Fitness Intelligence Platform

[![React](https://img.shields.io/badge/React.js-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-Flask-3776AB?style=for-the-badge&logo=python)](https://flask.palletsprojects.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Groq](https://img.shields.io/badge/Groq-LLaMA%203-F55036?style=for-the-badge)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Built end-to-end with AI-assisted development tools — shipped fast, deployed clean.**

[Live Demo](#) · [Report Bug](https://github.com/codemeteorite/calpolice/issues) · [Request Feature](https://github.com/codemeteorite/calpolice/issues)

</div>

---

## 📖 Table of Contents

- [About The Project](#-about-the-project)
- [Tech Stack](#-tech-stack)
- [AI Tools Used in Development](#-ai-tools-used-in-development)
- [Architecture](#-architecture)
- [Features](#-features)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)

---

## 🚀 About The Project

**CalPolice** is a full-stack, AI-powered health and fitness platform that helps users track calories, log meals & workouts, monitor wellness, and receive personalised diet and exercise recommendations — all driven by a custom **Groq LLaMA 3** AI backend.

This project was designed, built, and shipped **end-to-end** as a showcase of modern full-stack development combined with AI & automation tooling. From UI design (Figma AI-inspired layouts) to cloud deployment on Netlify + Railway, every layer reflects real-world production practices.

> **Built with**: React.js, JavaScript, Node.js/Express, Python/Flask, MongoDB Atlas, Groq LLaMA 3 AI, OpenAI-compatible APIs, Claude APIs-style prompting patterns, and deployed via Git & cloud pipelines.

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React.js** (v18) | UI framework — component-based SPA architecture |
| **JavaScript (ES2023)** | Primary language — hooks, async/await, context API |
| **Vite** | Ultra-fast dev server & build tool |
| **React Router v6** | Client-side routing & navigation |
| **Recharts** | Data visualisation — calorie charts, macro rings |
| **CSS3 / Vanilla CSS** | Custom design system, glassmorphism, animations |

### Backend (Node.js)
| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | RESTful API server |
| **JavaScript / TypeScript-compatible** | All routes, middleware, models in JS |
| **MongoDB Atlas + Mongoose** | Cloud-hosted NoSQL database |
| **JWT + bcryptjs** | Secure authentication & session management |
| **express-rate-limit** | API rate limiting & DDoS protection |

### AI Service (Python)
| Technology | Purpose |
|-----------|---------|
| **Python / Flask** | Lightweight AI microservice |
| **Groq API (LLaMA 3.3 70B)** | LLM-powered recommendations & chat |
| **OpenAI API-compatible** | AI request/response format — plug-and-play with OpenAI APIs or Claude APIs |
| **LangChain-style prompting** | Structured system prompts for personalised AI responses |

### DevOps & Cloud Deployment
| Technology | Purpose |
|-----------|---------|
| **Git + GitHub** | Version control, branch management, push protection |
| **Netlify** | Frontend cloud deployment (CDN + SPA redirects) |
| **Railway / Render** | Backend & AI service cloud deployment |
| **Environment Variables** | Secure secrets management across services |

---

## 🤖 AI Tools Used in Development

This project was built leveraging the full modern AI-assisted development stack:

| Tool | How it was used |
|------|----------------|
| **Cursor** | AI-powered code editor for rapid iteration and context-aware completions |
| **Claude Code / Claude APIs** | Architecture decisions, code review, and prompt engineering |
| **GitHub Copilot** | In-editor autocompletion for boilerplate and repetitive patterns |
| **Windsurf** | AI agent-driven development for scaffolding and debugging |
| **Groq + OpenAI APIs** | Core LLM integration for AI recommendations inside the app |
| **Gemini APIs** | Research and documentation assistance |
| **n8n / Make** | Automation workflow concepts applied to data pipeline design |
| **Figma AI** | UI/UX design inspiration and layout planning |
| **v0 by Vercel** | Component prototyping and rapid UI iteration |
| **Framer** | Motion design concepts applied to CSS animations |
| **Uizard** | Wireframing and early concept validation |

> This project reflects the **Preferred Qualifications** pattern: built end-to-end, shipped to production, with heavy AI tool usage throughout the development lifecycle.

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────┐
│                   CLIENT (React.js)                  │
│          Vite · React Router · Recharts              │
│              Hosted on Netlify (CDN)                 │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP / REST API
                     │ (JWT Auth headers)
┌────────────────────▼─────────────────────────────────┐
│             NODE.js / EXPRESS BACKEND                │
│    Auth · Meals · Workouts · Progress · Feed         │
│    Rate Limiting · Input Validation · CORS           │
│              Hosted on Railway / Render              │
└──────┬────────────────────────┬────────────────────┘
       │ Mongoose ODM           │ HTTP → AI Service
       │                        │
┌──────▼──────┐      ┌──────────▼───────────────────┐
│  MongoDB    │      │    PYTHON / FLASK AI SERVICE  │
│   Atlas     │      │  Groq LLaMA 3 · OpenAI-compat │
│  (Cloud DB) │      │   Personalised Recommendations│
└─────────────┘      └───────────────────────────────┘
```

---

## ✨ Features

- 🔐 **Secure Auth** — JWT tokens, bcrypt hashing, rate-limited login (10 req/15 min), anti user-enumeration
- 🍽 **Meal Logging** — Log meals, track macros (protein, carbs, fats, calories) daily
- 💪 **Workout Log** — Log exercises with sets, reps, and duration
- 📊 **Dashboard Analytics** — Weekly calorie charts, macro rings, progress tracking
- 🤖 **AI Recommendations** — LLM-powered personalised diet & exercise plans via Groq API
- 💬 **AI Chat** — Real-time chat with an AI fitness assistant (Abu)
- 💧 **Water Tracker** — Daily hydration monitoring
- 😌 **Stress & Wellness Log** — Mood and wellness tracking
- 🌐 **Social Feed** — Community posts and fitness updates
- 📅 **Day History** — Full meal and workout history per day

---

## 🏁 Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB Atlas account
- Groq API key ([get one free](https://console.groq.com/))

### 1. Clone the repo

```bash
git clone https://github.com/codemeteorite/calpolice.git
cd calpolice
```

### 2. Set up environment variables

```bash
# Node backend
cp server/.env.example server/.env

# React frontend
cp client/.env.example client/.env.local

# Python AI service
cp calpolice-ai/.env.example calpolice-ai/.env
```

Fill in your real values in each `.env` file.

### 3. Install dependencies

```bash
# Backend (Node.js)
cd server && npm install

# Frontend (React.js)
cd ../client && npm install

# AI Service (Python)
cd ../calpolice-ai
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 4. Run all services

```bash
# Terminal 1 – Node backend (port 5000)
cd server && npm run dev

# Terminal 2 – Python AI (port 5001)
cd calpolice-ai && .venv\Scripts\python app.py

# Terminal 3 – React frontend (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173** 🚀

---

## 📡 API Reference

### Auth Routes (`/api/auth`)
| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/signup` | Register new user | 10 / 15 min |
| `POST` | `/login` | Login & receive JWT | 10 / 15 min |
| `POST` | `/logout` | Logout (discard token) | — |

### Protected Routes (require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/meals` | Meal logging & retrieval |
| `GET/POST` | `/api/exercises` | Workout log |
| `GET` | `/api/progress` | Progress & analytics |
| `GET` | `/api/recommendations` | AI diet/workout recommendations |
| `POST` | `/api/chat` | AI fitness chatbot |
| `GET/POST` | `/api/wellness` | Stress & wellness logs |
| `GET/POST` | `/api/feed` | Social feed posts |
| `GET` | `/health` | API health check |

---

## ☁️ Deployment

This project uses a **3-service cloud deployment** pattern:

```
Frontend  → Netlify    (static CDN, SPA routing via _redirects)
Backend   → Railway    (Node.js, env vars set in dashboard)
AI        → Render     (Python Flask, auto-deploy from GitHub)
```

See [DEPLOY.md](DEPLOY.md) for the full step-by-step deployment guide.

---

## 🧪 Testing

The project is structured for compatibility with modern AI-assisted testing tools:

- **Playwright** — E2E tests can be added targeting `/login`, `/signup`, and dashboard flows
- **Testim / Mabl** — AI-assisted UI regression testing on the React.js frontend
- Manual API testing via the `/health` endpoint and Postman

```bash
# Run health check
curl http://localhost:5000/health
# → {"status":"CalPolice API running 🚀"}
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## 👤 Author

**Yahiya Mohammed**
- GitHub: [@codemeteorite](https://github.com/codemeteorite)
- LinkedIn: [yahiyamohd](https://www.linkedin.com/in/yahiyamohd/)
- Email: yahiya3059@gmail.com

---

<div align="center">

**⭐ Star this repo if you found it useful!**

*Built end-to-end with AI-assisted tools — Cursor, Claude, GitHub Copilot, Groq, and more.*

</div>
