Add-Type -AssemblyName System.Drawing

function New-Icon {
    param(
        [int]$Size,
        [string]$OutPath
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # 배경: 팔레트 series-6 green, 살짝 라운드 사각형(마스커블 아이콘 세이프존 고려)
    $bg = [System.Drawing.Color]::FromArgb(255, 0x00, 0x83, 0x00)
    $brush = New-Object System.Drawing.SolidBrush($bg)
    $radius = [int]($Size * 0.18)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($Size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $Size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)

    # 글자 "N" 흰색, 중앙 정렬
    $fontSize = [int]($Size * 0.55)
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $g.DrawString("N", $font, $textBrush, $rect, $format)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Saved $OutPath"
}

$dir = "C:\Users\user\Claude\naite-dashboard\assets\icons"
New-Icon -Size 192 -OutPath (Join-Path $dir "icon-192.png")
New-Icon -Size 512 -OutPath (Join-Path $dir "icon-512.png")
New-Icon -Size 180 -OutPath (Join-Path $dir "apple-touch-icon.png")
