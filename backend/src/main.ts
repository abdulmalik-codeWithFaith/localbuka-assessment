import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties that are not in the DTO
      forbidNonWhitelisted: true, // reject requests that contain them
      transform: true, // turn query/body strings into the DTO's declared types
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173' });

  const port = Number(config.get<string>('PORT') ?? 3000);
  await app.listen(port);
}

await bootstrap();
