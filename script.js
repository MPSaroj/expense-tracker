const STORAGE_KEY = 'expenseTrackerData';
const THEME_KEY = 'expenseTrackerTheme';

const transactionForm = document.getElementById('transactionForm');
const typeInput = document.getElementById('type');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const categorySelect = document.getElementById('category');
const customCategoryWrapper = document.getElementById('customCategoryWrapper');
const customCategoryInput = document.getElementById('customCategory');
const recurrenceSelect = document.getElementById('recurrence');
const saveButton = document.getElementById('saveButton');
const clearFormButton = document.getElementById('clearFormButton');
const transactionList = document.getElementById('transactionList');
const incomeTotal = document.getElementById('incomeTotal');
const expenseTotal = document.getElementById('expenseTotal');
const balanceTotal = document.getElementById('balanceTotal');
const transactionCount = document.getElementById('transactionCount');
const searchText = document.getElementById('searchText');
const filterType = document.getElementById('filterType');
const filterCategory = document.getElementById('filterCategory');
const fromDate = document.getElementById('fromDate');
const toDate = document.getElementById('toDate');
const resetFiltersButton = document.getElementById('resetFiltersButton');
const clearAllButton = document.getElementById('clearAllButton');
const themeToggle = document.getElementById('themeToggle');
const categoryChart = document.getElementById('categoryChart');
const trendChart = document.getElementById('trendChart');
const authScreen = document.getElementById('authScreen');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const switchAuthMode = document.getElementById('switchAuthMode');
const authNote = document.getElementById('authNote');
const confirmPasswordWrapper = document.getElementById('confirmPasswordWrapper');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const userPanel = document.getElementById('userPanel');
const greeting = document.getElementById('greeting');
const logoutButton = document.getElementById('logoutButton');
const quickIncomeButton = document.getElementById('quickIncomeButton');
const quickExpenseButton = document.getElementById('quickExpenseButton');
const exportCsvButton = document.getElementById('exportCsvButton');
const budgetTotal = document.getElementById('budgetTotal');
const budgetStatus = document.getElementById('budgetStatus');

let transactions = [];
let editingId = null;
let transactionFilter = {
  search: '',
  type: 'all',
  category: 'all',
  from: null,
  to: null,
};
let authMode = 'login';
let currentUser = null;
const USER_KEY = 'expenseTrackerUsers';
const BUDGET_KEY = 'expenseTrackerBudget';

function getStorageKey(username = currentUser) {
  return username ? `${STORAGE_KEY}-${username}` : STORAGE_KEY;
}

function getBudgetKey(username = currentUser) {
  return username ? `${BUDGET_KEY}-${username}` : BUDGET_KEY;
}

function getStoredUsers() {
  return JSON.parse(localStorage.getItem(USER_KEY) || '{}');
}

function getStoredUser(username) {
  const users = getStoredUsers();
  return users[username] || null;
}

function saveStoredUsers(users) {
  localStorage.setItem(USER_KEY, JSON.stringify(users));
}

function saveUser(user) {
  const users = getStoredUsers();
  users[user.username] = user;
  saveStoredUsers(users);
}

const initialCategories = [
  'Food', 'Transport', 'Shopping', 'Utilities', 'Rent', 'Salary', 'Entertainment', 'Health', 'Other',
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadFromStorage() {
  const raw = localStorage.getItem(getStorageKey());
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse local storage data.', error);
    return [];
  }
}

function saveToStorage() {
  if (!currentUser) return;
  localStorage.setItem(getStorageKey(), JSON.stringify(transactions));
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = '🌙';
  }
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  loadTheme();
}

function logout() {
  localStorage.removeItem('loggedInUser');
  currentUser = null;
  transactions = [];
  authScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
  authMode = 'login';
  updateAuthUI();
}

function updateAuthUI() {
  if (authMode === 'login') {
    authTitle.textContent = 'Welcome Back';
    authSubmit.textContent = 'Login';
    switchAuthMode.textContent = 'Create account';
    authNote.textContent = 'Don’t have an account? Register now.';
    confirmPasswordWrapper.classList.add('hidden');
  } else {
    authTitle.textContent = 'Create Your Account';
    authSubmit.textContent = 'Register';
    switchAuthMode.textContent = 'Already have an account?';
    authNote.textContent = 'Use a strong password to protect your data.';
    confirmPasswordWrapper.classList.remove('hidden');
  }
}

