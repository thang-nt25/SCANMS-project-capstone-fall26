require('dotenv/config');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 12000 }) });
(async () => { try {
  const policy = await db.storeMonthlyRewardPolicy.findFirst({where:{isDemo:true,yearMonth:'2026-11'}});
  assert(policy, 'Missing November demo policy');
  const order = await db.order.findFirst({where:{storeId:policy.storeId,idempotencyKey:{startsWith:'DEMO-MONTHLY-REWARD-',endsWith:'2026-11'}}});
  assert(order);
  const kolId = order.attributedCollaboratorId;
  const store = await db.store.findUnique({where:{id:policy.storeId}});
  const shop = await db.user.findUnique({where:{id:store.ownerId}});
  const operator = await db.user.findFirst({where:{role:'SYSTEM_MANAGER',isActive:true,isDeleted:false}});
  const walletBefore = await db.wallet.findUniqueOrThrow({where:{collaboratorId:kolId}});
  const auth = user => ({Authorization:`Bearer ${jwt.sign({sub:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:'3m'})}`,'Content-Type':'application/json'});
  const submit = async () => {
    const response = await fetch(`http://localhost:3000/api/monthly-rewards/policies/${policy.id}/request/${kolId}`,{method:'POST',headers:auth(shop),signal:AbortSignal.timeout(45000)});
    const json = await response.json(); assert(response.ok, `Submission returned ${response.status}: ${JSON.stringify(json)}`);
    return (json.data ?? json).grant;
  };
  const readOnly = process.argv.includes('--review-only');
  const grant = readOnly ? await db.storeMonthlyRewardGrant.findUniqueOrThrow({where:{policyId_collaboratorId:{policyId:policy.id,collaboratorId:kolId}}}) : await submit();
  if(!readOnly) { const duplicate = await submit(); assert.equal(grant.id,duplicate.id); }
  assert.equal(grant.status,'PENDING');
  assert.equal(await db.storeMonthlyRewardGrant.count({where:{policyId:policy.id,collaboratorId:kolId}}),1);
  const listed = await fetch('http://localhost:3000/api/monthly-rewards?month=2026-11',{headers:auth(operator),signal:AbortSignal.timeout(45000)});
  assert(listed.ok); const json=await listed.json(); const view=json.data??json;
  assert(view.policies.find(p=>p.id===policy.id).members.some(m=>m.grant?.id===grant.id && m.grant.status==='PENDING'));

  // Exercise the real approval/ledger transaction, but always roll it back.
  // This is not an operator approval and must leave the grant pending.
  const {StoreMonthlyRewardsService}=require('../dist/modules/commission-rules/store-monthly-rewards.service');
  const {CommissionRulesService}=require('../dist/modules/commission-rules/commission-rules.service');
  const {WalletsService}=require('../dist/modules/wallets/wallets.service');
  const {FinancialLedgerService}=require('../dist/modules/wallets/financial-ledger.service');
  const wallets=new WalletsService(new FinancialLedgerService(),db);
  const commissions=new CommissionRulesService(db,wallets);
  const rollback = new Error('ROLLBACK_MONTHLY_REWARD_REVIEW_CHECK');
  try {
    await db.$transaction(async tx => {
      const rewards=new StoreMonthlyRewardsService({$transaction:work=>work(tx)},commissions,wallets);
      await rewards.reviewGrant(operator,grant.id,{decision:'APPROVED',note:'Transaction rollback verification'});
      const changed = await tx.storeMonthlyRewardGrant.findUnique({where:{id:grant.id}}); assert.equal(changed.status,'PAID');
      const wallet=await tx.wallet.findUnique({where:{collaboratorId:kolId}});
      assert.equal(wallet.availableBalance.minus(walletBefore.availableBalance).toString(),policy.rewardAmount.toString());
      assert.equal(wallet.pendingBalance.toString(),walletBefore.pendingBalance.toString());
      assert.equal(wallet.shoppingBalance.toString(),walletBefore.shoppingBalance.toString());
      const settlement=await tx.monthlyBonusResult.findUniqueOrThrow({where:{storeId_collaboratorId_yearMonth:{storeId:policy.storeId,collaboratorId:kolId,yearMonth:policy.yearMonth}}});
      assert.equal(settlement.status,'PAID');
      const ledger=await tx.financialLedger.findUniqueOrThrow({where:{id:settlement.walletTransactionId}});
      assert.equal(ledger.referenceType,'MONTHLY_BONUS');
      assert.equal(ledger.amount.toString(),policy.rewardAmount.toString());
      const posting=await tx.financePosting.findUniqueOrThrow({where:{eventKey:`${settlement.id}:MONTHLY_BONUS_REWARD`}});
      assert.equal(posting.amount.toString(),policy.rewardAmount.toString());
      throw rollback;
    },{timeout:30000});
  } catch(error) { if(error!==rollback) throw error; }
  const after=await db.wallet.findUnique({where:{collaboratorId:kolId}});
  assert.equal(after.availableBalance.toString(),walletBefore.availableBalance.toString());
  assert.equal((await db.storeMonthlyRewardGrant.findUnique({where:{id:grant.id}})).status,'PENDING');
  console.log(JSON.stringify({submission:'PENDING',duplicate:readOnly?'not submitted in this check':'same grant',visibleToManager:true,approvalTransaction:'verified then rolled back',availableBalanceIncreaseInTrial:policy.rewardAmount.toString(),ledgerReference:'MONTHLY_BONUS',financePosting:'MONTHLY_BONUS_REWARD',pendingAndShoppingBalancesUnchanged:true,walletUnchangedAfterRollback:true}));
} catch(error) { console.error(error.message?.replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]')); process.exitCode=1; } finally { await db.$disconnect(); } })();
