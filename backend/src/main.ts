import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration - Development mode: Allow all localhost
  app.enableCors({
    origin: true, // Allow all origins during development
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Tito Metralleta Backend running on http://0.0.0.0:${port}`);
  console.log(`📚 API documentation: http://localhost:${port}/api`);
  console.log(`📱 Access from network: http://10.0.0.13:${port}/api`);
}

bootstrap();
