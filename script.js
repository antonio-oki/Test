function openApp(appName) {
    document.getElementById('desktop').classList.add('hidden');
    const appWindow = document.getElementById('app-window');
    const appContent = document.getElementById('app-content');
    appWindow.classList.remove('hidden');

    if (appName === 'Browser') {
        appContent.innerHTML = `<h2>Browser</h2><p>Offline Mode</p><p>Search is currently disabled.</p><button onclick="goHome()">Back</button>`;
    } else if (appName === 'Settings') {
        appContent.innerHTML = `<h2>Settings</h2><p>Wi-Fi: Connected</p><p>Brightness: 50%</p><button onclick="goHome()">Back</button>`;
    } else if (appName === 'Messages') {
        appContent.innerHTML = `<h2>Messages</h2><div class="file-item">John: Hey!</div><div class="file-item">System: Update Available</div><button onclick="goHome()">Back</button>`;
    } else if (appName === 'Files') {
        const files = ["Photos", "Music", "Documents"];
        let fileList = files.map(f => `<div class="file-item">📄 ${f}</div>`).join('');
        appContent.innerHTML = `<h2>Files</h2>${fileList}<button onclick="goHome()">Back</button>`;
    }
}

function goHome() {
    document.getElementById('app-window').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
}

setInterval(() => {
    document.getElementById('time').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);