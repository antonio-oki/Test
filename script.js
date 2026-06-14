const cursor = document.getElementById("cursor");
const screen = document.getElementById("screen");
const resolutionSelect =
document.getElementById("resolutionSelect");

const writeWindow =
document.getElementById("writeWindow");

const titleBar =
document.querySelector(".titlebar");

const icons =
document.querySelectorAll(".icon");

let highestZ = 10;

let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;

let dragging = false;

let offsetX = 0;
let offsetY = 0;

function updateCursor() {

    cursor.style.left =
        cursorX + "px";

    cursor.style.top =
        cursorY + "px";
}

updateCursor();

document.addEventListener(
    "mousemove",
    (e) => {

        cursorX = e.clientX;
        cursorY = e.clientY;

        updateCursor();

        if (dragging) {

            writeWindow.style.left =
                (cursorX - offsetX) + "px";

            writeWindow.style.top =
                (cursorY - offsetY) + "px";
        }
    }
);

document.addEventListener(
    "touchmove",
    (e) => {

        const touch =
            e.touches[0];

        cursorX =
            touch.clientX;

        cursorY =
            touch.clientY;

        updateCursor();

        if (dragging) {

            writeWindow.style.left =
                (cursorX - offsetX) + "px";

            writeWindow.style.top =
                (cursorY - offsetY) + "px";
        }

        e.preventDefault();
    },
    { passive:false }
);

function focusWindow(win) {

    highestZ++;

    win.style.zIndex =
        highestZ;
}

titleBar.addEventListener(
    "mousedown",
    (e) => {

        dragging = true;

        focusWindow(writeWindow);

        offsetX =
            e.clientX -
            writeWindow.offsetLeft;

        offsetY =
            e.clientY -
            writeWindow.offsetTop;
    }
);

titleBar.addEventListener(
    "touchstart",
    (e) => {

        const touch =
            e.touches[0];

        dragging = true;

        focusWindow(writeWindow);

        offsetX =
            touch.clientX -
            writeWindow.offsetLeft;

        offsetY =
            touch.clientY -
            writeWindow.offsetTop;
    }
);

document.addEventListener(
    "mouseup",
    () => {

        dragging = false;
    }
);

document.addEventListener(
    "touchend",
    () => {

        dragging = false;
    }
);

function openWriteWindow() {

    writeWindow.style.display =
        "block";

    focusWindow(writeWindow);
}

icons.forEach((icon) => {

    let lastTap = 0;

    icon.addEventListener(
        "dblclick",
        openWriteWindow
    );

    icon.addEventListener(
        "touchstart",
        () => {

            const now =
                Date.now();

            if (
                now - lastTap <
                400
            ) {
                openWriteWindow();
            }

            lastTap = now;
        }
    );
});

resolutionSelect.addEventListener(
    "change",
    () => {

        const value =
            resolutionSelect.value;

        if (
            value ===
            "fullscreen"
        ) {

            screen.style.width =
                "100vw";

            screen.style.height =
                "100vh";

            return;
        }

        const parts =
            value.split("x");

        screen.style.width =
            parts[0] + "px";

        screen.style.height =
            parts[1] + "px";
    }
);

window.addEventListener(
    "load",
    () => {

        writeWindow.style.left =
            "100px";

        writeWindow.style.top =
            "60px";

        console.log(
            "Welcome to Macintosh"
        );
    }
);
