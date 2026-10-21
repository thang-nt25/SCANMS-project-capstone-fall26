$ErrorActionPreference='Stop'
function Assert-Fr03($condition,$message){if(-not $condition){throw $message}}
$spec=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot 'fr03-report-spec.json') | ConvertFrom-Json
Assert-Fr03 ($spec.fr -eq 'FR03' -and $spec.classes.Count -eq 10 -and $spec.messages.Count -eq 37) 'FR03 scope changed'
foreach($kind in @('Class','Sequence')){
 $file=Join-Path $PSScriptRoot ($spec.stem+'_'+$kind+'_Diagram.drawio')
 [xml]$xml=Get-Content -Raw -Encoding UTF8 -LiteralPath $file
 Assert-Fr03 (@($xml.mxfile.diagram).Count -eq 1) "$kind must contain one diagram"
 $model=$xml.mxfile.diagram.mxGraphModel; $cells=@($model.root.mxCell);$ids=@($cells | ForEach-Object {$_.id})
 Assert-Fr03 (@($ids | Select-Object -Unique).Count -eq $ids.Count) "$kind duplicate cell IDs"
 foreach($cell in $cells){foreach($attribute in @('parent','source','target')){$ref=$cell.GetAttribute($attribute);Assert-Fr03 ((-not $ref) -or $ref -in $ids) "$kind invalid $attribute reference $ref"}}
 $review=Join-Path (Split-Path $PSScriptRoot -Parent) ('review 2/FR03 - '+$kind+' Diagram')
 Assert-Fr03 ((Get-FileHash -LiteralPath $file).Hash -eq (Get-FileHash -LiteralPath $review).Hash) "$kind review mismatch"
 [xml]$paste=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot ('FR03_'+$kind+'_Paste.xml'))
 Assert-Fr03 ($model.OuterXml -ceq $paste.DocumentElement.OuterXml) "$kind paste mismatch"
 $scene=Get-Content -Raw -Encoding UTF8 -LiteralPath ($file.Replace('.drawio','.scene.json')) | ConvertFrom-Json
 Assert-Fr03 ([int]$model.pageWidth -eq $scene.width -and [int]$model.pageHeight -eq $scene.height) "$kind scene dimensions"
 foreach($shape in $scene.shapes){
  if($shape.type -eq 'line'){foreach($point in $shape.points){Assert-Fr03 ($point[0] -ge 0 -and $point[0] -le $scene.width -and $point[1] -ge 0 -and $point[1] -le $scene.height) "$kind line outside canvas"}}
  else{Assert-Fr03 ($shape.x -ge 0 -and $shape.y -ge 0 -and $shape.x+$shape.w -le $scene.width -and $shape.y+$shape.h -le $scene.height) "$kind shape outside canvas: $($shape.value)"}
 }
 if($kind -eq 'Class'){
  foreach($class in $spec.classes){
   $box=$cells | Where-Object {$_.id -ceq $class.id};Assert-Fr03 ($box.vertex -eq '1') "Missing class $($class.id)"
   foreach($suffix in @('_name','_attributes_separator','_operations_separator')){Assert-Fr03 (($class.id+$suffix) -in $ids) "Missing class compartment $($class.id)$suffix"}
   for($i=0;$i -lt $class.attrs.Count;$i++){$row=$cells | Where-Object {$_.id -ceq ($class.id+'_a'+$i)};Assert-Fr03 ($row.value -ceq $class.attrs[$i]) "Attribute mismatch $($class.id)"}
   for($i=0;$i -lt $class.ops.Count;$i++){$row=$cells | Where-Object {$_.id -ceq ($class.id+'_o'+$i)};Assert-Fr03 ($row.value -ceq $class.ops[$i]) "Operation mismatch $($class.id)"}
  }
  Assert-Fr03 (@($cells | Where-Object {$_.source}).Count -eq $spec.relations.Count) 'Class relation count'
  for($i=0;$i -lt $spec.relations.Count;$i++){
   $r=$spec.relations[$i];$edge=$cells | Where-Object {$_.id -eq "relation_$i"}
   Assert-Fr03 ($edge.source -ceq $r[0] -and $edge.target -ceq $r[1]) 'Class relation endpoints'
   if($r[2] -eq 'inheritance'){Assert-Fr03 ($edge.style -match 'endArrow=block;' -and $edge.style -match 'endFill=0;') 'Missing hollow inheritance arrow'}
   if($r[2] -eq 'association'){foreach($end in @('source','target')){$expected=if($end -eq 'source'){$r[4]}else{$r[5]};$mult=$cells | Where-Object {$_.id -eq "relation_${i}_${end}_mult"};Assert-Fr03 ($mult.value -ceq $expected) 'Association multiplicity mismatch'}}
  }
 }else{
  Assert-Fr03 (@($cells | Where-Object {$_.id -match '^lifeline_'}).Count -eq $spec.lanes.Count) 'Sequence lifeline count'
  Assert-Fr03 (@($cells | Where-Object {$_.id -match '^message_\d+$'}).Count -eq $spec.messages.Count) 'Sequence message count'
  Assert-Fr03 (@($cells | Where-Object {$_.style -match 'shape=umlFrame' -or $_.id -match 'frame'}).Count -eq 0) 'Unexpected interaction frame'
  Assert-Fr03 (@($cells | Where-Object {$_.id -match '^activation_'}).Count -gt 0) 'Missing activation bars'
  for($i=0;$i -lt $spec.messages.Count;$i++){
   $n=$i+1;$m=$spec.messages[$i];$text=$cells | Where-Object {$_.id -eq "message_text_$n"};$edge=$cells | Where-Object {$_.id -eq "message_$n"}
   Assert-Fr03 ($text.value -ceq ("$n. "+$m[2]) -and $text.style -match 'fillColor=none;') "Changed/opaque message $n"
   $dash=if($m.Count -gt 3 -and $m[3] -eq 'return'){1}else{0};$arrow=if($m.Count -gt 3 -and $m[3] -in @('return','async')){'open'}else{'block'}
   Assert-Fr03 ($edge.style.Contains("dashed=$dash;") -and $edge.style.Contains("endArrow=$arrow;")) "Message kind mismatch $n"
  }
  $subtitle=$cells | Where-Object {$_.id -eq 'subtitle'};Assert-Fr03 ($subtitle.value -match 'Shop review is allowed by the legacy API') 'Missing KYC implementation note'
  $captions=@($cells | Where-Object {$_.id -match '^message_text_\d+$'})
  $lifelines=@($cells | Where-Object {$_.id -match '^lifeline_'})
  for($i=0;$i -lt $captions.Count;$i++){
   $g=$captions[$i].mxGeometry
   foreach($line in $lifelines){$x=[double]$line.mxGeometry.mxPoint[0].x;Assert-Fr03 (-not ($x -gt [double]$g.x -and $x -lt ([double]$g.x+[double]$g.width))) "Lifeline crosses caption $($captions[$i].id)"}
   if($i -gt 0){$prior=$captions[$i-1].mxGeometry;Assert-Fr03 (([double]$prior.y+[double]$prior.height) -le [double]$g.y) 'Overlapping message captions'}
  }
  Assert-Fr03 ($spec.messages[2][2] -match 'PUT /api/kyc/submit' -and $spec.messages[16][2] -match 'GET /api/kyc/admin/applications' -and $spec.messages[24][2] -match 'PATCH /api/kyc/admin/kol') 'KYC request phases changed'
  Assert-Fr03 ($spec.lanes.Count -eq 6 -and @($spec.lanes | Where-Object {$_.actor}).Count -eq 2) 'Unexpected KYC participant scope'
 }
 Assert-Fr03 (Test-Path -LiteralPath ($file.Replace('.drawio','.png'))) "$kind PNG missing"
 Write-Output "FR03 $kind : XML, scope, references, members/messages, bounds, review/paste and UML styles OK"
}
