const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { Pool } = require('pg');

const products = [
  ['33333333-3333-4333-8333-333333333301', 'AB-CLEAN-OIL', '/assets/products/real/aura-cleansing-oil.jpg'],
  ['33333333-3333-4333-8333-333333333302', 'AB-CREAM-NIA', '/assets/products/real/niacinamide-night-cream.webp'],
  ['dfc570d9-b785-4ad1-8c09-9561723f1e0c', 'TEST-1789551790400', '/assets/products/real/hydro-boost-50g.jpg'],
  ['3e0164eb-7e62-417e-bb13-ee97d7b47803', 'E2E-762084', '/assets/products/real/centella-b5-serum.jpg'],
  ['44444444-4444-4444-8444-444444444402', 'GB-GRANOLA-500', '/assets/products/real/granola-500g.jpg'],
  ['44444444-4444-4444-8444-444444444401', 'GB-TEA-CHAMOMILE', '/assets/products/real/chamomile-tea-50g.webp'],
  ['55555555-5555-4555-8555-555555555501', 'LL-AMPOULE-PEP', '/assets/products/real/multi-peptide-ampoule.png'],
  ['11111111-1111-4111-8111-111111111102', 'SS-SUN-60ML', '/assets/products/real/spf50-oil-control.jpg'],
  ['f0c70846-296e-41c4-99d8-f13f0d1cb64b', 'SKIN-TQL7O', '/assets/products/real/hydro-boost-50g.jpg'],
  ['298e8cd8-4f93-4f83-b793-4256b269b47f', 'BODY-2RGHI', '/assets/products/real/centella-b5-serum.jpg'],
  ['11111111-1111-4111-8111-111111111101', 'SS-B5-50ML', '/assets/products/real/one-thing-centella-b5.jpg'],
  ['49696121-4fa4-4507-90c2-e733472407b5', 'SR-VTC-15', '/assets/products/real/vitamin-c-15-serum.jpg'],
  ['11111111-1111-4111-8111-111111111103', 'SS-CLEAN-150', '/assets/products/real/amino-cleanser-ph55.jpg'],
  ['0f8d44fd-c409-4d79-bed9-0b85feaf6fab', 'TECH-KB-002', '/assets/products/real/keyboard-tri-mode.webp'],
  ['22222222-2222-4222-8222-222222222202', 'TS-KB-CUSTOM', '/assets/products/real/keyboard-tri-mode.webp'],
  ['099a89e8-ccd8-47b7-ac3c-cf961c55773c', 'P05', '/assets/products/real/thermos-500ml.jpg'],
  ['22222222-2222-4222-8222-222222222201', 'TS-ANC-PROX', '/assets/products/real/wireless-earbuds.jpg'],
  ['b54934c3-0762-40b4-868e-e7f66dac1684', 'TECH-ANC-001', '/assets/products/real/wireless-earbuds.jpg'],
];

const media = [
  ['06c66ab9-de31-4476-8acb-f369594568f7', '/assets/products/real/wireless-earbuds.jpg'],
  ['3c413a33-5577-47ec-b2cc-56179cdbd8eb', '/assets/products/real/centella-b5-serum.jpg'],
];

const backupPath = path.resolve(__dirname, '../../artifacts/product-image-audit/products-before-apply.json');
const afterPath = path.resolve(__dirname, '../../artifacts/product-image-audit/products-after-apply.json');

function assetPath(url) {
  return path.resolve(__dirname, '../../frontend/public', url.slice(1));
}

async function main() {
  const rollback = process.argv.includes('--rollback');
  const apply = process.argv.includes('--apply');
  if (!rollback && !apply) {
    throw new Error('Usage: node scripts/repair-product-image-data.js --apply | --rollback');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing from backend/.env');

  const expectedCount = products.length;
  for (const [, , url] of products) {
    if (!fs.existsSync(assetPath(url))) throw new Error(`Missing product image asset: ${url}`);
  }
  for (const [, url] of media) {
    if (!fs.existsSync(assetPath(url))) throw new Error(`Missing gallery image asset: ${url}`);
  }

  const isRemote = /supabase|pooler|sslmode=require/i.test(process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = products.map(([id]) => id);
    const found = await client.query(
      'SELECT id, sku, title, image_url FROM products WHERE id = ANY($1::uuid[]) ORDER BY id',
      [ids],
    );
    if (found.rows.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} active catalogue rows; found ${found.rows.length}. No rows changed.`);
    }
    const byId = new Map(found.rows.map((row) => [row.id, row]));
    for (const [id, sku] of products) {
      if (byId.get(id)?.sku !== sku) throw new Error(`Product identity changed for ${id} (${sku}). No rows changed.`);
    }

    const mediaIds = media.map(([id]) => id);
    const foundMedia = await client.query(
      "SELECT id, product_id, title, asset_type, url_or_content FROM media_assets WHERE id = ANY($1::uuid[]) AND asset_type = 'IMAGE' ORDER BY id",
      [mediaIds],
    );
    if (foundMedia.rows.length !== media.length) throw new Error('Expected gallery-image rows are missing or changed. No rows changed.');

    if (!rollback) {
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, JSON.stringify({ products: found.rows, media: foundMedia.rows }, null, 2));
      }
      for (const [id, sku, url] of products) {
        const result = await client.query(
          'UPDATE products SET image_url = $3, updated_at = NOW() WHERE id = $1::uuid AND sku = $2',
          [id, sku, url],
        );
        if (result.rowCount !== 1) throw new Error(`Failed to update ${sku}`);
      }
      for (const [id, url] of media) {
        const result = await client.query(
          "UPDATE media_assets SET url_or_content = $2, updated_at = NOW() WHERE id = $1::uuid AND asset_type = 'IMAGE'",
          [id, url],
        );
        if (result.rowCount !== 1) throw new Error(`Failed to update gallery asset ${id}`);
      }
    } else {
      if (!fs.existsSync(backupPath)) throw new Error(`No backup found at ${backupPath}`);
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      for (const row of backup.products) {
        const result = await client.query(
          'UPDATE products SET image_url = $2, updated_at = NOW() WHERE id = $1::uuid',
          [row.id, row.image_url],
        );
        if (result.rowCount !== 1) throw new Error(`Failed to restore product ${row.id}`);
      }
      for (const row of backup.media) {
        await client.query('UPDATE media_assets SET url_or_content = $2 WHERE id = $1::uuid', [row.id, row.url_or_content]);
      }
    }

    await client.query('COMMIT');
    if (!rollback) {
      const after = await pool.query(
        'SELECT id, sku, title, image_url FROM products WHERE id = ANY($1::uuid[]) ORDER BY id',
        [ids],
      );
      fs.writeFileSync(afterPath, JSON.stringify(after.rows, null, 2));
    }
    console.log(`${rollback ? 'Restored' : 'Updated'} ${products.length} product images and ${media.length} gallery images.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
