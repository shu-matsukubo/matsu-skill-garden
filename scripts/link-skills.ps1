param(
    [string]$Destination = 'C:\Users\docha\.codex\skills',
    [ValidateSet('SymbolicLink', 'Junction')]
    [string]$LinkType = 'SymbolicLink'
)
$ErrorActionPreference = 'Stop'
$gardenRoot = Split-Path -Parent $PSScriptRoot
$sharedRoot = Join-Path $gardenRoot 'skills'
$destinationPath = [IO.Path]::GetFullPath($Destination)
if (-not (Test-Path -LiteralPath $destinationPath -PathType Container)) {
    throw "Destination must already exist: $destinationPath"
}
$skills = @(Get-ChildItem -LiteralPath $sharedRoot -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') -PathType Leaf })
$planned = @()
foreach ($skill in $skills) {
    $linkPath = Join-Path $destinationPath $skill.Name
    $existing = Get-Item -LiteralPath $linkPath -Force -ErrorAction SilentlyContinue
    if ($existing) {
        if ($existing.LinkType -ne $LinkType -or
            [IO.Path]::GetFullPath($existing.ResolveLinkTarget($true).FullName) -ne $skill.FullName) {
            throw "Existing item will not be replaced: $linkPath"
        }
    }
    $planned += [PSCustomObject]@{ Link = $linkPath; Target = $skill.FullName; LinkType = $LinkType; Exists = [bool]$existing }
}
foreach ($item in $planned) {
    if (-not $item.Exists) { New-Item -ItemType $LinkType -Path $item.Link -Target $item.Target | Out-Null }
    $resolved = (Get-Item -LiteralPath $item.Link -Force).ResolveLinkTarget($true).FullName
    if ($resolved -ne $item.Target) { throw "Link verification failed: $($item.Link)" }
    if (-not (Test-Path -LiteralPath (Join-Path $item.Link 'SKILL.md') -PathType Leaf)) { throw "Skill unreadable: $($item.Link)" }
}
$planned | ConvertTo-Json -Depth 3
