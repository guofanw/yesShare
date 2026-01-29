const API_URL = '/api';
let currentUser = null;
let token = localStorage.getItem('token');
let currentFolderId = null;
let autoRefreshTimer = null;
let currentFolderPath = [];

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
    
    // Breadcrumbs HTML
    const breadcrumbs = `
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#" onclick="enterFolder(null)">首页</a></li>
                ${currentFolderPath.map((f, i) => `
                    <li class="breadcrumb-item ${i === currentFolderPath.length - 1 ? 'active' : ''}">
                        ${i === currentFolderPath.length - 1 ? f.fileName : `<a href="#" onclick="enterFolder(${f.id})">${f.fileName}</a>`}
                    </li>
                `).join('')}
            </ol>
        </nav>
    `;

    content.innerHTML = `
        ${breadcrumbs}
        <div class="d-flex justify-content-between align-items-center mb-3 toolbar-area">
            <h3>文件列表</h3>
            <div class="d-flex gap-2 align-items-center">
                <!-- Search -->
                <!--<div class="input-group input-group-sm" style="width: 200px;">
                    <input type="text" class="form-control" id="search-input" placeholder="搜索文件名...">
                    <button class="btn btn-outline-secondary" onclick="performSearch()">🔍</button>
                </div>-->

                <!-- Auto Refresh -->
                <div class="input-group input-group-sm">
                    <span class="input-group-text">自动刷新</span>
                    <select class="form-select" id="refresh-rate" onchange="changeRefreshRate(this.value)">
                        <option value="0">关闭</option>
                        <option value="1000">1秒</option>
                        <option value="3000">3秒</option>
                        <option value="5000">5秒</option>
                    </select>
                    <button class="btn btn-outline-secondary" onclick="loadFiles()">立即刷新</button>
                </div>

                <!-- Actions -->
                <button class="btn btn-outline-success" onclick="createFolderPrompt()">+📁</button>
                <input type="file" id="file-input" multiple style="display:none">
                <button class="btn btn-primary"  onclick="document.getElementById('file-input').click()">+📄</button>
            </div>
        </div>
        
        <!-- Drag Drop Zone -->
        <div id="drop-zone" class="drag-drop-zone mb-3">
            拖拽文件到此处上传
        </div>

        <div id="upload-progress-container"></div>
        <div class="file-list-container">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th style="width: 35%">文件名</th>
                        <th style="width: 10%">大小</th>
                        <th style="width: 15%">上传者</th>
                        <th style="width: 20%">时间</th>
                        <th style="width: 20%">操作</th>
                    </tr>
                </thead>
                <tbody id="file-list-body">
                    <tr><td colspan="5" class="text-center">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Setup Events
    document.getElementById('file-input').addEventListener('change', handleUpload);
    /*document.getElementById('search-input').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') performSearch();
    });*/
    setupDragDrop();
    
    // Restore refresh rate selection if set
    const savedRate = localStorage.getItem('refreshRate');
    if(savedRate) {
        document.getElementById('refresh-rate').value = savedRate;
        if(savedRate !== '0' && !autoRefreshTimer) {
             changeRefreshRate(savedRate); // Activate logic
        }
    }

    try {
        const searchText = document.getElementById('search-input')?.value;
        let url = currentFolderId ? `${API_URL}/file?parentId=${currentFolderId}` : `${API_URL}/file`;
        
        // If searching, append param
        if(searchText) {
            // Note: Our backend implementation currently ignores parentId if search is present (global search).
            // But we append it anyway or construct new url.
            // If backend logic: "If search provided, ignore parentId", then just ?search=...
            // Let's use ?search=...&parentId=... just in case we change logic later, 
            // but currently backend priority is search > parentId.
            // To be clean:
            url = `${API_URL}/file?search=${encodeURIComponent(searchText)}`;
            // If we want search within folder, we need backend support. Current backend is global search.
        }

        const res = await authFetch(url);
        const files = await res.json();
        renderFileList(files);
        
        // Restore search text input focus/value if re-rendered? 
        // Since we re-render whole content-area, input is lost. 
        // We need to set value back.
        if(document.getElementById('search-input')) {
             document.getElementById('search-input').value = searchText || '';
             document.getElementById('search-input').focus();
        }
    } catch (err) {
        content.innerHTML = `<div class="alert alert-danger">加载失败: ${err.message}</div>`;
    }
}

async function performSearch() {
    await loadFiles();
}

function changeRefreshRate(val) {
    localStorage.setItem('refreshRate', val);
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    
    const ms = parseInt(val);
    if (ms > 0) {
        autoRefreshTimer = setInterval(() => {
             // Only refresh if file list is visible to avoid errors or weird behavior
             if(document.getElementById('file-list-body')) {
                 silentReloadFiles();
             } else {
                 clearInterval(autoRefreshTimer);
             }
        }, ms);
    }
}

async function silentReloadFiles() {
    try {
        const searchText = document.getElementById('search-input')?.value;
        let url = currentFolderId ? `${API_URL}/file?parentId=${currentFolderId}` : `${API_URL}/file`;
        if(searchText) url = `${API_URL}/file?search=${encodeURIComponent(searchText)}`;
        
        const res = await authFetch(url);
        const files = await res.json();
        renderFileList(files);
    } catch (err) {
        console.error("Auto-refresh failed", err);
    }
}

function renderFileList(files) {
    const tbody = document.getElementById('file-list-body');
    if (!tbody) return;
    
    if (files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无文件</td></tr>';
        return;
    }
    
    tbody.innerHTML = files.map(f => {
        let icon = '📄';
        let nameHtml = f.fileName;
        let sizeHtml = formatSize(f.fileSize);
        let actionHtml = '';
        
        if (f.isFolder) {
            icon = '📁';
            nameHtml = `<a class="folder-link" onclick="enterFolder(${f.id})">${f.fileName}</a>`;
            sizeHtml = '-';
            actionHtml = `
                 ${(currentUser.role === 'Admin' || f.uploaderName === currentUser.username) ? 
                    `<button class="btn btn-outline-danger btn-sm" onclick="deleteFile(${f.id})">删除</button>` : ''}
            `;
        } else {
            // Image Preview Events
            const isImg = isImage(f.fileName);
            let imgPreviewAttr = '';
            if (isImg) {
                // nameHtml = `<span class="file-name-span" onmouseenter="showImgPreview(event, '${f.shareLink}')" onmouseleave="hideImgPreview()">${f.fileName}</span>`;
                // Changed to click preview
                nameHtml = `<a href="#" onclick="openImagePreview('${f.shareLink}', '${f.fileName}')">${f.fileName}</a>`;
            }
            
            actionHtml = `
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="downloadFile(${f.id}, '${f.shareLink}')">下载</button>
                    ${canPreview(f.fileName) ? `<button class="btn btn-outline-info" onclick="previewFile(${f.id})">预览</button>` : ''}
                    ${isImg ? `<button class="btn btn-outline-info" onclick="openImagePreview('${f.shareLink}', '${f.fileName}')">查看</button>` : ''}
                    <button class="btn btn-outline-secondary" onclick="copyLink('${f.shareLink}')">分享</button>
                    ${(currentUser.role === 'Admin' || f.uploaderName === currentUser.username) ? 
                        `<button class="btn btn-outline-danger" onclick="deleteFile(${f.id})">删除</button>` : ''}
                </div>
            `;
        }
        
        return `
        <tr>
            <td>
                ${icon} ${nameHtml}
                ${f.isPublic ? '<span class="badge bg-success ms-1">公开</span>' : ''}
            </td>
            <td>${sizeHtml}</td>
            <td>${f.uploaderName}</td>
            <td>${new Date(f.uploadTime).toLocaleString()}</td>
            <td>${actionHtml}</td>
        </tr>
    `}).join('');
}

// --- Folder Logic ---

async function enterFolder(folderId) {
    if (folderId === null) {
        currentFolderId = null;
        currentFolderPath = [];
    } else {
        // Fetch folder path to rebuild breadcrumbs correctly or push
        // Ideally backend returns path. For now, simple push if moving down. 
        // But clicking breadcrumb needs rebuild.
        // Let's fetch path from API.
        try {
            const res = await authFetch(`${API_URL}/file/path?folderId=${folderId}`);
            currentFolderPath = await res.json();
            currentFolderId = folderId;
        } catch(e) { alert(e.message); return; }
    }
    loadFiles();
}

async function createFolderPrompt() {
    const name = prompt("请输入文件夹名称:");
    if (!name) return;
    
    try {
        const res = await authFetch(`${API_URL}/file/folder`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ folderName: name, parentId: currentFolderId })
        });
        if(!res.ok) throw new Error("创建失败");
        loadFiles();
    } catch (e) {
        alert(e.message);
    }
}

// --- Image Preview ---
function isImage(name) {
    const ext = name.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

function openImagePreview(shareToken, fileName) {
    const modal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
    const img = document.getElementById('preview-image-modal-img');
    
    // Reset src to avoid showing previous image
    img.src = '';
    img.src = `${API_URL}/file/share/${shareToken}?access_token=${token}`;
    
    modal.show();
}

function showImgPreview(e, shareToken) {
    // Deprecated
}

function hideImgPreview() {
    // Deprecated
}

// --- Upload Logic ---

function setupDragDrop() {
    const dropZone = document.getElementById('drop-zone');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = '#e9ecef';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.background = 'white';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = 'white';
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
}

function handleUpload(e) {
    handleFiles(e.target.files);
}

async function handleFiles(files) {
    const fileList = Array.from(files);
    if (!fileList.length) return;
    
    const container = document.getElementById('upload-progress-container');
    
    // Queue Logic could be added here, currently parallel with concurrency limit by browser
    for (const file of fileList) {
        const progressId = `prog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const abortCtrl = new AbortController();
        
        container.innerHTML += `
            <div class="mb-2 p-2 border rounded bg-white shadow-sm" id="${progressId}-box">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-truncate" style="max-width: 70%">${file.name}</span>
                    <div>
                        <span id="${progressId}-text" class="me-2 small">等待中...</span>
                        <button class="btn btn-sm btn-outline-danger py-0" onclick="abortUpload('${progressId}')">取消</button>
                    </div>
                </div>
                <div class="progress" style="height: 5px;">
                    <div id="${progressId}" class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
        `;
        
        // Store abort controller globally or in a map to access it via onclick
        window[`abort_${progressId}`] = abortCtrl;
        
        try {
            if (file.size > 10 * 1024 * 1024) { // > 10MB
                await uploadChunked(file, progressId, abortCtrl);
            } else {
                await uploadSingle(file, progressId, abortCtrl);
            }
            
            // Success
            const box = document.getElementById(`${progressId}-box`);
            if(box) {
                box.classList.remove('bg-white');
                box.classList.add('bg-success', 'bg-opacity-10');
                document.getElementById(`${progressId}-text`).textContent = '完成';
                setTimeout(() => box.remove(), 2000); // Remove after delay
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                 document.getElementById(`${progressId}-text`).textContent = '已取消';
            } else {
                 document.getElementById(`${progressId}-text`).textContent = '失败';
                 document.getElementById(`${progressId}`).classList.add('bg-danger');
                 console.error(err);
            }
        }
        
        delete window[`abort_${progressId}`];
    }
    loadFiles(); // Refresh once batch started/done
}

