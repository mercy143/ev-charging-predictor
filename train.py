import os
import pickle
import json          # <-- NEW: Required for exporting data to your UI layout
import numpy as np   # <-- NEW: Used for calculation arrays
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
# 🔥 NEW: Imported evaluation metrics to calculate your dashboard numbers
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def build_and_save_model():
    print("⚙️ Loading EV training dataset...")
    
    # 🛠️ DYNAMIC PORTABLE PATH ALIGNMENT
    # This automatically finds the file on any machine, local or cloud
    BASE_DIR = Path(__file__).resolve().parent
    file_path = BASE_DIR / "data" / "ev_charging_patterns.csv"
    
    if not file_path.exists():
        raise FileNotFoundError(f"❌ Critical Error: Missing dataset at target path -> {file_path}")
        
    df = pd.read_csv(file_path)

    # Drop rows where charging rate is 0 to avoid division-by-zero NaN values
    df = df[df['Charging Rate (kW)'] > 0].copy()

    print("📊 Engineering logical features...")
    df['energy_gap_kwh'] = ((df['State of Charge (End %)'] - df['State of Charge (Start %)']).abs() / 100) * df['Battery Capacity (kWh)']
    df['theoretical_hours'] = df['energy_gap_kwh'] / df['Charging Rate (kW)']

    feature_cols = [
        'Battery Capacity (kWh)', 'State of Charge (Start %)', 
        'State of Charge (End %)', 'Charging Rate (kW)',
        'energy_gap_kwh', 'theoretical_hours'
    ]
    
    X = df[feature_cols]
    y = df['Charging Duration (hours)']

    # Partition train/test splits
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    X_train = X_train.fillna(0).replace([float('inf'), float('-inf')], 0)

    print("🧠 Training Random Forest Engine...")
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    # Save model artifact file wrapper to /app/models inside Docker context
    models_dir = BASE_DIR / "models"
    models_dir.mkdir(exist_ok=True)
    
    with open(models_dir / "charging_model.pkl", "wb") as f:
        pickle.dump(model, f)
    print("💾 Model binary successfully saved to 'models/charging_model.pkl'")

    # 🔥 FIX STEP: Generate model metrics based on testing dataset evaluations
    print("📊 Evaluating model validation metrics for full-stack UI dashboard...")
    predictions = model.predict(X_test)
    
    mae_score = mean_absolute_error(y_test, predictions)
    r2_score_val = r2_score(y_test, predictions)
    rmse_score = np.sqrt(mean_squared_error(y_test, predictions))

    # Match the exact data key schema strings expected by your React API controllers
    metrics_payload = {
        "r2_score": f"{round(r2_score_val * 100, 2)}%",
        "mae_hours": f"{round(mae_score, 2)}h",
        "rmse_hours": f"{round(rmse_score, 2)}h"
    }

    # Export the payload to metrics.json
    metrics_output_path = models_dir / "metrics.json"
    with open(metrics_output_path, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=4)
        
    print(f"✅ SUCCESS: Saved data validation metrics directly to -> {metrics_output_path}")

if __name__ == "__main__":
    build_and_save_model()
