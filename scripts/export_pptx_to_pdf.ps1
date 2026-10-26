$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
$pptxPath = "C:\HW\CAPSTONE\docs\review 2\SCANMS_Thuyet_Trinh_Review_2_Va_Hoi_Dong.pptx"
$pdfPath  = "C:\HW\CAPSTONE\docs\review 2\SCANMS_Thuyet_Trinh_Review_2_Va_Hoi_Dong.pdf"

$pres = $ppt.Presentations.Open($pptxPath, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
$pres.SaveAs($pdfPath, 32)
$pres.Close()
$ppt.Quit()

Write-Output "Successfully converted PPTX to PDF: $pdfPath"