window.abortUpload = (id) => {
    const ctrl = window[`abort_${id}`];
    if (ctrl) ctrl.abort();
    document.getElementById(`${id}-box`)?.remove();
};

async function uploadSingle(file, progressId, abortCtrl) {
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) formData.append('parentId', currentFolderId);
    
    const xhr = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        xhr.open('POST', `${API_URL}/file/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        // Link abort
        abortCtrl.signal.addEventListener('abort', () => xhr.abort());
        
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
        xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
        
        xhr.send(formData);
    });
}

async function uploadChunked(file, progressId, abortCtrl) {
    if (abortCtrl.signal.aborted) throw new DOMException('Aborted', 'AbortError');

    // 1. Init
    const initRes = await fetch(`${API_URL}/file/upload/chunk/init`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileName: file.name, totalSize: file.size, parentId: currentFolderId }),
        signal: abortCtrl.signal
    });
    if(!initRes.ok) throw new Error("Init failed");
    const { uploadId } = await initRes.json();
    
    // 2. Chunks
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    let offset = 0;
    
    while (offset < file.size) {
        if (abortCtrl.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const formData = new FormData();
        formData.append('chunk', chunk);
        
        const res = await fetch(`${API_URL}/file/upload/chunk/append/${uploadId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            signal: abortCtrl.signal
        });
        if(!res.ok) throw new Error("Chunk upload failed");
        
        offset += chunk.size;
        const percent = Math.round((offset / file.size) * 100);
        updateProgress(progressId, percent);
    }
    
    // 3. Finish
    await fetch(`${API_URL}/file/upload/chunk/finish/${uploadId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uploadId, fileName: file.name, parentId: currentFolderId }),
        signal: abortCtrl.signal
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
