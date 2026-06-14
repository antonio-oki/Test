// =====================
// MACINTOSH SYSTEM 1 WEB OS
// =====================

const cursor = document.getElementById("cursor");
const win = document.getElementById("writeWindow");
const titleBar = document.querySelector(".titlebar");
const icons = document.querySelectorAll(".icon");

let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;

let dragging = false;
let offsetX = 0;
let offsetY = 0;

let highestZ = 10;

// =====================
// CURSOR
// =====================

function updateCursor() {
    if (cursor) {
        cursor.style.left = cursorX + "px";
        cursor.style.top = cursorY + "px";
    }
}

updateCursor();

// Mouse movement
document.addEventListener("mousemove", (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
    updateCursor();
});

// Touch movement
document.addEventListener(
    "touchmove",
    (e) => {
        const touch = e.touches[0];

        cursorX = touch.clientX;
        cursorY = touch.clientY;

        updateCursor();

        if (dragging) {
            moveWindow(cursorX, cursorY);
        }
    },
    { passive: false }
);

// =====================
// WINDOW MANAGEMENT
// =====================

function focusWindow(windowElement) {
    highestZ++;
    windowElement.style.zIndex = highestZ;
}

if (win) {
    focusWindow(win);

    win.addEventListener("mousedown", () => {
        focusWindow(win);
    });

    win.addEventListener("touchstart", () => {
        focusWindow(win);
    });
}

// =====================
// DRAGGING
// =====================

function startDrag(x, y) {
    if (!win) return;

    focusWindow(win);

    dragging = true;

    offsetX = x - win.offsetLeft;
    offsetY = y - win.offsetTop;
}

function moveWindow(x, y) {
    if (!dragging || !win) return;

    win.style.left = (x - offsetX) + "px";
    win.style.top = (y - offsetY) + "px";
}

function stopDrag() {
    dragging = false;
}

// Mouse drag
if (titleBar) {
    titleBar.addEventListener("mousedown", (e) => {
        startDrag(e.clientX, e.clientY);
    });
}

document.addEventListener("mousemove", (e) => {
    moveWindow(e.clientX, e.clientY);
});

document.addEventListener("mouseup", stopDrag);

// Touch drag
if (titleBar) {
    titleBar.addEventListener(
        "touchstart",
        (e) => {
            const touch = e.touches[0];

            startDrag(
                touch.clientX,
                touch.clientY
            );
        },
        { passive: false }
    );
}

document.addEventListener("touchend", stopDrag);

// =====================
// DOUBLE CLICK ICONS
// =====================

icons.forEach((icon) => {

    let lastTap = 0;

    icon.addEventListener("dblclick", () => {
        openWriteWindow();
    });

    icon.addEventListener("touchstart", () => {

        const now = Date.now();

        if (now - lastTap < 400) {
            openWriteWindow();
        }

        lastTap = now;
    });

});

// =====================
// OPEN WINDOW
// =====================

function openWriteWindow() {

    if (!win) return;

    win.style.display = "block";

    focusWindow(win);
}

// =====================
// TOUCH CLICK EMULATION
// =====================

document.addEventListener(
    "touchstart",
    (e) => {

        const touch = e.touches[0];

        cursorX = touch.clientX;
        cursorY = touch.clientY;

        updateCursor();

        const target =
            document.elementFromPoint(
                cursorX,
                cursorY
            );

        if (
            target &&
            target.tagName === "BUTTON"
        ) {
            target.click();
        }
    },
    { passive: false }
);

// =====================
// WINDOW CENTERING
// =====================

window.addEventListener("load", () => {

    if (!win) return;

    win.style.left =
        (window.innerWidth - win.offsetWidth) / 2 + "px";

    win.style.top =
        (window.innerHeight - win.offsetHeight) / 2 + "px";

});

// =====================
// PREVENT SCROLLING
// =====================

document.addEventListener(
    "touchmove",
    (e) => {
        e.preventDefault();
    },
    { passive: false }
);

// =====================
// STARTUP
// =====================

console.log(
    "Macintosh System 1 WebOS started."
);
