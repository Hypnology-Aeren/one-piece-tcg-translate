// ===== OPTCG Updater — Renderer Side =====
// Bu dosya Electron main process'ten gelen güncelleme mesajlarını dinler

const { ipcRenderer } = require('electron');

let updateState = 'idle'; // idle | available | downloading | ready

// ===== Versiyon Bilgisi =====
ipcRenderer.on('app-version', (event, version) => {
    const versionText = document.getElementById('versionText');
    if (versionText) {
        versionText.textContent = `v${version}`;
    }
});

// ===== Güncelleme Mevcut =====
ipcRenderer.on('update-available', (event, info) => {
    updateState = 'available';
    const banner = document.getElementById('updateBanner');
    const title = document.getElementById('updateTitle');
    const version = document.getElementById('updateVersion');
    const actionBtn = document.getElementById('updateActionBtn');
    const progressWrapper = document.getElementById('updateProgressWrapper');

    title.textContent = '🎉 Yeni güncelleme mevcut!';
    version.textContent = `v${info.version}`;
    actionBtn.textContent = 'İndir';
    actionBtn.disabled = false;
    progressWrapper.style.display = 'none';
    banner.style.display = 'flex';
    banner.classList.add('slide-in');

    showToast(`🆕 Yeni sürüm v${info.version} mevcut!`);
});

// ===== Güncelleme Yok =====
ipcRenderer.on('update-not-available', () => {
    updateState = 'idle';
    // Sessizce geç, banner göstermeye gerek yok
    console.log('✅ Uygulama güncel.');
});

// ===== İndirme İlerleme =====
ipcRenderer.on('update-download-progress', (event, progress) => {
    const progressFill = document.getElementById('updateProgressFill');
    const progressText = document.getElementById('updateProgressText');
    const progressWrapper = document.getElementById('updateProgressWrapper');
    const title = document.getElementById('updateTitle');

    progressWrapper.style.display = 'flex';
    progressFill.style.width = `${progress.percent}%`;
    
    const mbTransferred = (progress.transferred / 1048576).toFixed(1);
    const mbTotal = (progress.total / 1048576).toFixed(1);
    const speed = (progress.bytesPerSecond / 1048576).toFixed(1);
    
    progressText.textContent = `${progress.percent}%`;
    title.textContent = `⬇️ İndiriliyor... ${mbTransferred}/${mbTotal} MB (${speed} MB/s)`;
});

// ===== İndirme Tamamlandı =====
ipcRenderer.on('update-downloaded', (event, info) => {
    updateState = 'ready';
    const title = document.getElementById('updateTitle');
    const actionBtn = document.getElementById('updateActionBtn');
    const progressWrapper = document.getElementById('updateProgressWrapper');
    const banner = document.getElementById('updateBanner');

    title.textContent = '✅ Güncelleme hazır!';
    actionBtn.textContent = '🔄 Yeniden Başlat';
    actionBtn.disabled = false;
    actionBtn.classList.add('pulse-animation');
    progressWrapper.style.display = 'none';
    banner.style.display = 'flex';

    showToast('✅ Güncelleme indirildi! Yeniden başlatmak için tıklayın.');
});

// ===== Hata =====
ipcRenderer.on('update-error', (event, message) => {
    updateState = 'idle';
    console.error('Güncelleme hatası:', message);
    const banner = document.getElementById('updateBanner');
    banner.style.display = 'none';
});

// ===== Buton Aksiyonları =====
function handleUpdateAction() {
    const actionBtn = document.getElementById('updateActionBtn');

    if (updateState === 'available') {
        // İndirmeyi başlat
        updateState = 'downloading';
        actionBtn.textContent = 'İndiriliyor...';
        actionBtn.disabled = true;
        ipcRenderer.send('download-update');
    } else if (updateState === 'ready') {
        // Güncellemeyi kur ve yeniden başlat
        ipcRenderer.send('install-update');
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

// Versiyon badge'ine tıklayınca manuel kontrol
document.addEventListener('DOMContentLoaded', () => {
    const versionBadge = document.getElementById('versionBadge');
    if (versionBadge) {
        versionBadge.addEventListener('click', () => {
            showToast('🔍 Güncelleme kontrol ediliyor...');
            ipcRenderer.send('check-for-updates');
        });
    }
});
