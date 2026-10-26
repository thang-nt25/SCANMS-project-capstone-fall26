import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { KycController } from '../kyc.controller';
import { KycService } from '../kyc.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('KYC HTTP authorization (real RolesGuard)', () => {
  let app: INestApplication;
  let role: UserRole;
  const service = {
    getPendingKycList: jest.fn(),
    getUpgradeApplications: jest.fn(),
    reviewKyc: jest.fn(),
    reviewKolApplication: jest.fn(),
    reviewShopApplication: jest.fn(),
    getMyKyc: jest.fn(),
  };
  const routes = [
    ['get', '/kyc/admin/pending', 'getPendingKycList'],
    ['get', '/kyc/admin/applications', 'getUpgradeApplications'],
    ['patch', '/kyc/admin/profile-id/review', 'reviewKyc'],
    ['patch', '/kyc/admin/kol/profile-id/review', 'reviewKolApplication'],
    ['patch', '/kyc/admin/shop/store-id/review', 'reviewShopApplication'],
  ] as const;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [KycController],
      providers: [RolesGuard, { provide: KycService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            id: 'authenticated-user',
            role,
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());

  describe.each([
    UserRole.CUSTOMER,
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
  ])('%s', (deniedRole) => {
    it.each(routes)(
      'blocks %s %s before reaching service',
      async (method, url) => {
        role = deniedRole;
        await request(app.getHttpServer())
          [method](url)
          .send({ status: 'VERIFIED' })
          .expect(403);
        Object.values(service).forEach((mock) =>
          expect(mock).not.toHaveBeenCalled(),
        );
      },
    );
  });

  describe.each([UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER])(
    '%s',
    (allowedRole) => {
      it.each(routes)('allows %s %s', async (method, url, serviceMethod) => {
        role = allowedRole;
        await request(app.getHttpServer())
          [method](url)
          .send({ status: 'VERIFIED' })
          .expect(200);
        expect(service[serviceMethod]).toHaveBeenCalledTimes(1);
      });
    },
  );

  it('still lets a customer read only their own profile, ignoring spoofed userId', async () => {
    role = UserRole.CUSTOMER;
    await request(app.getHttpServer())
      .get('/kyc/profile?userId=someone-else')
      .expect(200);
    expect(service.getMyKyc).toHaveBeenCalledWith('authenticated-user');
  });
});
