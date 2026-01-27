import sys
import warnings
from pathlib import Path

from sklearn.exceptions import InconsistentVersionWarning

# ensure project root is on sys.path so tests can import ml.api
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Silence noisy third-party warnings that don't affect test expectations
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
warnings.filterwarnings(
	"ignore",
	message=".*find_loader.*",  # pytesseract legacy loader warning
	category=DeprecationWarning,
)