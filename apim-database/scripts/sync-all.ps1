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
        
        # Run the script with explicit Argument
        # Using npx tsx to run typescript directly
        npx tsx scripts/sync-apim-to-db.ts --env=$targetEnv
        
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
