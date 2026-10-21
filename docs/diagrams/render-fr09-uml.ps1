param([ValidateSet('Class','Sequence')][string]$Kind='Class', [string]$FeatureStem='FR09_Configure_Monthly_Revenue_Bonus_Milestones', [switch]$Grid)
Add-Type -AssemblyName System.Drawing
$stem=$FeatureStem+'_'+$Kind+'_Diagram'
$data=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot ($stem+'.scene.json')) | ConvertFrom-Json
$bmp=[System.Drawing.Bitmap]::new([int]$data.width,[int]$data.height)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
if($Grid){
 $gridPen=[System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(235,235,235),1)
 for($x=0;$x -lt $data.width;$x+=20){$g.DrawLine($gridPen,[single]$x,0,[single]$x,[single]$data.height)}
 for($y=0;$y -lt $data.height;$y+=20){$g.DrawLine($gridPen,0,[single]$y,[single]$data.width,[single]$y)}
 $gridPen.Dispose()
}
$g.SmoothingMode='AntiAlias'
$g.TextRenderingHint='AntiAliasGridFit'
$pen=[System.Drawing.Pen]::new([System.Drawing.Color]::Black,1.4)
$issues=[System.Collections.Generic.List[string]]::new()
foreach($s in $data.shapes){
 $pen.DashStyle='Solid'
 switch($s.type){
  'rect' {$g.FillRectangle([System.Drawing.Brushes]::White,[single]$s.x,[single]$s.y,[single]$s.w,[single]$s.h);$g.DrawRectangle($pen,[single]$s.x,[single]$s.y,[single]$s.w,[single]$s.h)}
  'line' {
   if($s.dash){$pen.DashStyle='Dash';$pen.DashPattern=@(6,4)}
   for($i=1;$i -lt $s.points.Count;$i++){$g.DrawLine($pen,[single]$s.points[$i-1][0],[single]$s.points[$i-1][1],[single]$s.points[$i][0],[single]$s.points[$i][1])}
   $pen.DashStyle='Solid'
   if($s.arrow -ne 'none'){
    $a=$s.points[-2];$b=$s.points[-1];$angle=[Math]::Atan2(($b[1]-$a[1]),($b[0]-$a[0]))
    $length=if($s.arrow -eq 'triangle'){18}else{12};$spread=if($s.arrow -eq 'triangle'){0.45}else{0.42}
    $left=[System.Drawing.PointF]::new([single]($b[0]-$length*[Math]::Cos($angle-$spread)),[single]($b[1]-$length*[Math]::Sin($angle-$spread)))
    $right=[System.Drawing.PointF]::new([single]($b[0]-$length*[Math]::Cos($angle+$spread)),[single]($b[1]-$length*[Math]::Sin($angle+$spread)))
    $tip=[System.Drawing.PointF]::new([single]$b[0],[single]$b[1])
    if($s.arrow -eq 'open'){$g.DrawLine($pen,$left,$tip);$g.DrawLine($pen,$right,$tip)}
    else{$points=[System.Drawing.PointF[]]@($tip,$left,$right);$brush=if($s.arrow -eq 'triangle'){[System.Drawing.Brushes]::White}else{[System.Drawing.Brushes]::Black};$g.FillPolygon($brush,$points);$g.DrawPolygon($pen,$points)}
   }
  }
  'actor' {
   $cx=$s.x+$s.w/2;$g.DrawEllipse($pen,[single]($cx-7),[single]$s.y,14,14)
   $g.DrawLine($pen,[single]$cx,[single]($s.y+14),[single]$cx,[single]($s.y+34));$g.DrawLine($pen,[single]$s.x,[single]($s.y+23),[single]($s.x+$s.w),[single]($s.y+23))
   $g.DrawLine($pen,[single]$cx,[single]($s.y+34),[single]$s.x,[single]($s.y+$s.h));$g.DrawLine($pen,[single]$cx,[single]($s.y+34),[single]($s.x+$s.w),[single]($s.y+$s.h))
  }
  'text' {
   $font=[System.Drawing.Font]::new('Arial',[single]$s.size,$(if($s.bold){[System.Drawing.FontStyle]::Bold}else{[System.Drawing.FontStyle]::Regular}),[System.Drawing.GraphicsUnit]::Pixel)
   $fmt=[System.Drawing.StringFormat]::new();$fmt.Alignment=if($s.align -eq 'center'){[System.Drawing.StringAlignment]::Center}else{[System.Drawing.StringAlignment]::Near};$fmt.LineAlignment='Center'
   $rect=[System.Drawing.RectangleF]::new([single]$s.x,[single]$s.y,[single]$s.w,[single]$s.h)
   $measured=$g.MeasureString([string]$s.value,$font,[int]$s.w,$fmt)
   if($measured.Height -gt $s.h+2){$issues.Add([string]$s.value)}
   if($s.background){$backgroundX=if($s.align -eq 'center'){$s.x+($s.w-$measured.Width)/2-4}else{$s.x-4};$g.FillRectangle([System.Drawing.Brushes]::White,[single]$backgroundX,[single]$s.y,[single]($measured.Width+8),[single]$s.h)}
   $g.DrawString([string]$s.value,$font,[System.Drawing.Brushes]::Black,$rect,$fmt);$font.Dispose();$fmt.Dispose()
  }
 }
}
$imageName=if($Grid){$stem+'_grid-preview.png'}else{$stem+'.png'}
$bmp.Save((Join-Path $PSScriptRoot $imageName),[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$bmp.Dispose();$pen.Dispose()
if($issues.Count){throw ('Text overflow: '+($issues -join ' | '))}
Write-Output "$Kind rendered; no text-height overflow."
