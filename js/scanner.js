// ============ QR SCANNER FOR CARD ACTIVATION ============

let qrScanner = null;

function openScannerModal() {
  closeModal();
  document.body.classList.add("no-scroll");
  
  root.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" id="modal">
      <div class="modal scanner-modal">
        <div class="row-between">
          <div>
            <h2>${icons.scan} Scan Kartu</h2>
            <p>Arahkan kamera ke QR code pada kartu untuk aktivasi.</p>
          </div>
          <button class="icon-btn" data-scanner-close>${icons.close}</button>
        </div>
        <div class="scanner-container">
          <div id="qr-reader"></div>
          <div class="scanner-overlay">
            <div class="scanner-frame"></div>
          </div>
        </div>
        <div class="scanner-status" id="scanner-status">
          <div class="loading-spinner" style="width:20px;height:20px"></div>
          <span>Memulai kamera...</span>
        </div>
        <div class="scanner-hint">
          <p>${icons.help} Pastikan QR code terlihat jelas dalam bingkai</p>
        </div>
        <div class="scanner-actions">
          <button class="btn btn-ghost" data-scanner-close>Batal</button>
          <button class="btn btn-secondary" id="switch-camera-btn" style="display:none">
            ${icons.scan} Ganti Kamera
          </button>
        </div>
      </div>
    </div>
  `);
  
  initQrScanner();
}

async function initQrScanner() {
  const statusEl = document.getElementById('scanner-status');
  const switchBtn = document.getElementById('switch-camera-btn');
  
  try {
    // Check if Html5Qrcode is available
    if (typeof Html5Qrcode === 'undefined') {
      updateScannerStatus('error', 'Library scanner tidak tersedia. Silakan refresh halaman.');
      return;
    }
    
    qrScanner = new Html5Qrcode("qr-reader");
    
    // Get available cameras
    const cameras = await Html5Qrcode.getCameras();
    
    if (!cameras || cameras.length === 0) {
      updateScannerStatus('error', 'Tidak ada kamera yang ditemukan.');
      return;
    }
    
    // Show switch camera button if multiple cameras
    if (cameras.length > 1 && switchBtn) {
      switchBtn.style.display = 'inline-flex';
      switchBtn.dataset.cameraIndex = '0';
      switchBtn.dataset.cameras = JSON.stringify(cameras.map(c => c.id));
    }
    
    // Prefer back camera
    let cameraId = cameras[0].id;
    const backCamera = cameras.find(c => 
      c.label.toLowerCase().includes('back') || 
      c.label.toLowerCase().includes('belakang') ||
      c.label.toLowerCase().includes('rear') ||
      c.label.toLowerCase().includes('environment')
    );
    if (backCamera) cameraId = backCamera.id;
    
    await startScanner(cameraId);
    
  } catch (err) {
    console.error('QR Scanner init error:', err);
    if (err.name === 'NotAllowedError') {
      updateScannerStatus('error', 'Akses kamera ditolak. Izinkan akses kamera di pengaturan browser.');
    } else if (err.name === 'NotFoundError') {
      updateScannerStatus('error', 'Kamera tidak ditemukan pada perangkat ini.');
    } else {
      updateScannerStatus('error', 'Gagal memulai scanner: ' + (err.message || 'Unknown error'));
    }
  }
}

async function startScanner(cameraId) {
  if (!qrScanner) return;
  
  updateScannerStatus('loading', 'Memulai kamera...');
  
  try {
    await qrScanner.start(
      cameraId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      onQrCodeScanned,
      (errorMessage) => {
        // Ignore scan errors (no QR found in frame)
      }
    );
    
    updateScannerStatus('ready', 'Kamera aktif. Arahkan ke QR code kartu.');
    
  } catch (err) {
    console.error('Start scanner error:', err);
    updateScannerStatus('error', 'Gagal memulai kamera: ' + (err.message || 'Unknown error'));
  }
}

async function switchCamera() {
  const switchBtn = document.getElementById('switch-camera-btn');
  if (!switchBtn || !qrScanner) return;
  
  try {
    const cameras = JSON.parse(switchBtn.dataset.cameras || '[]');
    let currentIndex = parseInt(switchBtn.dataset.cameraIndex || '0');
    
    // Stop current scanner
    await qrScanner.stop();
    
    // Switch to next camera
    currentIndex = (currentIndex + 1) % cameras.length;
    switchBtn.dataset.cameraIndex = currentIndex.toString();
    
    // Start with new camera
    await startScanner(cameras[currentIndex]);
    
  } catch (err) {
    console.error('Switch camera error:', err);
    toast('Gagal mengganti kamera.');
  }
}

function onQrCodeScanned(decodedText, decodedResult) {
  console.log('QR Scanned:', decodedText);
  
  // Stop scanner immediately to prevent multiple scans
  if (qrScanner) {
    qrScanner.stop().catch(console.error);
  }
  
  updateScannerStatus('success', 'QR code terdeteksi! Memproses...');
  
  // Parse the QR code URL to extract activation token
  const activationUrl = parseActivationUrl(decodedText);
  
  if (activationUrl) {
    // Close scanner modal
    closeScannerModal();
    
    // Navigate to activation page with token
    toast('Kartu terdeteksi! Memulai aktivasi...');
    
    setTimeout(() => {
      // Reset activation state for new card
      state.activation = {
        step: 1,
        token: null,
        claimSessionToken: null,
        cardId: null,
        cardSerial: null,
        cardStatus: null,
        errorMessage: null,
        authMode: 'register',
        email: currentUser?.email || "",
        phone: "",
        password: "",
        confirm: "",
        displayName: currentAccount?.display_name || "",
        selectedBusinessId: null,
        existingBusinesses: [],
        createNewBusiness: false,
        businessName: "",
        businessSlug: "",
        googleReviewUrl: "",
        destinationMode: "direct_google",
        isLoading: false,
        isSubmitting: false,
      };
      
      // Navigate to activation with the token
      window.location.hash = activationUrl;
    }, 500);
    
  } else {
    // Invalid QR code
    updateScannerStatus('error', 'QR code tidak valid. Pastikan Anda scan QR pada kartu SPNB DIGITAL.');
    
    // Restart scanner after delay
    setTimeout(() => {
      if (qrScanner && document.getElementById('qr-reader')) {
        initQrScanner();
      }
    }, 2000);
  }
}

function parseActivationUrl(url) {
  try {
    // Handle full URLs
    if (url.includes('/aktivasi') || url.includes('/c/')) {
      const urlObj = new URL(url);
      
      // Format: /aktivasi?token=xxx
      if (urlObj.pathname.includes('/aktivasi') || urlObj.hash.includes('/aktivasi')) {
        const token = urlObj.searchParams.get('token');
        if (token) {
          return `/aktivasi?token=${token}`;
        }
      }
      
      // Format: /c/xxx (card redirect)
      const cardMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
      if (cardMatch) {
        return `/aktivasi?token=${cardMatch[1]}`;
      }
    }
    
    // Handle hash-based URLs
    if (url.includes('#/aktivasi') || url.includes('#/c/')) {
      const hashPart = url.split('#')[1];
      if (hashPart) {
        if (hashPart.includes('/aktivasi')) {
          const tokenMatch = hashPart.match(/token=([a-zA-Z0-9_-]+)/);
          if (tokenMatch) {
            return `/aktivasi?token=${tokenMatch[1]}`;
          }
        }
        const cardMatch = hashPart.match(/\/c\/([a-zA-Z0-9_-]+)/);
        if (cardMatch) {
          return `/aktivasi?token=${cardMatch[1]}`;
        }
      }
    }
    
    // Handle direct token (just the token string)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(url)) {
      return `/aktivasi?token=${url}`;
    }
    
    return null;
  } catch (e) {
    console.error('Parse URL error:', e);
    return null;
  }
}

function updateScannerStatus(type, message) {
  const statusEl = document.getElementById('scanner-status');
  if (!statusEl) return;
  
  const statusIcons = {
    loading: '<div class="loading-spinner" style="width:20px;height:20px"></div>',
    ready: '<span class="status-dot status-active"></span>',
    success: '<span class="status-dot status-active" style="background:var(--green-500)"></span>',
    error: '<span class="status-dot" style="background:var(--red-500)"></span>'
  };
  
  statusEl.innerHTML = `${statusIcons[type] || ''}<span>${message}</span>`;
  statusEl.className = `scanner-status scanner-status-${type}`;
}

function closeScannerModal() {
  // Stop scanner if running
  if (qrScanner) {
    qrScanner.stop().catch(console.error);
    qrScanner = null;
  }
  
  closeModal();
}
