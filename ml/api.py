from __future__ import annotations

import io
import os
import re
import json
import time
import socket
import logging
import base64
import shutil
import subprocess
import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import joblib
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageOps

# Try import pytesseract
try:
    import pytesseract  # type: ignore
    HAS_TESSERACT = True
except Exception:
    pytesseract = None
    HAS_TESSERACT = False

logger = logging.getLogger("phishguard")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PhishGuard OCR + ML + Heuristics API")

# Serve static frontend
app.mount("/web", StaticFiles(directory="web"), name="web")

# Allow local dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model loading (optional)
MODEL_PATH = Path("ml/model/phish_rf_full.joblib")
MODEL_BUNDLE: Optional[Dict[str, Any]] = None
if MODEL_PATH.exists():
    try:
        MODEL_BUNDLE = joblib.load(MODEL_PATH)
        logger.info(f"Loaded model bundle from {MODEL_PATH}")
    except Exception as e:
        logger.warning(f"Failed to load model bundle: {e}")

# Config
MAX_UPLOAD_BYTES = 8_000_000  # 8 MB
MIN_CONF_KEEP = 20.0  # keep words with conf >= this (when possible)

# ---------------------------
# Preprocessing helpers
# ---------------------------
def _resize_if_large(img: Image.Image, max_dim: int = 2000) -> Image.Image:
    w, h = img.size
    if max(w, h) > max_dim:
        scale = max_dim / float(max(w, h))
        return img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return img

def preprocess_mean_threshold(pil_img: Image.Image) -> Image.Image:
    img = pil_img.convert("L")
    img = _resize_if_large(img, 2000)
    img = img.filter(ImageFilter.MedianFilter(3))
    img = ImageEnhance.Contrast(img).enhance(1.6)
    arr = np.array(img)
    thresh = int(arr.mean() * 0.95)
    bin_arr = (arr > thresh).astype(np.uint8) * 255
    return Image.fromarray(bin_arr)

def preprocess_adaptive(pil_img: Image.Image) -> Image.Image:
    img = pil_img.convert("L")
    img = _resize_if_large(img, 2000)
    img = img.filter(ImageFilter.MedianFilter(3))
    # simple adaptive: local mean using small boxes via PIL's point transform is heavy;
    # approximate by using ImageOps.autocontrast then adaptive-like threshold via gaussian blur
    enhanced = ImageEnhance.Contrast(img).enhance(1.4)
    blurred = enhanced.filter(ImageFilter.GaussianBlur(radius=1))
    arr = np.array(blurred)
    # compute local-ish threshold: mean of whole image as fallback
    mean = int(arr.mean())
    thresh = max(80, mean - 15)
    bin_arr = (arr > thresh).astype(np.uint8) * 255
    return Image.fromarray(bin_arr)

def preprocess_invert(pil_img: Image.Image) -> Image.Image:
    # Some screenshots have white-on-dark; invert then threshold
    img = pil_img.convert("L")
    img = _resize_if_large(img, 2000)
    img = ImageOps.invert(img)
    img = ImageEnhance.Contrast(img).enhance(1.6)
    arr = np.array(img)
    thresh = int(arr.mean() * 0.95)
    bin_arr = (arr > thresh).astype(np.uint8) * 255
    return Image.fromarray(bin_arr)

def preprocess_none(pil_img: Image.Image) -> Image.Image:
    img = pil_img.convert("L")
    return _resize_if_large(img, 2000)

# ---------------------------
# OCR orchestration & aggregation
# ---------------------------
def _parse_conf(raw_conf: Any) -> float:
    try:
        return float(raw_conf)
    except Exception:
        try:
            return float(str(raw_conf).strip())
        except Exception:
            return -1.0

async def _run_tesseract(img: Image.Image, config: str) -> Dict[str, Any]:
    # run in thread to avoid blocking
    return await asyncio.to_thread(pytesseract.image_to_data, img, pytesseract.Output.DICT, config)

