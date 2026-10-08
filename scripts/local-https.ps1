param([switch]$Trust)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$certificatePath = Join-Path $projectPath '.certs'
$pfxPath = Join-Path $certificatePath 'localhost.pfx'
$publicPath = Join-Path $certificatePath 'localhost.cer'
$passphrasePath = Join-Path $certificatePath 'passphrase'

New-Item -ItemType Directory -Path $certificatePath -Force | Out-Null
# Only the current Windows user and SYSTEM may read the local TLS private key.
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object System.Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')), 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
[System.IO.Directory]::SetAccessControl($certificatePath, $acl)

if (!(Test-Path -LiteralPath $pfxPath)) {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $passphrase = [Convert]::ToBase64String($bytes)
    $securePassphrase = ConvertTo-SecureString -String $passphrase -AsPlainText -Force
    $cert = New-SelfSignedCertificate -Type SSLServerAuthentication -Subject 'CN=localhost' -FriendlyName 'CampusLoop localhost HTTPS' -CertStoreLocation 'Cert:\CurrentUser\My' -KeyExportPolicy Exportable -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddMonths(12) -TextExtension @('2.5.29.17={text}DNS=localhost&IPAddress=127.0.0.1&IPAddress=::1','2.5.29.19={critical}{text}ca=false')
    Export-Certificate -Cert $cert -FilePath $publicPath -Type CERT | Out-Null
    [System.IO.File]::WriteAllText($passphrasePath, $passphrase, (New-Object System.Text.UTF8Encoding($false)))
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassphrase -CryptoAlgorithmOption AES256_SHA256 | Out-Null
    Write-Host 'Created a localhost-only TLS certificate. No secrets were printed.'
}

$publicCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($publicPath)
if ($publicCert.NotAfter -lt (Get-Date)) { throw 'The local certificate has expired. Remove the .certs files and rerun local HTTPS setup to renew it.' }
if ($Trust) {
    # Trust this server certificate for this Windows user, not a general-purpose CA.
    Import-Certificate -FilePath $publicPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $certificatePath 'enabled'), 'Windows current-user trust configured', (New-Object System.Text.UTF8Encoding($false)))
    Write-Host 'CampusLoop localhost certificate is trusted for your Windows user.'
} else {
    Write-Host 'Certificate generated but not trusted yet. Run ENABLE_LOCAL_HTTPS.bat to trust it.'
}
Write-Host 'Restart CampusLoop, then open https://localhost:3443'
Write-Host 'The old http://localhost:3000 address will redirect to HTTPS.'