function applyRecurringTransactions() {
  const recurringItems = transactions.filter(t => t.recurrence !== 'none' && t.recurrenceAnchor);
  const generated = [];
  const now = new Date(getTodayDate());

  recurringItems.forEach(item => {
    let lastGenerated = item.lastGenerated ? new Date(item.lastGenerated) : new Date(item.recurrenceAnchor);
    const next = new Date(lastGenerated);
    const interval = item.recurrence;

    function addInterval(date) {
      if (interval === 'weekly') date.setDate(date.getDate() + 7);
      if (interval === 'monthly') date.setMonth(date.getMonth() + 1);
      if (interval === 'yearly') date.setFullYear(date.getFullYear() + 1);
    }

    addInterval(next);

    while (next <= now) {
      generated.push({
        id: generateId(),
        type: item.type,
        description: item.description,
        amount: item.amount,
        category: item.category,
        date: next.toISOString().slice(0, 10),
        recurrence: 'none',
        recurrenceAnchor: item.recurrenceAnchor,
        generatedFrom: item.id,
      });
      lastGenerated = new Date(next);
      addInterval(next);
    }

    if (lastGenerated > new Date(item.lastGenerated || item.recurrenceAnchor)) {
      item.lastGenerated = lastGenerated.toISOString().slice(0, 10);
    }
  });

  if (generated.length) {
    transactions = [...transactions, ...generated];
  }
}

function updateSummary() {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  incomeTotal.textContent = formatCurrency(income);
  expenseTotal.textContent = formatCurrency(expense);
  balanceTotal.textContent = formatCurrency(income - expense);
  transactionCount.textContent = transactions.length;
}

function applyFilters() {
  return transactions.filter(item => {
    if (transactionFilter.type !== 'all' && item.type !== transactionFilter.type) return false;
    if (transactionFilter.category !== 'all' && item.category !== transactionFilter.category) return false;
    if (transactionFilter.search) {
      const text = transactionFilter.search.toLowerCase();
      if (!item.description.toLowerCase().includes(text) && !item.category.toLowerCase().includes(text)) return false;
    }
    if (transactionFilter.from && new Date(item.date) < new Date(transactionFilter.from)) return false;
    if (transactionFilter.to && new Date(item.date) > new Date(transactionFilter.to)) return false;
    return true;
  });
}

