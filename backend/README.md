# Naptech Factory OS Backend

FastAPI backend for the Naptech Factory OS MVP.

## Run Locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## API Groups

- `POST /auth/login`
- `POST /auth/register`
- `GET /inventory`
- `POST /inventory`
- `PUT /inventory/{id}`
- `DELETE /inventory/{id}`
- `GET /inventory/logs`
- `GET /tasks`
- `POST /tasks`
- `PUT /tasks/{id}`
- `PUT /tasks/{id}/complete`
- `GET /dashboard`
- `GET /notifications`

