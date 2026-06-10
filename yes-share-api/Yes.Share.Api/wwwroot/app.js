const API_URL = '/api';
let currentUser = null;
let token = localStorage.getItem('token');
let currentFolderId = null;
let autoRefreshTimer = null;
let currentFolderPath = [];
let currentLang = localStorage.getItem('lang') || 'zh-CN';
let currentPage = 'files';
let publishState = {
    page: 1,
    pageSize: 5,
    keyword: ''
};

const i18n = {
    'zh-CN': {
        title: 'Yes.Share - 局域网文件共享',
        loginTitle: 'Yes.Share 登录',
        username: '用户名',
        password: '密码',
        login: '登录',
        register: '注册',
        files: '文件列表',
        publish: '发布',
        dashboard: '系统看板',
        logout: '退出',
        user: '用户',
        home: '首页',
        autoRefresh: '自动刷新',
        refreshOff: '关闭',
        refresh1s: '1秒',
        refresh3s: '3秒',
        refresh5s: '5秒',
        refreshNow: '立即刷新',
        newFolder: '新建文件夹',
        upload: '上传文件',
        dragDrop: '拖拽文件到此处上传',
        fileName: '文件名',
        size: '大小',
        uploader: '上传者',
        time: '时间',
        action: '操作',
        loading: '加载中...',
        empty: '暂无文件',
        public: '公开',
        download: '下载',
        preview: '预览',
        view: '查看',
        share: '分享',
        delete: '删除',
        onlineUsers: '在线用户',
        todayUpload: '今日上传',
        todayDownload: '今日下载',
        storage: '存储使用',
        recentLogs: '最近日志',
        logTime: '时间',
        logUser: '用户',
        logAction: '操作',
        logDetails: '详情',
        copySuccess: '已复制',
        shareLinkCopy: '分享链接已复制: ',
        confirmDelete: '确定删除吗？',
        createFolderPrompt: '请输入文件夹名称:',
        searchPlaceholder: '搜索文件名...',
        filePreview: '文件预览',
        copyFull: '复制全文',
        close: '关闭',
        publishTitle: '内容发布',
        publishDescription: '发布文本或图片，历史记录支持分页和关键词搜索。',
        publishTextType: '文本类型',
        publishMode: '发布模式',
        publishAuto: '自动识别',
        publishPlainText: '普通文本',
        publishCodeText: '代码文本',
        publishCodeLanguage: '代码语言',
        publishContent: '发布内容',
        publishContentPlaceholder: '请输入要发布的内容，最多 2000 个字符。',
        publishImage: '图片',
        publishImageHint: '支持 jpg、jpeg、png、gif、webp，可留空。',
        publishSubmit: '立即发布',
        publishHistory: '历史发布',
        publishSearchPlaceholder: '搜索发布内容或用户...',
        publishSearch: '搜索',
        publishReset: '重置',
        publishLengthHint: '剩余字符',
        publishNeedContent: '请至少填写文本内容或选择一张图片。',
        publishSuccess: '发布成功',
        publishEmpty: '暂无发布记录',
        publishPageInfo: '第 {page} / {total} 页，共 {count} 条',
        publishPrev: '上一页',
        publishNext: '下一页',
        publishBy: '发布用户',
        publishAt: '发布时间',
        publishImagePreview: '图片预览',
        publishOpenComposer: '去发布',
        publishStatsTotal: '内容总条数',
        publishStatsLatest: '最新发布时间',
        publishStatsCode: '代码内容',
        publishStatsImage: '带图内容',
        publishLatestEmpty: '暂无',
        publishAutoHint: '默认自动识别代码和普通文本，也可以手动指定。'
    },
    'en-US': {
        title: 'Yes.Share - LAN File Sharing',
        loginTitle: 'Yes.Share Login',
        username: 'Username',
        password: 'Password',
        login: 'Login',
        register: 'Register',
        files: 'Files',
        publish: 'Publish',
        dashboard: 'Dashboard',
        logout: 'Logout',
        user: 'User',
        home: 'Home',
        autoRefresh: 'Auto Refresh',
        refreshOff: 'Off',
        refresh1s: '1s',
        refresh3s: '3s',
        refresh5s: '5s',
        refreshNow: 'Refresh Now',
        newFolder: 'New Folder',
        upload: 'Upload',
        dragDrop: 'Drag & Drop files here',
        fileName: 'Name',
        size: 'Size',
        uploader: 'Uploader',
        time: 'Date',
        action: 'Actions',
        loading: 'Loading...',
        empty: 'No files',
        public: 'Public',
        download: 'Download',
        preview: 'Preview',
        view: 'View',
        share: 'Share',
        delete: 'Delete',
        onlineUsers: 'Online Users',
        todayUpload: 'Today Uploads',
        todayDownload: 'Today Downloads',
        storage: 'Storage',
        recentLogs: 'Recent Logs',
        logTime: 'Time',
        logUser: 'User',
        logAction: 'Action',
        logDetails: 'Details',
        copySuccess: 'Copied',
        shareLinkCopy: 'Share link copied: ',
        confirmDelete: 'Are you sure to delete?',
        createFolderPrompt: 'Enter folder name:',
        searchPlaceholder: 'Search files...',
        filePreview: 'File Preview',
        copyFull: 'Copy All',
        close: 'Close',
        publishTitle: 'Publish',
        publishDescription: 'Post text or images with searchable paged history.',
        publishTextType: 'Text Type',
        publishMode: 'Mode',
        publishAuto: 'Auto Detect',
        publishPlainText: 'Plain Text',
        publishCodeText: 'Code',
        publishCodeLanguage: 'Code Language',
        publishContent: 'Content',
        publishContentPlaceholder: 'Enter content to publish, up to 2000 characters.',
        publishImage: 'Image',
        publishImageHint: 'Supports jpg, jpeg, png, gif, webp. Optional.',
        publishSubmit: 'Publish Now',
        publishHistory: 'History',
        publishSearchPlaceholder: 'Search content or user...',
        publishSearch: 'Search',
        publishReset: 'Reset',
        publishLengthHint: 'Remaining',
        publishNeedContent: 'Please enter text or choose an image.',
        publishSuccess: 'Published successfully',
        publishEmpty: 'No posts yet',
        publishPageInfo: 'Page {page} / {total}, {count} items',
        publishPrev: 'Prev',
        publishNext: 'Next',
        publishBy: 'User',
        publishAt: 'Published At',
        publishImagePreview: 'Image Preview',
        publishOpenComposer: 'Create Post',
        publishStatsTotal: 'Total Posts',
        publishStatsLatest: 'Latest Published',
        publishStatsCode: 'Code Posts',
        publishStatsImage: 'Image Posts',
        publishLatestEmpty: 'None',
        publishAutoHint: 'Auto-detects plain text or code by default, with manual override.'
    }
};