function renderTransactions() {
  transactionList.innerHTML = '';
  const filtered = applyFilters().sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!filtered.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7" class="empty-state">No transactions found.</td>';
    transactionList.appendChild(row);
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${item.description}</td>
      <td>${item.category}</td>
      <td><span class="tag ${item.type}">${item.type}</span></td>
      <td>${formatCurrency(Number(item.amount))}</td>
      <td>${item.recurrence !== 'none' ? item.recurrence : '-'}</td>
      <td class="actions">
        <button type="button" onclick="editTransaction('${item.id}')">Edit</button>
        <button type="button" onclick="deleteTransaction('${item.id}')">Delete</button>
      </td>
    `;
    transactionList.appendChild(row);
  });
}

window.editTransaction = function (id) {
  const item = transactions.find(tx => tx.id === id);
  if (!item) return;

  editingId = id;
  typeInput.value = item.type;
  descriptionInput.value = item.description;
  amountInput.value = item.amount;
  dateInput.value = item.date;
  recurrenceSelect.value = item.recurrence || 'none';
  if (initialCategories.includes(item.category)) {
    categorySelect.value = item.category;
    customCategoryWrapper.classList.add('hidden');
    customCategoryInput.value = '';
  } else {
    categorySelect.value = 'custom';
    customCategoryWrapper.classList.remove('hidden');
    customCategoryInput.value = item.category;
  }

  saveButton.textContent = 'Update Transaction';
};

window.deleteTransaction = function (id) {
  if (!confirm('Remove this transaction permanently?')) return;
  transactions = transactions.filter(tx => tx.id !== id);
  saveToStorage();
  renderApp();
};

function clearForm() {
  transactionForm.reset();
  dateInput.value = getTodayDate();
  customCategoryWrapper.classList.add('hidden');
  customCategoryInput.value = '';
  editingId = null;
  saveButton.textContent = 'Save Transaction';
}

function buildCategoryValue() {
  if (categorySelect.value === 'custom') {
    return customCategoryInput.value.trim() || 'Other';
  }
  return categorySelect.value;
}

function submitTransaction(event) {
  event.preventDefault();
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;
  const category = buildCategoryValue();
  const recurrence = recurrenceSelect.value;

  if (!description || !amount || !date || !category) {
    alert('Please provide description, amount, date, and category.');
    return;
  }

  const transaction = {
    id: editingId || generateId(),
    type: typeInput.value,
    description,
    amount: amount.toFixed(2),
    category,
    date,
    recurrence,
    recurrenceAnchor: editingId ? transactions.find(tx => tx.id === editingId)?.recurrenceAnchor || date : date,
    lastGenerated: editingId ? transactions.find(tx => tx.id === editingId)?.lastGenerated : null,
    createdAt: new Date().toISOString(),
  };

  if (editingId) {
    transactions = transactions.map(tx => tx.id === editingId ? { ...tx, ...transaction } : tx);
  } else {
    transactions.push(transaction);
  }

  applyRecurringTransactions();
  saveToStorage();
  clearForm();
  renderApp();
}

function drawPie(canvas, data) {
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth * window.devicePixelRatio;
  const height = canvas.clientHeight * window.devicePixelRatio;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${16 * window.devicePixelRatio}px Inter`;
    ctx.textAlign = 'center';
    ctx.fillText('Add some transactions to see the chart', width / 2, height / 2);
    return;
  }

  let startAngle = -Math.PI / 2;
  const radius = Math.min(width, height) * 0.33;
  const centerX = width / 2;
  const centerY = height / 2;

  data.forEach((item, index) => {
    const sliceAngle = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  ctx.fillStyle = '#111827';
  if (document.body.classList.contains('dark')) ctx.fillStyle = '#e2e8f0';
  ctx.font = `${18 * window.devicePixelRatio}px Inter`;
  ctx.textAlign = 'center';
  ctx.fillText('Category Split', centerX, centerY + radius + 26);
}

function drawTrend(canvas, buckets) {
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth * window.devicePixelRatio;
  const height = canvas.clientHeight * window.devicePixelRatio;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const padding = 46 * window.devicePixelRatio;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const labels = buckets.map(b => b.month);
  const maxValue = Math.max(...buckets.flatMap(b => [b.income, b.expense]), 50);

  ctx.strokeStyle = document.body.classList.contains('dark') ? '#64748b' : '#cbd5e1';
  ctx.lineWidth = 1 * window.devicePixelRatio;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  buckets.forEach((bucket, index) => {
    const x = padding + (innerWidth / (buckets.length - 1 || 1)) * index;
    const incomeY = height - padding - (bucket.income / maxValue) * innerHeight;
    const expenseY = height - padding - (bucket.expense / maxValue) * innerHeight;

    ctx.beginPath();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4 * window.devicePixelRatio;
    ctx.moveTo(x, height - padding);
    ctx.lineTo(x, incomeY);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4 * window.devicePixelRatio;
    ctx.moveTo(x + 12 * window.devicePixelRatio, height - padding);
    ctx.lineTo(x + 12 * window.devicePixelRatio, expenseY);
    ctx.stroke();

    ctx.fillStyle = document.body.classList.contains('dark') ? '#e2e8f0' : '#111827';
    ctx.font = `${11 * window.devicePixelRatio}px Inter`;
    ctx.textAlign = 'center';
    ctx.fillText(bucket.month, x, height - padding + 20 * window.devicePixelRatio);
  });
}

function renderCharts() {
  const categoryMap = {};
  const monthlyMap = {};

  transactions.forEach(tx => {
    const categoryKey = tx.category;
    if (!categoryMap[categoryKey]) categoryMap[categoryKey] = 0;
    categoryMap[categoryKey] += Number(tx.amount);

    const month = new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
    monthlyMap[month][tx.type] += Number(tx.amount);
  });

  const categoryData = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([category, value], idx) => ({
      category,
      value,
      color: [`#4f46e5`, `#22c55e`, `#ef4444`, `#f59e0b`, `#8b5cf6`, `#0ea5e9`, `#ec4899`][idx % 7],
    }));

  const buckets = Object.entries(monthlyMap)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .slice(-6)
    .map(([month, totals]) => ({ month, income: totals.income, expense: totals.expense }));

  drawPie(categoryChart, categoryData);
  drawTrend(trendChart, buckets.length ? buckets : [{ month: 'No data', income: 0, expense: 0 }]);
}

