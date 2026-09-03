// ============================================================
// AI SMART FARMING ASSISTANT — ESP32 MAIN CONTROLLER
// Hardware: ESP32 DevKit V1
// IP: 192.168.150.103
//
// LIBRARIES REQUIRED (install via Arduino Library Manager):
//   - DHT sensor library by Adafruit
//   - Adafruit Unified Sensor
//   - Adafruit SSD1306
//   - Adafruit GFX Library
//   - ESPAsyncWebServer by lacamera (or me-no-dev)
//   - AsyncTCP by me-no-dev
// ============================================================

#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

// ============================================================
// WIFI CONFIGURATION
// ============================================================
const char* WIFI_SSID = "YOUR_WIFI_SSID";       // <-- CHANGE THIS
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // <-- CHANGE THIS

// Static IP Configuration
IPAddress STATIC_IP(192, 168, 150, 103);
IPAddress GATEWAY(192, 168, 150, 1);
IPAddress SUBNET(255, 255, 255, 0);
IPAddress DNS1(8, 8, 8, 8);

// ============================================================
// PIN CONFIGURATION
// ============================================================
#define SOIL1_PIN       34    // Capacitive soil sensor 1 (ADC)
#define SOIL2_PIN       35    // Capacitive soil sensor 2 (ADC)
#define DHT_PIN          4    // DHT22 data pin
#define LDR_PIN         32    // LDR analog (ADC)
#define WATER_PIN       33    // Water level sensor (ADC)
#define RELAY_PIN       26    // Relay (active LOW usually)
#define BTN1_PIN        25    // Button 1 — manual pump toggle
#define BTN2_PIN        27    // Button 2 — mode toggle
#define LED1_PIN        13    // LED 1 — system status
#define LED2_PIN        14    // LED 2 — dry soil warning
#define LED3_PIN        16    // LED 3 — pump running
#define BUZZER_PIN      17    // Buzzer

// OLED I2C pins
#define OLED_SDA        21
#define OLED_SCL        22

// ============================================================
// SENSOR CALIBRATION CONSTANTS
// HOW TO CALIBRATE:
//   1. Put sensor in DRY air — read the ADC value. Set as DRY constant.
//   2. Put sensor in water — read the ADC value. Set as WET constant.
//   Typical ADC range on ESP32: 0–4095 (12-bit)
//   Capacitive sensors usually: dry ~3400, wet ~1200 (inverted)
// ============================================================
const int SOIL1_DRY = 3400;   // ADC value when sensor is in dry air
const int SOIL1_WET = 1200;   // ADC value when sensor is fully in water

const int SOIL2_DRY = 3400;
const int SOIL2_WET = 1200;

// LDR thresholds (configurable for different LDR modules)
const int LDR_DARK   = 500;   // ADC below this = DARK
const int LDR_BRIGHT = 2500;  // ADC above this = BRIGHT

// Water level thresholds
const int WATER_MIN_ADC = 500;   // ADC = empty tank
const int WATER_MAX_ADC = 3000;  // ADC = full tank

// ============================================================
// IRRIGATION THRESHOLDS
// ============================================================
const float SOIL_PUMP_ON_THRESHOLD  = 30.0;  // % — turn pump ON below this
const float SOIL_PUMP_OFF_THRESHOLD = 60.0;  // % — turn pump OFF above this
const float WATER_LEVEL_MIN_SAFE    = 20.0;  // % — pump blocked below this

// ============================================================
// GLOBAL STATE
// ============================================================
DHT dht(DHT_PIN, DHT22);

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

WebServer server(80);

// Sensor readings
float soil1Pct      = 0;
float soil2Pct      = 0;
float soilAvg       = 0;
float temperature   = 0;
float humidity      = 0;
int   lightRaw      = 0;
float waterPct      = 0;

bool  pumpState     = false;
bool  isAutoMode    = true;
bool  soil1Error    = false;
bool  soil2Error    = false;
bool  dhtError      = false;

// Button debounce
unsigned long btn1LastPress = 0;
unsigned long btn2LastPress = 0;
const unsigned long DEBOUNCE_MS = 200;

// OLED screen alternation
unsigned long lastOledSwitch = 0;
int oledScreen = 0;

// Buzzer control
unsigned long lastBuzzerTime = 0;
bool buzzerActive = false;

// ============================================================
// FUNCTION: Convert raw ADC to soil moisture percentage
// ============================================================
float adcToSoilPercent(int raw, int dryVal, int wetVal) {
  if (raw <= 0 || raw > 4095) return -1; // Sensor error
  // Clamp
  raw = constrain(raw, wetVal, dryVal);
  // Map: high ADC = dry (0%), low ADC = wet (100%)
  float pct = (float)(dryVal - raw) / (float)(dryVal - wetVal) * 100.0;
  return constrain(pct, 0, 100);
}

