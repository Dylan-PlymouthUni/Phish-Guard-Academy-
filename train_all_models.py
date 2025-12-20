#!/usr/bin/env python3
"""
Master Training Pipeline
Collects data and trains all models in sequence
"""
import subprocess
import sys
from pathlib import Path
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_command(cmd: list, description: str):
    """Run a command and handle errors"""
    logger.info("=" * 60)
    logger.info(f"STEP: {description}")
    logger.info("=" * 60)
    
    try:
        result = subprocess.run(
            cmd,
            check=True,
            text=True,
            capture_output=False
        )
        logger.info(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ {description} failed with error code {e.returncode}")
        return False


def main():
    """Run complete training pipeline"""
    print("\n")
    print("🎯" * 30)
    print("  PHISH GUARD ML - COMPLETE TRAINING PIPELINE")
    print("🎯" * 30)
    print(f"\nStarted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n")
    
    python_exe = sys.executable
    
    # Step 1: Collect training data
    if not run_command(
        [python_exe, "collect_training_data.py"],
        "Collecting Training Datasets"
    ):
        print("\n❌ Data collection failed. Aborting.")
        return 1
    
    print("\n" + "⏳" * 60)
    print("Datasets collected! Now training models...")
    print("⏳" * 60 + "\n")
    
    # Step 2: Train URL model
    if not run_command(
        [python_exe, "train_url_model.py"],
        "Training URL Phishing Detection Model"
    ):
        print("\n⚠️  URL model training failed, but continuing...")
    
    # Step 3: Train text model
    if not run_command(
        [python_exe, "train_text_model.py"],
        "Training Text/Email Phishing Detection Model"
    ):
        print("\n⚠️  Text model training failed, but continuing...")
    
    print("\n")
    print("🎉" * 30)
    print("  TRAINING PIPELINE COMPLETE!")
    print("🎉" * 30)
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n")
    
    print("=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    # Check what models exist
    model_dir = Path("ml/model")
    
    url_model = model_dir / "url_phish_rf_trained.joblib"
    text_model = model_dir / "text_classifier_trained"
    
    print(f"\n✅ URL Model: {'TRAINED' if url_model.exists() else 'NOT FOUND'}")
    print(f"   Location: {url_model}")
    
    print(f"\n✅ Text Model: {'TRAINED' if text_model.exists() else 'NOT FOUND'}")
    print(f"   Location: {text_model}")
    
    print("\n" + "=" * 60)
    print("🚀 NEXT STEPS")
    print("=" * 60)
    print("\n1. Update ensemble to use trained models:")
    print("   - Edit ml/ensemble.py")
    print("   - Load trained models in __init__")
    print("\n2. Restart API server:")
    print("   python -m uvicorn server.app:app --reload")
    print("\n3. Test improved accuracy:")
    print("   python test_api_ml.py")
    print("\n4. See dramatic improvement in detection! 🎯")
    print()


if __name__ == "__main__":
    sys.exit(main() or 0)
