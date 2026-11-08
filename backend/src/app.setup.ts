import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

/**
 * Global pipes and filters. Shared by main.ts and the end-to-end tests so that
 * the tests exercise the app exactly as it runs in production.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties that are not in the DTO
      forbidNonWhitelisted: true, // reject requests that contain them
      transform: true, // turn query/body strings into the DTO's declared types
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}