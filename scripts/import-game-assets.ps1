param(
    [string]$GamePath = 'C:\Program Files (x86)\Steam\steamapps\common\Stardew Valley'
)

$ErrorActionPreference = 'Stop'

$projectPath = Split-Path -Parent $PSScriptRoot
$localPath = Join-Path $projectPath 'local-assets'
$toolsPath = Join-Path $localPath 'tools'
$destination = Join-Path $localPath 'unpacked'
$gameContent = Join-Path $GamePath 'Content'
$gameOutput = Join-Path $GamePath 'Content (unpacked)'
$gameTool = Join-Path $GamePath 'StardewXnbHack.exe'
$version = '1.1.0' # Compatible with the installed SMAPI 4.0.7 (requires 4.0.6+).
$zipName = "StardewXnbHack-$version-for-Windows.zip"
$zipPath = Join-Path $toolsPath $zipName
$toolFolder = Join-Path $toolsPath "StardewXnbHack-$version-for-Windows"
$downloadUrl = "https://github.com/Pathoschild/StardewXnbHack/releases/download/$version/$zipName"

if (-not (Test-Path -LiteralPath $gameContent -PathType Container)) {
    throw "Game content folder not found: $gameContent"
}
if (-not (Test-Path -LiteralPath (Join-Path $GamePath 'StardewModdingAPI.exe') -PathType Leaf)) {
    throw 'SMAPI is required by StardewXnbHack. Install SMAPI before running this script.'
}
if (Test-Path -LiteralPath $destination) {
    throw "Local extraction already exists: $destination. Review it before running again."
}

New-Item -ItemType Directory -Path $toolsPath -Force | Out-Null
if (-not (Test-Path -LiteralPath $zipPath -PathType Leaf)) {
    Write-Host "Downloading StardewXnbHack $version..."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
}
if (-not (Test-Path -LiteralPath $toolFolder -PathType Container)) {
    Expand-Archive -LiteralPath $zipPath -DestinationPath $toolFolder
}
$downloadedTool = Get-ChildItem -LiteralPath $toolFolder -Recurse -File -Filter 'StardewXnbHack.exe' | Select-Object -First 1
if (-not $downloadedTool) {
    throw "StardewXnbHack.exe was not found inside $zipPath"
}

if (Test-Path -LiteralPath $gameTool -PathType Leaf) {
    if ((Get-FileHash -LiteralPath $gameTool).Hash -ne (Get-FileHash -LiteralPath $downloadedTool.FullName).Hash) {
        throw "A different StardewXnbHack.exe already exists in the game folder: $gameTool"
    }
} else {
    Copy-Item -LiteralPath $downloadedTool.FullName -Destination $gameTool
}

if (-not (Test-Path -LiteralPath $gameOutput -PathType Container)) {
    Write-Host 'Unpacking game content...'
    $sourceCount = @(Get-ChildItem -LiteralPath $gameContent -Recurse -File -Filter '*.xnb').Count
    $process = Start-Process -FilePath $gameTool -WorkingDirectory $GamePath -WindowStyle Hidden -PassThru
    $deadline = (Get-Date).AddMinutes(10)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 5
        if ($process.HasExited) {
            if ($process.ExitCode -ne 0) {
                throw "StardewXnbHack failed with exit code $($process.ExitCode). Run it in a Windows console to see its error."
            }
            break
        }
        if (-not (Test-Path -LiteralPath $gameOutput -PathType Container)) {
            continue
        }
        $outputFiles = @(Get-ChildItem -LiteralPath $gameOutput -Recurse -File)
        if ($outputFiles.Count -lt $sourceCount) {
            continue
        }
        $lastWrite = ($outputFiles | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1).LastWriteTimeUtc
        if (([datetime]::UtcNow - $lastWrite).TotalSeconds -ge 15) {
            # The unpacker waits for a key after finishing. Stop only the process started above.
            Stop-Process -Id $process.Id
            break
        }
    }
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id
        throw 'Timed out waiting for the unpacker. Check the game folder before retrying.'
    }
}
if (-not (Test-Path -LiteralPath $gameOutput -PathType Container)) {
    throw "Expected unpacked content was not created: $gameOutput"
}
& (Join-Path $PSScriptRoot 'verify-extraction.ps1') -GamePath $GamePath -UnpackedPath $gameOutput

Write-Host 'Copying the unpacked content into the project...'
Copy-Item -LiteralPath $gameOutput -Destination $destination -Recurse

$files = @(Get-ChildItem -LiteralPath $destination -Recurse -File | Sort-Object FullName | ForEach-Object {
    [pscustomobject]@{
        path = $_.FullName.Substring($destination.Length + 1).Replace('\', '/')
        extension = $_.Extension.ToLowerInvariant()
        bytes = $_.Length
    }
})
$manifest = [ordered]@{
    sourceGamePath = $GamePath
    gameVersion = (Get-Item -LiteralPath (Join-Path $GamePath 'Stardew Valley.exe')).VersionInfo.ProductVersion
    unpackerVersion = $version
    extractedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    fileCount = $files.Count
    files = $files
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $localPath 'manifest.json') -Encoding UTF8

Write-Host "Imported $($files.Count) files to $destination"
Write-Host "Index: $(Join-Path $localPath 'manifest.json')"
