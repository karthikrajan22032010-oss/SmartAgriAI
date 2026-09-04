// ============================================================
// AI SMART FARMING ASSISTANT — ESP32 MAIN CONTROLLER
// Hardware: ESP32 DevKit V1
//
// LIBRARIES REQUIRED (install via Arduino Library Manager):
//   - DHT sensor library by Adafruit
//   - Adafruit Unified Sensor
//   - Adafruit SSD1306
//   - Adafruit GFX Library
//   - ArduinoJson by Benoit Blanchon (version 6.x)
// ============================================================

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

// ============================================================
// 1. WIFI CONFIGURATION
// ============================================================
const char* WIFI_SSID     = "Hacker hidden  Network1";
const char* WIFI_PASSWORD = "smkr2010";

// CLOUD SERVER INGESTION (Pushes live sensor readings to your website)
// Default Render Cloud URL:
const char* CLOUD_SERVER_URL = "https://smartagriai.onrender.com/api/sensors/data";
// If running backend locally on your PC, you can use:
// const char* CLOUD_SERVER_URL = "http://192.168.100.58:3001/api/sensors/data";

// OPTIONAL: Static IP Configuration (Leave commented for automatic DHCP)
// IPAddress STATIC_IP(192, 168, 100, 58);
// IPAddress GATEWAY(192, 168, 100, 1);
// IPAddress SUBNET(255, 255, 255, 0);
// IPAddress DNS1(8, 8, 8, 8);

// ============================================================
// 2. PIN CONFIGURATION
// ============================================================
#define SOIL1_PIN       34    // Capacitive soil moisture sensor 1 (ADC)
#define SOIL2_PIN       35    // Capacitive soil moisture sensor 2 (ADC)
#define DHT_PIN          4    // DHT22 / DHT11 data pin
#define LDR_PIN         32    // LDR analog light sensor (ADC)
#define WATER_PIN       33    // Water level sensor (ADC)
#define RELAY_PIN       26    // Water Pump Relay (Active LOW)
#define BTN1_PIN        25    // Button 1 — manual pump toggle
#define BTN2_PIN        27    // Button 2 — AUTO / MANUAL mode toggle
#define LED1_PIN        13    // LED 1 — System status (Green)
#define LED2_PIN        14    // LED 2 — Dry soil alert (Red)
#define LED3_PIN        16    // LED 3 — Pump running (Blue/Yellow)
#define BUZZER_PIN      17    // Buzzer

// OLED Display I2C pins
#define OLED_SDA        21
#define OLED_SCL        22

// ============================================================
// 3. CALIBRATION CONSTANTS
// ============================================================
const int SOIL1_DRY = 3400;   // ADC in dry air
const int SOIL1_WET = 1200;   // ADC fully in water
const int SOIL2_DRY = 3400;
const int SOIL2_WET = 1200;

const int WATER_MIN_ADC = 500;   // Empty tank
const int WATER_MAX_ADC = 3000;  // Full tank

// Irrigation Thresholds
const float SOIL_PUMP_ON_THRESHOLD  = 30.0;  // Turn pump ON below 30%
const float SOIL_PUMP_OFF_THRESHOLD = 60.0;  // Turn pump OFF above 60%
const float WATER_LEVEL_MIN_SAFE    = 20.0;  // Minimum safe tank water level (%)

// ============================================================
// 4. GLOBAL STATE & OBJECTS
// ============================================================
DHT dht(DHT_PIN, DHT22);

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

WebServer server(80);

// Sensor values
float soil1Pct      = 0;
float soil2Pct      = 0;
float soilAvg       = 0;
float temperature   = 0;
float humidity      = 0;
float waterPct      = 0;
int   lightRaw      = 0;

// Sensor error flags
bool soil1Error = false;
bool soil2Error = false;
bool dhtError   = false;

// Control state
bool pumpState   = false;
bool isAutoMode  = true;

// OLED state
int  oledScreen     = 0;
unsigned long lastOledSwitch = 0;

// Button debounce
unsigned long btn1LastPress = 0;
unsigned long btn2LastPress = 0;
const unsigned long DEBOUNCE_MS = 300;

