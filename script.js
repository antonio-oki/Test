const screen = document.getElementById("screen");
const cursor = document.getElementById("cursor");

const writeWindow = document.getElementById("writeWindow");
const calcWindow = document.getElementById("calcWindow");

const icons = document.querySelectorAll(".icon");
const trash = document.getElementById("trash");
const resolution = document.getElementById("resolutionSelect");

let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;

let draggingWin = null;
let offsetX = 0;
let offsetY = 0;

let zIndex = 10;

let lastTapTime = 0;

/* =========================
   CURSOR SYSTEM
========================= */

function updateCursor() {
    cursor.style.left = cursorX + "px";
    cursor.style.top = cursorY + "px";
}

updateCursor();

/* =========================
   POINTER INPUT (MOUSE + TOUCH UNIFIED)
========================= */

function getPoint(e) {
    if (e.touches && e.touches.length > 0) {
        return e.touches[0];
    }
    return e;
}

/* MOVE POINTER */
function movePointer(x, y) {
    cursorX = x;
    cursorY = y;
    updateCursor();

    if (draggingWin) {
        draggingWin.style.left = (cursorX - offsetX) + "px";
        draggingWin.style.top = (cursorY - offsetY) + "px";
    }
}

/* =========================
   GLOBAL MOVE EVENTS
========================= */

document.addEventListener("mousemove", (e) => {
    movePointer(e.clientX, e.clientY);
});

document.addEventListener("touchmove", (e) => {
    const p = getPoint(e);
    movePointer(p.clientX, p.clientY);
    e.preventDefault();
}, { passive: false });

/* =========================
   DRAG SYSTEM
========================= */

function focus(win) {
    zIndex++;
    win.style.zIndex = zIndex;
}

function startDrag(win, x, y) {
    draggingWin = win;

    focus(win);

    offsetX = x - win.offsetLeft;
    offsetY = y - win.offsetTop;
}

function stopDrag() {
    draggingWin = null;
}

/* =========================
   WINDOW DRAG (WRITE)
========================= */

writeWindow.querySelector(".titlebar")
.addEventListener("mousedown", (e) => {
    startDrag(writeWindow, e.clientX, e.clientY);
});

writeWindow.querySelector(".titlebar")
.addEventListener("touchstart", (e) => {
    const p = getPoint(e);
    startDrag(writeWindow, p.clientX, p.clientY);
});

/* =========================
   WINDOW DRAG (CALC)
========================= */

calcWindow.querySelector(".titlebar")
.addEventListener("mousedown", (e) => {
    startDrag(calcWindow, e.clientX, e.clientY);
});

calcWindow.querySelector(".titlebar")
.addEventListener("touchstart", (e) => {
    const p = getPoint(e);
    startDrag(calcWindow, p.clientX, p.clientY);
});

/* STOP DRAG */
document.addEventListener("mouseup", stopDrag);
document.addEventListener("touchend", stopDrag);

/* =========================
   ICON SYSTEM (TOUCH + MOUSE)
========================= */

icons.forEach(icon => {

    icon.addEventListener("mousedown", () => {
        handleOpen(icon);
    });

    icon.addEventListener("touchstart", (e) => {
        e.preventDefault();

        const now = Date.now();

        // double tap detection
        if (now - lastTapTime < 350) {
            handleOpen(icon);
        }

        lastTapTime = now;
    }, { passive: false });

});

function handleOpen(icon) {
    const app = icon.dataset.app;

    if (app === "write") openWindow(writeWindow);
    if (app === "calc") openWindow(calcWindow);
}

/* =========================
   OPEN WINDOW
========================= */

function openWindow(win) {
    win.style.display = "block";
    focus(win);
}

/* =========================
   TRASH
========================= */

trash.addEventListener("click", () => {
    writeWindow.style.display = "none";
    calcWindow.style.display = "none";
});

trash.addEventListener("touchstart", (e) => {
    e.preventDefault();
    writeWindow.style.display = "none";
    calcWindow.style.display = "none";
}, { passive: false });

/* =========================
   CALCULATOR
========================= */

document.getElementById("calcInput")
.addEventListener("input", (e) => {
    try {
        document.getElementById("calcOut").innerText =
            eval(e.target.value);
    } catch {
        document.getElementById("calcOut").innerText = "";
    }
});

/* =========================
   RESOLUTION SYSTEM
========================= */

resolution.addEventListener("change", () => {
    const v = resolution.value;

    if (v === "fullscreen") {
        screen.style.width = "100vw";
        screen.style.height = "100vh";
        return;
    }

    const [w, h] = v.split("x");

    screen.style.width = w + "px";
    screen.style.height = h + "px";
});

/* =========================
   TOUCH SCROLL LOCK (IMPORTANT)
========================= */

document.addEventListener("touchmove", (e) => {
    e.preventDefault();
}, { passive: false });

/* =========================
   STARTUP
========================= */

window.addEventListener("load", () => {
    console.log("Macintosh System 1 Touch OS Ready");

    writeWindow.style.left = "80px";
    writeWindow.style.top = "60px";

    calcWindow.style.left = "140px";
    calcWindow.style.top = "100px";
});
