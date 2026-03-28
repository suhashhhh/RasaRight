from io import BytesIO
import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from PIL import Image
import psycopg2
from psycopg2.extras import Json, RealDictCursor
import torch
from torchvision import transforms, models
import bcrypt
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
MODEL_PATH = BASE_DIR / "MobileNetV2" / "mobilenetv2_best.pt"
LABELS_PATH = BASE_DIR / "backend" / "labels.json"
NUTRITION_PATH = BASE_DIR / "backend" / "nutrition.json"
MULTIPLIER_MODEL_PATH = BASE_DIR / "backend" / "regression_layer" / "multiplier_model_matrix.json"
NUTRIENT_KEYS = ("calories", "carbs_g", "protein_g", "fats_g", "sugar_g", "salt_mg")
DATABASE_URL = os.getenv("DATABASE_URL", "")


class SignUpRequest(BaseModel):
  email: EmailStr
  username: str = Field(min_length=3, max_length=50)
  full_name: str | None = None
  gender: str | None = None
  password: str = Field(min_length=6)
  weight_kg: float | None = None
  height_cm: float | None = None
  health_conditions: list[str] = Field(default_factory=list)


class LoginRequest(BaseModel):
  identifier: str = Field(min_length=1)
  password: str = Field(min_length=1)


class NutritionPayload(BaseModel):
  calories: float = 0.0
  carbs_g: float = 0.0
  protein_g: float = 0.0
  fats_g: float = 0.0
  sugar_g: float = 0.0
  salt_mg: float = 0.0


class FoodLogCreate(BaseModel):
  user_id: str = Field(min_length=1)
  food_label: str = Field(min_length=1)
  confidence: float | None = None
  size: float = 0.5
  sweetness: float = 0.5
  saltiness: float = 0.5
  oiliness: float = 0.5
  base_nutrition: dict | None = None
  nutrition: NutritionPayload


def _get_num_classes() -> int:
  """Infer number of output classes from labels.json."""
  try:
    with LABELS_PATH.open("r", encoding="utf-8") as f:
      raw = json.load(f)
    return len(raw)
  except Exception:
    # Fallback to MobileNetV2 default if labels file is missing/unreadable.
    return 1000


def load_model() -> torch.nn.Module:
  """Load the MobileNetV2 model from disk once at startup."""
  path = str(MODEL_PATH)
  # Load a standard PyTorch checkpoint (state dict or full nn.Module).
  checkpoint = torch.load(path, map_location="cpu")

  # If we loaded a plain nn.Module, just use it.
  if isinstance(checkpoint, torch.nn.Module):
    model = checkpoint
  else:
    # Otherwise, assume we loaded a state dict-style checkpoint.
    state_dict = None
    if isinstance(checkpoint, dict):
      # Common patterns from training scripts.
      for key in ["model_state_dict", "state_dict", "model"]:
        if key in checkpoint and isinstance(checkpoint[key], dict):
          state_dict = checkpoint[key]
          break
      if state_dict is None:
        # Maybe the checkpoint itself is a bare state dict.
        state_dict = checkpoint
    else:
      raise RuntimeError("Unsupported checkpoint format for MobileNetV2 model.")

    num_classes = _get_num_classes()
    model = models.mobilenet_v2(weights=None, num_classes=num_classes)
    model.load_state_dict(state_dict)

  if hasattr(model, "eval"):
    model.eval()
  return model


def load_labels() -> dict[int, str]:
  """Load id->label mapping from labels.json."""
  with LABELS_PATH.open("r", encoding="utf-8") as f:
    raw = json.load(f)
  # File is of the form {"0": "Apam Balik", ...}
  return {int(k): str(v) for k, v in raw.items()}


