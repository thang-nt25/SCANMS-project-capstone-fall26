import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    if (!(exception instanceof HttpException)) {
      const errStack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.url}`, errStack);
    }

    const details: unknown =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as Record<string, unknown>).message
        : exceptionResponse;
    const validationErrors = Array.isArray(details)
      ? details.filter((value): value is string => typeof value === 'string')
      : undefined;

    const message =
      status >= 500
        ? request.url.includes('/public/products/')
          ? 'LANDING_DATA_UNAVAILABLE'
          : 'Internal server error'
        : validationErrors?.[0] ||
          (typeof details === 'string' ? details : undefined) ||
          (exception instanceof Error ? exception.message : 'Request failed');

    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request.headers['request-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    response.status(status).json({
      success: false,
      statusCode: status,
      requestId,
      message,
      ...(status < 500 && validationErrors ? { errors: validationErrors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
