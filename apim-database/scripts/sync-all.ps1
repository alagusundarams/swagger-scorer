<#
.SYNOPSIS
    Runs the APIM Sync Script for DEV, QA, and PROD in parallel.

.DESCRIPTION
    This script launches three separate background jobs, one for each environment.
    It waits for all jobs to complete and then displays their output.
    Logs are written to unique files in the scripts/logs directory.
#>

$environments = @("DEV", "QA", "PROD")
$jobs = @()

Write-Host "🚀 Starting Parallel Sync for: $($environments -join ', ')" -ForegroundColor Cyan

foreach ($env in $environments) {
    Write-Host "   👉 Launching Job for $env..." -ForegroundColor Yellow
    
    # Start a background job for each environment
    $job = Start-Job -Name "Sync-$env" -ScriptBlock {
        param($targetEnv, $cwd)
        
        # Set Environment Variable for this session
        $env:ENVIRONMENT = $targetEnv
        
        # Change to correct directory (PowerShell jobs start in user home by default)
        Set-Location $cwd
        
        # Run the script
        # Using npx tsx to run typescript directly
        # Redirecting StdOut/StdErr is handled by the script itself logging to file, 
        # but we capture output here for the Job object too.
        npx tsx scripts/sync-apim-to-db.ts
        
    } -ArgumentList $env, (Get-Location).Path
    
    $jobs += $job
}

Write-Host "⏳ All jobs launched. Waiting for completion..." -ForegroundColor Cyan

# Wait for all jobs to complete
$results = Wait-Job -Job $jobs

Write-Host "✅ All jobs completed." -ForegroundColor Green

# Receive and display output
foreach ($job in $jobs) {
    Write-Host "`n--------------------------------------------------" -ForegroundColor Gray
    Write-Host "📄 Output for $($job.Name):" -ForegroundColor White
    Write-Host "--------------------------------------------------" -ForegroundColor Gray
    
    # Get the job output
    $output = Receive-Job -Job $job
    $output | Write-Host
    
    if ($job.State -eq 'Failed') {
        Write-Host "❌ Job Failed." -ForegroundColor Red
        $job.ChildJobs[0].Error | ForEach-Object { Write-Host $_.Exception.Message -ForegroundColor Red }
    }
}

Write-Host "`n📁 Check scripts/logs/ for detailed execution logs." -ForegroundColor Cyan
