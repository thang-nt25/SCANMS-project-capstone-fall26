import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  HttpException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { sanitizeAuditDetails } from './audit-safety';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method))
      return next.handle();
    const started = Date.now();
    const eventId = randomUUID();
    const action =
      `HTTP_${request.method}_${context.getClass().name}_${context.getHandler().name}`.slice(
        0,
        100,
      );
    const record = async (outcome: string, statusCode: number) => {
      await this.audit.recordAuditLog(
        request.user?.id || null,
        action,
        sanitizeAuditDetails({
          outcome,
          statusCode,
          durationMs: Date.now() - started,
          route:
            request.route?.path || String(request.path || '').split('?')[0],
          method: request.method,
          params: request.params,
          input: request.body,
          // Deliberately never persist cookies, raw headers, file bytes or responses.
        }),
        request.ip,
        eventId,
      );
    };
    return next.handle().pipe(
      mergeMap(async (result) => {
        await record('SUCCESS', http.getResponse().statusCode);
        return result;
      }),
      catchError((cause) =>
        from(
          record(
            'FAILED',
            cause instanceof HttpException ? cause.getStatus() : 500,
          ),
        ).pipe(mergeMap(() => throwError(() => cause))),
      ),
    );
  }
}
