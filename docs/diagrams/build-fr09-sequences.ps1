$ErrorActionPreference = 'Stop'
$script:doc = [xml]'<mxfile host="app.diagrams.net" />'
$script:counter = 0
function Cell($value, $style, $x, $y, $w, $h) {
  $script:counter++
  $c=$doc.CreateElement('mxCell'); $c.SetAttribute('id',"c$counter"); $c.SetAttribute('value',$value); $c.SetAttribute('style',$style); $c.SetAttribute('vertex','1'); $c.SetAttribute('parent','1')
  $g=$doc.CreateElement('mxGeometry'); foreach($pair in @(@('x',$x),@('y',$y),@('width',$w),@('height',$h),@('as','geometry'))) { $g.SetAttribute($pair[0],[string]$pair[1]) }
  [void]$c.AppendChild($g); [void]$script:root.AppendChild($c)
}
function Line($fromX,$fromY,$toX,$toY,$label,$style,$self=$false) {
  $script:counter++
  $c=$doc.CreateElement('mxCell'); $c.SetAttribute('id',"c$counter"); $c.SetAttribute('value',$label); $c.SetAttribute('style',$style); $c.SetAttribute('edge','1'); $c.SetAttribute('parent','1')
  $g=$doc.CreateElement('mxGeometry'); $g.SetAttribute('relative','1'); $g.SetAttribute('as','geometry')
  foreach($p in @(@('sourcePoint',$fromX,$fromY),@('targetPoint',$toX,$toY))) {
    $point=$doc.CreateElement('mxPoint'); $point.SetAttribute('as',$p[0]); $point.SetAttribute('x',[string]$p[1]); $point.SetAttribute('y',[string]$p[2]); [void]$g.AppendChild($point)
  }
  if($self) {
    $points=$doc.CreateElement('Array'); $points.SetAttribute('as','points')
    foreach($yy in @($fromY,$toY)) { $point=$doc.CreateElement('mxPoint'); $point.SetAttribute('x',[string]($fromX+110)); $point.SetAttribute('y',[string]$yy); [void]$points.AppendChild($point) }
    [void]$g.AppendChild($points)
  }
  [void]$c.AppendChild($g); [void]$root.AppendChild($c)
}
function Page($name,$subtitle,$participants) {
  $script:participants=$participants; $script:y=220; $script:seq=0; $script:width=($participants.Count*310+100); $script:frames=@{}; $script:running=@{}; $script:overviewMode=$name.StartsWith('00 -')
  $d=$doc.CreateElement('diagram'); $d.SetAttribute('id',"page-$($doc.mxfile.ChildNodes.Count+1)"); $d.SetAttribute('name',$name)
  $script:model=$doc.CreateElement('mxGraphModel'); $model.SetAttribute('grid','1'); $model.SetAttribute('page','1'); $model.SetAttribute('pageWidth',[string]$width)
  $script:root=$doc.CreateElement('root'); foreach($id in @('0','1')) { $c=$doc.CreateElement('mxCell'); $c.SetAttribute('id',$id); if($id -eq '1'){$c.SetAttribute('parent','0')}; [void]$root.AppendChild($c) }
  [void]$model.AppendChild($root); [void]$d.AppendChild($model); [void]$doc.DocumentElement.AppendChild($d)
  Cell "SCANMS | FR-09 | $name" 'text;html=0;fontSize=25;fontStyle=1;fontColor=#231D15;align=left;' 35 20 ($width-70) 45
  Cell $subtitle 'text;html=0;whiteSpace=wrap;fontSize=14;fontColor=#7D715E;align=left;' 35 70 ($width-70) 50
  for($i=0;$i -lt $participants.Count;$i++) {
    if($i -eq 0 -and $participants[$i] -match 'Manager|Collaborator|caller') {
      Cell $participants[$i] 'shape=umlActor;html=0;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;fontSize=14;verticalLabelPosition=bottom;verticalAlign=top;align=center;' ((X $i)-17) 125 34 55
    } else {
      Cell $participants[$i] 'rounded=0;html=0;whiteSpace=wrap;fillColor=#F3EFE6;strokeColor=#B88E4F;fontColor=#1A1612;fontSize=15;fontStyle=1;' (65+$i*310) 135 250 65
    }
  }
}
function X($i) { return 190+310*$i }
function M($a,$b,$label,$return=$false) {
  $script:seq++; $style='html=0;rounded=0;fontSize=14;fontColor=#1A1612;strokeColor=#7D715E;labelBackgroundColor=#FAF8F5;endArrow=block;endFill=1;'
  if($return){$style+='dashed=1;endArrow=open;endFill=0;'}
  $labelWidth=if($a -eq $b){260}else{[Math]::Min(600,[Math]::Abs((X $a)-(X $b))-24)}
  $maxChars=[Math]::Floor($labelWidth/7.4)
  $lines=[System.Collections.Generic.List[string]]::new(); $current=''
  foreach($word in ("$seq. $label" -split '\s+')) {
    if($current.Length -gt 0 -and ($current.Length+1+$word.Length) -gt $maxChars){$lines.Add($current);$current=$word}
    elseif($current.Length -gt 0){$current+=' '+$word}else{$current=$word}
  }
  if($current){$lines.Add($current)}
  $labelHeight=$lines.Count*18+8
  $labelX=if($a -eq $b){(X $a)+16}else{((X $a)+(X $b)-$labelWidth)/2}
  Cell ($lines -join "`n") 'text;html=0;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=none;fontColor=#000000;fontFamily=Arial;fontSize=14;align=center;verticalAlign=middle;spacing=0;' $labelX $y $labelWidth $labelHeight
  $script:y+=$labelHeight+5
  $startY=$y
  if($a -eq $b) { Line (X $a) $y (X $b) ($y+26) '' $style $true; $script:y+=65 }
  else { Line (X $a) $y (X $b) $y '' $style; $script:y+=40 }
  if($overviewMode -and $a -ne $b) {
    if($return -and $running.ContainsKey($a)) {
      Cell '' 'rounded=0;fillColor=#FFFFFF;strokeColor=#000000;activation=1;' ((X $a)-5) $running[$a] 10 ($startY-$running[$a]+4)
      $running.Remove($a)
    } elseif(-not $return -and $b -ne 0 -and $label -notmatch 'to refresh list' -and -not $running.ContainsKey($b)) {
      $running[$b]=$startY
    }
  } elseif(-not $return -and $b -ne 0) {
    Cell '' 'rounded=0;fillColor=#FFFFFF;strokeColor=#000000;activation=1;' ((X $b)-5) $startY 10 $(if($a -eq $b){45}else{30})
  }
}
function N($text) { Cell $text 'shape=note;html=0;whiteSpace=wrap;fillColor=#FBF5EB;strokeColor=#EEDFC6;fontColor=#1A1612;fontSize=14;align=left;spacing=12;' 65 $y ($width-130) 75; $script:y+=100 }
function Begin($key,$label) { $script:frames[$key]=@($y,$label); $script:y+=65 }
function Else($label) { Line 45 $y ($width-45) $y '' 'endArrow=none;dashed=1;strokeColor=#B88E4F;'; Cell $label 'text;html=0;fontSize=14;fontStyle=1;align=left;fillColor=#FAF8F5;' 60 ($y+6) ($width-120) 35; $script:y+=80 }
function End($key) {
  $v=$script:frames[$key]
  Cell '' 'rounded=0;fillColor=none;strokeColor=#B88E4F;' 40 $v[0] ($width-80) ($y-$v[0]+15)
  Cell $v[1] 'rounded=0;html=0;whiteSpace=wrap;fillColor=#F3EFE6;strokeColor=#B88E4F;fontSize=14;fontStyle=1;align=left;spacingLeft=10;' 40 $v[0] ($width-80) 40
  $script:y+=50
}
function Finish {
  for($i=0;$i -lt $participants.Count;$i++) {
    Line (X $i) 200 (X $i) ($y+30) '' 'endArrow=none;dashed=1;strokeColor=#000000;lifeline=1;'
    $life=$root.LastChild
    [void]$root.InsertAfter($life,$root.SelectSingleNode('mxCell[@id="1"]'))
  }
  foreach($activation in @($root.SelectNodes('mxCell[contains(@style,"activation=1")]'))) {
    $lifelines=$root.SelectNodes('mxCell[contains(@style,"lifeline=1")]')
    [void]$root.InsertAfter($activation,$lifelines[$lifelines.Count-1])
  }
  $model.SetAttribute('background','#FFFFFF')
  $model.SetAttribute('pageHeight',[string]($y+100))
}
$overview=@('Shop Manager','CommissionRulesPage','CommissionRulesController','CommissionRulesService','Prisma / PostgreSQL')
Page '00 - Configure revenue milestones' 'Main scenario | Independent user actions shown in chronological example order | English / monochrome UML' $overview
N 'Precondition: authenticated Shop Manager with access to the selected Store. HTTP calls use commissionRulesService API client; StoreOwnerGuard and DTO Pipes run before Controller methods. These shared steps are omitted here and expanded on Page 01.'
M 0 1 'Open bonus configuration'
M 1 2 'GET rules'
M 2 3 'findAll(storeId)'
M 3 4 'Verify Store; read non-deleted rules'
M 4 3 'Rules sorted by revenue threshold' $true
M 3 2 'Rule list' $true
M 2 1 'Rule list' $true
M 1 0 'Display milestones' $true
Begin 'create-overview' 'opt [Add milestone]'
M 0 1 'Click Add milestone'
M 1 0 'Show empty form' $true
M 0 1 'Enter details and click Save'
M 1 2 'POST rule (formData)'
M 2 3 'create(storeId, dto, actor, IP)'
M 3 3 'Validate values'
M 3 4 'BEGIN; lock Store; read existing rules'
M 4 3 'Existing thresholds and rates' $true
M 3 3 'Check duplicate threshold and rate order'
M 3 4 'Insert rule and audit; COMMIT'
M 4 3 'Created rule' $true
M 3 2 'Created rule' $true
M 2 1 '201 Created' $true
M 1 0 'Close form; display success' $true
M 1 2 'GET rules to refresh list'
N 'ref: Page 03 for full create branches, validation errors and transaction rollback. Refresh uses the same read interaction shown above.'
End 'create-overview'
Begin 'edit-overview' 'opt [Edit milestone]'
M 0 1 'Click Edit on selected rule'
M 1 0 'Show populated form' $true
M 0 1 'Change details and click Save'
M 1 2 'PATCH rule (ruleId, formData)'
M 2 3 'update(storeId, ruleId, dto, actor, IP)'
M 3 4 'Verify Store; read current rule'
M 4 3 'Current rule' $true
M 3 3 'Validate merged values'
M 3 4 'BEGIN; read other rules'
M 4 3 'Other thresholds and rates' $true
M 3 3 'Check duplicate threshold and rate order'
M 3 4 'Update rule (version + 1) and audit; COMMIT'
M 4 3 'Updated rule' $true
M 3 2 'Updated rule' $true
M 2 1 '200 OK' $true
M 1 0 'Close form; display success' $true
M 1 2 'GET rules to refresh list'
N 'ref: Page 04 for full update branches. No new RuleVersion record is created; the same rule row is updated.'
End 'edit-overview'
N 'Additional independent interactions: toggle/delete/restore on Page 05, preview on Page 06, settlement/payment on Pages 07-08. This overview shows successful create/update scenarios; it is not a requirement to create before editing.'
Finish
$standard=@('Shop Manager','CommissionRulesPage','commissionRulesService (API client)','NestJS request pipeline','CommissionRulesController','CommissionRulesService','Prisma / PostgreSQL')
function Request($verb,$method) {
  M 2 3 $verb
  N 'ref: Page 01 - StoreOwnerGuard and Pipes run before the controller. Any rejection terminates this request; no service mutation follows.'
  M 3 4 $method
}
function Result($text) { M 5 4 $text $true; M 4 2 'HTTP response through global interceptor / exception filter' $true; M 2 1 'Unwrap response or propagate error' $true }

