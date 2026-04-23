const APP_CONFIG = {
  ticker1: 'QQQM',
  ticker2: 'QCLN',
  ticker2Alt: 'CNRG',
  startDate: '2026-02-24',
  cnrgDate: '2026-02-26',
  initialInvestment: 4971.29,
  weightQQQM: 0.60,
  weightQCLN: 0.40,
  initialSharePriceQQQM: 253.16,
  initialSharePriceQCLN: 51.92,
};

const RANGE_MAP = {
  '5D': { days: 5 },
  '15D': { days: 15 },
  '1M': { months: 1 },
  '3M': { months: 3 },
  '6M': { months: 6 },
  '1Y': { years: 1 },
  '5Y': { years: 5 },
  '10Y': { years: 10 },
  '20Y': { years: 20 },
};

const OPTION_LABELS = {
  'SPY': 'S&P500 ETF (SPY)',
  'QQQM': 'NASDAQ100 ETF (QQQM)',
  'ONEQ': 'NASDAQ-Composite ETF (ONEQ)',
  'DIA': 'Dow Jones ETF (DIA)',
  'QCLN': 'NASDAQ Clean Energy ETF (QCLN)',
  'CNRG': 'S&P Kensho Clean Power ETF (CNRG)',
  'AAPL': 'Apple Inc (AAPL)',
  'NVDA': 'NIVIDIA Corp (NVDA)',
  'XOM': 'Exon Mobile Corp (XOM)',
  'SHEL': 'Shell PLC (SHEL)',
  'WMT': 'Walmart Inc (WMT)',
  'AMZN': 'Amazon.com Inc (AMZN)',
  'GC=F': 'Gold Futures (GC=F)',
  'CL=F': 'Oil Futures (CL=F)',
  'EURUSD=X': 'Euro € (EURUSD=X)',
  'CNYUSD=X': 'Yuan ¥ (CNYUSD=X)'
};

const COMPARE_TICKERS = [
  '', 'SPY', 'ONEQ', 'DIA', 'QCLN', 'CNRG', 'AAPL', 'NVDA', 'XOM', 'SHEL',
  'WMT', 'AMZN', 'GC=F', 'CL=F', 'EURUSD=X', 'CNYUSD=X'
];

let staticData = null;
let currentRangeLabel = '5D';
let compareTicker = '';
let showAlt = true;
let chart = null;
let latestPayload = null;

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value) {
  return `${Number(value).toFixed(2)}%`;
}

function formatMaybeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(2);
  return value;
}

function parseDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function toDateString(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftedDate(endDateStr, rangeSpec) {
  const d = parseDateOnly(endDateStr);
  const out = new Date(d.getTime());
  if (rangeSpec.days) out.setDate(out.getDate() - rangeSpec.days);
  if (rangeSpec.months) out.setMonth(out.getMonth() - rangeSpec.months);
  if (rangeSpec.years) out.setFullYear(out.getFullYear() - rangeSpec.years);
  return toDateString(out);
}

function seriesForTicker(ticker) {
  if (!staticData || !staticData.prices || !staticData.prices[ticker]) return [];
  return staticData.prices[ticker].slice().sort((a, b) => a.date.localeCompare(b.date));
}

function latestDateAcrossBaseTickers() {
  const qqqm = seriesForTicker(APP_CONFIG.ticker1);
  const qcln = seriesForTicker(APP_CONFIG.ticker2);
  const cnrg = seriesForTicker(APP_CONFIG.ticker2Alt);
  const dates = [qqqm, qcln, cnrg]
    .filter(arr => arr.length > 0)
    .map(arr => arr[arr.length - 1].date)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function filterByRange(series, rangeLabel, endDateStr) {
  if (!series.length || !endDateStr) return [];
  const startDate = shiftedDate(endDateStr, RANGE_MAP[rangeLabel] || RANGE_MAP['5D']);
  return series.filter(row => row.date >= startDate && row.date <= endDateStr);
}

function buildDateMap(series) {
  return new Map(series.map(row => [row.date, Number(row.close)]));
}

function closeOnOrNear(series, targetDateStr) {
  if (!series.length) throw new Error('No data available.');
  const exact = series.find(row => row.date === targetDateStr);
  if (exact) return Number(exact.close);

  const earlier = series.filter(row => row.date <= targetDateStr);
  if (earlier.length) return Number(earlier[earlier.length - 1].close);

  const later = series.find(row => row.date > targetDateStr);
  if (later) return Number(later.close);

  return Number(series[0].close);
}

function roundRows(rows, limit = 5) {
  return rows.slice(-limit).map(row => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = (typeof value === 'number' && Number.isFinite(value)) ? Number(value.toFixed(2)) : value;
    }
    return out;
  });
}

