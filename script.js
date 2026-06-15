const myFiles = ["Photos", "Music", "Documents", "Downloads"];

function openApp(appName) {
    document.getElementById('desktop').classList.add('hidden');
    const appWindow = document.getElementById('app-window');
    const appContent = document.getElementById('app-content');
    appWindow.classList.remove('hidden');
    
    if (appName === 'Files') {
        let fileList = myFiles.map(f => `<div class="file-item">📄 ${f}</div>`).join('');
        appContent.innerHTML = `<h2>Files</h2><div class="file-list">${fileList}</div><button onclick="goHome()">Back</button>`;
    } else {
        appContent.innerHTML = `<h2>${appName}</h2><p>This is the ${appName} app.</p><button onclick="goHome()">Back</button>`;
    }
}

function goHome() {
    document.getElementById('app-window').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
}

// Clock logic
setInterval(() => {
    document.getElementById('time').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);
