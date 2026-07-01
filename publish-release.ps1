# 简单笔记 - GitHub Releases 一键发布脚本
# 使用方法: 在 PowerShell 中运行 .\publish-release.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  简单笔记 - GitHub Releases 发布工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 刷新 PATH 环境变量
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 检查 gh CLI 是否安装
try {
    $ghVersion = gh --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] GitHub CLI 已安装: $ghVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] 未找到 GitHub CLI (gh)，请先安装:" -ForegroundColor Red
    Write-Host "  winget install --id GitHub.cli" -ForegroundColor Yellow
    exit 1
}

# 检查认证状态
Write-Host ""
Write-Host "[*] 检查 GitHub 认证状态..." -ForegroundColor Yellow
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] 未登录 GitHub，启动浏览器登录流程..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "即将打开浏览器，请在浏览器中完成授权:" -ForegroundColor Cyan
    Write-Host "1. 复制显示的一次性代码" -ForegroundColor White
    Write-Host "2. 在打开的浏览器页面中粘贴代码" -ForegroundColor White
    Write-Host "3. 授权 GitHub CLI 访问你的账户" -ForegroundColor White
    Write-Host ""
    Read-Host "按 Enter 键继续..."
    gh auth login --web --git-protocol https
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] 登录失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] 登录成功！" -ForegroundColor Green
} else {
    Write-Host "[OK] 已登录 GitHub" -ForegroundColor Green
}

# 推送代码到 GitHub
Write-Host ""
Write-Host "[*] 推送代码到 GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] 代码推送失败，请检查网络连接" -ForegroundColor Red
    Write-Host "如果你在国内，可能需要配置代理:" -ForegroundColor Yellow
    Write-Host '  git config --global http.proxy http://127.0.0.1:你的代理端口' -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] 代码推送成功" -ForegroundColor Green

# 推送标签
Write-Host ""
Write-Host "[*] 推送版本标签 v1.0.0..." -ForegroundColor Yellow
git push origin v1.0.0
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] 标签推送失败" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] 标签推送成功" -ForegroundColor Green

# 检查安装包文件是否存在
$installer = "release\1.0.0\简单笔记-1.0.0-win-x64.exe"
$portable = "release\1.0.0\简单笔记-1.0.0-Portable.exe"
$notes = "RELEASE_NOTES.md"

if (-not (Test-Path $installer)) {
    Write-Host "[ERROR] 找不到安装包: $installer" -ForegroundColor Red
    Write-Host "请先运行: npm run dist:win" -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path $portable)) {
    Write-Host "[ERROR] 找不到便携版: $portable" -ForegroundColor Red
    Write-Host "请先运行: npm run dist:win" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[*] 安装包文件检查通过" -ForegroundColor Green
Write-Host "    - $installer ($([math]::Round((Get-Item $installer).Length/1MB,2)) MB)" -ForegroundColor Gray
Write-Host "    - $portable ($([math]::Round((Get-Item $portable).Length/1MB,2)) MB)" -ForegroundColor Gray

# 创建 Release
Write-Host ""
Write-Host "[*] 创建 GitHub Release..." -ForegroundColor Yellow

# 读取发布说明
$releaseNotes = Get-Content $notes -Raw -Encoding UTF8

# 创建 Release 并上传资产
gh release create v1.0.0 `
    --title "简单笔记 v1.0.0" `
    --notes $releaseNotes `
    $installer `
    $portable

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Release 创建失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  发布成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "访问 Releases 页面:" -ForegroundColor Cyan
gh repo view --json url --jq '"https://github.com/\(.url | split("/")[4])/\(.url | split("/")[5])/releases"'
Write-Host ""
Write-Host "用户现在可以从 GitHub Releases 下载安装包了！" -ForegroundColor Green
Write-Host ""
