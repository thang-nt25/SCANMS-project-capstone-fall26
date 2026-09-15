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
      configService?.get<string>('DB_POOL_MAX') || process.env.DB_POOL_MAX || 5,
    );
    // Tối ưu pool để hỗ trợ các batch transaction song song ($transaction) mà không bị nghẽn
    const poolMax = Number.isFinite(configuredPoolMax)
      ? Math.min(10, Math.max(2, Math.trunc(configuredPoolMax)))
      : 5;
    const pool = new Pool({
      connectionString,
      max: poolMax,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
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
