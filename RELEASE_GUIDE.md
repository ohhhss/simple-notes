# GitHub Releases 发布指南

## 方式一：自动发布（推荐）

项目已配置 GitHub Actions 自动构建发布流程，推送 tag 即可自动触发跨平台构建并发布到 Releases。

### 发布步骤

1. **确保代码已提交并推送到 GitHub**

```bash
git add .
git commit -m "feat: 准备发布 v1.0.0"
git push
```

2. **创建版本 tag 并推送**

```bash
# 创建新 tag（将 v1.0.0 替换为你的版本号）
git tag v1.0.0

# 推送 tag 到 GitHub，触发自动构建发布
git push origin v1.0.0
```

3. **等待构建完成**

- 前往 GitHub 仓库的 **Actions** 页面查看构建进度
- 构建完成后，Release 会自动创建，包含 Windows、macOS、Linux 三个平台的安装包
- 整个过程大约需要 15-30 分钟

## 方式二：手动发布

如果只想发布 Windows 版本，或者需要手动上传：

### 本地构建

```bash
# Windows 平台打包
npm run dist:win
```

打包完成后，在 `release/1.0.0/` 目录下会生成：

| 文件 | 用途 |
|------|------|
| `简单笔记-1.0.0-win-x64.exe` | Windows 一键安装包 |
| `简单笔记-1.0.0-Portable.exe` | Windows 便携版（免安装） |
| `简单笔记-1.0.0-win-x64.exe.blockmap` | 增量更新支持文件 |
| `latest.yml` | 自动更新配置文件 |

### 手动上传到 GitHub Releases

1. 打开 GitHub 仓库页面
2. 点击右侧 **Releases** → **Create a new release**
3. 填写：
   - **Tag version**: `v1.0.0`（与 package.json 版本一致）
   - **Release title**: `简单笔记 v1.0.0`
   - **Describe this release**: 填写更新日志
4. 将 `release/1.0.0/` 目录下的 `.exe` 文件拖拽上传
5. 点击 **Publish release** 发布

## 发布文件说明

| 文件名 | 说明 | 适用用户 |
|--------|------|----------|
| `简单笔记-x.x.x-win-x64.exe` | Windows 一键安装包 | 大多数普通用户，双击自动安装，创建桌面快捷方式 |
| `简单笔记-x.x.x-Portable.exe` | Windows 便携版 | 不想安装的用户，可放 U 盘随身携带，双击即用 |
| `简单笔记-x.x.x.dmg` | macOS 安装镜像 | Mac 用户 |
| `简单笔记-x.x.x.AppImage` | Linux 应用镜像 | Linux 用户 |

## 版本号规范

遵循语义化版本：`v主版本.次版本.修订号`

- **主版本**：重大功能更新，可能不兼容旧版本
- **次版本**：新增功能，向下兼容
- **修订号**：Bug 修复、小优化

示例：
- `v1.0.0` - 首个正式版本
- `v1.1.0` - 新增功能
- `v1.1.1` - Bug 修复
