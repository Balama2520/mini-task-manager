/* ======== Data & Safe localStorage ======== */
const LS_KEY = "super_tasks_v1";
let tasks = [];
function loadTasks() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) { tasks = []; return; }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) tasks = parsed;
    else { localStorage.removeItem(LS_KEY); tasks = []; }
  } catch (e) {
    console.warn("localStorage corrupt — resetting tasks");
    localStorage.removeItem(LS_KEY);
    tasks = [];
  }
}
function saveTasks() { localStorage.setItem(LS_KEY, JSON.stringify(tasks)); }

/* ======== UI Elements ======== */
const el = {
  taskInput: document.getElementById("taskInput"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  taskList: document.getElementById("taskList"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  message: document.getElementById("message"),
  stats: document.getElementById("stats"),
  category: document.getElementById("taskCategory"),
  priority: document.getElementById("taskPriority"),
  due: document.getElementById("taskDue"),
  search: document.getElementById("searchInput"),
  sort: document.getElementById("sortSelect"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  quoteBtn: document.getElementById("quoteBtn"),
  voiceBtn: document.getElementById("voiceBtn"),
  toggleTheme: document.getElementById("toggleTheme"),
  datetime: document.getElementById("datetime"),
  progressBarInner: document.getElementById("progressBar")
};

/* ======== Utilities ======== */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function formatDateISO(d) { if (!d) return ""; const dt = new Date(d); return dt.toLocaleDateString("en-GB"); }

/* ======== Render & Logic ======== */
function renderTasks() {
  const q = el.search.value.trim().toLowerCase();
  let list = tasks.slice();

  // Filtering
  if (q) {
    list = list.filter(t =>
      t.text.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.priority && t.priority.toLowerCase().includes(q))
    );
  }

  // Sorting
  const sortVal = el.sort.value;
  if (sortVal === "newest") list.sort((a, b) => b.created - a.created);
  else if (sortVal === "oldest") list.sort((a, b) => a.created - b.created);
  else if (sortVal === "deadline") {
    list.sort((a, b) => {
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });
  } else if (sortVal === "completed") {
    list.sort((a, b) => (b.completed - a.completed) || (b.created - a.created));
  }

  el.taskList.innerHTML = "";
  list.forEach(t => {
    const li = document.createElement("li");
    li.className = "task-item" + (t.completed ? " completed" : "");
    const left = document.createElement("div");
    left.className = "task-left";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!t.completed;
    cb.addEventListener("change", () => toggleTask(t.id));
    const textSpan = document.createElement("span");
    textSpan.textContent = t.text + (t.due ? (" — Due: " + formatDateISO(t.due)) : "");
    left.appendChild(cb);
    left.appendChild(textSpan);

    const cat = document.createElement("span");
    cat.className = "category-tag " + (t.category || "personal");
    cat.textContent = t.category || "personal";
    left.appendChild(cat);

    const pr = document.createElement("span");
    pr.className = t.priority === "high" ? "priority-high" :
      t.priority === "medium" ? "priority-med" : "priority-low";
    pr.textContent = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
    left.appendChild(pr);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const editBtn = document.createElement("button");
    editBtn.innerHTML = "✏️";
    editBtn.title = "Edit";
    editBtn.onclick = () => editTask(t.id);
    const delBtn = document.createElement("button");
    delBtn.title = "Delete";
    delBtn.innerHTML = "❌";
    delBtn.onclick = () => deleteTask(t.id);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);
    el.taskList.appendChild(li);

    if (t.due && !t.completed) {
      const dueDate = new Date(t.due);
      const now = new Date();
      if (dueDate.setHours(0, 0, 0, 0) < now.setHours(0, 0, 0, 0)) {
        li.style.border = "1px solid rgba(255,80,80,0.8)";
      }
    }
  });
  updateProgress();
}

function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  el.progressBarInner.style.width = percent + "%";
  el.progressText.textContent = percent + "% Completed";
  el.stats.textContent = `Total: ${total} | Completed: ${completed} | Pending: ${pending}`;
  if (percent === 0) el.message.textContent = "Start adding tasks 🚀";
  else if (percent < 50) el.message.textContent = "Keep Going — small steps build momentum ✨";
  else if (percent < 100) el.message.textContent = "Great Progress — you're doing well 💪";
  else el.message.textContent = "All Tasks Completed — celebrate! 🎉";
}

/* ======== CRUD ======== */
function addTaskFromUI() {
  const text = el.taskInput.value.trim();
  if (!text) return;
  const newTask = {
    id: uid(),
    text,
    category: el.category.value || "personal",
    priority: el.priority.value || "low",
    due: el.due.value || null,
    completed: false,
    created: Date.now()
  };
  tasks.push(newTask);
  saveTasks();
  renderTasks();
  el.taskInput.value = "";
  el.due.value = "";
}

function toggleTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveTasks(); renderTasks();
}

function editTask(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const newText = prompt("Edit task text:", t.text);
  if (newText === null) return;
  t.text = newText.trim() || t.text;
  const newCat = prompt("Category (work/study/personal):", t.category) || t.category;
  t.category = ["work", "study", "personal"].includes(newCat.toLowerCase()) ? newCat.toLowerCase() : t.category;
  const newPr = prompt("Priority (low/medium/high):", t.priority) || t.priority;
  t.priority = ["low", "medium", "high"].includes(newPr.toLowerCase()) ? newPr.toLowerCase() : t.priority;
  const newDue = prompt("Due date (YYYY-MM-DD) or empty:", t.due || "");
  if (newDue) t.due = newDue; else t.due = null;
  saveTasks(); renderTasks();
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  tasks = tasks.filter(x => x.id !== id);
  saveTasks(); renderTasks();
}

/* ======== Events ======== */
el.addTaskBtn.addEventListener("click", addTaskFromUI);
el.taskInput.addEventListener("keydown", e => { if (e.key === "Enter") addTaskFromUI(); });
el.search.addEventListener("input", () => renderTasks());
el.sort.addEventListener("change", () => renderTasks());
el.clearAllBtn.addEventListener("click", () => {
  if (!confirm("Clear all tasks? This cannot be undone.")) return;
  tasks = []; saveTasks(); renderTasks();
});

/* ======== Export / Import ======== */
el.exportBtn.addEventListener("click", () => {
  const dataStr = JSON.stringify(tasks, null, 2);
  const blob = new Blob([dataStr], { type: "
