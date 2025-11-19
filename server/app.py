from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re

app = FastAPI(title="PhishGuard API", version="0.1")

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Finding(BaseModel):
    type: str
    label: str
    detail: str
    severity: str  # "low" | "med" | "high"

class AnalysisResponse(BaseModel):
    risk: int  # 0..100
    findings: List[Finding]
    boxes: List[dict] = []  # image regions if any

URL_RE = re.compile(r"https?://[^\s]+", re.I)
LOOKALIKE_RE = re.compile(r"(paypaI|rnicrosoft|faceb00k|app1e|goog1e)", re.I)
URGENT_RE = re.compile(r"(urgent|immediately|24\s*hours|verify now|account (locked|closed))", re.I)

def score_from_signals(has_url: bool, urgent: bool, lookalike: bool) -> int:
    base = 5
    if urgent: base += 40
    if has_url: base += 20
    if lookalike: base += 30
    return max(5, min(98, base))

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(
    text: Optional[str] = Form(default=""),
    url: Optional[str] = Form(default=""),
    image: Optional[UploadFile] = File(default=None),
):
    # combine inputs for simple rule signals
    base = " ".join([text or "", url or ""]).strip()
    has_url = bool(URL_RE.search(base))
    urgent = bool(URGENT_RE.search(base))
    lookalike = bool(LOOKALIKE_RE.search(base))

    findings: List[Finding] = []
    if lookalike:
        findings.append(Finding(
            type="lookalike",
            label="Lookalike brand",
            detail="Possible homoglyphs detected in brand/domain.",
            severity="high",
        ))
    if has_url:
        findings.append(Finding(
            type="links",
            label="Contains links",
            detail="Verify destination domain matches the expected owner.",
            severity="high" if urgent else "med",
        ))
    if urgent:
        findings.append(Finding(
            type="urgent-language",
            label="Urgent language",
            detail="Pressure to act quickly detected.",
            severity="med",
        ))

    if not findings:
        findings.append(Finding(
            type="general",
            label="No strong cues",
            detail="No obvious phishing signals in provided input.",
            severity="low",
        ))

    risk = score_from_signals(has_url, urgent, lookalike)

    # Stub: no OCR or image region detection yet
    boxes: List[dict] = []

    return AnalysisResponse(risk=risk, findings=findings, boxes=boxes)
