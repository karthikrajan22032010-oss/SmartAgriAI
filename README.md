# 🌱 AI Smart Farming Assistant

A full-stack, production-quality smart agriculture web application integrating ESP32 hardware sensors, ESP32-CAM live feed, PostgreSQL database, Google Gemini AI recommendations, real-time multilingual dashboard (English / தமிழ் / हिन्दी), and automatic irrigation control.

---

## 🗂️ Project Structure

```
smart-farming-assistant/
├── frontend/          React + TypeScript + Vite (Dashboard UI)
├── backend/           Node.js + Express + TypeScript + Prisma
├── esp32/             Arduino sketch — main sensor controller
├── esp32-cam/         Arduino sketch — live camera feed
├── docs/              Full documentation
├── .env.example       Environment variable template
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone / Open the project

```bash
cd "d:\SMART AGRI AI"
```

### 2. Configure Environment

```bash
copy .env.example backend\.env
# Edit backend\.env with your database URL and AI API key
```

### 3. Backend Setup

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Backend runs at: **http://localhost:3001**

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs at: **http://localhost:5173**

---

## 🔌 Hardware IP Addresses

| Device      | IP Address        | Purpose            |
|-------------|-------------------|--------------------|
| ESP32 Main  | 192.168.150.103   | Sensors + Pump     |
| ESP32-CAM   | 192.168.150.102   | Live Camera Feed   |

---

## 📡 Key API Endpoints

| Method | Endpoint                  | Description               |
|--------|---------------------------|---------------------------|
| GET    | /api/health               | Server health check       |
| GET    | /api/sensors/current      | Latest sensor readings    |
| GET    | /api/readings/history     | Historical sensor data    |
| POST   | /api/pump/on              | Turn pump ON              |
| POST   | /api/pump/off             | Turn pump OFF             |
| POST   | /api/mode/auto            | Set AUTO mode             |
| POST   | /api/mode/manual          | Set MANUAL mode           |
| GET    | /api/alerts               | Get active alerts         |
| POST   | /api/ai/recommendation    | Get AI farming advice     |
| GET    | /api/camera/capture       | Proxy ESP32-CAM image     |

---

## 🌐 Supported Languages

- 🇬🇧 English
- 🇮🇳 தமிழ் (Tamil)
- 🇮🇳 हिन्दी (Hindi)

---

## 📚 Documentation

- [Hardware Setup](docs/HARDWARE.md)
- [ESP32 Setup](docs/ESP32_SETUP.md)
- [ESP32-CAM Setup](docs/ESP32_CAM_SETUP.md)
- [Database Setup](docs/DATABASE.md)
- [AI Configuration](docs/AI_SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## ⚠️ Safety Rules

1. **Pump never runs when water level is critically low**
2. **AI recommendations are advisory only — never bypasses safety logic**
3. **All API keys kept server-side only**
4. **CORS configured for production origins**

---

## 🛠️ Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18 + TypeScript + Vite + Recharts |
| Backend    | Node.js + Express + TypeScript          |
| Database   | PostgreSQL + Prisma ORM                 |
| AI         | Google Gemini 1.5 Flash                 |
| Hardware   | ESP32 DevKit V1 + ESP32-CAM AI-Thinker  |

---

*Built for educational and production use by smart agriculture students and developers.*
