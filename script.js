const boot = document.getElementById("boot");
const system = document.getElementById("system");

const cursor = document.getElementById("cursor");
const screen = document.getElementById("screen");

const writeWindow = document.getElementById("writeWindow");
const calcWindow = document.getElementById("calcWindow");

const icons = document.querySelectorAll(".icon");
const trash = document.getElementById("trash");
const resolution = document.getElementById("resolutionSelect");

let x = 100;
let y = 100;

let dragging = null;
let offsetX = 0;
let offsetY = 0;

let z = 10;

/* ================= BOOT SEQUENCE ================= */

window.addEventListener("load", () => {

    setTimeout(() => {
        document.getElementById("bootText").innerText =
            "Welcome to Macintosh";
    }, 1200);

    setTimeout(() => {
        boot.style.opacity = "0";
        boot.style.transition = "1s";

        system.style.opacity = "1";
    }, 2500);

    setTimeout(() => {
        boot.style.display = "none";
    }, 3500);
});

/* ================= CURSOR ================= */

function drawCursor() {
    cursor.style.left = x + "px";
    cursor.style.top = y + "px";
}

document.addEventListener("mousemove", (e) => {
    x = e.clientX;
    y = e.clientY;
    drawCursor();

    if (dragging) move();
});

document.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    x = t.clientX;
    y = t.clientY;
    drawCursor();

    if (dragging) move();

    e.preventDefault();
}, { passive: false });

/* ================= WINDOW SYSTEM ================= */

function focus(win) {
    z++;
    win.style.zIndex = z;
}

function open(win) {
    win.style.display = "block";
    focus(win);
}

/* ================= DRAG ================= */

function start(win, px, py) {
    dragging = win;
    focus(win);

    offsetX = px - win.offsetLeft;
    offsetY = py - win.offsetTop;
}

function move() {
    if (!dragging) return;

    dragging.style.left = (x - offsetX) + "px";
    dragging.style.top = (y - offsetY) + "px";
}

function stop() {
    dragging = null;
}

/* WRITE WINDOW */
writeWindow.querySelector(".titlebar")
.addEventListener("mousedown", (e) => {
    start(writeWindow, e.clientX, e.clientY);
});

writeWindow.querySelector(".titlebar")
.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    start(writeWindow, t.clientX, t.clientY);
});

/* CALC WINDOW */
calcWindow.querySelector(".titlebar")
.addEventListener("mousedown", (e) => {
    start(calcWindow, e.clientX, e.clientY);
});

document.addEventListener("mouseup", stop);
document.addEventListener("touchend", stop);

/* ICONS */
icons.forEach(icon => {
    icon.addEventListener("dblclick", () => {
        if (icon.dataset.app === "write") open(writeWindow);
        if (icon.dataset.app === "calc") open(calcWindow);
    });
});

/* TRASH */
trash.addEventListener("click", () => {
    writeWindow.style.display = "none";
    calcWindow.style.display = "none";
});

/* CALC */
document.getElementById("calcInput")
.addEventListener("input", e => {
    try {
        document.getElementById("calcOut").innerText =
            eval(e.target.value);
    } catch {
        document.getElementById("calcOut").innerText = "";
    }
});

/* RESOLUTION */
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
