$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Listening on http://localhost:$port/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath.TrimStart('/')
        if ($localPath -eq '') { $localPath = 'index.html' }
        $fullPath = Join-Path (Get-Location) $localPath
        
        # Replace forward slashes with backslashes for Windows path resolution
        $fullPath = $fullPath -replace '/', '\'

        if (Test-Path $fullPath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($fullPath).ToLower()
            switch ($extension) {
                '.html' { $response.ContentType = 'text/html' }
                '.js'   { $response.ContentType = 'application/javascript' }
                '.css'  { $response.ContentType = 'text/css' }
                '.png'  { $response.ContentType = 'image/png' }
                '.jpg'  { $response.ContentType = 'image/jpeg' }
                '.json' { $response.ContentType = 'application/json' }
                default { $response.ContentType = 'application/octet-stream' }
            }
            
            $buffer = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentLength64 = $buffer.Length
            $output = $response.OutputStream
            $output.Write($buffer, 0, $buffer.Length)
            $output.Close()
        } else {
            $response.StatusCode = 404
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
}
