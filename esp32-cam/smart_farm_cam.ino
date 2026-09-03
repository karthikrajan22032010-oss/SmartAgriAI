// ============================================================
// AI SMART FARMING ASSISTANT — ESP32-CAM (AI Thinker)
// IP: 192.168.150.102
//
// BOARD: AI Thinker ESP32-CAM
// BOARD MANAGER: ESP32 by Espressif Systems
//
// SELECT BOARD: "AI Thinker ESP32-CAM"
// NO PROGRAMMER NEEDED — uses FTDI programmer
//
// IMPORTANT: AI Thinker ESP32-CAM does NOT have a built-in
// USB port. Connect via FTDI adapter:
//   FTDI VCC → 5V on camera
//   FTDI GND → GND
//   FTDI TX  → U0R (GPIO3)
//   FTDI RX  → U0T (GPIO1)
//   IO0 → GND (for programming mode)
//   Remove IO0-GND connection to run normally
// ============================================================

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"

// ============================================================
// WIFI CONFIGURATION
// ============================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // <-- CHANGE THIS
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";    // <-- CHANGE THIS

// Static IP
IPAddress STATIC_IP(192, 168, 150, 102);
IPAddress GATEWAY(192, 168, 150, 1);
IPAddress SUBNET(255, 255, 255, 0);
IPAddress DNS1(8, 8, 8, 8);

// ============================================================
// AI THINKER ESP32-CAM PIN MAP
// DO NOT MODIFY — these are fixed for the AI Thinker module
// ============================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

WebServer server(80);
bool cameraReady = false;

// ============================================================
// CAMERA INITIALIZATION
// ============================================================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Use PSRAM if available for higher resolution
  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;    // 640x480
    config.jpeg_quality = 10;               // 0–63, lower = better quality
    config.fb_count     = 2;
  } else {
    config.frame_size   = FRAMESIZE_QVGA;   // 320x240
    config.jpeg_quality = 12;
    config.fb_count     = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }

  // Optimize sensor settings
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_framesize(s, FRAMESIZE_VGA);
    s->set_quality(s, 10);
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_special_effect(s, 0);  // No effect
    s->set_whitebal(s, 1);        // Auto white balance
    s->set_awb_gain(s, 1);
    s->set_wb_mode(s, 0);
    s->set_exposure_ctrl(s, 1);   // Auto exposure
    s->set_aec2(s, 0);
    s->set_gain_ctrl(s, 1);       // Auto gain
    s->set_agc_gain(s, 0);
    s->set_gainceiling(s, (gainceiling_t)0);
    s->set_bpc(s, 0);
    s->set_wpc(s, 1);
    s->set_raw_gma(s, 1);
    s->set_lenc(s, 1);
    s->set_mirror_x(s, 0);
    s->set_mirror_y(s, 0);
    s->set_dcw(s, 1);
    s->set_colorbar(s, 0);
  }

  Serial.println("Camera initialized successfully");
  return true;
}

// ============================================================
// HTTP HANDLER: GET /capture — JPEG image capture
// ============================================================
void handleCapture() {
  if (!cameraReady) {
    server.send(503, "application/json", "{\"error\":\"Camera not initialized\"}");
    return;
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    server.send(503, "application/json", "{\"error\":\"Camera capture failed\"}");
    return;
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  server.sendHeader("Pragma", "no-cache");
  server.sendHeader("Expires", "0");
  server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);

  esp_camera_fb_return(fb);
  Serial.printf("Capture served: %zu bytes\n", fb->len);
}

// ============================================================
// HTTP HANDLER: GET / — Status
// ============================================================
void handleRoot() {
  String json = "{\"status\":\"online\",\"camera\":";
  json += cameraReady ? "true" : "false";
  json += ",\"ip\":\"192.168.150.102\",\"endpoints\":[\"/capture\"]}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// ============================================================
// HTTP HANDLER: GET /status
// ============================================================
void handleStatus() {
  String json = "{\"online\":true,\"camera\":";
  json += cameraReady ? "true" : "false";
  json += ",\"ip\":\"" + WiFi.localIP().toString() + "\",\"rssi\":" + WiFi.RSSI() + "}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// ============================================================
// HTTP HANDLER: GET /light/on
// ============================================================
void handleLightOn() {
  digitalWrite(4, HIGH);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"light\":true}");
}

// ============================================================
// HTTP HANDLER: GET /light/off
// ============================================================
void handleLightOff() {
  digitalWrite(4, LOW);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"light\":false}");
}

// ============================================================
// HTTP HANDLER: GET /resolution/high
// ============================================================
void handleResolutionHigh() {
  sensor_t *s = esp_camera_sensor_get();
  if(s) {
    s->set_framesize(s, FRAMESIZE_UXGA); // higher res
  }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"resolution\":\"high\"}");
}

// ============================================================
// HTTP HANDLER: GET /resolution/low
// ============================================================
void handleResolutionLow() {
  sensor_t *s = esp_camera_sensor_get();
  if(s) {
    s->set_framesize(s, FRAMESIZE_VGA); // normal res
  }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"resolution\":\"low\"}");
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  AI Smart Farm — ESP32-CAM AI Thinker");
  Serial.println("========================================");

  pinMode(4, OUTPUT);
  digitalWrite(4, LOW);

  // Initialize camera
  cameraReady = initCamera();
  if (!cameraReady) {
    Serial.println("⚠ Camera failed — will retry in loop");
  }

  // WiFi
  WiFi.config(STATIC_IP, GATEWAY, SUBNET, DNS1);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setSleep(false);  // Disable WiFi sleep for faster response

  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Camera endpoint: http://%s/capture\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n❌ WiFi connection failed");
  }

  // HTTP server
  server.on("/",        HTTP_GET, handleRoot);
  server.on("/capture", HTTP_GET, handleCapture);
  server.on("/status",  HTTP_GET, handleStatus);
  server.on("/light/on", HTTP_GET, handleLightOn);
  server.on("/light/off", HTTP_GET, handleLightOff);
  server.on("/resolution/high", HTTP_GET, handleResolutionHigh);
  server.on("/resolution/low", HTTP_GET, handleResolutionLow);
  server.begin();
  Serial.println("HTTP server started on port 80");
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  server.handleClient();

  // Retry camera init if it failed
  if (!cameraReady) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 10000) {
      lastRetry = millis();
      Serial.println("Retrying camera init...");
      cameraReady = initCamera();
    }
  }

  // WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (millis() - lastReconnect > 30000) {
      lastReconnect = millis();
      Serial.println("WiFi lost — reconnecting...");
      WiFi.reconnect();
    }
  }
}
