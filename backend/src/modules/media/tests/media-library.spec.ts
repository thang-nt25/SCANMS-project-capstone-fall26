import { UserRole } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MediaService } from '../media.service';
import { QueryMediaDto } from '../dto/query-media.dto';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';

describe('Store media library scope', () => {
  const count = jest.fn().mockResolvedValue(105);
  const findMany = jest.fn().mockResolvedValue([]);
  const service = new MediaService(
    {
      mediaAsset: { count, findMany },
      store: { findMany: jest.fn().mockResolvedValue([{ id: 'shop-a' }]) },
    } as unknown as PrismaService,
    {} as CacheService,
  );
  beforeEach(() => jest.clearAllMocks());

  it('uses the same approved, store-scoped access filter for totals and paginated assets', async () => {
    const result = await service.findAll({ storeId: 'shop-a', scope: 'library', page: 2, limit: 100 }, { id: 'kol', role: UserRole.COLLABORATOR });
    const where = count.mock.calls[0][0].where;
    expect(where).toMatchObject({ storeId: { in: ['shop-a'] }, status: 'APPROVED', isDeleted: false,
      store: { isActive: true, isDeleted: false, storeCollaborators: { some: { collaboratorId: 'kol', status: 'APPROVED' } } } });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 100, take: 100 }));
    expect(result.pagination).toEqual({ total: 105, page: 2, limit: 100, totalPages: 2 });
  });

  it('keeps the normal endpoint able to include the creator’s own pending submissions', async () => {
    await service.findAll({}, { id: 'kol', role: UserRole.COLLABORATOR });
    expect(count.mock.calls[0][0].where.status).toBeUndefined();
    expect(count.mock.calls[0][0].where.OR).toEqual([{ status: 'APPROVED' }, { collaboratorId: 'kol' }]);
  });

  it('counts only approved images and videos in the visual library without weakening an explicit type filter', async () => {
    await service.findAll({ scope: 'visual-library', storeId: 'shop-a', assetType: 'COPYWRITE_TEXT' }, { id: 'kol', role: UserRole.COLLABORATOR });
    expect(count.mock.calls[0][0].where).toMatchObject({ status: 'APPROVED', storeId: { in: ['shop-a'] }, assetType: 'COPYWRITE_TEXT', AND: [{ assetType: { in: ['VIDEO', 'IMAGE'] } }] });
  });

  it('rejects unsupported scopes', async () => {
    expect(await validate(plainToInstance(QueryMediaDto, { scope: 'all-private' }))).toEqual(expect.arrayContaining([expect.objectContaining({ property: 'scope' })]));
    expect(await validate(plainToInstance(QueryMediaDto, { scope: 'library' }))).toEqual([]);
  });
});