// ============================================================
// SENSOR CONVERSION HELPERS
// ============================================================
float adcToSoilPercent(int raw, int dry, int wet) {
  if (raw < 100 || raw > 4095) return -1; // Disconnected or error
  raw = constrain(raw, min(dry, wet), max(dry, wet));
  float pct = map(raw, dry, wet, 0, 100);
  return constrain(pct, 0.0, 100.0);
}

float adcToWaterPercent(int raw) {
  if (raw < 100) return 0;
  raw = constrain(raw, WATER_MIN_ADC, WATER_MAX_ADC);
  float pct = map(raw, WATER_MIN_ADC, WATER_MAX_ADC, 0, 100);
  return constrain(pct, 0.0, 100.0);
}

void readSensors() {
  // 1. Soil Sensors
  int s1Raw = analogRead(SOIL1_PIN);
  int s2Raw = analogRead(SOIL2_PIN);

  float s1 = adcToSoilPercent(s1Raw, SOIL1_DRY, SOIL1_WET);
  float s2 = adcToSoilPercent(s2Raw, SOIL2_DRY, SOIL2_WET);

  soil1Error = (s1 < 0);
  soil2Error = (s2 < 0);

  soil1Pct = soil1Error ? 0 : s1;
  soil2Pct = soil2Error ? 0 : s2;

  if (!soil1Error && !soil2Error) {
    soilAvg = (soil1Pct + soil2Pct) / 2.0;
  } else if (!soil1Error) {
    soilAvg = soil1Pct;
  } else if (!soil2Error) {
    soilAvg = soil2Pct;
  } else {
    soilAvg = -1;
  }

  // 2. DHT22
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h) || t < -40 || t > 80 || h < 0 || h > 100) {
    dhtError = true;
  } else {
    dhtError = false;
    temperature = t;
    humidity = h;
  }

  // 3. LDR Light Sensor
  lightRaw = analogRead(LDR_PIN);

  // 4. Water Level Sensor
  int wRaw = analogRead(WATER_PIN);
  waterPct = adcToWaterPercent(wRaw);
}

// Automatic Irrigation Logic
void runAutoIrrigation() {
  if (!isAutoMode) return;

  // Water tank empty protection
  if (waterPct < WATER_LEVEL_MIN_SAFE) {
    if (pumpState) {
      pumpState = false;
      digitalWrite(RELAY_PIN, HIGH); // Relay OFF (active-LOW)
      Serial.println("AUTO: Water tank low — pump stopped");
    }
    return;
  }

  if (soilAvg < 0) return; // Sensor error

  // Soil dry -> Turn pump ON
  if (soilAvg < SOIL_PUMP_ON_THRESHOLD && !pumpState) {
    pumpState = true;
    digitalWrite(RELAY_PIN, LOW); // Relay ON (active-LOW)
    Serial.printf("AUTO: Soil %.1f%% < %.1f%% → Pump ON\n", soilAvg, SOIL_PUMP_ON_THRESHOLD);
  }

  // Soil wet enough -> Turn pump OFF
  if (soilAvg >= SOIL_PUMP_OFF_THRESHOLD && pumpState) {
    pumpState = false;
    digitalWrite(RELAY_PIN, HIGH);
    Serial.printf("AUTO: Soil %.1f%% >= %.1f%% → Pump OFF\n", soilAvg, SOIL_PUMP_OFF_THRESHOLD);
  }
}

void updateLEDs() {
  bool systemOk = !soil1Error || !soil2Error;
  digitalWrite(LED1_PIN, systemOk ? HIGH : LOW);

  bool dryWarn = (!soil1Error || !soil2Error) && soilAvg >= 0 && soilAvg < SOIL_PUMP_ON_THRESHOLD;
  digitalWrite(LED2_PIN, dryWarn ? HIGH : LOW);

  digitalWrite(LED3_PIN, pumpState ? HIGH : LOW);
}

