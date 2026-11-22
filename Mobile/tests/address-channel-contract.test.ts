import test from "node:test";
import assert from "node:assert/strict";
import { AddressInput, AddressSchema } from "../src/features/customer/customer-contracts";
import { ChannelInput } from "../src/features/samples/channel-contracts";
const address = { fullName: "Người nhận", phoneNumber: "0901234567", provinceCode: "202", provinceName: "Hồ Chí Minh", districtCode: "1442", districtName: "Quận 1", wardCode: "20101", wardName: "Bến Nghé", detailAddress: "15 Lê Duẩn", isDefault: false };
test("address coordinates survive Decimal serialization and are optional for old addresses", () => {
  const old = AddressSchema.parse({ ...address, id: "existing" });
  assert.equal(old.latitude, undefined);
  const pinned = AddressSchema.parse({ ...address, id: "pinned", latitude: "10.7798000", longitude: "106.6990000" });
  assert.equal(pinned.latitude, 10.7798);
  assert.equal(AddressInput.parse(pinned).longitude, 106.699);
});
test("shipping codes remain required; a pin alone cannot replace the delivery address", () => {
  assert.equal(AddressInput.safeParse({ ...address, provinceCode: "", latitude: 10.7, longitude: 106.7 }).success, false);
  assert.equal(AddressInput.safeParse({ ...address, latitude: 10.7 }).success, false);
  assert.equal(AddressInput.safeParse({ ...address, latitude: 100, longitude: 106.7 }).success, false);
  assert.equal(AddressInput.safeParse({ ...address, latitude: null, longitude: null }).success, true);
});
test("new social channel requires a real URL and a nonnegative integer follower count", () => {
  const input = { platformName: "TIKTOK", channelName: " @demo ", channelUrl: "https://www.tiktok.com/@demo", followerCount: "0" };
  assert.equal(ChannelInput.parse(input).followerCount, 0);
  assert.equal(ChannelInput.parse(input).channelName, "@demo");
  for (const followerCount of ["", "-1", "1.5", "abc"]) assert.equal(ChannelInput.safeParse({ ...input, followerCount }).success, false);
  assert.equal(ChannelInput.safeParse({ ...input, channelUrl: "@demo" }).success, false);
  assert.equal(ChannelInput.safeParse({ ...input, channelUrl: "http://example.com" }).success, false);
});
