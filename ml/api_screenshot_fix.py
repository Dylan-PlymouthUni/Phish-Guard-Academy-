# Replace the analyze_screenshot endpoint in api.py

@app.post("/analyze_screenshot")
async def analyze_screenshot(file: UploadFile = File(...)):
    """Analyze screenshot for phishing/scam indicators."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    
    pil = _open_image_rgb_from_bytes(content)
    
    # Extract text (URLs, suspicious phrases)
    text, boxes = await try_multiple_ocr(pil)
    urls = find_urls(text)
    
    # **SIMPLIFIED PHISHING DETECTION:**
    # 1. Check for suspicious URLs
    max_url_risk = 0.0
    for u in urls:
        s = score_url(u)
        max_url_risk = max(max_url_risk, s)
    
    # 2. Check for suspicious phrases in text
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
            phrase_risk = max(phrase_risk, 0.4)  # 40% base risk per phrase
    if len(detected_phrases) > 2:
        phrase_risk = 0.7  # Multiple phrases = 70% risk
    
    # 3. Extract visual features
    visual_features = extract_screenshot_features(pil)
    visual_risk = 0.0
    
    # Visual heuristics (phishing often has poor design)
    if visual_features.get("color_variance", 0) > 5000:
        visual_risk += 0.3  # High color variance = inconsistent design
    if visual_features.get("edge_density", 0) > 0.05:
        visual_risk += 0.2  # High edge density = busy/cluttered
    if visual_features.get("text_density", 0) > 2.0:
        visual_risk += 0.25  # High text variance = mixed font sizes
    
    # Use ML model if available
    model_risk = 0.0
    if SCREENSHOT_MODEL_BUNDLE and "model" in SCREENSHOT_MODEL_BUNDLE:
        try:
            import pandas as pd
            feature_names = SCREENSHOT_MODEL_BUNDLE.get("feature_names", [])
            # Filter features that exist in the model
            features_dict = {k: visual_features.get(k, 0) for k in feature_names if k != "label"}
            if features_dict:
                X = pd.DataFrame([features_dict])
                model = SCREENSHOT_MODEL_BUNDLE["model"]
                probs = model.predict_proba(X)[0]
                model_risk = float(probs[1]) if len(probs) > 1 else 0.0
        except Exception as e:
            logger.debug("screenshot model scoring failed: %s", e)
    
    # **Combine all signals** (take max, then apply weights)
    overall_risk = max(
        max_url_risk * 0.4,      # URLs are strong signal (40% weight)
        phrase_risk * 0.35,      # Phrases are medium signal (35% weight)
        model_risk * 0.25        # Visual ML model (25% weight)
    )
    
    # If multiple phishing indicators present, compound them
    if max_url_risk > 0.5 and phrase_risk > 0.3:
        overall_risk = min(0.95, overall_risk + 0.2)
    if model_risk > 0.5 and phrase_risk > 0.3:
        overall_risk = min(0.95, overall_risk + 0.15)
    
    # Analyze URLs
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
