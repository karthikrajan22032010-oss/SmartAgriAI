import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.systemSetting.upsert({
    where: { key: 'esp32_ip' },
    update: { value: '192.168.100.58' },
    create: { key: 'esp32_ip', value: '192.168.100.58' }
  });
  
  await prisma.systemSetting.upsert({
    where: { key: 'esp32_cam_ip' },
    update: { value: '192.168.100.94' },
    create: { key: 'esp32_cam_ip', value: '192.168.100.94' }
  });
  
  console.log('IPs updated in DB');
}

main().catch(console.error).finally(() => prisma.$disconnect());
