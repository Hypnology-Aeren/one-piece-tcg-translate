const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
require('dotenv').config();
// ===== Bellek ve Performans Optimizasyonları (RAM Tasarrufu) =====
// V8 JavaScript motorunun maksimum bellek kullanımını sınırla (örneğin 256MB veya 512MB)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512 --expose-gc');
// Chromium'un her site/frame için ayrı işlem (process) açmasını engelle (Büyük ölçüde RAM kurtarır)
app.commandLine.appendSwitch('disable-site-isolation-trials');
// Donanım ivmelendirmesi GPU tarafında yüksek RAM tüketebilir. İsteğe bağlı olarak açıp kapatabilirsiniz.
// Eğer arayüzde kasmalar olursa alttaki satırı silebilir veya yorum satırı yapabilirsiniz.
app.disableHardwareAcceleration();

let mainWindow;

// ===== Auto-Updater Yapılandırması =====
autoUpdater.autoDownload = false; // Kullanıcıya sormadan indirme
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "OPTCG Çevirici",
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools(); // Debug için aç

  // Uygulama yüklenince güncelleme kontrolü başlat
  mainWindow.webContents.on('did-finish-load', () => {
    // Mevcut versiyon bilgisini gönder
    mainWindow.webContents.send('app-version', app.getVersion());
    // Güncelleme kontrolü
    checkForUpdates();
  });
}

// ===== Güncelleme Kontrolü =====
function checkForUpdates() {
  autoUpdater.checkForUpdates().catch(err => {
    console.log('Güncelleme kontrolü başarısız (muhtemelen internet yok):', err.message);
  });
}

// Güncelleme mevcut
autoUpdater.on('update-available', (info) => {
  console.log('✅ Yeni güncelleme bulundu:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate
    });
  }
});

// Güncelleme yok
autoUpdater.on('update-not-available', () => {
  console.log('ℹ️ Uygulama güncel.');
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available');
  }
});

// İndirme ilerleme durumu
autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    });
  }
});

// İndirme tamamlandı
autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Güncelleme indirildi, kuruluma hazır:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version
    });
  }
});

// Hata
autoUpdater.on('error', (err) => {
  console.error('❌ Güncelleme hatası:', err.message);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

// ===== Renderer'dan gelen IPC mesajları =====

// Güncellemeyi indir
ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate().catch(err => {
    console.error('İndirme hatası:', err);
  });
});

// İndirilen güncellemeyi kur ve yeniden başlat
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Manuel güncelleme kontrolü
ipcMain.on('check-for-updates', () => {
  checkForUpdates();
});

// ===== App Lifecycle =====
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
