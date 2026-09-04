import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseData = exception.getResponse();
      message =
        typeof responseData === 'string'
          ? responseData
          : (responseData as any).message || exception.message;
      code = (responseData as any).error || 'HTTP_EXCEPTION';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = '데이터가 이미 존재합니다.';
          code = 'PRISMA_CONFLICT';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = '요청한 리소스를 찾을 수 없습니다.';
          code = 'PRISMA_NOT_FOUND';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = '잘못된 참조 데이터입니다.';
          code = 'PRISMA_BAD_REQUEST';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = '데이터베이스 오류가 발생했습니다.';
          code = 'PRISMA_ERROR';
          break;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
