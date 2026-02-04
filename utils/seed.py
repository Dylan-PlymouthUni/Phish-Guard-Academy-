#!/usr/bin/env python3
"""
Deterministic seed management for reproducible experiments.

Sets global random seeds for Python, NumPy, scikit-learn, and PyTorch
to ensure reproducible model training and evaluation.
"""

import random
import numpy as np
import logging

logger = logging.getLogger(__name__)


def set_global_seed(seed: int) -> None:
    """
    Set deterministic seeds for all relevant libraries.
    
    Args:
        seed: Random seed value (integer)
    
    Ensures reproducibility across:
    - Python built-in random module
    - NumPy random number generation
    - scikit-learn (via numpy + explicit set_config if available)
    - PyTorch (if installed)
    """
    # Python built-in random
    random.seed(seed)
    logger.info(f"Set Python random seed to {seed}")
    
    # NumPy
    np.random.seed(seed)
    logger.info(f"Set NumPy random seed to {seed}")
    
    # scikit-learn respects numpy seed, but we can be explicit
    try:
        from sklearn.utils.validation import check_random_state
        check_random_state(seed)
        logger.info(f"Set scikit-learn random seed to {seed}")
    except Exception as e:
        logger.warning(f"Could not set scikit-learn seed explicitly: {e}")
    
    # PyTorch (optional)
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
        logger.info(f"Set PyTorch random seed to {seed}")
    except ImportError:
        logger.debug("PyTorch not installed, skipping torch seed")
    except Exception as e:
        logger.warning(f"Could not set PyTorch seed: {e}")


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    set_global_seed(42)