function buildDropdown() {
  const select = document.getElementById('tickerSelect');
  select.innerHTML = '';

  const dataOptionLabels = staticData?.option_labels || staticData?.metadata?.option_labels || {};
  const optionLabels = { ...OPTION_LABELS, ...dataOptionLabels };

  COMPARE_TICKERS.forEach(ticker => {
    const option = document.createElement('option');
    option.value = ticker;
    option.textContent = ticker ? (optionLabels[ticker] || ticker) : 'None';
    select.appendChild(option);
  });
}

function buildRangeButtons() {
  const container = document.getElementById('rangeButtons');
  container.innerHTML = '';
  Object.keys(RANGE_MAP).forEach(label => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.label = label;
    if (label === currentRangeLabel) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentRangeLabel = label;
      [...container.querySelectorAll('button')].forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      refreshData();
    });
    container.appendChild(btn);
  });
}

function renderTable(targetId, rows) {
  const target = document.getElementById(targetId);
  if (!rows || rows.length === 0) {
    target.innerHTML = '<em>No data available.</em>';
    return;
  }
  const cols = Object.keys(rows[0]);
  let html = '<table><thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
  for (const row of rows) {
    html += '<tr>' + cols.map(c => `<td>${formatMaybeNumber(row[c])}</td>`).join('') + '</tr>';
  }
  html += '</tbody></table>';
  target.innerHTML = html;
}

function updateSummary(payload) {
  latestPayload = payload;
  document.getElementById('lastUpdated').textContent = `Last updated: ${payload.last_updated}`;
  document.getElementById('statusText').textContent = payload.status;
  document.getElementById('initTot').textContent = `Total: ${payload.inits.initTot}`;
  document.getElementById('initTick1').textContent = `${payload.summary.primary_main_label} Price ${payload.inits.initTick1}`;
  document.getElementById('initTick2').textContent = `${payload.summary.secondary_main_label} Price ${payload.inits.initTick2}`;
  document.getElementById('totalPerc').textContent = payload.summary.total_percent;
  document.getElementById('totalAmt').textContent = payload.summary.total_amount;
  document.getElementById('percQQQM').textContent = payload.summary.qqqm_percent;
  document.getElementById('datasetDate').textContent = payload.dataset.generated_on || 'unknown date';
  document.getElementById('startDateText').textContent = APP_CONFIG.startDate;

  const secondaryLabel = document.getElementById('secondaryTickerLabel');
  const secondaryValue = document.getElementById('secondaryTickerValue');
  if (showAlt) {
    secondaryLabel.textContent = `${payload.summary.secondary_alt_label} %`;
    secondaryValue.textContent = payload.summary.secondary_alt_value;
  } else {
    secondaryLabel.textContent = `${payload.summary.secondary_main_label} %`;
    secondaryValue.textContent = payload.summary.secondary_main_value;
  }

  const positive = payload.summary.total_percent_value >= 0;
  document.getElementById('totalCard').className = `card ${positive ? 'pulse-good' : 'pulse-bad'}`;
  document.getElementById('amountCard').className = `card ${positive ? 'pulse-good' : 'pulse-bad'}`;
  document.getElementById('toggleBtn').textContent = showAlt
    ? `Show ${payload.summary.secondary_main_label}`
    : `Show ${payload.summary.secondary_alt_label}`;
}

function updateChart(payload) {
  const ctx = document.getElementById('chart').getContext('2d');
  if (chart) chart.destroy();

  const datasets = [
    {
      label: 'Total %',
      data: payload.chart.total_percent_series,
      yAxisID: 'y',
      borderWidth: 3,
      tension: 0.15,
    },
    {
      label: 'QQQM $',
      data: payload.chart.qqqm_value_series,
      yAxisID: 'y1',
      borderWidth: 2,
      tension: 0.15,
    },
    {
      label: 'QCLN $',
      data: payload.chart.qcln_value_series,
      yAxisID: 'y1',
      borderWidth: 2,
      tension: 0.15,
    }
  ];

  if (payload.chart.compare_series) {
    datasets.push({
      label: payload.chart.compare_label,
      data: payload.chart.compare_series,
      yAxisID: 'y',
      borderWidth: 2,
      tension: 0.15,
      borderDash: [8, 5],
      spanGaps: true,
    });
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: payload.chart.labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { ticks: { color: '#cbd5e1' }, grid: { color: '#243041' } },
        y: {
          position: 'left',
          title: { display: true, text: 'Total % / Compare %', color: '#cbd5e1' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#243041' },
        },
        y1: {
          position: 'right',
          title: { display: true, text: 'Portfolio Value ($)', color: '#cbd5e1' },
          ticks: { color: '#cbd5e1' },
          grid: { drawOnChartArea: false },
        }
      },
      plugins: {
        legend: { labels: { color: '#e5e7eb' } },
        title: {
          display: true,
          text: payload.chart.title,
          color: '#e5e7eb',
        }
      }
    }
  });
}

