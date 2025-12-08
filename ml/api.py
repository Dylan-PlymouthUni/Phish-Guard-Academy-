from __future__ import annotations

import io
import os
import re
import json
import time
import warnings
import logging
import base64
import shutil
import subprocess
import socket
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from collections import deque, defaultdict
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Request
from urllib.parse import urlparse

import joblib
import numpy as np
from fastapi.responses import JSONResponse, StreamingResponse, Response, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageOps
from prometheus_client import Counter, Histogram, generate_latest  # pip install prometheus-client

import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=False,
)

# Suppress PIL palette/transparency warning
warnings.filterwarnings(
    "ignore",
    message="Palette images with Transparency expressed in bytes should be converted to RGBA images",
    category=UserWarning,
)

# Try import pytesseract
try:
    import pytesseract  # type: ignore
    HAS_TESSERACT = True
except Exception:
    pytesseract = None
    HAS_TESSERACT = False

logger = structlog.get_logger("phishguard")

app = FastAPI(title="PhishGuard OCR + ML + Heuristics API")

# --- Security settings ---
API_KEY = os.getenv("API_KEY")  # set this in the environment to enforce auth
RATE_LIMIT_MAX = 60             # requests
RATE_LIMIT_WINDOW = 60.0        # seconds
_rate_buckets: defaultdict[str, deque] = defaultdict(deque)
EXEMPT_PATHS = (
    "/docs", "/openapi.json", "/web", "/app", "/favicon.ico", "/static", "/assets",
    "/health", "/metrics", "/"  # Add root path
)

def _is_exempt(path: str) -> bool:
    return any(path.startswith(p) for p in EXEMPT_PATHS)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: blob:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
    )
    return response

@app.middleware("http")
async def api_key_and_rate_limit(request: Request, call_next):
    path = request.url.path
    if not _is_exempt(path):
        # API key check (skip if no API_KEY set)
        if API_KEY:
            provided = request.headers.get("x-api-key")
            if provided != API_KEY:
                return Response(status_code=401, content="Unauthorized")
        # Rate limiting
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        bucket = _rate_buckets[ip]
        # drop old entries
        while bucket and now - bucket[0] > RATE_LIMIT_WINDOW:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT_MAX:
            return Response(status_code=429, content="Too Many Requests")
        bucket.append(now)
    return await call_next(request)

# CORS fix: allow your actual frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://jubilant-goldfish-g99j6jp4pw4hbpw-8000.app.github.dev",
        "https://*.app.github.dev",  # Allow all Codespaces domains
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure web directory exists then serve static frontend if available
WEB_DIR = Path(__file__).resolve().parents[1] / "web"
try:
    os.makedirs(WEB_DIR, exist_ok=True)
    logger.info("Ensured web directory exists at %s", str(WEB_DIR))
except Exception as e:
    logger.warning("Failed to ensure web directory: %s", e)

if WEB_DIR.exists():
    app.mount("/web", StaticFiles(directory=str(WEB_DIR)), name="web")
    logger.info("Mounted frontend at /web from %s", str(WEB_DIR))
else:
    logger.warning("Web directory not found at %s — frontend endpoints disabled", str(WEB_DIR))

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
MIN_CONF_KEEP = 20.0

# ---------------------------
# Image handling helpers
# ---------------------------
def _open_image_rgb_from_bytes(content: bytes) -> Image.Image:
    """
    Safely open uploaded image bytes and return an RGB Image.
    Handles paletted images with transparency by compositing onto white background.
    """
    buf = io.BytesIO(content)
    img = Image.open(buf)
    # Handle paletted images with transparency
    try:
        if img.mode == "P" and "transparency" in img.info:
            img = img.convert("RGBA")
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            return bg
        if img.mode == "RGBA":
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            return bg
    except Exception:
        pass
    return img.convert("RGB")