function t(key) {
    return i18n[currentLang][key] || key;
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    
    // Sync selectors
    const s1 = document.getElementById('lang-select');
    const s2 = document.getElementById('lang-select-login');
    if(s1) s1.value = lang;
    if(s2) s2.value = lang;

    updateUI();
    if(currentUser) {
        loadCurrentPage();
    }
}

function updateUI() {
    document.title = t('title');
    
    // Static Elements
    const safeSet = (id, key) => {
        const el = document.getElementById(id);
        if(el) el.textContent = t(key);
    };
    
    // Login View
    safeSet('login-title', 'loginTitle');
    safeSet('lbl-username', 'username');
    safeSet('lbl-password', 'password');
    safeSet('btn-login', 'login');
    safeSet('btn-register-mode', 'register');
    
    // Navbar
    safeSet('nav-files', 'files');
    safeSet('nav-publish', 'publish');
    safeSet('nav-dashboard', 'dashboard');
    safeSet('btn-logout', 'logout');
    
    // Modals
    safeSet('modal-preview-title', 'filePreview');
    safeSet('btn-copy-preview', 'copyFull');
    safeSet('btn-close-preview', 'close');
    safeSet('publish-composer-title', 'publishTitle');
    safeSet('publish-mode-label', 'publishMode');
    safeSet('publish-language-label', 'publishCodeLanguage');
    safeSet('publish-content-label', 'publishContent');
    safeSet('publish-image-label', 'publishImage');
    safeSet('publish-image-hint', 'publishImageHint');
    safeSet('publish-remaining-label', 'publishLengthHint');
    safeSet('publish-submit-btn', 'publishSubmit');
    safeSet('publish-modal-close', 'close');
    // ... more dynamic updates in render functions

    const publishContent = document.getElementById('publish-content');
    if (publishContent) publishContent.placeholder = t('publishContentPlaceholder');
    const publishPreview = document.getElementById('publish-image-preview');
    if (publishPreview) publishPreview.alt = t('publishImagePreview');
    const publishModeSelect = document.getElementById('publish-text-format');
    if (publishModeSelect?.options?.length >= 3) {
        publishModeSelect.options[0].text = t('publishAuto');
        publishModeSelect.options[1].text = t('publishPlainText');
        publishModeSelect.options[2].text = t('publishCodeText');
    }
}

function setActiveNav(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
}

function loadCurrentPage() {
    if (currentPage === 'publish') {
        loadPublishPage();
        return;
    }

    if (currentPage === 'dashboard') {
        loadDashboard();
        return;
    }

    loadFiles();
}

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

    setActiveNav(currentPage);
    loadCurrentPage();
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
        const page = e.target.dataset.page;
        currentPage = page;
        setActiveNav(page);
        loadCurrentPage();
    });
});

// --- Files ---

