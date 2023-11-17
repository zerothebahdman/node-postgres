import { PrismaClient } from '@prisma/client';

class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

const init = new PrismaService();
export default init;
