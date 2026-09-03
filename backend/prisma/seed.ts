// ============================================================
// DATABASE SEED SCRIPT
// Seeds: 2 devices (ESP32 main + ESP32-CAM), default settings
// ============================================================

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Upsert ESP32 Main Device ──────────────────────────────
  const esp32 = await prisma.device.upsert({
    where: { ipAddress: '192.168.150.103' },
    update: {},
    create: {
      name: 'ESP32 Main Controller',
      ipAddress: '192.168.150.103',
      type: 'ESP32_MAIN',
    },
  });
  console.log(`✅ Device: ${esp32.name} (${esp32.ipAddress})`);

  // ── Upsert ESP32-CAM Device ───────────────────────────────
  const cam = await prisma.device.upsert({
    where: { ipAddress: '192.168.150.102' },
    update: {},
    create: {
      name: 'ESP32-CAM AI Thinker',
      ipAddress: '192.168.150.102',
      type: 'ESP32_CAM',
    },
  });
  console.log(`✅ Device: ${cam.name} (${cam.ipAddress})`);

  // ── Default System Settings ───────────────────────────────
  const settings = [
    { key: 'soil_pump_on_threshold', value: '30' },
    { key: 'soil_pump_off_threshold', value: '60' },
    { key: 'water_level_min_safe', value: '20' },
    { key: 'water_level_critical', value: '10' },
    { key: 'temp_warning', value: '30' },
    { key: 'temp_high', value: '35' },
    { key: 'humidity_low', value: '40' },
    { key: 'humidity_high', value: '70' },
    { key: 'ldr_dark', value: '200' },
    { key: 'ldr_bright', value: '700' },
    { key: 'history_interval_ms', value: '30000' },
    { key: 'default_language', value: 'en' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✅ ${settings.length} default system settings seeded`);

  // ── Sample Sensor Readings (demo data) ───────────────────
  const now = new Date();
  const sampleReadings = Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(now.getTime() - i * 30000),
    soil1: Math.round(30 + Math.random() * 50),
    soil2: Math.round(25 + Math.random() * 55),
    soilAverage: Math.round(27 + Math.random() * 50),
    temperature: parseFloat((24 + Math.random() * 15).toFixed(1)),
    humidity: parseFloat((40 + Math.random() * 40).toFixed(1)),
    light: Math.round(100 + Math.random() * 900),
    waterLevel: Math.round(40 + Math.random() * 60),
    pumpState: Math.random() > 0.7,
    mode: 'AUTO',
    deviceId: esp32.id,
  }));

  await prisma.sensorReading.createMany({ data: sampleReadings });
  console.log(`✅ ${sampleReadings.length} sample sensor readings seeded`);

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
