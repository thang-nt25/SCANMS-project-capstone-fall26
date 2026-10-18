// Audit Word section 1; memory fixtures only, no real database/GHN/network access.
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { SamplesService } = require('../src/modules/samples/samples.service');
const { CreateSampleRequestDto, UpdateSampleRequestDto } = require('../src/modules/samples/dto/sample-request.dto');
const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const input = { productId: id(1), socialChannelId: id(2), recipientName: 'Người nhận mới', recipientPhone: '+84 912 345 678',
  recipientPhoneConfirmed: true, shippingAddress: '88 Đường Mới, Tầng 5, Phường Một, Quận Một, Tỉnh Một',
  ghnProvinceId: 1, ghnDistrictId: 11, ghnWardCode: '111', contentType: 'Video review', termsAccepted: true };
const results = [];
const record = (name, passed, evidence) => { results.push({ name, passed, evidence }); console.log(`${passed ? 'PASS' : 'GAP'} ${name}: ${evidence}`); };
function fixture() {
  const collaborator = { id: id(3), fullName: 'Hồ sơ cũ', phoneNumber: '0988888888', address: 'Địa chỉ hồ sơ cũ' };
  const product = { id: id(1), storeId: id(4), title: 'Audit', sampleEnabled: true, sampleQuota: 10, sampleGrantedCount: 0, store: { ownerId: id(5) } };
  const channel = { id: id(2), collaboratorId: id(3), platformName: 'TIKTOK' };
  let row;
  const prisma = {
    collaboratorSocialChannel: { findFirst: async () => channel }, product: { findFirst: async () => product },
    store: { findFirst: async () => ({ id: id(4) }) },
    sampleProductRequest: {
      findFirst: async () => null,
      create: async ({ data }) => (row = { ...data, id: id(6), status: 'PENDING', product, collaborator }),
      findUnique: async () => structuredClone(row), findUniqueOrThrow: async () => structuredClone(row),
      findMany: async () => row ? [structuredClone(row)] : [],
      updateMany: async ({ where, data }) => {
        if (where.id !== row.id || where.collaboratorId !== row.collaboratorId || where.status !== row.status) return { count: 0 };
        row = { ...row, ...data }; return { count: 1 };
      },
    },
    notification: { create: async () => ({}) }, auditLog: { create: async () => ({}) }, sampleRequestEvent: { create: async () => ({}) },
    $transaction: async callback => callback(prisma),
  };
  const ghn = {
    getProvinces: async () => [{ ProvinceID: 1, ProvinceName: 'Tỉnh Một' }],
    getDistricts: async () => [{ DistrictID: 11, ProvinceID: 1, DistrictName: 'Quận Một' }],
    getWards: async () => [{ WardCode: '111', DistrictID: 11, WardName: 'Phường Một' }],
  };
  const service = new SamplesService(prisma, {}, ghn);
  service.getMyEligibility = async () => ({ canRequest: true });
  return { service, prisma, row: () => row };
}
async function rejected(fn) { try { await fn(); return false; } catch { return true; } }
(async () => {
  const dto = plainToInstance(CreateSampleRequestDto, input);
  assert.equal(validateSync(dto).length, 0);
  const f = fixture();
  await f.service.createRequest(id(3), dto);
  record('Tạo mẫu lưu địa chỉ/tên/SĐT riêng của yêu cầu', f.row().shippingAddress === input.shippingAddress && f.row().recipientName === input.recipientName && f.row().recipientPhone === '0912345678', 'Không thay bằng địa chỉ hay SĐT hồ sơ KOL; chuẩn hóa +84');
  const edit = plainToInstance(UpdateSampleRequestDto, { ...input, shippingAddress: '99 Địa Chỉ Vừa Sửa, Phường Một, Quận Một, Tỉnh Một' });
  await f.service.updatePendingRequest(id(6), id(3), edit);
  const shopRows = await f.service.getRequestsForShop(id(5));
  record('API Shop trả địa chỉ vừa sửa trên cùng yêu cầu', shopRows[0].shippingAddress === edit.shippingAddress && shopRows[0].id === id(6), shopRows[0].shippingAddress);
  for (const [field, value] of [['ghnDistrictId', 22], ['ghnWardCode', '222'], ['recipientPhone', '1234567891'], ['recipientPhoneConfirmed', false]]) {
    const bad = { ...input, [field]: value };
    const fresh = fixture();
    const createRejected = await rejected(() => fresh.service.createRequest(id(3), bad));
    const editRejected = await rejected(() => f.service.updatePendingRequest(id(6), id(3), bad));
    record(`Chặn ${field} không hợp lệ khi tạo và sửa`, createRejected && editRejected, `${field}=${value}`);
  }
  const missing = plainToInstance(CreateSampleRequestDto, { ...input, ghnProvinceId: undefined, ghnDistrictId: undefined, ghnWardCode: undefined });
  record('DTO bắt buộc đủ ba mã GHN', validateSync(missing).filter(error => ['ghnProvinceId', 'ghnDistrictId', 'ghnWardCode'].includes(error.property)).length === 3, 'Không thể bỏ ba mã cấp địa chỉ');
  const blanks = plainToInstance(CreateSampleRequestDto, { ...input, recipientName: '   ', shippingAddress: ' '.repeat(20) });
  let emptySaved = false;
  if (validateSync(blanks).length === 0) {
    const empty = fixture(); await empty.service.createRequest(id(3), blanks);
    emptySaved = empty.row().recipientName === '' && empty.row().shippingAddress === '';
  }
  record('API chặn tên/địa chỉ chỉ chứa khoảng trắng', !emptySaved, emptySaved ? 'DTO cho qua, service trim thành chuỗi rỗng rồi lưu' : 'Đã chặn trước khi lưu');
  const short = plainToInstance(CreateSampleRequestDto, { ...input, shippingAddress: '88 Đường Mới' });
  const shortFixture = fixture();
  record('API bảo đảm địa chỉ hiển thị đủ ba tên cấp GHN', await rejected(() => shortFixture.service.createRequest(id(3), short)), 'Chặn địa chỉ chỉ có đường dù mã GHN hợp lệ');
  fs.mkdirSync('../docs/audit-results', { recursive: true });
  fs.writeFileSync('../docs/audit-results/sample-address-backend.json', JSON.stringify({ date: new Date().toISOString(), fixtureOnly: true, results }, null, 2));
  if (results.some(item => !item.passed)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