void updateBuzzer() {
  bool waterCritical = waterPct < 10.0;
  bool soilExtremeDry = soilAvg >= 0 && soilAvg < 15.0;

  static unsigned long lastBeep = 0;
  unsigned long now = millis();

  if ((waterCritical || soilExtremeDry) && now - lastBeep > 5000) {
    lastBeep = now;
    tone(BUZZER_PIN, 1000, 200);
  }
}

void updateOLED() {
  oled.clearDisplay();
  oled.setTextColor(WHITE);

  if (oledScreen == 0) {
    // Screen 1: Soil, Temp, Humid, Pump
    oled.setTextSize(1);
    oled.setCursor(0, 0);
    oled.print("SMART AGRI AI");
    oled.drawLine(0, 9, 128, 9, WHITE);

    oled.setCursor(0, 13);
    if (soilAvg >= 0) {
      oled.printf("Soil Avg: %.0f%%", soilAvg);
    } else {
      oled.print("Soil: Sensor Error");
    }

    oled.setCursor(0, 25);
    if (!dhtError) {
      oled.printf("Temp: %.1fC  Hum: %.0f%%", temperature, humidity);
    } else {
      oled.print("DHT22: Reading...");
    }

    oled.setCursor(0, 37);
    oled.printf("Water Tank: %.0f%%", waterPct);

    oled.setCursor(0, 50);
    oled.printf("Pump: %s | %s", pumpState ? "ON" : "OFF", isAutoMode ? "AUTO" : "MAN");
  } else {
    // Screen 2: Network & IP Status
    oled.setTextSize(1);
    oled.setCursor(0, 0);
    oled.print("NETWORK STATUS");
    oled.drawLine(0, 9, 128, 9, WHITE);

    oled.setCursor(0, 14);
    oled.printf("WiFi: %s", WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");

    oled.setCursor(0, 26);
    oled.printf("IP: %s", WiFi.localIP().toString().c_str());

    oled.setCursor(0, 38);
    oled.printf("Light ADC: %d", lightRaw);

    oled.setCursor(0, 50);
    oled.print("Cloud Sync: Active");
  }

  oled.display();
}

// ============================================================
// CLOUD TELEMETRY INGESTION (PUSH TO RENDER WEBSITE)
// ============================================================
void sendSensorDataToCloud() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!CLOUD_SERVER_URL || strlen(CLOUD_SERVER_URL) == 0) return;

  WiFiClientSecure client;
  client.setInsecure(); // Allows secure HTTPS connection to Render without bundle certs
  HTTPClient http;

  if (http.begin(client, CLOUD_SERVER_URL)) {
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1500);

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

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    int httpResponseCode = http.POST(jsonPayload);
    if (httpResponseCode == 200) {
      String resp = http.getString();
      DynamicJsonDocument respDoc(512);
      DeserializationError err = deserializeJson(respDoc, resp);
      if (!err && respDoc.containsKey("command") && !respDoc["command"].isNull()) {
        JsonObject cmd = respDoc["command"];
        if (cmd.containsKey("pump") && !cmd["pump"].isNull()) {
          bool targetPump = cmd["pump"];
          if (targetPump != pumpState) {
            pumpState = targetPump;
            digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
            Serial.printf("⚡ Instant Cloud Command: Pump → %s\n", pumpState ? "ON" : "OFF");
          }
        }
        if (cmd.containsKey("mode") && !cmd["mode"].isNull()) {
          const char* m = cmd["mode"];
          if (strcmp(m, "AUTO") == 0) isAutoMode = true;
          else if (strcmp(m, "MANUAL") == 0) isAutoMode = false;
          Serial.printf("⚡ Instant Cloud Command: Mode → %s\n", m);
        }
      }
    }
    http.end();
  }
}

// ============================================================
// LOCAL HTTP API HANDLERS (PORT 80)
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
}

void handlePumpOn() {
  if (waterPct < WATER_LEVEL_MIN_SAFE) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Water level too low\"}");
    return;
  }
  pumpState = true;
  isAutoMode = false;
  digitalWrite(RELAY_PIN, LOW);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"pump\":true}");
}

void handlePumpOff() {
  pumpState = false;
  digitalWrite(RELAY_PIN, HIGH);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"pump\":false}");
}

void handleModeAuto() {
  isAutoMode = true;
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"mode\":\"AUTO\"}");
}

