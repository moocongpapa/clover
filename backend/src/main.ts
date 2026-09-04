import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Increase payload limit for base64 image and media uploads (default is 100kb)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.set('trust proxy', 1);
  app.enableShutdownHooks();
  app.use(compression());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow inline scripts for React SPA
      crossOriginEmbedderPolicy: false, // Allow embedding images from external CDNs
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const frontendUrl = config.get<string>(
    'FRONTEND_URL',
    'https://clover-gilt.vercel.app,http://localhost:5174',
  );
  const allowedOrigins = frontendUrl.split(',').map((o) => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      try {
        const hostname = new URL(origin).hostname;
        const isAllowed =
          allowedOrigins.includes(origin) ||
          (hostname.endsWith('.vercel.app') && hostname.includes('clover')) ||
          hostname === 'localhost' ||
          /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
            origin,
          );
        callback(null, isAllowed);
      } catch {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
