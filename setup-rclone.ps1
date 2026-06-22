#Requires -Version 5.1
<#
.SYNOPSIS
    Downloads and sets up Rclone for the Symbiosis Stream Engine on Windows.

.DESCRIPTION
    This script:
    1. Downloads the official Rclone Windows AMD64 zip
    2. Extracts rclone.exe into a local .bin/ directory
    3. Verifies the binary
    4. Manages .gitignore
    5. Prints the daemon start command

.NOTES
    Run from the project root: .\setup-rclone.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# -- Configuration ------------------------------------------------------------

$ProjectRoot   = $PSScriptRoot
$BinDir        = Join-Path $ProjectRoot ".bin"
$RcloneExe     = Join-Path $BinDir "rclone.exe"
$DownloadUrl   = "https://downloads.rclone.org/rclone-current-windows-amd64.zip"
$TempZip       = Join-Path $env:TEMP "rclone-windows-amd64.zip"
$TempExtract   = Join-Path $env:TEMP "rclone-extract-$([System.Guid]::NewGuid().ToString('N').Substring(0,8))"
$GitignorePath = Join-Path $ProjectRoot ".gitignore"

# -- Banner -------------------------------------------------------------------

Write-Host ""
Write-Host "  +--------------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |     SYMBIOSIS - Rclone Setup Script              |" -ForegroundColor Cyan
Write-Host "  +--------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

# -- Idempotency Check --------------------------------------------------------

if (Test-Path $RcloneExe) {
    Write-Host "  [!] rclone.exe already exists at: $RcloneExe" -ForegroundColor Yellow
    Write-Host ""
    $choice = Read-Host "  Re-download? (y/N)"
    if ($choice -ne "y" -and $choice -ne "Y") {
        Write-Host "  Skipping download. Using existing binary." -ForegroundColor Green
        Write-Host ""

        # Still verify and show daemon command
        & $RcloneExe version
        Write-Host ""
        Write-Host "  To start the Rclone RC daemon, run:" -ForegroundColor Cyan
        Write-Host "    .bin\rclone.exe rcd --rc-no-auth --rc-addr=:5572" -ForegroundColor White
        Write-Host ""
        exit 0
    }
}

# -- Create .bin directory ----------------------------------------------------

if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
    Write-Host "  [+] Created directory: .bin/" -ForegroundColor Green
}

# -- Download Rclone ----------------------------------------------------------

Write-Host "  [~] Downloading Rclone from:" -ForegroundColor Cyan
Write-Host "      $DownloadUrl" -ForegroundColor Gray
Write-Host ""

try {
    # Use BITS for better progress display, fallback to Invoke-WebRequest
    $ProgressPreference = 'Continue'
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempZip -UseBasicParsing
    Write-Host "  [+] Download complete." -ForegroundColor Green
}
catch {
    Write-Host "  [X] Download failed: $_" -ForegroundColor Red
    exit 1
}

# -- Extract rclone.exe -------------------------------------------------------

Write-Host "  [~] Extracting rclone.exe..." -ForegroundColor Cyan

try {
    # Clean up any previous temp extraction
    if (Test-Path $TempExtract) {
        Remove-Item -Recurse -Force $TempExtract
    }

    Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force

    # Find rclone.exe inside the extracted archive
    # The zip contains a folder like rclone-v1.XX.X-windows-amd64/rclone.exe
    $extracted = Get-ChildItem -Path $TempExtract -Recurse -Filter "rclone.exe" | Select-Object -First 1

    if (-not $extracted) {
        throw "Could not find rclone.exe in the downloaded archive."
    }

    Copy-Item -Path $extracted.FullName -Destination $RcloneExe -Force
    Write-Host "  [+] Extracted to: .bin/rclone.exe" -ForegroundColor Green
}
catch {
    Write-Host "  [X] Extraction failed: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Clean up temp files
    if (Test-Path $TempZip)     { Remove-Item -Force $TempZip }
    if (Test-Path $TempExtract) { Remove-Item -Recurse -Force $TempExtract }
    Write-Host "  [+] Cleaned up temporary files." -ForegroundColor Green
}

# -- Verify Binary ------------------------------------------------------------

Write-Host ""
Write-Host "  [~] Verifying rclone binary..." -ForegroundColor Cyan

try {
    $versionOutput = & $RcloneExe version 2>&1
    Write-Host ""
    Write-Host "  Installed version:" -ForegroundColor Green
    $versionOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
}
catch {
    Write-Host "  [X] Verification failed. rclone.exe may be corrupted." -ForegroundColor Red
    Write-Host "      Error: $_" -ForegroundColor Red
    exit 1
}

# -- Manage .gitignore --------------------------------------------------------

Write-Host ""

if (Test-Path $GitignorePath) {
    $gitignoreContent = Get-Content $GitignorePath -Raw
    if ($gitignoreContent -notmatch '(?m)^\.bin/?$') {
        Add-Content -Path $GitignorePath -Value "`n.bin/" -NoNewline:$false
        Write-Host "  [+] Added '.bin/' to existing .gitignore" -ForegroundColor Green
    } else {
        Write-Host "  [=] '.bin/' already in .gitignore" -ForegroundColor Gray
    }
} else {
    Set-Content -Path $GitignorePath -Value ".bin/`nnode_modules/`n"
    Write-Host "  [+] Created .gitignore with '.bin/' entry" -ForegroundColor Green
}

# -- Final Instructions -------------------------------------------------------

Write-Host ""
Write-Host "  +--------------------------------------------------+" -ForegroundColor Green
Write-Host "  |  Setup Complete!                                 |" -ForegroundColor Green
Write-Host "  +--------------------------------------------------+" -ForegroundColor Green
Write-Host "  |                                                  |" -ForegroundColor Green
Write-Host "  |  To start the Rclone RC daemon, run:             |" -ForegroundColor Green
Write-Host "  |                                                  |" -ForegroundColor Green
Write-Host "  |  .bin\rclone.exe rcd --rc-no-auth --rc-addr=:5572|" -ForegroundColor White
Write-Host "  |                                                  |" -ForegroundColor Green
Write-Host "  +--------------------------------------------------+" -ForegroundColor Green
Write-Host ""