def load_nutrition() -> dict[str, dict[str, float]]:
  """Load label->nutrition mapping from nutrition.json."""
  # Format example:
  # {"Nasi Lemak": {"calories": 644, "carbs_g": 53, ...}, ...}
  with NUTRITION_PATH.open("r", encoding="utf-8") as f:
    raw = json.load(f)

  nutrition: dict[str, dict[str, float]] = {}
  for label, vals in raw.items():
    if not isinstance(vals, dict):
      continue
    nutrition[str(label)] = {
      "calories": float(vals.get("calories", 0)),
      "carbs_g": float(vals.get("carbs_g", 0)),
      "protein_g": float(vals.get("protein_g", 0)),
      "fats_g": float(vals.get("fats_g", 0)),
      "sugar_g": float(vals.get("sugar_g", 0)),
      "salt_mg": float(vals.get("salt_mg", 0)),
    }
  return nutrition


def _zero_nutrition() -> dict[str, float]:
  return {k: 0.0 for k in NUTRIENT_KEYS}


def load_multiplier_model():
  """Load trained multiplier matrix model if available."""
  if not MULTIPLIER_MODEL_PATH.exists():
    return None
  try:
    with MULTIPLIER_MODEL_PATH.open("r", encoding="utf-8") as f:
      raw = json.load(f)
    weights = raw.get("weights")
    bias = raw.get("bias")
    if not isinstance(weights, list) or not isinstance(bias, list):
      return None
    if len(weights) != 4 or len(bias) != len(NUTRIENT_KEYS):
      return None
    # weights shape: [4, 6], bias shape: [6]
    for row in weights:
      if not isinstance(row, list) or len(row) != len(NUTRIENT_KEYS):
        return None
    return {
      "weights": [[float(v) for v in row] for row in weights],
      "bias": [float(v) for v in bias],
    }
  except Exception:
    return None


def _clamp01(v: float) -> float:
  return max(0.0, min(1.0, float(v)))


def get_db_conn():
  if not DATABASE_URL:
    return None
  try:
    return psycopg2.connect(DATABASE_URL)
  except Exception:
    return None


def ensure_db_tables():
  conn = get_db_conn()
  if conn is None:
    return
  try:
    with conn:
      with conn.cursor() as cur:
        cur.execute(
          """
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT,
            gender TEXT,
            password_hash TEXT NOT NULL,
            weight_kg DOUBLE PRECISION,
            height_cm DOUBLE PRECISION,
            health_conditions TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          """
        )
        # Backward-compatible migration for existing databases.
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;")
        cur.execute(
          """
          CREATE TABLE IF NOT EXISTS food_logs (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            food_label TEXT NOT NULL,
            confidence DOUBLE PRECISION,
            size DOUBLE PRECISION,
            sweetness DOUBLE PRECISION,
            saltiness DOUBLE PRECISION,
            oiliness DOUBLE PRECISION,
            calories DOUBLE PRECISION NOT NULL DEFAULT 0,
            carbs_g DOUBLE PRECISION NOT NULL DEFAULT 0,
            protein_g DOUBLE PRECISION NOT NULL DEFAULT 0,
            fats_g DOUBLE PRECISION NOT NULL DEFAULT 0,
            sugar_g DOUBLE PRECISION NOT NULL DEFAULT 0,
            salt_mg DOUBLE PRECISION NOT NULL DEFAULT 0,
            base_nutrition JSONB,
            logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          """
        )
        cur.execute(
          "CREATE INDEX IF NOT EXISTS idx_food_logs_user_logged ON food_logs (user_id, logged_at DESC);"
        )
  finally:
    conn.close()


def _parse_uuid(value: str, field: str) -> str:
  try:
    return str(UUID(str(value).strip()))
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=f"Invalid {field}.") from exc


