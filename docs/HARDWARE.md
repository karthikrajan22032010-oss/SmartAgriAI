# Hardware Setup Guide

## Components

| Component | Model | Quantity |
|-----------|-------|----------|
| Main Controller | ESP32 DevKit V1 | 1 |
| Camera | ESP32-CAM AI Thinker | 1 |
| Soil Sensor | Capacitive Soil Moisture | 2 |
| Temp/Humidity | DHT22 | 1 |
| Light Sensor | LDR Module | 1 |
| Water Level | Analog Water Level Sensor | 1 |
| Relay | 1-channel 5V Relay Module | 1 |
| Pump | DC Water Pump 5V/12V | 1 |
| LEDs | 5mm LED (any color) | 3 |
| Buzzer | Active/Passive Buzzer | 1 |
| Display | 0.96" I2C OLED SSD1306 | 1 |
| Buttons | Tactile Push Buttons | 2 |
| Storage | MicroSD card (on ESP32-CAM) | 1 |

---

## ESP32 DevKit V1 — Pin Wiring

```
Component          → ESP32 GPIO
───────────────────────────────
Soil Sensor 1      → GPIO 34 (ADC1_CH6)
Soil Sensor 2      → GPIO 35 (ADC1_CH7)
DHT22 DATA         → GPIO 4
LDR Analog         → GPIO 32 (ADC1_CH4)
Water Level Sensor → GPIO 33 (ADC1_CH5)
Relay IN           → GPIO 26
OLED SDA           → GPIO 21
OLED SCL           → GPIO 22
Push Button 1      → GPIO 25 + 10kΩ pullup to 3.3V
Push Button 2      → GPIO 27 + 10kΩ pullup to 3.3V
LED 1 (Status)     → GPIO 13 + 220Ω resistor
LED 2 (Dry Soil)   → GPIO 14 + 220Ω resistor
LED 3 (Pump Run)   → GPIO 16 + 220Ω resistor
Buzzer             → GPIO 17
```

## Power Supply

```
ESP32 DevKit V1:
  - USB 5V from PC or power bank
  - OR 5V to VIN pin

Relay/Pump (if using 12V pump):
  - Separate 12V power supply
  - Share GND with ESP32

Sensors: 3.3V from ESP32 3V3 pin
```

## Soil Sensor Calibration

```
1. Open Serial Monitor (115200 baud)
2. Read analogRead() value with sensor in dry air → SOIL1_DRY
3. Read analogRead() value with sensor fully submerged → SOIL1_WET
4. Update constants in smart_farm_esp32.ino:
   const int SOIL1_DRY = <your value>;
   const int SOIL1_WET = <your value>;
```

## LDR Calibration

```
1. Measure ADC value in complete darkness → LDR_DARK threshold
2. Measure ADC value in bright light → LDR_BRIGHT threshold
3. Update LDR_DARK and LDR_BRIGHT in smart_farm_esp32.ino
```

## Network Setup

```
Both ESP32 devices must be on the same WiFi network.
Set static IPs in your router (DHCP reservation) OR
configure static IP in the Arduino code.

ESP32 Main: 192.168.150.103
ESP32-CAM:  192.168.150.102
```