Page '01 - Authorization and validation' 'Shared interaction for all /api/stores/:storeId/commission-rules routes. Runtime source snapshot: 2026-10-16.' @('API client','StoreOwnerGuard','JwtService','Prisma / PostgreSQL','NestJS Pipes','CommissionRulesController')
M 0 1 'Request with route parameters and Bearer token'
Begin 'jwt' 'opt [request.user is absent]'
M 1 1 'Require correctly formatted Bearer header'
Begin 'headerfail' 'break [missing or malformed Bearer header]'; M 1 0 '401 Unauthorized; terminate request' $true; End 'headerfail'
M 1 2 'verify(token)'; M 2 1 'payload with sub, or verification error' $true
Begin 'tokenfail' 'break [verification failed or payload.sub is missing]'; M 1 0 '401 Unauthorized; terminate request' $true; End 'tokenfail'
M 1 3 'user.findUnique(id = payload.sub)'; M 3 1 'User or null' $true
Begin 'authfail' 'break [user not found]'
M 1 0 '401 Unauthorized; terminate request' $true
End 'authfail'
End 'jwt'
M 1 1 'Reject deleted or inactive account'
Begin 'blocked' 'break [account deleted or inactive]'; M 1 0 '403 Forbidden; terminate request' $true; End 'blocked'
M 1 3 'store.findUnique(storeId)'; M 3 1 'Store or null' $true
Begin 'missing' 'break [storeId missing, Store absent or deleted]'; M 1 0 '404 Not Found; terminate request' $true; End 'missing'
Begin 'rights' 'alt [preview request]'
M 1 1 'Allow authenticated active user to preview'
Else '[SYSTEM_ADMIN and method = GET]'; M 1 1 'Allow read-only access'
Else '[SHOP_MANAGER owns Store OR matches either hard-coded demo user ID]'; M 1 1 'Allow management request'
Else '[otherwise]'; M 1 0 '403 Forbidden; terminate this branch' $true
End 'rights'
N 'Only allowed branches continue below. Demo-user bypass is ID-based; the guard does not wrap it in an environment check.'
M 1 4 'Continue NestJS pipeline'
M 4 4 'ParseUUIDPipe + DTO validation/transform where declared'
Begin 'dto' 'alt [validation fails]'; M 4 0 '400 Bad Request; controller is not called' $true
Else '[valid]'; M 4 5 'Invoke matching controller method'; End 'dto'
N 'ValidationPipe: whitelist=true, transform=true, forbidNonWhitelisted=true. GET routes without a DTO do not acquire additional DTO validation.'
Finish