def _fallback_multipliers(size: float, sweetness: float, saltiness: float, oiliness: float) -> list[float]:
  """
  Deterministic baseline multipliers used only when no trained model file exists.
  Keeps values sensible and monotonic while you iterate on training.
  """
  s = _clamp01(size)
  sw = _clamp01(sweetness)
  sa = _clamp01(saltiness)
  oi = _clamp01(oiliness)

  calories = 0.75 + 0.90 * s + 0.20 * oi + 0.05 * sw
  carbs = 0.80 + 0.70 * s + 0.25 * sw
  protein = 0.85 + 0.50 * s
  fats = 0.75 + 0.60 * s + 0.55 * oi
  sugar = 0.75 + 0.35 * s + 0.55 * sw
  salt = 0.75 + 0.35 * s + 0.70 * sa

  return [calories, carbs, protein, fats, sugar, salt]


def adjust_nutrition_with_multipliers(
  base_nutrition: dict[str, float], size: float, sweetness: float, saltiness: float, oiliness: float
) -> dict[str, float]:
  """
  Predict multipliers from sliders and apply them to base nutrition.
  Uses trained model when available; otherwise falls back to baseline mapping.
  """
  s = _clamp01(size)
  sw = _clamp01(sweetness)
  sa = _clamp01(saltiness)
  oi = _clamp01(oiliness)

  multipliers = None
  if MULTIPLIER_MODEL is not None:
    try:
      features = [s, sw, sa, oi]
      weights = MULTIPLIER_MODEL["weights"]
      bias = MULTIPLIER_MODEL["bias"]
      multipliers = []
      for j in range(len(NUTRIENT_KEYS)):
        v = bias[j]
        for i in range(4):
          v += features[i] * weights[i][j]
        multipliers.append(float(v))
    except Exception:
      multipliers = None

  if multipliers is None:
    multipliers = _fallback_multipliers(s, sw, sa, oi)

  adjusted: dict[str, float] = {}
  for key, m in zip(NUTRIENT_KEYS, multipliers):
    base_val = float(base_nutrition.get(key, 0.0))
    # Bound multiplier to avoid extreme values from regression noise.
    bounded_m = max(0.1, min(3.0, float(m)))
    adjusted[key] = max(0.0, base_val * bounded_m)
  return adjusted


app = FastAPI(title="RasaRight Food Classifier")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

ensure_db_tables()

model = load_model()
ID_TO_LABEL = load_labels()
NUTRITION_BY_LABEL = load_nutrition()
MULTIPLIER_MODEL = load_multiplier_model()


preprocess = transforms.Compose(
  [
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
      mean=[0.485, 0.456, 0.406],
      std=[0.229, 0.224, 0.225],
    ),
  ]
)


def predict_image(img: Image.Image) -> tuple[str, float]:
  """Run the model on a PIL image and return (label, confidence)."""
  with torch.no_grad():
    tensor = preprocess(img).unsqueeze(0)
    outputs = model(tensor)

    if isinstance(outputs, (list, tuple)):
      outputs = outputs[0]

    if outputs.ndim == 2:
      outputs = outputs[0]

    probs = torch.softmax(outputs, dim=-1)
    conf, idx = torch.max(probs, dim=-1)
    class_id = int(idx.item())
    confidence = float(conf.item())

    label = ID_TO_LABEL.get(class_id, f"class_{class_id}")
    return label, confidence


@app.post("/classify")
async def classify(
  file: UploadFile = File(...),
  size: float = Form(0.5),
  sweetness: float = Form(0.5),
  saltiness: float = Form(0.5),
  oiliness: float = Form(0.5),
):
  # Some iOS uploads may not include `content_type`; we still try to parse the bytes as an image.
  if file.content_type and not file.content_type.startswith("image/"):
    raise HTTPException(status_code=400, detail="Please upload an image file.")

  try:
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")
  except Exception as exc:
    raise HTTPException(status_code=400, detail="Could not read image.") from exc

  label, confidence = predict_image(image)
  base_nutrition = NUTRITION_BY_LABEL.get(label, _zero_nutrition())
  nutrition = adjust_nutrition_with_multipliers(
    base_nutrition=base_nutrition,
    size=size,
    sweetness=sweetness,
    saltiness=saltiness,
    oiliness=oiliness,
  )

  return {
    "label": label,
    "confidence": confidence,
    "sliders": {
      "size": _clamp01(size),
      "sweetness": _clamp01(sweetness),
      "saltiness": _clamp01(saltiness),
      "oiliness": _clamp01(oiliness),
    },
    "base_nutrition": base_nutrition,
    "nutrition": nutrition,
    "uses_trained_multiplier_model": MULTIPLIER_MODEL is not None,
  }


