ALTER TABLE "orders"
ADD COLUMN "customer_email" VARCHAR(254);

COMMENT ON COLUMN "orders"."customer_email" IS
'Optional email supplied by a guest buyer for transactional order notifications.';