Page '02 - Load configuration' 'Initial page load and list/history reads. Abbreviated authentication lookup; exact FR-09 read path is shown.' $standard
M 0 1 'Open /merchant/commission-rules'
M 1 1 'Read token, user and current_store_id from localStorage'
N 'With a token: GET /auth/me to select a user Store. Missing token or failed lookup uses the hard-coded fallback Store ID. This does not bypass backend authorization.'
M 1 2 'getRules(effectiveStoreId)'
Request 'GET /api/stores/:storeId/commission-rules' 'findAll(storeId)'
M 4 5 'findAll(storeId)'; M 5 6 'verifyStoreExists; findMany(storeId, isDeleted=false, orderBy minMonthlyRevenue asc)'
M 6 5 'Rules including inactive rules' $true; Result 'Rule list; Decimal fields serialized to strings'
M 1 0 'Render milestone cards and active/inactive states' $true
M 1 2 'getSettlementHistory(storeId, selected YYYY-MM)'
Request 'GET .../commission-rules/history?yearMonth=YYYY-MM' 'getSettlementHistory(storeId, yearMonth)'
M 4 5 'getSettlementHistory(storeId, yearMonth)'; M 5 6 'Read Store settlement history and collaborator details'; M 6 5 'Results' $true; Result 'Settlement history'
N 'List and history requests may overlap in React; vertical order here is explanatory, not an enforced serial dependency. getRule/:ruleId also exists, but edit uses the selected rule already loaded in the page.'
Finish

