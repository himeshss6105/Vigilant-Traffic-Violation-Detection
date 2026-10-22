
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
TRAFFIC_MODEL_PATH = BASE_DIR / "traffic_best.pt"
MIRROR_MODEL_PATH = BASE_DIR / "mirror_best.pt"

CONFIDENCE = float(os.getenv("YOLO_CONFIDENCE", "0.25"))
IMAGE_MAX_BYTES = 15 * 1024 * 1024

app = FastAPI(
    title="Vigilant Traffic YOLO Service",
    version="1.0.0",
)

traffic_model = None
mirror_model = None


@app.on_event("startup")
def load_models():
    global traffic_model, mirror_model

    if not TRAFFIC_MODEL_PATH.is_file():
        raise RuntimeError(f"Traffic model not found: {TRAFFIC_MODEL_PATH}")

    if not MIRROR_MODEL_PATH.is_file():
        raise RuntimeError(f"Mirror model not found: {MIRROR_MODEL_PATH}")

    traffic_model = YOLO(str(TRAFFIC_MODEL_PATH))
    mirror_model = YOLO(str(MIRROR_MODEL_PATH))

    print("Traffic model loaded:", traffic_model.names)
    print("Mirror model loaded:", mirror_model.names)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "traffic_model_loaded": traffic_model is not None,
        "mirror_model_loaded": mirror_model is not None,
    }


def format_detections(results):
    detections = []

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            x1, y1, x2, y2 = [
                round(float(value), 2)
                for value in box.xyxy[0].tolist()
            ]

            detections.append({
                "class_id": class_id,
                "class_name": result.names.get(
                    class_id, str(class_id)
                ),
                "confidence": round(confidence, 4),
                "box": [x1, y1, x2, y2],
            })

    return detections


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if traffic_model is None or mirror_model is None:
        raise HTTPException(
            status_code=503,
            detail="YOLO models are not loaded",
        )

    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=415,
            detail="Please upload an image file",
        )

    contents = await image.read(IMAGE_MAX_BYTES + 1)

    if not contents:
        raise HTTPException(status_code=400, detail="Empty image")

    if len(contents) > IMAGE_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 15 MB limit",
        )

    suffix = Path(image.filename or "upload.jpg").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
        suffix = ".jpg"

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix, delete=False
        ) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        traffic_results = await run_in_threadpool(
            lambda: traffic_model.predict(
                source=temp_path, conf=CONFIDENCE, verbose=False
            )
        )

        mirror_results = await run_in_threadpool(
            lambda: mirror_model.predict(
                source=temp_path, conf=CONFIDENCE, verbose=False
            )
        )

        # Original image size in pixels, so the Node server can convert the
        # pixel boxes into the 0-1000 coordinates the UI uses.
        image_height, image_width = traffic_results[0].orig_shape

        traffic_detections = format_detections(traffic_results)
        mirror_detections = format_detections(mirror_results)

        mirror_count = len(mirror_detections)

        return {
            "success": True,
            "image_filename": image.filename,
            "image_width": int(image_width),
            "image_height": int(image_height),
            "confidence_threshold": CONFIDENCE,
            "traffic": {
                "model": "traffic_best.pt",
                "detections": traffic_detections,
                "count": len(traffic_detections),
            },
            "mirrors": {
                "model": "mirror_best.pt",
                "detections": mirror_detections,
                "count": mirror_count,
                "assessment": (
                    "mirror_detections_found"
                    if mirror_count > 0
                    else "no_mirror_detections"
                ),
                "warning": (
                    "No detection does not prove that a mirror is absent. "
                    "Check image quality and model performance."
                ),
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        print("YOLO prediction error:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Image inference failed",
        ) from exc
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        await image.close()
