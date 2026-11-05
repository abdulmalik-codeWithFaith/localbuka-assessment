import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorResponseBody {
  success: false;
  error: string | string[];
  statusCode: number;
  timestamp: string;
}

/**
 * Turns every thrown error into the same JSON shape:
 * { success: false, error, statusCode, timestamp }.
 * Unexpected errors are logged in full but never leaked to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      success: false,
      error: this.extractMessage(exception),
      statusCode,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private extractMessage(exception: unknown): string | string[] {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return payload;
    }

    // ValidationPipe errors arrive as { message: string[] }, others as { message: string }.
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const { message } = payload;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
        return message;
      }
    }

    return exception.message;
  }
}
