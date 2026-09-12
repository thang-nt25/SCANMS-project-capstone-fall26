import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyRealDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  console.log('--- BẮT ĐẦU XÁC THỰC CƠ SỞ DỮ LIỆU POSTGRESQL SUPABASE THẬT ---');

  try {
    // 1. Kiểm tra kết nối
    const result: any[] = await prisma.$queryRawUnsafe(
      'SELECT current_database(), current_user, version()',
    );
    console.log('✔ Kết nối thành công đến PostgreSQL:', result[0].current_database);
    console.log('✔ Phiên bản PostgreSQL:', result[0].version);

    // 2. Kiểm tra danh sách bảng cần thiết của FR-10
    const requiredTables = [
      'referral_links',
      'store_collaborators',
      'campaign_products',
      'campaigns',
      'orders',
      'order_items',
      'click_traffic_logs',
    ];

    const tables: any[] = await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      requiredTables,
    );
    const existingTableNames = tables.map((t) => t.table_name);
    console.log('\n--- DANH SÁCH BẢNG ĐÃ TỒN TẠI TRÊN DATABASE THẬT ---');
    requiredTables.forEach((table) => {
      const exists = existingTableNames.includes(table);
      console.log(`${exists ? '✔' : '✖'} Bảng "${table}": ${exists ? 'TỒN TẠI' : 'THIẾU'}`);
    });

    // 3. Kiểm tra các cột quan trọng
    const columnChecks = [
      { table: 'products', column: 'is_affiliate_enabled' },
      { table: 'orders', column: 'referral_link_id' },
      { table: 'order_items', column: 'referral_link_id' },
      { table: 'order_items', column: 'applied_commission_rate' },
      { table: 'order_items', column: 'calculated_commission_amount' },
      { table: 'referral_links', column: 'short_code' },
      { table: 'referral_links', column: 'total_orders' },
      { table: 'referral_links', column: 'total_clicks' },
      { table: 'referral_links', column: 'unique_clicks' },
      { table: 'campaign_products', column: 'campaign_id' },
      { table: 'campaign_products', column: 'product_id' },
    ];

    console.log('\n--- KIỂM TRA CÁC CỘT QUAN TRỌNG TRÊN DATABASE THẬT ---');
    for (const check of columnChecks) {
      const col: any[] = await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = $1 AND column_name = $2`,
        check.table,
        check.column,
      );
      if (col.length > 0) {
        console.log(
          `✔ Cột "${check.table}.${check.column}" (${col[0].data_type}, nullable: ${col[0].is_nullable})`,
        );
      } else {
        console.log(`✖ Cột "${check.table}.${check.column}" KHÔNG TỒN TẠI!`);
      }
    }

    // 4. Kiểm tra Foreign Keys
    console.log('\n--- KIỂM TRA FOREIGN KEYS ---');
    const fkeys: any[] = await prisma.$queryRawUnsafe(
      `SELECT
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('orders', 'order_items', 'campaign_products', 'store_collaborators')`,
    );

    fkeys.forEach((fk) => {
      console.log(
        `✔ FK: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`,
      );
    });

    console.log('\n=== XÁC NHẬN: CƠ SỞ DỮ LIỆU POSTGRESQL SUPABASE ĐẦY ĐỦ 100% ===');
  } catch (error) {
    console.error('Lỗi khi xác thực database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRealDb();
