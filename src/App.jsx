import { useMemo, useState } from 'react';
import './App.css';

const BASE_CURRENCIES = ['EUR', 'USD', 'PLN', 'GBP', 'CHF'];
const CARD_CURRENCIES = ['EUR', 'USD', 'PLN', 'GBP', 'CHF'];

function formatRate(value) {
  return Number(value).toFixed(4);
}

function App() {
  const [baseCurrency, setBaseCurrency] = useState('EUR');
  const [ratesData, setRatesData] = useState(null);
  const [amount, setAmount] = useState('100');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiEndpoint = `https://api.frankfurter.dev/v1/latest?base=${baseCurrency}`;

  async function loadRates() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiEndpoint);

      if (!response.ok) {
        throw new Error('API не отвечает');
      }

      const data = await response.json();

      if (!data || !data.rates || !data.date) {
        throw new Error('Некорректный ответ API');
      }

      setRatesData({
        base: data.base || baseCurrency,
        date: data.date,
        rates: data.rates
      });
    } catch (apiError) {
      setRatesData(null);
      setError('Не удалось загрузить курсы валют. Проверьте интернет-соединение или попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  function getRate(currency) {
    if (!ratesData) {
      return null;
    }

    if (currency === ratesData.base) {
      return 1;
    }

    return ratesData.rates[currency] || null;
  }

  const conversionResult = useMemo(() => {
    if (!ratesData) {
      return null;
    }

    const numericAmount = Number(String(amount).replace(',', '.'));
    const rate = getRate(targetCurrency);

    if (!Number.isFinite(numericAmount) || numericAmount < 0 || !rate) {
      return null;
    }

    return numericAmount * rate;
  }, [amount, targetCurrency, ratesData]);

  return (
    <div className="app">
      <main className="dashboard">
        <section className="hero">
          <div>
            <p className="badge">AddSkill Workshop Demo</p>
            <h1>Live Currency Dashboard</h1>
            <p className="description">
              Учебный live dashboard для проверки дневных курсов валют.
            </p>
          </div>
        </section>

        <section className="panel controls-panel">
          <div className="control-group">
            <label htmlFor="baseCurrency">Базовая валюта</label>
            <select
              id="baseCurrency"
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value)}
            >
              {BASE_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <button className="primary-button" onClick={loadRates} disabled={loading}>
            {loading ? 'Загрузка...' : 'Загрузить курсы'}
          </button>
        </section>

        {loading && (
          <section className="state-card">
            <p>Загрузка курсов...</p>
          </section>
        )}

        {error && (
          <section className="state-card error-card">
            <p>{error}</p>
          </section>
        )}

        {ratesData && !loading && (
          <>
            <section className="panel info-panel">
              <div>
                <span className="info-label">Базовая валюта</span>
                <strong>{ratesData.base}</strong>
              </div>
              <div>
                <span className="info-label">Дата курса</span>
                <strong>{ratesData.date}</strong>
              </div>
              <div className="endpoint-box">
                <span className="info-label">API endpoint</span>
                <code>{apiEndpoint}</code>
              </div>
            </section>

            <section className="rates-grid">
              {CARD_CURRENCIES.map((currency) => {
                const rate = getRate(currency);

                return (
                  <article className="rate-card" key={currency}>
                    <span className="currency-code">{currency}</span>
                    <strong>{rate ? formatRate(rate) : '—'}</strong>
                    <p>
                      1 {ratesData.base} = {rate ? formatRate(rate) : '—'} {currency}
                    </p>
                  </article>
                );
              })}
            </section>

            <section className="panel converter-panel">
              <div>
                <h2>Конвертер валют</h2>
                <p>Введите сумму в базовой валюте и выберите валюту назначения.</p>
              </div>

              <div className="converter-controls">
                <div className="control-group">
                  <label htmlFor="amount">Сумма в {ratesData.base}</label>
                  <input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>

                <div className="control-group">
                  <label htmlFor="targetCurrency">Валюта назначения</label>
                  <select
                    id="targetCurrency"
                    value={targetCurrency}
                    onChange={(event) => setTargetCurrency(event.target.value)}
                  >
                    {CARD_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="result-box">
                {conversionResult === null ? (
                  <p>Введите корректную сумму для пересчёта.</p>
                ) : (
                  <p>
                    {Number(amount).toLocaleString('ru-RU', {
                      maximumFractionDigits: 2
                    })}{' '}
                    {ratesData.base} ≈{' '}
                    <strong>
                      {conversionResult.toLocaleString('ru-RU', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}{' '}
                      {targetCurrency}
                    </strong>
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        Курсы предоставлены Frankfurter API. Это учебный dashboard, а не финансовая рекомендация.
      </footer>
    </div>
  );
}

export default App;
