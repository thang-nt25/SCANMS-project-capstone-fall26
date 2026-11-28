BEGIN;

CREATE TYPE "ProductReportReason" AS ENUM ('WRONG_IMAGE', 'MISLEADING_INFORMATION', 'SUSPECTED_COUNTERFEIT', 'OTHER');
CREATE TYPE "ProductReportStatus" AS ENUM ('PENDING', 'ESCALATED', 'DISMISSED', 'CORRECTION_REQUESTED', 'HIDDEN');

CREATE TABLE "product_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "variant_id" UUID,
    "variant_name" VARCHAR(150),
    "variant_sku" VARCHAR(100),
    "reason" "ProductReportReason" NOT NULL,
    "details" TEXT,
    "evidence" BYTEA,
    "evidence_mime" VARCHAR(30),
    "status" "ProductReportStatus" NOT NULL DEFAULT 'PENDING',
    "decision_note" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_reports_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_product_reports_queue" ON "product_reports" ("status", "created_at", "id");
CREATE INDEX "idx_product_reports_product" ON "product_reports" ("product_id", "created_at");
CREATE UNIQUE INDEX "idx_product_reports_open_reporter" ON "product_reports" ("reporter_id", "product_id") WHERE "status" IN ('PENDING', 'ESCALATED');

COMMIT;
