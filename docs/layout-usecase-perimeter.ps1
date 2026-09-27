$ErrorActionPreference='Stop'
[xml]$doc=Get-Content -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot 'SCANMS_USE_CASE_BO_CUC_CUM_DE_CHINH_DAY.drawio') -Raw
$p=$doc.mxfile.diagram[0].CloneNode($true)
$r=$p.mxGraphModel.root
foreach($c in @($r.mxCell | Where-Object id -like 'zone_*')){[void]$r.RemoveChild($c)}
$v=@($r.mxCell | Where-Object vertex -eq '1'); $actors=@($v | Where-Object style -match 'umlActor'); $ucs=@($v | Where-Object style -notmatch 'umlActor'); $edges=@($r.mxCell | Where-Object edge -eq '1')
$map=@{}; $adj=@{}; foreach($c in $v){$map[$c.id]=$c}; foreach($c in $ucs){$adj[$c.id]=[System.Collections.Generic.List[string]]::new()}
foreach($e in $edges){if($adj.ContainsKey($e.source) -and $adj.ContainsKey($e.target)){$adj[$e.source].Add($e.target);$adj[$e.target].Add($e.source)}}
$seen=@{};$components=@()
foreach($c in $ucs){
 if($seen[$c.id]){continue};$q=[System.Collections.Generic.Queue[string]]::new();$q.Enqueue($c.id);$ids=@()
 while($q.Count){$id=$q.Dequeue();if($seen[$id]){continue};$seen[$id]=$true;$ids+=$id;foreach($n in $adj[$id]){$q.Enqueue($n)}}
 $votes=@{};foreach($e in $edges){if($e.source -in $actors.id -and $e.target -in $ids){if(-not $votes.ContainsKey($e.source)){$votes[$e.source]=0};$votes[$e.source]++}}
 $owner=($votes.GetEnumerator()|Sort-Object Value -Descending|Select-Object -First 1).Key
 if(-not $owner){$owner='act_kol'}
 $main=($ids|Sort-Object { -$adj[$_].Count },{[double]$map[$_].mxGeometry.x}|Select-Object -First 1)
 $components+=,@{owner=$owner;main=$main;ids=$ids}
}
# One system boundary, actors on its perimeter, compact local clusters.
$spec=@{
 act_auth=@(350,310,2,500,330,720,100)
 act_sysadmin=@(1500,310,3,540,330,2200,100)
 act_sysmanager=@(3500,310,2,530,330,4790,570)
 act_marketplace_visitor=@(350,1030,2,500,220,100,1300)
 act_buyer_auth=@(350,1980,2,500,270,800,3350)
 act_kol=@(1450,1290,3,500,420,2050,3350)
 act_shop=@(3100,1510,3,500,420,3850,3350)
 act_payment=@(3500,1080,1,530,350,4790,1180)
 'c5QiOaDY6uHg6HGGsvTC-8'=@(1600,1030,1,700,220,100,900)
}
function Place($c,$x,$y,$w,$h){$g=$c.mxGeometry;$g.SetAttribute('x',"$x");$g.SetAttribute('y',"$y");$g.SetAttribute('width',"$w");$g.SetAttribute('height',"$h")}
foreach($aid in $spec.Keys){
 $s=$spec[$aid];$a=$map[$aid];Place $a $s[5] $s[6] 50 85
 $a.SetAttribute('value',([System.Net.WebUtility]::HtmlDecode(([regex]::Replace($a.value,'<br\s*/?>',' | ') -replace '<[^>]+>','')).Split('|')[0].Trim()))
 $a.SetAttribute('style','shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=0;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;fontSize=19;fontStyle=1;')
 $items=@($components|Where-Object owner -eq $aid)
 for($i=0;$i -lt $items.Count;$i++){
  $co=$items[$i];$x=$s[0]+($i%$s[2])*$s[3];$y=$s[1]+[math]::Floor($i/$s[2])*$s[4]
  Place $map[$co.main] ($x+130) $y 210 66
  $children=@($co.ids|Where-Object {$_ -ne $co.main})
  for($j=0;$j -lt $children.Count;$j++){Place $map[$children[$j]] ($x+($j%2)*260) ($y+130+[math]::Floor($j/2)*110) 210 66}
 }
}
foreach($u in $ucs){
 $text=[System.Net.WebUtility]::HtmlDecode(($u.value -replace '<[^>]+>',' '));$text=$text -replace '\s+',' '
 $u.SetAttribute('value',$text.Trim())
 $style='ellipse;whiteSpace=wrap;html=0;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1;fontColor=#000000;fontSize=16;spacing=6;'
 if($text -match 'Future'){$style+='dashed=1;'}
 $u.SetAttribute('style',$style)
}
$b=$doc.CreateElement('mxCell');$b.SetAttribute('id','scanms_boundary');$b.SetAttribute('parent','1');$b.SetAttribute('vertex','1');$b.SetAttribute('value','SCANMS');$b.SetAttribute('style','rounded=0;html=0;verticalAlign=top;spacingTop=14;fontSize=26;fontStyle=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;')
$g=$doc.CreateElement('mxGeometry');foreach($kv in @{x='270';y='240';width='4430';height='3030';as='geometry'}.GetEnumerator()){$g.SetAttribute($kv.Key,$kv.Value)};[void]$b.AppendChild($g);[void]$r.InsertAfter($b,$r.mxCell[1])
foreach($e in $edges){
 $g=$e.mxGeometry;$g.RemoveAll();$g.SetAttribute('relative','1');$g.SetAttribute('as','geometry')
 $arrow=if($e.style -match 'endArrow=block'){'endArrow=block;endFill=0;'}elseif($e.value){'endArrow=open;dashed=1;'}else{'endArrow=none;'}
 $e.SetAttribute('style',"$arrow`html=0;rounded=0;strokeColor=#000000;strokeWidth=1;fontColor=#000000;fontSize=12;labelBackgroundColor=#FFFFFF;")
 if($e.value){$e.SetAttribute('value',[System.Net.WebUtility]::HtmlDecode($e.value))}
}
$p.SetAttribute('id','perimeter-connected');$p.SetAttribute('name','01 - So do chung co day')
$p.mxGraphModel.SetAttribute('pageWidth','4950');$p.mxGraphModel.SetAttribute('pageHeight','3530');$p.mxGraphModel.SetAttribute('background','#FFFFFF')
$blank=$p.CloneNode($true);$blank.SetAttribute('id','perimeter-clean');$blank.SetAttribute('name','02 - Bo cuc de tu noi day')
foreach($e in @($blank.mxGraphModel.root.mxCell|Where-Object edge -eq '1')){[void]$blank.mxGraphModel.root.RemoveChild($e)}
# Keep all four source pages unchanged as reference.
[void]$doc.mxfile.RemoveChild($doc.mxfile.diagram[0]);[void]$doc.mxfile.InsertBefore($blank,$doc.mxfile.diagram[0]);[void]$doc.mxfile.InsertBefore($p,$doc.mxfile.diagram[0]);$doc.mxfile.SetAttribute('pages',"$($doc.mxfile.diagram.Count)")
$out=Join-Path $PSScriptRoot 'SCANMS_USE_CASE_BO_CUC_GIONG_MAU.drawio';$doc.Save($out)
# Render a readable layout preview from the same coordinates.
Add-Type -AssemblyName System.Drawing
$scale=0.6;$bmp=New-Object System.Drawing.Bitmap(2970,2118);$gr=[System.Drawing.Graphics]::FromImage($bmp);$gr.Clear([System.Drawing.Color]::White);$gr.ScaleTransform($scale,$scale);$gr.SmoothingMode='AntiAlias'
$pen=New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#000000'),1.5);$ink=[System.Drawing.Brushes]::Black;$font=New-Object System.Drawing.Font('Arial',16);$title=New-Object System.Drawing.Font('Arial',23,[System.Drawing.FontStyle]::Bold);$fmt=New-Object System.Drawing.StringFormat;$fmt.Alignment='Center';$fmt.LineAlignment='Center'
$gr.DrawRectangle($pen,270,240,4430,3030);$gr.DrawString('SCANMS',$title,$ink,(New-Object System.Drawing.RectangleF(270,250,4430,60)),$fmt)
foreach($u in $ucs){$g=$u.mxGeometry;$rect=New-Object System.Drawing.RectangleF([float]$g.x,[float]$g.y,[float]$g.width,[float]$g.height);$gr.DrawEllipse($pen,$rect);$gr.DrawString($u.value,$font,$ink,$rect,$fmt)}
foreach($a in $actors){$x=[float]$a.mxGeometry.x;$y=[float]$a.mxGeometry.y;$gr.DrawEllipse($pen,($x+15),$y,20,20);$gr.DrawLine($pen,($x+25),($y+20),($x+25),($y+55));$gr.DrawLine($pen,$x,($y+35),($x+50),($y+35));$gr.DrawLine($pen,($x+25),($y+55),$x,($y+85));$gr.DrawLine($pen,($x+25),($y+55),($x+50),($y+85));$gr.DrawString($a.value,$font,$ink,(New-Object System.Drawing.RectangleF(($x-105),($y+90),260,65)),$fmt)}
$png=Join-Path $PSScriptRoot 'SCANMS_USE_CASE_BO_CUC_GIONG_MAU.png';$bmp.Save($png,[System.Drawing.Imaging.ImageFormat]::Png);$gr.Dispose();$bmp.Dispose()
Write-Output "Saved $out and preview. Use cases: $($ucs.Count); actors: $($actors.Count); edges: $($edges.Count)"
# Check actual use-case rectangle intersections.
$overlaps=@();for($i=0;$i -lt $ucs.Count;$i++){for($j=$i+1;$j -lt $ucs.Count;$j++){$a=$ucs[$i].mxGeometry;$b=$ucs[$j].mxGeometry;if([double]$a.x -lt [double]$b.x+[double]$b.width -and [double]$b.x -lt [double]$a.x+[double]$a.width -and [double]$a.y -lt [double]$b.y+[double]$b.height -and [double]$b.y -lt [double]$a.y+[double]$a.height){$overlaps+="$($ucs[$i].id) / $($ucs[$j].id)"}}};Write-Output "Overlaps: $($overlaps.Count)";$overlaps


