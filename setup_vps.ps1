# ============================================
# VPS Setup via Posh-SSH - SSR News
# ============================================
param()

# Install Posh-SSH if needed
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH..." -ForegroundColor Yellow
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber -SkipPublisherCheck
}
Import-Module Posh-SSH -Force

# VPS details
$VPS_IP   = "72.62.60.234"
$VPS_USER = "root"
$VPS_PASS = '221069aa$rr'

$SecPass = ConvertTo-SecureString $VPS_PASS -AsPlainText -Force
$Cred    = New-Object System.Management.Automation.PSCredential($VPS_USER, $SecPass)

Write-Host "`nConnecting to $VPS_IP ..." -ForegroundColor Cyan
$sess = New-SSHSession -ComputerName $VPS_IP -Credential $Cred -AcceptKey -Force -ErrorAction Stop
Write-Host "Connected!" -ForegroundColor Green

# Read the bash script and encode as base64
$scriptPath = "c:\Users\User\דופמין\vps_setup.sh"
$scriptContent = Get-Content $scriptPath -Raw -Encoding UTF8
$bytes = [System.Text.Encoding]::UTF8.GetBytes($scriptContent)
$b64 = [System.Convert]::ToBase64String($bytes)

Write-Host "`nUploading setup script to VPS..." -ForegroundColor Yellow

# Upload via base64 and execute
$uploadCmd = "echo '$b64' | base64 -d > /root/setup_n8n.sh && chmod +x /root/setup_n8n.sh && echo 'Script uploaded OK'"
$r = Invoke-SSHCommand -SessionId $sess.SessionId -Command $uploadCmd -TimeOut 30
Write-Host $r.Output

Write-Host "`nRunning setup script on VPS (this takes ~2 minutes)..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

$r = Invoke-SSHCommand -SessionId $sess.SessionId -Command "bash /root/setup_n8n.sh 2>&1" -TimeOut 300
Write-Host $r.Output

Write-Host "`nCleaning up..." -ForegroundColor Gray
Invoke-SSHCommand -SessionId $sess.SessionId -Command "rm -f /root/setup_n8n.sh" | Out-Null

Remove-SSHSession -SessionId $sess.SessionId
Write-Host "`nDone!" -ForegroundColor Green
