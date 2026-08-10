# EV Charging Predictor

A FastAPI machine-learning API and Vite + React frontend for estimating EV charging duration.

## Local development

### Backend

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Docker

```bash
docker build -t ev-charging-predictor .
docker run -p 8000:8000 ev-charging-predictor
```

## Deployment

This repository includes a Render service definition in `render.yaml`.

### Render settings

- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
- Root Directory: repository root

The API consumes model artifacts from the `models` directory and serves the built Vite SPA when a production bundle exists in `frontend/dist`.
