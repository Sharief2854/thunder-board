Add-Type -AssemblyName System.Drawing

$src = 'C:/Users/gotlu/.gemini/antigravity/brain/ce7d9d8d-3663-4293-b43e-0962029ae8b3/.user_uploaded/media_1788963057445.jpg'
$img = [System.Drawing.Image]::FromFile($src)

function Resize-Img($image, $w, $h) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($image, 0, 0, $w, $h)
    $g.Dispose()
    return $bmp
}

$png256 = Resize-Img $img 256 256
$png256.Save('d:/sharief/smart-board/public/icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$png256.Save('d:/sharief/smart-board/build/icon.png', [System.Drawing.Imaging.ImageFormat]::Png)

$png512 = Resize-Img $img 512 512
$png512.Save('d:/sharief/smart-board/build/icon-512.png', [System.Drawing.Imaging.ImageFormat]::Png)

$sizes = @(256, 128, 64, 48, 32, 16)
$entries = @()

foreach ($s in $sizes) {
    $resized = Resize-Img $img $s $s
    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    $resized.Dispose()
    $entries += ,@($s, $bytes)
}

$img.Dispose()

$icoStream = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $icoStream

$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$sizes.Count)

$offset = 6 + ($sizes.Count * 16)

foreach ($e in $entries) {
    $dim = $e[0]
    $data = $e[1]
    $wByte = if ($dim -ge 256) { 0 } else { $dim }
    $bw.Write([byte]$wByte)
    $bw.Write([byte]$wByte)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([UInt16]1)
    $bw.Write([UInt16]32)
    $bw.Write([UInt32]$data.Length)
    $bw.Write([UInt32]$offset)
    $offset += $data.Length
}

foreach ($e in $entries) {
    $bw.Write($e[1])
}

$bw.Flush()
[System.IO.File]::WriteAllBytes('d:/sharief/smart-board/build/icon.ico', $icoStream.ToArray())
[System.IO.File]::WriteAllBytes('d:/sharief/smart-board/public/favicon.ico', $icoStream.ToArray())
$bw.Dispose()
$icoStream.Dispose()
Write-Host 'Icon conversion complete!'