function updateTables(payload) {
  renderTable('portfolioTable', payload.tables.portfolio);
  renderTable('qqqmTable', payload.tables.qqqm);
  renderTable('qclnTable', payload.tables.qcln);
  renderTable('compareTable', payload.tables.compare);
  document.getElementById('compareTableTitle').textContent = payload.tables.compare_title;
}

function buildPayload(rangeLabel, compareTickerSelection = '') {
  if (!staticData || !staticData.prices) {
    throw new Error('Static data file not loaded.');
  }

  const qqqmFull = seriesForTicker(APP_CONFIG.ticker1);
  const qclnFull = seriesForTicker(APP_CONFIG.ticker2);
  const cnrgFull = seriesForTicker(APP_CONFIG.ticker2Alt);
  if (!qqqmFull.length || !qclnFull.length || !cnrgFull.length) {
    throw new Error('One or more base ticker datasets are missing.');
  }

  const endDate = latestDateAcrossBaseTickers();
  if (!endDate) throw new Error('Could not determine latest dataset date.');

  const qqqmRange = filterByRange(qqqmFull, rangeLabel, endDate);
  const qclnRange = filterByRange(qclnFull, rangeLabel, endDate);
  const cnrgRange = filterByRange(cnrgFull, rangeLabel, endDate);
  if (!qqqmRange.length || !qclnRange.length || !cnrgRange.length) {
    throw new Error('No data available for the selected range.');
  }

  const qqqmMap = buildDateMap(qqqmRange);
  const qclnMap = buildDateMap(qclnRange);
  const sharedDates = qqqmRange
    .map(row => row.date)
    .filter(date => qclnMap.has(date))
    .sort();
  if (!sharedDates.length) {
    throw new Error('No shared trading dates found between QQQM and QCLN.');
  }

  const initialSharePriceCnrg = closeOnOrNear(cnrgFull, APP_CONFIG.cnrgDate);

  const portfolioRows = sharedDates.map(date => {
    const qqqmClose = qqqmMap.get(date);
    const qclnClose = qclnMap.get(date);
    const portfolioQQQMValue = qqqmClose * APP_CONFIG.initialInvestment * APP_CONFIG.weightQQQM / APP_CONFIG.initialSharePriceQQQM;
    const portfolioQCLNValue = qclnClose * APP_CONFIG.initialInvestment * APP_CONFIG.weightQCLN / APP_CONFIG.initialSharePriceQCLN;
    const totalPercent = ((portfolioQQQMValue + portfolioQCLNValue - APP_CONFIG.initialInvestment) / APP_CONFIG.initialInvestment) * 100;
    return {
      Date: date,
      'Portfolio %': totalPercent,
      'Close QQQM': qqqmClose,
      'Close QCLN': qclnClose,
      'Portfolio QQQM Value': portfolioQQQMValue,
      'Portfolio QCLN Value': portfolioQCLNValue,
    };
  });

  const latestQQQMClose = Number(qqqmRange[qqqmRange.length - 1].close);
  const latestQCLNClose = Number(qclnRange[qclnRange.length - 1].close);
  const latestCNRGClose = Number(cnrgRange[cnrgRange.length - 1].close);
  const latestPortfolio = portfolioRows[portfolioRows.length - 1];
  const portfolioAmount = latestPortfolio['Portfolio %'] / 100 * APP_CONFIG.initialInvestment;
  const qqqmPct = ((latestQQQMClose / APP_CONFIG.initialSharePriceQQQM) - 1) * 100;
  const qclnPct = ((latestQCLNClose / APP_CONFIG.initialSharePriceQCLN) - 1) * 100;
  const cnrgPct = ((latestCNRGClose / initialSharePriceCnrg) - 1) * 100;

  let compareSeriesPayload = null;
  let compareLabel = '';
  let compareTable = roundRows(cnrgRange.map(row => ({ Date: row.date, Close: Number(row.close) })));
  let compareTableTitle = APP_CONFIG.ticker2Alt;

  if (compareTickerSelection) {
    const customFull = seriesForTicker(compareTickerSelection);
    if (!customFull.length) throw new Error(`No static data found for ${compareTickerSelection}.`);
    const customRange = filterByRange(customFull, rangeLabel, endDate);
    if (!customRange.length) throw new Error(`No visible data found for ${compareTickerSelection}.`);

    let compareReference;
    try {
      compareReference = closeOnOrNear(customFull, APP_CONFIG.startDate);
    } catch (error) {
      compareReference = Number(customRange[0].close);
    }

    const compareMap = new Map(customRange.map(row => [row.date, ((Number(row.close) / compareReference) - 1) * 100]));
    compareSeriesPayload = sharedDates.map(date => {
      const value = compareMap.get(date);
      return (typeof value === 'number' && Number.isFinite(value)) ? Number(value.toFixed(4)) : null;
    });
    compareLabel = compareTickerSelection;
    compareTable = roundRows(customRange.map(row => ({ Date: row.date, Close: Number(row.close) })));
    compareTableTitle = compareTickerSelection;
  }

  return {
    dataset: {
      generated_on: staticData.metadata?.generated_on || '',
      dataset_end: staticData.metadata?.dataset_end || endDate,
      source: staticData.metadata?.source || 'local-json',
    },
    last_updated: new Date().toLocaleString(),
    status: `Loaded range=${rangeLabel}` + (compareTickerSelection ? ` and compare ticker=${compareTickerSelection}` : ''),
    inits: {
      initTot: formatMoney(APP_CONFIG.initialInvestment),
      initTick1: formatMoney(APP_CONFIG.initialSharePriceQQQM),
      initTick2: formatMoney(APP_CONFIG.initialSharePriceQCLN),
    },
    summary: {
      total_percent: formatPercent(latestPortfolio['Portfolio %']),
      total_percent_value: Number(latestPortfolio['Portfolio %']),
      total_amount: formatMoney(portfolioAmount),
      qqqm_percent: formatPercent(qqqmPct),
      primary_main_label: APP_CONFIG.ticker1,
      secondary_main_label: APP_CONFIG.ticker2,
      secondary_main_value: formatPercent(qclnPct),
      secondary_alt_label: APP_CONFIG.ticker2Alt,
      secondary_alt_value: formatPercent(cnrgPct),
    },
    chart: {
      title: `Portfolio Price and Returns: ${APP_CONFIG.ticker1} / ${APP_CONFIG.ticker2}` + (compareTickerSelection ? ` vs ${compareTickerSelection}` : ''),
      labels: sharedDates,
      total_percent_series: portfolioRows.map(row => Number(row['Portfolio %'].toFixed(4))),
      qqqm_value_series: portfolioRows.map(row => Number(row['Portfolio QQQM Value'].toFixed(4))),
      qcln_value_series: portfolioRows.map(row => Number(row['Portfolio QCLN Value'].toFixed(4))),
      compare_series: compareSeriesPayload,
      compare_label: compareLabel,
    },
    tables: {
      portfolio: roundRows(portfolioRows.map(row => ({ Date: row.Date, 'Portfolio %': row['Portfolio %'] }))),
      qqqm: roundRows(portfolioRows.map(row => ({ Date: row.Date, Close: row['Close QQQM'], 'Portfolio QQQM Value': row['Portfolio QQQM Value'] }))),
      qcln: roundRows(portfolioRows.map(row => ({ Date: row.Date, Close: row['Close QCLN'], 'Portfolio QCLN Value': row['Portfolio QCLN Value'] }))),
      compare: compareTable,
      compare_title: compareTableTitle,
    },
  };
}

