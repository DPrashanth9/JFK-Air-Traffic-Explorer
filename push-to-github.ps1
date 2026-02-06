# PowerShell script to push code to GitHub
# Run this script in PowerShell from your project directory

Write-Host "🚀 Pushing JFK Air Traffic Explorer to GitHub..." -ForegroundColor Cyan

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

# Check if already a git repository
if (Test-Path .git) {
    Write-Host "✓ Git repository already initialized" -ForegroundColor Green
} else {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
}

# Add all files
Write-Host "Adding files to git..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "⚠ No changes to commit. All files are already committed." -ForegroundColor Yellow
} else {
    Write-Host "Creating initial commit..." -ForegroundColor Yellow
    git commit -m "Initial commit: JFK Air Traffic Explorer with React frontend and Python backend"
}

# Check if remote already exists
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "✓ Remote 'origin' already exists: $remote" -ForegroundColor Green
    Write-Host "Updating remote URL..." -ForegroundColor Yellow
    git remote set-url origin https://github.com/DPrashanth9/JFK-Air-Traffic-Explorer.git
} else {
    Write-Host "Adding GitHub remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/DPrashanth9/JFK-Air-Traffic-Explorer.git
}

# Rename branch to main if needed
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "Renaming branch to 'main'..." -ForegroundColor Yellow
    git branch -M main
}

# Push to GitHub
Write-Host "`n📤 Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "You may be prompted for GitHub credentials." -ForegroundColor Yellow
Write-Host "If authentication fails, use a Personal Access Token as password." -ForegroundColor Yellow
Write-Host "Get token from: https://github.com/settings/tokens`n" -ForegroundColor Yellow

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/DPrashanth9/JFK-Air-Traffic-Explorer" -ForegroundColor Cyan
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Render Dashboard: https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Follow the guide in GITHUB_DEPLOYMENT.md" -ForegroundColor White
} else {
    Write-Host "`n❌ Push failed. Common issues:" -ForegroundColor Red
    Write-Host "1. Authentication: Use Personal Access Token instead of password" -ForegroundColor Yellow
    Write-Host "2. Repository not found: Make sure the repository exists on GitHub" -ForegroundColor Yellow
    Write-Host "3. Network issues: Check your internet connection" -ForegroundColor Yellow
    Write-Host "`nSee PUSH_TO_GITHUB.md for detailed instructions." -ForegroundColor Yellow
}
