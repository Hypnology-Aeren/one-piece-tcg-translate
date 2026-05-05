// ===== OPTCG Updater — Cross-Platform =====
// Bu dosya hem Electron hem de Mobile (Capacitor) için güncelleme kontrolü yapar

let isElectron = false;
let ipcRenderer = null;

try {
    // Electron ortamında mıyız?
    if (window.process && window.process.type === 'renderer') {
        ipcRenderer = require('electron').ipcRenderer;
        isElectron = true;
    }
} catch (e) {
    console.log("Electron ortamı algılanamadı, web/mobil modunda çalışılıyor.");
}

let updateState = 'idle'; // idle | available | downloading | ready
let latestReleaseUrl = '';
const CURRENT_VERSION = '1.2.0'; // Uygulamanın şu anki versiyonu

// ===== ELECTRON LOGIC =====
if (isElectron) {
    ipcRenderer.on('app-version', (event, version) => {
        const versionText = document.getElementById('versionText');
        if (versionText) versionText.textContent = `v${version}`;
    });

    ipcRenderer.on('update-available', (event, info) => {
        showUpdateBanner(info.version);
    });

    ipcRenderer.on('update-download-progress', (event, progress) => {
        const progressFill = document.getElementById('updateProgressFill');
        const progressText = document.getElementById('updateProgressText');
        const progressWrapper = document.getElementById('updateProgressWrapper');
        const title = document.getElementById('updateTitle');

        progressWrapper.style.display = 'flex';
        progressFill.style.width = `${progress.percent}%`;
        progressText.textContent = `${Math.round(progress.percent)}%`;
        title.textContent = `⬇️ İndiriliyor...`;
    });

    ipcRenderer.on('update-downloaded', (event, info) => {
        updateState = 'ready';
        const title = document.getElementById('updateTitle');
        const actionBtn = document.getElementById('updateActionBtn');
        const progressWrapper = document.getElementById('updateProgressWrapper');

        title.textContent = '✅ Güncelleme hazır!';
        actionBtn.textContent = '🔄 Yeniden Başlat';
        actionBtn.disabled = false;
        actionBtn.classList.add('pulse-animation');
        progressWrapper.style.display = 'none';
    });

    ipcRenderer.on('update-error', (event, message) => {
        updateState = 'idle';
        console.error('Güncelleme hatası:', message);
        document.getElementById('updateBanner').style.display = 'none';
    });
}

// ===== MOBILE / WEB LOGIC (GitHub API) =====
async function checkGitHubUpdate() {
    try {
        const response = await fetch('https://api.github.com/repos/Hypnology-Aeren/one-piece-tcg-translate/releases/latest');
        if (!response.ok) return;
        
        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        latestReleaseUrl = data.html_url;

        if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
            updateState = 'available_mobile';
            showUpdateBanner(latestVersion);
        }
    } catch (e) {
        console.error("Güncelleme kontrolü başarısız:", e);
    }
}

function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
}

// ===== COMMON UI LOGIC =====
function showUpdateBanner(version) {
    const banner = document.getElementById('updateBanner');
    const title = document.getElementById('updateTitle');
    const versionEl = document.getElementById('updateVersion');
    const actionBtn = document.getElementById('updateActionBtn');
    const progressWrapper = document.getElementById('updateProgressWrapper');

    title.textContent = isElectron ? '🎉 Yeni güncelleme mevcut!' : '📱 Yeni APK sürümü mevcut!';
    versionEl.textContent = `v${version}`;
    actionBtn.textContent = isElectron ? 'İndir' : 'İndir (GitHub)';
    actionBtn.disabled = false;
    progressWrapper.style.display = 'none';
    banner.style.display = 'flex';
    banner.classList.add('slide-in');

    if (typeof showToast === 'function') {
        showToast(`🆕 Yeni sürüm v${version} mevcut!`);
    }
}

function handleUpdateAction() {
    const actionBtn = document.getElementById('updateActionBtn');

    if (isElectron) {
        if (updateState === 'available') {
            updateState = 'downloading';
            actionBtn.textContent = 'İndiriliyor...';
            actionBtn.disabled = true;
            ipcRenderer.send('download-update');
        } else if (updateState === 'ready') {
            ipcRenderer.send('install-update');
        }
    } else {
        // Mobile / Web: GitHub sayfasına yönlendir
        if (latestReleaseUrl) {
            window.open(latestReleaseUrl, '_blank');
        }
    }
}

function dismissUpdate() {
    const banner = document.getElementById('updateBanner');
    banner.classList.add('slide-out');
    setTimeout(() => {
        banner.style.display = 'none';
        banner.classList.remove('slide-out');
    }, 300);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Versiyon yazısını güncelle
    const versionText = document.getElementById('versionText');
    if (versionText && !isElectron) {
        versionText.textContent = `v${CURRENT_VERSION}`;
    }

    // Mobil için kontrol başlat
    if (!isElectron) {
        checkGitHubUpdate();
    }

    // Manuel kontrol butonu
    const versionBadge = document.getElementById('versionBadge');
    if (versionBadge) {
        versionBadge.addEventListener('click', () => {
            if (typeof showToast === 'function') showToast('🔍 Güncelleme kontrol ediliyor...');
            if (isElectron) {
                ipcRenderer.send('check-for-updates');
            } else {
                checkGitHubUpdate().then(() => {
                    if (updateState === 'idle' && typeof showToast === 'function') {
                        showToast('✅ Uygulamanız güncel.');
                    }
                });
            }
        });
    }
});
