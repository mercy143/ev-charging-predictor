import pickle
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="EV Charging Duration Predictor API", version="1.0.0")

class TelemetryInput(BaseModel):
    battery_capacity_kwh: float = Field(..., example=75.0)
    state_of_charge_start: float = Field(..., example=20.0)
    state_of_charge_end: float = Field(..., example=80.0)
    charging_rate_kw: float = Field(..., example=50.0)

try:
    with open("models/charging_model.pkl", "rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    model = None

@app.get("/")
def health_check():
    return {"status": "online", "model_loaded": model is not None}

@app.post("/predict")
def run_inference(payload: TelemetryInput):
    if not model:
        raise HTTPException(status_code=503, detail="ML model not initialized.")
    if payload.state_of_charge_start >= payload.state_of_charge_end:
        raise HTTPException(status_code=400, detail="Target charge must be greater than start charge.")

    gap = ((payload.state_of_charge_end - payload.state_of_charge_start) / 100) * payload.battery_capacity_kwh
    theoretical = gap / payload.charging_rate_kw
    
    feature_cols = [
        'Battery Capacity (kWh)', 'State of Charge (Start %)', 'State of Charge (End %)', 
        'Charging Rate (kW)', 'energy_gap_kwh', 'theoretical_hours'
    ]
    input_df = pd.DataFrame(
        [[payload.battery_capacity_kwh, payload.state_of_charge_start, payload.state_of_charge_end, payload.charging_rate_kw, gap, theoretical]], 
        columns=feature_cols
    )
    
    prediction = model.predict(input_df)
    return {
        "status": "success",
        "predicted_duration_hours": round(float(prediction), 2)
    }
