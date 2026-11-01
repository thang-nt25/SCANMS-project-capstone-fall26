import { buildShippingPackage, lockedOrderPackage } from './shipping-package';
import {
  isValidEan13,
  validateProductPackage,
} from '../products/product-package';

const product = {
  packageWeight: 700,
  packageLength: 20,
  packageWidth: 15,
  packageHeight: 5,
};
describe('Persisted product package and shipping snapshots', () => {
  it('checks EAN-13 checksum, not only its length', () => {
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
    expect(() =>
      validateProductPackage({ barcode: '4006381333932' }),
    ).toThrow();
  });
  it('does not invent packaging for legacy or incomplete products', () => {
    expect(() => buildShippingPackage([{ product: {}, quantity: 1 }])).toThrow(
      'Shop cần cập nhật',
    );
    expect(() =>
      buildShippingPackage([{ product: undefined as never, quantity: 1 }]),
    ).toThrow();
    expect(() => buildShippingPackage([])).toThrow();
  });
  it('calculates actual aggregate mass and dimensions', () => {
    expect(
      buildShippingPackage([
        { product, quantity: 2 },
        {
          product: { ...product, packageWeight: 200, packageWidth: 30 },
          quantity: 1,
        },
      ]),
    ).toEqual({ weight: 1600, length: 20, width: 30, height: 15 });
  });
  it('quotes valid packaging independently of a legacy invalid catalog barcode', () => {
    expect(buildShippingPackage([{ product: { ...product, barcode: 'legacy-invalid' }, quantity: 1 }]))
      .toEqual({ weight: 700, length: 20, width: 15, height: 5 });
    expect(() => validateProductPackage({ barcode: 'legacy-invalid' })).toThrow();
  });
  it.each([0, -1, 1.5, NaN])('rejects invalid quantity %p', (quantity) => {
    expect(() => buildShippingPackage([{ product, quantity }])).toThrow();
  });
  it('rejects dimensions and aggregate loads exceeding carrier limits', () => {
    expect(() =>
      buildShippingPackage([
        { product: { ...product, packageWeight: 20000 }, quantity: 1 },
      ]),
    ).toThrow('dưới 20 kg');
    expect(() => validateProductPackage({ packageWeight: 30001 })).toThrow();
    expect(() => validateProductPackage({ packageLength: 1.1 })).toThrow();
    expect(() => buildShippingPackage([{ product, quantity: 44 }])).toThrow();
    expect(() =>
      buildShippingPackage([
        { product: { ...product, packageHeight: 100 }, quantity: 2 },
      ]),
    ).toThrow();
  });
  it('uses the locked snapshot even if the catalog changes, without extra fields', () => {
    expect(
      lockedOrderPackage(
        {
          shippingPackageVersion: 1,
          shippingPackage: {
            weight: 700,
            length: 20,
            width: 15,
            height: 5,
            injected: true,
          },
        },
        9,
      ),
    ).toEqual({ weight: 700, length: 20, width: 15, height: 5 });
    expect(() => lockedOrderPackage({ shippingPackageVersion: 1 }, 1)).toThrow(
      'snapshot',
    );
    expect(() =>
      lockedOrderPackage({ shippingPackage: { weight: 0 } }, 1),
    ).toThrow();
  });
  it('retains historical pre-v1 checkout assumptions only for already placed legacy orders', () => {
    expect(lockedOrderPackage({}, 2)).toEqual({
      weight: 1000,
      length: 15,
      width: 10,
      height: 5,
    });
  });
});