function renderApp() {
  updateSummary();
  updateBudgetStatus();
  renderTransactions();
  renderCharts();
}

function resetFilters() {
  transactionFilter = { search: '', type: 'all', category: 'all', from: null, to: null };
  searchText.value = '';
  filterType.value = 'all';
  filterCategory.value = 'all';
  fromDate.value = '';
  toDate.value = '';
  renderApp();
}

function updateBudgetStatus() {
  const budget = Number(localStorage.getItem(getBudgetKey()) || 50000);
  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  budgetTotal.textContent = formatCurrency(budget);
  if (expense <= budget * 0.75) {
    budgetStatus.textContent = 'You are on track.';
  } else if (expense <= budget) {
    budgetStatus.textContent = 'Approaching your budget limit.';
  } else {
    budgetStatus.textContent = 'Budget exceeded — review spending.';
  }
}

function exportTransactionsCSV() {
  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Recurrence'];
  const rows = transactions.map(tx => [
    tx.date,
    tx.description,
    tx.category,
    tx.type,
    tx.amount,
    tx.recurrence,
  ]);
  const csvContent = [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'expense-tracker-transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function showQuickTransaction(type) {
  clearForm();
  typeInput.value = type;
  descriptionInput.focus();
}

categorySelect.addEventListener('change', () => {
  if (categorySelect.value === 'custom') {
    customCategoryWrapper.classList.remove('hidden');
  } else {
    customCategoryWrapper.classList.add('hidden');
    customCategoryInput.value = '';
  }
});

transactionForm.addEventListener('submit', submitTransaction);
clearFormButton.addEventListener('click', clearForm);
authForm.addEventListener('submit', handleAuthSubmit);
switchAuthMode.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  updateAuthUI();
});
logoutButton.addEventListener('click', logout);
quickIncomeButton.addEventListener('click', () => showQuickTransaction('income'));
quickExpenseButton.addEventListener('click', () => showQuickTransaction('expense'));
exportCsvButton.addEventListener('click', exportTransactionsCSV);
searchText.addEventListener('input', event => {
  transactionFilter.search = event.target.value;
  renderTransactions();
});
filterType.addEventListener('change', event => {
  transactionFilter.type = event.target.value;
  renderTransactions();
});
filterCategory.addEventListener('change', event => {
  transactionFilter.category = event.target.value;
  renderTransactions();
});
fromDate.addEventListener('change', event => {
  transactionFilter.from = event.target.value || null;
  renderTransactions();
});
toDate.addEventListener('change', event => {
  transactionFilter.to = event.target.value || null;
  renderTransactions();
});
resetFiltersButton.addEventListener('click', resetFilters);
clearAllButton.addEventListener('click', () => {
  if (!confirm('Delete all saved transactions? This cannot be undone.')) return;
  transactions = [];
  saveToStorage();
  renderApp();
});
themeToggle.addEventListener('click', () => {
  const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
  setTheme(nextTheme);
});

window.addEventListener('resize', () => {
  renderCharts();
});

function handleAuthSubmit(event) {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!username || !password) {
    alert('Please enter username and password.');
    return;
  }

  const storedUser = getStoredUser(username);

  if (authMode === 'login') {
    if (!storedUser || storedUser.password !== password) {
      alert('Invalid login credentials.');
      return;
    }
    localStorage.setItem('loggedInUser', username);
    startDashboard(username);
    return;
  }

  if (storedUser) {
    alert('Username already exists. Choose another one.');
    return;
  }

  if (password !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  saveUser({ username, password });
  localStorage.setItem('loggedInUser', username);
  startDashboard(username);
}

function startDashboard(username) {
  currentUser = username;
  authScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  userPanel.classList.remove('hidden');
  greeting.textContent = `Hello, ${username}`;
  dateInput.value = getTodayDate();
  transactions = loadFromStorage();
  applyRecurringTransactions();
  saveToStorage();
  loadTheme();
  updateAuthUI();
  renderApp();
}

function init() {
  const loggedInUser = localStorage.getItem('loggedInUser');
  const storedUser = loggedInUser ? getStoredUser(loggedInUser) : null;
  if (loggedInUser && storedUser) {
    startDashboard(loggedInUser);
  } else {
    localStorage.removeItem('loggedInUser');
    updateAuthUI();
  }
}

init();
