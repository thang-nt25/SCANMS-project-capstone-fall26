$ErrorActionPreference='Stop'
$path=Join-Path $PSScriptRoot 'SCANMS_USE_CASE_HAI_CACH_MUA_CO_BILL_THANH_TOAN.drawio'
$raw=[IO.File]::ReadAllText($path);[xml]$doc=$raw
if($doc.SelectSingleNode("//mxCell[@id='uc_review_shop_upgrade']")){throw 'Review use cases already exist.'}
$oval='ellipse;whiteSpace=wrap;html=0;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;fontSize=12;strokeWidth=1.5;'
$note='shape=note;whiteSpace=wrap;html=0;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;fontSize=11;align=left;spacing=8;'
$line='endArrow=none;startArrow=none;html=0;strokeColor=#000000;strokeWidth=1.5;'
function Cell($id,$label,$style,$x,$y,$w,$h){
 $c=$doc.CreateElement('mxCell');foreach($kv in @{id=$id;value=$label;style=$style;parent='1';vertex='1'}.GetEnumerator()){$c.SetAttribute($kv.Key,$kv.Value)}
 $g=$doc.CreateElement('mxGeometry');foreach($kv in @{x="$x";y="$y";width="$w";height="$h";as='geometry'}.GetEnumerator()){$g.SetAttribute($kv.Key,$kv.Value)};[void]$c.AppendChild($g);return $c
}
function Edge($id,$source,$target,$style,$points=''){
 $c=$doc.CreateElement('mxCell');foreach($kv in @{id=$id;source=$source;target=$target;style=$style;parent='1';edge='1'}.GetEnumerator()){$c.SetAttribute($kv.Key,$kv.Value)}
 $g=$doc.CreateElement('mxGeometry');$g.SetAttribute('relative','1');$g.SetAttribute('as','geometry');if($points){$g.InnerXml="<Array as='points'>$points</Array>"};[void]$c.AppendChild($g);return $c
}
$shopNote="Điều kiện: đã có hồ sơ mở Shop.`nNếu duyệt: cấp vai trò Shop Manager cho khách hàng; nếu từ chối: không cấp vai trò."
$kolNote="Điều kiện: đã có hồ sơ KOL/CTV.`nNếu duyệt: cấp vai trò Collaborator/KOL cho khách hàng; nếu từ chối: không cấp vai trò."
$added=@(
 (Cell 'uc_review_shop_upgrade' 'Duyệt / từ chối hồ sơ mở Shop' $oval 1080 180 280 58),
 (Cell 'note_review_shop_upgrade' $shopNote $note 1050 260 310 82),
 (Cell 'uc_review_kol_upgrade' 'Duyệt / từ chối hồ sơ KOL/CTV' $oval 1080 360 280 58),
 (Cell 'note_review_kol_upgrade' $kolNote $note 1050 440 310 82)
)
foreach($actor in @('act_sysadmin','act_sysmanager')){
 foreach($kind in @('shop','kol')){
  $targetY=if($kind -eq 'shop'){209}else{389}
  $lane=if($actor -eq 'act_sysadmin'){1990}else{2050}
  $cross=if($actor -eq 'act_sysadmin'){if($kind -eq 'shop'){125}else{280}}else{if($kind -eq 'shop'){615}else{965}}
  $inner=if($kind -eq 'shop'){1380}else{1400}
  $points="<mxPoint x='$lane' y='$cross'/><mxPoint x='$inner' y='$cross'/><mxPoint x='$inner' y='$targetY'/>"
  $added+=Edge "assoc_${actor}_review_$kind" $actor "uc_review_${kind}_upgrade" ($line+'edgeStyle=orthogonalEdgeStyle;entryX=1;entryY=0.5;') $points
 }
}
foreach($kind in @('shop','kol')){$added+=Edge "annotation_review_$kind" "uc_review_${kind}_upgrade" "note_review_${kind}_upgrade" ($line+'dashed=1;')}
$insert=($added|ForEach-Object OuterXml)-join "`r`n"
$updated=$raw.Insert($raw.IndexOf('</root>'),$insert)
# A focused view makes the new relationships easy to inspect without moving the original diagram.
$detail=$doc.CreateElement('diagram');$detail.SetAttribute('id','upgrade-review-detail');$detail.SetAttribute('name','05 - Nop ho so va duyet KOL Shop')
$model=$doc.CreateElement('mxGraphModel');foreach($kv in @{page='1';pageWidth='1600';pageHeight='1000';grid='1';gridSize='10';background='#FFFFFF'}.GetEnumerator()){$model.SetAttribute($kv.Key,$kv.Value)}
$r=$doc.CreateElement('root');$r.InnerXml='<mxCell id="0"/><mxCell id="1" parent="0"/>';[void]$model.AppendChild($r);[void]$detail.AppendChild($model)
$boundary=Cell 'detail_boundary' 'SCANMS - Đăng ký và xét duyệt nâng cấp đối tác' 'whiteSpace=wrap;html=0;verticalAlign=top;spacingTop=15;fontSize=18;fontStyle=1;fillColor=#FFFFFF;strokeColor=#000000;' 210 70 1160 850
[void]$r.AppendChild($boundary)
$actorStyle='shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=0;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;fontSize=14;'
foreach($c in @(
 (Cell 'detail_buyer' 'Authenticated Buyer' $actorStyle 80 360 50 90),
 (Cell 'detail_admin' 'System Administrator' $actorStyle 1440 230 50 90),
 (Cell 'detail_manager' 'System Manager' $actorStyle 1440 620 50 90),
 (Cell 'detail_submit_shop' 'Nộp hồ sơ mở Shop' $oval 300 230 280 70),
 (Cell 'detail_submit_kol' 'Nộp hồ sơ nâng cấp KOL/CTV' $oval 300 610 280 70),
 (Cell 'detail_review_shop' 'Duyệt / từ chối hồ sơ mở Shop' $oval 960 230 290 70),
 (Cell 'detail_review_kol' 'Duyệt / từ chối hồ sơ KOL/CTV' $oval 960 610 290 70),
 (Cell 'detail_shop_note' $shopNote $note 850 345 420 105),
 (Cell 'detail_kol_note' $kolNote $note 850 725 420 105),
 (Cell 'detail_explanation' 'Hai actor Shop Manager và Collaborator/KOL đã có trên sơ đồ tổng. Khi được duyệt, người nộp hồ sơ có quyền dùng các chức năng của vai trò tương ứng. Dây nét đứt ở đây chỉ nối ghi chú, không phải luồng xử lý hay quan hệ include/extend.' $note 300 760 440 120)
)){[void]$r.AppendChild($c)}
foreach($kind in @('shop','kol')){
 [void]$r.AppendChild((Edge "detail_buyer_$kind" 'detail_buyer' "detail_submit_$kind" $line))
 foreach($actor in @('detail_admin','detail_manager')){[void]$r.AppendChild((Edge "${actor}_$kind" $actor "detail_review_$kind" $line))}
 [void]$r.AppendChild((Edge "detail_note_$kind" "detail_review_$kind" "detail_${kind}_note" ($line+'dashed=1;')))
}
$updated=$updated.Insert($updated.LastIndexOf('</mxfile>'),$detail.OuterXml)
$updated=[regex]::Replace($updated,'(<mxfile\b[^>]*\bpages=")[0-9]+(")',('${1}'+($doc.mxfile.diagram.Count+1)+'${2}'))
[xml]$check=$updated
for($i=0;$i -lt $doc.mxfile.diagram.Count;$i++){
 $before=@($doc.mxfile.diagram[$i].mxGraphModel.root.mxCell);$after=@($check.mxfile.diagram[$i].mxGraphModel.root.mxCell)
 foreach($c in $before){$same=$after|Where-Object id -eq $c.id;if($c.OuterXml -cne $same.OuterXml){throw "Existing cell changed: $($c.id)"}}
}
$oldNodes=@($doc.mxfile.diagram[0].mxGraphModel.root.mxCell|Where-Object { $_.vertex -eq '1' -and $_.id -ne 'VnyrxFOrn7qXJp7Ggnoe-2' })
foreach($c in ($added|Where-Object vertex -eq '1')){foreach($old in $oldNodes){$a=$c.mxGeometry;$b=$old.mxGeometry;if([double]$a.x -lt [double]$b.x+[double]$b.width -and [double]$b.x -lt [double]$a.x+[double]$a.width -and [double]$a.y -lt [double]$b.y+[double]$b.height -and [double]$b.y -lt [double]$a.y+[double]$a.height){throw "New shape overlaps $($old.id)"}}}
[IO.File]::Copy($path,$path+'.before-review-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.bak')
[IO.File]::WriteAllText($path,$updated,(New-Object Text.UTF8Encoding($false)))
Write-Output 'Added 2 review use cases, 4 actor associations, 2 notes and their annotation connectors to overview; added focused detail page. All existing cells unchanged; new shapes do not overlap old shapes.'

