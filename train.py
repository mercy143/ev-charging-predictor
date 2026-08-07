import os
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor

def build_and_save_model():
    print("⚙️ Loading EV training dataset...")
    file_path = r"C:\Users\User\Downloads\archive (2)\ev_charging_patterns.csv"
    df = pd.read_csv(file_path)

    # FIX: Drop rows where charging rate is 0 to avoid division-by-zero NaN values
    df = df[df['Charging Rate (kW)'] > 0].copy()

    print("📊 Engineering logical features...")
    df['energy_gap_kwh'] = ((df['State of Charge (End %)'] - df['State of Charge (Start %)']) / 100) * df['Battery Capacity (kWh)']
    df['theoretical_hours'] = df['energy_gap_kwh'] / df['Charging Rate (kW)']

    feature_cols = [
        'Battery Capacity (kWh)', 'State of Charge (Start %)', 
        'State of Charge (End %)', 'Charging Rate (kW)',
        'energy_gap_kwh', 'theoretical_hours'
    ]
    
    X = df[feature_cols]
    y = df['Charging Duration (hours)']

    # FIX: Drop any remaining NaN rows defensively
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Fill any accidental infinites or leftovers
    X_train = X_train.fillna(0).replace([float('inf'), float('-inf')], 0)

    print("🧠 Training Random Forest Engine...")
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    os.makedirs("models", exist_ok=True)
    with open("models/charging_model.pkl", "wb") as f:
        pickle.dump(model, f)
    print("💾 Model binary successfully saved to 'models/charging_model.pkl'")

if __name__ == "__main__":
    build_and_save_model()