// ============================================================
// FUNCTION: Convert water level ADC to percentage
// ============================================================
float adcToWaterPercent(int raw) {
  raw = constrain(raw, WATER_MIN_ADC, WATER_MAX_ADC);
  return (float)(raw - WATER_MIN_ADC) / (float)(WATER_MAX_ADC - WATER_MIN_ADC) * 100.0;
}

// ============================================================
// FUNCTION: Read all sensors
// ============================================================
void readSensors() {
  // ── Soil Sensor 1 ─────────────────────────────────────
  int s1Raw = analogRead(SOIL1_PIN);
  if (s1Raw <= 0 || s1Raw >= 4095) {
    soil1Error = true;
    soil1Pct = -1;
  } else {
    soil1Error = false;
    soil1Pct = adcToSoilPercent(s1Raw, SOIL1_DRY, SOIL1_WET);
  }

  // ── Soil Sensor 2 ─────────────────────────────────────
  int s2Raw = analogRead(SOIL2_PIN);
  if (s2Raw <= 0 || s2Raw >= 4095) {
    soil2Error = true;
    soil2Pct = -1;
  } else {
    soil2Error = false;
    soil2Pct = adcToSoilPercent(s2Raw, SOIL2_DRY, SOIL2_WET);
  }

  // ── Average soil ──────────────────────────────────────
  if (!soil1Error && !soil2Error) soilAvg = (soil1Pct + soil2Pct) / 2.0;
  else if (!soil1Error) soilAvg = soil1Pct;
  else if (!soil2Error) soilAvg = soil2Pct;
  else soilAvg = -1;

  // ── DHT22 ─────────────────────────────────────────────
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    dhtError = true;
    // Keep last known values — do not overwrite with NaN
  } else {
    dhtError = false;
    temperature = t;
    humidity = h;
  }

  // ── LDR ───────────────────────────────────────────────
  lightRaw = analogRead(LDR_PIN);

  // ── Water level ───────────────────────────────────────
  int wRaw = analogRead(WATER_PIN);
  waterPct = adcToWaterPercent(wRaw);
}

// ============================================================
// FUNCTION: Automatic irrigation logic (hysteresis)
// ============================================================
void runAutoIrrigation() {
  if (!isAutoMode) return;

  // SAFETY: water tank too low → pump OFF
  if (waterPct < WATER_LEVEL_MIN_SAFE) {
    if (pumpState) {
      pumpState = false;
      digitalWrite(RELAY_PIN, HIGH); // Relay OFF (HIGH = inactive for active-LOW relay)
      Serial.println("AUTO: Water low — pump forced OFF");
    }
    return;
  }

  if (soilAvg < 0) return; // Sensor error — don't change pump state

  // Pump ON condition
  if (soilAvg < SOIL_PUMP_ON_THRESHOLD && !pumpState) {
    pumpState = true;
    digitalWrite(RELAY_PIN, LOW); // Relay ON (active-LOW)
    Serial.printf("AUTO: Soil %.1f%% < %.1f%% → Pump ON\n", soilAvg, SOIL_PUMP_ON_THRESHOLD);
  }

  // Pump OFF condition
  if (soilAvg >= SOIL_PUMP_OFF_THRESHOLD && pumpState) {
    pumpState = false;
    digitalWrite(RELAY_PIN, HIGH);
    Serial.printf("AUTO: Soil %.1f%% >= %.1f%% → Pump OFF\n", soilAvg, SOIL_PUMP_OFF_THRESHOLD);
  }
}

// ============================================================
// FUNCTION: Update LEDs
// LED1 = system OK, LED2 = dry soil warning, LED3 = pump running
// ============================================================
void updateLEDs() {
  // LED1: System OK — on if sensors working
  bool systemOk = !soil1Error || !soil2Error;
  digitalWrite(LED1_PIN, systemOk ? HIGH : LOW);

  // LED2: Dry soil warning
  bool dryWarn = (!soil1Error || !soil2Error) && soilAvg >= 0 && soilAvg < SOIL_PUMP_ON_THRESHOLD;
  digitalWrite(LED2_PIN, dryWarn ? HIGH : LOW);

  // LED3: Pump running
  digitalWrite(LED3_PIN, pumpState ? HIGH : LOW);
}

// ============================================================
// FUNCTION: Buzzer control (timed, non-blocking)
// ============================================================
void updateBuzzer() {
  bool waterCritical = waterPct < 10.0;
  bool soilExtremeDry = soilAvg >= 0 && soilAvg < 15.0;
  bool tempHigh = temperature > 38.0;

  bool shouldBuzz = waterCritical || soilExtremeDry || tempHigh;

  if (shouldBuzz) {
    // Pattern: 3 short beeps every 5 seconds
    unsigned long now = millis();
    if (now - lastBuzzerTime > 5000) {
      lastBuzzerTime = now;
      // 3 beeps
      for (int i = 0; i < 3; i++) {
        tone(BUZZER_PIN, 1000, 150);
        delay(300);
      }
    }
  } else {
    noTone(BUZZER_PIN);
  }
}