Page '03 - Create milestone' 'Primary FR-09 configuration use case. Monetary values are sent as strings; create form does not send effectiveFrom/effectiveTo.' $standard
M 0 1 'Click Add milestone; enter name, threshold, KPI bonus, rate and active state'
M 1 2 'handleCreate -> createRule(storeId, trimmed formData)'
Request 'POST /api/stores/:storeId/commission-rules' 'create(storeId, dto, req)'
M 4 5 'create(storeId, dto, req.user.id, request IP)'
M 5 6 'verifyStoreExists(storeId)'; M 6 5 'Store or 404' $true
M 5 5 'Parse Decimal; validate threshold > 0, KPI >= 0, rate 0..100, trimmed name and date range'
Begin 'invalid' 'break [business input invalid]'; Result '400 Bad Request; no write'; End 'invalid'
M 5 6 'BEGIN $transaction; pg_advisory_xact_lock(hash derived from storeId)'
M 5 6 'findFirst(same Store + threshold, isDeleted=false)'
M 6 5 'Existing rule or null' $true
Begin 'dup' 'break [duplicate threshold]'; M 5 6 'ROLLBACK by thrown exception'; Result '409 Conflict'; End 'dup'
M 5 6 'findMany(storeId, isDeleted=false)'; M 6 5 'All non-deleted rules, including inactive rules' $true
M 5 5 'Check non-decreasing bonusPercentage as threshold increases'
Begin 'hierarchy' 'break [rate hierarchy invalid]'; M 5 6 'ROLLBACK'; Result '400 Bad Request'; End 'hierarchy'
M 5 6 'commissionRule.create(version=1; isActive defaults true; effectiveFrom defaults now)'
M 6 5 'Created rule' $true
M 5 6 'auditLog.create(CREATE_COMMISSION_RULE, rule details, actor, IP)'
M 5 6 'COMMIT'; Result '201 Created; rule with Decimal fields as strings'
M 1 1 'Show success; close modal; reset form'
M 1 2 'loadRules -> getRules(storeId)'
N 'ref: Page 02 for refreshed list. Rule changes also trigger the debounced preview (Page 06). Any write/audit failure inside the transaction rolls back both writes; UI displays the error and retains the form.'
Finish

