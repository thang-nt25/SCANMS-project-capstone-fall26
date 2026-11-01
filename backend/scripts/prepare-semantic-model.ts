import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { ProductSemanticMatcher } from '../src/modules/products/product-semantic-matcher.service';

async function main() {
  // Downloads public model weights only. No project DB, auth or customer data.
  const service = new ProductSemanticMatcher(new ConfigService({ SEMANTIC_ALLOW_DOWNLOAD: 'true', SEMANTIC_MODEL_CACHE_DIR: process.env.SEMANTIC_MODEL_CACHE_DIR || '../.dev-runtime/semantic-models' }));
  const result = await service.compare('Máy ép trái cây tốc độ chậm', [
    { id: 'related', title: 'Máy ép chậm hoa quả' },
    { id: 'unrelated', title: 'Áo khoác thể thao chống nắng' },
  ]);
  if (!result.items.some(item => item.id === 'related') || result.items.some(item => item.id === 'unrelated')) throw new Error('Semantic smoke test failed');
  console.log(JSON.stringify({ modelPrepared: true, ...result }));
}
void main().catch(() => { console.error('Could not prepare or validate the local semantic model.'); process.exitCode = 1; });