// ============================================================
// FUNCTION: Update OLED display (alternating screens)
// ============================================================
void updateOLED() {
  oled.clearDisplay();
  oled.setTextColor(WHITE);

  if (oledScreen == 0) {
    // Screen 1: Title + Soil + Temp
    oled.setTextSize(1);
    oled.setCursor(20, 0);
    oled.println("SMART FARM");

    oled.drawLine(0, 10, 128, 10, WHITE);

    oled.setCursor(0, 14);
    if (soilAvg >= 0) {
      oled.printf("Soil: %.0f%%", soilAvg);
      if (soilAvg < SOIL_PUMP_ON_THRESHOLD) oled.print(" DRY");
    } else {
      oled.print("Soil: ERROR");
    }

    oled.setCursor(0, 26);
    if (!dhtError) {
      oled.printf("Temp: %.1fC", temperature);
    } else {
      oled.print("Temp: ERROR");
    }

    oled.setCursor(0, 38);
    if (!dhtError) {
      oled.printf("Humid: %.0f%%", humidity);
    }

    oled.setCursor(0, 50);
    oled.printf("Pump:%s %s", pumpState ? "ON " : "OFF", isAutoMode ? "AUTO" : "MAN");
  } else {
    // Screen 2: Water + Light + IP
    oled.setTextSize(1);
    oled.setCursor(20, 0);
    oled.println("SMART FARM");
    oled.drawLine(0, 10, 128, 10, WHITE);

    oled.setCursor(0, 14);
    oled.printf("Water: %.0f%%", waterPct);
    if (waterPct < WATER_LEVEL_MIN_SAFE) oled.print(" LOW!");

    oled.setCursor(0, 26);
    oled.printf("Light: %d", lightRaw);

    oled.setCursor(0, 38);
    oled.printf("Mode: %s", isAutoMode ? "AUTO" : "MANUAL");

    oled.setCursor(0, 50);
    oled.print(WiFi.localIP());
  }

  oled.display();
}

// ============================================================
// HTTP HANDLER: GET /data — JSON sensor data
// ============================================================
void handleData() {
  DynamicJsonDocument doc(512);

  doc["soil1"]       = soil1Error ? (JsonVariant)nullptr : soil1Pct;
  doc["soil2"]       = soil2Error ? (JsonVariant)nullptr : soil2Pct;
  doc["soilAverage"] = (soil1Error && soil2Error) ? (JsonVariant)nullptr : soilAvg;
  doc["temperature"] = dhtError ? (JsonVariant)nullptr : temperature;
  doc["humidity"]    = dhtError ? (JsonVariant)nullptr : humidity;
  doc["light"]       = lightRaw;
  doc["waterLevel"]  = waterPct;
  doc["pump"]        = pumpState;
  doc["mode"]        = isAutoMode ? "AUTO" : "MANUAL";

  String json;
  serializeJson(doc, json);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);

  Serial.printf("GET /data → soil:%.1f%% temp:%.1f°C humid:%.1f%% water:%.1f%% pump:%s\n",
    soilAvg, temperature, humidity, waterPct, pumpState ? "ON" : "OFF");
}

// ============================================================
// HTTP HANDLER: GET /pump/on
// ============================================================
void handlePumpOn() {
  if (waterPct < WATER_LEVEL_MIN_SAFE) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Water level too low\"}");
    return;
  }
  pumpState = true;
  isAutoMode = false; // Switch to manual when manually turned on
  digitalWrite(RELAY_PIN, LOW);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"pump\":true}");
  Serial.println("MANUAL: Pump ON via HTTP");
}

// ============================================================
// HTTP HANDLER: GET /pump/off
// ============================================================
void handlePumpOff() {
  pumpState = false;
  digitalWrite(RELAY_PIN, HIGH);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"pump\":false}");
  Serial.println("MANUAL: Pump OFF via HTTP");
}

// ============================================================
// HTTP HANDLER: GET /mode/auto
// ============================================================
void handleModeAuto() {
  isAutoMode = true;
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"mode\":\"AUTO\"}");
  Serial.println("Mode set to AUTO");
}

