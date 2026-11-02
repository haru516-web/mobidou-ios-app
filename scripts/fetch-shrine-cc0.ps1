$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '../assets/prayer-first-person/realistic-sources'
$headers = @{'User-Agent'='blender-mcp/1.8.0 (+https://github.com/ahujasid/blender-mcp)'}
New-Item -ItemType Directory -Force $root | Out-Null
function Fetch-File($record, $path) {
    if (!(Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Force (Split-Path $path) | Out-Null
        Invoke-WebRequest $record.url -Headers $headers -OutFile $path -TimeoutSec 90
    }
    if ($record.md5 -and (Get-FileHash -LiteralPath $path -Algorithm MD5).Hash.ToLower() -ne $record.md5) { throw "Checksum mismatch: $path" }
}
foreach ($id in @('stone_tiles_02','forest_slope','pine_tree_01','rock_moss_set_01','forest_floor','wood_planks_dirt')) {
    $dir=Join-Path $root $id
    New-Item -ItemType Directory -Force $dir | Out-Null
    $data=Invoke-RestMethod "https://api.polyhaven.com/files/$id" -Headers $headers -TimeoutSec 30
    $data | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $dir 'files.json') -Encoding utf8
    $info=Invoke-RestMethod "https://api.polyhaven.com/info/$id" -Headers $headers -TimeoutSec 30
    $info | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $dir 'info.json') -Encoding utf8
    if ($id -in @('stone_tiles_02','forest_floor','wood_planks_dirt')) {
        foreach($map in @('Diffuse','Rough','nor_gl')) { Fetch-File $data.$map.'2k'.jpg (Join-Path $dir "$map.jpg") }
    } elseif ($id -eq 'forest_slope') {
        Fetch-File $data.hdri.'2k'.hdr (Join-Path $dir 'lighting.hdr')
    } elseif ($id -eq 'pine_tree_01') {
        foreach($map in @('twig_diff','twig_alpha','twig_mask','bark_diff','bark_nor_gl')) {
            $record=$data.$map.'1k'.png
            if (!$record) { $record=$data.$map.'1k'.jpg }
            $extension=[IO.Path]::GetExtension(([uri]$record.url).AbsolutePath)
            Fetch-File $record (Join-Path $dir "$map$extension")
        }
    } else {
        $record=$data.gltf.'1k'.gltf
        Fetch-File $record (Join-Path $dir 'model.gltf')
        foreach($property in $record.include.PSObject.Properties) { Fetch-File $property.Value (Join-Path $dir $property.Name) }
    }
    Write-Output "Verified CC0 source: $id"
}
