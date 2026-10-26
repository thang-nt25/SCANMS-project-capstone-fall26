import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AiRecommendationController } from '../ai-recommendation.controller';
import { AiRecommendationService } from '../ai-recommendation.service';

describe('AI product route UUID compatibility (no database)', () => {
  let app: INestApplication;
  const recommendations = { getRecommendedKols: jest.fn().mockResolvedValue({ recommendations: [] }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [AiRecommendationController],
      providers: [{ provide: AiRecommendationService, useValue: recommendations }],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: any) {
      context.switchToHttp().getRequest().user = { id: 'owner', role: 'SHOP_MANAGER' }; return true;
    } }).overrideGuard(RolesGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => jest.clearAllMocks());
  it.each(['066a89f6-36c2-53da-b63b-bd7ce1afb2cb', '237a7208-1c74-4322-96b2-51d810660723'])(
    'passes v4/v5 product %s to the ownership-aware service', async productId => {
      await request(app.getHttpServer()).get(`/ai/recommend-kols/${productId}`).expect(200);
      expect(recommendations.getRecommendedKols).toHaveBeenCalledWith(expect.objectContaining({ productId }), 'owner', 'SHOP_MANAGER');
    },
  );
  it('rejects malformed input before invoking the service', async () => {
    await request(app.getHttpServer()).get('/ai/recommend-kols/not-a-uuid').expect(400);
    expect(recommendations.getRecommendedKols).not.toHaveBeenCalled();
  });
});
