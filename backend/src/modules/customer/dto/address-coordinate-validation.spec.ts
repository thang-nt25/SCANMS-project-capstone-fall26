import { ValidationPipe } from '@nestjs/common';
import { CreateCustomerAddressDto } from './create-address.dto';
import { UpdateCustomerAddressDto } from './update-address.dto';

describe('address coordinates from Leaflet and GPS', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const address = {
    fullName: 'Nguyễn Văn Mua', phoneNumber: '0912345678',
    provinceName: 'Thành phố Hồ Chí Minh', districtName: 'Thành phố Thủ Đức',
    wardName: 'Phường Linh Trung', detailAddress: 'Khu Công Nghệ Cao',
  };
  const transform = (payload: object, metatype = CreateCustomerAddressDto) =>
    pipe.transform(payload, { type: 'body', metatype });

  it('accepts the full precision of a clicked map position on create and update', async () => {
    const coords = { latitude: 10.875039448, longitude: 106.800813376 };
    await expect(transform({ ...address, ...coords })).resolves.toMatchObject(coords);
    await expect(pipe.transform(coords, { type: 'body', metatype: UpdateCustomerAddressDto })).resolves.toMatchObject(coords);
  });
  it.each([
    { latitude: 90.001 }, { latitude: -90.001 },
    { longitude: 180.001 }, { longitude: -180.001 },
    { latitude: NaN }, { longitude: Infinity }, { latitude: 'invalid' },
  ])('rejects nonfinite or out-of-range coordinates: %j', async coords => {
    await expect(transform({ ...address, ...coords })).rejects.toMatchObject({ status: 400 });
  });
  it('continues to allow an address without a map pin', async () => {
    await expect(transform(address)).resolves.toMatchObject(address);
  });
});
