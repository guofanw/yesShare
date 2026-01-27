const API_URL = '/api';
let currentUser = null;
let token = localStorage.getItem('token');

// --- Auth & Init ---

async function init() {
    if (token) {
        // Decode token or check validity? For now assume valid and try to load files
        // A real app would verify token validity endpoint
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = {
            id: payload.nameid,
            username: payload.unique_name,
            role: payload.role
        };
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-view').classList.remove('d-none');
    document.getElementById('app-view').classList.add('d-none');
}

function showApp() {
    document.getElementById('login-view').classList.add('d-none');
    document.getElementById('app-view').classList.remove('d-none');
    document.getElementById('user-display').textContent = `用户: ${currentUser.username} (${currentUser.role})`;
    
    if (currentUser.role !== 'Admin') {
        document.getElementById('nav-dashboard').classList.add('d-none');
    } else {
        document.getElementById('nav-dashboard').classList.remove('d-none');
    }
    
    loadFiles();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!res.ok) throw new Error('登录失败');
        
        const data = await res.json();
        token = data.token;
        localStorage.setItem('token', token);
        
        currentUser = {
            id: data.userId,
            username: data.username,
            role: data.role
        };
        
        showApp();
    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    showLogin();
});

document.getElementById('btn-register-mode').addEventListener('click', async () => {
    // Quick register hack for demo
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if(!username || !password) { alert('请输入用户名和密码进行注册'); return; }
    
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: 'User' })
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
        }
        alert('注册成功，请登录');
    } catch (err) {
        alert('注册失败: ' + err.message);
    }
});

// --- Navigation ---

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        
        const page = e.target.dataset.page;
        if (page === 'files') loadFiles();
        if (page === 'dashboard') loadDashboard();
    });
});

// --- Files ---

async function loadFiles() {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h3>文件列表</h3>
            <div class="d-flex gap-2">
                <input type="file" id="file-input" multiple style="display:none">
                <button class="btn btn-primary" onclick="document.getElementById('file-input').click()">上传文件</button>
            </div>
        </div>
        <div id="upload-progress-container"></div>
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>文件名</th>
                        <th>大小</th>
                        <th>上传者</th>
                        <th>时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="file-list-body">
                    <tr><td colspan="5" class="text-center">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('file-input').addEventListener('change', handleUpload);

    try {
        const res = await authFetch(`${API_URL}/file`);
        const files = await res.json();
        renderFileList(files);
    } catch (err) {
        content.innerHTML = `<div class="alert alert-danger">加载失败: ${err.message}</div>`;
    }
}

