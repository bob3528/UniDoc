$ErrorActionPreference = "Stop"
$base = "http://localhost:3001/api"
$eventFile = Join-Path $PSScriptRoot "event-details.json"
$eventDetails = Get-Content $eventFile -Raw | ConvertFrom-Json
$request = @{ eventDetails = $eventDetails; universityId = "upm" }
function Post-UniDoc($path, $body) {
    Invoke-RestMethod -Uri "$base$path" -Method Post -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 20)))
}
$health = Invoke-RestMethod "$base/health"
Write-Host "Backend: $($health.status)"
$proposal = Post-UniDoc "/proposal/generate" $request
Write-Host "Generated sections: $($proposal.proposal.sections.Count)"
$validation = Post-UniDoc "/proposal/validate" $request
Write-Host "Validation: $($validation.report.status), issues: $($validation.report.totalIssues)"
$budget = Post-UniDoc "/budget/calculate" @{ budgetItems = $eventDetails.budget; budgetLimit = $eventDetails.budgetLimit }
Write-Host "Budget total: RM$($budget.summary.totalExpenditure), overrun: RM$($budget.summary.overrun)"
$export = Post-UniDoc "/export" @{ eventDetails = $eventDetails; universityId = "upm"; format = "docx" }
$downloadUrl = "http://localhost:3001$($export.downloadUrl)"
Invoke-WebRequest -Uri $downloadUrl -OutFile "UniDoc-sample.docx"
Write-Host "Downloaded: UniDoc-sample.docx"