@app.post("/adjust")
async def adjust(
  label: str = Form(...),
  size: float = Form(0.5),
  sweetness: float = Form(0.5),
  saltiness: float = Form(0.5),
  oiliness: float = Form(0.5),
):
  """
  Recalculate nutrition for an already-detected label using current sliders.
  This avoids re-uploading the image when sliders change.
  """
  label = str(label)
  if label not in NUTRITION_BY_LABEL:
    raise HTTPException(status_code=404, detail="Unknown label.")

  base_nutrition = NUTRITION_BY_LABEL.get(label, _zero_nutrition())
  nutrition = adjust_nutrition_with_multipliers(
    base_nutrition=base_nutrition,
    size=size,
    sweetness=sweetness,
    saltiness=saltiness,
    oiliness=oiliness,
  )

  return {
    "label": label,
    "sliders": {
      "size": _clamp01(size),
      "sweetness": _clamp01(sweetness),
      "saltiness": _clamp01(saltiness),
      "oiliness": _clamp01(oiliness),
    },
    "base_nutrition": base_nutrition,
    "nutrition": nutrition,
    "uses_trained_multiplier_model": MULTIPLIER_MODEL is not None,
  }


@app.post("/auth/signup")
async def auth_signup(payload: SignUpRequest):
  conn = get_db_conn()
  if conn is None:
    raise HTTPException(status_code=500, detail="Database is not configured or unreachable.")

  user_id = str(uuid4())
  password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
  clean_conditions = [str(c).strip() for c in payload.health_conditions if str(c).strip()]
  clean_gender = str(payload.gender).strip().lower() if payload.gender is not None else None
  if clean_gender == "":
    clean_gender = None

  try:
    with conn:
      with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
          """
          INSERT INTO users (
            id, email, username, full_name, gender, password_hash,
            weight_kg, height_cm, health_conditions
          )
          VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
          RETURNING id, email, username, full_name, gender, weight_kg, height_cm, health_conditions;
          """,
          (
            user_id,
            payload.email.lower().strip(),
            payload.username.strip(),
            payload.full_name.strip() if payload.full_name else None,
            clean_gender,
            password_hash,
            payload.weight_kg,
            payload.height_cm,
            clean_conditions,
          ),
        )
        created = cur.fetchone()
  except psycopg2.Error as exc:
    msg = (exc.pgerror or "").lower()
    if "users_email_key" in msg or "email" in msg and "duplicate" in msg:
      raise HTTPException(status_code=409, detail="Email already registered.") from exc
    if "users_username_key" in msg or "username" in msg and "duplicate" in msg:
      raise HTTPException(status_code=409, detail="Username already taken.") from exc
    raise HTTPException(status_code=500, detail="Failed to create account.") from exc
  finally:
    conn.close()

  if created and created.get("id") is not None:
    created["id"] = str(created["id"])
  return {"ok": True, "user": created}


