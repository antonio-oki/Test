const screen = document.getElementById("screen");
const cursor = document.getElementById("cursor");

const writeWindow = document.getElementById("writeWindow");
const calcWindow = document.getElementById("calcWindow");

const icons = document.querySelectorAll(".icon");
const trash = document.getElementById("trash");
const resolution = document.getElementById("resolutionSelect");

let cursorX = 100;
let cursorY = 100;

let dragging = null;
let offsetX = 0;
let offsetY = 0;

let z = 10;

/* CURSOR */
function drawCursor() {
    cursor.style.left = cursorX + "px";
    cursor.style.top = cursorY + "px";
}

drawCursor();

/* MOVE CURSOR */
document.addEventListener("mousemove", (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
    drawCursor();

    if (dragging) moveWindow();
});

document.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    cursorX = t.clientX;
    cursorY = t.clientY;
    drawCursor();

    if (dragging) moveWindow();
    e.preventDefault();
}, { passive: false });

/* WINDOW SYSTEM */
function focus(win) {
    z++;
    win.style.zIndex = z;
}

function open(win) {
    win.style.display = "block";
    focus(win);
}

/* DRAGGING */
function startDrag(win, x, y) {
    dragging = win;
    focus(win);

    offsetX = x - win.offsetLeft;
    offsetY = y - win.offsetTop;
}

function moveWindow() {
    if (!dragging) return;

    dragging.style.left = (cursorX - offsetX) + "px";
    dragging.style.top = (cursorY - offsetY) + "px";
}

function stopDrag() {
    dragging = null;
}

/* WRITE WINDOW */
writeWindow.querySelector(".titlebar")
.addEventListener("mousedown", (e) => {
    startDrag(writeWindow, e.clientX, e.clientY);
});

writeWindow.querySelector(".titlebar")
.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startDrag(writeWindow, t.clientX, t.clientY);
});

/* CALC WINDOW */
calcWindow.querySelector(".titlebar")
.addEventListener("mousedown", (e) => {
    startDrag(calcWindow, e.clientX, e.clientY);
});

/* STOP DRAG */
document.addEventListener("mouseup", stopDrag);
document.addEventListener("touchend", stopDrag);

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

/* CALCULATOR */
document.getElementById("calcInput")
.addEventListener("input", (e) => {
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

/* STARTUP */
window.onload = () => {
    console.log("Macintosh System 1 Loaded");

    writeWindow.style.left = "80px";
    writeWindow.style.top = "60px";

    calcWindow.style.left = "120px";
    calcWindow.style.top = "100px";
};
