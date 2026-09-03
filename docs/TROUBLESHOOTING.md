# Troubleshooting Guide

## Dashboard Shows "DEMO DATA"

**Cause**: ESP32 is offline or not reachable.

**Fix**:
1. Check ESP32 is powered ON
2. Check ESP32 is connected to the same WiFi as your PC
3. Try pinging: `ping 192.168.100.58`
4. Open in browser: `http://192.168.100.58/data`
5. If not reachable, check IP config in `smart_farm_esp32.ino`

## Camera Shows "Offline"

**Cause**: ESP32-CAM not reachable at 192.168.100.94

**Fix**:
1. Try: `http://192.168.100.94/capture` in browser
2. Verify static IP in `smart_farm_cam.ino`
3. Check FTDI wiring (IO0 must be disconnected from GND after upload)
4. Power supply — CAM needs stable 5V

## Backend Not Starting

**Fix**:
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

Check `.env` file exists with correct DATABASE_URL.

## Database Connection Fails

**Fix**:
1. Is PostgreSQL running?
   ```bash
   pg_ctl status -D "C:\Program Files\PostgreSQL\16\data"
   # or
   services.msc → PostgreSQL service → Start
   ```
2. Check DATABASE_URL in `backend/.env`
3. Create database if not exists:
   ```sql
   psql -U postgres -c "CREATE DATABASE smartfarm;"
   ```

## DHT22 Reading NaN

**Cause**: Sensor wiring issue or wrong pin.

**Fix**:
1. Verify DHT22 DATA → GPIO 4
2. Add 10kΩ pull-up resistor between DATA and 3.3V
3. Check Serial Monitor for "Temp: ERROR"

## Pump Not Responding

**Cause**: Could be water level safety block.

**Fix**:
1. Check `waterLevel` in `/api/sensors/current` — must be > 20%
2. Verify relay wiring: GPIO 26 → IN on relay
3. Test: `curl http://192.168.150.103/pump/on`

## AI Returning English When Tamil Selected

**Cause**: AI API key not configured — using rule-based fallback.
The fallback does support all 3 languages. Check your AI panel for translations.

## CORS Error in Browser

**Fix**: Ensure backend `.env` includes your frontend origin:
```
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Common ESP32 Errors

| Error | Cause | Fix |
|-------|-------|-----|
| brownout detector triggered | Low power | Better USB cable / power supply |
| Guru Meditation Error | Crash | Check Serial Monitor, verify library versions |
| Camera init failed | Camera not connected | Check all camera ribbon connections |