@app.post("/auth/login")
async def auth_login(payload: LoginRequest):
  conn = get_db_conn()
  if conn is None:
    raise HTTPException(status_code=500, detail="Database is not configured or unreachable.")

  identifier = payload.identifier.strip()
  try:
    with conn:
      with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
          """
          SELECT id, email, username, full_name, gender, password_hash, weight_kg, height_cm, health_conditions
          FROM users
          WHERE lower(email) = lower(%s) OR lower(username) = lower(%s)
          LIMIT 1;
          """,
          (identifier, identifier),
        )
        row = cur.fetchone()
  finally:
    conn.close()

  if not row:
    raise HTTPException(status_code=401, detail="Invalid credentials.")

  stored_hash = str(row.get("password_hash", ""))
  if not stored_hash or not bcrypt.checkpw(payload.password.encode("utf-8"), stored_hash.encode("utf-8")):
    raise HTTPException(status_code=401, detail="Invalid credentials.")

  row.pop("password_hash", None)
  if row.get("id") is not None:
    row["id"] = str(row["id"])
  return {"ok": True, "user": row}


@app.post("/logs")
async def create_food_log(payload: FoodLogCreate):
  conn = get_db_conn()
  if conn is None:
    raise HTTPException(status_code=500, detail="Database is not configured or unreachable.")

  uid = _parse_uuid(payload.user_id, "user id")
  n = payload.nutrition
  base_payload = (
    Json(payload.base_nutrition) if isinstance(payload.base_nutrition, dict) else None
  )
  log_id = str(uuid4())

  try:
    with conn:
      with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT 1 FROM users WHERE id = %s::uuid LIMIT 1;", (uid,))
        if cur.fetchone() is None:
          raise HTTPException(status_code=404, detail="User not found.")

        cur.execute(
          """
          INSERT INTO food_logs (
            id, user_id, food_label, confidence,
            size, sweetness, saltiness, oiliness,
            calories, carbs_g, protein_g, fats_g, sugar_g, salt_mg,
            base_nutrition
          )
          VALUES (
            %s::uuid, %s::uuid, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s
          )
          RETURNING id, food_label, logged_at;
          """,
          (
            log_id,
            uid,
            payload.food_label.strip(),
            payload.confidence,
            float(payload.size),
            float(payload.sweetness),
            float(payload.saltiness),
            float(payload.oiliness),
            float(n.calories),
            float(n.carbs_g),
            float(n.protein_g),
            float(n.fats_g),
            float(n.sugar_g),
            float(n.salt_mg),
            base_payload,
          ),
        )
        row = cur.fetchone()
  except HTTPException:
    raise
  except psycopg2.Error as exc:
    raise HTTPException(status_code=500, detail="Failed to save food log.") from exc
  finally:
    conn.close()

  return {"ok": True, "log": row}


@app.get("/logs")
def list_food_logs(user_id: str):
  conn = get_db_conn()
  if conn is None:
    raise HTTPException(status_code=500, detail="Database is not configured or unreachable.")

  uid = _parse_uuid(user_id, "user id")
  try:
    with conn:
      with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
          """
          SELECT id, food_label, logged_at, confidence
          FROM food_logs
          WHERE user_id = %s::uuid
          ORDER BY logged_at DESC
          LIMIT 500;
          """,
          (uid,),
        )
        rows = cur.fetchall()
  finally:
    conn.close()

  logs = []
  for r in rows:
    logged_at = r.get("logged_at")
    logs.append(
      {
        "id": str(r.get("id")),
        "food_label": r.get("food_label"),
        "logged_at": logged_at.isoformat() if logged_at else None,
        "confidence": r.get("confidence"),
      }
    )

  return {"ok": True, "logs": logs}


@app.delete("/logs/{log_id}")
def delete_food_log(log_id: str, user_id: str):
  conn = get_db_conn()
  if conn is None:
    raise HTTPException(status_code=500, detail="Database is not configured or unreachable.")

  lid = _parse_uuid(log_id, "log id")
  uid = _parse_uuid(user_id, "user id")
  try:
    with conn:
      with conn.cursor() as cur:
        cur.execute(
          "DELETE FROM food_logs WHERE id = %s::uuid AND user_id = %s::uuid;",
          (lid, uid),
        )
        if cur.rowcount == 0:
          raise HTTPException(status_code=404, detail="Log not found.")
  except HTTPException:
    raise
  except psycopg2.Error as exc:
    raise HTTPException(status_code=500, detail="Failed to delete log.") from exc
  finally:
    conn.close()

  return {"ok": True}


