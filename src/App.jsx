import { useEffect, useMemo, useState } from 'react';

const MAIN_CURRENCIES = ['EUR', 'USD', 'PLN', 'GBP', 'CHF'];
const API_ROOT = 'https://api.frankfurter.dev/v1';

const DEMO_EUR_RATES = {
  EUR: 1,
  USD: 1.0854,
  PLN: 4.2678,
  GBP: 0.8442,
  CHF: 0.9365,
};

const DEMO_TREND_DATES = [
  '2026-06-01',
  '2026-06-02',
  '2026-06-03',
  '2026-06-04',
  '2026-06-05',
  '2026-06-06',
  '2026-06-07',
];

const DEMO_TREND_FACTORS = [0.992, 0.997, 1.004, 1.001, 1.009, 1.006, 1.014];

function formatRate(value) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${dateString}T00:00:00`));
}

function getDateString(date) {
  return date.toISOString().slice(0, 10);
}

function getTrendRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 11);

  return {
    start: getDateString(start),
    end: getDateString(end),
  };
}

function getValidChartCurrency(baseCurrency, currentChartCurrency) {
  if (currentChartCurrency !== baseCurrency) {
    return currentChartCurrency;
  }

  return MAIN_CURRENCIES.find((currency) => currency !== baseCurrency) || 'USD';
}

function buildLatestEndpoint(baseCurrency) {
  const symbols = MAIN_CURRENCIES.filter((currency) => currency !== baseCurrency).join(',');
  return `${API_ROOT}/latest?base=${baseCurrency}&symbols=${symbols}`;
}

function buildTrendEndpoint(baseCurrency, chartCurrency) {
  const { start, end } = getTrendRange();
  return `${API_ROOT}/${start}..${end}?base=${baseCurrency}&symbols=${chartCurrency}`;
}

function getDemoRate(baseCurrency, targetCurrency) {
  if (baseCurrency === targetCurrency) {
    return 1;
  }

  return DEMO_EUR_RATES[targetCurrency] / DEMO_EUR_RATES[baseCurrency];
}

function buildDemoRatesData(baseCurrency) {
  const rates = MAIN_CURRENCIES.reduce((acc, currency) => {
    if (currency !== baseCurrency) {
      acc[currency] = getDemoRate(baseCurrency, currency);
    }

    return acc;
  }, {});

  return {
    amount: 1,
    base: baseCurrency,
    date: '2026-06-07',
    rates,
  };
}

function buildDemoTrendData(baseCurrency, chartCurrency) {
  const baseRate = getDemoRate(baseCurrency, chartCurrency);

  return DEMO_TREND_DATES.map((date, index) => ({
    date,
    value: Number((baseRate * DEMO_TREND_FACTORS[index]).toFixed(6)),
  }));
}

function normalizeTrendData(data, chartCurrency) {
  return Object.entries(data?.rates || {})
    .map(([date, rates]) => ({
      date,
      value: rates?.[chartCurrency] ?? null,
    }))
    .filter((item) => typeof item.value === 'number')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
}

function buildAreaPath(points, height, paddingBottom) {
  if (points.length === 0) {
    return '';
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const bottom = height - paddingBottom;
  const line = points.map((point) => `${point.x},${point.y}`).join(' L ');

  return `M ${firstPoint.x},${bottom} L ${line} L ${lastPoint.x},${bottom} Z`;
}

function buildLinePath(points) {
  if (points.length === 0) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`).join(' ');
}

