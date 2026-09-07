import { Injectable } from '@nestjs/common';
import { PrismaService } from './core/database/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'InfluxNet / SCANMS Core Backend API is running!';
  }

  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'UP',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'DEGRADED',
        database: 'DISCONNECTED',
        error: error?.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
