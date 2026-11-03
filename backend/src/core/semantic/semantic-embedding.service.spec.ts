import { ConfigService } from '@nestjs/config';
import { SemanticEmbeddingService } from './semantic-embedding.service';

describe('Shared local semantic embedding', () => {
  it('keeps low-scoring profiles for relative ranking while product identity keeps its strict threshold', async () => {
    const service = new SemanticEmbeddingService(new ConfigService());
    const vectors: Record<string, number[]> = {
      query: [1, 0],
      related: [1, 0],
      other: [0, 1],
    };
    const encode = jest.fn(async (texts: string[]) => ({
      tolist: () => texts.map((text) => vectors[text]),
    }));
    jest.spyOn(service as any, 'load').mockResolvedValue(encode);
    const candidates = [
      { id: 'one', title: 'related' },
      { id: 'two', title: 'other' },
    ];
    const ranked = await service.rank('query', candidates);
    expect(ranked.items.map((item) => item.similarity)).toEqual([100, 0]);
    const warnings = await service.compare('query', candidates);
    expect(warnings.items.map((item) => item.id)).toEqual(['one']);
    expect(encode).toHaveBeenCalledTimes(1);
  });
  it('returns an explicit unavailable error and recovers on the next request', async () => {
    const service = new SemanticEmbeddingService(new ConfigService());
    jest
      .spyOn(service as any, 'load')
      .mockRejectedValueOnce(new Error('model unavailable'))
      .mockResolvedValue(async (texts: string[]) => ({
        tolist: () => texts.map(() => [1, 0]),
      }));
    await expect(
      service.rank('query', [{ title: 'profile' }]),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      service.rank('query', [{ title: 'profile' }]),
    ).resolves.toMatchObject({ items: [{ similarity: 100 }] });
  });
});
