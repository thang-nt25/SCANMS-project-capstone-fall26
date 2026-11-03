ALTER TYPE "WalletBalanceBucket" ADD VALUE 'SHOPPING';
ALTER TABLE wallets ADD COLUMN shopping_balance decimal(15,2) NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN earnings_review_required boolean NOT NULL DEFAULT false;
ALTER TABLE wallets ADD CONSTRAINT shopping_balance_nonnegative CHECK (shopping_balance >= 0);
