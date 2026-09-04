// ============================================================
// AI SMART FARMING ASSISTANT — ESP32-CAM (AI Thinker)
// IP: 192.168.100.94
//
// FEATURES:
//   - High-Speed MJPEG Live Stream (/stream)
//   - High-Resolution Snapshot Capture (/capture)
//   - Flashlight LED Control on GPIO 4 (/light/on, /light/off, /light/toggle)
//   - Multi-client non-blocking HTTP server (esp_http_server)
// ============================================================

#include <Arduino.h>
#include <WiFi.h>
#include "esp_camera.h"
#include "esp_http_server.h"

// ============================================================
// WIFI CONFIGURATION
// ============================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // <-- CHANGE TO YOUR WIFI SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // <-- CHANGE TO YOUR WIFI PASSWORD

// Static IP Configuration
IPAddress STATIC_IP(192, 168, 100, 94);
IPAddress GATEWAY(192, 168, 100, 1);
IPAddress SUBNET(255, 255, 255, 0);
IPAddress DNS1(8, 8, 8, 8);

// Flash LED pin on AI Thinker ESP32-CAM
#define FLASH_LED_PIN 4

// ============================================================
// AI THINKER ESP32-CAM PIN MAP
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

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;
bool lightState = false;

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

  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;   // 640x480
    config.jpeg_quality = 10;              // High quality
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
  } else {
    config.frame_size   = FRAMESIZE_QVGA;  // 320x240
    config.jpeg_quality = 12;
    config.fb_count     = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }

  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_whitebal(s, 1);
    s->set_awb_gain(s, 1);
    s->set_wb_mode(s, 0);
    s->set_exposure_ctrl(s, 1);
    s->set_gain_ctrl(s, 1);
  }

  Serial.println("✅ Camera initialized");
  return true;
}

// ============================================================
// HTTP STREAM HANDLER (/stream)
// ============================================================
static esp_err_t stream_handler(httpd_req_t* req) {
  camera_fb_t* fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t* _jpg_buf = NULL;
  char part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      res = ESP_FAIL;
    } else {
      _jpg_buf_len = fb->len;
      _jpg_buf = fb->buf;
    }

    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    if (res == ESP_OK) {
      size_t hlen = snprintf(part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char*)_jpg_buf, _jpg_buf_len);
    }

    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if (_jpg_buf) {
      free(_jpg_buf);
      _jpg_buf = NULL;
    }

    if (res != ESP_OK) {
      break;
    }
    delay(10);
  }

  return res;
}

// ============================================================
// HTTP CAPTURE HANDLER (/capture)
// ============================================================
static esp_err_t capture_handler(httpd_req_t* req) {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Cache-Control", "no-cache, no-store, must-revalidate");

  esp_err_t res = httpd_resp_send(req, (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

// ============================================================
// HTTP LIGHT CONTROL HANDLERS
// ============================================================
static esp_err_t light_on_handler(httpd_req_t* req) {
  lightState = true;
  digitalWrite(FLASH_LED_PIN, HIGH);
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, "{\"success\":true,\"light\":true}", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t light_off_handler(httpd_req_t* req) {
  lightState = false;
  digitalWrite(FLASH_LED_PIN, LOW);
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, "{\"success\":true,\"light\":false}", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t light_toggle_handler(httpd_req_t* req) {
  lightState = !lightState;
  digitalWrite(FLASH_LED_PIN, lightState ? HIGH : LOW);
  char resp[64];
  snprintf(resp, sizeof(resp), "{\"success\":true,\"light\":%s}", lightState ? "true" : "false");
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, resp, HTTPD_RESP_USE_STRLEN);
}

// ============================================================
// HTTP STATUS & ROOT HANDLERS
// ============================================================
static esp_err_t status_handler(httpd_req_t* req) {
  char json[128];
  snprintf(json, sizeof(json), "{\"online\":true,\"camera\":true,\"light\":%s,\"ip\":\"%s\"}",
    lightState ? "true" : "false", WiFi.localIP().toString().c_str());
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);
}

static esp_err_t root_handler(httpd_req_t* req) {
  const char* html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'><title>ESP32-CAM</title></head><body style='font-family:sans-serif;background:#111;color:#eee;text-align:center;padding:20px;'><h2>ESP32-CAM Live Stream</h2><img src='/stream' style='max-width:100%;border-radius:12px;'><br><br><a href='/light/toggle' style='color:#10b981;padding:8px 16px;border:1px solid #10b981;border-radius:8px;text-decoration:none;'>Toggle Flash Light</a></body></html>";
  httpd_resp_set_type(req, "text/html");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, html, HTTPD_RESP_USE_STRLEN);
}

// ============================================================
// START HTTP SERVERS
// ============================================================
void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.max_open_sockets = 7;
  config.lru_purge_enable = true;

  httpd_uri_t root_uri = { .uri = "/", .method = HTTP_GET, .handler = root_handler, .user_ctx = NULL };
  httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler, .user_ctx = NULL };
  httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler, .user_ctx = NULL };
  httpd_uri_t save_uri = { .uri = "/save", .method = HTTP_GET, .handler = capture_handler, .user_ctx = NULL };
  httpd_uri_t status_uri = { .uri = "/status", .method = HTTP_GET, .handler = status_handler, .user_ctx = NULL };
  httpd_uri_t light_on_uri = { .uri = "/light/on", .method = HTTP_GET, .handler = light_on_handler, .user_ctx = NULL };
  httpd_uri_t light_off_uri = { .uri = "/light/off", .method = HTTP_GET, .handler = light_off_handler, .user_ctx = NULL };
  httpd_uri_t light_toggle_uri = { .uri = "/light/toggle", .method = HTTP_GET, .handler = light_toggle_handler, .user_ctx = NULL };
  httpd_uri_t light_alias_uri = { .uri = "/light", .method = HTTP_GET, .handler = light_toggle_handler, .user_ctx = NULL };
  httpd_uri_t flash_uri = { .uri = "/flash", .method = HTTP_GET, .handler = light_toggle_handler, .user_ctx = NULL };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &root_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    httpd_register_uri_handler(camera_httpd, &capture_uri);
    httpd_register_uri_handler(camera_httpd, &save_uri);
    httpd_register_uri_handler(camera_httpd, &status_uri);
    httpd_register_uri_handler(camera_httpd, &light_on_uri);
    httpd_register_uri_handler(camera_httpd, &light_off_uri);
    httpd_register_uri_handler(camera_httpd, &light_toggle_uri);
    httpd_register_uri_handler(camera_httpd, &light_alias_uri);
    httpd_register_uri_handler(camera_httpd, &flash_uri);
    Serial.println("✅ Web server started on port 80");
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  AI Smart Farm — ESP32-CAM (AI Thinker)");
  Serial.println("========================================");

  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  if (!initCamera()) {
    Serial.println("❌ Camera init failed");
    return;
  }

  // WiFi
  WiFi.config(STATIC_IP, GATEWAY, SUBNET, DNS1);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setSleep(false);

  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi Connected! IP: http://%s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Stream URL:  http://%s/stream\n", WiFi.localIP().toString().c_str());
    Serial.printf("Capture URL: http://%s/capture\n", WiFi.localIP().toString().c_str());
    Serial.printf("Light ON:    http://%s/light/on\n", WiFi.localIP().toString().c_str());
    startCameraServer();
  } else {
    Serial.println("\n❌ WiFi connection failed");
  }
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  delay(1000);
}