void handleModeManual() {
  isAutoMode = false;
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"mode\":\"MANUAL\"}");
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  AI Smart Farming Assistant — ESP32");
  Serial.println("========================================");

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BTN1_PIN, INPUT_PULLUP);
  pinMode(BTN2_PIN, INPUT_PULLUP);

  digitalWrite(RELAY_PIN, HIGH); // Pump OFF
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  dht.begin();

  Wire.begin(OLED_SDA, OLED_SCL);
  if (oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    oled.clearDisplay();
    oled.setTextColor(WHITE);
    oled.setTextSize(1);
    oled.setCursor(10, 20);
    oled.println("Connecting WiFi...");
    oled.display();
  }

  // WiFi Connection (Automatic DHCP)
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi connected! Local IP: http://%s\n", WiFi.localIP().toString().c_str());
    Serial.printf("API endpoint: http://%s/data\n", WiFi.localIP().toString().c_str());
    tone(BUZZER_PIN, 1000, 200);
  } else {
    Serial.println("\n❌ WiFi connection failed. Running offline mode.");
  }

  // Local Web Server Routes
  server.on("/data",         HTTP_GET, handleData);
  server.on("/api/data",     HTTP_GET, handleData);
  server.on("/pump/on",      HTTP_GET, handlePumpOn);
  server.on("/pump/off",     HTTP_GET, handlePumpOff);
  server.on("/mode/auto",    HTTP_GET, handleModeAuto);
  server.on("/mode/manual",  HTTP_GET, handleModeManual);
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/plain", "AI Smart Farm ESP32 Controller Online");
  });

  server.begin();
  Serial.println("Local HTTP server listening on port 80");
}

// ============================================================
// MAIN LOOP
// ============================================================
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 1000; // Fast 1-second real-time telemetry & command sync

void loop() {
  server.handleClient();

  unsigned long now = millis();

  // 1. Periodic Sensor Read + Irrigation + Cloud Push
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    readSensors();
    runAutoIrrigation();
    updateLEDs();
    updateBuzzer();
    sendSensorDataToCloud(); // Telemetry sync to Render

    Serial.printf("[%lus] Soil1:%.1f%% Soil2:%.1f%% Avg:%.1f%% Temp:%.1fC Hum:%.1f%% Water:%.1f%% Light:%d Pump:%s\n",
      now / 1000, soil1Pct, soil2Pct, soilAvg, temperature, humidity, waterPct, lightRaw,
      pumpState ? "ON" : "OFF");
  }

  // 2. OLED Screen toggle every 3s
  if (now - lastOledSwitch >= 3000) {
    lastOledSwitch = now;
    oledScreen = (oledScreen + 1) % 2;
    updateOLED();
  }

  // 3. Button 1: Manual Pump Toggle
  if (digitalRead(BTN1_PIN) == LOW && now - btn1LastPress > DEBOUNCE_MS) {
    btn1LastPress = now;
    if (!isAutoMode) {
      pumpState = !pumpState;
      if (pumpState && waterPct < WATER_LEVEL_MIN_SAFE) {
        pumpState = false;
        Serial.println("BTN1: Pump blocked — water level low");
      } else {
        digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
        Serial.printf("BTN1: Pump → %s\n", pumpState ? "ON" : "OFF");
      }
    } else {
      Serial.println("BTN1: Switch to MANUAL mode first");
    }
  }

  // 4. Button 2: Mode Toggle
  if (digitalRead(BTN2_PIN) == LOW && now - btn2LastPress > DEBOUNCE_MS) {
    btn2LastPress = now;
    isAutoMode = !isAutoMode;
    if (!isAutoMode) {
      pumpState = false;
      digitalWrite(RELAY_PIN, HIGH);
    }
    Serial.printf("BTN2: Mode → %s\n", isAutoMode ? "AUTO" : "MANUAL");
  }

  // 5. WiFi Reconnect check
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (now - lastReconnect > 20000) {
      lastReconnect = now;
      Serial.println("WiFi disconnected — reconnecting...");
      WiFi.reconnect();
    }
  }
}
