import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
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
      this.logger.error(
        `${request.method} ${request.url}`,
        exception?.stack || String(exception),
      );
    }

    const message =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? request.url.includes('/public/products/')
          ? 'LANDING_DATA_UNAVAILABLE'
          : 'INTERNAL_SERVER_ERROR'
        : exceptionResponse && typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message || 'Yêu cầu không hợp lệ'
          : exceptionResponse || 'Yêu cầu không hợp lệ';

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
