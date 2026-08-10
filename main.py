import json
import pickle
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "charging_model.pkl"
METRICS_PATH = BASE_DIR / "models" / "metrics.json"
FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"

app = FastAPI(title="EV Charging Duration Predictor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TelemetryInput(BaseModel):
    battery_capacity_kwh: float = Field(..., example=75.0)
    state_of_charge_start: float = Field(..., example=20.0)
    state_of_charge_end: float = Field(..., example=80.0)
    charging_rate_kw: float = Field(..., example=50.0)
    vehicle: str = Field(default="Generic EV", example="Tesla Model 3")
    charging_type: str = Field(default="DC Fast Charging", example="Level 2 Charging")

try:
    with MODEL_PATH.open("rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    model = None

model_metrics = None
if METRICS_PATH.exists():
    try:
        with METRICS_PATH.open("r", encoding="utf-8") as f:
            model_metrics = json.load(f)
    except json.JSONDecodeError:
        model_metrics = None

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "online", "model_loaded": model is not None}

@app.get("/")
def root_health():
    if FRONTEND_DIST_DIR.exists():
        return FileResponse(FRONTEND_DIST_DIR / "index.html")
    return {"status": "online", "model_loaded": model is not None}

@app.get("/{path:path}")
def spa_fallback(path: str):
    if path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not found")

    file_path = FRONTEND_DIST_DIR / path
    if FRONTEND_DIST_DIR.exists() and file_path.exists() and file_path.is_file():
        return FileResponse(file_path)

    if FRONTEND_DIST_DIR.exists():
        return FileResponse(FRONTEND_DIST_DIR / "index.html")

    raise HTTPException(status_code=404, detail="Not found")

@app.post("/predict")
@app.post("/api/predict")
def run_inference(payload: TelemetryInput):
    if not model:
        raise HTTPException(status_code=503, detail="ML model not initialized.")
    if payload.state_of_charge_start >= payload.state_of_charge_end:
        raise HTTPException(status_code=400, detail="Target charge must be greater than start charge.")

    gap = ((payload.state_of_charge_end - payload.state_of_charge_start) / 100) * payload.battery_capacity_kwh
    theoretical = gap / payload.charging_rate_kw

    feature_cols = [
        "Battery Capacity (kWh)",
        "State of Charge (Start %)",
        "State of Charge (End %)",
        "Charging Rate (kW)",
        "energy_gap_kwh",
        "theoretical_hours",
    ]
    input_df = pd.DataFrame(
        [[payload.battery_capacity_kwh, payload.state_of_charge_start, payload.state_of_charge_end, payload.charging_rate_kw, gap, theoretical]],
        columns=feature_cols,
    )

    prediction = model.predict(input_df)
    predicted_hours = round(float(prediction[0]), 2)

    return {
        "status": "success",
        "predicted_duration_hours": predicted_hours,
        "model_metrics": model_metrics,
        "calculation_summary": {
            "energy_gap_kwh": round(float(gap), 2),
            "theoretical_hours": round(float(theoretical), 2),
            "charge_window_percent": round(float(payload.state_of_charge_end - payload.state_of_charge_start), 2),
            "vehicle": payload.vehicle,
            "charging_type": payload.charging_type,
        },
    }