async function loadStaticData() {
  const response = await fetch('./financial_gains_static_data.json');
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Failed to load static data file.');
  staticData = payload;
}

async function refreshData() {
  try {
    document.getElementById('statusText').textContent = 'Loading...';
    const payload = buildPayload(currentRangeLabel, compareTicker);
    updateSummary(payload);
    updateChart(payload);
    updateTables(payload);
  } catch (error) {
    document.getElementById('statusText').textContent = `Error: ${error.message}`;
  }
}

document.getElementById('refreshBtn').addEventListener('click', refreshData);
document.getElementById('compareBtn').addEventListener('click', () => {
  compareTicker = document.getElementById('tickerSelect').value;
  refreshData();
});
document.getElementById('clearBtn').addEventListener('click', () => {
  compareTicker = '';
  document.getElementById('tickerSelect').value = '';
  refreshData();
});
document.getElementById('toggleBtn').addEventListener('click', () => {
  showAlt = !showAlt;
  if (latestPayload) updateSummary(latestPayload);
});
document.getElementById('tickerSelect').addEventListener('change', (event) => {
  compareTicker = event.target.value;
});

(async function initApp() {
  buildRangeButtons();
  buildDropdown();
  try {
    await loadStaticData();
    document.getElementById('statusText').textContent = 'Static data file loaded.';
    await refreshData();
  } catch (error) {
    document.getElementById('statusText').textContent = `Error: ${error.message}`;
  }
})();