async function loadFiles() {
    // Capture search text BEFORE overwriting innerHTML
    const searchText = document.getElementById('search-input')?.value;
    const content = document.getElementById('content-area');
    
    // Breadcrumbs HTML
    const breadcrumbs = `
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#" onclick="enterFolder(null)">${t('home')}</a></li>
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
            <h3>${t('files')}</h3>
            <div class="d-flex gap-2 align-items-center">
                <!-- Search -->
                <div class="input-group input-group-sm" style="width: 300px;">
                    <input type="text" class="form-control" id="search-input" placeholder="${t('searchPlaceholder')}">
                    <button class="btn btn-outline-secondary" onclick="performSearch()">🔍</button>
                </div>

                <!-- Auto Refresh -->
                <div class="input-group input-group-sm">
                    <span class="input-group-text">${t('autoRefresh')}</span>
                    <select class="form-select" id="refresh-rate" onchange="changeRefreshRate(this.value)">
                        <option value="0">${t('refreshOff')}</option>
                        <option value="1000">${t('refresh1s')}</option>
                        <option value="3000">${t('refresh3s')}</option>
                        <option value="5000">${t('refresh5s')}</option>
                    </select>
                    <button class="btn btn-outline-secondary" onclick="loadFiles()">${t('refreshNow')}</button>
                </div>

                <!-- Actions -->
                <button class="btn btn-outline-success" onclick="createFolderPrompt()" title="${t('newFolder')}">+📁</button>
                <input type="file" id="file-input" multiple style="display:none">
                <button class="btn btn-primary" onclick="document.getElementById('file-input').click()" title="${t('upload')}">+📄</button>
            </div>
        </div>
        
        <!-- Drag Drop Zone -->
        <div id="drop-zone" class="drag-drop-zone mb-3">
            ${t('dragDrop')}
        </div>

        <div id="upload-progress-container"></div>
        <div class="file-list-container">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th style="width: 35%">${t('fileName')}</th>
                        <th style="width: 10%">${t('size')}</th>
                        <th style="width: 15%">${t('uploader')}</th>
                        <th style="width: 20%">${t('time')}</th>
                        <th style="width: 20%">${t('action')}</th>
                    </tr>
                </thead>
                <tbody id="file-list-body">
                    <tr><td colspan="5" class="text-center">${t('loading')}</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Setup Events
    document.getElementById('file-input').addEventListener('change', handleUpload);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') performSearch();
    });
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
        // const searchText = document.getElementById('search-input')?.value; // Moved to top
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
        showRecoveredUploads();
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
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">${t('empty')}</td></tr>`;
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
                    `<button class="btn btn-outline-danger btn-sm" onclick="deleteFile(${f.id})">${t('delete')}</button>` : ''}
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
                    <button class="btn btn-outline-primary" onclick="downloadFile(${f.id}, '${f.shareLink}')">${t('download')}</button>
                    ${canPreview(f.fileName) ? `<button class="btn btn-outline-info" onclick="previewFile(${f.id})">${t('preview')}</button>` : ''}
                    ${isImg ? `<button class="btn btn-outline-info" onclick="openImagePreview('${f.shareLink}', '${f.fileName}')">${t('view')}</button>` : ''}
                    <button class="btn btn-outline-secondary" onclick="copyLink('${f.shareLink}')">${t('share')}</button>
                    ${(currentUser.role === 'Admin' || f.uploaderName === currentUser.username) ? 
                        `<button class="btn btn-outline-danger" onclick="deleteFile(${f.id})">${t('delete')}</button>` : ''}
                </div>
            `;
        }
        
        return `
        <tr>
            <td>
                ${icon} ${nameHtml}
                ${f.isPublic ? `<span class="badge bg-success ms-1">${t('public')}</span>` : ''}
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
    const name = prompt(t('createFolderPrompt'));
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

window.openPublishImagePreview = (imageUrl) => {
    const modal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
    const img = document.getElementById('preview-image-modal-img');
    img.src = '';
    img.src = `${imageUrl}?access_token=${token}`;
    modal.show();
};

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

const UPLOAD_STATE_KEY = 'yesShare_pendingUploads';

function saveUploadState(uploadId, file, parentId, chunkSize, offset) {
    try {
        const uploads = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}');
        uploads[uploadId] = {
            fileName: file.name,
            fileSize: file.size,
            lastModified: file.lastModified,
            parentId: parentId ?? null,
            chunkSize: chunkSize,
            offset: offset,
            timestamp: Date.now()
        };
        localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(uploads));
    } catch (e) {}
}

function updateUploadState(uploadId, patch) {
    try {
        const uploads = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}');
        if (!uploads[uploadId]) return;
        uploads[uploadId] = { ...uploads[uploadId], ...patch, timestamp: Date.now() };
        localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(uploads));
    } catch (e) {}
}

function clearUploadState(uploadId) {
    try {
        const uploads = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}');
        delete uploads[uploadId];
        localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(uploads));
    } catch (e) {}
}

function clearAllUploadState() {
    try {
        localStorage.removeItem(UPLOAD_STATE_KEY);
    } catch (e) {}
}

function hasPendingUploads() {
    try {
        const uploads = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}');
        return Object.keys(uploads).length > 0;
    } catch (e) {
        return false;
    }
}

