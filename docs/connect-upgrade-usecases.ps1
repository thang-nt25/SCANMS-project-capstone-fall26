$ErrorActionPreference='Stop'
$path=Join-Path $PSScriptRoot 'SCANMS_USE_CASE_HAI_CACH_MUA_CO_BILL_THANH_TOAN.drawio'
$raw=[IO.File]::ReadAllText($path);[xml]$doc=$raw
$root=$doc.mxfile.diagram[0].mxGraphModel.root
$before=@{};foreach($c in $root.mxCell){$before[$c.id]=$c.OuterXml}
$changed=[System.Collections.Generic.HashSet[string]]::new()
function Geo($c,$x,$y,$w=280,$h=58){$g=$c.mxGeometry;foreach($kv in @{x="$x";y="$y";width="$w";height="$h"}.GetEnumerator()){$g.SetAttribute($kv.Key,$kv.Value)}}
function ResetEdge($e,$s,$t,$style,$points=''){$e.SetAttribute('source',$s);$e.SetAttribute('target',$t);$e.SetAttribute('style',$style);$e.mxGeometry.InnerXml=$points;[void]$changed.Add($e.id)}
$line='html=0;endArrow=none;startArrow=none;strokeColor=#000000;strokeWidth=1.5;'
$include='html=0;endArrow=open;endFill=0;dashed=1;strokeColor=#000000;fontColor=#000000;fontSize=12;labelBackgroundColor=#FFFFFF;'
foreach($c in @($root.mxCell|Where-Object {$_.id -match '^(note_review_(shop|kol)_upgrade|annotation_review_(shop|kol))$'})){[void]$changed.Add($c.id);[void]$root.RemoveChild($c)}
foreach($kind in @('shop','kol')){
 $baseY=if($kind -eq 'shop'){1510}else{1990}
 $submit=$root.SelectSingleNode("mxCell[@id='uc_register_${kind}_account']");Geo $submit 1290 $baseY;[void]$changed.Add($submit.id)
 $review=$root.SelectSingleNode("mxCell[@id='uc_review_${kind}_upgrade']");Geo $review 1290 ($baseY+130);[void]$changed.Add($review.id)
 $main=$submit.CloneNode($true);$main.SetAttribute('id',"uc_apply_${kind}_upgrade");$main.SetAttribute('value',$(if($kind -eq 'shop'){'Đăng ký nâng cấp thành chủ Shop'}else{'Đăng ký nâng cấp thành KOL/CTV'}));Geo $main 940 ($baseY+65) 260 64;[void]$root.AppendChild($main)
 $buyerEdge=$root.SelectSingleNode("mxCell[@id='assoc_visitor_register_$kind']")
 ResetEdge $buyerEdge 'act_buyer_auth' $main.id ($line+'edgeStyle=orthogonalEdgeStyle;entryX=0;entryY=0.5;') "<Array as='points'><mxPoint x='2100' y='2630'/><mxPoint x='910' y='2630'/><mxPoint x='910' y='$($baseY+97)'/></Array>"
 foreach($pair in @(@('submit',$submit.id),@('review',$review.id))){
  $e=$buyerEdge.CloneNode($true);$e.SetAttribute('id',"include_${kind}_$($pair[0])");$e.SetAttribute('value','«include»');ResetEdge $e $main.id $pair[1] $include;[void]$root.AppendChild($e)
 }
 foreach($actor in @('act_sysadmin','act_sysmanager')){
  $e=$root.SelectSingleNode("mxCell[@id='assoc_${actor}_review_$kind']")
  $lane=if($actor -eq 'act_sysadmin'){1650}else{1680}
  ResetEdge $e $actor $review.id ($line+'edgeStyle=orthogonalEdgeStyle;entryX=1;entryY=0.5;') "<Array as='points'><mxPoint x='$lane' y='980'/><mxPoint x='$lane' y='$($baseY+159)'/></Array>"
 }
}
# Rebuild the previously added detail page with precisely the same relationships.
$detail=$doc.SelectSingleNode("//diagram[@id='upgrade-review-detail']")
$dr=$detail.mxGraphModel.root
foreach($c in @($dr.mxCell|Where-Object { $_.id -notin @('0','1','detail_boundary','detail_buyer','detail_admin','detail_manager') })){[void]$dr.RemoveChild($c)}
foreach($kind in @('shop','kol')){
 $y=if($kind -eq 'shop'){220}else{590}
 foreach($role in @('apply','register','review')){
  $id=if($role -eq 'register'){"uc_register_${kind}_account"}else{"uc_${role}_${kind}_upgrade"}
  $c=$root.SelectSingleNode("mxCell[@id='$id']").CloneNode($true)
  if($role -eq 'apply'){Geo $c 300 ($y+50) 280 70}else{Geo $c 810 ($y+$(if($role -eq 'review'){130}else{0})) 330 70}
  [void]$dr.AppendChild($c)
 }
 $e=$root.SelectSingleNode("mxCell[@id='assoc_visitor_register_$kind']").CloneNode($true);ResetEdge $e 'detail_buyer' "uc_apply_${kind}_upgrade" $line;[void]$dr.AppendChild($e)
 foreach($part in @('submit','review')){$e=$root.SelectSingleNode("mxCell[@id='include_${kind}_$part']").CloneNode($true);[void]$dr.AppendChild($e)}
 foreach($a in @(@('act_sysadmin','detail_admin'),@('act_sysmanager','detail_manager'))){$e=$root.SelectSingleNode("mxCell[@id='assoc_$($a[0])_review_$kind']").CloneNode($true);ResetEdge $e $a[1] "uc_review_${kind}_upgrade" $line;[void]$dr.AppendChild($e)}
}
foreach($c in $root.mxCell){if($before.ContainsKey($c.id) -and -not $changed.Contains($c.id) -and $before[$c.id] -cne $c.OuterXml){throw "Unrelated change $($c.id)"}}
[IO.File]::Copy($path,$path+'.before-connected-upgrade-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.bak')
$doc.Save($path)
Write-Output 'Connected both upgrade processes using include; removed added notes; updated detail page. Unrelated overview cells preserved.'

