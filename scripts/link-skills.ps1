param(
    [string]$Destination = 'C:\Users\docha\.codex\skills',
    [string]$Source = (Join-Path (Split-Path -Parent $PSScriptRoot) 'skills'),
    [ValidateSet('SymbolicLink', 'Junction')]
    [string]$LinkType = 'Junction'
)
$ErrorActionPreference = 'Stop'
function FullPath([string]$Value) {
    return [IO.Path]::TrimEndingDirectorySeparator([IO.Path]::GetFullPath($Value))
}
function ItemAt([string]$Value) {
    # Enumerating the parent also finds a junction whose target no longer exists.
    return Get-ChildItem -LiteralPath (Split-Path -Parent $Value) -Force | Where-Object { $_.Name -eq (Split-Path -Leaf $Value) }
}
function PointsTo($Item, [string]$Target) {
    if (-not $Item -or $Item.LinkType -ne $LinkType) { return $false }
    $targets = @($Item.Target)
    return $targets.Count -eq 1 -and [IO.Path]::IsPathFullyQualified($targets[0]) -and (FullPath $targets[0]) -eq $Target
}
$sharedRoot = FullPath $Source
$destinationPath = FullPath $Destination
foreach ($directory in @($sharedRoot, $destinationPath)) {
    $item = Get-Item -LiteralPath $directory -Force
    if (-not $item.PSIsContainer -or $item.LinkType) { throw "Expected a real directory: $directory" }
    # Do not operate through a reparse-point ancestor.
    for ($ancestor = $item.Parent; $ancestor; $ancestor = $ancestor.Parent) {
        if ($ancestor.LinkType) { throw "Linked ancestor is not allowed: $($ancestor.FullName)" }
    }
}
if ($destinationPath -eq $sharedRoot -or $destinationPath.StartsWith($sharedRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or $sharedRoot.StartsWith($destinationPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Source and destination must be separate directory trees'
}
$skills = @(Get-ChildItem -LiteralPath $sharedRoot -Directory -Force | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') -PathType Leaf })
$planned = @(); $retired = @(); $names = @{}
foreach ($skill in $skills) {
    if ($skill.LinkType -or $skill.Name -cnotmatch '^[a-z0-9]+(-[a-z0-9]+)*$' -or (Get-Item -LiteralPath (Join-Path $skill.FullName 'SKILL.md') -Force).LinkType) { throw "Invalid source skill: $($skill.FullName)" }
    $names[$skill.Name] = $true
    $linkPath = Join-Path $destinationPath $skill.Name
    $existing = ItemAt $linkPath
    if ($existing -and -not (PointsTo $existing $skill.FullName)) { throw "Existing item will not be replaced: $linkPath" }
    $planned += [PSCustomObject]@{ Link = $linkPath; Target = $skill.FullName; LinkType = $LinkType; Exists = [bool]$existing }
}
foreach ($item in Get-ChildItem -LiteralPath $destinationPath -Force) {
    if (-not $names.ContainsKey($item.Name) -and $item.Name -cmatch '^[a-z0-9]+(-[a-z0-9]+)*$' -and (PointsTo $item (Join-Path $sharedRoot $item.Name))) {
        $retired += [PSCustomObject]@{ Link = $item.FullName; Target = (Join-Path $sharedRoot $item.Name) }
    }
}
# Preflight the whole diff before changing anything. Recheck each item at mutation time.
foreach ($item in $planned) {
    $existing = ItemAt $item.Link
    if ($existing -and -not (PointsTo $existing $item.Target)) { throw "Link changed during sync: $($item.Link)" }
    if (-not $existing) { New-Item -ItemType $LinkType -Path $item.Link -Target $item.Target | Out-Null }
    if (-not (PointsTo (ItemAt $item.Link) $item.Target)) { throw "Link verification failed: $($item.Link)" }
    if (-not (Test-Path -LiteralPath (Join-Path $item.Link 'SKILL.md') -PathType Leaf)) { throw "Skill unreadable: $($item.Link)" }
}
foreach ($item in $retired) {
    $absolute = FullPath $item.Link
    if ((Split-Path -Parent $absolute) -ne $destinationPath -or -not (PointsTo (ItemAt $absolute) $item.Target)) { throw "Retired link changed during sync: $absolute" }
    # Nonrecursive Directory.Delete removes only this directory link, never its target.
    [IO.Directory]::Delete($absolute)
    if (ItemAt $absolute) { throw "Retired link still exists: $absolute" }
}
[PSCustomObject]@{
    Source = $sharedRoot; Destination = $destinationPath
    Created = @($planned | Where-Object { -not $_.Exists } | ForEach-Object { $_.Link })
    Kept = @($planned | Where-Object { $_.Exists } | ForEach-Object { $_.Link })
    Removed = @($retired | ForEach-Object { $_.Link })
} | ConvertTo-Json -Depth 4
