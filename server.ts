import app from './src/http/app';
import log from './src/logging/logger';
import config from './config/default';

const port: number = config.port || 8080;

const server = app.listen(port, () => {
  log.info(`App is running on port ${port}`);
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      log.error('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: any) => {
  log.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  log.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