window.showRecoveredUploads = async function() {
    window.__recoveredSeq = (window.__recoveredSeq || 0) + 1;
    const seq = window.__recoveredSeq;
    const uploads = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}');
    const now = Date.now();
    const container = document.getElementById('upload-progress-container');
    if (!container) return;

    container.querySelectorAll('[data-recovered="1"], #recovered-warning').forEach(el => el.remove());

    const uploadIds = Object.keys(uploads);
    if (!uploadIds.length) return;

    Object.entries(uploads).forEach(([uploadId, info]) => {
        const age = now - info.timestamp;
        if (age < 30 * 60 * 1000) {
            return;
        } else {
            clearUploadState(uploadId);
        }
    });

    const remainingAll = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}');
    const byKey = {};
    Object.entries(remainingAll).forEach(([uploadId, info]) => {
        const key = `${info.fileName}|${info.fileSize}|${info.lastModified}|${info.parentId ?? ''}`;
        byKey[key] = byKey[key] || [];
        byKey[key].push({ uploadId, info });
    });
    Object.values(byKey).forEach((arr) => {
        if (arr.length <= 1) return;
        arr.sort((a, b) => (b.info.timestamp || 0) - (a.info.timestamp || 0));
        const stale = arr.slice(1);
        stale.forEach(({ uploadId }) => {
            authFetch(`${API_URL}/file/upload/chunk/cancel/${uploadId}`, { method: 'POST' }).catch(() => {});
            clearUploadState(uploadId);
        });
    });

    const remaining = Object.keys(JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}'));
    if (!remaining.length) return;

    if (seq !== window.__recoveredSeq) return;
    container.insertAdjacentHTML('beforeend', `
        <div class="alert alert-warning mb-2" role="alert" id="recovered-warning" data-recovered="1">
            检测到 ${remaining.length} 个未完成的上传。刷新后浏览器无法继续读取文件内容，需要重新选择同一文件才能续传。
            <button class="btn btn-sm btn-outline-warning ms-2" onclick="clearAllUploadState(); location.reload();">清除记录</button>
        </div>
    `);

    if (!document.getElementById('resume-file-input')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.id = 'resume-file-input';
        input.style.display = 'none';
        input.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f || !window.__resumeTarget) return;
            const { uploadId, expected } = window.__resumeTarget;
            if (f.name !== expected.fileName || f.size !== expected.fileSize) {
                alert('请选择同一个文件（文件名/大小必须一致）');
                return;
            }
            resumeChunkUpload(uploadId, f, expected.parentId);
        });
        document.body.appendChild(input);
    }

    for (const uploadId of remaining) {
        if (seq !== window.__recoveredSeq) return;
        const info = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}')[uploadId];
        if (!info) return;

        let status;
        try {
            const res = await authFetch(`${API_URL}/file/upload/chunk/status/${uploadId}`);
            if (!res.ok) throw new Error(await res.text());
            status = await res.json();
        } catch (e) {
            if (seq !== window.__recoveredSeq) return;
            container.insertAdjacentHTML('beforeend', `
                <div class="mb-2 p-2 border rounded bg-white shadow-sm" data-recovered="1">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="text-truncate" style="max-width: 70%">${info.fileName}</span>
                        <div>
                            <span class="me-2 small">状态未知</span>
                            <button class="btn btn-sm btn-outline-danger py-0" onclick="cancelRecoveredUpload('${uploadId}')">清除</button>
                        </div>
                    </div>
                    <div class="small text-muted">${uploadId}</div>
                </div>
            `);
            return;
        }

        const percent = status.totalSize ? Math.round((status.receivedSize / status.totalSize) * 100) : 0;
        const boxId = `recovered-${uploadId}`;

        if (seq !== window.__recoveredSeq) return;
        container.insertAdjacentHTML('beforeend', `
            <div class="mb-2 p-2 border rounded bg-white shadow-sm" id="${boxId}" data-recovered="1">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-truncate" style="max-width: 70%">${status.fileName}</span>
                    <div>
                        <span id="${boxId}-text" class="me-2 small">${percent}%</span>
                        <button class="btn btn-sm btn-outline-primary py-0" onclick="promptResumeUpload('${uploadId}')">继续</button>
                        <button class="btn btn-sm btn-outline-danger py-0 ms-1" onclick="cancelRecoveredUpload('${uploadId}')">取消</button>
                    </div>
                </div>
                <div class="progress" style="height: 5px;">
                    <div id="${boxId}-bar" class="progress-bar" style="width: ${percent}%"></div>
                </div>
                <div class="small text-muted">${status.receivedSize} / ${status.totalSize}</div>
            </div>
        `);
    }
};

window.promptResumeUpload = (uploadId) => {
    const uploads = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}');
    const info = uploads[uploadId];
    if (!info) return;
    window.__resumeTarget = { uploadId, expected: info };
    document.getElementById('resume-file-input')?.click();
};

