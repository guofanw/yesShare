# Yes.Share - LAN File Sharing and Publishing

[中文](README.md) | [English](README_EN.md)

> 🚀 A high-performance, secure, and easy-to-deploy LAN file sharing and content publishing solution built with .NET 8.

**Repositories**
- Gitee: https://gitee.com/ndkkztf/yes-share.git
- GitHub: https://github.com/guofanw/yesShare.git

## ⚙️ Tech Stack

- **Backend**: [.NET 8](https://dotnet.microsoft.com/) Web API, Entity Framework Core 8
- **Database**: [SQLite](https://www.sqlite.org/) (embedded, zero config)
- **Frontend**: Vanilla JavaScript (ES6+), Bootstrap 5, Highlight.js
- **Auth**: JWT (JSON Web Tokens)
- **Dev Tools**: Visual Studio / VS Code

## ✨ Features & Highlights

- 📦 **Chunked upload for large files**: Upload 20GB+ files with automatic chunking and resumable uploads for stable LAN transfers.
- 📁 **Folder navigation**: Browse folders, enter directories, navigate paths, and search content.
- 👀 **Online preview for text/images/code**: Preview text, images, and code with syntax highlighting and copy support.
- 📝 **Publish module**: Post plain text, code snippets, and images with preview, paginated history, keyword search, and top summary cards.
- 🤖 **Automatic code detection**: Detect plain text vs code automatically, with manual override available.
- 📊 **System dashboard**: Online users, daily upload/download statistics, disk usage, and recent logs.
- 🔐 **Fine-grained access control**: JWT authentication + RBAC, private files, public share tokens, and admin audit.
- 🧩 **Local static assets only**: Frontend dependencies are served from local files without CDN dependency.
- 🚀 **Single-file deployment**: Publish as a self-contained single executable for easy deployment.

## 🆕 Publish Module

- Supported content types:
  - Plain text
  - Code text
  - Images
- Text length limit: `2000` characters
- Syntax highlighting for code content
- Supported code languages:
  - `Json`
  - `C#`
  - `TypeScript`
  - `CMD`
  - `Vue`
  - `C++`
  - `Java`
  - `Html`
- Automatic detection for plain text and code, with manual selection support
- Paginated history with keyword search
- Top summary cards include:
  - Total posts
  - Latest publish time
  - Code post count
  - Image post count

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

The default listening URL is:

```json
"Urls": "http://*:5112"
```

After the server starts, open `http://localhost:5112` in your browser. In development mode, Swagger is available at `http://localhost:5112/swagger`.

> **Note**: On first run, a SQLite database file `yesshare.db` will be created, the publish module tables will be ensured, and a default admin account will be initialized.
>
> - **Username**: `admin`
> - **Password**: `admin123`

## 📡 Main APIs

### Auth

- `POST /api/auth/login`
- `POST /api/auth/register`

### Files

- `GET /api/file`
- `POST /api/file/upload`
- `POST /api/file/upload/chunk/init`
- `POST /api/file/upload/chunk/append/{uploadId}`
- `POST /api/file/upload/chunk/finish/{uploadId}`
- `GET /api/file/{id}/download`

### Publish

- `POST /api/publish`
- `GET /api/publish`
- `GET /api/publish/{id}/image`

### Dashboard

- `GET /api/system/dashboard`

## 🔨 Build & Deployment

### Publish single-file (Windows x64)

```bash
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true
```

The output will be in `bin/Release/net8.0/win-x64/publish/`. Copy `Yes.Share.Api.exe`, the `wwwroot` folder, and the required configuration files to your target machine.

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
![Screenshot 7](imgs/7.png)

## 📁 Project Structure

```text
yes-share/
├─ imgs/
├─ yes-share-api/
│  ├─ Yes.Share.Api/
│  │  ├─ Controllers/
│  │  ├─ Data/
│  │  ├─ Dtos/
│  │  ├─ Filters/
│  │  ├─ Models/
│  │  ├─ Services/
│  │  ├─ Uploads/
│  │  └─ wwwroot/
│  └─ yes-share-api.sln
├─ README.md
├─ README_EN.md
└─ LICENSE
```

## 🌐 Local Assets

All frontend dependencies are served from local static assets, which makes the project suitable for isolated LAN deployment:

- `wwwroot/css/bootstrap.min.css`
- `wwwroot/js/bootstrap.bundle.min.js`
- `wwwroot/css/highlight.min.css`
- `wwwroot/js/highlight.min.js`

## 🤝 Contributing

Pull Requests and Issues are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE).
