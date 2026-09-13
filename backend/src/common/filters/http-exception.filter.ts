import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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

    const details: unknown =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as Record<string, unknown>).message
        : exceptionResponse;
    const validationErrors = Array.isArray(details)
      ? details.filter((value): value is string => typeof value === 'string')
      : undefined;
    const message =
      status >= 500
        ? 'Internal server error'
        : validationErrors?.[0] ||
          (typeof details === 'string' ? details : undefined) ||
          (exception instanceof Error ? exception.message : 'Request failed');

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(status < 500 && validationErrors ? { errors: validationErrors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