Page '04 - Update milestone' 'Updates the same CommissionRule row. There is no RuleVersion entity and no advisory lock in this update implementation.' $standard
M 0 1 'Edit an existing milestone and submit'
M 1 2 'handleUpdate -> updateRule(storeId, editingRule.id, formData)'
Request 'PATCH /api/stores/:storeId/commission-rules/:ruleId' 'update(storeId, ruleId, dto, req)'
M 4 5 'update(storeId, ruleId, dto, userId, IP)'
M 5 6 'Verify Store'
M 5 5 'Reject empty DTO or blank supplied name (400; stop on failure)'
M 5 6 'Read currentRule(id, storeId, isDeleted=false)'; M 6 5 'Current rule or null' $true
M 5 5 'Require existing rule (404); merge values; validate money and effective dates'
Begin 'bad' 'break [missing rule or invalid input]'; Result '404 Not Found / 400 Bad Request'; End 'bad'
M 5 6 'BEGIN $transaction'
M 5 6 'If threshold supplied: check duplicates excluding ruleId'
M 5 6 'Read other non-deleted rules; validate rate hierarchy'
Begin 'conflict' 'break [duplicate threshold / hierarchy violation]'; M 5 6 'ROLLBACK'; Result '409 Conflict / 400 Bad Request'; End 'conflict'
M 5 6 'commissionRule.update(fields, version=currentRule.version+1, updatedBy)'
M 6 5 'Updated rule' $true
M 5 6 'auditLog.create(UPDATE_COMMISSION_RULE, oldValues + newValues)'
M 5 6 'COMMIT'; Result '200 OK; updated rule'
M 1 1 'Close edit modal; show success'; M 1 2 'loadRules()'
N 'ref: Pages 02 and 06. A transaction failure rolls back update and audit together. effectiveFrom/effectiveTo exist in backend DTOs, but the current UI update payload does not send them.'
Finish

Page '05 - Toggle, delete and restore' 'Three independent requests. Restore is an existing API/client capability; CommissionRulesPage has no restore handler/button.' $standard
Begin 'toggle' 'opt [Shop toggles active state]'
M 0 1 'Toggle milestone'; M 1 2 'updateStatus(storeId, ruleId, !rule.isActive)'
Request 'PATCH .../commission-rules/:ruleId/status' 'updateStatus(storeId, ruleId, dto, req)'
M 4 5 'updateStatus(..., dto.isActive, userId, IP)'; M 5 6 'Verify Store; read non-deleted rule scoped to Store'
M 5 6 'BEGIN; update isActive, version+1 and updatedBy'
M 5 6 'Audit UPDATE_COMMISSION_RULE_STATUS; COMMIT'; Result '200 OK; status and message'; M 1 2 'loadRules()'; End 'toggle'
Begin 'delete' 'opt [Shop confirms deletion]'
M 0 1 'Confirm Delete'; M 1 2 'deleteRule(storeId, ruleId)'
Request 'DELETE .../commission-rules/:ruleId' 'remove(storeId, ruleId, req)'
M 4 5 'remove(storeId, ruleId, userId, IP)'; M 5 6 'Verify Store; read non-deleted rule scoped to Store'
M 5 6 'BEGIN; update isDeleted=true, isActive=false, deletedAt=now, updatedBy'
M 5 6 'Audit DELETE_COMMISSION_RULE; COMMIT'; Result '200 OK; success'
M 1 1 'Close confirmation; show success'; M 1 2 'loadRules()'; End 'delete'
Begin 'restore' 'opt [authorized API caller requests restoration; not a current page action]'
Request 'POST .../commission-rules/:ruleId/restore' 'restore(storeId, ruleId, req)'
M 4 5 'restore(storeId, ruleId, userId, IP)'; M 5 6 'Verify Store; find rule with isDeleted=true'
M 5 6 'BEGIN; check non-deleted rule with same threshold'
Begin 'duplicate' 'break [threshold already occupied]'; M 5 6 'ROLLBACK'; Result '409 Conflict'; End 'duplicate'
M 5 6 'update isDeleted=false, isActive=true, deletedAt=null, version+1'
M 5 6 'Audit RESTORE_COMMISSION_RULE; COMMIT'; Result '200 OK; success'; End 'restore'
N 'All three operations return 404 for a missing or incorrectly scoped target and rollback on transaction failure. Delete does not increment version. Restore checks duplicate threshold but does not re-run the create/update rate hierarchy check.'
Finish

