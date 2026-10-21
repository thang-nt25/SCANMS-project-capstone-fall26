import { buildDataset } from '../build-dataset';
import { CREATOR_REFERENCES } from '../data/creator-references.data';
import { missingFixturePackage } from '../enrich-existing.seed';
import { jsonObject, seedId } from '../seed.helpers';

const data = buildDataset({
  referenceDate: new Date('2026-10-18T08:00:00Z'),
  frontendUrl: 'http://localhost:5173',
  passwordHash: 'test',
  shipping: [],
});

describe('non-destructive seed enrichment and public creator references', () => {
  it('has 20 unique public names/channels with explicit source and date, not invented follower snapshots', () => {
    expect(CREATOR_REFERENCES).toHaveLength(20);
    expect(new Set(CREATOR_REFERENCES.map((row) => row.channelUrl)).size).toBe(
      20,
    );
    for (const reference of CREATOR_REFERENCES) {
      expect(new URL(reference.channelUrl).hostname).toBe('www.youtube.com');
      expect(new URL(reference.sourceUrl).hostname).toBe('metub.net');
      expect(reference.verification).toBe('AGENCY_LISTED');
      expect(reference).not.toHaveProperty('followerCount');
      expect(reference.sourceCheckedAt).toBe('2026-10-18');
    }
  });
  it('clearly identifies the test account and generic avatar rather than impersonating a creator', () => {
    for (const profile of data.profiles) {
      const user = data.users.find((row) => row.id === profile.userId)!;
      expect(user.fullName).toMatch(/· TEST$/);
      expect(user.email).toMatch(/@seed\.scanms\.test$/);
      expect(user.avatarUrl).toContain('/seed/creators/reference.svg');
      expect(
        jsonObject(jsonObject(profile.socialLinksJson).seedReference),
      ).toMatchObject({
        ownershipVerified: false,
        partnershipVerified: false,
        metricsSource: 'SYNTHETIC_CAPSTONE',
      });
      expect(profile.bio).toContain('không phải tài khoản');
      expect(profile.bankAccountName).not.toBe(
        user.fullName?.replace(' · TEST', ''),
      );
    }
  });
  it('only fills NULL fixture package fields and preserves all measured values', () => {
    const expected = data.products[0];
    const current = {
      sku: expected.sku,
      labelInfo: String(expected.labelInfo),
      barcode: null,
      packageWeight: 777,
      packageLength: null,
      packageWidth: 12,
      packageHeight: null,
    };
    expect(missingFixturePackage(current, expected)).toEqual({
      barcode: expected.barcode,
      packageLength: 20,
      packageHeight: 10,
    });
    expect(current.packageWeight).toBe(777);
  });
  it('never assigns demo package numbers to a user-created product', () => {
    const current = {
      sku: 'USER-1',
      labelInfo: null,
      barcode: null,
      packageWeight: null,
      packageLength: null,
      packageWidth: null,
      packageHeight: null,
    };
    expect(missingFixturePackage(current, data.products[0])).toEqual({});
  });
  it('seeds two TEST requests awaiting paid approval, not fictitious receipts', () => {
    expect(data.sponsoredPlacements).toHaveLength(2);
    for (const row of data.sponsoredPlacements) {
      expect(row).toMatchObject({
        status: 'REQUESTED',
      });
      expect(row.headline).toMatch(/^\[TEST\]/);
      expect(row.paymentReference).toBeUndefined();
      expect(row.fundingType).toBeUndefined();
      expect(row.reviewedById).toBeUndefined();
      expect(row.paymentProofUrl).toBeUndefined();
      expect(data.stores.map((store) => store.id)).toContain(row.storeId);
    }
    expect(data.sponsoredPlacements[0].id).toBe(
      seedId('sponsored-placement:0'),
    );
  });
});