window.cancelRecoveredUpload = async (uploadId) => {
    const ctrl = window.__resumeAbortCtrls?.[uploadId];
    if (ctrl) ctrl.abort();
    try {
        await authFetch(`${API_URL}/file/upload/chunk/cancel/${uploadId}`, { method: 'POST' });
    } catch (e) {}
    clearUploadState(uploadId);
    document.getElementById(`recovered-${uploadId}`)?.remove();
};

window.addEventListener('beforeunload', (e) => {
    if (hasPendingUploads()) {
        e.preventDefault();
        e.returnValue = '还有文件正在上传中，确定要离开吗？';
        return e.returnValue;
    }
});

async function handleFiles(files) {
    const fileList = Array.from(files);
    if (!fileList.length) return;
    
    const container = document.getElementById('upload-progress-container');
    window.__uploadIdByProgressId = window.__uploadIdByProgressId || {};
    
    // Queue Logic could be added here, currently parallel with concurrency limit by browser
    for (const file of fileList) {
        const progressId = `prog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const abortCtrl = new AbortController();
        let chunkUploadId = null;
        
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
            if (!file.size) throw new Error('Empty file');
            chunkUploadId = await uploadChunked(file, progressId, abortCtrl);
            
            // Success
            if (chunkUploadId) clearUploadState(chunkUploadId);
            const box = document.getElementById(`${progressId}-box`);
            if(box) {
                box.classList.remove('bg-white');
                box.classList.add('bg-success', 'bg-opacity-10');
                document.getElementById(`${progressId}-text`).textContent = '完成';
                setTimeout(() => box.remove(), 2000); // Remove after delay
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                 if (chunkUploadId) clearUploadState(chunkUploadId);
                 document.getElementById(`${progressId}-text`).textContent = '已取消';
            } else {
                 document.getElementById(`${progressId}-text`).textContent = '失败';
                 document.getElementById(`${progressId}`).classList.add('bg-danger');
                 console.error(err);
            }
        }
        
        delete window[`abort_${progressId}`];
        delete window.__uploadIdByProgressId[progressId];
    }
    loadFiles(); // Refresh once batch started/done
}

window.abortUpload = (id) => {
    const ctrl = window[`abort_${id}`];
    if (ctrl) ctrl.abort();
    document.getElementById(`${id}-box`)?.remove();
    const uploadId = window.__uploadIdByProgressId?.[id];
    if (uploadId) {
        authFetch(`${API_URL}/file/upload/chunk/cancel/${uploadId}`, { method: 'POST' }).catch(() => {});
        clearUploadState(uploadId);
        delete window.__uploadIdByProgressId[id];
    }
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
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    saveUploadState(uploadId, file, currentFolderId, CHUNK_SIZE, 0);
    window.__uploadIdByProgressId = window.__uploadIdByProgressId || {};
    window.__uploadIdByProgressId[progressId] = uploadId;

    await uploadChunkedContinue(file, abortCtrl, uploadId, 0, CHUNK_SIZE, currentFolderId, (percent) => updateProgress(progressId, percent));
    return uploadId;
}

async function uploadChunkedContinue(file, abortCtrl, uploadId, startOffset, chunkSize, parentId, progressUpdater) {
    let offset = startOffset;
    if (offset < 0 || offset > file.size) throw new Error('Invalid resume offset');

    const initialPercent = Math.round((offset / file.size) * 100);
    progressUpdater(initialPercent);

    while (offset < file.size) {
        if (abortCtrl.signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const chunk = file.slice(offset, offset + chunkSize);
        const res = await fetch(`${API_URL}/file/upload/chunk/append/${uploadId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/octet-stream'
            },
            body: chunk,
            signal: abortCtrl.signal
        });
        if(!res.ok) {
            const errorText = await res.text();
            throw new Error(`Chunk upload failed: ${errorText}`);
        }

        offset += chunk.size;
        updateUploadState(uploadId, { offset: offset });
        const percent = Math.round((offset / file.size) * 100);
        progressUpdater(percent);
    }

    const finishRes = await fetch(`${API_URL}/file/upload/chunk/finish/${uploadId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uploadId, fileName: file.name, parentId: parentId }),
        signal: abortCtrl.signal
    });
    if (!finishRes.ok) {
        const errorText = await finishRes.text();
        throw new Error(`Finish failed: ${errorText}`);
    }

    clearUploadState(uploadId);
}

async function resumeChunkUpload(uploadId, file, parentId) {
    const container = document.getElementById('upload-progress-container');
    if (!container) return;

    const boxId = `recovered-${uploadId}`;
    const bar = document.getElementById(`${boxId}-bar`);
    const text = document.getElementById(`${boxId}-text`);
    if (!bar || !text) return;

    window.__resumeAbortCtrls = window.__resumeAbortCtrls || {};
    const abortCtrl = new AbortController();
    window.__resumeAbortCtrls[uploadId] = abortCtrl;

    let status;
    const uploads = JSON.parse(localStorage.getItem(UPLOAD_STATE_KEY) || '{}');
    const info = uploads[uploadId];
    const chunkSize = info?.chunkSize || (5 * 1024 * 1024);

    try {
        const res = await authFetch(`${API_URL}/file/upload/chunk/status/${uploadId}`);
        if (!res.ok) throw new Error(await res.text());
        status = await res.json();
    } catch (e) {
        alert('无法获取服务器进度');
        return;
    }

    if (status.receivedSize > file.size) {
        clearUploadState(uploadId);
        alert('服务器进度异常，已清除该上传记录');
        return;
    }

    const progressUpdater = (percent) => {
        bar.style.width = `${percent}%`;
        text.textContent = `${percent}%`;
    };

    try {
        await uploadChunkedContinue(file, abortCtrl, uploadId, status.receivedSize, chunkSize, parentId, progressUpdater);
        const box = document.getElementById(boxId);
        if (box) {
            box.classList.remove('bg-white');
            box.classList.add('bg-success', 'bg-opacity-10');
            text.textContent = '完成';
            setTimeout(() => box.remove(), 2000);
        }
        delete window.__resumeAbortCtrls[uploadId];
    } catch (err) {
        if (err.name === 'AbortError') {
            text.textContent = '已取消';
            delete window.__resumeAbortCtrls[uploadId];
        } else {
            bar.classList.add('bg-danger');
            text.textContent = '失败';
            console.error(err);
        }
    }
}

function updateProgress(id, percent) {
    const bar = document.getElementById(id);
    const text = document.getElementById(`${id}-text`);
    if (bar && text) {
        bar.style.width = `${percent}%`;
        text.textContent = `${percent}%`;
    }
}

// --- Publish ---

async function loadPublishPage() {
    const content = document.getElementById('content-area');
    content.innerHTML = `<h3>${t('loading')}</h3>`;

    const pageInfo = await fetchPublishHistory();
    renderPublishPage(pageInfo);
}

async function fetchPublishHistory() {
    try {
        const query = new URLSearchParams({
            page: String(publishState.page),
            pageSize: String(publishState.pageSize)
        });

        if (publishState.keyword) {
            query.set('keyword', publishState.keyword);
        }

        const res = await authFetch(`${API_URL}/publish?${query.toString()}`);
        if (!res.ok) {
            throw new Error(await res.text());
        }

        return await res.json();
    } catch (err) {
        return {
            items: [],
            page: publishState.page,
            pageSize: publishState.pageSize,
            totalCount: 0,
            totalPages: 1,
            error: err.message
        };
    }
}

function renderPublishPage(pageInfo) {
    const content = document.getElementById('content-area');
    const pageInfoText = t('publishPageInfo')
        .replace('{page}', pageInfo.page)
        .replace('{total}', pageInfo.totalPages)
        .replace('{count}', pageInfo.totalCount);
    const summary = pageInfo.summary || {
        totalCount: 0,
        latestPublishTime: null,
        codePostCount: 0,
        imagePostCount: 0
    };

    content.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
                <h3 class="mb-1">${t('publishTitle')}</h3>
                <div class="text-muted">${t('publishDescription')}</div>
            </div>
        </div>
        <div class="publish-stats-grid mb-3">
            ${renderPublishSummary(summary)}
        </div>
        <div class="card shadow-sm publish-history-panel">
            <div class="card-header bg-white">
                <div class="publish-toolbar">
                    <div>
                        <strong>${t('publishHistory')}</strong>
                        <div class="text-muted small mt-1">${t('publishAutoHint')}</div>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <div class="input-group" style="width: min(360px, 100%);">
                            <input type="text" class="form-control" id="publish-search-input" value="${escapeHtmlAttr(publishState.keyword)}" placeholder="${t('publishSearchPlaceholder')}">
                            <button class="btn btn-outline-secondary" type="button" onclick="searchPublishHistory()">${t('publishSearch')}</button>
                            <button class="btn btn-outline-secondary" type="button" onclick="resetPublishSearch()">${t('publishReset')}</button>
                        </div>
                        <button class="btn btn-primary" type="button" onclick="openPublishComposer()">${t('publishOpenComposer')}</button>
                    </div>
                </div>
            </div>
            <div class="card-body d-flex flex-column">
                ${pageInfo.error ? `<div class="alert alert-danger">${escapeHtml(pageInfo.error)}</div>` : ''}
                <div id="publish-history-list" class="publish-history-list flex-grow-1">
                    ${renderPublishHistoryItems(pageInfo.items)}
                </div>
                <div class="publish-pagination mt-3">
                    <div class="text-muted small">${pageInfoText}</div>
                    <div class="btn-group">
                        <button class="btn btn-outline-secondary btn-sm" type="button" onclick="changePublishPage(${pageInfo.page - 1})" ${pageInfo.page <= 1 ? 'disabled' : ''}>${t('publishPrev')}</button>
                        <button class="btn btn-outline-secondary btn-sm" type="button" onclick="changePublishPage(${pageInfo.page + 1})" ${pageInfo.page >= pageInfo.totalPages ? 'disabled' : ''}>${t('publishNext')}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    highlightPublishBlocks();
    syncPublishModalLanguage();
    const searchInput = document.getElementById('publish-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchPublishHistory();
            }
        });
    }
}

function renderPublishSummary(summary) {
    return `
        <div class="publish-stat-card card">
            <div class="card-body">
                <div class="publish-stat-label">${t('publishStatsTotal')}</div>
                <div class="publish-stat-value">${summary.totalCount ?? 0}</div>
                <div class="publish-stat-sub">${t('publishHistory')}</div>
            </div>
        </div>
        <div class="publish-stat-card card">
            <div class="card-body">
                <div class="publish-stat-label">${t('publishStatsLatest')}</div>
                <div class="publish-stat-value fs-5">${summary.latestPublishTime ? formatDateTime(summary.latestPublishTime) : t('publishLatestEmpty')}</div>
                <div class="publish-stat-sub">${t('publishAt')}</div>
            </div>
        </div>
        <div class="publish-stat-card card">
            <div class="card-body">
                <div class="publish-stat-label">${t('publishStatsCode')}</div>
                <div class="publish-stat-value">${summary.codePostCount ?? 0}</div>
                <div class="publish-stat-sub">${t('publishCodeText')}</div>
            </div>
        </div>
        <div class="publish-stat-card card">
            <div class="card-body">
                <div class="publish-stat-label">${t('publishStatsImage')}</div>
                <div class="publish-stat-value">${summary.imagePostCount ?? 0}</div>
                <div class="publish-stat-sub">${t('publishImage')}</div>
            </div>
        </div>
    `;
}

function renderPublishHistoryItems(items) {
    if (!items || items.length === 0) {
        return `<div class="text-center text-muted py-5">${t('publishEmpty')}</div>`;
    }

    return items.map(item => {
        const contentHtml = renderPublishContent(item);
        const imageHtml = item.imageUrl
            ? `
                <div class="mt-3">
                    <img
                        src="${item.imageUrl}?access_token=${encodeURIComponent(token)}"
                        alt="${escapeHtmlAttr(item.imageFileName || 'publish-image')}"
                        class="publish-image-thumb"
                        onclick="openPublishImagePreview('${item.imageUrl}')"
                    >
                </div>
            `
            : '';

        return `
            <article class="publish-item">
                <div class="publish-item-header">
                    <div>
                        <div class="fw-semibold">${t('publishBy')}: ${escapeHtml(item.userName)}</div>
                        <div class="text-muted small">${t('publishAt')}: ${new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                    <span class="badge text-bg-light">${item.textFormat === 'code' ? t('publishCodeText') : t('publishPlainText')}</span>
                </div>
                <div class="publish-item-body">
                    ${contentHtml}
                    ${imageHtml}
                </div>
            </article>
        `;
    }).join('');
}

function renderPublishContent(item) {
    if (!item.content) {
        return '';
    }

    if (item.textFormat === 'code') {
        const lang = mapPublishLanguageToHighlight(item.codeLanguage);
        return `<pre class="publish-code"><code class="language-${lang}">${escapeHtml(item.content)}</code></pre>`;
    }

    return `<p class="publish-content-text">${escapeHtml(item.content)}</p>`;
}

function bindPublishComposerEvents() {
    const textarea = document.getElementById('publish-content');
    const formatSelect = document.getElementById('publish-text-format');
    const languageGroup = document.getElementById('publish-language-group');
    const imageInput = document.getElementById('publish-image');
    const previewWrap = document.getElementById('publish-image-preview-wrap');
    const previewImage = document.getElementById('publish-image-preview');
    const submitBtn = document.getElementById('publish-submit-btn');

    if (!textarea || textarea.dataset.bound === '1') {
        return;
    }

    textarea.dataset.bound = '1';

    const updateRemaining = () => {
        document.getElementById('publish-remaining').textContent = String(2000 - textarea.value.length);
    };
    textarea.addEventListener('input', updateRemaining);
    updateRemaining();

    formatSelect?.addEventListener('change', syncPublishModalLanguage);
    syncPublishModalLanguage();

    imageInput?.addEventListener('change', () => {
        const [file] = imageInput.files || [];
        if (!file) {
            previewImage.src = '';
            previewWrap.classList.add('d-none');
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        previewImage.src = objectUrl;
        previewWrap.classList.remove('d-none');
    });

    submitBtn?.addEventListener('click', submitPublishForm);
}

function syncPublishModalLanguage() {
    const formatSelect = document.getElementById('publish-text-format');
    const languageGroup = document.getElementById('publish-language-group');
    if (!formatSelect || !languageGroup) return;
    languageGroup.classList.toggle('d-none', formatSelect.value !== 'code');
}

async function submitPublishForm() {
    const submitBtn = document.getElementById('publish-submit-btn');
    const contentText = document.getElementById('publish-content').value.trim();
    const textFormat = document.getElementById('publish-text-format').value;
    const codeLanguage = document.getElementById('publish-code-language').value;
    const imageInput = document.getElementById('publish-image');
    const imageFile = imageInput.files?.[0];

    if (!contentText && !imageFile) {
        alert(t('publishNeedContent'));
        return;
    }

    const formData = new FormData();
    formData.append('content', contentText);
    formData.append('textFormat', textFormat);
    if (textFormat === 'code') {
        formData.append('codeLanguage', codeLanguage);
    }
    if (imageFile) {
        formData.append('image', imageFile);
    }

    submitBtn.disabled = true;
    try {
        const res = await authFetch(`${API_URL}/publish`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            throw new Error(await res.text());
        }

        alert(t('publishSuccess'));
        resetPublishComposer();
        publishState.page = 1;
        bootstrap.Modal.getInstance(document.getElementById('publishComposerModal'))?.hide();
        await loadPublishPage();
    } catch (err) {
        alert(err.message);
    } finally {
        submitBtn.disabled = false;
    }
}

window.searchPublishHistory = async () => {
    publishState.keyword = document.getElementById('publish-search-input')?.value.trim() || '';
    publishState.page = 1;
    await loadPublishPage();
};

window.resetPublishSearch = async () => {
    publishState.keyword = '';
    publishState.page = 1;
    await loadPublishPage();
};

window.changePublishPage = async (page) => {
    if (page < 1) return;
    publishState.page = page;
    await loadPublishPage();
};

window.openPublishComposer = () => {
    syncPublishModalLanguage();
    const modal = new bootstrap.Modal(document.getElementById('publishComposerModal'));
    modal.show();
};

function resetPublishComposer() {
    document.getElementById('publish-form').reset();
    document.getElementById('publish-image-preview').src = '';
    document.getElementById('publish-image-preview-wrap').classList.add('d-none');
    document.getElementById('publish-remaining').textContent = '2000';
    document.getElementById('publish-text-format').value = 'auto';
    syncPublishModalLanguage();
}

function highlightPublishBlocks() {
    document.querySelectorAll('#publish-history-list pre code').forEach(block => {
        hljs.highlightElement(block);
    });
}

// --- Dashboard ---

async function loadDashboard() {
    const content = document.getElementById('content-area');
    content.innerHTML = `<h3>${t('loading')}</h3>`;
    
    try {
        const res = await authFetch(`${API_URL}/system/dashboard`);
        if (res.status === 403) throw new Error('无权访问');
        const data = await res.json();
        
        content.innerHTML = `
            <h3>${t('dashboard')}</h3>
            <div class="row mt-4">
                <div class="col-md-3">
                    <div class="card text-white bg-primary mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${t('onlineUsers')}</h5>
                            <p class="card-text display-4">${data.onlineUsers}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-success mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${t('todayUpload')}</h5>
                            <p class="card-text">${data.todayStats.uploadCount} (${data.todayStats.uploadSize})</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-info mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${t('todayDownload')}</h5>
                            <p class="card-text">${data.todayStats.downloadCount} (${data.todayStats.downloadSize})</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-warning mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${t('storage')}</h5>
                            <p class="card-text">${data.storageUsage}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <h4 class="mt-4">${t('recentLogs')}</h4>
            <table class="table table-striped table-sm">
                <thead><tr><th>${t('logTime')}</th><th>${t('logUser')}</th><th>${t('logAction')}</th><th>${t('logDetails')}</th></tr></thead>
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
        alert('Unauthorized');
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

function formatDateTime(value) {
    return new Date(value).toLocaleString();
}

function mapPublishLanguageToHighlight(language) {
    const languageMap = {
        json: 'json',
        csharp: 'cs',
        typescript: 'typescript',
        shell: 'shell',
        vue: 'vue',
        cpp: 'cpp',
        java: 'java',
        html: 'html'
    };

    return languageMap[language] || 'plaintext';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(value) {
    return escapeHtml(value);
}

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
            alert(t('copySuccess'));
        };
    } catch (err) {
        alert(err.message);
    }
};

window.deleteFile = async (id) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
        await authFetch(`${API_URL}/file/${id}`, { method: 'DELETE' });
        loadFiles();
    } catch (err) {
        alert(err.message);
    }
};

window.copyLink = (shareToken) => {
    const link = `${window.location.origin}/api/file/share/${shareToken}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            alert(t('shareLinkCopy') + link);
        }).catch(() => {
            fallbackCopyText(link);
        });
    } else {
        fallbackCopyText(link);
    }
};

function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        alert(t('shareLinkCopy') + text);
    } catch (err) {
        prompt(t('shareLinkCopy') + text, text);
    }
    document.body.removeChild(textarea);
};

// Set initial selection
const langSelect = document.getElementById('lang-select');
const langSelectLogin = document.getElementById('lang-select-login');
if (langSelect) langSelect.value = currentLang;
if (langSelectLogin) langSelectLogin.value = currentLang;
bindPublishComposerEvents();
document.getElementById('publishComposerModal')?.addEventListener('hidden.bs.modal', resetPublishComposer);
init();
