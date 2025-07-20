const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const colorCircle = document.getElementById("colorCircle");
const brushSizeSlider = document.getElementById("brushSize");
const eraserButton = document.getElementById("eraser");
const clearButton = document.getElementById("clear");
const saveButton = document.getElementById("save");
const replayButton = document.getElementById("replay");
const pauseReplayBtn = document.getElementById("pauseReplay");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const replaySpeed = document.getElementById("replaySpeed");

let currentColor = colorPicker.value;
let brushSize = brushSizeSlider.value;
let isEraser = false;
let drawing = false;
let isReplaying = false;
let isPaused = false;

let strokeHistory = [];
let redoStack = [];
let currentStroke = [];
let replayContext = {
  strokeIndex: 0,
  pointIndex: 0
};
let replayTimeouts = [];

// --- Helper Functions ---
function clearReplayTimeouts() {
  replayTimeouts.forEach(clearTimeout);
  replayTimeouts = [];
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokeHistory.forEach(stroke => {
    if (stroke.image) {
      ctx.drawImage(stroke.image, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.beginPath();
      for (let i = 0; i < stroke.length; i++) {
        const point = stroke[i];
        ctx.lineWidth = point.size;
        ctx.lineCap = "round";
        ctx.strokeStyle = point.color;
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
      }
      ctx.beginPath();
    }
  });
}

// --- Drawing Events ---
canvas.addEventListener("mousedown", (e) => {
  if (isReplaying) return;
  drawing = true;
  currentStroke = [];

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const point = {
    x,
    y,
    color: isEraser ? "#FFFFFF" : currentColor,
    size: brushSize,
    time: Date.now()
  };
  currentStroke.push(point);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = point.color;
  ctx.lineTo(x + 0.1, y + 0.1);
  ctx.stroke();
});

canvas.addEventListener("mouseup", () => {
  if (!isReplaying && currentStroke.length > 0) {
    strokeHistory.push(currentStroke);
    redoStack = [];
  }
  drawing = false;
  ctx.beginPath();
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing || isReplaying) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const point = {
    x,
    y,
    color: isEraser ? "#FFFFFF" : currentColor,
    size: brushSize,
    time: Date.now()
  };
  currentStroke.push(point);

  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";
  ctx.strokeStyle = point.color;
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
});

// --- Color Picker & Brush ---
colorPicker.addEventListener("input", (e) => {
  currentColor = e.target.value;
  colorCircle.style.backgroundColor = currentColor;
  isEraser = false;
  eraserButton.classList.remove("active");
});

colorCircle.style.backgroundColor = currentColor; // Initial preview
colorCircle.addEventListener("click", () => colorPicker.click());

brushSizeSlider.addEventListener("input", (e) => {
  brushSize = e.target.value;
});

eraserButton.addEventListener("click", () => {
  isEraser = !isEraser;
  eraserButton.classList.toggle("active");
});

// --- Utility Buttons ---
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokeHistory = [];
  redoStack = [];
});

saveButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "drawing.png";
  link.click();
});

undoBtn.addEventListener("click", () => {
  if (strokeHistory.length === 0 || isReplaying) return;
  redoStack.push(strokeHistory.pop());
  redrawCanvas();
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0 || isReplaying) return;
  strokeHistory.push(redoStack.pop());
  redrawCanvas();
});

// --- Replay Feature ---
function replayAll() {
  if (replayContext.strokeIndex >= strokeHistory.length) {
    isReplaying = false;
    return;
  }

  const stroke = strokeHistory[replayContext.strokeIndex];
  if (stroke.image) {
    ctx.drawImage(stroke.image, 0, 0, canvas.width, canvas.height);
    replayContext.strokeIndex++;
    replayAll();
    return;
  }

  ctx.beginPath();
  let i = replayContext.pointIndex;

  function step() {
    if (isPaused || i >= stroke.length) {
      replayContext.pointIndex = i;
      if (!isPaused) {
        replayContext.strokeIndex++;
        replayContext.pointIndex = 0;
        replayAll();
      }
      return;
    }

    const point = stroke[i];
    ctx.lineWidth = point.size;
    ctx.lineCap = "round";
    ctx.strokeStyle = point.color;
    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    i++;
    replayContext.pointIndex = i;
    const timeoutId = setTimeout(step, 21 - parseInt(replaySpeed.value));
    replayTimeouts.push(timeoutId);
  }

  step();
}

replayButton.addEventListener("click", () => {
  if (strokeHistory.length === 0 || isReplaying) return;

  isReplaying = true;
  isPaused = false;
  replayContext = { strokeIndex: 0, pointIndex: 0 };
  clearReplayTimeouts();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  replayAll();
});

pauseReplayBtn.addEventListener("click", () => {
  if (!isReplaying) return;
  isPaused = !isPaused;
  pauseReplayBtn.textContent = isPaused ? "▶️ Resume Replay" : "⏸️ Pause Replay";
  if (!isPaused) replayAll();
});
