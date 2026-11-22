CREATE TABLE store_monthly_reward_policies (
 id UUID PRIMARY KEY, store_id UUID NOT NULL REFERENCES stores(id), year_month VARCHAR(7) NOT NULL,
 name VARCHAR(150) NOT NULL, target_revenue DECIMAL(15,2) NOT NULL CHECK(target_revenue > 0),
 reward_amount DECIMAL(15,2) NOT NULL CHECK(reward_amount > 0),
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 created_by UUID NOT NULL REFERENCES users(id), reviewed_by UUID REFERENCES users(id), review_note VARCHAR(500),
 reviewed_at TIMESTAMPTZ, is_demo BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(store_id,year_month)
);
CREATE TABLE store_monthly_reward_grants (
 id UUID PRIMARY KEY, policy_id UUID NOT NULL REFERENCES store_monthly_reward_policies(id),
 collaborator_id UUID NOT NULL REFERENCES users(id), valid_revenue DECIMAL(15,2) NOT NULL,
 amount DECIMAL(15,2) NOT NULL CHECK(amount > 0),
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PAID','REJECTED')),
 requested_by UUID NOT NULL REFERENCES users(id), reviewed_by UUID REFERENCES users(id), review_note VARCHAR(500),
 paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(policy_id,collaborator_id)
);
