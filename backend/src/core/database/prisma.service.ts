import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(@Optional() private readonly configService?: ConfigService) {
    const connectionString =
      configService?.get<string>('DATABASE_URL') || process.env.DATABASE_URL;
    const isRemote =
      connectionString?.includes('supabase') ||
      connectionString?.includes('pooler') ||
      connectionString?.includes('sslmode');
    const configuredPoolMax = Number(
      configService?.get<string>('DB_POOL_MAX') || process.env.DB_POOL_MAX || 2,
    );
    // Supabase session mode của dự án chỉ cho tối đa 15 client. Một Nest app chỉ
    // cần pool nhỏ; giới hạn này cũng tránh hot-reload chiếm hết connection.
    const poolMax = Number.isFinite(configuredPoolMax)
      ? Math.min(5, Math.max(1, Math.trunc(configuredPoolMax)))
      : 2;
    const pool = new Pool({
      connectionString,
      max: poolMax,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 10000,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {}
    try {
      await this.pool.end();
    } catch {}
  }
}
