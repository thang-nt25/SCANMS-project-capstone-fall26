import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateStoreDto } from './update-store.dto';

describe('Warehouse location input', () => {
  const location = {
    provinceCode: '202', provinceName: 'Hồ Chí Minh',
    districtCode: '1444', districtName: 'Quận Bình Thạnh',
    wardCode: '123', wardName: 'Phường 22', detailAddress: '12 Tân Cảng',
    latitude: 10.795, longitude: 106.72,
  };
  it('accepts separate pickup and return pins and GHN regions', async () => {
    const input = plainToInstance(UpdateStoreDto, {
      warehouseLocation: location,
      returnWarehouseLocation: { ...location, detailAddress: '20 Tân Cảng', latitude: 10.796 },
    });
    expect(await validate(input)).toHaveLength(0);
    expect(input.returnWarehouseLocation?.latitude).toBe(10.796);
  });
  it.each([{ latitude: 91 }, { longitude: -181 }, { provinceName: '' }, { detailAddress: '' }])('rejects malformed location %j', async patch => {
    const input = plainToInstance(UpdateStoreDto, { warehouseLocation: { ...location, ...patch } });
    expect((await validate(input)).some(error => error.property === 'warehouseLocation')).toBe(true);
  });
  it('keeps legacy address updates compatible without mandatory GPS', async () => {
    const input = plainToInstance(UpdateStoreDto, { warehouseAddress: '12 Tân Cảng, Phường 22, Bình Thạnh, Hồ Chí Minh' });
    expect(await validate(input)).toHaveLength(0);
  });
});
