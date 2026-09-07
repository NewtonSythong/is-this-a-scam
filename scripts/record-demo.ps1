<#
.SYNOPSIS
    Sets up a screen recording of the app, and hands you each demo message in
    turn on the clipboard.

.DESCRIPTION
    The parts of recording a demo that a script can usefully do: check the live
    site still answers the way the shot list assumes, make the output folder,
    open the app and OBS, and put each message on the clipboard so nothing has
    to be typed on camera.

    What to show and why is in docs/demo-recording.md. Read that first; this
    script assumes it.

    Deliberately does NOT write OBS configuration. OBS rewrites its own config
    files when it exits, so anything generated behind its back is liable to be
    silently discarded. The one-time OBS setup is three minutes by hand and is
    written down in the runbook.

.PARAMETER Take
    Put one demo message on the clipboard (1, 2 or 3) and print its caption.
    Nothing else runs, so this is safe to call mid-recording.

.PARAMETER Url
    The deployment to demo and to preflight against. Defaults to production.

.PARAMETER ObsProfile
    OBS profile name. Must match the one made during the one-time setup.

.PARAMETER ObsCollection
    OBS scene collection name.

.PARAMETER SkipPreflight
    Skip the live check. Only reasonable when you have just run it.

.PARAMETER StartRecording
    Start OBS already recording. Off by default: you almost always want to
    place the Chrome window in the frame before anything is captured.

.EXAMPLE
    .\scripts\record-demo.ps1
    .\scripts\record-demo.ps1 -Take 1
#>

[CmdletBinding()]
param(
    [ValidateRange(1, 3)]
    [int]$Take = 0,

    [string]$Url = "https://is-this-a-scam-pink.vercel.app",

    [string]$ObsProfile = "IsThisAScam Demo",

    [string]$ObsCollection = "IsThisAScam Demo",

    [switch]$SkipPreflight,

    [switch]$StartRecording
)

$ErrorActionPreference = "Stop"

# The registered-trademark sign is built rather than typed because this file is
# UTF-8 and Windows PowerShell 5.1 reads a BOM-less file as ANSI. A literal
# would arrive at the API mangled, and the first message is quoted verbatim
# from NZ Post -- so it has to go up exactly as they published it.
$R = [char]0x00AE

$Takes = @(
    [pscustomobject]@{
        Number  = 1
        Name    = "NZ Post signature, lookalike host"
        Expect  = "scam"
        Caption = "A real NZ Post scam. The link doesn't say nzpost anywhere."
        Point   = "mypost.securebn.homes has no brand name in it. A rule looking for 'nzpost' inside the host sees nothing."
        Message = "NZ Post$R We attempted to deliver your NZ Post parcel on 1 December. Unfortunately, we were unable to contact you in person, and as this parcel requires a signature upon collection, delivery could not be completed. Please arrange a new delivery date immediately. Click here to select a new date: https://mypost.securebn.homes/nz"
    },
    [pscustomobject]@{
        Number  = 2
        Name    = "Warehouse text, nothing to look up"
        Expect  = "warning"
        Caption = "No link. No brand name. Nothing to look up."
        Point   = "Only the story is wrong, so only the narrative half of the engine can reach it."
        Message = "Your package has arrived at the warehouse and has been suspended for delivery due to a missing home number in the package."
    },
    [pscustomobject]@{
        Number  = 3
        Name    = "Genuine ASB payment check"
        Expect  = "unclear"
        Caption = "A genuine bank text. It stays quiet."
        Point   = "THE SHOT THAT MATTERS. Same shape as the reply-Y scam, and it does not cry wolf. Give it the most screen time."
        Message = 'ASB: Did you make a payment of $250.00 to a new payee at 2:14pm? Reply YES if this was you, or NO if it was not.'
    }
)

function Write-Head($text) {
    Write-Host ""
    Write-Host "  $text" -ForegroundColor Cyan
}

