import { PrismaClient } from '@prisma/client';
import log from '../logging/logger';
import apiGatewayConfig from '../../config/apiGatewayConfig';

class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit(): Promise<void> {
    log.info(`${apiGatewayConfig.appName} connected to database`);
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    log.info(`${apiGatewayConfig.appName} disconnected from database`);
    await this.$disconnect();
  }
}

const prisma = new PrismaService();
export default prisma;
