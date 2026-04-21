# RasaRight🥓🍳🥞

RasaRight is a cross-platform nutrition tracking app built with Expo (React Native) and FastAPI.

The app lets users:
- sign up and log in
- upload/take food images
- classify foods and estimate nutrition
- view daily and weekly nutrition dashboards
- save and review meal logs

## Tech Stack

- Frontend: Expo + React Native + Expo Router
- Backend: FastAPI + Uvicorn
- Database: PostgreSQL
- ML/Nutrition: PyTorch-based model + nutrition mapping

## Prerequisites

- Node.js (LTS recommended)
- npm
- Python 3.10+
- PostgreSQL
- Expo Go (for physical phone testing)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Update values in `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://<your-laptop-ip>:8082
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/rasaright
```

Notes:
- Use your laptop LAN IP (not `localhost`) when testing on a phone.
- For web-only local testing, localhost is fine.

## Install Dependencies

Frontend:

```bash
npm install
```

Backend:

```bash
python -m pip install -r backend/requirements.txt
```

## Run the Project

### 1) Start backend API

Windows:

```bash
start_server.bat
```

The API runs on `http://0.0.0.0:8082`.

### 2) Start frontend for phone (recommended)

```bash
npm run start
```

This command uses `scripts/start_phone_dev.bat`, which:
- detects your current laptop IP
- sets mobile-safe Expo/API host values
- starts Expo in LAN mode
- avoids common `127.0.0.1` phone connection issues

### 3) Web only

```bash
npm run web
```

## Useful Scripts

- `npm run start` - phone-friendly startup flow
- `npm run start:phone` - same as `start`
- `npm run start:mobile` - Expo LAN + clear cache
- `npm run start:lan` - Expo LAN
- `npm run start:tunnel` - Expo tunnel (may be less reliable depending on ngrok)
- `npm run android` - open Android flow
- `npm run ios` - open iOS flow
- `npm run lint` - lint project

## Project Structure

- `app/` - app screens/routes (Expo Router)
- `lib/` - shared frontend logic (API/session helpers)
- `backend/` - FastAPI app and backend logic
- `scripts/` - helper scripts (firewall and mobile startup)
- `assets/` - icons/images

## Phone Connectivity Troubleshooting

If Expo Go cannot connect:

1. Confirm phone and laptop are on the same network.
2. Do not use `exp://127.0.0.1:...` on phone.
3. Run firewall helper as Administrator (once):

```bash
scripts\allow_rasaright_dev_firewall.bat
```

4. Verify backend from phone browser:

```text
http://<laptop-ip>:8082/health
```

5. Restart with cache clear:

```bash
npx expo start --lan --clear
```

## Reference Notes

- This repository is intended as a reference implementation for Expo + FastAPI + PostgreSQL mobile/web setup.
- If you reuse code, update:
  - environment variables
  - API base URLs
  - database credentials
  - app name/icons/branding
