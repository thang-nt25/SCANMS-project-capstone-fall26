param(
  [string]$SourceHtml = "D:\ProjectCapstone\docs\reports\FA26SE032_SCANMS_Report1_Project_Introduction.content.html",
  [string]$OutputDirectory = "D:\ProjectCapstone\docs\reports",
  [string]$LogoPath = "D:\ProjectCapstone\docs\reports\assets\fpt-university-logo.png"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $SourceHtml)) { throw "Report source was not found: $SourceHtml" }
if (-not (Test-Path -LiteralPath $LogoPath)) { throw "FPT logo was not found: $LogoPath" }
if (-not (Test-Path -LiteralPath $OutputDirectory)) { New-Item -ItemType Directory -Path $OutputDirectory | Out-Null }

$docxPath = Join-Path $OutputDirectory 'FA26SE032_SCANMS_Report1_Project_Introduction.docx'
$renderedHtmlPath = Join-Path $OutputDirectory 'FA26SE032_SCANMS_Report1_Project_Introduction.rendered.html'
$source = [IO.File]::ReadAllText($SourceHtml, [Text.Encoding]::UTF8)

$staticToc = @'
<div class="toc">
  <p class="l1"><strong>I. Record of Changes</strong></p>
  <p class="l1"><strong>II. Project Introduction</strong></p>
  <p class="l2">1. Overview</p>
  <p class="l3">1.1 Project Information</p>
  <p class="l3">1.2 Project Team</p>
  <p class="l2">2. Product Background</p>
  <p class="l2">3. Existing Systems</p>
  <p class="l3">3.1 ACCESSTRADE Vietnam</p>
  <p class="l3">3.2 TikTok Shop Affiliate</p>
  <p class="l3">3.3 Spreadsheet and Social-Chat-Based Management</p>
  <p class="l2">4. Business Opportunity</p>
  <p class="l2">5. Software Product Vision</p>
  <p class="l2">6. Project Scope &amp; Limitations</p>
  <p class="l3">6.1 Major Features</p>
  <p class="l3">6.2 Limitations &amp; Exclusions</p>
  <p class="l1"><strong>Appendix A. Project Evidence Used</strong></p>
</div>
'@

$tocCss = @'
    .toc { margin: 0.4cm 0.5cm; font-size: 11pt; line-height: 1.5; }
    .toc p { margin: 2pt 0; text-align: left; }
    .toc .l1 { margin-top: 7pt; }
    .toc .l2 { margin-left: 0.7cm; }
    .toc .l3 { margin-left: 1.4cm; color: #7D715E; }
'@

$rendered = $source.Replace('    table {', $tocCss + "`r`n    table {")
$rendered = $rendered.Replace('<p>[[TOC_PLACEHOLDER]]</p>', $staticToc)
[IO.File]::WriteAllText($renderedHtmlPath, $rendered, (New-Object Text.UTF8Encoding($true)))

$packageHtml = $rendered.Replace('file:///D:/ProjectCapstone/docs/reports/assets/fpt-university-logo.png', 'media/image1.png')

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="htm" ContentType="text/html"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'@

$rootRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
'@

$documentXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:altChunk r:id="htmlChunk1"/>
    <w:sectPr>
      <w:footerReference w:type="default" r:id="footerRel"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1247" w:right="1134" w:bottom="1134" w:left="1531" w:header="500" w:footer="500" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
'@

$documentRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="htmlChunk1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.htm"/>
  <Relationship Id="footerRel" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>
'@

$chunkRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="image1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>
'@

$footerXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="7D715E"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>
'@

$coreXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>FA26SE032 SCANMS - Report 1 Project Introduction</dc:title>
  <dc:subject>SEP490 Capstone Project Report 1</dc:subject>
  <dc:creator>FA26SE032 - SCANMS Team</dc:creator>
  <cp:lastModifiedBy>FA26SE032 - SCANMS Team</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-09-16T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-09-16T00:00:00Z</dcterms:modified>
</cp:coreProperties>
'@

$appXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Company>FPT University</Company>
  <AppVersion>16.0000</AppVersion>
</Properties>
'@

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Add-ZipText([IO.Compression.ZipArchive]$Zip, [string]$Name, [string]$Text) {
  $entry = $Zip.CreateEntry($Name, [IO.Compression.CompressionLevel]::Optimal)
  $stream = $entry.Open()
  try {
    $utf8 = New-Object Text.UTF8Encoding($false)
    $bytes = $utf8.GetBytes($Text)
    $stream.Write($bytes, 0, $bytes.Length)
  }
  finally { $stream.Dispose() }
}

function Add-ZipBytes([IO.Compression.ZipArchive]$Zip, [string]$Name, [byte[]]$Bytes) {
  $entry = $Zip.CreateEntry($Name, [IO.Compression.CompressionLevel]::Optimal)
  $stream = $entry.Open()
  try { $stream.Write($Bytes, 0, $Bytes.Length) }
  finally { $stream.Dispose() }
}

$fileStream = [IO.File]::Open($docxPath, [IO.FileMode]::Create, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
  $zip = New-Object IO.Compression.ZipArchive($fileStream, [IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    Add-ZipText $zip '[Content_Types].xml' $contentTypes
    Add-ZipText $zip '_rels/.rels' $rootRels
    Add-ZipText $zip 'word/document.xml' $documentXml
    Add-ZipText $zip 'word/_rels/document.xml.rels' $documentRels
    Add-ZipText $zip 'word/afchunk.htm' $packageHtml
    Add-ZipText $zip 'word/_rels/afchunk.htm.rels' $chunkRels
    Add-ZipBytes $zip 'word/media/image1.png' ([IO.File]::ReadAllBytes($LogoPath))
    Add-ZipText $zip 'word/footer1.xml' $footerXml
    Add-ZipText $zip 'docProps/core.xml' $coreXml
    Add-ZipText $zip 'docProps/app.xml' $appXml
  }
  finally { $zip.Dispose() }
}
finally { $fileStream.Dispose() }

Write-Output "DOCX: $docxPath"
Write-Output "HTML: $renderedHtmlPath"
