# ESP32-CAM Setup Guide

## Board Selection

- Tools → Board → ESP32 Arduino → **AI Thinker ESP32-CAM**
- Partition Scheme: **Huge APP (3MB No OTA/1MB SPIFFS)**

## FTDI Programmer Wiring

The AI Thinker ESP32-CAM has **no USB port**. Use an FTDI adapter (FT232RL or similar).

```
FTDI Adapter    →    ESP32-CAM
─────────────────────────────
VCC (5V)        →    5V
GND             →    GND
TX              →    U0R (GPIO3)
RX              →    U0T (GPIO1)
```

**For Programming Mode**:
```
IO0 (GPIO0)     →    GND  ← Connect this for upload
```

**After upload** — Remove the IO0-GND wire, then press RST button.

## Configuration

Edit `esp32-cam/smart_farm_cam.ino`:
```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

## Upload Steps

1. Connect IO0 to GND
2. Power on the ESP32-CAM (connect FTDI to USB)
3. Upload sketch
4. Disconnect IO0 from GND
5. Press the RST button on ESP32-CAM

## Verification

Serial Monitor should show:
```
AI Smart Farm — ESP32-CAM AI Thinker
Camera initialized successfully
Connected! IP: 192.168.150.102
Camera endpoint: http://192.168.150.102/capture
```

Test capture:
```
# Open in browser:
http://192.168.150.102/capture
```

Should display a live JPEG image.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera init failed | Check 5V power — CAM needs more current than 3.3V |
| Upload fails | Verify IO0 is connected to GND during upload |
| Black image | Check PSRAM — format: `if (psramFound())` in code |
| Brownout reset | Use a better 5V power supply (500mA minimum) |
