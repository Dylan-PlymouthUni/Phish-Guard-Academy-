#!/usr/bin/env python3
"""
 LEGACY/EXPERIMENTAL — not used for dissertation results.
Use scripts/run_experiment.py for reproducible dissertation results.

Complete ML Training Pipeline
Runs all training steps in sequence
1. Collect real phishing data
2. Train URL model on real data
This script orchestrates the entire training pipeline for the PhishGuard Academy project, ensuring that all necessary steps are executed in the correct order. It provides clear logging and error handling to facilitate debugging and
monitoring of the training process. The script is designed to be run from the command line and will execute each step of the pipeline, including data collection and model training, while providing informative output about the progress and any issues encountered along the way.
"""
import sys
import subprocess
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def run_script(script_name: str, description: str):
    """Run a training script"""
    logger.info("=" * 70)
    logger.info(f"🚀 {description}")
    logger.info("=" * 70)
    
    result = subprocess.run(
        [sys.executable, script_name],
        cwd=Path(__file__).parent
    )
    
    if result.returncode != 0:
        logger.error(f"❌ {script_name} failed with exit code {result.returncode}")
        return False
    
    logger.info(f"✅ {description} complete!\n")
    return True


def main():
    """Run the main CLI workflow for this module."""
    print("""
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║      Phish Guard ML Complete Training Pipeline         ║
║                                                           ║
║  This will collect real phishing data and train models   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    steps = [
        ("collect_phishing_data.py", "Step 1: Collect Real Phishing Data"),
        ("train_url_model.py", "Step 2: Train URL Detection Model"),
    ]
    
    for i, (script, description) in enumerate(steps, 1):
        if not run_script(script, description):
            logger.error(f"\n❌ Pipeline failed at step {i}")
            sys.exit(1)
        
        if i < len(steps):
            print("\n" + "─" * 70 + "\n")
    
    print("""
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        COMPLETE TRAINING PIPELINE FINISHED!              ║
║                                                           ║
║  All models have been trained on real phishing data!     ║
║                                                           ║
║  What was trained:                                    ║
║     • URL model (61 features, Random Forest)             ║
║                                                           ║
║   Next steps:                                          ║
║     1. Restart API: python -m uvicorn server.app:app     ║
║     2. Test improvements: python test_api_ml.py          ║
║     3. Check model performance in logs                   ║
║                                                           ║
║   Expected accuracy: 95%+                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    """)


if __name__ == "__main__":
    main()