function Write-Ok($text)   { Write-Host "  [ok]   $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "  [warn] $text" -ForegroundColor Yellow }
function Write-Bad($text)  { Write-Host "  [FAIL] $text" -ForegroundColor Red }

# ---------------------------------------------------------------- -Take mode

if ($Take -gt 0) {
    $t = $Takes | Where-Object { $_.Number -eq $Take }
    Set-Clipboard -Value $t.Message
    Write-Head "Take $($t.Number) - $($t.Name)"
    Write-Host "  On the clipboard. Paste it into the app and stop typing." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  expect  : $($t.Expect)"
    Write-Host "  caption : $($t.Caption)"
    Write-Host "  point   : $($t.Point)"
    Write-Host ""
    exit 0
}

# --------------------------------------------------------------- Preflight

Write-Host ""
Write-Host "  Is This a Scam? - demo recording setup" -ForegroundColor Cyan
Write-Host "  $Url" -ForegroundColor DarkGray

if (-not $SkipPreflight) {
    Write-Head "Checking the live site still answers the way the shot list promises"

    $failed = $false
    foreach ($t in $Takes) {
        $json = @{ message = $t.Message } | ConvertTo-Json -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        try {
            $res = Invoke-RestMethod -Uri "$Url/api/check" -Method Post -Body $bytes `
                -ContentType "application/json; charset=utf-8" -TimeoutSec 60
        }
        catch {
            Write-Bad "take $($t.Number): the site did not answer - $($_.Exception.Message)"
            $failed = $true
            continue
        }

        if ($res.level -eq $t.Expect) {
            Write-Ok "take $($t.Number): $($res.level) - $($t.Name)"
        }
        else {
            Write-Bad "take $($t.Number): expected '$($t.Expect)', got '$($res.level)' - $($t.Name)"
            $failed = $true
        }
    }

    if ($failed) {
        Write-Host ""
        Write-Warn "A verdict has moved. That is a finding about the app, not a"
        Write-Warn "problem with this script -- the video's argument rests on"
        Write-Warn "take 3 staying quiet. Look at why before recording."
        Write-Host ""
        $reply = Read-Host "  Record anyway? [y/N]"
        if ($reply -notmatch '^[Yy]') { exit 1 }
    }
}

# ----------------------------------------------------------------- Output

$outDir = Join-Path $env:USERPROFILE "Videos\is-this-a-scam"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}
Write-Head "Recordings go to"
Write-Host "  $outDir" -ForegroundColor Gray

# -------------------------------------------------------------------- OBS

$obsCandidates = @(
    "C:\Program Files\obs-studio\bin\64bit\obs64.exe",
    "C:\Program Files (x86)\obs-studio\bin\64bit\obs64.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\obs-studio\bin\64bit\obs64.exe")
)
$obs = $obsCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$obsConfig = Join-Path $env:APPDATA "obs-studio\basic"
$profileOk = Test-Path (Join-Path $obsConfig "profiles\$ObsProfile")

# Scene collections are stored under a sanitised filename, so match on the
# "name" inside each file rather than guessing what OBS called it on disk.
$collectionOk = $false
$sceneDir = Join-Path $obsConfig "scenes"
if (Test-Path $sceneDir) {
    foreach ($f in Get-ChildItem $sceneDir -Filter *.json) {
        try {
            $parsed = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($parsed.name -eq $ObsCollection) { $collectionOk = $true }
        }
        catch { }
    }
}

Write-Head "OBS"
if (-not $obs) {
    Write-Warn "OBS not found in the usual places. Start it yourself."
}
else {
    if (-not $profileOk)    { Write-Warn "no profile '$ObsProfile' -- see docs/demo-recording.md, one-time setup" }
    if (-not $collectionOk) { Write-Warn "no scene collection '$ObsCollection' -- same section" }

    $obsArgs = @("--disable-updater")
    if ($profileOk)      { $obsArgs += @("--profile", $ObsProfile) }
    if ($collectionOk)   { $obsArgs += @("--collection", $ObsCollection) }
    if ($StartRecording) { $obsArgs += "--startrecording" }

    # OBS refuses to start unless its working directory is its own bin folder.
    Start-Process -FilePath $obs -WorkingDirectory (Split-Path $obs) -ArgumentList $obsArgs
    Write-Ok "launched"
    if (-not $StartRecording) {
        Write-Host "  Not recording yet. Frame the window, then hit your record hotkey." -ForegroundColor Gray
    }
}

Start-Process $Url

# -------------------------------------------------------------- Shot list

Write-Head "Frame it as a phone"
Write-Host "  Chrome: F12, then Ctrl+Shift+M, iPhone 14 Pro Max, close the DevTools panel."
Write-Host "  Crop to the phone in OBS. Output 1080x1350."

Write-Head "Shot list"
foreach ($t in $Takes) {
    Write-Host ""
    Write-Host "  $($t.Number). $($t.Name)  ->  $($t.Expect)" -ForegroundColor White
    Write-Host "     caption: $($t.Caption)" -ForegroundColor Gray
    Write-Host "     $($t.Point)" -ForegroundColor DarkGray
    Write-Host "     .\scripts\record-demo.ps1 -Take $($t.Number)" -ForegroundColor DarkCyan
}
Write-Host ""
Write-Host "  4. Closing beat" -ForegroundColor White
Write-Host "     The 'how to check' line, which names ASB's real number, then /asked --" -ForegroundColor Gray
Write-Host "     three buttons, no typing. End on the URL. Nothing else." -ForegroundColor Gray
Write-Host "     caption: It never says 'safe' -- it gives you the real number to ring." -ForegroundColor Gray
Write-Host ""
Write-Host "  Full runbook: docs/demo-recording.md" -ForegroundColor DarkGray
Write-Host ""