@app.get("/logs/summary")
def food_logs_summary(user_id: str):
  conn = get_db_conn()
  if conn is None:
    raise HTTPException(status_code=500, detail="Database is not configured or unreachable.")

  uid = _parse_uuid(user_id, "user id")
  try:
    with conn:
      with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
          """
          SELECT
            COALESCE(SUM(calories), 0) AS calories,
            COALESCE(SUM(carbs_g), 0) AS carbs_g,
            COALESCE(SUM(protein_g), 0) AS protein_g,
            COALESCE(SUM(fats_g), 0) AS fats_g,
            COALESCE(SUM(sugar_g), 0) AS sugar_g,
            COALESCE(SUM(salt_mg), 0) AS salt_mg,
            COUNT(*)::int AS entries
          FROM food_logs
          WHERE user_id = %s::uuid
            AND (logged_at AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date;
          """,
          (uid,),
        )
        today_row = cur.fetchone()

        cur.execute(
          """
          SELECT
            (logged_at AT TIME ZONE 'UTC')::date AS d,
            COALESCE(SUM(calories), 0) AS calories,
            COALESCE(SUM(carbs_g), 0) AS carbs_g,
            COALESCE(SUM(protein_g), 0) AS protein_g,
            COALESCE(SUM(fats_g), 0) AS fats_g,
            COALESCE(SUM(sugar_g), 0) AS sugar_g,
            COALESCE(SUM(salt_mg), 0) AS salt_mg,
            COUNT(*)::int AS entries
          FROM food_logs
          WHERE user_id = %s::uuid
            AND (logged_at AT TIME ZONE 'UTC')::date
              >= (NOW() AT TIME ZONE 'UTC')::date - INTERVAL '6 days'
          GROUP BY (logged_at AT TIME ZONE 'UTC')::date
          ORDER BY d ASC;
          """,
          (uid,),
        )
        week_rows = cur.fetchall()
  finally:
    conn.close()

  today_date = datetime.now(timezone.utc).date()
  week_by_day: dict[str, dict] = {}
  for wr in week_rows:
    d = wr.get("d")
    key = d.isoformat() if isinstance(d, date) else str(d)
    week_by_day[key] = {
      "date": key,
      "calories": float(wr.get("calories") or 0),
      "carbs_g": float(wr.get("carbs_g") or 0),
      "protein_g": float(wr.get("protein_g") or 0),
      "fats_g": float(wr.get("fats_g") or 0),
      "sugar_g": float(wr.get("sugar_g") or 0),
      "salt_mg": float(wr.get("salt_mg") or 0),
      "entries": int(wr.get("entries") or 0),
    }

  start = today_date - timedelta(days=6)
  week_out: list[dict] = []
  for i in range(7):
    d = start + timedelta(days=i)
    key = d.isoformat()
    week_out.append(
      week_by_day.get(
        key,
        {
          "date": key,
          "calories": 0.0,
          "carbs_g": 0.0,
          "protein_g": 0.0,
          "fats_g": 0.0,
          "sugar_g": 0.0,
          "salt_mg": 0.0,
          "entries": 0,
        },
      )
    )

  return {
    "ok": True,
    "today": {
      "date": today_date.isoformat(),
      "calories": float(today_row.get("calories") or 0),
      "carbs_g": float(today_row.get("carbs_g") or 0),
      "protein_g": float(today_row.get("protein_g") or 0),
      "fats_g": float(today_row.get("fats_g") or 0),
      "sugar_g": float(today_row.get("sugar_g") or 0),
      "salt_mg": float(today_row.get("salt_mg") or 0),
      "entries": int(today_row.get("entries") or 0),
    },
    "week": week_out,
  }


@app.get("/health")
def health():
  return {"status": "ok"}

