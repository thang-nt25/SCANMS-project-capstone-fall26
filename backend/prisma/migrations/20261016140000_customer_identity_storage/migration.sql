-- Additive migration: existing accounts and legacy JSON records are untouched.
CREATE TABLE "customer_identities" (
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "id_card_number" VARCHAR(12) NOT NULL,
    "address" VARCHAR(200) NOT NULL,
    "verification_method" VARCHAR(30) NOT NULL DEFAULT 'SELF_DECLARED',
    "verified_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "customer_identities_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "customer_identities_card_format_check"
        CHECK ("id_card_number" ~ '^([0-9]{9}|[0-9]{12})$'),
    CONSTRAINT "customer_identities_method_check"
        CHECK ("verification_method" IN ('SELF_DECLARED', 'LEGACY_IMPORT'))
);
