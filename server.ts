import Server from './src/http/app';
import log from './src/logging/logger';
import apiGatewayConfig from './config/apiGatewayConfig';
import prisma from './src/database/model.module';

const bootstrap = async () => {
  const port = Number(apiGatewayConfig.port);
  // Jobs.start();
  const server = await Server();
  server.listen(port, () => {
    log.info(`${apiGatewayConfig.appName} is running on port ${port}`);
    prisma.onModuleInit();
  });
  const exitHandler = () => {
    if (server) {
      server.close(() => {
        log.error('Server closed');
        prisma.onModuleDestroy();
        process.exit(1);
      });
    } else {
      prisma.onModuleDestroy();
      process.exit(1);
    }
  };

  const unexpectedErrorHandler = (error: Error) => {
    log.error(error);
    exitHandler();
  };

  process.on('uncaughtException', (err) => {
    log.error(
      '[uncaughtException], Shutting down server now on uncaughtException ... ',
    );
    return unexpectedErrorHandler(err);
  });
  process.on('unhandledRejection', (err: Error) => {
    log.error('[unhandledRejection], Shutting down server now ... ');
    return unexpectedErrorHandler(err);
  });

  process.on('SIGTERM', () => {
    log.info('SIGTERM received');
    if (server) {
      server.close();
    }
  });
};

bootstrap();
