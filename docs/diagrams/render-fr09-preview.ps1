param(
 [string]$InputFile='FR09_Configure_Monthly_Revenue_Bonus_Milestones_Sequence_Diagram.drawio',
 [string]$OutputFile='FR09_Sequence_Overview_EN_BW.png',
 [int]$Scale=1,
 [int]$PageIndex=0
)
Add-Type -AssemblyName System.Drawing
[xml]$doc=Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot $InputFile)
$model=@($doc.mxfile.diagram)[$PageIndex].mxGraphModel
$bmp=New-Object System.Drawing.Bitmap ([int]$model.pageWidth*$Scale),([int]$model.pageHeight*$Scale)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$g.ScaleTransform($Scale,$Scale)
$g.SmoothingMode='AntiAlias';$g.TextRenderingHint='AntiAliasGridFit'
$pen=New-Object System.Drawing.Pen ([System.Drawing.Color]::Black),1
foreach($c in $model.root.mxCell){
 $v=$c.mxGeometry;if(-not $v){continue}
 $s=@{};foreach($p in ($c.style -split ';')){if($p -match '^([^=]+)=(.*)$'){$s[$matches[1]]=$matches[2]}}
 $pen.DashStyle='Solid'
 if($c.edge -eq '1'){
  $pts=@($v.SelectSingleNode('mxPoint[@as="sourcePoint"]'))+@($v.SelectNodes('Array/mxPoint'))+@($v.SelectSingleNode('mxPoint[@as="targetPoint"]'))
  if($s.dashed -eq '1'){$pen.DashStyle='Dash'}
  for($i=1;$i -lt $pts.Count;$i++){$g.DrawLine($pen,[single]$pts[$i-1].x,[single]$pts[$i-1].y,[single]$pts[$i].x,[single]$pts[$i].y)}
  if($s.endArrow -and $s.endArrow -ne 'none'){
   $a=$pts[-2];$b=$pts[-1];$angle=[Math]::Atan2(([double]$b.y-[double]$a.y),([double]$b.x-[double]$a.x));$pen.DashStyle='Solid'
   foreach($off in @(-0.45,0.45)){$g.DrawLine($pen,[single]$b.x,[single]$b.y,[single]([double]$b.x-9*[Math]::Cos($angle+$off)),[single]([double]$b.y-9*[Math]::Sin($angle+$off)))}
  };continue
 }
 $x=[single]$v.x;$y=[single]$v.y;$w=[single]$v.width;$h=[single]$v.height
 $rect=New-Object System.Drawing.RectangleF $x,$y,$w,$h
 if($s.shape -eq 'umlActor'){
  $cx=$x+$w/2;$g.DrawEllipse($pen,($cx-7),$y,14,14);$g.DrawLine($pen,$cx,($y+14),$cx,($y+37));$g.DrawLine($pen,$x,($y+24),($x+$w),($y+24));$g.DrawLine($pen,$cx,($y+37),$x,($y+$h));$g.DrawLine($pen,$cx,($y+37),($x+$w),($y+$h));$rect=New-Object System.Drawing.RectangleF ($cx-100),($y+$h),200,28
 }else{
  if($s.fillColor -and $s.fillColor -ne 'none'){$g.FillRectangle([System.Drawing.Brushes]::White,$rect)}
  if($s.strokeColor -and $s.strokeColor -ne 'none'){$g.DrawRectangle($pen,$x,$y,$w,$h)}
 }
 if($c.value){
  $size=if($s.fontSize){[single]$s.fontSize}else{14}
  $weight=if($s.fontStyle -eq '1'){[System.Drawing.FontStyle]::Bold}else{[System.Drawing.FontStyle]::Regular}
  $font=New-Object System.Drawing.Font 'Arial',$size,$weight,([System.Drawing.GraphicsUnit]::Pixel)
  $fmt=New-Object System.Drawing.StringFormat
  $fmt.Alignment=if($s.align -eq 'left'){[System.Drawing.StringAlignment]::Near}else{[System.Drawing.StringAlignment]::Center};$fmt.LineAlignment='Center'
  $g.DrawString([string]$c.value,$font,[System.Drawing.Brushes]::Black,$rect,$fmt);$font.Dispose();$fmt.Dispose()
 }
}
$bmp.Save((Join-Path $PSScriptRoot $OutputFile),[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$bmp.Dispose();$pen.Dispose()
Write-Output 'Overview PNG rendered from draw.io geometry (local preview, not a diagrams.net export).'
