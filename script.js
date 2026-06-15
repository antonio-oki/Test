const boot = document.getElementById("boot");
const icons = document.querySelectorAll(".icon");

const writeWin = document.getElementById("writeWin");
const calcWin = document.getElementById("calcWin");

const trash = document.getElementById("trash");

let z = 10;
let dragging = null;
let offsetX = 0;
let offsetY = 0;

/* BOOT */
setTimeout(() => {
    boot.style.display = "none";
}, 1500);

/* OPEN WINDOWS */
icons.forEach(icon => {
    icon.addEventListener("dblclick", () => {
        openApp(icon.dataset.app);
    });
});

function openApp(app) {
    if (app === "write") writeWin.style.display = "block";
    if (app === "calc") calcWin.style.display = "block";
}

/* DRAG */
document.querySelectorAll(".title").forEach(title => {
    title.addEventListener("mousedown", e => {
        dragging = title.parentElement;
        offsetX = e.clientX - dragging.offsetLeft;
        offsetY = e.clientY - dragging.offsetTop;
        dragging.style.zIndex = ++z;
    });
});

document.addEventListener("mousemove", e => {
    if (!dragging) return;
    dragging.style.left = (e.clientX - offsetX) + "px";
    dragging.style.top = (e.clientY - offsetY) + "px";
});

document.addEventListener("mouseup", () => dragging = null);

/* CALC */
document.getElementById("calcInput").oninput = (e) => {
    try {
        document.getElementById("calcOut").innerText =
            eval(e.target.value);
    } catch {
        document.getElementById("calcOut").innerText = "";
    }
};

/* TRASH */
trash.onclick = () => {
    writeWin.style.display = "none";
    calcWin.style.display = "none";
};

/* MENUS */
document.querySelectorAll(".menuItem").forEach(item => {
    item.onclick = () => {
        alert("Menu system placeholder (next upgrade)");
    };
});
