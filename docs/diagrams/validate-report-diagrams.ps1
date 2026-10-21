param([int[]]$Features = @(10,11,12,13,14,15,16))
$ErrorActionPreference = 'Stop'
function Assert-Report($condition, $message) { if (-not $condition) { throw $message } }
foreach ($n in $Features) {
 $spec = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot "fr$n-report-spec.json") | ConvertFrom-Json
 foreach ($kind in @('Class','Sequence')) {
  $file = Join-Path $PSScriptRoot ($spec.stem + '_' + $kind + '_Diagram.drawio')
  [xml]$xml = Get-Content -Raw -Encoding UTF8 -LiteralPath $file
  Assert-Report (@($xml.mxfile.diagram).Count -eq 1) "FR$n $kind page count"
  $model = $xml.mxfile.diagram.mxGraphModel
  $cells = @($model.root.mxCell)
  $ids = @($cells | ForEach-Object { $_.id })
  Assert-Report (@($ids | Select-Object -Unique).Count -eq $ids.Count) "FR$n $kind duplicate IDs"
  foreach ($cell in $cells) {
   foreach ($attr in @('parent','source','target')) {
    $ref = $cell.GetAttribute($attr)
    Assert-Report ((-not $ref) -or ($ref -in $ids)) "FR$n $kind invalid $attr reference $ref"
   }
  }
  $review = Join-Path (Split-Path $PSScriptRoot -Parent) ("review 2/FR$n - $kind Diagram")
  Assert-Report ((Get-FileHash -LiteralPath $file).Hash -eq (Get-FileHash -LiteralPath $review).Hash) "FR$n $kind review mismatch"
  [xml]$paste = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot "FR${n}_${kind}_Paste.xml")
  Assert-Report ($model.OuterXml -ceq $paste.DocumentElement.OuterXml) "FR$n $kind paste mismatch"
  $scene = Get-Content -Raw -Encoding UTF8 -LiteralPath ($file.Replace('.drawio','.scene.json')) | ConvertFrom-Json
  Assert-Report ([int]$model.pageWidth -eq $scene.width -and [int]$model.pageHeight -eq $scene.height) "FR$n $kind scene size"
  foreach ($shape in $scene.shapes) {
   if ($shape.type -eq 'line') {
    foreach ($p in $shape.points) { Assert-Report ($p[0] -ge 0 -and $p[0] -le $scene.width -and $p[1] -ge 0 -and $p[1] -le $scene.height) "FR$n $kind line bounds" }
   } else { Assert-Report ($shape.x -ge 0 -and ($shape.x + $shape.w) -le $scene.width -and $shape.y -ge 0 -and ($shape.y + $shape.h) -le $scene.height) "FR$n $kind shape bounds" }
  }
  if ($kind -eq 'Class') {
   Assert-Report ($spec.classLayout.reference -eq 'FR09' -and $spec.classLayout.version -in @('fr09-balanced-v3','fr09-model-columns-v4')) "FR$n missing FR9 layout reference"
   Assert-Report ([int]$model.pageWidth -eq 2800 -and [int]$model.pageHeight -ge 2240) "FR$n class canvas"
   foreach ($placement in @(@($spec.classLayout.controller,850,150,830),@($spec.classLayout.service,850,700,830),@('PrismaService',850,1280,830),@('PrismaClient',60,1700,650))) {
    $box=$cells | Where-Object { $_.id -eq $placement[0] }
    Assert-Report ([int]$box.mxGeometry.x -eq $placement[1] -and [int]$box.mxGeometry.y -eq $placement[2] -and [int]$box.mxGeometry.width -eq $placement[3]) "FR$n incorrect standard position for $($placement[0])"
   }
   foreach ($support in $spec.classLayout.supports) {
    $box=$cells | Where-Object { $_.id -eq $support[0] }
    Assert-Report ([int]$box.mxGeometry.x -eq 60 -and [int]$box.mxGeometry.y -eq $support[1] -and [int]$box.mxGeometry.width -eq 560) "FR$n support column"
   }
   foreach ($id in $spec.classLayout.models) {
    $box=$cells | Where-Object { $_.id -eq $id }
    $position=$spec.classLayout.modelPositions.PSObject.Properties[$id].Value
    Assert-Report ([int]$box.mxGeometry.x -eq $position[0] -and [int]$box.mxGeometry.y -eq $position[1] -and [int]$box.mxGeometry.width -eq $position[2]) "FR$n balanced model position for $id"
    if ($spec.classLayout.version -eq 'fr09-model-columns-v4') {
     Assert-Report ([int]$box.mxGeometry.x -eq 1930 -and [int]$box.mxGeometry.width -eq 620) "FR$n model outside FR9 right column: $id"
    }
   }
   $inheritance=@($cells | Where-Object { $_.source -eq 'PrismaService' -and $_.target -eq 'PrismaClient' })
   Assert-Report ($inheritance.Count -eq 1 -and $inheritance[0].style -match 'endArrow=block;' -and $inheritance[0].style -match 'endFill=0;' -and $inheritance[0].style -match 'dashed=0;') "FR$n missing hollow inheritance arrow"
   foreach ($suffix in @('_name','_attributes_separator','_operations_separator')) {
    Assert-Report (@($ids | Where-Object { $_.EndsWith($suffix) }).Count -eq $spec.classes.Count) "FR$n compartment count $suffix"
   }
   $links = @($cells | Where-Object { $_.source })
   Assert-Report ($links.Count -eq $spec.relations.Count) "FR$n relation count"
   $baseline=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot "archive/FR${n}_before_balanced_class_layout/fr$n-report-spec.json") | ConvertFrom-Json
   Assert-Report (($spec.classes | ConvertTo-Json -Depth 30 -Compress) -ceq ($baseline.classes | ConvertTo-Json -Depth 30 -Compress)) "FR$n selected class members changed"
   Assert-Report (($baseline.relations | ConvertTo-Json -Depth 30 -Compress) -ceq ($spec.relations | ConvertTo-Json -Depth 30 -Compress)) "FR$n relation content changed during layout-only revision"
   foreach ($id in $spec.classLayout.models) { Assert-Report (@($links | Where-Object { $_.source -eq 'PrismaService' -and $_.target -eq $id -and $_.style -match 'dashed=1;' -and $_.style -match 'endArrow=open;' }).Count -eq 1) "FR$n missing ORM dependency to selected model $id" }
   $edgeText = @($cells | Where-Object { $_.id -match '^relation_\d+_(label|source_mult|target_mult)$' })
   for ($i=0; $i -lt $edgeText.Count; $i++) {
    for ($j=$i+1; $j -lt $edgeText.Count; $j++) {
     $a=$edgeText[$i].mxGeometry; $b=$edgeText[$j].mxGeometry
     $overlap=([double]$a.x -lt ([double]$b.x+[double]$b.width)) -and (([double]$a.x+[double]$a.width) -gt [double]$b.x) -and ([double]$a.y -lt ([double]$b.y+[double]$b.height)) -and (([double]$a.y+[double]$a.height) -gt [double]$b.y)
     Assert-Report (-not $overlap) "FR$n overlapping relation captions/multiplicities"
    }
   }
   for ($i=0; $i -lt $spec.relations.Count; $i++) {
    $relation = $spec.relations[$i]
    $edge = $cells | Where-Object { $_.id -eq "relation_$i" }
    Assert-Report ($edge.source -eq $relation[0] -and $edge.target -eq $relation[1]) "FR$n relation terminal mismatch"
    if ($relation[2] -eq 'association') {
     $sourceBox=$cells | Where-Object { $_.id -eq $relation[0] }; $targetBox=$cells | Where-Object { $_.id -eq $relation[1] }
     if ([int]$sourceBox.mxGeometry.x -eq 1930 -and [int]$targetBox.mxGeometry.x -eq 1930) {
      foreach ($point in @($edge.mxGeometry.mxPoint | Where-Object { $_.as -ne 'offset' }) + @($edge.mxGeometry.Array.mxPoint)) {
       if ($null -ne $point) { Assert-Report ([double]$point.x -ge 1730) "FR$n right-column association crosses the processing column" }
      }
     }
     foreach ($end in @('source','target')) {
      $expected = if ($end -eq 'source') { $relation[4] } else { $relation[5] }
      $mult = $cells | Where-Object { $_.id -eq "relation_${i}_${end}_mult" }
      Assert-Report ($mult.value -eq $expected) "FR$n multiplicity mismatch"
     }
    }
   }
  } else {
   Assert-Report ($spec.sequenceLayout.reference -eq 'FR09' -and $spec.sequenceLayout.version -eq 'fr09-sequence-v3') "FR$n missing shared FR9 sequence preset"
   Assert-Report ([int]$model.pageWidth -ge 2840 -and [int]$model.pageHeight -ge 2835) "FR$n FR9 base canvas"
   Assert-Report (@($ids | Where-Object { $_ -match '^message_\d+$' }).Count -eq $spec.messages.Count) "FR$n message count"
   Assert-Report (@($ids | Where-Object { $_ -match '^lifeline_' }).Count -eq $spec.lanes.Count) "FR$n lifeline count"
   Assert-Report (@($cells | Where-Object { $_.style -match 'shape=umlActor;' }).Count -eq @($spec.lanes | Where-Object { $_.actor }).Count) "FR$n actor count"
   Assert-Report (@($cells | Where-Object { $_.id -match 'frame' -or $_.style -match 'shape=umlFrame' }).Count -eq 0) "FR$n unexpected frame"
   $messageBoxes = @($cells | Where-Object { $_.id -match '^message_text_' })
   foreach ($caption in $messageBoxes) { Assert-Report ($caption.style -match 'fillColor=none;' -and $caption.style -notmatch 'fillColor=#FFFFFF;') "FR$n opaque message caption" }
   for ($i=1; $i -lt $messageBoxes.Count; $i++) {
    $prior = $messageBoxes[$i-1].mxGeometry
    $next = $messageBoxes[$i].mxGeometry
    Assert-Report (([double]$prior.y + [double]$prior.height) -le [double]$next.y) "FR$n overlapping message labels"
   }
   # Column order and presentation may change; interaction content must not.
   $beforeDir=Join-Path $PSScriptRoot "archive/FR${n}_before_fr09_sequence_v2"
   $beforeSpec=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $beforeDir "fr$n-report-spec.json") | ConvertFrom-Json
   foreach ($field in @('lanes','messages','activations','notes','subtitle')) {
    Assert-Report (($spec.$field | ConvertTo-Json -Depth 30 -Compress) -ceq ($beforeSpec.$field | ConvertTo-Json -Depth 30 -Compress)) "FR$n sequence semantics changed: $field"
   }
   Assert-Report (@($spec.sequenceLayout.order | Select-Object -Unique).Count -eq $spec.lanes.Count) "FR$n repeated sequence columns"
   foreach ($lane in $spec.lanes) { Assert-Report ($lane.id -in $spec.sequenceLayout.order) "FR$n missing sequence column $($lane.id)" }
   $ys=@(245)
   for ($i=1; $i -lt $spec.messages.Count; $i++) { $extra=if ($spec.messages[$i-1][0] -eq $spec.messages[$i-1][1]) { 16 } else { 0 }; $ys+= $ys[-1]+64+$extra }
   $stretch=[Math]::Max(1.0,2240.0/[Math]::Max(1.0,[double]($ys[-1]-245)))
   for ($i=1; $i -lt $ys.Count; $i++) { $ys[$i]=[int][Math]::Floor(245+($ys[$i]-245)*$stretch+0.5) }
   $actorCount=@($spec.lanes | Where-Object { $_.actor }).Count
   $columnXs=@{}; $actorIndex=0; $participantIndex=0
   foreach ($id in $spec.sequenceLayout.order) {
    $lane=$spec.lanes | Where-Object { $_.id -eq $id }
    if ($lane.actor) { $columnXs[$id]=110+$actorIndex*290; $actorIndex++ }
    else { $offset=if ($participantIndex -eq 0) { 0 } else { 570+($participantIndex-1)*540 }; $columnXs[$id]=460+($actorCount-1)*290+$offset; $participantIndex++ }
   }
   $xs=@(); $laneIndex=@{}
   for ($i=0; $i -lt $spec.lanes.Count; $i++) {
    $lane=$spec.lanes[$i]; $laneIndex[$lane.id]=$i
    $x=$columnXs[$lane.id]
    if ($lane.actor) { $actor=$cells | Where-Object { $_.id -eq ('actor_'+$lane.id) }; Assert-Report ([int]$actor.mxGeometry.y -eq 120 -and ([int]$actor.mxGeometry.x+18) -eq $x -and $actor.value -ceq $lane.name) "FR$n actor presentation" }
    else {
     $w=if ($lane.name -eq 'Browser') { 250 } else { 430 }
     $head=$cells | Where-Object { $_.id -eq "head_$i" }; $caption=$cells | Where-Object { $_.id -eq "head_text_$i" }
     Assert-Report ([int]$head.mxGeometry.x -eq ($x-$w/2) -and [int]$head.mxGeometry.y -eq 135 -and [int]$head.mxGeometry.width -eq $w -and [int]$head.mxGeometry.height -eq 58) "FR$n FR9 participant box"
     Assert-Report ($caption.value -ceq $lane.name -and $caption.style -match 'fontSize=20;' -and $caption.style -match 'fontStyle=1;') "FR$n participant caption"
    }
    $xs+= $x
    $life=$cells | Where-Object { $_.id -eq "lifeline_$i" }
    $start=$life.mxGeometry.mxPoint | Where-Object { $_.as -eq 'sourcePoint' }; $finish=$life.mxGeometry.mxPoint | Where-Object { $_.as -eq 'targetPoint' }
    Assert-Report ($life.style -match 'dashed=1;' -and [int]$start.x -eq $x -and [int]$finish.x -eq $x -and [int]$start.y -eq 193 -and [int]$finish.y -eq ([int]$model.pageHeight-280)) "FR$n FR9 lifeline geometry"
   }
   for ($i=0; $i -lt $spec.messages.Count; $i++) {
    $m=$spec.messages[$i]; $number=$i+1; $a=$laneIndex[$m[0]]; $b=$laneIndex[$m[1]]
    $edge=$cells | Where-Object { $_.id -eq "message_$number" }; $caption=$cells | Where-Object { $_.id -eq "message_text_$number" }
    Assert-Report ($caption.value -ceq ("$number. "+$m[2]) -and $caption.style -match 'fontSize=18;') "FR$n changed message label $number"
    $reply=$m.Count -gt 3 -and $m[3] -eq 'return'; $async=$m.Count -gt 3 -and $m[3] -eq 'async'
    $arrow=if ($reply -or $async) { 'open' } else { 'block' }; $dash=if ($reply) { 1 } else { 0 }; $fill=if ($reply -or $async) { 0 } else { 1 }
    Assert-Report ($edge.style.Contains("endArrow=$arrow;") -and $edge.style.Contains("dashed=$dash;") -and $edge.style.Contains("endFill=$fill;")) "FR$n call/return style $number"
    $start=$edge.mxGeometry.mxPoint | Where-Object { $_.as -eq 'sourcePoint' }; $finish=$edge.mxGeometry.mxPoint | Where-Object { $_.as -eq 'targetPoint' }
    $right=$xs[$b] -gt $xs[$a]; $sourceOffset=if ($a -eq $b -or $right) { 5 } else { -5 }; $targetOffset=if ($a -eq $b -or -not $right) { 5 } else { -5 }
    foreach ($span in $spec.activations) { if ($span.Count -gt 3 -and $i -ge [int]$span[1] -and $i -le [int]$span[2]) { if ($span[0] -eq $m[0]) { $sourceOffset+=[int]$span[3]*6 }; if ($span[0] -eq $m[1]) { $targetOffset+=[int]$span[3]*6 } } }
    $endY=$ys[$i]; if ($a -eq $b) { $endY+=19 }
    Assert-Report ([int]$start.x -eq ($xs[$a]+$sourceOffset) -and [int]$finish.x -eq ($xs[$b]+$targetOffset) -and [int]$start.y -eq $ys[$i] -and [int]$finish.y -eq $endY) "FR$n message endpoints/order $number"
    if ($a -eq $b) { Assert-Report ([int]$caption.mxGeometry.x -eq ($xs[$a]+$sourceOffset-5+62) -and [int]$caption.mxGeometry.y -eq ($ys[$i]-26)) "FR$n FR9 self-call caption $number" }
   }
   $bars=@($cells | Where-Object { $_.id -match '^activation_' })
   Assert-Report ($bars.Count -gt 0) "FR$n missing execution bars"
   foreach ($bar in $bars) { Assert-Report ([int]$bar.mxGeometry.width -eq 10 -and [int]$bar.mxGeometry.height -gt 0 -and [int]$bar.mxGeometry.y -in $ys) "FR$n execution bar size/alignment" }
   foreach ($span in $spec.activations) {
    $nested=if ($span.Count -gt 3) { [int]$span[3] } else { 0 }
    $tail=if ($spec.messages[[int]$span[2]][0] -eq $spec.messages[[int]$span[2]][1]) { 29 } else { 10 }
    $matches=@($bars | Where-Object { [int]$_.mxGeometry.x -eq ($xs[$laneIndex[$span[0]]]-5+$nested*6) -and [int]$_.mxGeometry.y -eq $ys[[int]$span[1]] -and [int]$_.mxGeometry.height -eq ($ys[[int]$span[2]]-$ys[[int]$span[1]]+$tail) })
    Assert-Report ($matches.Count -eq 1) "FR$n explicit transaction/worker/browser execution span"
   }
  }
  Assert-Report (Test-Path -LiteralPath ($file.Replace('.drawio','.png'))) "FR$n missing PNG"
  $archive = Join-Path $PSScriptRoot ("archive/FR${n}_detailed/" + (Split-Path $file -Leaf))
  Assert-Report (Test-Path -LiteralPath $archive) "FR$n missing detailed archive"
  Write-Output ("FR$n $kind : XML, references, counts, canvas, review/paste and FR9 layout checks OK")
 }
}