Page '06 - Preview bonus' 'Read-only simulation; automatically refreshed after 400 ms debounce. No MonthlyBonusResult or wallet write.' $standard
M 0 1 'Enter simulated monthly revenue (or change a rule)'
M 1 1 'useEffect debounce 400 ms; reject empty, non-numeric or negative input locally'
M 1 2 'previewBonus(storeId, monthlyRevenue)'
Request 'POST .../commission-rules/preview' 'previewBonus(storeId, dto)'
M 4 5 'previewBonus(storeId, dto.monthlyRevenue || dto.revenue || 0)'
M 5 6 'Verify Store; findMany(non-deleted rules, threshold ascending)'; M 6 5 'Rules' $true
M 5 5 'calculateProgressiveBonus: filter active and currently effective rules'
M 5 5 'Reached rules = revenue >= minMonthlyRevenue'
Begin 'calc' 'alt [no reached rule]'; M 5 5 'highestReachedRule=null; rangeBonuses=[]; totalBonus=0'
Else '[at least one reached rule]'; M 5 5 'Use achievementBonus of highest reached rule only'
Begin 'ranges' 'loop [each reached threshold]'; M 5 5 'to = next reached threshold or revenue; rangeRevenue = to - threshold'
M 5 5 'If positive: bonus = rangeRevenue * rate / 100; Decimal ROUND_HALF_UP to 2 places'; End 'ranges'
M 5 5 'totalBonus = highest KPI bonus + sum(range bonuses)'; End 'calc'
Result 'Preview result: highestReachedRule, achievementBonus, rangeBonuses, totalBonus, formula'
M 1 0 'Display calculated reward and formula' $true
N 'Current UI logs preview failures to the console rather than setting the main error banner. Example: 60M revenue, 50M threshold, KPI=0, rate=2% gives 200,000 VND, not 2% of the full 60M.'
Finish

Page '07 - Settle monthly bonus' 'Extended existing FR-09 lifecycle. Triggered by Shop action, not a discovered monthly cron. Endpoint: POST .../commission-rules/settle.' $standard
M 0 1 'Select year/month, enter KOL UUID, click Settle'
M 1 2 'settleMonthlyBonus(storeId, collaboratorId, yearMonth)'
Request 'POST .../commission-rules/settle' 'settleMonthlyBonus(storeId, dto, req)'
M 4 5 'settleMonthlyBonus(..., dto.allowUnfinishedMonth)'
M 5 6 'Verify Store and active, non-deleted COLLABORATOR'
M 5 5 'Validate month range in UTC+7; reject future or unfinished month by default'
Begin 'bad' 'break [invalid collaborator, Store or month]'; Result '400 / 404'; End 'bad'
M 5 6 'BEGIN; findUnique(storeId + collaboratorId + yearMonth)'
Begin 'settled' 'alt [existing settlement]'; M 6 5 'Saved settlement' $true; Result 'isAlreadySettled=true; keep saved result'
Else '[not yet settled]'
M 5 5 'calculateValidMonthlyRevenue(..., tx)'
M 5 6 'Verify KOL-Store affiliation; query COMPLETED orders by completedAt in month'
M 6 5 'Orders and COMPLETED refunds; possible mid-month rule-change cutoff' $true
M 5 5 'Sum positive finalAmount minus capped refund; shipping is not separately deducted'
M 5 6 'Read non-deleted Store commission rules'
Begin 'split' 'alt [splitRevenue has positive revenue before and after cutoff]'
M 5 5 'Calculate both parts with current rules; grossBonus = before.totalBonus + after.totalBonus'
Else '[no split]'; M 5 5 'calculateProgressiveBonus(rules, validRevenue, monthEnd, monthStart)'; End 'split'
M 5 6 'Read PENDING BonusAdjustment for Store + KOL + target month'
M 5 5 'netBonus = max(0, grossBonus + totalAdjustment)'
M 5 6 'Mark adjustments APPLIED; create MonthlyBonusResult PENDING with snapshot'
M 5 6 'Audit SETTLE_MONTHLY_BONUS; COMMIT'; Result 'isAlreadySettled=false; PENDING result'; End 'settled'
M 1 2 'loadHistory()'
N 'Current limitations: cutoff audit lookup is not filtered by Store; split calculation does not reconstruct old rules and may count KPI twice. Unique key prevents duplicate records, but a concurrent unique violation has no dedicated idempotent retry handler. UI does not send allowUnfinishedMonth.'
Finish

