$ErrorActionPreference = 'Stop'
$base = Join-Path $PSScriptRoot 'SCANMS_USE_CASE_HAI_CACH_MUA_CO_BILL_THANH_TOAN.drawio'
[xml]$doc = Get-Content -Encoding UTF8 -LiteralPath $base -Raw
$original = $doc.mxfile.diagram[0]
$page = $original.CloneNode($true)
$page.SetAttribute('id','scanms-layout-zones')
$page.SetAttribute('name','01 - Bo cuc moi theo cum tac nhan')
$model = $page.mxGraphModel
$root = $model.root
$cells = @($root.mxCell)
$verts = @($cells | Where-Object vertex -eq '1')
$actors = @($verts | Where-Object style -Match 'umlActor')
$ucs = @($verts | Where-Object { $_.id -ne 'VnyrxFOrn7qXJp7Ggnoe-2' -and $_.style -notmatch 'umlActor' })
$edges = @($cells | Where-Object edge -eq '1')
$map = @{}; foreach($v in $verts) { $map[$v.id]=$v }
function Nearest($point,$candidates) {
 $best=$null; $dist=[double]::PositiveInfinity
 foreach($v in $candidates) {
  $g=$v.mxGeometry
  $dx=[math]::Max([math]::Max([double]$g.x-[double]$point.x,0),[double]$point.x-([double]$g.x+[double]$g.width))
  $dy=[math]::Max([math]::Max([double]$g.y-[double]$point.y,0),[double]$point.y-([double]$g.y+[double]$g.height))
  $n=$dx*$dx+$dy*$dy
  if($n -lt $dist) { $dist=$n; $best=$v.id }
 }; return $best
}
foreach($e in $edges) {
 foreach($end in @('source','target')) {
  if(-not $e.GetAttribute($end)) {
   $p=$e.mxGeometry.SelectSingleNode("mxPoint[@as='${end}Point']")
   if($null -ne $p) {
    $candidates=if($end -eq 'source' -or $e.style -match 'endArrow=block') {$actors} else {$ucs}
    $e.SetAttribute($end,(Nearest $p $candidates))
   }
  }
 }
}
# Explicitly retain the intended endpoints of the two loosely drawn inheritance lines.
($edges | Where-Object id -eq 'id_101').SetAttribute('source','act_auth')
($edges | Where-Object id -eq 'id_101').SetAttribute('target','act_kol')
($edges | Where-Object id -eq 'id_102').SetAttribute('source','act_auth')
($edges | Where-Object id -eq 'id_102').SetAttribute('target','act_shop')
$adj=@{}; foreach($u in $ucs) {$adj[$u.id]=[System.Collections.Generic.List[string]]::new()}
foreach($e in $edges) {if($adj.ContainsKey($e.source) -and $adj.ContainsKey($e.target)) {$adj[$e.source].Add($e.target); $adj[$e.target].Add($e.source)}}
$seen=@{}; $components=@()
foreach($u in ($ucs | Sort-Object { [double]$_.mxGeometry.y })) {
 if($seen[$u.id]) {continue}
 $queue=[System.Collections.Generic.Queue[string]]::new(); $queue.Enqueue($u.id); $members=@()
 while($queue.Count) {$id=$queue.Dequeue(); if($seen[$id]){continue}; $seen[$id]=$true; $members+=$id; foreach($n in $adj[$id]) {$queue.Enqueue($n)}}
 $votes=@{}; foreach($e in $edges) {if($e.source -in $actors.id -and $e.target -in $members) {if(-not $votes.ContainsKey($e.source)){$votes[$e.source]=0}; $votes[$e.source]++}}
 $owner=($votes.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key
 if(-not $owner) {$owner='act_kol'}
 $components+=,@{ owner=$owner; members=$members }
}
$order=@('act_auth','act_sysadmin','act_sysmanager','act_kol','act_shop','act_marketplace_visitor','act_payment','c5QiOaDY6uHg6HGGsvTC-8','act_buyer_auth')
$panelW=1500; $panelH=2700
$boundary=$map['VnyrxFOrn7qXJp7Ggnoe-2']; [void]$root.RemoveChild($boundary)
for($i=0;$i -lt $order.Count;$i++) {
 $aid=$order[$i]; $ox=($i%3)*$panelW; $row=[int][math]::Floor($i/3); $oy=@(0,1700,4900)[$row]; $zoneHeight=@(1580,3080,1580)[$row]
 $a=$map[$aid]; $a.mxGeometry.SetAttribute('x',"$($ox+50)"); $a.mxGeometry.SetAttribute('y',"$($oy+180)")
 $a.mxGeometry.SetAttribute('width','50'); $a.mxGeometry.SetAttribute('height','90')
 $b=$boundary.CloneNode($true); $b.SetAttribute('id',"zone_$i"); $b.SetAttribute('value',"SCANMS — $([regex]::Replace($a.value,'<[^>]+>',' ').Trim())")
 $b.SetAttribute('style','rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;spacingTop=16;fontSize=17;fontStyle=1;fillColor=#FFFFFF;strokeColor=#C59B58;fontColor=#231D15;')
 $b.mxGeometry.SetAttribute('x',"$($ox+210)"); $b.mxGeometry.SetAttribute('y',"$($oy+40)"); $b.mxGeometry.SetAttribute('width','1250'); $b.mxGeometry.SetAttribute('height',"$zoneHeight")
 [void]$root.InsertAfter($b,$root.mxCell[1])
 $y=$oy+130
 foreach($comp in ($components | Where-Object owner -eq $aid)) {
  $members=@($comp.members | Sort-Object { [double]$map[$_].mxGeometry.x })
  if($aid -in @('act_sysadmin','act_sysmanager','act_payment','c5QiOaDY6uHg6HGGsvTC-8','act_buyer_auth','act_marketplace_visitor')) {$members=@($members | Sort-Object { -[double]$map[$_].mxGeometry.x })}
  $main=$members[0]; $children=@($members | Select-Object -Skip 1)
  $height=[math]::Max(100,$children.Count*95)
  $g=$map[$main].mxGeometry; $g.SetAttribute('x',"$($ox+330)"); $g.SetAttribute('y',"$($y+($height-60)/2)"); $g.SetAttribute('width','250'); $g.SetAttribute('height','60')
  for($j=0;$j -lt $children.Count;$j++) {$g=$map[$children[$j]].mxGeometry; $g.SetAttribute('x',"$($ox+1020)"); $g.SetAttribute('y',"$($y+$j*95)"); $g.SetAttribute('width','270'); $g.SetAttribute('height','60')}
  $y+=$height+55
 }
}
foreach($e in $edges) {
 $g=$e.mxGeometry; $g.RemoveAll(); $g.SetAttribute('relative','1'); $g.SetAttribute('as','geometry')
 $style=$e.style -replace 'edgeStyle=[^;]*;','' -replace '(exit|entry)[XY]=[^;]*;',''
 $e.SetAttribute('style',"$style;edgeStyle=orthogonalEdgeStyle;rounded=0;jettySize=25;jumpStyle=arc;jumpSize=8;labelBackgroundColor=#FFFFFF;fontSize=11;")
}
$model.SetAttribute('pageWidth','4560'); $model.SetAttribute('pageHeight','6560'); $model.SetAttribute('background','#FAF8F5')
[void]$doc.mxfile.InsertBefore($page,$original)
$doc.mxfile.SetAttribute('pages',"$($doc.mxfile.diagram.Count)")
$out=Join-Path $PSScriptRoot 'SCANMS_USE_CASE_BO_CUC_CUM_DE_CHINH_DAY.drawio'
$doc.Save($out)
[xml]$check=Get-Content -Encoding UTF8 -LiteralPath $out -Raw
$new=$check.mxfile.diagram[0].mxGraphModel.root.mxCell
$bad=@($new | Where-Object { $_.edge -eq '1' -and (-not $_.source -or -not $_.target) })
Write-Output "Saved: $out"
Write-Output "Original vertices: $($verts.Count); new vertices: $(@($new | Where-Object vertex -eq '1').Count); edges: $($edges.Count); unanchored edges: $($bad.Count)"


