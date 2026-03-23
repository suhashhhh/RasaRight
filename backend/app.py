from io import BytesIO
import json
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
from torchvision import transforms, models


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "MobileNetV2" / "mobilenetv2_best.pt"
LABELS_PATH = BASE_DIR / "backend" / "labels.json"
NUTRITION_PATH = BASE_DIR / "backend" / "nutrition.json"


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
  return {
    "calories": 0.0,
    "carbs_g": 0.0,
    "protein_g": 0.0,
    "fats_g": 0.0,
    "sugar_g": 0.0,
    "salt_mg": 0.0,
  }


app = FastAPI(title="RasaRight Food Classifier")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

model = load_model()
ID_TO_LABEL = load_labels()
NUTRITION_BY_LABEL = load_nutrition()


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
async def classify(file: UploadFile = File(...)):
  if not file.content_type or not file.content_type.startswith("image/"):
    raise HTTPException(status_code=400, detail="Please upload an image file.")

  try:
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")
  except Exception as exc:
    raise HTTPException(status_code=400, detail="Could not read image.") from exc

  label, confidence = predict_image(image)
  nutrition = NUTRITION_BY_LABEL.get(label, _zero_nutrition())

  return {
    "label": label,
    "confidence": confidence,
    "nutrition": nutrition,
  }


@app.get("/health")
def health():
  return {"status": "ok"}

