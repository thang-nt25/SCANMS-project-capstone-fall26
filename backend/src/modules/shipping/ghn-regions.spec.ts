import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { GhnService } from './ghn.service';

describe('GHN region catalog recovery', () => {
  const make = () => new GhnService({} as any, { get: () => undefined } as unknown as ConfigService);
  it('does not disguise a provider failure as an empty province list', async () => {
    const service = make();
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValueOnce({ code: 401 }).mockResolvedValueOnce({ code: 200, data: [{ ProvinceID: 202, ProvinceName: 'Hồ Chí Minh' }] });
    await expect(service.getProvinces()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.getProvinces()).resolves.toEqual([{ ProvinceID: 202, ProvinceName: 'Hồ Chí Minh' }]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(['getDistricts', 'getWards'] as const)('does not cache an empty %s response', async method => {
    const service = make();
    const row = method === 'getDistricts' ? { DistrictID: 1, DistrictName: 'Quận 1' } : { WardCode: '1', WardName: 'Phường 1' };
    jest.spyOn(service as any, 'ghnFetch').mockResolvedValueOnce({ code: 200, data: [] }).mockResolvedValueOnce({ code: 200, data: [row] });
    await expect(service[method](202)).resolves.toEqual([]);
    await expect(service[method](202)).resolves.toEqual([row]);
  });
});
