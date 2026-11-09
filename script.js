// Список задач хранится в браузере, поэтому переживает обновление страницы.
const STORAGE_KEY = 'quiet-todo-tasks';

const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const taskList = document.querySelector('#task-list');
const taskCount = document.querySelector('#task-count');
const emptyState = document.querySelector('#empty-state');
const remainingText = document.querySelector('#remaining-text');
const clearCompletedButton = document.querySelector('#clear-completed');
const filterButtons = document.querySelectorAll('.filter-button');

let tasks = loadTasks();
let currentFilter = 'all';
let newestTaskId = null;
let draggedTaskId = null;

function loadTasks() {
  // При первом посещении в хранилище ещё ничего нет.
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    return JSON.parse(savedTasks);
  } catch (error) {
    // Если данные повреждены, показываем пустой список вместо ошибки на странице.
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
  taskList.innerHTML = '';

  const visibleTasks = tasks.filter(function (task) {
    if (currentFilter === 'active') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true;
  });

  visibleTasks.forEach(function (task) {
    const item = document.createElement('li');
    item.className = 'task-item';
    if (task.completed) item.classList.add('completed');
    if (task.id === newestTaskId) item.classList.add('new-task');

    const toggleButton = document.createElement('button');
    toggleButton.className = 'task-toggle';
    toggleButton.type = 'button';
    toggleButton.setAttribute('aria-label', task.completed ? 'Отметить задачу невыполненной' : 'Отметить задачу выполненной');
    toggleButton.setAttribute('aria-pressed', String(task.completed));
    toggleButton.textContent = task.completed ? '✓' : '';
    toggleButton.addEventListener('click', function () {
      toggleTask(task.id);
    });

    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    // textContent безопасно показывает введённый текст как обычный текст.
    taskText.textContent = task.text;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', 'Удалить задачу: ' + task.text);
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', function () {
      deleteTask(task.id);
    });

    const dragHandle = document.createElement('button');
    dragHandle.className = 'drag-handle';
    dragHandle.type = 'button';
    dragHandle.draggable = true;
    dragHandle.setAttribute('aria-label', 'Переместить задачу');
    dragHandle.title = 'Перетащить, чтобы изменить порядок';
    dragHandle.innerHTML = '<span></span><span></span><span></span><span></span><span></span><span></span>';
    dragHandle.addEventListener('dragstart', function (event) {
      draggedTaskId = task.id;
      item.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(task.id));
    });
    dragHandle.addEventListener('dragend', function () {
      item.classList.remove('dragging');
      draggedTaskId = null;
    });

    item.addEventListener('dragover', function (event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    });
    item.addEventListener('drop', function (event) {
      event.preventDefault();
      const sourceId = draggedTaskId || Number(event.dataTransfer.getData('text/plain'));
      if (!sourceId || sourceId === task.id) return;

      const sourceIndex = tasks.findIndex(function (savedTask) { return savedTask.id === sourceId; });
      let targetIndex = tasks.findIndex(function (savedTask) { return savedTask.id === task.id; });
      const dropAfter = event.clientY > item.getBoundingClientRect().top + item.offsetHeight / 2;
      if (dropAfter) targetIndex += 1;
      const movedTask = tasks.splice(sourceIndex, 1)[0];
      if (sourceIndex < targetIndex) targetIndex -= 1;
      tasks.splice(targetIndex, 0, movedTask);
      saveTasks();
      renderTasks();
    });

    item.append(toggleButton, dragHandle, taskText, deleteButton);
    taskList.append(item);
  });

  newestTaskId = null;

  const activeCount = tasks.filter(function (task) {
    return !task.completed;
  }).length;

  taskCount.textContent = String(tasks.length);
  remainingText.textContent = activeCount === 0
    ? 'Нет активных задач'
    : 'Активных: ' + activeCount;
  emptyState.hidden = visibleTasks.length > 0;
  clearCompletedButton.hidden = !tasks.some(function (task) { return task.completed; });
}

function addTask(text) {
  const newTask = {
    id: Date.now(),
    text: text,
    completed: false
  };

  newestTaskId = newTask.id;
  tasks.push(newTask);
  saveTasks();
  renderTasks();
}

function toggleTask(taskId) {
  tasks = tasks.map(function (task) {
    if (task.id === taskId) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  saveTasks();
  renderTasks();
}

function deleteTask(taskId) {
  tasks = tasks.filter(function (task) {
    return task.id !== taskId;
  });

  saveTasks();
  renderTasks();
}

taskForm.addEventListener('submit', function (event) {
  event.preventDefault();
  const taskText = taskInput.value.trim();

  if (!taskText) return;

  const addButton = taskForm.querySelector('.add-button');
  addButton.classList.remove('is-adding');
  void addButton.offsetWidth;
  addButton.classList.add('is-adding');
  addButton.addEventListener('animationend', function () {
    addButton.classList.remove('is-adding');
  }, { once: true });
  addTask(taskText);
  taskInput.value = '';
  taskInput.focus();
});

filterButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    currentFilter = button.dataset.filter;

    filterButtons.forEach(function (filterButton) {
      const isActive = filterButton === button;
      filterButton.classList.toggle('active', isActive);
      filterButton.setAttribute('aria-pressed', String(isActive));
    });

    renderTasks();
  });
});

clearCompletedButton.addEventListener('click', function () {
  tasks = tasks.filter(function (task) {
    return !task.completed;
  });

  saveTasks();
  renderTasks();
});

renderTasks();
