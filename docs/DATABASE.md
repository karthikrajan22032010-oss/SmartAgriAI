# Database Setup Guide

## PostgreSQL Installation

### Windows
1. Download from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the `postgres` user password

### Verify installation:
```bash
psql -U postgres -c "SELECT version();"
```

## Create Database

```sql
psql -U postgres
CREATE DATABASE smartfarm;
\q
```

## Configure Backend

Edit `backend/.env`:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/smartfarm
```

## Run Migrations

```bash
cd backend
npm install
npx prisma migrate dev --name init
```

## Seed Database

```bash
npx prisma db seed
# OR
ts-node prisma/seed.ts
```

This creates:
- 2 devices (ESP32 + ESP32-CAM)
- Default system settings
- 20 sample sensor readings

## Prisma Studio (optional)

```bash
npx prisma studio
# Opens at http://localhost:5555
```

## Schema Overview

| Table | Purpose |
|-------|---------|
| Device | Registered ESP32 devices |
| SensorReading | Historical sensor data (30s intervals) |
| PumpEvent | Pump ON/OFF log with reason |
| Alert | System alerts and warnings |
| AIRecommendation | AI advice history |
| SystemSetting | Configurable thresholds |
| User | Authentication (future) |

## Without PostgreSQL

Set `DEMO_MODE=true` in `backend/.env`.
The backend will:
- Use simulated sensor data
- Store alerts in memory only
- Not record history

The dashboard will still be fully functional.
