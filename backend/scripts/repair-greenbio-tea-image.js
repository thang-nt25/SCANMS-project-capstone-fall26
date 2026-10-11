const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { Pool } = require('pg');

const productId = '44444444-4444-4444-8444-444444444401';
const sku = 'GB-TEA-CHAMOMILE';
const previousImage = '/assets/products/real/chamomile-tea-50g.webp';
const nextImage = '/assets/products/illustrations/greenbio-herbal-tea.png';

async function main() {
  const apply = process.argv.includes('--apply');
  if (!fs.existsSync(path.resolve(__dirname, '../../frontend/public', nextImage.slice(1)))) {
    throw new Error('The GreenBio illustration asset must exist before updating product data.');
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /supabase|pooler|sslmode=require/i.test(process.env.DATABASE_URL)
      ? { rejectUnauthorized: false } : undefined,
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, sku, title, image_url FROM products WHERE id = $1 AND sku = $2 FOR UPDATE',
      [productId, sku],
    );
    if (rows.length !== 1) throw new Error('Expected GreenBio tea product was not found.');
    const product = rows[0];
    if (![previousImage, nextImage].includes(product.image_url)) {
      throw new Error('Product image has changed since inspection; no data was updated.');
    }
    if (apply && product.image_url !== nextImage) {
      await client.query('UPDATE products SET image_url = $1 WHERE id = $2 AND sku = $3', [nextImage, productId, sku]);
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify({ applied: apply, productId, sku, title: product.title, previousImage: product.image_url, nextImage }));
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