function TrendChart({ data, baseCurrency, chartCurrency }) {
  const width = 760;
  const height = 250;
  const paddingX = 42;
  const paddingTop = 28;
  const paddingBottom = 52;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;
  const values = data.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = paddingX + (chartWidth / Math.max(data.length - 1, 1)) * index;
    const normalized = (item.value - minValue) / valueRange;
    const y = paddingTop + chartHeight - normalized * chartHeight;

    return {
      ...item,
      x,
      y,
    };
  });

  const areaPath = buildAreaPath(points, height, paddingBottom);
  const linePath = buildLinePath(points);
  const gridLines = [0, 1, 2, 3].map((index) => paddingTop + (chartHeight / 3) * index);

  return (
    <div className="chartWrap" aria-label={`Динамика курса ${chartCurrency} к ${baseCurrency} за 7 дней`}>
      <svg className="trendSvg" viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f7fd1" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#2f7fd1" stopOpacity="0.03" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1f5f9d" floodOpacity="0.16" />
          </filter>
        </defs>

        {gridLines.map((lineY) => (
          <line key={lineY} x1="26" y1={lineY} x2={width - 26} y2={lineY} className="gridLine" />
        ))}

        <path d={areaPath} className="areaPath" />
        <path d={linePath} className="linePath" filter="url(#softShadow)" />

        {points.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="6" className="pointOuter" />
            <circle cx={point.x} cy={point.y} r="3.2" className="pointInner" />
            <title>{`${formatShortDate(point.date)}: ${formatRate(point.value)} ${chartCurrency}`}</title>
          </g>
        ))}

        {points.map((point) => (
          <text key={`${point.date}-date`} x={point.x} y={height - 18} className="dateLabel" textAnchor="middle">
            {formatShortDate(point.date)}
          </text>
        ))}
      </svg>

      <div className="chartValuesGrid">
        {data.map((item) => (
          <div key={item.date} className="chartValuePill">
            <span>{formatShortDate(item.date)}</span>
            <strong>{formatRate(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [baseCurrency, setBaseCurrency] = useState('EUR');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [chartCurrency, setChartCurrency] = useState('USD');
  const [amount, setAmount] = useState('100');
  const [ratesData, setRatesData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [dataSource, setDataSource] = useState('empty');
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState('');
  const [trendError, setTrendError] = useState('');

  const validChartCurrencies = useMemo(
    () => MAIN_CURRENCIES.filter((currency) => currency !== baseCurrency),
    [baseCurrency]
  );

  const latestEndpoint = buildLatestEndpoint(baseCurrency);
  const activeChartCurrency = getValidChartCurrency(baseCurrency, chartCurrency);
  const trendEndpoint = buildTrendEndpoint(baseCurrency, activeChartCurrency);

  useEffect(() => {
    if (chartCurrency === baseCurrency) {
      setChartCurrency(getValidChartCurrency(baseCurrency, chartCurrency));
    }
  }, [baseCurrency, chartCurrency]);

  function handleBaseCurrencyChange(newBaseCurrency) {
    const nextChartCurrency = getValidChartCurrency(newBaseCurrency, chartCurrency);
    const nextTargetCurrency = targetCurrency === newBaseCurrency
      ? MAIN_CURRENCIES.find((currency) => currency !== newBaseCurrency) || 'USD'
      : targetCurrency;

    setBaseCurrency(newBaseCurrency);
    setChartCurrency(nextChartCurrency);
    setTargetCurrency(nextTargetCurrency);
    setRatesData(null);
    setTrendData([]);
    setDataSource('empty');
    setError('');
    setTrendError('');
  }

  async function fetchTrend(base, chart) {
    const response = await fetch(buildTrendEndpoint(base, chart));

    if (!response.ok) {
      throw new Error(`Trend API error: ${response.status}`);
    }

    const data = await response.json();
    const normalizedData = normalizeTrendData(data, chart);

    if (normalizedData.length === 0) {
      throw new Error('Trend data is empty');
    }

    return normalizedData;
  }

  async function loadRates() {
    const currentChartCurrency = getValidChartCurrency(baseCurrency, chartCurrency);

    setLoading(true);
    setTrendLoading(true);
    setError('');
    setTrendError('');

    try {
      const latestResponse = await fetch(buildLatestEndpoint(baseCurrency));

      if (!latestResponse.ok) {
        throw new Error(`Latest API error: ${latestResponse.status}`);
      }

      const latestData = await latestResponse.json();
      const currentTrendData = await fetchTrend(baseCurrency, currentChartCurrency);

      setRatesData(latestData);
      setTrendData(currentTrendData);
      setDataSource('api');
    } catch (currentError) {
      console.error(currentError);
      setRatesData(null);
      setTrendData([]);
      setDataSource('empty');
      setError('Не удалось загрузить курсы. Проверьте интернет или используйте демо-данные.');
    } finally {
      setLoading(false);
      setTrendLoading(false);
    }
  }

  function loadDemoData() {
    const currentChartCurrency = getValidChartCurrency(baseCurrency, chartCurrency);

    setRatesData(buildDemoRatesData(baseCurrency));
    setTrendData(buildDemoTrendData(baseCurrency, currentChartCurrency));
    setDataSource('demo');
    setError('');
    setTrendError('');
    setLoading(false);
    setTrendLoading(false);
  }

  useEffect(() => {
    if (!ratesData) {
      return;
    }

    const currentChartCurrency = getValidChartCurrency(baseCurrency, chartCurrency);

    if (dataSource === 'demo') {
      setTrendData(buildDemoTrendData(baseCurrency, currentChartCurrency));
      setTrendError('');
      return;
    }

    if (dataSource !== 'api') {
      return;
    }

    let ignoreResult = false;

    async function refreshTrend() {
      setTrendLoading(true);
      setTrendError('');

      try {
        const currentTrendData = await fetchTrend(baseCurrency, currentChartCurrency);

        if (!ignoreResult) {
          setTrendData(currentTrendData);
        }
      } catch (currentError) {
        console.error(currentError);

        if (!ignoreResult) {
          setTrendData([]);
          setTrendError('Не удалось обновить график. Можно использовать демо-данные.');
        }
      } finally {
        if (!ignoreResult) {
          setTrendLoading(false);
        }
      }
    }

    refreshTrend();

    return () => {
      ignoreResult = true;
    };
  }, [baseCurrency, chartCurrency, dataSource, ratesData]);

  const displayRates = useMemo(() => {
    return MAIN_CURRENCIES.map((currency) => {
      if (currency === baseCurrency) {
        return { currency, rate: 1 };
      }

      return {
        currency,
        rate: ratesData?.rates?.[currency] ?? null,
      };
    });
  }, [baseCurrency, ratesData]);

  const selectedRate = targetCurrency === baseCurrency ? 1 : ratesData?.rates?.[targetCurrency];
  const numericAmount = Number(amount) || 0;
  const convertedAmount = selectedRate ? numericAmount * selectedRate : null;

  return (
    <main className="page">
      <section className="hero">
        <div className="heroText">
          <p className="badge">AddSkill Workshop Demo</p>
          <h1>Live Currency Dashboard</h1>
          <p>
            Учебный live dashboard для проверки дневных курсов валют через открытый API без backend, базы данных и API-ключей.
          </p>
        </div>

        <div className="controlPanel">
          <label>
            Базовая валюта
            <select value={baseCurrency} onChange={(event) => handleBaseCurrencyChange(event.target.value)}>
              {MAIN_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>

          <div className="buttonGroup">
            <button type="button" onClick={loadRates} disabled={loading || trendLoading}>
              {loading ? 'Загрузка курсов...' : 'Загрузить курсы'}
            </button>

            <button type="button" className="secondaryButton" onClick={loadDemoData}>
              Демо-данные
            </button>
          </div>
        </div>
      </section>

      {error && <div className="errorBox">{error}</div>}

      <section className="infoGrid">
        <div className="infoCard">
          <span>Базовая валюта</span>
          <strong>{ratesData?.base || baseCurrency}</strong>
        </div>

        <div className="infoCard">
          <span>Дата курса</span>
          <strong>{ratesData?.date || 'Ещё не загружено'}</strong>
        </div>

        <div className="infoCard">
          <span>Источник данных</span>
          <strong>{dataSource === 'demo' ? 'Демо' : dataSource === 'api' ? 'API' : '—'}</strong>
        </div>

        <div className="infoCard wide">
          <span>API endpoint</span>
          <code>{latestEndpoint}</code>
        </div>
      </section>

      <section className="ratesGrid">
        {displayRates.map(({ currency, rate }) => (
          <article key={currency} className="rateCard">
            <div className="currencyRow">
              <strong>{currency}</strong>
              <span>1 {baseCurrency}</span>
            </div>
            <p className="rateValue">{rate ? formatRate(rate) : '—'}</p>
          </article>
        ))}
      </section>

      <section className="trendCard">
        <div className="sectionHeader">
          <div>
            <h2>Динамика курса за 7 дней</h2>
            <p>Аккуратный mini-chart по выбранной валюте относительно базовой валюты.</p>
          </div>

          <label>
            Валюта графика
            <select value={activeChartCurrency} onChange={(event) => setChartCurrency(event.target.value)}>
              {validChartCurrencies.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="trendMeta">
          <span>Пара: 1 {baseCurrency} → {activeChartCurrency}</span>
          <code>{trendEndpoint}</code>
        </div>

        {trendLoading && <div className="miniState">Загрузка графика...</div>}
        {trendError && <div className="miniError">{trendError}</div>}

        {!trendLoading && !trendError && trendData.length === 0 && (
          <div className="miniState">Загрузите курсы или используйте демо-данные, чтобы увидеть динамику.</div>
        )}

        {!trendLoading && !trendError && trendData.length > 0 && (
          <TrendChart data={trendData} baseCurrency={baseCurrency} chartCurrency={activeChartCurrency} />
        )}
      </section>

      <section className="converterCard">
        <div>
          <h2>Конвертер валют</h2>
          <p>Введите сумму и выберите валюту для пересчёта.</p>
        </div>

        <div className="converterControls">
          <label>
            Сумма
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <label>
            Валюта назначения
            <select value={targetCurrency} onChange={(event) => setTargetCurrency(event.target.value)}>
              {MAIN_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="resultBox">
          {convertedAmount === null ? (
            <span>Загрузите курсы, чтобы увидеть результат.</span>
          ) : (
            <strong>
              {formatMoney(numericAmount)} {baseCurrency} = {formatMoney(convertedAmount)} {targetCurrency}
            </strong>
          )}
        </div>
      </section>

      <section className="capabilitiesCard">
        <h2>Что этот сервис может / не может</h2>

        <div className="capabilitiesGrid">
          <div className="capabilityBox canBox">
            <h3>Может</h3>
            <ul>
              <li>Показывать дневные курсы валют.</li>
              <li>Сравнивать валюты.</li>
              <li>Пересчитывать простые суммы.</li>
              <li>Показывать короткую динамику за 7 дней.</li>
            </ul>
          </div>

          <div className="capabilityBox cannotBox">
            <h3>Не может</h3>
            <ul>
              <li>Показывать real-time trading quotes.</li>
              <li>Заменять банк или брокера.</li>
              <li>Гарантировать точный курс банковской операции.</li>
              <li>Хранить пользовательские данные.</li>
            </ul>
          </div>
        </div>
      </section>

      <footer>
        Курсы предоставлены Frankfurter API. Это учебный dashboard, а не финансовая рекомендация.
      </footer>
    </main>
  );
}
