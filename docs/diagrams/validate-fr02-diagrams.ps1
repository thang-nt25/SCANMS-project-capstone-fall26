$ErrorActionPreference='Stop'
function Assert-Fr02($condition,$message){if(-not $condition){throw $message}}
$spec=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot 'fr02-report-spec.json') | ConvertFrom-Json
Assert-Fr02 ($spec.fr -eq 'FR02' -and $spec.classes.Count -eq 11 -and $spec.messages.Count -eq 20) 'FR02 scope changed'
foreach($kind in @('Class','Sequence')){
 $file=Join-Path $PSScriptRoot ($spec.stem+'_'+$kind+'_Diagram.drawio')
 [xml]$xml=Get-Content -Raw -Encoding UTF8 -LiteralPath $file
 Assert-Fr02 (@($xml.mxfile.diagram).Count -eq 1) "$kind must contain one diagram"
 $model=$xml.mxfile.diagram.mxGraphModel; $cells=@($model.root.mxCell);$ids=@($cells | ForEach-Object {$_.id})
 Assert-Fr02 (@($ids | Select-Object -Unique).Count -eq $ids.Count) "$kind duplicate cell IDs"
 foreach($cell in $cells){foreach($attribute in @('parent','source','target')){$ref=$cell.GetAttribute($attribute);Assert-Fr02 ((-not $ref) -or $ref -in $ids) "$kind invalid $attribute reference $ref"}}
 $review=Join-Path (Split-Path $PSScriptRoot -Parent) ('review 2/FR02 - '+$kind+' Diagram')
 Assert-Fr02 ((Get-FileHash -LiteralPath $file).Hash -eq (Get-FileHash -LiteralPath $review).Hash) "$kind review mismatch"
 [xml]$paste=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot ('FR02_'+$kind+'_Paste.xml'))
 Assert-Fr02 ($model.OuterXml -ceq $paste.DocumentElement.OuterXml) "$kind paste mismatch"
 $scene=Get-Content -Raw -Encoding UTF8 -LiteralPath ($file.Replace('.drawio','.scene.json')) | ConvertFrom-Json
 Assert-Fr02 ([int]$model.pageWidth -eq $scene.width -and [int]$model.pageHeight -eq $scene.height) "$kind scene dimensions"
 foreach($shape in $scene.shapes){
  if($shape.type -eq 'line'){foreach($point in $shape.points){Assert-Fr02 ($point[0] -ge 0 -and $point[0] -le $scene.width -and $point[1] -ge 0 -and $point[1] -le $scene.height) "$kind line outside canvas"}}
  else{Assert-Fr02 ($shape.x -ge 0 -and $shape.y -ge 0 -and $shape.x+$shape.w -le $scene.width -and $shape.y+$shape.h -le $scene.height) "$kind shape outside canvas: $($shape.value)"}
 }
 if($kind -eq 'Class'){
  foreach($class in $spec.classes){
   $box=$cells | Where-Object {$_.id -ceq $class.id};Assert-Fr02 ($box.vertex -eq '1') "Missing class $($class.id)"
   foreach($suffix in @('_name','_attributes_separator','_operations_separator')){Assert-Fr02 (($class.id+$suffix) -in $ids) "Missing class compartment $($class.id)$suffix"}
   for($i=0;$i -lt $class.attrs.Count;$i++){$row=$cells | Where-Object {$_.id -ceq ($class.id+'_a'+$i)};Assert-Fr02 ($row.value -ceq $class.attrs[$i]) "Attribute mismatch $($class.id)"}
   for($i=0;$i -lt $class.ops.Count;$i++){$row=$cells | Where-Object {$_.id -ceq ($class.id+'_o'+$i)};Assert-Fr02 ($row.value -ceq $class.ops[$i]) "Operation mismatch $($class.id)"}
  }
  Assert-Fr02 (@($cells | Where-Object {$_.source}).Count -eq $spec.relations.Count) 'Class relation count'
  for($i=0;$i -lt $spec.relations.Count;$i++){
   $r=$spec.relations[$i];$edge=$cells | Where-Object {$_.id -eq "relation_$i"}
   Assert-Fr02 ($edge.source -ceq $r[0] -and $edge.target -ceq $r[1]) 'Class relation endpoints'
   if($r[2] -eq 'inheritance'){Assert-Fr02 ($edge.style -match 'endArrow=block;' -and $edge.style -match 'endFill=0;') 'Missing hollow inheritance arrow'}
   if($r[2] -eq 'association'){foreach($end in @('source','target')){$expected=if($end -eq 'source'){$r[4]}else{$r[5]};$mult=$cells | Where-Object {$_.id -eq "relation_${i}_${end}_mult"};Assert-Fr02 ($mult.value -ceq $expected) 'Association multiplicity mismatch'}}
  }
 }else{
  Assert-Fr02 (@($cells | Where-Object {$_.id -match '^lifeline_'}).Count -eq $spec.lanes.Count) 'Sequence lifeline count'
  Assert-Fr02 (@($cells | Where-Object {$_.id -match '^message_\d+$'}).Count -eq $spec.messages.Count) 'Sequence message count'
  Assert-Fr02 (@($cells | Where-Object {$_.style -match 'shape=umlFrame' -or $_.id -match 'frame'}).Count -eq 0) 'Unexpected interaction frame'
  Assert-Fr02 (@($cells | Where-Object {$_.id -match '^activation_'}).Count -gt 0) 'Missing activation bars'
  for($i=0;$i -lt $spec.messages.Count;$i++){
   $n=$i+1;$m=$spec.messages[$i];$text=$cells | Where-Object {$_.id -eq "message_text_$n"};$edge=$cells | Where-Object {$_.id -eq "message_$n"}
   Assert-Fr02 ($text.value -ceq ("$n. "+$m[2]) -and $text.style -match 'fillColor=none;') "Changed/opaque message $n"
   $dash=if($m.Count -gt 3 -and $m[3] -eq 'return'){1}else{0};$arrow=if($m.Count -gt 3 -and $m[3] -in @('return','async')){'open'}else{'block'}
   Assert-Fr02 ($edge.style.Contains("dashed=$dash;") -and $edge.style.Contains("endArrow=$arrow;")) "Message kind mismatch $n"
  }
  $subtitle=$cells | Where-Object {$_.id -eq 'subtitle'};Assert-Fr02 ($subtitle.value -match 'Role mismatch stops with 403') 'Missing RBAC rejection note'
  $captions=@($cells | Where-Object {$_.id -match '^message_text_\d+$'})
  $lifelines=@($cells | Where-Object {$_.id -match '^lifeline_'})
  for($i=0;$i -lt $captions.Count;$i++){
   $g=$captions[$i].mxGeometry
   foreach($line in $lifelines){$x=[double]$line.mxGeometry.mxPoint[0].x;Assert-Fr02 (-not ($x -gt [double]$g.x -and $x -lt ([double]$g.x+[double]$g.width))) "Lifeline crosses caption $($captions[$i].id)"}
   if($i -gt 0){$prior=$captions[$i-1].mxGeometry;Assert-Fr02 (([double]$prior.y+[double]$prior.height) -le [double]$g.y) 'Overlapping message captions'}
  }
  Assert-Fr02 ($spec.messages[3][1] -eq 'jwt' -and $spec.messages[9][1] -eq 'roles' -and $spec.messages[16][1] -eq 'ctrl') 'Guard / controller order changed'
  Assert-Fr02 ($spec.lanes.Count -eq 7) 'Unexpected RBAC participant scope'
 }
 Assert-Fr02 (Test-Path -LiteralPath ($file.Replace('.drawio','.png'))) "$kind PNG missing"
 Write-Output "FR02 $kind : XML, scope, references, members/messages, bounds, review/paste and UML styles OK"
}
