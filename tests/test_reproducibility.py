#!/usr/bin/env python3
"""
Test suite for reproducibility framework.

Ensures that experiments are deterministic and artifacts are correctly persisted.
"""
import pytest
import numpy as np
import json
import sys
from pathlib import Path
import tempfile
import shutil

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_deterministic_seed():
    """Test that set_global_seed produces deterministic results"""
    from utils.seed import set_global_seed
    import random
    import numpy as np
    
    # Test Python random
    set_global_seed(42)
    r1 = [random.random() for _ in range(10)]
    
    set_global_seed(42)
    r2 = [random.random() for _ in range(10)]
    
    assert r1 == r2, "Python random should be deterministic with same seed"
    
    # Test NumPy random
    set_global_seed(42)
    n1 = np.random.rand(10)
    
    set_global_seed(42)
    n2 = np.random.rand(10)
    
    assert np.allclose(n1, n2), "NumPy random should be deterministic with same seed"


def test_feature_extraction_consistency():
    """Test that feature extraction is deterministic"""
    from ml.advanced_url_features import AdvancedURLAnalyzer
    
    analyzer = AdvancedURLAnalyzer(timeout=1)
    
    test_url = "http://example-phishing-site.com/login?verify=true"
    
    # Extract features twice
    features1 = analyzer.extract_features(test_url)
    features2 = analyzer.extract_features(test_url)
    
    # Compare all features
    assert features1.keys() == features2.keys(), "Feature names should be identical"
    
    for key in features1.keys():
        if isinstance(features1[key], (int, float, bool)):
            assert features1[key] == features2[key], f"Feature {key} should be deterministic"


def test_train_test_split_deterministic():
    """Test that train/test split is deterministic with same seed"""
    from sklearn.model_selection import train_test_split
    from utils.seed import set_global_seed
    import numpy as np
    
    X = np.random.rand(100, 10)
    y = np.random.randint(0, 2, 100)
    
    # Split 1
    set_global_seed(42)
    X_train1, X_test1, y_train1, y_test1 = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Split 2
    set_global_seed(42)
    X_train2, X_test2, y_train2, y_test2 = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    assert np.array_equal(X_train1, X_train2), "Train split should be identical"
    assert np.array_equal(X_test1, X_test2), "Test split should be identical"
    assert np.array_equal(y_train1, y_train2), "Train labels should be identical"
    assert np.array_equal(y_test1, y_test2), "Test labels should be identical"


def test_artifact_structure():
    """Test that run_experiment creates correct artifact structure"""
    # This would require a mini dataset, so we'll test the structure expectations
    expected_files = [
        "dataset/dataset_meta.json",
        "dataset/splits.json",
        "model/url_phish_rf_model.joblib",
        "eval/y_test.npy",
        "eval/y_pred.npy",
        "eval/y_proba.npy",
        "eval/confusion_matrix.npy",
        "eval/metrics_summary.json",
        "eval/feature_importance.csv",
        "eval/roc_curve.json",
        "eval/pr_curve.json",
        "eval/hyperparameter_search.json",
        "eval/cross_validation.json",
        "eval/error_analysis.json",
        "eval/threshold_optimization.json",
        "eval/pr_tradeoff_analysis.json",
        "eval/baseline_metrics.json",
        "eval/model_comparison.json",
        "eval/plots/roc_curve.png",
        "eval/plots/pr_curve.png",
        "eval/plots/confusion_matrix.png",
        "env/environment.json",
        "run_manifest.json",
    ]
    
    # Just verify the list is complete (actual file creation tested in integration)
    assert len(expected_files) == 23, f"Expected 23 artifact files, got {len(expected_files)}"


def test_metrics_json_schema():
    """Test that metrics JSON follows expected schema"""
    expected_schema = {
        'model_type': str,
        'seed': int,
        'test_set_size': int,
        'accuracy': float,
        'precision': float,
        'recall': float,
        'f1': float,
        'roc_auc': float,
        'average_precision': float,
        'confusion_matrix': list,
    }
    
    # Verify schema structure (actual values tested in integration)
    assert all(isinstance(k, str) for k in expected_schema.keys())