# ---------------------------
# Backwards-compatible helpers expected by tests
# ---------------------------
def preprocess_image_for_ocr(pil_img: Image.Image, max_dim: int = 1600) -> Image.Image:
    """
    Backwards-compatible wrapper used by tests.
    Uses the 'mean' preprocessing pipeline as a reasonable default.
    """
    try:
        w, h = pil_img.size
        if max(w, h) > max_dim:
            scale = max_dim / float(max(w, h))
            pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    except Exception:
        pass
    return preprocess_mean_threshold(pil_img)

def extract_text_and_boxes(pil_img: Image.Image) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Backwards-compatible synchronous wrapper expected by tests.
    If pytesseract is unavailable returns ("", []).
    """
    if not HAS_TESSERACT or pytesseract is None:
        return "", []

    try:
        return asyncio.run(try_multiple_ocr(pil_img))
    except Exception:
        try:
            pre = preprocess_image_for_ocr(pil_img)
            data = pytesseract.image_to_data(pre, output_type=pytesseract.Output.DICT, config="--psm 6")
            words = data.get("text", []) or []
            text = " ".join([w for w in words if w and w.strip()])
            boxes: List[Dict[str, Any]] = []
            n = len(words)
            for i in range(n):
                w = (words[i] or "").strip()
                if not w:
                    continue
                conf = _parse_conf(data.get("conf", [None]*n)[i]) if i < n else -1.0
                try:
                    left = int(data.get("left", [0]*n)[i])
                    top = int(data.get("top", [0]*n)[i])
                    width = int(data.get("width", [0]*n)[i])
                    height = int(data.get("height", [0]*n)[i])
                except Exception:
                    left = top = width = height = 0
                boxes.append({"word": w, "left": left, "top": top, "width": width, "height": height, "conf": conf})
            return text, boxes
        except Exception:
            return "", []

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
    enhanced = ImageEnhance.Contrast(img).enhance(1.4)
    blurred = enhanced.filter(ImageFilter.GaussianBlur(radius=1))
    arr = np.array(blurred)
    mean = int(arr.mean())
    thresh = max(80, mean - 15)
    bin_arr = (arr > thresh).astype(np.uint8) * 255
    return Image.fromarray(bin_arr)

def preprocess_invert(pil_img: Image.Image) -> Image.Image:
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

def preprocess_screenshot(pil_img: Image.Image) -> Image.Image:
    """Optimized for UI screenshots: preserve text while reducing noise."""
    img = pil_img.convert("L")
    img = _resize_if_large(img, 2000)
    
    # Denoise while keeping UI text sharp
    img = img.filter(ImageFilter.MedianFilter(2))
    img = ImageEnhance.Contrast(img).enhance(1.8)
    img = ImageEnhance.Sharpness(img).enhance(2.0)
    
    # CLAHE-like adaptive histogram
    arr = np.array(img)
    thresh = int(np.percentile(arr, 15))  # Darker threshold for UI
    bin_arr = (arr > thresh).astype(np.uint8) * 255
    return Image.fromarray(bin_arr)

PREPROCESS_FUNCS = {
    "none": preprocess_none,
    "mean": preprocess_mean_threshold,
    "adaptive": preprocess_adaptive,
    "invert": preprocess_invert,
    "screenshot": preprocess_screenshot,
}

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
    return await asyncio.to_thread(pytesseract.image_to_data, img, pytesseract.Output.DICT, config)

async def try_multiple_ocr(pil_img: Image.Image) -> Tuple[str, List[Dict[str, Any]]]:
    if not HAS_TESSERACT:
        return "", []

    strategies = [("none", preprocess_none), ("mean", preprocess_mean_threshold),
                  ("adaptive", preprocess_adaptive), ("invert", preprocess_invert)]
    psm_list = ["--psm 6", "--psm 3", "--psm 11", "--psm 1"]

    aggregated: Dict[str, Dict[str, Any]] = {}

    for name, func in strategies:
        try:
            proc_img = await asyncio.to_thread(func, pil_img)
        except Exception as e:
            logger.debug("preprocess %s failed: %s", name, e)
            continue

        for psm in psm_list:
            cfg = psm
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
                prev = aggregated.get(key)
                if prev is None or conf > prev["conf"]:
                    aggregated[key] = rec

    boxes = list(aggregated.values())
    boxes_sorted = sorted(boxes, key=lambda b: (b["top"], b["left"]))
    text_tokens = [b["word"] for b in boxes_sorted if b["word"]]
    full_text = " ".join(text_tokens)

    return full_text, boxes_sorted

# ---------------------------
# URL extraction & scoring
# ---------------------------
URL_RE = re.compile(
    r"""(?xi)\b(
        (?:https?://|http://|www\.)[^\s'")<>]+
        |
        (?:[A-Za-z0-9\-]{1,63}\.)+[A-Za-z]{2,}(?:/[^\s'")<>]*)?
    )""",
    re.VERBOSE,
)

def find_urls(text: str) -> List[str]:
    if not text:
        return []
    matches = []
    for m in URL_RE.finditer(text):
        u = m.group(0).strip()
        if re.match(r"^[A-Za-z0-9\-]+\.[A-Za-z]{2,}", u) or u.lower().startswith(("http", "www")):
            matches.append(u)
    seen = set()
    out = []
    for u in matches:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out

SUSPICIOUS_TLDS = {"zip", "review", "top", "men", "work"}

def heuristics_for_url(u: str) -> List[str]:
    reasons: List[str] = []
    raw = u.strip().rstrip('.,;:)\'"')
    if not raw.lower().startswith("https"):
        reasons.append("no_https")
    parsed = urlparse(raw if raw.startswith("http") else ("http://" + raw))
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    if host.count("-") > 2:
        reasons.append("many_hyphens")
    if len(path) > 60:
        reasons.append("long_path")
    if any(tok.isdigit() for tok in host.split(".")):
        reasons.append("ip_like_host")
    if re.search(r"(login|verify|secure|account|update|confirm|bank|paypal|free|urgent|reward)", u, re.I):
        reasons.append("suspicious_tokens")
    tld = host.split(".")[-1] if host else ""
    if tld in SUSPICIOUS_TLDS:
        reasons.append("suspicious_tld")
    return reasons

def extract_url_features(url: str) -> dict:
    """Extract comprehensive features from URL for ML model prediction.
    
    Must match the features in the training dataset:
    - url_length
    - domain_length
    - subdomain_count
    - has_https
    - has_suspicious_tokens
    - special_char_count
    - digit_count
    - path_length
    """
    u = url.strip().rstrip('.,;:)\'"')
    parsed = urlparse(u if u.startswith("http") else ("http://" + u))
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    
    return {
        "url_length": len(u),
        "domain_length": len(host),
        "subdomain_count": host.count(".") - 1 if host else 0,
        "has_https": 1 if u.lower().startswith("https") else 0,
        "has_suspicious_tokens": 1 if re.search(r"(login|verify|secure|account|update|confirm|bank|paypal|free|urgent|reward)", u, re.I) else 0,
        "special_char_count": u.count("-") + u.count("_"),
        "digit_count": sum(c.isdigit() for c in u),
        "path_length": len(path),
    }

def score_url(url: str) -> float:
    if MODEL_BUNDLE and "model" in MODEL_BUNDLE:
        try:
            feature_names = MODEL_BUNDLE.get("feature_names", [])
            features_dict = extract_url_features(url)
            
            # Create DataFrame with features in correct order
            import pandas as pd
            features_df = pd.DataFrame([{name: features_dict.get(name, 0) for name in feature_names}])
            
            model = MODEL_BUNDLE["model"]
            prob = float(model.predict_proba(features_df)[0, 1])
            return max(0.0, min(1.0, prob))
        except Exception as e:
            logger.debug("model scoring failed: %s", e)
    
    # Fallback heuristic scoring
    u = url.strip().rstrip('.,;:)\'"')
    parsed = urlparse(u if u.startswith("http") else ("http://" + u))
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    score = 0.0

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
    reasons: List[str] = []
    ml_confidence: Optional[float] = None
    ml_risk_percent: Optional[int] = None

class AnalyzeResponse(BaseModel):
    text: str
    urls: List[URLInfo]
    word_boxes: List[WordBox]

# ---------------------------
# Metrics
# ---------------------------
REQUEST_COUNT = Counter('http_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'Request latency', ['method', 'endpoint'])
ML_PREDICTIONS = Counter('ml_predictions_total', 'ML predictions', ['prediction'])

@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    latency = time.time() - start
    
    REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
    REQUEST_LATENCY.labels(request.method, request.url.path).observe(latency)
    
    # Structured logging
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        latency_seconds=round(latency, 3),
        client_ip=request.client.host if request.client else "unknown"
    )
    
    return response

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": MODEL_BUNDLE is not None}

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")

# ---------------------------
# Endpoints
# ---------------------------
# Mount the built React app (after existing /web mount)
DIST_DIR = Path(__file__).resolve().parents[1] / "phish-guard-academy" / "dist"
if DIST_DIR.exists():
    app.mount("/app", StaticFiles(directory=str(DIST_DIR), html=True), name="app")
    logger.info("Mounted React app at /app from %s", str(DIST_DIR))
else:
    logger.warning("React dist not found at %s — run 'npm run build' in phish-guard-academy/", str(DIST_DIR))

@app.get("/")
async def root():
    """Redirect root to the mounted React app if it exists, otherwise to the OpenAPI docs."""
    if DIST_DIR.exists():
        return RedirectResponse(url="/app/", status_code=301)  # <-- add trailing slash + permanent redirect
    web_index = WEB_DIR / "frontend.html"
    if web_index.exists():
        return RedirectResponse(url="/web/frontend.html", status_code=301)
    return RedirectResponse(url="/docs", status_code=301)

@app.get("/ocr_status")
async def ocr_status():
    tesseract_path = shutil.which("tesseract")
    tesseract_version = None
    if tesseract_path:
        try:
            out = subprocess.run([tesseract_path, "--version"], capture_output=True, text=True, timeout=3)
            tesseract_version = out.stdout.splitlines()[0] if out.returncode == 0 else out.stderr
        except Exception as e:
            tesseract_version = str(e)

    model_info: Dict[str, Any] = {"present": False}
    if MODEL_BUNDLE:
        model_info["present"] = True
        model_info["feature_count"] = len(MODEL_BUNDLE.get("feature_names", [])) if isinstance(MODEL_BUNDLE, dict) else 0
        if isinstance(MODEL_BUNDLE, dict) and "test_accuracy" in MODEL_BUNDLE:
            model_info["test_accuracy"] = float(MODEL_BUNDLE["test_accuracy"])

    return JSONResponse({
        "pytesseract_imported": bool(HAS_TESSERACT),
        "tesseract_binary": tesseract_path,
        "tesseract_version": tesseract_version,
        "model": model_info,
        "note": "Install system 'tesseract-ocr' package if binary missing."
    })

@app.post("/analyze_image", response_model=AnalyzeResponse)
async def analyze_image(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file too large")
    
    pil = _open_image_rgb_from_bytes(content)

    text, boxes = await try_multiple_ocr(pil)

    if not text.strip():
        try:
            fallback = preprocess_invert(pil)
            data = await _run_tesseract(fallback, "--psm 6")
            words = data.get("text", []) or []
            txt = " ".join([w for w in words if w and w.strip()])
            if txt.strip():
                text = txt
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
    url_infos: List[Dict[str, Any]] = []
    for u in urls:
        s = score_url(u)
        reasons = heuristics_for_url(u)
        ml_conf = None
        ml_risk_percent = None
        if MODEL_BUNDLE:
            try:
                scorer = MODEL_BUNDLE.get("ml_score") or MODEL_BUNDLE.get("score_fn")
                if callable(scorer):
                    mr = scorer(u)
                    if isinstance(mr, dict):
                        ml_conf = float(mr.get("confidence")) if mr.get("confidence") is not None else None
                        ml_risk_percent = int(mr.get("risk_percent") or mr.get("risk") or (None if ml_conf is None else round(ml_conf*100)))
            except Exception as e:
                logger.debug("Model bundle ml_score failed: %s", e)

        url_infos.append({
            "url": u,
            "score": s,
            "suspicious": s > 0.5,
            "reasons": reasons,
            "ml_confidence": ml_conf,
            "ml_risk_percent": ml_risk_percent,
        })

    out_boxes: List[Dict[str, Any]] = []
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

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """Analyze image for phishing using /analyze_screenshot (visual ML + OCR)."""
    return await analyze_screenshot(file)

@app.post("/annotated_image")
async def annotated_image(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file too large")
    
    pil = _open_image_rgb_from_bytes(content)

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

@app.post("/preprocessed_image")
async def preprocessed_image(file: UploadFile = File(...), strategy: str = Query("mean", description="one of: none, mean, adaptive, invert")):
    if strategy not in PREPROCESS_FUNCS:
        raise HTTPException(status_code=400, detail=f"Unknown strategy {strategy}")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    
    pil = _open_image_rgb_from_bytes(content)
    func = PREPROCESS_FUNCS[strategy]
    pre = await asyncio.to_thread(func, pil)
    buf = io.BytesIO()
    pre.convert("RGB").save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.post("/debug_ocr")
async def debug_ocr(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    
    pil = _open_image_rgb_from_bytes(content)

    orig_preview = pil.copy()
    orig_preview.thumbnail((1200, 1200))

    debug_runs: Dict[str, Any] = {}
    main_text = ""
    if HAS_TESSERACT:
        for name, fn in PREPROCESS_FUNCS.items():
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
    label: str
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

class TextAnalyzeRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None

@app.post("/analyze_text")
async def analyze_text(request: TextAnalyzeRequest):
    """Analyze text or URL without requiring file upload."""
    text = request.text or ""
    url = request.url or ""
    
    if not text and not url:
        raise HTTPException(status_code=400, detail="Provide text or url")
    
    # Combine text and URL for analysis
    combined = f"{text}\n{url}".strip()
    
    # Find URLs in the combined text
    urls = find_urls(combined)
    url_infos: List[Dict[str, Any]] = []
    
    for u in urls:
        s = score_url(u)  # This uses ML if available, else heuristic
        reasons = heuristics_for_url(u)
        
        # Calculate ML confidence
        ml_conf = s if MODEL_BUNDLE and "model" in MODEL_BUNDLE else None
        ml_risk_percent = int(round(s * 100)) if ml_conf is not None else None
        
        url_infos.append({
            "url": u,
            "score": s,
            "suspicious": s > 0.5,
            "reasons": reasons,
            "ml_confidence": ml_conf,
            "ml_risk_percent": ml_risk_percent,
        })
    
    # Return proper JSON response object
    return AnalyzeResponse(
        text=combined,
        urls=[URLInfo(**info) for info in url_infos],
        word_boxes=[]
    )

def main() -> None:
    """Train a new model on the ARFF features dataset and save to MODEL_PATH."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import classification_report, accuracy_score

    # Load ARFF features (assumes running in repo root where data/ is available)
    try:
        from scipy.io import arff
        import pandas as pd
    except Exception as e:
        logger.error("Failed to import ARFF loading dependencies: %s", e)
        return

    logger.info("Loading ARFF data...")
    try:
        data, meta = arff.loadarff("data/combined_features.arff")
        df = pd.DataFrame(data)
    except Exception as e:
        logger.error("Failed to load ARFF data: %s", e)
        return

    logger.info("ARFF data loaded, sample rows:")
    logger.info("%s", df.sample(min(len(df), 10)).to_string(index=False))

    # Encode string labels as integers
    label_col = "label"
    if df[label_col].dtype == "object":
        le = LabelEncoder()
        df[label_col] = le.fit_transform(df[label_col])
        logger.info("Encoded labels: %s", dict(enumerate(le.classes_)))

    # Split into train/test sets
    try:
        train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df[label_col])
    except Exception as e:
        logger.error("Failed to split data into train/test sets: %s", e)
        return

    logger.info("Train/test split: %d train, %d test", len(train_df), len(test_df))

    # Separate features and labels
    feature_cols = [c for c in df.columns if c != label_col]
    X_train, y_train = train_df[feature_cols], train_df[label_col]
    X_test, y_test = test_df[feature_cols], test_df[label_col]

    # Train a RandomForest model
    try:
        clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        clf.fit(X_train, y_train)
        logger.info("RandomForest model trained")
    except Exception as e:
        logger.error("Failed to train model: %s", e)
        return

    # Evaluate on test set
    logger.info("Evaluating model on test set...")
    try:
        y_pred = clf.predict(X_test)
        report = classification_report(y_test, y_pred, output_dict=True)
        logger.info("Classification report:\n%s", report)
        test_acc = accuracy_score(y_test, y_pred)
        logger.info("Test accuracy: %.4f", test_acc)
    except Exception as e:
        logger.error("Failed to evaluate model: %s", e)
        return

    # Save the trained model and feature metadata
    try:
        model_bundle = {
            "model": clf,
            "feature_names": feature_cols,
            "target_name": label_col,
            "test_accuracy": test_acc,
        }
        joblib.dump(model_bundle, MODEL_PATH)
        logger.info("Model saved to %s", MODEL_PATH)
    except Exception as e:
        logger.error("Failed to save model: %s", e)

    logger.info("Training complete")

def extract_screenshot_features(pil_img: Image.Image) -> dict:
    """Extract visual features from screenshot for phishing detection."""
    try:
        arr = np.array(pil_img.convert("RGB"))
        h, w = arr.shape[:2]
        
        # Color uniformity (real apps have consistent colors, phishing often doesn't)
        r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
        color_variance = float(np.var(r) + np.var(g) + np.var(b))
        
        # Edge density (phishing often has inconsistent borders/alignment)
        from scipy import ndimage
        edges = ndimage.sobel(np.mean(arr, axis=2))
        edge_density = float(np.sum(edges > 10) / (h * w))
        
        # Text region density (legitimate apps have structured text areas)
        from PIL import ImageStat
        stat = ImageStat.Stat(pil_img.convert("L"))
        text_density = float(stat.stddev[0] / (stat.mean[0] + 1e-6))
        
        return {
            "color_variance": color_variance,
            "edge_density": edge_density,
            "text_density": text_density,
            "aspect_ratio": float(w / h) if h > 0 else 1.0,
            "image_size": w * h,
        }
    except Exception as e:
        logger.debug("screenshot features failed: %s", e)
        return {"color_variance": 0, "edge_density": 0, "text_density": 0, "aspect_ratio": 1.0, "image_size": 0}

# Load screenshot model at startup
SCREENSHOT_MODEL_PATH = Path("ml/model/screenshot_phish_rf.joblib")
SCREENSHOT_MODEL_BUNDLE: Optional[Dict[str, Any]] = None
if SCREENSHOT_MODEL_PATH.exists():
    try:
        SCREENSHOT_MODEL_BUNDLE = joblib.load(SCREENSHOT_MODEL_PATH)
        logger.info(f"Loaded screenshot model from {SCREENSHOT_MODEL_PATH}")
    except Exception as e:
        logger.warning(f"Failed to load screenshot model: {e}")




@app.post("/analyze_screenshot")
async def analyze_screenshot(file: UploadFile = File(...)):
    """Analyze screenshot for phishing/scam indicators using combined signals."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    
    pil = _open_image_rgb_from_bytes(content)
    
    # Extract text (URLs, suspicious phrases)
    text, boxes = await try_multiple_ocr(pil)
    urls = find_urls(text)
    
    # 1. Check for suspicious URLs
    max_url_risk = 0.0
    for u in urls:
        s = score_url(u)
        max_url_risk = max(max_url_risk, s)
    
    # 2. Check for suspicious phrases
    suspicious_phrases = [
        "verify", "confirm", "update", "urgent", "immediate", "click here",
        "account locked", "suspended", "unusual activity", "re-enter",
        "action required", "click now", "expire", "limit exceeded"
    ]
    phrase_risk = 0.0
    detected_phrases = []
    for p in suspicious_phrases:
        if p.lower() in text.lower():
            detected_phrases.append(p)
            phrase_risk = max(phrase_risk, 0.4)
    if len(detected_phrases) > 2:
        phrase_risk = 0.7
    
    # 3. Extract visual features
    visual_features = extract_screenshot_features(pil)
    visual_risk = 0.0
    
    if visual_features.get("color_variance", 0) > 5000:
        visual_risk += 0.3
    if visual_features.get("edge_density", 0) > 0.05:
        visual_risk += 0.2
    if visual_features.get("text_density", 0) > 2.0:
        visual_risk += 0.25
    
    # 4. Use ML model (most important signal)
    model_risk = 0.0
    if SCREENSHOT_MODEL_BUNDLE and "model" in SCREENSHOT_MODEL_BUNDLE:
        try:
            import pandas as pd
            feature_names = SCREENSHOT_MODEL_BUNDLE.get("feature_names", [])
            # Create dict with ONLY the features the model expects
            features_dict = {}
            for fname in feature_names:
                if fname != "label":
                    features_dict[fname] = visual_features.get(fname, 0)
            
            if features_dict:
                X = pd.DataFrame([features_dict])
                model = SCREENSHOT_MODEL_BUNDLE["model"]
                probs = model.predict_proba(X)[0]
                # probs[0] = legitimate, probs[1] = phishing
                model_risk = float(probs[1]) if len(probs) > 1 else 0.0
                logger.info("Screenshot model prediction: phishing_prob=%.2f, features=%s", model_risk, features_dict)
        except Exception as e:
            logger.error("screenshot model scoring failed: %s", e)
            import traceback
            logger.error(traceback.format_exc())
    
    # Combine signals (visual ML model is strongest signal)
    overall_risk = max(
        max_url_risk * 0.3,      # URLs (30%)
        phrase_risk * 0.2,       # Phrases (20%)
        model_risk * 0.5         # Visual ML (50% - strongest)
    )
    
    # Compound signals more aggressively
    if model_risk > 0.5:
        overall_risk = min(0.99, overall_risk + 0.15)
    if max_url_risk > 0.5:
        overall_risk = min(0.99, overall_risk + 0.15)
    
    # Build URL infos
    url_infos = []
    for u in urls:
        s = score_url(u)
        reasons = heuristics_for_url(u)
        url_infos.append({
            "url": u,
            "score": s,
            "suspicious": s > 0.5,
            "reasons": reasons,
            "ml_risk_percent": int(round(s * 100)),
        })
    
    return JSONResponse({
        "ocr_text": text,
        "urls": url_infos,
        "detected_phrases": detected_phrases,
        "visual_features": visual_features,
        "url_risk_percent": int(round(max_url_risk * 100)),
        "phrase_risk_percent": int(round(phrase_risk * 100)),
        "model_risk_percent": int(round(model_risk * 100)),
        "visual_risk_percent": int(round(visual_risk * 100)),
        "overall_risk_percent": int(round(overall_risk * 100)),
    })

