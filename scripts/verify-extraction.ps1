param(
    [string]$GamePath = 'C:\Program Files (x86)\Steam\steamapps\common\Stardew Valley',
    [string]$UnpackedPath = (Join-Path $GamePath 'Content (unpacked)')
)

$ErrorActionPreference = 'Stop'
$GamePath = (Resolve-Path -LiteralPath $GamePath).Path
$UnpackedPath = (Resolve-Path -LiteralPath $UnpackedPath).Path
$contentPath = Join-Path $GamePath 'Content'
if (-not (Test-Path -LiteralPath $contentPath -PathType Container)) {
    throw "Game content folder not found: $contentPath"
}
if (-not (Test-Path -LiteralPath $UnpackedPath -PathType Container)) {
    throw "Unpacked folder not found: $UnpackedPath"
}

$sourceFiles = @(Get-ChildItem -LiteralPath $contentPath -Recurse -File -Filter '*.xnb')
$outputFiles = @(Get-ChildItem -LiteralPath $UnpackedPath -Recurse -File)
$outputStems = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($file in $outputFiles) {
    $relativePath = $file.FullName.Substring($UnpackedPath.Length + 1)
    [void]$outputStems.Add($relativePath.Substring(0, $relativePath.Length - $file.Extension.Length))
}

$missing = @($sourceFiles | Where-Object {
    $relativePath = $_.FullName.Substring($contentPath.Length + 1)
    -not $outputStems.Contains($relativePath.Substring(0, $relativePath.Length - $_.Extension.Length))
} | ForEach-Object { $_.FullName.Substring($contentPath.Length + 1) })

[pscustomobject]@{
    SourceXnbFiles = $sourceFiles.Count
    UnpackedFiles = $outputFiles.Count
    MissingSources = $missing.Count
    PngFiles = @($outputFiles | Where-Object Extension -EQ '.png').Count
    TmxFiles = @($outputFiles | Where-Object Extension -EQ '.tmx').Count
    JsonFiles = @($outputFiles | Where-Object Extension -EQ '.json').Count
    FallbackXnbFiles = @($outputFiles | Where-Object Extension -EQ '.xnb').Count
} | Format-List

if ($missing.Count -gt 0) {
    $missing | Select-Object -First 20 | ForEach-Object { Write-Error "Missing: $_" }
    throw "Extraction is missing $($missing.Count) source assets."
}
