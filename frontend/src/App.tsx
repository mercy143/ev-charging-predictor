import { useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

type ModelMetrics = {
  r2: number | null
  maeHours: number | null
  rmseHours: number | null
}

type PredictionResponse = {
  predicted_duration_hours?: number
  detail?: string
  model_metrics?: {
    r2?: number
    mae_hours?: number
    rmse_hours?: number
  }
  calculation_summary?: {
    theoretical_hours?: number
    charge_window_percent?: number
  }
}

type ResultState = {
  hours: number
  energyRequiredKwh: number
  theoreticalHours: number
  chargeWindowPercent: number
  metrics: ModelMetrics | null
}

function App() {
  const [form, setForm] = useState({
    vehicle: 'Generic EV',
    charging_type: 'DC Fast Charging',
    battery_capacity_kwh: '75',
    state_of_charge_start: '20',
    state_of_charge_end: '80',
    charging_rate_kw: '50',
  })
  const [result, setResult] = useState<ResultState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const formatDuration = (hours: number) => {
    const totalMinutes = Math.round(hours * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h}h ${m.toString().padStart(2, '0')}m`
  }

  const formatSignedDuration = (hours: number) => {
    const prefix = hours >= 0 ? '+' : '-'
    return `${prefix}${formatDuration(Math.abs(hours))}`
  }

  const validateForm = () => {
    const batteryCapacity = Number(form.battery_capacity_kwh)
    const startCharge = Number(form.state_of_charge_start)
    const targetCharge = Number(form.state_of_charge_end)
    const chargingRate = Number(form.charging_rate_kw)

    if (!Number.isFinite(batteryCapacity) || batteryCapacity <= 0) {
      return 'Battery capacity must be greater than 0.'
    }

    if (!Number.isFinite(startCharge) || startCharge < 0 || startCharge > 100) {
      return 'Start charge must be between 0% and 100%.'
    }

    if (!Number.isFinite(targetCharge) || targetCharge < 0 || targetCharge > 100) {
      return 'Target charge must be between 0% and 100%.'
    }

    if (targetCharge <= startCharge) {
      return 'Target charge must be greater than start charge.'
    }

    if (!Number.isFinite(chargingRate) || chargingRate <= 0) {
      return 'Charging rate must be greater than 0.'
    }

    return null
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battery_capacity_kwh: Number(form.battery_capacity_kwh),
          state_of_charge_start: Number(form.state_of_charge_start),
          state_of_charge_end: Number(form.state_of_charge_end),
          charging_rate_kw: Number(form.charging_rate_kw),
          vehicle: form.vehicle,
          charging_type: form.charging_type,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      let payload: PredictionResponse | null = null
      if (contentType.includes('application/json')) {
        try {
          payload = await response.json()
        } catch {
          payload = null
        }
      } else {
        const text = await response.text()
        payload = text ? { detail: text } : null
      }

      if (!response.ok) {
        throw new Error(payload?.detail ? String(payload.detail) : `Prediction failed (status ${response.status})`)
      }

      if (!payload || typeof payload.predicted_duration_hours !== 'number') {
        throw new Error('Prediction service returned an invalid payload.')
      }

      const batteryCapacity = Number(form.battery_capacity_kwh)
      const startCharge = Number(form.state_of_charge_start)
      const targetCharge = Number(form.state_of_charge_end)
      const chargingRate = Number(form.charging_rate_kw)
      const energyRequiredKwh = ((targetCharge - startCharge) / 100) * batteryCapacity
      const theoreticalHours = energyRequiredKwh / chargingRate
      const payloadMetrics = payload.model_metrics
        ? {
            r2: typeof payload.model_metrics.r2 === 'number' ? payload.model_metrics.r2 : null,
            maeHours: typeof payload.model_metrics.mae_hours === 'number' ? payload.model_metrics.mae_hours : null,
            rmseHours: typeof payload.model_metrics.rmse_hours === 'number' ? payload.model_metrics.rmse_hours : null,
          }
        : null

      setResult({
        hours: payload.predicted_duration_hours,
        energyRequiredKwh,
        theoreticalHours: payload.calculation_summary?.theoretical_hours ?? theoreticalHours,
        chargeWindowPercent: payload.calculation_summary?.charge_window_percent ?? (targetCharge - startCharge),
        metrics: payloadMetrics,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach prediction service.')
    } finally {
      setLoading(false)
    }
  }

  const startSoc = Number(form.state_of_charge_start)
  const endSoc = Number(form.state_of_charge_end)
  const startSocPercent = Math.max(0, Math.min(100, startSoc))
  const endSocPercent = Math.max(0, Math.min(100, endSoc))
  const chargeRangePercent = Math.max(4, endSocPercent - startSocPercent)

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-header">
          <div>
            <p className="eyebrow">EV charging assistant</p>
            <h1>How long will your EV take to charge?</h1>
            <p className="subtitle">
              Predict charging duration with a physics-based estimate and a machine-learning model trained on real charging behavior.
            </p>
          </div>
          <div className="hero-support">
            <p>AI-powered charging duration prediction</p>
            <p className="hero-note">Built with FastAPI backend and a responsive Vite frontend.</p>
          </div>
        </div>

        <div className="content-grid">
          <div className="controls-panel">
            <div className="panel-label">Vehicle & charger</div>
            <div className="charging-station-banner">
              <img src="/Electric-Vehicle-Charging-Stations-EVCS-1.jpeg" alt="" className="station-image" />
            </div>
            <form className="form-card" onSubmit={handleSubmit}>
              <div className="input-grid">
                <label>
                  Vehicle type
                  <select name="vehicle" value={form.vehicle} onChange={handleChange}>
                    <option>Generic EV</option>
                    <option>Tesla Model 3</option>
                    <option>Nissan Leaf</option>
                    <option>Audi e-tron</option>
                  </select>
                </label>
                <label>
                  Charging type
                  <select name="charging_type" value={form.charging_type} onChange={handleChange}>
                    <option>DC Fast Charging</option>
                    <option>Level 2 Charging</option>
                    <option>Home Charger</option>
                  </select>
                </label>
                <label>
                  Battery capacity (kWh)
                  <input name="battery_capacity_kwh" type="number" min="1" step="0.1" value={form.battery_capacity_kwh} onChange={handleChange} required />
                </label>
                <label>
                  Start charge (%)
                  <input name="state_of_charge_start" type="number" min="0" max="100" step="1" value={form.state_of_charge_start} onChange={handleChange} required />
                </label>
                <label>
                  Target charge (%)
                  <input name="state_of_charge_end" type="number" min="0" max="100" step="1" value={form.state_of_charge_end} onChange={handleChange} required />
                </label>
                <label>
                  Charging power (kW)
                  <input name="charging_rate_kw" type="number" min="1" step="0.1" value={form.charging_rate_kw} onChange={handleChange} required />
                </label>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Calculating…' : '⚡ Predict charging time'}
              </button>
              <div className="image-under-button">
                <img src="/car-images.jpg" alt="" className="car-image" />
              </div>
              <p className="hint">This estimate blends charging physics with supervised learning for a practical real-world prediction.</p>
            </form>
          </div>

          <div className="results-panel">
            <div className="result-card">
              <div className="result-heading">
                <span className="pill">Model: EV charging duration predictor</span>
                <span className={`status-pill ${result ? 'ready' : 'idle'}`}>
                  {result ? '● Prediction complete' : '● Model ready'}
                </span>
              </div>

              <p className="result-title">Estimated charging time</p>
              <p className="result-value">{result ? formatDuration(result.hours) : 'Ready to predict'}</p>

              <div className="metric-grid">
                <div>
                  <span>Charge target</span>
                  <strong>{`${form.state_of_charge_start}% → ${form.state_of_charge_end}%`}</strong>
                </div>
                <div>
                  <span>Charging power</span>
                  <strong>{Number(form.charging_rate_kw).toFixed(1)} kW</strong>
                </div>
              </div>

              <div className="progress-labels">
                <span>Battery state</span>
                <strong>{form.state_of_charge_start}% → {form.state_of_charge_end}%</strong>
              </div>
              <div className="soc-meter" aria-label="State of charge range">
                <div className="soc-track">
                  <div className="soc-fill" style={{ left: `${startSocPercent}%`, width: `${chargeRangePercent}%` }} />
                  <div className="soc-marker start" style={{ left: `${startSocPercent}%` }} />
                  <div className="soc-marker target" style={{ left: `${endSocPercent}%` }} />
                </div>
                <div className="soc-scale">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="soc-caption">
                <span>Start {form.state_of_charge_start}%</span>
                <span>Target {form.state_of_charge_end}%</span>
              </div>

              {result ? (
                <>
                  <div className="comparison-card">
                    <div className="comparison-item">
                      <span>Theoretical estimate</span>
                      <strong>{formatDuration(result.theoreticalHours)}</strong>
                    </div>
                    <div className="comparison-item">
                      <span>AI prediction</span>
                      <strong>{formatDuration(result.hours)}</strong>
                    </div>
                    <div className="comparison-item">
                      <span>Real-world gap</span>
                      <strong>{formatSignedDuration(result.hours - result.theoreticalHours)}</strong>
                    </div>
                  </div>

                  <div className="details-grid">
                    <div>
                      <span>Energy required</span>
                      <strong>{result.energyRequiredKwh.toFixed(1)} kWh</strong>
                    </div>
                    <div>
                      <span>Profile</span>
                      <strong>{form.vehicle} • {form.charging_type}</strong>
                    </div>
                  </div>

                  <div className="performance-card">
                    <p className="performance-title">Validation performance</p>
                    <p className="performance-caption">Measured on the model evaluation dataset.</p>
                    <div className="performance-grid">
                      <div className="performance-item">
                        <span>R²</span>
                        <strong>{result.metrics?.r2 !== null && result.metrics?.r2 !== undefined ? result.metrics.r2.toFixed(3) : '—'}</strong>
                      </div>
                      <div className="performance-item">
                        <span>MAE</span>
                        <strong>{result.metrics?.maeHours !== null && result.metrics?.maeHours !== undefined ? `${result.metrics.maeHours.toFixed(2)} h` : '—'}</strong>
                      </div>
                      <div className="performance-item">
                        <span>RMSE</span>
                        <strong>{result.metrics?.rmseHours !== null && result.metrics?.rmseHours !== undefined ? `${result.metrics.rmseHours.toFixed(2)} h` : '—'}</strong>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="result-helper">Complete the form and click predict to see the AI estimate.</p>
              )}

              {error ? <p className="error">{error}</p> : null}
            </div>

            <div className="model-summary">
              <p className="summary-title">About this model</p>
              <div className="summary-grid">
                <div>
                  <span>Engine</span>
                  <strong>Machine learning regression</strong>
                </div>
                <div>
                  <span>Inputs</span>
                  <strong>Battery + SOC + target + charger</strong>
                </div>
                <div>
                  <span>Backend</span>
                  <strong>FastAPI</strong>
                </div>
                <div>
                  <span>Frontend</span>
                  <strong>React + Vite</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
