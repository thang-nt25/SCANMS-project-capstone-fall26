import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';

export const SEMANTIC_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const SEMANTIC_REVISION = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
type Extractor = (
  texts: string[],
  options: { pooling: 'mean'; normalize: true },
) => Promise<{ tolist(): number[][] }>;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (
    !a.length ||
    a.length !== b.length ||
    [...a, ...b].some((value) => !Number.isFinite(value))
  )
    throw new Error('Invalid embedding');
  const normA = Math.hypot(...a),
    normB = Math.hypot(...b);
  if (!normA || !normB) throw new Error('Empty embedding');
  return Math.max(
    -1,
    Math.min(
      1,
      a.reduce((sum, value, i) => sum + value * b[i], 0) / normA / normB,
    ),
  );
}

@Injectable()
export class ProductSemanticMatcher {
  private extractor?: Promise<Extractor>;
  private readonly vectors = new Map<string, number[]>();
  private queue: Promise<unknown> = Promise.resolve();
  private queued = 0;
  constructor(private readonly config: ConfigService) {}

  private load(): Promise<Extractor> {
    if (!this.extractor)
      this.extractor = (async () => {
        const { pipeline, env } = await import('@huggingface/transformers');
        env.cacheDir = path.resolve(
          this.config.get<string>('SEMANTIC_MODEL_CACHE_DIR') ||
            '../.dev-runtime/semantic-models',
        );
        env.useFSCache = true;
        const extractor = await pipeline('feature-extraction', SEMANTIC_MODEL, {
          revision: SEMANTIC_REVISION,
          dtype: 'q8',
          device: 'cpu',
          local_files_only:
            this.config.get<string>('SEMANTIC_ALLOW_DOWNLOAD') !== 'true',
          session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
        });
        return extractor as unknown as Extractor;
      })().catch((error) => {
        this.extractor = undefined;
        throw error;
      });
    return this.extractor;
  }

  async compare<T extends { title: string }>(title: string, candidates: T[]) {
    if (this.queued >= 8)
      throw new ServiceUnavailableException(
        'Bộ đối chiếu ngữ nghĩa đang bận. Vui lòng thử lại.',
      );
    this.queued += 1;
    const run = this.queue
      .catch(() => undefined)
      .then(async () => {
        const encode = await this.load();
        const texts = [
          ...new Set(
            [title, ...candidates.map((candidate) => candidate.title)].map(
              (text) => text.trim().normalize('NFC'),
            ),
          ),
        ];
        const missing = texts.filter((text) => !this.vectors.has(text));
        for (let offset = 0; offset < missing.length; offset += 16) {
          const batch = missing.slice(offset, offset + 16);
          const result = (
            await encode(batch, { pooling: 'mean', normalize: true })
          ).tolist();
          if (result.length !== batch.length)
            throw new Error('Incomplete embedding batch');
          result.forEach((vector, i) => {
            cosineSimilarity(vector, vector);
            this.vectors.set(batch[i], vector);
          });
        }
        const query = this.vectors.get(title.trim().normalize('NFC'))!;
        const ranked = candidates.map((candidate) => ({
          ...candidate,
          similarity:
            Math.round(
              Math.max(
                0,
                cosineSimilarity(
                  query,
                  this.vectors.get(candidate.title.trim().normalize('NFC'))!,
                ),
              ) * 10000,
            ) / 100,
        }));
        while (this.vectors.size > 2000)
          this.vectors.delete(this.vectors.keys().next().value);
        return {
          method: 'MULTILINGUAL_SENTENCE_EMBEDDING',
          model: SEMANTIC_MODEL,
          revision: SEMANTIC_REVISION,
          items: ranked
            .filter((candidate) => candidate.similarity > 80)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5),
        };
      });
    this.queue = run;
    try {
      return await run;
    } catch {
      throw new ServiceUnavailableException(
        'Chưa sẵn sàng đối chiếu ngữ nghĩa. Kiểm tra mô hình local rồi thử lại; hồ sơ chưa được gửi.',
      );
    } finally {
      this.queued -= 1;
    }
  }
}
