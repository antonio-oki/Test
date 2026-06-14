const win = document.querySelector(".window");
const title = document.querySelector(".titlebar");

let dragging = false;
let offsetX = 0;
let offsetY = 0;

title.addEventListener("mousedown", e => {
    dragging = true;
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;
});

document.addEventListener("mousemove", e => {
    if (!dragging) return;

    win.style.left = e.clientX - offsetX + "px";
    win.style.top = e.clientY - offsetY + "px";
});

document.addEventListener("mouseup", () => {
    dragging = false;
});