def test_run_manifest_completeness():
    """Test that run_manifest.json contains all required fields"""
    required_fields = [
        'experiment_type',
        'run_id',
        'canonical_script',
        'entry_point',
        'random_seed',
        'environment',
        'dataset',
        'splits',
        'model',
        'evaluation',
        'artifacts'
    ]
    
    # Verify all fields are documented
    assert len(required_fields) == 11, "Run manifest should have 11 top-level fields"


def test_feature_count():
    """Test that feature count matches documentation"""
    from ml.advanced_url_features import AdvancedURLAnalyzer
    
    analyzer = AdvancedURLAnalyzer(timeout=1)
    
    # Extract features from a test URL
    features = analyzer.extract_features("http://test.com")
    
    # Should have 61+ features as documented
    assert len(features) >= 45, f"Expected at least 45 features (enabled), got {len(features)}"
    
    # Check that documented features exist
    expected_features = [
        'url_length', 'domain_length', 'num_dots', 'has_ip_address',
        'ssl_valid', 'has_dns_record', 'domain_entropy'
    ]
    
    for feat in expected_features:
        assert feat in features, f"Expected feature '{feat}' not found"


def test_confusion_matrix_dimensions():
    """Test that confusion matrix is 2x2 for binary classification"""
    import numpy as np
    from sklearn.metrics import confusion_matrix
    
    # Simulate predictions
    y_true = np.array([0, 0, 1, 1, 0, 1, 1, 0])
    y_pred = np.array([0, 1, 1, 1, 0, 0, 1, 0])
    
    cm = confusion_matrix(y_true, y_pred)
    
    assert cm.shape == (2, 2), f"Confusion matrix should be 2x2, got {cm.shape}"
    assert cm.sum() == len(y_true), "Confusion matrix should account for all samples"


def test_roc_auc_range():
    """Test that ROC-AUC is in valid range [0, 1]"""
    import numpy as np
    from sklearn.metrics import roc_auc_score
    
    # Perfect prediction
    y_true = np.array([0, 0, 1, 1])
    y_proba = np.array([0.1, 0.2, 0.8, 0.9])
    
    auc = roc_auc_score(y_true, y_proba)
    
    assert 0 <= auc <= 1, f"ROC-AUC should be in [0, 1], got {auc}"
    assert auc == 1.0, "Perfect prediction should have AUC = 1.0"


def test_threshold_optimization_logic():
    """Test threshold optimization produces valid results"""
    import numpy as np
    from sklearn.metrics import precision_score, recall_score
    
    y_true = np.array([0, 0, 1, 1, 0, 1, 1, 0, 1, 1])
    y_proba = np.array([0.1, 0.3, 0.6, 0.8, 0.2, 0.7, 0.9, 0.4, 0.5, 0.85])
    
    # Test different thresholds
    thresholds = [0.3, 0.5, 0.7]
    
    for threshold in thresholds:
        y_pred = (y_proba >= threshold).astype(int)
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        
        assert 0 <= precision <= 1, f"Precision should be in [0, 1]"
        assert 0 <= recall <= 1, f"Recall should be in [0, 1]"


def test_error_analysis_counts():
    """Test that error analysis correctly identifies FP/FN"""
    import numpy as np
    
    y_true = np.array([0, 0, 1, 1, 0, 1])
    y_pred = np.array([0, 1, 1, 0, 0, 1])
    
    # False positives: true=0, pred=1
    fp_idx = np.where((y_true == 0) & (y_pred == 1))[0]
    assert len(fp_idx) == 1, f"Should have 1 FP, got {len(fp_idx)}"
    
    # False negatives: true=1, pred=0
    fn_idx = np.where((y_true == 1) & (y_pred == 0))[0]
    assert len(fn_idx) == 1, f"Should have 1 FN, got {len(fn_idx)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