// ============================================================
// HTTP HANDLER: GET /mode/manual
// ============================================================
void handleModeManual() {
  isAutoMode = false;
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"mode\":\"MANUAL\"}");
  Serial.println("Mode set to MANUAL");
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  AI Smart Farming Assistant — ESP32");
  Serial.println("========================================");

  // ── Pin modes ────────────────────────────────────────
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BTN1_PIN, INPUT_PULLUP);
  pinMode(BTN2_PIN, INPUT_PULLUP);

  // Start with pump OFF
  digitalWrite(RELAY_PIN, HIGH);  // HIGH = relay OFF (active-LOW)
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  // ── ADC configuration ──────────────────────────────
  analogReadResolution(12);  // 12-bit = 0–4095
  analogSetAttenuation(ADC_11db); // 0–3.3V range

  // ── DHT22 ─────────────────────────────────────────
  dht.begin();
  Serial.println("DHT22 initialized on GPIO 4");

  // ── OLED ──────────────────────────────────────────
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED init failed — continuing without display");
  } else {
    oled.clearDisplay();
    oled.setTextColor(WHITE);
    oled.setTextSize(1);
    oled.setCursor(10, 20);
    oled.println("Connecting WiFi...");
    oled.display();
    Serial.println("OLED initialized");
  }

  // ── WiFi ──────────────────────────────────────────
  WiFi.config(STATIC_IP, GATEWAY, SUBNET, DNS1);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());

    oled.clearDisplay();
    oled.setCursor(0, 20);
    oled.printf("IP: %s", WiFi.localIP().toString().c_str());
    oled.display();
    delay(2000);

    // Startup buzzer beep
    tone(BUZZER_PIN, 1000, 200);
    delay(300);
    tone(BUZZER_PIN, 1500, 200);
  } else {
    Serial.println("\n❌ WiFi connection failed! Running without network.");
  }

  // ── HTTP Routes ───────────────────────────────────
  server.on("/data",         HTTP_GET, handleData);
  server.on("/pump/on",      HTTP_GET, handlePumpOn);
  server.on("/pump/off",     HTTP_GET, handlePumpOff);
  server.on("/mode/auto",    HTTP_GET, handleModeAuto);
  server.on("/mode/manual",  HTTP_GET, handleModeManual);

  // Root endpoint
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/plain", "AI Smart Farm ESP32 Controller\nEndpoints: /data /pump/on /pump/off /mode/auto /mode/manual");
  });

  server.begin();
  Serial.println("HTTP server started on port 80");
  Serial.printf("API: http://%s/data\n", WiFi.localIP().toString().c_str());
}

// ============================================================
// MAIN LOOP
// ============================================================
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 2000;

void loop() {
  server.handleClient();

  unsigned long now = millis();

  // ── Read sensors every 2 seconds ─────────────────
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    readSensors();
    runAutoIrrigation();
    updateLEDs();
    updateBuzzer();

    // Serial debug
    Serial.printf("[%lus] Soil1:%.1f%% Soil2:%.1f%% Avg:%.1f%% Temp:%.1f°C Humid:%.1f%% Water:%.1f%% Light:%d Pump:%s Mode:%s\n",
      now / 1000, soil1Pct, soil2Pct, soilAvg, temperature, humidity, waterPct, lightRaw,
      pumpState ? "ON" : "OFF", isAutoMode ? "AUTO" : "MAN");
  }

  // ── OLED alternates screens every 3 seconds ──────
  if (now - lastOledSwitch >= 3000) {
    lastOledSwitch = now;
    oledScreen = (oledScreen + 1) % 2;
    updateOLED();
  }

  // ── Button 1: Manual pump toggle ─────────────────
  if (digitalRead(BTN1_PIN) == LOW && now - btn1LastPress > DEBOUNCE_MS) {
    btn1LastPress = now;
    if (!isAutoMode) {
      pumpState = !pumpState;
      if (pumpState && waterPct < WATER_LEVEL_MIN_SAFE) {
        pumpState = false;
        Serial.println("BTN1: Pump blocked — water level too low");
      } else {
        digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
        Serial.printf("BTN1: Pump toggled → %s\n", pumpState ? "ON" : "OFF");
      }
    } else {
      Serial.println("BTN1: Switch to MANUAL mode first");
    }
  }

  // ── Button 2: AUTO/MANUAL mode toggle ────────────
  if (digitalRead(BTN2_PIN) == LOW && now - btn2LastPress > DEBOUNCE_MS) {
    btn2LastPress = now;
    isAutoMode = !isAutoMode;
    if (!isAutoMode) {
      // Switch to manual → turn pump off for safety
      pumpState = false;
      digitalWrite(RELAY_PIN, HIGH);
    }
    Serial.printf("BTN2: Mode → %s\n", isAutoMode ? "AUTO" : "MANUAL");
  }

  // ── WiFi reconnect ────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (now - lastReconnect > 30000) {
      lastReconnect = now;
      Serial.println("WiFi lost — reconnecting...");
      WiFi.reconnect();
    }
  }
}
