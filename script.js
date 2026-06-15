function openApp(appName) {
    document.getElementById('desktop').classList.add('hidden');
    const appWindow = document.getElementById('app-window');
    appWindow.classList.remove('hidden');
    document.getElementById('app-title').innerText = appName;
}

function goHome() {
    document.getElementById('app-window').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
}

// Update clock
setInterval(() => {
    document.getElementById('time').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);
