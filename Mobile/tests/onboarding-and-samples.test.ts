import test from "node:test";
import assert from "node:assert/strict";
import {
  ApplicationInput,
  applicationDraft,
  canEditApplication,
  reviewStatus,
} from "../src/features/kyc/kyc-contracts";
import { createKycService } from "../src/features/kyc/kyc-service";
import { ApiClient, ApiError } from "../src/services/api/client";
import {
  createSandboxService,
  SandboxState,
  sandboxActions,
} from "../src/features/samples/sandbox-service";
import {
  sampleDeadline,
  canReviewVideo,
} from "../src/features/samples/sample-policy";
import { Sample } from "../src/features/samples/sample-contracts";
import { StoreInput } from "../src/features/admin/store-input";
import { canOpenModule } from "../src/features/workspace/policy";
import { parseDealCard } from "../src/features/chat/deal-card";
import { ExceptionQueueSchema } from "../src/types/contracts";
test("VIP chat cards retain the new order KPI and legacy nullable fields", () => {
  const card = { type: "EXCLUSIVE_DEAL_PROPOSAL", proposalId: "6bbe91f1-8038-4c1b-b563-df05e53d69c2", targetOrders: 30 };
  assert.equal(parseDealCard(JSON.stringify(card))?.targetOrders, 30);
  assert.equal(parseDealCard(JSON.stringify({ ...card, targetOrders: null, targetRevenue: 1000000 }))?.targetRevenue, 1000000);
});

const id = "6bbe91f1-8038-4c1b-b563-df05e53d69c2";
test("Admin exception queue accepts the real items/stats response and rejects malformed payloads", () => {
  const proposal = {
    id,
    status: "PENDING_ADMIN_APPROVAL",
    proposedCommissionRate: "20",
  };
  assert.equal(
    ExceptionQueueSchema.parse({
      items: [proposal],
      stats: { pendingCount: 1 },
    }).items[0].proposedCommissionRate,
    "20",
  );
  assert.deepEqual(
    ExceptionQueueSchema.parse({ items: [], stats: {} }).items,
    [],
  );
  assert.equal(ExceptionQueueSchema.safeParse({ stats: {} }).success, false);
});
const dossier = {
  idCardNumber: "012345678901",
  taxCode: "",
  bio: "Kênh review sản phẩm",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  frontCardUrl: "https://example.test/front.jpg",
  backCardUrl: "https://example.test/back.jpg",
  channels: [
    {
      platform: "TIKTOK",
      channelName: "Test Creator",
      channelUrl: "https://www.tiktok.com/@test",
      followerCount: 5000,
      channelProofUrl: "https://example.test/studio.jpg",
      isPrimary: true,
    },
  ],
};
const state = {
  orderCode: "TEST/123",
  simulated: true as const,
  status: "RECEIVED",
  deliveryStatus: "DELIVERED",
  receivedAt: "2026-11-22T00:00:00Z",
  videoRevision: 0,
  videoUrl: null,
  videoReview: null,
};
const response = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify({
      success: status < 400,
      data,
      message: "Backend rejected",
    }),
    { status, headers: { "content-type": "application/json" } },
  );
function transport(
  handler: (url: string, options: RequestInit) => Response | Promise<Response>,
) {
  const calls: { url: string; options: RequestInit }[] = [];
  const client = new ApiClient(
    "http://localhost:3000/api",
    { get: () => "test-session", onUnauthorized() {} },
    async (url, options) => {
      calls.push({ url: String(url), options: options || {} });
      return handler(String(url), options || {});
    },
  );
  return { client, calls };
}

