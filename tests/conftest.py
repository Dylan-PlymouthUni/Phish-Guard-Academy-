import sys
from pathlib import Path

# ensure project root is on sys.path so tests can import ml.api
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))