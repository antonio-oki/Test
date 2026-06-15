// State variables
let brightness = 100;
let wifiStatus = false;

function openApp(appName) {
    document.getElementById('desktop').classList.add('hidden');
    const appWindow = document.getElementById('app-window');
    const appContent = document.getElementById('app-content');
    appWindow.classList.remove('hidden');

    if (appName === 'Browser') {
        appContent.innerHTML = `<h2>Browser</h2><p>Offline Mode</p><p>Search is disabled.</p><button onclick="goHome()">Back</button>`;
    } else if (appName === 'Settings') {
        renderSettings(appContent);
    } else if (appName === 'Messages') {
        appContent.innerHTML = `<h2>Messages</h2><div class="file-item">John: Hey!</div><div class="file-item">System: Update Available</div><button onclick="goHome()">Back</button>`;
    } else if (appName === 'Files') {
        const files = ["Photos", "Music", "Documents"];
        let fileList = files.map(f => `<div class="file-item">📄 ${f}</div>`).join('');
        appContent.innerHTML = `<h2>Files</h2>${fileList}<button onclick="goHome()">Back</button>`;
    }
}

// Function to render Settings interface
function renderSettings(container) {
    container.innerHTML = `
        <h2>Settings</h2>
        <div class="setting-item">
            Brightness
            <input type="range" min="20" max="100" value="${brightness}" oninput="updateBrightness(this.value)">
        </div>
        <div class="setting-item">
            Wi-Fi
            <input type="checkbox" ${wifiStatus ? 'checked' : ''} onchange="toggleWifi(this.checked)">
        </div>
        <button onclick="goHome()">Back</button>
    `;
}

// Settings Logic
function updateBrightness(val) {
    brightness = val;
    document.querySelector('.phone-frame').style.filter = `brightness(${val}%)`;
}

function toggleWifi(checked) {
    wifiStatus = checked;
    console.log("Wi-Fi is now: " + (checked ? "ON" : "OFF"));
}

function goHome() {
    document.getElementById('app-window').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
}

setInterval(() => {
    document.getElementById('time').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);