Page '08 - Approve and pay bonus' 'Two explicit Shop actions. Wallet credit is a database transaction, not an external bank transfer.' @('Shop Manager','CommissionRulesPage / API client','Guard + Pipes + Controller','CommissionRulesService','WalletsService','Prisma / PostgreSQL')
M 0 1 'Approve PENDING settlement'; M 1 2 'PATCH .../settlements/:settlementId/approve'
N 'ref: Page 01. Controller delegates with storeId, settlementId, actor ID and IP.'
M 2 3 'approveSettlement(...)'; M 3 5 'Verify Store; find settlement scoped to Store'; M 5 3 'Settlement or null' $true
Begin 'invalid' 'break [missing settlement or status is not PENDING]'; M 3 1 '404 / 400 via controller and API client' $true; End 'invalid'
M 3 5 'update status=APPROVED, approvedAt=now'
M 3 5 'auditLog.create(APPROVE_MONTHLY_BONUS)'
N 'Actual code: approve update and audit are separate writes without an enclosing transaction. If audit fails, APPROVED may already be persisted.'
M 3 1 'Success via controller; loadHistory()' $true
M 0 1 'Pay approved bonus into wallet'; M 1 2 'POST .../settlements/:settlementId/payout'; M 2 3 'payoutSettlement(...) after Guard/Pipes'
M 3 5 'Verify Store; BEGIN; read settlement scoped to Store'
Begin 'notpayable' 'break [missing, already PAID/paidAt/walletTransactionId, or not APPROVED]'; M 3 5 'ROLLBACK'; M 3 1 '404 / 400 via controller' $true; End 'notpayable'
M 3 5 'updateMany WHERE APPROVED AND paidAt=null AND walletTransactionId=null -> PAID, paidAt'
Begin 'race' 'break [updated count = 0]'; M 3 5 'ROLLBACK'; M 3 1 '400: concurrent payment or invalid state' $true; End 'race'
M 3 4 'creditAvailableBalance(tx, collaboratorId, bonusAmount, MONTHLY_BONUS reference, storeId)'
M 4 5 'Lock/update wallet and write FinancialLedger in same transaction'
M 5 4 'wallet + ledger' $true; M 4 3 'wallet + ledger' $true
M 3 5 'Save walletTransactionId=ledger.id; audit PAYOUT_MONTHLY_BONUS_TO_WALLET'
M 3 5 'COMMIT'; M 3 1 'PAID result and ledger via controller; loadHistory()' $true
N 'Any failure inside payout transaction rolls back the PAID transition, wallet mutation, ledger and audit. This diagram describes the implemented path and does not imply every amount, including zero, has been runtime-tested.'
Finish

Page '09 - Refund adjustment API' 'Backend extension: POST .../commission-rules/adjustments/refund. No refund action is implemented in CommissionRulesPage.' @('Authorized Shop API caller','Guard + Pipes + Controller','CommissionRulesService','WalletsService','Prisma / PostgreSQL')
M 0 1 'RefundOrderDto(orderId, refundAmount, reason)'
N 'ref: Page 01 authorization and DTO checks; controller calls handleRefundAdjustment(storeId, orderId, refundAmount, reason, actor, IP).'
M 1 2 'handleRefundAdjustment(...)'
M 2 4 'Verify Store; read order belonging to Store'
M 2 2 'Require positive valid refund; require attributed KOL; determine order month'
Begin 'input' 'break [invalid refund / missing order / no KOL]'; M 2 0 '400 / 404 via controller' $true; End 'input'
M 2 4 'BEGIN; SELECT order FOR UPDATE; re-read order'
Begin 'excess' 'break [accumulated refund would exceed finalAmount]'; M 2 4 'ROLLBACK'; M 2 0 '400 via controller' $true; End 'excess'
M 2 4 'Create COMPLETED OrderRefund; increment order.refundedAmount'
M 2 4 'Adjust applicable coupon and stacked-voucher redemptions/budgets; release campaign reservations'
M 2 4 'Reduce OrderItem commission amounts; read order Commissions'
Begin 'comm' 'loop [PENDING or APPROVED commission]'
M 2 4 'Full refund: amount=0, REVERSED; partial: reduce remaining amount'
M 2 3 'If reversal > 0: reversePendingBalance or reverseAvailableBalance(tx, ...)'
M 3 4 'Reverse appropriate wallet bucket and write ledger in shared transaction'; End 'comm'
M 2 4 'Find MonthlyBonusResult for original order month'
Begin 'past' 'opt [past settlement exists]'
M 2 2 'calculateValidMonthlyRevenue(..., tx) after refund'
M 2 4 'Read current non-deleted rules'
M 2 2 'Recalculate at original month end; overpaid = saved bonusAmount - recalculated bonus'
Begin 'overpaid' 'opt [overpaid > 0]'
M 2 4 'Find first unsettled month starting current Vietnam month (loop capped at 36)'
M 2 4 'Create PENDING BonusAdjustment(amount=-overpaid, refundId, originalSettlementId)'; End 'overpaid'; End 'past'
M 2 4 'Audit PROCESS_ORDER_REFUND_ADJUSTMENT; COMMIT'
M 2 0 'Refund and optional adjustment via controller' $true
N 'Original settlement is not changed. Adjustment is applied by a later settlement (Page 07). Code uses current rules rather than historical snapshot; this flow does not establish correctness for repeated refund adjustments. Related coupon/commission mechanics are grouped, not expanded into separate modules.'
Finish

