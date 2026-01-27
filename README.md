# Yes.Share - 局域网文件共享工具

> 🚀 一个基于 .NET 8 构建的高性能、安全且易于部署的局域网文件共享解决方案。

## ⚙️ 技术栈 (Tech Stack)

*   **后端**: [.NET 8](https://dotnet.microsoft.com/) WebAPI, Entity Framework Core 8
*   **数据库**: [SQLite](https://www.sqlite.org/) (嵌入式数据库，零配置)
*   **前端**: 原生 JavaScript (ES6+), [Bootstrap 5](https://getbootstrap.com/), [Highlight.js](https://highlightjs.org/)
*   **鉴权**: JWT (JSON Web Tokens)
*   **开发工具**: Visual Studio / VS Code

## ✨ 核心功能与亮点 (Features & Highlights)

*   📦 **大文件分片上传**: 支持 20GB+ 超大文件上传，内置自动分片与断点续传机制，确保局域网传输的稳定性与效率。
*   👀 **在线代码预览**: 集成 Highlight.js，支持多种编程语言（.cs, .js, .json, .py 等）代码高亮预览与一键复制全文。
*   📊 **实时系统看板**: 可视化仪表盘展示在线用户数、今日上传/下载流量统计、服务器磁盘空间使用率及最近操作日志。
*   🔐 **细粒度权限控制**: 基于 JWT 的身份验证与 RBAC 权限模型，支持私有文件保护、公开分享链接（Token）及管理员审计。
*   🚀 **单文件独立部署**: 支持打包为单一可执行文件（Self-contained），无需在目标机器安装 .NET Runtime，即拷即用。

## 🚀 快速开始 (Getting Started)

### 前置要求

*   [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (仅开发或构建时需要)
*   现代浏览器 (Chrome, Edge, Firefox 等)
*   Git

### 克隆仓库

```bash
git clone https://github.com/yourusername/yes-share.git
cd yes-share
```

## 📦 安装与运行 (Installation & Run)

### 1. 配置环境

项目默认使用 `appsettings.json` 进行配置，开箱即用。
进入 API 项目目录：

```bash
cd yes-share-api/Yes.Share.Api
```

如有需要，你可以修改 `appsettings.json` 中的 `JwtSettings` 以增强安全性：

```json
"JwtSettings": {
  "SecretKey": "YourSuperSecretKeyHere_MustBeLongEnough", 
  "DurationInMinutes": 1440
}
```

### 2. 运行开发服务器

在终端中执行以下命令启动服务：

```bash
dotnet run
```

启动成功后，终端将显示访问地址（通常为 `http://localhost:5211` 或 `https://localhost:7xxx`）。打开浏览器访问该地址即可进入应用。

> **注意**：首次运行会自动在项目目录下创建 SQLite 数据库文件 `yesshare.db` 并初始化默认管理员账号。
>
> *   **默认管理员**: `admin`
> *   **默认密码**: `admin123`

## 🔨 项目构建与发布 (Build & Deployment)

本项目推荐使用 .NET 的发布功能生成独立可执行文件，方便在局域网内任意 Windows 服务器或主机上部署。

### 构建独立单文件 (Windows x64)

```bash
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true
```

构建完成后，可执行文件位于 `bin/Release/net8.0/win-x64/publish/` 目录。
你只需将该目录下的 `Yes.Share.Api.exe` (以及 `wwwroot` 文件夹，确保静态资源存在) 复制到目标服务器即可运行。

### Docker 部署 (可选)

如果你更喜欢容器化部署，可以编写 Dockerfile。

```dockerfile
# 示例 Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish "yes-share-api/Yes.Share.Api/Yes.Share.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Yes.Share.Api.dll"]
```

## 🤝 贡献指南 (Contributing)

欢迎提交 Pull Request 或 Issue！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证 (License)

本项目采用 [MIT License](LICENSE) 许可证。
