$ErrorActionPreference='Stop'
$path=Join-Path $PSScriptRoot 'SCANMS_USE_CASE_HAI_CACH_MUA_CO_BILL_THANH_TOAN.drawio'
[xml]$doc=Get-Content -Encoding UTF8 -LiteralPath $path -Raw
$before=@{};foreach($c in $doc.mxfile.diagram[0].mxGraphModel.root.mxCell){$before[$c.id]=$c.OuterXml}
function Put($r,$id,$x,$y,$w,$h){$c=$r.SelectSingleNode("mxCell[@id='$id']");foreach($kv in @{x="$x";y="$y";width="$w";height="$h"}.GetEnumerator()){$c.mxGeometry.SetAttribute($kv.Key,$kv.Value)}}
function Wire($r,$id,$target,$ports,$points){
 $e=$r.SelectSingleNode("mxCell[@id='$id']");$e.SetAttribute('target',$target)
 $e.SetAttribute('style',('html=0;edgeStyle=none;rounded=0;endArrow=none;startArrow=none;strokeColor=#000000;strokeWidth=1.5;jumpStyle=arc;jumpSize=8;'+$ports))
 $g=$e.mxGeometry;$g.RemoveAll();$g.SetAttribute('relative','1');$g.SetAttribute('as','geometry')
 if($points){$a=$doc.CreateElement('Array');$a.SetAttribute('as','points');foreach($p in $points){$n=$doc.CreateElement('mxPoint');$n.SetAttribute('x',"$($p[0])");$n.SetAttribute('y',"$($p[1])");[void]$a.AppendChild($n)};[void]$g.AppendChild($a)}
}
$pages=@($doc.mxfile.diagram[0],$doc.SelectSingleNode("//diagram[@id='upgrade-review-detail']"))
foreach($page in $pages){
 $r=$page.mxGraphModel.root
 foreach($c in @($r.mxCell|Where-Object { $_.id -match '^(uc_apply_(shop|kol)_upgrade|include_(shop|kol)_)' })){[void]$r.RemoveChild($c)}
 foreach($kind in @('shop','kol')){$r.SelectSingleNode("mxCell[@id='assoc_visitor_register_$kind']").SetAttribute('target',"uc_register_${kind}_account")}
}
$r=$pages[0].mxGraphModel.root
Put $r 'uc_register_shop_account' 1320 2460 280 58
Put $r 'uc_register_kol_account' 1320 2540 280 58
Put $r 'uc_review_shop_upgrade' 1070 620 290 60
Put $r 'uc_review_kol_upgrade' 1070 750 290 60
foreach($kind in @('shop','kol')){
 $shop=$kind -eq 'shop';$y=if($shop){2489}else{2569};$lane=if($shop){2010}else{2040};$cross=if($shop){2528}else{2630};$inner=if($shop){1630}else{1650}
 Wire $r "assoc_visitor_register_$kind" "uc_register_${kind}_account" 'exitX=0;exitY=0.5;entryX=1;entryY=0.5;' @(@($lane,2337.5),@($lane,$cross),@($inner,$cross),@($inner,$y))
 foreach($actor in @('act_sysadmin','act_sysmanager')){
  $admin=$actor -eq 'act_sysadmin';$cy=if($shop){612}else{737};$lane=if($admin){if($shop){1970}else{1990}}else{if($shop){2010}else{2030}}
  $inner=if($admin){1380}else{1400};$endY=if($shop){if($admin){635}else{665}}else{if($admin){765}else{795}}
  $start=if($admin){317.5}else{714.5};$ey=if($admin){'0.25'}else{'0.75'}
  if(-not $admin){$cy+=5}
  Wire $r "assoc_${actor}_review_$kind" "uc_review_${kind}_upgrade" "exitX=0;exitY=0.5;entryX=1;entryY=$ey;" @(@($lane,$start),@($lane,$cy),@($inner,$cy),@($inner,$endY))
 }
}
$r.SelectSingleNode("mxCell[@id='VnyrxFOrn7qXJp7Ggnoe-2']").mxGeometry.SetAttribute('height','2660')
$pages[0].mxGraphModel.SetAttribute('pageHeight','2760')
$r=$pages[1].mxGraphModel.root
$pages[1].SetAttribute('name','05 - Nop va duyet ho so (4 use case)')
Put $r 'detail_boundary' 220 50 1170 920
Put $r 'detail_buyer' 70 430 50 90
Put $r 'detail_admin' 1510 150 50 90
Put $r 'detail_manager' 1510 760 50 90
Put $r 'uc_register_shop_account' 320 240 310 80
Put $r 'uc_register_kol_account' 320 640 310 80
Put $r 'uc_review_shop_upgrade' 880 240 350 80
Put $r 'uc_review_kol_upgrade' 880 640 350 80
Wire $r 'assoc_visitor_register_shop' 'uc_register_shop_account' 'exitX=1;exitY=0.4;entryX=0;entryY=0.5;' @(@(170,466),@(170,280))
Wire $r 'assoc_visitor_register_kol' 'uc_register_kol_account' 'exitX=1;exitY=0.6;entryX=0;entryY=0.5;' @(@(190,484),@(190,680))
Wire $r 'assoc_act_sysadmin_review_shop' 'uc_review_shop_upgrade' 'exitX=0;exitY=0.4;entryX=1;entryY=0.25;' @(@(1320,186),@(1320,260))
Wire $r 'assoc_act_sysadmin_review_kol' 'uc_review_kol_upgrade' 'exitX=0;exitY=0.6;entryX=1;entryY=0.25;' @(@(1430,204),@(1430,660))
Wire $r 'assoc_act_sysmanager_review_shop' 'uc_review_shop_upgrade' 'exitX=0;exitY=0.4;entryX=1;entryY=0.75;' @(@(1270,796),@(1270,300))
Wire $r 'assoc_act_sysmanager_review_kol' 'uc_review_kol_upgrade' 'exitX=0;exitY=0.6;entryX=1;entryY=0.75;' @(@(1350,814),@(1350,700))
$root=$pages[0].mxGraphModel.root
foreach($c in $root.mxCell){if($c.id -notmatch '^(uc_(register|review)_(shop|kol)|assoc_visitor_register_|assoc_act_sys(admin|manager)_review_)' -and $c.id -ne 'VnyrxFOrn7qXJp7Ggnoe-2' -and $before[$c.id] -cne $c.OuterXml){throw "Unexpected change: $($c.id)"}}
foreach($page in $pages){$pr=$page.mxGraphModel.root;foreach($e in ($pr.mxCell|Where-Object { $_.id -match '^assoc_(visitor_register|act_sys(admin|manager)_review)' })){foreach($end in @('source','target')){if(-not $pr.SelectSingleNode("mxCell[@id='$($e.GetAttribute($end))']")){throw 'Missing endpoint'}}}}
$new=@($root.mxCell|Where-Object {$_.id -match '^uc_(register|review)_(shop|kol)'})
foreach($a in $new){foreach($b in ($root.mxCell|Where-Object { $_.vertex -eq '1' -and $_.id -ne $a.id -and $_.id -ne 'VnyrxFOrn7qXJp7Ggnoe-2' })){$g=$a.mxGeometry;$h=$b.mxGeometry;if([double]$g.x -lt [double]$h.x+[double]$h.width -and [double]$h.x -lt [double]$g.x+[double]$g.width -and [double]$g.y -lt [double]$h.y+[double]$h.height -and [double]$h.y -lt [double]$g.y+[double]$g.height){throw "Overlap: $($a.id) $($b.id)"}}}
[IO.File]::Copy($path,$path+'.before-four-usecases-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.bak');$doc.Save($path)
# Reuse the local preview renderer with the corrected focused-page nodes.
$renderer=Get-Content -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot 'tidy-upgrade-layout.ps1') -Raw
$renderer=$renderer.Substring($renderer.IndexOf('Add-Type -AssemblyName System.Drawing'))
Invoke-Expression $renderer
Write-Output 'Verified four use cases, six associations, no extra include edges, no shape overlaps, unrelated overview cells unchanged.'

