-- Additive migration: legacy KOC proposals retain NULL initiator and terms.
ALTER TABLE "exclusive_deal_proposals"
  ADD COLUMN "initiated_by_id" UUID,
  ADD COLUMN "offer_terms" JSONB;

ALTER TABLE "exclusive_deal_proposals"
  ADD CONSTRAINT "exclusive_deal_proposals_initiated_by_id_fkey"
  FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