async def try_multiple_ocr(pil_img: Image.Image) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Try multiple preprocessing + PSM combos and aggregate results.
    Returns aggregated text and list of word boxes with best confidences seen.
    """
    if not HAS_TESSERACT:
        return "", []

    strategies = [
        ("none", preprocess_none),
        ("mean", preprocess_mean_threshold),
        ("adaptive", preprocess_adaptive),
        ("invert", preprocess_invert),
    ]
    # psm candidates helpful for screenshots/mixed content
    psm_list = ["--psm 6", "--psm 3", "--psm 11", "--psm 1"]

    aggregated: Dict[str, Dict[str, Any]] = {}  # key -> best record
    records_all: List[Tuple[str, Dict[str, Any]]] = []

    for name, func in strategies:
        try:
            proc_img = await asyncio.to_thread(func, pil_img)
        except Exception as e:
            logger.debug("preprocess %s failed: %s", name, e)
            continue

        for psm in psm_list:
            cfg = psm  # can be extended with OEM if desired
            try:
                data = await _run_tesseract(proc_img, cfg)
            except Exception as e:
                logger.debug("tesseract run failed (%s %s): %s", name, cfg, e)
                continue

            words = data.get("text", []) or []
            n = len(words)
            for i in range(n):
                w = (words[i] or "").strip()
                if not w:
                    continue
                conf_raw = data.get("conf", [None]*n)[i] if i < n else None
                conf = _parse_conf(conf_raw)
                left = int(data.get("left", [0]*n)[i]) if i < n else 0
                top = int(data.get("top", [0]*n)[i]) if i < n else 0
                width = int(data.get("width", [0]*n)[i]) if i < n else 0
                height = int(data.get("height", [0]*n)[i]) if i < n else 0

                key = f"{w.lower()}::{left}::{top}::{width}::{height}"
                rec = {"word": w, "conf": conf, "left": left, "top": top, "width": width, "height": height}
                records_all.append((name + "|" + cfg, rec))
                # track best by confidence for identical bounding / text keys
                prev = aggregated.get(key)
                if prev is None or conf > prev["conf"]:
                    aggregated[key] = rec

    # Build ordered text by sorting boxes top->left
    boxes = list(aggregated.values())
    boxes_sorted = sorted(boxes, key=lambda b: (b["top"], b["left"]))
    text_tokens = [b["word"] for b in boxes_sorted if b["word"]]
    full_text = " ".join(text_tokens)

    return full_text, boxes_sorted

# ---------------------------
# URL extraction & scoring
# ---------------------------
# more tolerant URL/domain regex: capture scheme, www, or bare domain.tld/paths
URL_RE = re.compile(
    r"""(?xi)\b(                                   # capture whole
        (?:https?://|http://|www\.)[^\s'")<>]+     # full URLs with scheme or www
        |                                          
        (?:[A-Za-z0-9\-]{1,63}\.)+[A-Za-z]{2,}(?:/[^\s'")<>]*)?  # bare domain.tld + optional path
    )"""
, re.VERBOSE)

def find_urls(text: str) -> List[str]:
    if not text:
        return []
    matches = []
    for m in URL_RE.finditer(text):
        u = m.group(0).strip()
        # ignore very short dots like "e.g." by requiring a TLD-like pattern
        if re.match(r"^[A-Za-z0-9\-]+\.[A-Za-z]{2,}", u) or u.lower().startswith(("http", "www")):
            matches.append(u)
    # dedupe preserving order
    seen = set()
    out = []
    for u in matches:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out

SUSPICIOUS_TLDS = {"zip", "review", "top", "men", "work"}  # example suspect tlds

def score_url(url: str) -> float:
    """
    Heuristic scoring in [0,1]. If model present, try model first.
    """
    if MODEL_BUNDLE and "model" in MODEL_BUNDLE:
        try:
            featurize = MODEL_BUNDLE.get("featurize_fn", lambda u: [0])
            features = featurize(url)
            model = MODEL_BUNDLE["model"]
            prob = float(model.predict_proba([features])[0, 1])
            return max(0.0, min(1.0, prob))
        except Exception as e:
            logger.debug("model scoring failed: %s", e)

    u = url.strip()
    # normalize remove trailing punctuation
    u = u.rstrip('.,;:)\'"')
    parsed = urlparse(u if u.startswith("http") else ("http://" + u))
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    score = 0.0

    # short heuristics
    if not u.lower().startswith("https"):
        score += 0.15
    if host.count("-") > 2 or host.count(".") > 3:
        score += 0.15
    if any(tok.isdigit() for tok in host.split(".")):
        score += 0.1
    if len(path) > 60:
        score += 0.15
    if re.search(r"(login|verify|secure|account|update|confirm|bank|paypal|free|urgent|reward)", u, re.I):
        score += 0.3
    # suspicious tld
    tld = host.split(".")[-1] if host else ""
    if tld in SUSPICIOUS_TLDS:
        score += 0.2

    return min(1.0, score)

# ---------------------------
# Helpers / debug
# ---------------------------
def image_to_base64_png(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")

# ---------------------------
# Pydantic models
# ---------------------------
class WordBox(BaseModel):
    word: str
    left: int
    top: int
    width: int
    height: int
    conf: float

class URLInfo(BaseModel):
    url: str
    score: float
    suspicious: bool

class AnalyzeResponse(BaseModel):
    text: str
    urls: List[URLInfo]
    word_boxes: List[WordBox]

# ---------------------------
# Endpoints
# ---------------------------
@app.get("/ocr_status")
async def ocr_status():
    """Return pytesseract import and tesseract binary status."""
    tesseract_path = shutil.which("tesseract")
    tesseract_version = None
    if tesseract_path:
        try:
            out = subprocess.run([tesseract_path, "--version"], capture_output=True, text=True, timeout=3)
            tesseract_version = out.stdout.splitlines()[0] if out.returncode == 0 else out.stderr
        except Exception as e:
            tesseract_version = str(e)
    return JSONResponse({
        "pytesseract_imported": bool(HAS_TESSERACT),
        "tesseract_binary": tesseract_path,
        "tesseract_version": tesseract_version,
        "note": "Install system 'tesseract-ocr' package if binary missing."
    })

@app.post("/analyze_image", response_model=AnalyzeResponse)
async def analyze_image(file: UploadFile = File(...)):
    """Analyze uploaded image and return text, urls and boxes."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file too large")
    try:
        pil = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    text, boxes = await try_multiple_ocr(pil)

    # If text empty, try a fallback invert or increased contrast run synchronously
    if not text.strip():
        try:
            fallback = preprocess_invert(pil)
            data = await _run_tesseract(fallback, "--psm 6")
            words = data.get("text", []) or []
            txt = " ".join([w for w in words if w and w.strip()])
            if txt.strip():
                text = txt
                # reconstruct boxes simply from data
                boxes = []
                n = len(words)
                for i in range(n):
                    w = (words[i] or "").strip()
                    if not w:
                        continue
                    conf = _parse_conf(data.get("conf", [None]*n)[i]) if i < n else -1.0
                    left = int(data.get("left", [0]*n)[i]) if i < n else 0
                    top = int(data.get("top", [0]*n)[i]) if i < n else 0
                    width = int(data.get("width", [0]*n)[i]) if i < n else 0
                    height = int(data.get("height", [0]*n)[i]) if i < n else 0
                    boxes.append({"word": w, "left": left, "top": top, "width": width, "height": height, "conf": conf})
        except Exception:
            pass

    urls = find_urls(text)
    url_infos = []
    for u in urls:
        s = score_url(u)
        url_infos.append({"url": u, "score": s, "suspicious": s > 0.5})

    # sanitize boxes to pydantic-friendly types and ensure conf present
    out_boxes = []
    for b in boxes:
        try:
            out_boxes.append({
                "word": str(b.get("word", "")),
                "left": int(b.get("left", 0)),
                "top": int(b.get("top", 0)),
                "width": int(b.get("width", 0)),
                "height": int(b.get("height", 0)),
                "conf": float(b.get("conf", -1.0)),
            })
        except Exception:
            continue

    return {"text": text, "urls": url_infos, "word_boxes": out_boxes}

@app.post("/annotated_image")
async def annotated_image(file: UploadFile = File(...)):
    """Return an annotated PNG where suspicious words/URLs are boxed."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file too large")
    try:
        pil = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    text, boxes = await try_multiple_ocr(pil)
    urls = find_urls(text)
    suspicious_parts = set()
    for u in urls:
        suspicious_parts.update(re.findall(r"[A-Za-z0-9\-\._]+", u))

    draw = ImageDraw.Draw(pil)
    for b in boxes:
        word = b.get("word", "")
        if any(part.lower() in word.lower() for part in suspicious_parts):
            left = int(b.get("left", 0))
            top = int(b.get("top", 0))
            right = left + int(b.get("width", 0))
            bottom = top + int(b.get("height", 0))
            draw.rectangle([left, top, right, bottom], outline="red", width=2)

    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.post("/debug_ocr")
async def debug_ocr(file: UploadFile = File(...)):
    """Return base64 preprocessed image and detailed OCR runs for debugging."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    try:
        pil = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    orig_preview = pil.copy()
    orig_preview.thumbnail((1200, 1200))

    debug_runs: Dict[str, Any] = {}
    main_text = ""
    if HAS_TESSERACT:
        strategies = {
            "none": preprocess_none,
            "mean": preprocess_mean_threshold,
            "adaptive": preprocess_adaptive,
            "invert": preprocess_invert,
        }
        for name, fn in strategies.items():
            try:
                pre = await asyncio.to_thread(fn, pil)
                pre_b64 = image_to_base64_png(pre)
                run_info: Dict[str, Any] = {"preprocessed_image_base64": pre_b64, "psms": {}}
                for psm in ["--psm 6", "--psm 3", "--psm 11", "--psm 1"]:
                    try:
                        data = await _run_tesseract(pre, psm)
                        txt = " ".join([t for t in data.get("text", []) if t and t.strip()])
                        run_info["psms"][psm] = {
                            "text": txt,
                            "n_raw_words": len(data.get("text", [])),
                            "sample_conf": data.get("conf", [])[:10] if data.get("conf") else []
                        }
                        if not main_text and txt.strip():
                            main_text = txt
                    except Exception as e:
                        run_info["psms"][psm] = {"error": str(e)}
                debug_runs[name] = run_info
            except Exception as e:
                debug_runs[name] = {"error": str(e)}
    else:
        debug_runs = {"error": "pytesseract not available in Python environment"}

    return JSONResponse({
        "pytesseract_imported": bool(HAS_TESSERACT),
        "tesseract_binary": shutil.which("tesseract"),
        "ocr_text": main_text,
        "debug_runs": debug_runs,
        "orig_preview_base64": image_to_base64_png(orig_preview),
    })

# ---------------------------
# Feedback & enrichment endpoints
# ---------------------------
FEEDBACK_DIR = Path("data")
FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
FEEDBACK_FILE = FEEDBACK_DIR / "feedback.jsonl"

class FeedbackItem(BaseModel):
    url: str
    label: str  # "phishing", "benign", etc.
    notes: Optional[str] = None
    timestamp: Optional[float] = None

def _append_feedback_line(line: str) -> None:
    with FEEDBACK_FILE.open("a", encoding="utf-8") as f:
        f.write(line + "\n")

@app.post("/feedback")
async def submit_feedback(item: FeedbackItem):
    item.timestamp = item.timestamp or time.time()
    line = json.dumps(item.model_dump())
    await asyncio.to_thread(_append_feedback_line, line)
    return JSONResponse({"status": "ok", "written": True})

@app.get("/enrich_url")
async def enrich_url(url: str):
    parsed = urlparse(url if url.startswith("http") else f"https://{url}")
    hostname = parsed.hostname or ""
    domain = hostname.split(":")[0] if hostname else ""
    resp: Dict[str, Any] = {"url": url, "hostname": hostname, "domain": domain}
    try:
        if domain:
            ip = await asyncio.to_thread(socket.gethostbyname, domain)
            resp["ip"] = ip
    except Exception as e:
        resp["ip_error"] = str(e)
    return JSONResponse(resp)