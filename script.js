// Application Frame Lifecycle Navigation States History Matrix Tracks
let currentHistory = ['desktop'];
let wifiStatus = true;
let systemBrightness = 100;

// Sandboxed Internal Virtual Local File System Storage Cache Initialization
if (!localStorage.getItem('android_fs_data')) {
    const seedFiles = ["Documents.doc", "DCIM_Camera.jpg", "Download_File.mp3"];
    localStorage.setItem('android_fs_data', JSON.stringify(seedFiles));
}

// Global Document Lifecycle System Initialization Registration Events Block
document.addEventListener("DOMContentLoaded", () => {
    updateSystemClocks();
    setInterval(updateSystemClocks, 1000);
});

// Sync both the top-right digital status bar clock and the central analog widget
function updateSystemClocks() {
    const timeNow = new Date();
    
    // 1. Digital Status Clock Conversion Formatting Loop Logic Routing Routine
    const digitalString = timeNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    document.getElementById('time-digital').innerText = digitalString;

    // 2. Analog Clock Vector Rotational Angles Geometric Calculation Coordinates
    const hours = timeNow.getHours();
    const minutes = timeNow.getMinutes();
    
    const minutesDegrees = (minutes * 6);
    const hoursDegrees = (hours * 30) + (minutes * 0.5);

    document.getElementById('clock-minute').style.transform = `rotate(${minutesDegrees}deg)`;
    document.getElementById('clock-hour').style.transform = `rotate(${hoursDegrees}deg)`;
}

// Global Program Navigation Flow Controller Logic Layer Mapping Switchboard Routine
function openApp(appName) {
    currentHistory.push(appName.toLowerCase());
    
    document.getElementById('desktop').classList.add('hidden');
    const appWindow = document.getElementById('app-window');
    appWindow.classList.remove('hidden');
    
    document.getElementById('app-header').innerText = appName;
    renderAppWorkspaceViewHtml(appName);
}

function goBack() {
    if (currentHistory.length <= 1) return; // Top frame anchor reached
    
    currentHistory.pop();
    const prevLayerTarget = currentHistory[currentHistory.length - 1];
    
    if (prevLayerTarget === 'desktop') {
        document.getElementById('app-window').classList.add('hidden');
        document.getElementById('desktop').classList.remove('hidden');
    } else {
        const titleTokenStr = prevLayerTarget.charAt(0).toUpperCase() + prevLayerTarget.slice(1);
        document.getElementById('app-header').innerText = titleTokenStr;
        renderAppWorkspaceViewHtml(titleTokenStr);
    }
}

function goHome() {
    currentHistory = ['desktop'];
    document.getElementById('app-window').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
}

// Modular Application Layout Render Engine Factory Switches Data Map Routing Block
function renderAppWorkspaceViewHtml(appName) {
    const bodyContainer = document.getElementById('app-body');
    bodyContainer.innerHTML = ""; // Flush previous layout template viewport cleanly

    switch(appName) {
        case 'Settings':
            bodyContainer.innerHTML = `
                <div class="android-list-subheader">Wireless & networks</div>
                <div class="android-list-item">
                    <span>Wi-Fi Connection Status</span>
                    <input type="checkbox" ${wifiStatus ? 'checked' : ''} onchange="toggleWifiSettingValue(this.checked)">
                </div>
                <div class="android-list-subheader">Device Display Preferences</div>
                <div class="android-list-item" style="flex-direction: column; align-items: flex-start; gap: 6px;">
                    <span>Screen Backlight Lumens</span>
                    <input type="range" min="20" max="100" value="${systemBrightness}" style="width:100%;" oninput="changeScreenBrightnessFilter(this.value)">
                </div>
                <div class="android-list-subheader">System About Phone Info Metadata</div>
                <div class="android-list-item"><span>Firmware Model Version</span><span style="color:#666;">1.0 (Dream-G1)</span></div>
            `;
            break;

        case 'Files':
            let storageFiles = JSON.parse(localStorage.getItem('android_fs_data'));
            let itemRowsMarkup = storageFiles.map((file, index) => `
                <div class="android-list-item">
                    <span>📄 ${file}</span>
                    <span class="delete-btn" onclick="deleteLocalSystemFile(${index})">✕</span>
                </div>
            `).join('');

            bodyContainer.innerHTML = `
                <div class="fs-input-container">
                    <input type="text" id="fs-input-target" class="android-input" placeholder="New file name...">
                    <button class="android-btn" onclick="createNewLocalSystemFile()">Write</button>
                </div>
                <div class="android-list-subheader">Flash Storage Directory Root: /sdcard/</div>
                <div id="file-matrix-wrapper">${itemRowsMarkup || '<div style="padding:15px; color:#777; font-size:12px;">Empty shared directory storage profile.</div>'}</div>
            `;
            break;

        case 'Messages':
            bodyContainer.innerHTML = `
                <div class="android-list-item" onclick="alert('Thread conversation data streaming omitted.')">
                    <div><strong>+1 (555) 019-8824</strong><br><span style="color:#666; font-size:12px;">Are you coming to see the new mobile platform launch?</span></div>
                    <span style="color:#ff9200; font-size:11px;">9:12 PM</span>
                </div>
                <div class="android-list-item" onclick="alert('Thread conversation data streaming omitted.')">
                    <div><strong>Carrier Network Alerts</strong><br><span style="color:#666; font-size:12px;">Your data balance is looking good on this Billing Cycle.</span></div>
                    <span style="color:#777; font-size:11px;">Jan 14</span>
                </div>
            `;
            break;

        case 'Browser':
            bodyContainer.innerHTML = `
                <div class="fs-input-container">
                    <input type="text" class="android-input" value="http://www.google.com" disabled>
                    <button class="android-btn" disabled>Go</button>
                </div>
                <div style="padding:40px 15px; text-align:center; color:#666;">
                    <span style="font-size:36px;">🌐</span>
                    <h3>Web Page Loading Halted</h3>
                    <p style="font-size:12px;">Browser networking sub-modules blocked: Searching indices is currently restricted on this sandbox layer.</p>
                </div>
            `;
            break;
    }
}

// Live Program Operational State Application Routines Mapping Loops
function toggleWifiSettingValue(isChecked) {
    wifiStatus = isChecked;
    document.getElementById('wifi-indicator').innerText = wifiStatus ? '📶' : '❌';
}

function changeScreenBrightnessFilter(value) {
    systemBrightness = value;
    document.querySelector('.phone-frame').style.filter = `brightness(${value}%)`;
}

// Persistent LocalStorage Virtual Directory CRUD Execution Loop Engines
function createNewLocalSystemFile() {
    const textInputField = document.getElementById('fs-input-target');
    const targetValueStr = textInputField.value.trim();
    if (!targetValueStr) return;

    let storageArray = JSON.parse(localStorage.getItem('android_fs_data'));
    storageArray.push(targetValueStr);
    localStorage.setItem('android_fs_data', JSON.stringify(storageArray));
    
    renderAppWorkspaceViewHtml('Files');
}

function deleteLocalSystemFile(index) {
    let storageArray = JSON.parse(localStorage.getItem('android_fs_data'));
    storageArray.splice(index, 1);
    localStorage.setItem('android_fs_data', JSON.stringify(storageArray));
    
    renderAppWorkspaceViewHtml('Files');
}
