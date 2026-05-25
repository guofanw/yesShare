# Yes.Share - LAN File Sharing

[中文](README.md) | [English](README_EN.md)

> 🚀 A high-performance, secure, and easy-to-deploy LAN file sharing solution built with .NET 8.

**Repositories**
- Gitee: https://gitee.com/ndkkztf/yes-share.git
- GitHub: https://github.com/guofanw/yesShare.git

## ⚙️ Tech Stack

- **Backend**: [.NET 8](https://dotnet.microsoft.com/) Web API, Entity Framework Core 8
- **Database**: [SQLite](https://www.sqlite.org/) (embedded, zero config)
- **Frontend**: Vanilla JavaScript (ES6+), [Bootstrap 5](https://getbootstrap.com/), [Highlight.js](https://highlightjs.org/)
- **Auth**: JWT (JSON Web Tokens)
- **Dev Tools**: Visual Studio / VS Code

## ✨ Features & Highlights

- 📦 **Chunked upload for large files**: Upload 20GB+ files with automatic chunking and resumable uploads for stable LAN transfers.
- 📁 **Folder navigation**: Folders are clickable. Click to enter a folder and browse its subfolders and files.
- 👀 **Online preview for text/images/code**: Highlight.js powered syntax highlighting with one-click copy.
- 📊 **System dashboard**: Online users, daily upload/download statistics, disk usage, and recent logs.
- 🔐 **Fine-grained access control**: JWT authentication + RBAC, private files, public share tokens, and admin audit.
- 🚀 **Single-file deployment**: Publish as a self-contained single executable for easy deployment.

## 🚀 Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (only required for development/build)
- Modern browser (Chrome / Edge / Firefox, etc.)
- Git

### Clone

```bash
git clone https://gitee.com/ndkkztf/yes-share.git
git clone https://github.com/guofanw/yesShare.git

cd yes-share
```

## 📦 Installation & Run

### 1. Configuration

The project uses `appsettings.json` by default. Go to the API project directory:

```bash
cd yes-share-api/Yes.Share.Api
```

Optionally update `JwtSettings` in `appsettings.json` for better security:

```json
"JwtSettings": {
  "SecretKey": "YourSuperSecretKeyHere_MustBeLongEnough",
  "DurationInMinutes": 1440
}
```

### 2. Run the development server

```bash
dotnet run
```

After the server starts, you will see the URL in the terminal (commonly `http://localhost:5211` or `https://localhost:7xxx`). Open it in your browser.

> **Note**: On first run, a SQLite database file `yesshare.db` will be created and a default admin account will be initialized.
>
> - **Username**: `admin`
> - **Password**: `admin123`

## 🔨 Build & Deployment

### Publish single-file (Windows x64)

```bash
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true
```

The output will be in `bin/Release/net8.0/win-x64/publish/`. Copy `Yes.Share.Api.exe` (and the `wwwroot` folder to serve static assets) to your target machine.

### Docker (optional)

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish "yes-share-api/Yes.Share.Api/Yes.Share.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Yes.Share.Api.dll"]
```

## 🖼️ Screenshots

![Screenshot 1](imgs/1.png)
![Screenshot 2](imgs/2.png)
![Screenshot 3](imgs/3.png)
![Screenshot 4](imgs/4.png)
![Screenshot 5](imgs/5.png)
![Screenshot 6](imgs/6.png)

## 🤝 Contributing

Pull Requests and Issues are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE).
