# ESP32 Setup Guide

## Arduino IDE Setup

1. **Install Arduino IDE** from https://www.arduino.cc/en/software

2. **Add ESP32 board manager**:
   - File → Preferences
   - Additional Boards Manager URLs:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Tools → Board → Board Manager → search "esp32" → Install **ESP32 by Espressif Systems**

3. **Select Board**:
   - Tools → Board → ESP32 Arduino → **ESP32 Dev Module**

4. **Select Port**: Tools → Port → your ESP32 COM port

## Required Libraries

Install via **Tools → Manage Libraries**:

| Library | Author |
|---------|--------|
| DHT sensor library | Adafruit |
| Adafruit Unified Sensor | Adafruit |
| Adafruit SSD1306 | Adafruit |
| Adafruit GFX Library | Adafruit |
| ArduinoJson | Benoit Blanchon |

## Configuration

1. Open `esp32/smart_farm_esp32.ino`
2. Edit WiFi credentials:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
3. If your router subnet is different, update the static IP:
   ```cpp
   IPAddress STATIC_IP(192, 168, 150, 103);
   IPAddress GATEWAY(192, 168, 150, 1);
   ```
4. Calibrate soil sensors (see HARDWARE.md)

## Upload

1. Connect ESP32 to PC via USB
2. Select COM port
3. Click Upload (→ button)
4. Open Serial Monitor (115200 baud) to verify

## Verification

Serial Monitor should show:
```
AI Smart Farming Assistant — ESP32
WiFi connected! IP: 192.168.150.103
HTTP server started on port 80
```

Test API:
```
curl http://192.168.150.103/data
```

Expected response:
```json
{
  "soil1": 45.2,
  "soil2": 48.1,
  "soilAverage": 46.6,
  "temperature": 28.5,
  "humidity": 65.0,
  "light": 345,
  "waterLevel": 78.0,
  "pump": false,
  "mode": "AUTO"
}
```
