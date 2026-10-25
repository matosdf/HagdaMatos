param([string]$AppUrl='http://localhost:3000',[switch]$WithBackendSecret)
$ErrorActionPreference='Stop'
# Execute você mesma(o) em um terminal separado. Valores nunca são impressos.
$projectRoot = Split-Path -Parent $PSScriptRoot
$supabaseUrl = Read-Host 'URL do projeto Supabase (pública)'
$publicKey = Read-Host 'Chave publishable (pública)'
$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = 'node'
$startInfo.WorkingDirectory = $projectRoot
$startInfo.UseShellExecute = $false
$startInfo.ArgumentList.Add('node_modules/next/dist/bin/next')
$startInfo.ArgumentList.Add('dev')
$startInfo.Environment['NEXT_PUBLIC_SUPABASE_URL'] = $supabaseUrl
$startInfo.Environment['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] = $publicKey
$startInfo.Environment['NEXT_PUBLIC_APP_URL'] = $AppUrl
$startInfo.Environment['REGISTRATION_ENABLED'] = 'true'
$startInfo.Environment['BILLING_ENABLED'] = 'false'
$startInfo.Environment['ASAAS_INTEGRATION_READY'] = 'false'
$startInfo.Environment['ASAAS_ALLOW_PRODUCTION'] = 'false'
$startInfo.Environment['SUPABASE_SECRET_KEY'] = ''
$startInfo.Environment['SUPABASE_SERVICE_ROLE_KEY'] = ''
$startInfo.Environment['ASAAS_API_KEY'] = ''
if($WithBackendSecret){
  $secret = Read-Host 'Chave SECRET do Supabase (entrada oculta)' -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try { $startInfo.Environment['SUPABASE_SECRET_KEY'] = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
try {
  $process = [System.Diagnostics.Process]::Start($startInfo)
  $startInfo.Environment.Remove('SUPABASE_SECRET_KEY') | Out-Null
  Write-Host 'Servidor iniciado. Nenhum valor secreto foi impresso ou salvo neste script.'
  $process.WaitForExit()
} finally { $startInfo.Environment.Remove('SUPABASE_SECRET_KEY') | Out-Null }