test("onboarding respects draft, pending, needs-info, approved and final rejection", () => {
  assert.equal(canEditApplication(null), true);
  const pending = {
    id,
    idCardNumber: "012345678901",
    kycStatus: "UNVERIFIED",
    socialLinksJson: { submittedAt: "2026-11-22" },
  };
  assert.equal(reviewStatus(pending), "PENDING_APPROVAL");
  assert.equal(canEditApplication(pending), false);
  assert.equal(
    canEditApplication({
      ...pending,
      socialLinksJson: {
        ...pending.socialLinksJson,
        reviewStatus: "NEEDS_INFO",
      },
    }),
    true,
  );
  for (const kycStatus of ["VERIFIED", "REJECTED"])
    assert.equal(canEditApplication({ ...pending, kycStatus }), false);
});
test("KOL form validates identity, proof, optional full bank group, distinct channels and one primary", () => {
  assert.equal(ApplicationInput.safeParse(dossier).success, true);
  for (const change of [
    { idCardNumber: "123" },
    { frontCardUrl: "" },
    { channels: [] },
    { bankName: "MB" },
    { channels: [dossier.channels[0], dossier.channels[0]] },
    { channels: [{ ...dossier.channels[0], channelProofUrl: "" }] },
  ])
    assert.equal(
      ApplicationInput.safeParse({ ...dossier, ...change }).success,
      false,
    );
});
test("resubmission restores all existing channel proofs and beneficiary, not blank data", () => {
  const draft = applicationDraft({
    ...dossier,
    id,
    socialLinksJson: {
      channels: dossier.channels,
      frontCardUrl: dossier.frontCardUrl,
      backCardUrl: dossier.backCardUrl,
    },
  });
  assert.deepEqual(draft.channels, dossier.channels);
  assert.deepEqual(draft.specialtyCategories, []);
  assert.equal(draft.frontCardUrl, dossier.frontCardUrl);
  const primary = {
    ...dossier.channels[0],
    channelName: "Main",
    channelUrl: "https://www.tiktok.com/@main",
  };
  const restored = applicationDraft({
    id,
    channels: [{ ...dossier.channels[0], isPrimary: false }, primary],
  });
  assert.equal(restored.channels[0].channelName, "Main");
  assert.equal(restored.channels[0].isPrimary, true);
});
test("KYC uses authenticated upgrade endpoints and never sends privileged role or invented fields", async () => {
  const { client, calls } = transport((url) =>
    response(
      url.endsWith("my-status")
        ? { userRole: "CUSTOMER", kolApplication: null }
        : { message: "submitted" },
    ),
  );
  const service = createKycService(client);
  assert.equal((await service.status()).kolApplication, null);
  await service.submit({
    ...dossier,
    role: "SYSTEM_ADMIN",
    termsAccepted: true,
  });
  assert.ok(calls[0].url.endsWith("/kyc/upgrade/my-status"));
  assert.ok(calls[1].url.endsWith("/kyc/upgrade/kol"));
  assert.equal(calls[1].options.method, "POST");
  const body = JSON.parse(String(calls[1].options.body));
  assert.equal(body.role, undefined);
  assert.equal(body.termsAccepted, undefined);
  assert.equal(
    (calls[1].options.headers as Record<string, string>).Authorization,
    "Bearer test-session",
  );
});
test("invalid KYC is rejected before HTTP and pending server conflicts remain errors", async () => {
  const { client, calls } = transport(() => response({}, 409));
  await assert.rejects(
    createKycService(client).submit({}),
    /CCCD|Invalid|idCard|Expected/,
  );
  assert.equal(calls.length, 0);
  await assert.rejects(
    createKycService(client).submit(dossier),
    (error) => error instanceof ApiError && error.status === 409,
  );
  assert.equal(calls.length, 1);
});
test("Customer can apply for KOL but no role can open retired campaigns or Shop KYC", () => {
  assert.equal(canOpenModule("CUSTOMER", "kyc"), true);
  assert.equal(canOpenModule("SHOP_MANAGER", "kyc"), false);
  for (const role of [
    "CUSTOMER",
    "COLLABORATOR",
    "SHOP_MANAGER",
    "SYSTEM_MANAGER",
    "SYSTEM_ADMIN",
  ] as const)
    assert.equal(canOpenModule(role, "campaigns"), false);
});
test("sandbox actions follow role and server status, with no live sample transitions", () => {
  assert.equal(sandboxActions("COLLABORATOR", state).submit, true);
  assert.equal(sandboxActions("COLLABORATOR", state).review, false);
  assert.equal(
    sandboxActions("SHOP_MANAGER", {
      ...state,
      status: "VIDEO_SUBMITTED",
      videoUrl: "https://example.test/video",
      videoRevision: 1,
    }).review,
    true,
  );
  assert.equal(
    sandboxActions("SHOP_MANAGER", { ...state, status: "COMPLETED" }).review,
    false,
  );
  assert.equal(
    sandboxActions("COLLABORATOR", {
      ...state,
      status: "SHIPPED",
      receivedAt: null,
    }).submit,
    false,
  );
  assert.equal(
    sandboxActions("SHOP_MANAGER", {
      ...state,
      status: "SHIPPED",
      receivedAt: null,
      simulationStartedAt: null,
    }).start,
    true,
  );
});
test("sandbox calls encode code and review exactly the displayed revision; invalid rejection never reaches server", async () => {
  const { client, calls } = transport(() =>
    response({
      ...state,
      videoUrl: "https://example.test/video",
      videoRevision: 2,
      status: "COMPLETED",
    }),
  );
  const service = createSandboxService(client, state.orderCode);
  await service.read();
  await service.act("start");
  await service.submit({
    title: "Test",
    videoUrl: "https://example.test/video",
    caption: "Link https://scanms.vn/r/test",
  });
  await service.review({
    status: "APPROVED",
    videoUrl: "https://example.test/video",
    revision: 2,
  });
  assert.ok(
    calls.every((call) => call.url.includes("/sandbox-sample/TEST%2F123")),
  );
  assert.equal(JSON.parse(String(calls[3].options.body)).revision, 2);
  await assert.rejects(
    service.review({
      status: "REJECTED",
      videoUrl: "https://example.test/video",
      revision: 2,
      rejectionReason: "",
    }),
  );
  assert.equal(calls.length, 4);
  assert.ok(
    calls.every(
      (call) =>
        !call.url.includes("/media/") &&
        !call.url.includes("/sample-requests/"),
    ),
  );
});
test("sandbox failure is not fabricated into success, and writes are not retried", async () => {
  const { client, calls } = transport(() => response({}, 503));
  await assert.rejects(
    createSandboxService(client, "TEST123").act("start"),
    (error) => error instanceof ApiError && error.status === 503,
  );
  assert.equal(calls.length, 1);
  assert.equal(
    SandboxState.safeParse({ ...state, simulated: false }).success,
    false,
  );
});
test("deadline uses revision and video approval only exposes the latest pending work", () => {
  assert.equal(
    sampleDeadline({
      deadlineAt: "2026-11-22",
      revisionDeadlineAt: "2026-11-25",
    }),
    "2026-11-25",
  );
  assert.equal(sampleDeadline({ deadlineAt: "invalid" }), null);
  assert.equal(canReviewVideo("VIDEO_SUBMITTED", "PENDING"), true);
  assert.equal(
    canReviewVideo(
      "VIDEO_SUBMITTED",
      "PENDING",
      "https://example.test/latest",
      "https://example.test/old",
    ),
    false,
  );
  assert.equal(canReviewVideo("COMPLETED", "APPROVED"), false);
  assert.equal(canReviewVideo("REVISION_REQUIRED", "REJECTED"), false);
  const parsed = Sample.parse({
    id,
    status: "APPROVED",
    shippingAddress: "Test",
    collaboratorId: id,
    revisionDeadlineAt: "2026-11-25",
    shippingCharges: [
      { environment: "TEST", trackingNumber: "TEST1", amount: "21000" },
    ],
    product: { id, title: "Test", store: { name: "Store" } },
  });
  assert.equal(parsed.shippingCharges?.[0].environment, "TEST");
  assert.equal(parsed.revisionDeadlineAt, "2026-11-25");
});
test("store creation sends selected GHN region and fixed base commission, with no account elevation", () => {
  const input = {
    name: "Test brand",
    categoryName: "Mỹ phẩm",
    description: "",
    logoUrl: "",
    contactName: "Kho",
    contactPhone: "0901234567",
    detailAddress: "12 Test",
    provinceCode: "202",
    provinceName: "HCM",
    districtCode: "1442",
    districtName: "Quận 1",
    wardCode: "20109",
    wardName: "Phường 1",
  };
  const result = StoreInput.parse({
    ...input,
    defaultCommissionRate: 25,
    ownerId: "customer",
  });
  assert.equal(result.defaultCommissionRate, 10);
  assert.equal(result.ghnDistrictId, 1442);
  assert.equal(result.ghnWardCode, "20109");
  assert.equal("ownerId" in result, false);
  assert.equal(
    StoreInput.safeParse({ ...input, districtCode: "" }).success,
    false,
  );
});
test("chat deal cards parse known payloads and reject malicious/malformed IDs", () => {
  assert.equal(
    parseDealCard(
      JSON.stringify({
        type: "EXCLUSIVE_DEAL_PROPOSAL",
        proposalId: id,
        proposedCommissionRate: 16,
      }),
    )?.proposalId,
    id,
  );
  for (const text of [
    "{}",
    "{invalid",
    JSON.stringify({
      type: "EXCLUSIVE_DEAL_PROPOSAL",
      proposalId: "../../admin",
    }),
    JSON.stringify({
      type: "EXCLUSIVE_DEAL_PROPOSAL",
      proposalId: id,
      proposedCommissionRate: 26,
    }),
  ])
    assert.equal(parseDealCard(text), null);
});