Page '10 - KOL progress and history' 'Related existing read-only experience. Uses CollaboratorCommissionRulesController and JWT/role guards, not StoreOwnerGuard.' @('Collaborator (KOL)','KolBonusProgressPage / API client','JwtAuthGuard + RolesGuard + Pipes','CollaboratorCommissionRulesController','CommissionRulesService','Prisma / PostgreSQL')
M 0 1 'Open bonus progress page'
M 1 2 'GET /api/collaborator/stores?discovery=false'
M 2 3 'Allow authenticated COLLABORATOR; otherwise reject request'
M 3 4 'getCollaboratorStores(req.user.id, false)'
M 4 5 'Query affiliated Store candidates'; M 5 4 'Store list' $true
M 4 1 'Return through controller; select first Store when list is not empty' $true
M 0 1 'Select Store and month'
M 1 2 'GET /api/collaborator/stores/:storeId/bonus-progress?yearMonth=YYYY-MM'
M 2 3 'Validate authentication, role and UUID'
M 3 4 'getKolProgress(storeId, req.user.id, yearMonth)'
N 'collaboratorId comes from the authenticated request, never from a client-supplied KOL ID. Service validation errors stop this request; the current page shows a progress error unless its optional mock-demo fallback is enabled.'
M 4 5 'Verify Store'
M 4 4 'Default month if omitted; calculateValidMonthlyRevenue(...)'
M 4 5 'Validate KOL and affiliation; query completed orders and refunds'
M 4 5 'Read non-deleted Store rules in threshold order'
M 4 4 'calculateProgressiveBonus using full monthly revenue and month boundaries'
M 4 4 'Filter active/effective milestones; determine next milestone and missing revenue'
M 4 5 'Read Store display data, existing settlement and target-month adjustments'
M 4 4 'Use saved settlement status; otherwise ACCUMULATING or PENDING_SETTLEMENT'
M 4 1 'Return progress, estimated bonus, milestones, settlement and adjustments via controller' $true
M 1 0 'Render current progress, next milestone and reward details' $true
M 0 1 'Open history tab'
M 1 2 'GET /api/collaborator/bonus-history with optional Store/month filters'
M 2 3 'Allow authenticated COLLABORATOR'
M 3 4 'getKolSettlementHistory(req.user.id, storeId, yearMonth)'
M 4 5 'Read settlements scoped to authenticated collaborator'
M 5 4 'History results' $true; M 4 1 'Return through controller; render history' $true
N 'Read-only: no settlement or wallet mutation. estimatedTotalBonus is the current gross calculation; adjustments and saved settlement amount are separate response fields. This progress method does not reproduce the splitRevenue branch used during settlement.'
Finish

$output=Join-Path $PSScriptRoot 'FR09_Sequence_Diagrams_EN.drawio'
# User-requested monochrome presentation overrides the site branding palette.
foreach($cell in $doc.SelectNodes('//mxCell[@style]')) {
  $style=$cell.GetAttribute('style')
  $style=$style -replace '(fillColor|labelBackgroundColor)=#[0-9A-Fa-f]{6}', '$1=#FFFFFF'
  $style=$style -replace '(strokeColor|fontColor)=#[0-9A-Fa-f]{6}', '$1=#000000'
  $cell.SetAttribute('style',$style+'fontFamily=Arial;')
}
$doc.Save($output)
$doc.Save((Join-Path $PSScriptRoot 'FR09_Configure_Monthly_Revenue_Bonus_Milestones_Sequence_Diagram.drawio'))
$verify=[xml](Get-Content -LiteralPath $output -Raw)
$ids=@{}; foreach($page in $verify.mxfile.diagram) {
  $ids.Clear()
  foreach($c in $page.mxGraphModel.root.mxCell) { if($ids.ContainsKey($c.id)){throw "Duplicate cell ID: $($c.id)"}; $ids[$c.id]=$true }
}
Write-Output "Created and XML-validated: $output"
Write-Output "Pages: $($verify.mxfile.diagram.Count)"