function renderFileList(files) {
    const tbody = document.getElementById('file-list-body');
    if (files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无文件</td></tr>';
        return;
    }
    
    tbody.innerHTML = files.map(f => `
        <tr>
            <td>${f.fileName} ${f.isPublic ? '<span class="badge bg-success">公开</span>' : ''}</td>
            <td>${formatSize(f.fileSize)}</td>
            <td>${f.uploaderName}</td>
            <td>${new Date(f.uploadTime).toLocaleString()}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="downloadFile(${f.id}, '${f.shareLink}')">下载</button>
                    ${canPreview(f.fileName) ? `<button class="btn btn-outline-info" onclick="previewFile(${f.id})">预览</button>` : ''}
                    <button class="btn btn-outline-secondary" onclick="copyLink('${f.shareLink}')">分享链接</button>
                    ${(currentUser.role === 'Admin' || f.uploaderName === currentUser.username) ? 
                        `<button class="btn btn-outline-danger" onclick="deleteFile(${f.id})">删除</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// --- Upload Logic ---

async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const container = document.getElementById('upload-progress-container');
    
    for (const file of files) {
        const progressId = `prog-${Date.now()}`;
        container.innerHTML += `
            <div class="mb-2" id="${progressId}-box">
                <div class="d-flex justify-content-between">
                    <span>${file.name}</span>
                    <span id="${progressId}-text">0%</span>
                </div>
                <div class="progress">
                    <div id="${progressId}" class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
        `;
        
        try {
            if (file.size > 10 * 1024 * 1024) { // > 10MB use chunked
                await uploadChunked(file, progressId);
            } else {
                await uploadSingle(file, progressId);
            }
            document.getElementById(`${progressId}-box`).remove(); // Remove on success
            loadFiles(); // Refresh
        } catch (err) {
            document.getElementById(`${progressId}-text`).textContent = 'Failed: ' + err.message;
            document.getElementById(`${progressId}`).classList.add('bg-danger');
        }
    }
}

async function uploadSingle(file, progressId) {
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        xhr.open('POST', `${API_URL}/file/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateProgress(progressId, percent);
            }
        };
        
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(xhr.statusText));
        };
        xhr.onerror = () => reject(new Error('Network Error'));
        
        xhr.send(formData);
    });
}

async function uploadChunked(file, progressId) {
    // 1. Init
    const initRes = await authFetch(`${API_URL}/file/upload/chunk/init`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ fileName: file.name, totalSize: file.size })
    });
    const { uploadId } = await initRes.json();
    
    // 2. Chunks
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    let offset = 0;
    
    while (offset < file.size) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const formData = new FormData();
        formData.append('chunk', chunk);
        
        await fetch(`${API_URL}/file/upload/chunk/append/${uploadId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        }); // Simple fetch, assume success or throw
        
        offset += chunk.size;
        const percent = Math.round((offset / file.size) * 100);
        updateProgress(progressId, percent);
    }
    
    // 3. Finish
    await authFetch(`${API_URL}/file/upload/chunk/finish/${uploadId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ uploadId, fileName: file.name })
    });
}

function updateProgress(id, percent) {
    const bar = document.getElementById(id);
    const text = document.getElementById(`${id}-text`);
    if (bar && text) {
        bar.style.width = `${percent}%`;
        text.textContent = `${percent}%`;
    }
}

// --- Dashboard ---

async function loadDashboard() {
    const content = document.getElementById('content-area');
    content.innerHTML = '<h3>加载系统看板...</h3>';
    
    try {
        const res = await authFetch(`${API_URL}/system/dashboard`);
        if (res.status === 403) throw new Error('无权访问');
        const data = await res.json();
        
        content.innerHTML = `
            <h3>系统看板</h3>
            <div class="row mt-4">
                <div class="col-md-3">
                    <div class="card text-white bg-primary mb-3">
                        <div class="card-body">
                            <h5 class="card-title">在线用户</h5>
                            <p class="card-text display-4">${data.onlineUsers}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-success mb-3">
                        <div class="card-body">
                            <h5 class="card-title">今日上传</h5>
                            <p class="card-text">${data.todayStats.uploadCount} 个 (${data.todayStats.uploadSize})</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-info mb-3">
                        <div class="card-body">
                            <h5 class="card-title">今日下载</h5>
                            <p class="card-text">${data.todayStats.downloadCount} 次 (${data.todayStats.downloadSize})</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-warning mb-3">
                        <div class="card-body">
                            <h5 class="card-title">存储使用</h5>
                            <p class="card-text">${data.storageUsage}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <h4 class="mt-4">最近日志</h4>
            <table class="table table-striped table-sm">
                <thead><tr><th>时间</th><th>用户</th><th>操作</th><th>详情</th></tr></thead>
                <tbody>
                    ${data.recentLogs.map(l => `
                        <tr>
                            <td>${new Date(l.time).toLocaleString()}</td>
                            <td>${l.user}</td>
                            <td>${l.action}</td>
                            <td>${l.details}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        content.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

// --- Utils ---

async function authFetch(url, options = {}) {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, options);
    if (res.status === 401) {
        alert('会话过期，请重新登录');
        localStorage.removeItem('token');
        showLogin();
        throw new Error('Unauthorized');
    }
    return res;
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

window.downloadFile = (id) => {
    // Open in new tab to trigger download
    window.open(`${API_URL}/file/${id}/download?token=`, '_blank');
    // Note: If authentication is required for non-public files, cookie based or adding token to URL is needed.
    // Since we use Bearer token, we can't easily use window.open for auth'd download unless we use a query param token or cookie.
    // For this tool, I added `token` param support in backend (for share links). 
    // For authenticated users, we might need to pass the JWT in the URL if the browser handles the download,
    // OR fetch as blob and save. Fetch blob is better for headers but can be memory intensive for 20GB.
    // Backend should support `?token=USER_JWT` for download endpoint or use cookies.
    // I'll update download endpoint to accept `token` as the AUTH token too if header missing? 
    // No, that's insecure if logged.
    // The clean way: use `fetch` with header -> blob -> objectUrl -> a.click().
    // But for 20GB file, blob in memory will crash browser.
    // Solution: Service Worker or Cookies. 
    // Simplest for this task: Pass the Bearer token as a query parameter `?access_token=...` and handle it in backend.
    
    // Let's implement fetch-blob for small files and warn for large? 
    // Or just append `?access_token=${token}`.
    // I'll modify backend to look for `access_token` query param for Auth.
};

// Override downloadFile to use XHR/Blob for small files or just window.location with query param
window.downloadFile = (id) => {
    // Using query param for auth is easiest for browser download
    window.location.href = `${API_URL}/file/${id}/download?access_token=${token}`;
};

function canPreview(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    return ['txt', 'json', 'js', 'py', 'java', 'cs', 'cpp', 'html', 'css', 'md', 'xml', 'log'].includes(ext);
}

window.previewFile = async (id) => {
    try {
        const res = await authFetch(`${API_URL}/file/${id}/preview`);
        if (!res.ok) throw new Error('无法预览');
        const data = await res.json();
        
        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        const codeBlock = document.getElementById('preview-content');
        codeBlock.textContent = data.content;
        codeBlock.className = `language-${data.language}`;
        hljs.highlightElement(codeBlock);
        
        modal.show();
        
        document.getElementById('btn-copy-preview').onclick = () => {
            navigator.clipboard.writeText(data.content);
            alert('已复制');
        };
    } catch (err) {
        alert(err.message);
    }
};

window.deleteFile = async (id) => {
    if (!confirm('确定删除吗？')) return;
    try {
        await authFetch(`${API_URL}/file/${id}`, { method: 'DELETE' });
        loadFiles();
    } catch (err) {
        alert(err.message);
    }
};

window.copyLink = (shareToken) => {
    const link = `${window.location.origin}/api/file/share/${shareToken}`;
    navigator.clipboard.writeText(link);
    alert('分享链接已复制: ' + link);
};

init();
