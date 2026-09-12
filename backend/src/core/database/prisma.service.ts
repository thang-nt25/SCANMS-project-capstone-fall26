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

    // Tuần tự hóa các truy vấn đồng thời trên cùng một connection client (loại bỏ DeprecationWarning và tương thích pg@9.0)
    pool.on('connect', (client: any) => {
      if (client.__querySerialized) return;
      client.__querySerialized = true;
      const originalQuery = client.query;
      let queryQueue: Promise<any> = Promise.resolve();

      client.query = function (this: any, ...args: any[]) {
        const lastArg = args[args.length - 1];
        if (typeof lastArg === 'function') {
          const cb = args.pop();
          const task = () =>
            new Promise<void>((resolve) => {
              originalQuery.call(this, ...args, (err: any, res: any) => {
                try {
                  cb(err, res);
                } finally {
                  resolve();
                }
              });
            });
          queryQueue = queryQueue.then(task, task);
          return;
        }

        const task = () => originalQuery.apply(this, args);
        const resultPromise = queryQueue.then(task, task);
        queryQueue = resultPromise.catch(() => {});
        return resultPromise;
      };
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
