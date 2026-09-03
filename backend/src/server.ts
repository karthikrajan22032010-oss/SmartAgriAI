// ============================================================
// SERVER ENTRY POINT
// ============================================================

import app from './app';
import { config } from './config';
import { startHistoryRecording } from './services/historyService';
import { logger } from './utils/logger';

const server = app.listen(config.port, () => {
  logger.info('════════════════════════════════════════════');
  logger.info('  🌱 AI Smart Farming Assistant Backend');
  logger.info(`  🚀 Running on http://localhost:${config.port}`);
  logger.info(`  🌍 Environment: ${config.nodeEnv}`);
  logger.info(`  📡 ESP32 IP:    ${config.esp32Ip}`);
  logger.info(`  📷 CAM IP:      ${config.esp32CamIp}`);
  logger.info(`  🤖 AI Model:    ${config.aiModel}`);
  logger.info(`  🧪 Demo Mode:   ${config.demoMode}`);
  logger.info('════════════════════════════════════════════');

  // Start periodic sensor history recording
  startHistoryRecording().catch((err) => {
    logger.error('Failed to start history recording', { error: err.message });
  });
});

// ── Graceful shutdown ────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

export default server;
