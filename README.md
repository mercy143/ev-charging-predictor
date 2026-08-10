# Full-Stack EV Charging Analytics & Predictive ML Application

An enterprise-grade full-stack machine learning application that forecasts electric vehicle (EV) charging durations. This monorepo combines an asynchronous Python FastAPI backend serving a Scikit-Learn Random Forest Regressor model with a high-performance React user interface built using Vite.

---

## 📂 System Architecture & Layout
```text
ev-charging-predictor/
├── backend/                  # Python API & Machine Learning Infrastructure
│   ├── models/
│   │   └── charging_model.pkl # Serialized Random Forest Binary Artifact
│   ├── train.py              # Data Engineering & Training Pipeline Script
│   ├── main.py               # Asynchronous FastAPI Gateway Router
│   └── requirements.txt      # Python Environment Dependencies
│
└── frontend/                 # Vite + React Client Dashboard Interface
    ├── src/                  # React Components & State Controllers
    ├── package.json          # Node.js Project Metadata & Modules
    └── vite.config.js
```

---

## 🛠️ Core Tech Stack
* **Frontend:** React.js, Vite, Axios (API Client Middleware), Modern Responsive CSS
* **Backend:** Python 3.10+, FastAPI (Asynchronous Web Framework), Uvicorn ASGI Server
* **Machine Learning & Engineering:** Scikit-Learn (Random Forest Regressor), Pandas, NumPy
* **Environment Management:** Python Virtual Environments (`.venv`), Node Package Manager (`npm`)

---

## ⚡ Step-by-Step Local Deployment Guide

### 1. Initialize and Run the FastAPI Backend Server
Open a terminal workspace window inside your project root and navigate to the backend subdirectory:
```bash
cd backend

# Create and activate an isolated Python environment sandbox
python -m venv .venv
source .venv/bin/activate  # On Windows PowerShell use: .venv\Scripts\activate

# Install strictly locked environment dependencies
python -m pip install fastapi uvicorn pandas scikit-learn

# Run the data engineering pipeline script to execute training logic
python train.py

# Launch the live API microservice gateway
python -m uvicorn main:app --reload --port 8000
```
*Verify the active interactive Swagger documentation layer at:* **`http://127.0.0`**

### 2. Initialize and Run the React UI Dashboard
Open a secondary independent terminal workspace window and navigate to the frontend directory:
```bash
cd frontend

# Install package dependencies cleanly
npm install --force

# Launch the local client rendering development server
npm run dev
```
*Open your web browser and navigate directly to your live app workspace at:* **`http://localhost:5173`**

---

## 🧠 Data Engineering & Feature Logic
To bypass structural limits present in raw synthetic dataset files, custom physical telemetry calculations were built directly into the data preprocessing layer:

1. **Energy Missing (kWh Calculation):**
   $$\text{Energy Required} = \frac{\text{Target \%} - \text{Start \%}}{100} \times \text{Battery Capacity (kWh)}$$
2. **Theoretical Operational Constraints:**
   $$\text{Theoretical Charging Hours} = \frac{\text{Energy Required (kWh)}}{\text{Charging Rate (kW)}}$$

The Scikit-Learn machine learning model utilizes these engineered features to accurately forecast duration parameters, outputting fast, responsive metrics to the front-end user experience window.
