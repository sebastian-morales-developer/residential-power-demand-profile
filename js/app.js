(() => {
  const STORAGE_KEY = 'state-demand-theme';
  const appData = window.APP_DATA || { states: {} };
  const stateSelect = document.getElementById('stateSelect');
  const monthSelect = document.getElementById('monthSelect');
  const messageBox = document.getElementById('messageBox');
  const chartCard = document.getElementById('chartCard');
  const summaryRow = document.getElementById('summaryRow');
  const summaryState = document.getElementById('summaryState');
  const summaryMonth = document.getElementById('summaryMonth');
  const summaryPoints = document.getElementById('summaryPoints');
  const themeToggle = document.getElementById('themeToggle');
  const themeToggleLabel = document.getElementById('themeToggleLabel');
  const themeToggleIcon = document.getElementById('themeToggleIcon');
  const stateEntries = Object.entries(appData.states || {});

  let chartInstance = null;

  const preferredStateOrder = ['TX'];

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function updateThemeButton(theme) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    themeToggleLabel.textContent = nextTheme === 'dark' ? 'Dark mode' : 'Light mode';
    themeToggleIcon.textContent = nextTheme === 'dark' ? '🌙' : '☀️';
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    updateThemeButton(theme);

    if (chartInstance) {
      updateChartTheme();
    }
  }

  function getInitialTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function toggleTheme() {
    const nextTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  function getSortedStates() {
    return stateEntries
      .map(([code, info]) => ({ code, info }))
      .sort((a, b) => {
        const aPriority = preferredStateOrder.indexOf(a.code);
        const bPriority = preferredStateOrder.indexOf(b.code);
        if (aPriority !== -1 || bPriority !== -1) {
          return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
        }
        return a.code.localeCompare(b.code);
      });
  }

  function showMessage(text, type = 'warning') {
    messageBox.className = `alert alert-${type}`;
    messageBox.textContent = text;
    messageBox.classList.remove('d-none');
  }

  function hideMessage() {
    messageBox.classList.add('d-none');
    messageBox.textContent = '';
  }

  function clearChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    chartCard.classList.add('d-none');
    summaryRow.classList.add('d-none');
  }

  function getStateInfo(stateCode) {
    return appData.states?.[stateCode] || { months: {} };
  }

  function getAvailableMonths(stateCode) {
    const months = Object.values(getStateInfo(stateCode).months || {});
    return months.sort((a, b) => a.monthNumber - b.monthNumber);
  }

  function populateStates() {
    const states = getSortedStates();
    stateSelect.innerHTML = states
      .map(({ code }) => `<option value="${code}">${code}</option>`)
      .join('');

    if (states.some((item) => item.code === 'TX')) {
      stateSelect.value = 'TX';
    } else if (states.length > 0) {
      stateSelect.value = states[0].code;
    }
  }

  function populateMonths(stateCode) {
    const months = getAvailableMonths(stateCode);

    if (months.length === 0) {
      monthSelect.innerHTML = '<option value="">No months available</option>';
      monthSelect.disabled = true;
      clearChart();
      showMessage(`The state ${stateCode} does not contain CSV data yet.`, 'danger');
      return;
    }

    hideMessage();
    monthSelect.disabled = false;
    monthSelect.innerHTML = months
      .map((month) => `<option value="${month.monthNumber}">${month.monthName}</option>`)
      .join('');

    monthSelect.value = String(months[0].monthNumber);
  }

  function buildChartOptions() {
    const textColor = getCssVar('--text-main');
    const gridColor = getCssVar('--chart-grid');
    const lineColor = getCssVar('--chart-line');

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: textColor
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed.y;
              return ` Average kW: ${Number(value).toFixed(3)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Timestamp',
            color: textColor
          },
          ticks: {
            maxTicksLimit: 12,
            color: textColor
          },
          grid: {
            color: gridColor
          },
          border: {
            color: gridColor
          }
        },
        y: {
          title: {
            display: true,
            text: 'Average kW',
            color: textColor
          },
          ticks: {
            color: textColor
          },
          beginAtZero: false,
          grid: {
            color: gridColor
          },
          border: {
            color: gridColor
          }
        }
      },
      elements: {
        line: {
          borderColor: lineColor
        },
        point: {
          backgroundColor: lineColor,
          borderColor: lineColor
        }
      }
    };
  }

  function updateChartTheme() {
    if (!chartInstance) return;

    const options = buildChartOptions();
    chartInstance.options = options;
    chartInstance.data.datasets[0].borderColor = getCssVar('--chart-line');
    chartInstance.data.datasets[0].backgroundColor = getCssVar('--chart-line');
    chartInstance.update();
  }

  function renderChart(stateCode, monthNumber) {
    const monthData = getStateInfo(stateCode).months?.[String(monthNumber)];
    if (!monthData) {
      clearChart();
      showMessage('No data is available for the selected month.', 'danger');
      return;
    }

    hideMessage();
    summaryState.textContent = stateCode;
    summaryMonth.textContent = monthData.monthName;
    summaryPoints.textContent = `${monthData.timestamps.length} intervals`;
    summaryRow.classList.remove('d-none');
    chartCard.classList.remove('d-none');

    const ctx = document.getElementById('demandChart');
    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthData.timestamps,
        datasets: [{
          label: 'Average kW',
          data: monthData.averageKw,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          borderColor: getCssVar('--chart-line'),
          backgroundColor: getCssVar('--chart-line')
        }]
      },
      options: buildChartOptions()
    });
  }

  function handleStateChange() {
    const stateCode = stateSelect.value;
    populateMonths(stateCode);
    if (!monthSelect.disabled && monthSelect.value) {
      renderChart(stateCode, monthSelect.value);
    }
  }

  function handleMonthChange() {
    const stateCode = stateSelect.value;
    const monthNumber = monthSelect.value;
    if (stateCode && monthNumber) {
      renderChart(stateCode, monthNumber);
    }
  }

  function init() {
    applyTheme(getInitialTheme());

    if (stateEntries.length === 0) {
      showMessage('No state folders were found in states_demmand_profile.', 'danger');
      stateSelect.disabled = true;
      monthSelect.disabled = true;
      return;
    }

    populateStates();
    handleStateChange();
    themeToggle.addEventListener('click', toggleTheme);
    stateSelect.addEventListener('change', handleStateChange);
    monthSelect.addEventListener('change', handleMonthChange);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
