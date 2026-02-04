#!/usr/bin/env python3
"""
Reproducible experiment runner for PhishGuard Academy URL phishing detection.

Single entry point for canonical training with deterministic seeds,
artifact persistence, and full reproducibility.

USAGE:
    python scripts/run_experiment.py --seed 42
    python scripts/run_experiment.py --seed 42 --run_id my_run_20260204
    python scripts/run_experiment.py --seed 42 --run_id my_run_20260204 --save_dataset_snapshot
"""

import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime
import uuid
import json
import subprocess
import platform
import numpy as np

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.seed import set_global_seed
from sklearn.metrics import (
    precision_recall_curve, roc_auc_score, accuracy_score, 
    precision_score, recall_score, f1_score, confusion_matrix
)
from sklearn.model_selection import learning_curve
from sklearn.feature_selection import RFECV
import time
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_git_sha():
    """Get current git commit SHA"""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except Exception as e:
        logger.warning(f"Could not get git SHA: {e}")
        return "unknown"


def get_python_version():
    """Get Python version"""
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"


def get_environment_info():
    """Gather environment information for reproducibility"""
    return {
        'platform': platform.platform(),
        'python_version': get_python_version(),
        'git_sha': get_git_sha(),
        'timestamp': datetime.now().isoformat(),
        'os': platform.system(),
        'machine': platform.machine(),
    }


def run_experiment(
    seed: int,
    run_id: str,
    save_dataset_snapshot: bool = False
):
    """
    Run the canonical URL phishing detection experiment.
    
    Args:
        seed: Random seed for reproducibility
        run_id: Unique identifier for this run
        save_dataset_snapshot: Whether to save dataset metadata/snapshot
    
    Returns:
        dict: Experiment metadata and results
    """
    logger.info("="*70)
    logger.info("🚀 PhishGuard Academy - Canonical URL Phishing Detection Experiment")
    logger.info("="*70)
    
    # Set deterministic seeds
    logger.info(f"Setting random seed to {seed}...")
    set_global_seed(seed)
    
    # Create run directory
    run_dir = Path("artifacts/runs") / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"📁 Run directory: {run_dir}")
    
    # Create subdirectories
    dataset_dir = run_dir / "dataset"
    model_dir = run_dir / "model"
    eval_dir = run_dir / "eval"
    env_dir = run_dir / "env"
    
    dataset_dir.mkdir(exist_ok=True)
    model_dir.mkdir(exist_ok=True)
    eval_dir.mkdir(exist_ok=True)
    env_dir.mkdir(exist_ok=True)
    
    # Save environment info
    env_info = get_environment_info()
    env_info['seed'] = seed
    env_info['run_id'] = run_id
    
    with open(env_dir / "environment.json", "w") as f:
        json.dump(env_info, f, indent=2)
    logger.info(f"📋 Environment info saved to {env_dir / 'environment.json'}")
    
    # Import canonical trainer (after seed is set!)
    from train_url_model import URLModelTrainer
    import numpy as np
    import pandas as pd
    from sklearn.model_selection import train_test_split
    
    # Find latest dataset
    data_dir = Path("data/training")
    dataset_files = list(data_dir.glob("url_training_data_*.csv"))
    
    if not dataset_files:
        logger.error("❌ No training data found!")
        logger.error("Run: python collect_training_data.py")
        return None
    
    latest_dataset = max(dataset_files, key=lambda p: p.stat().st_mtime)
    logger.info(f"📊 Using dataset: {latest_dataset}")
    
    # Optional: save dataset snapshot
    if save_dataset_snapshot:
        import shutil
        snapshot_path = dataset_dir / "dataset.csv"
        shutil.copy(latest_dataset, snapshot_path)
        logger.info(f"💾 Dataset snapshot saved to {snapshot_path}")
    
    # Initialize trainer
    trainer = URLModelTrainer(latest_dataset)
    
    # Load data
    df = trainer.load_data()
    
    # Enhanced dataset metadata with provenance (Improvement #8)
    collection_meta_path = data_dir / "collection_metadata.json"
    provenance_info = {}
    if collection_meta_path.exists():
        with open(collection_meta_path, "r") as f:
            provenance_info = json.load(f)
    
    dataset_meta = {
        'source_file': str(latest_dataset),
        'total_samples': len(df),
        'phishing_count': int((df['label'] == 1).sum()),
        'legitimate_count': int((df['label'] == 0).sum()),
        'class_balance': float((df['label'] == 1).sum() / len(df)),
        'collection_timestamp': env_info['timestamp'],
        'random_seed': seed,
        'provenance': {
            'collection_date': provenance_info.get('collection_date', 'unknown'),
            'sources': provenance_info.get('sources', {
                'phishtank': {'description': 'Community-verified phishing URLs'},
                'openphish': {'description': 'Real-time phishing intelligence'},
                'urlhaus': {'description': 'Malware and phishing URL collection'},
                'legitimate': {'description': 'Curated from trusted domains'}
            }),
            'preprocessing_steps': [
                'Deduplication',
                'URL normalization',
                'Label validation',
                'Train/test stratification'
            ],
            'label_schema': {
                '0': 'legitimate',
                '1': 'phishing'
            }
        }
    }
    
    with open(dataset_dir / "dataset_meta.json", "w") as f:
        json.dump(dataset_meta, f, indent=2)
    logger.info(f"📋 Dataset metadata saved to {dataset_dir / 'dataset_meta.json'}")
    
    # Extract features
    logger.info("🔍 Extracting URL features...")
    X, y = trainer.extract_features(df['url'].tolist(), df['label'].tolist())
    
    logger.info(f"✅ Features extracted: shape {X.shape}")
    
    # Split data (stratified, with deterministic seed)
    logger.info(f"📐 Splitting data with seed={seed}...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=seed, stratify=y
    )
    
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=seed, stratify=y_train
    )
    
    # Log split sizes
    split_info = {
        'train_size': len(X_train),
        'val_size': len(X_val),
        'test_size': len(X_test),
        'random_seed': seed,
        'stratified': True,
    }
    
    with open(dataset_dir / "splits.json", "w") as f:
        json.dump(split_info, f, indent=2)
    logger.info(f"📋 Split information saved to {dataset_dir / 'splits.json'}")
    
    logger.info(f"📊 Training set: {len(X_train)} samples")
    logger.info(f"📊 Validation set: {len(X_val)} samples")
    logger.info(f"📊 Test set: {len(X_test)} samples")
    
    # Train model with deterministic seed
    logger.info("🔨 Training Random Forest model...")
    model = trainer.train(X_train, y_train, X_val, y_val)
    
    # Save GridSearchCV results (Improvement #4)
    if hasattr(trainer, 'grid_search'):
        grid_results = {
            'best_params': trainer.grid_search.best_params_,
            'best_cv_score': float(trainer.grid_search.best_score_),
            'cv_results': {
                'mean_test_score': trainer.grid_search.cv_results_['mean_test_score'].tolist(),
                'std_test_score': trainer.grid_search.cv_results_['std_test_score'].tolist(),
                'params': [str(p) for p in trainer.grid_search.cv_results_['params']],
            },
            'search_space': {
                'n_estimators': [100, 200, 300],
                'max_depth': [10, 20, 30, 'None'],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4],
                'class_weight': ['balanced', 'None']
            }
        }
        with open(eval_dir / "hyperparameter_search.json", "w") as f:
            json.dump(grid_results, f, indent=2)
        logger.info(f"💾 GridSearchCV results saved to {eval_dir / 'hyperparameter_search.json'}")
    
    # Cross-validation on full dataset (Improvement #5)
    logger.info("🔄 Running cross-validation for generalization estimate...")
    from sklearn.model_selection import cross_val_score
    X_full = np.vstack([X_train, X_val, X_test])
    y_full = np.concatenate([y_train, y_val, y_test])
    cv_scores = cross_val_score(model, X_full, y_full, cv=5, scoring='roc_auc', n_jobs=-1)
    cv_results = {
        'cv_scores': cv_scores.tolist(),
        'cv_mean': float(cv_scores.mean()),
        'cv_std': float(cv_scores.std()),
        'cv_folds': 5,
        'cv_metric': 'roc_auc'
    }
    with open(eval_dir / "cross_validation.json", "w") as f:
        json.dump(cv_results, f, indent=2)
    logger.info(f"✅ Cross-validation: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    logger.info(f"💾 CV results saved to {eval_dir / 'cross_validation.json'}")
    
    # Model Comparison: Train alternative models (Improvement #9)
    logger.info("\n" + "="*70)
    logger.info("🔬 MODEL COMPARISON: Alternative Baselines")
    logger.info("="*70)
    
    from sklearn.linear_model import LogisticRegression
    from sklearn.svm import SVC
    from sklearn.ensemble import GradientBoostingClassifier
    
    comparison_models = {
        'Logistic Regression': LogisticRegression(random_state=seed, max_iter=1000),
        'SVM': SVC(random_state=seed, probability=True, kernel='rbf'),
        'Gradient Boosting': GradientBoostingClassifier(random_state=seed, n_estimators=100)
    }
    
    model_comparison_results = {
        'baseline_models': [],
        'primary_model': 'Random Forest'
    }
    
    for model_name, alt_model in comparison_models.items():
        logger.info(f"Training {model_name}...")
        try:
            alt_model.fit(X_train, y_train)
            alt_pred = alt_model.predict(X_test)
            alt_proba = alt_model.predict_proba(X_test)[:, 1]
            
            alt_metrics = {
                'model_name': model_name,
                'accuracy': float(accuracy_score(y_test, alt_pred)),
                'precision': float(precision_score(y_test, alt_pred, zero_division=0)),
                'recall': float(recall_score(y_test, alt_pred, zero_division=0)),
                'f1': float(f1_func(y_test, alt_pred, zero_division=0)),
                'roc_auc': float(roc_auc_score(y_test, alt_proba)),
            }
            
            model_comparison_results['baseline_models'].append(alt_metrics)
            logger.info(f"✅ {model_name}: ROC-AUC={alt_metrics['roc_auc']:.4f}, F1={alt_metrics['f1']:.4f}")
        except Exception as e:
            logger.warning(f"❌ {model_name} training failed: {e}")
    
    # Add primary model results for comparison
    model_comparison_results['primary_model_metrics'] = {
        'model_name': 'Random Forest',
        'accuracy': float(results['accuracy']),
        'precision': float(results['precision']),
        'recall': float(results['recall']),
        'f1': float(results['f1']),
        'roc_auc': float(results['roc_auc']),
    }
    
    with open(eval_dir / "model_comparison.json", "w") as f:
        json.dump(model_comparison_results, f, indent=2)
    
    logger.info(f"📊 Model Comparison Summary:")
    logger.info(f"   Random Forest:  ROC-AUC={results['roc_auc']:.4f}")
    for alt in model_comparison_results['baseline_models']:
        logger.info(f"   {alt['model_name']}: ROC-AUC={alt['roc_auc']:.4f}")
    logger.info(f"💾 Model comparison saved to {eval_dir / 'model_comparison.json'}")
    
    # Final evaluation on test set
    logger.info("\n" + "="*70)
    logger.info("📈 FINAL TEST SET EVALUATION")
    logger.info("="*70)
    results = trainer.evaluate(X_test, y_test)
    
    # Save model
    model_path = model_dir / "url_phish_rf_model.joblib"
    trainer.save_model(model_path)
    logger.info(f"💾 Model saved to {model_path}")
    
    # Save predictions and probabilities
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    np.save(eval_dir / "y_test.npy", y_test)
    np.save(eval_dir / "y_pred.npy", y_pred)
    np.save(eval_dir / "y_proba.npy", y_proba)
    logger.info(f"💾 Test predictions saved to {eval_dir}/")
    
    # Save confusion matrix
    np.save(eval_dir / "confusion_matrix.npy", results['confusion_matrix'])
    
    # Save feature names and importances
    importances = model.feature_importances_
    feature_importance_df = pd.DataFrame({
        'feature_name': trainer.feature_names,
        'importance': importances
    }).sort_values('importance', ascending=False)
    
    feature_importance_df.to_csv(
        eval_dir / "feature_importance.csv",
        index=False
    )
    logger.info(f"💾 Feature importances saved to {eval_dir / 'feature_importance.csv'}")
    
    # Error Analysis (Improvement #3)
    logger.info("\n" + "="*70)
    logger.info("🔍 ERROR ANALYSIS")
    logger.info("="*70)
    
    # Identify misclassifications
    misclassified_idx = np.where(y_test != y_pred)[0]
    correct_idx = np.where(y_test == y_pred)[0]
    
    # False positives (legitimate classified as phishing)
    fp_idx = np.where((y_test == 0) & (y_pred == 1))[0]
    # False negatives (phishing classified as legitimate)  
    fn_idx = np.where((y_test == 1) & (y_pred == 0))[0]
    
    error_analysis = {
        'total_errors': int(len(misclassified_idx)),
        'error_rate': float(len(misclassified_idx) / len(y_test)),
        'false_positives': {
            'count': int(len(fp_idx)),
            'indices': fp_idx.tolist(),
            'probabilities': y_proba[fp_idx].tolist(),
            'mean_confidence': float(y_proba[fp_idx].mean()) if len(fp_idx) > 0 else 0.0,
        },
        'false_negatives': {
            'count': int(len(fn_idx)),
            'indices': fn_idx.tolist(),
            'probabilities': y_proba[fn_idx].tolist(),
            'mean_confidence': float(y_proba[fn_idx].mean()) if len(fn_idx) > 0 else 0.0,
        },
        'correct_predictions': {
            'count': int(len(correct_idx)),
            'mean_confidence': float(np.abs(y_proba[correct_idx] - (1 - y_test[correct_idx])).mean()),
        }
    }
    
    with open(eval_dir / "error_analysis.json", "w") as f:
        json.dump(error_analysis, f, indent=2)
    
    logger.info(f"❌ False Positives: {len(fp_idx)} (legitimate marked as phishing)")
    logger.info(f"❌ False Negatives: {len(fn_idx)} (phishing marked as legitimate)")
    logger.info(f"💾 Error analysis saved to {eval_dir / 'error_analysis.json'}")
    
    # Threshold Optimization (Improvement #6)
    logger.info("\n" + "="*70)
    logger.info("🎯 THRESHOLD OPTIMIZATION")
    logger.info("="*70)
    
    # Find optimal thresholds for different objectives
    thresholds_to_test = np.linspace(0.1, 0.9, 17)
    threshold_analysis = {
        'thresholds': thresholds_to_test.tolist(),
        'accuracies': [],
        'precisions': [],
        'recalls': [],
        'f1_scores': [],
    }
    
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score as f1_func
    
    for threshold in thresholds_to_test:
        y_pred_thresh = (y_proba >= threshold).astype(int)
        threshold_analysis['accuracies'].append(float(accuracy_score(y_test, y_pred_thresh)))
        threshold_analysis['precisions'].append(float(precision_score(y_test, y_pred_thresh, zero_division=0)))
        threshold_analysis['recalls'].append(float(recall_score(y_test, y_pred_thresh, zero_division=0)))
        threshold_analysis['f1_scores'].append(float(f1_func(y_test, y_pred_thresh, zero_division=0)))
    
    # Find optimal thresholds
    optimal_f1_idx = np.argmax(threshold_analysis['f1_scores'])
    optimal_acc_idx = np.argmax(threshold_analysis['accuracies'])
    
    threshold_analysis['optimal_thresholds'] = {
        'f1_maximizing': {
            'threshold': float(thresholds_to_test[optimal_f1_idx]),
            'f1': float(threshold_analysis['f1_scores'][optimal_f1_idx]),
            'precision': float(threshold_analysis['precisions'][optimal_f1_idx]),
            'recall': float(threshold_analysis['recalls'][optimal_f1_idx]),
        },
        'accuracy_maximizing': {
            'threshold': float(thresholds_to_test[optimal_acc_idx]),
            'accuracy': float(threshold_analysis['accuracies'][optimal_acc_idx]),
            'precision': float(threshold_analysis['precisions'][optimal_acc_idx]),
            'recall': float(threshold_analysis['recalls'][optimal_acc_idx]),
        },
        'default': {
            'threshold': 0.5,
            'precision': float(results['precision']),
            'recall': float(results['recall']),
        }
    }
    
    with open(eval_dir / "threshold_optimization.json", "w") as f:
        json.dump(threshold_analysis, f, indent=2)
    
    logger.info(f"🎯 Optimal F1 threshold: {threshold_analysis['optimal_thresholds']['f1_maximizing']['threshold']:.3f}")
    logger.info(f"🎯 Optimal accuracy threshold: {threshold_analysis['optimal_thresholds']['accuracy_maximizing']['threshold']:.3f}")
    logger.info(f"💾 Threshold analysis saved to {eval_dir / 'threshold_optimization.json'}")
    
    # Save metrics summary
    metrics_summary = {
        'model_type': 'RandomForest',
        'seed': seed,
        'test_set_size': len(X_test),
        'accuracy': float(results.get('accuracy', 0)),
        'precision': float(results.get('precision', 0)),
        'recall': float(results.get('recall', 0)),
        'f1': float(results.get('f1', 0)),
        'roc_auc': float(results['roc_auc']),
        'average_precision': float(results['avg_precision']),
        'confusion_matrix': results['confusion_matrix'].tolist(),
    }
    
    with open(eval_dir / "metrics_summary.json", "w") as f:
        json.dump(metrics_summary, f, indent=2)
    logger.info(f"💾 Metrics saved to {eval_dir / 'metrics_summary.json'}")
    
    # Compute and save ROC curve data
    from sklearn.metrics import roc_curve
    fpr, tpr, roc_thresholds = roc_curve(y_test, y_proba)
    
    roc_curve_data = {
        'fpr': fpr.tolist(),
        'tpr': tpr.tolist(),
        'thresholds': roc_thresholds.tolist(),
        'roc_auc': float(results['roc_auc']),
    }
    
    with open(eval_dir / "roc_curve.json", "w") as f:
        json.dump(roc_curve_data, f, indent=2)
    logger.info(f"💾 ROC curve data saved to {eval_dir / 'roc_curve.json'}")
    
    # Compute and save PR curve data
    precision_vals, recall_vals, pr_thresholds = precision_recall_curve(y_test, y_proba)
    
    pr_curve_data = {
        'precision': precision_vals.tolist(),
        'recall': recall_vals.tolist(),
        'thresholds': pr_thresholds.tolist(),
        'average_precision': float(results['avg_precision']),
    }
    
    with open(eval_dir / "pr_curve.json", "w") as f:
        json.dump(pr_curve_data, f, indent=2)
    logger.info(f"💾 PR curve data saved to {eval_dir / 'pr_curve.json'}")
    
    # Precision-Recall Tradeoff Analysis (Improvement #10)
    logger.info("\n" + "="*70)
    logger.info("⚖️  PRECISION-RECALL TRADEOFF ANALYSIS")
    logger.info("="*70)
    
    # Create operating points table
    target_recalls = [0.90, 0.95, 0.99]
    pr_tradeoff = {
        'operating_points': []
    }
    
    for target_recall in target_recalls:
        # Find threshold that gives at least target recall
        valid_idx = np.where(recall_vals >= target_recall)[0]
        if len(valid_idx) > 0:
            best_idx = valid_idx[np.argmax(precision_vals[valid_idx])]
            pr_tradeoff['operating_points'].append({
                'target_recall': target_recall,
                'achieved_recall': float(recall_vals[best_idx]),
                'precision_at_recall': float(precision_vals[best_idx]),
                'threshold': float(pr_thresholds[best_idx]) if best_idx < len(pr_thresholds) else 1.0,
                'f1_score': float(2 * precision_vals[best_idx] * recall_vals[best_idx] / 
                                 (precision_vals[best_idx] + recall_vals[best_idx]))
            })
    
    # Add high-precision operating points
    target_precisions = [0.95, 0.99]
    for target_precision in target_precisions:
        valid_idx = np.where(precision_vals >= target_precision)[0]
        if len(valid_idx) > 0:
            best_idx = valid_idx[np.argmax(recall_vals[valid_idx])]
            pr_tradeoff['operating_points'].append({
                'target_precision': target_precision,
                'achieved_precision': float(precision_vals[best_idx]),
                'recall_at_precision': float(recall_vals[best_idx]),
                'threshold': float(pr_thresholds[best_idx]) if best_idx < len(pr_thresholds) else 1.0,
                'f1_score': float(2 * precision_vals[best_idx] * recall_vals[best_idx] / 
                                 (precision_vals[best_idx] + recall_vals[best_idx]))
            })
    
    with open(eval_dir / "pr_tradeoff_analysis.json", "w") as f:
        json.dump(pr_tradeoff, f, indent=2)
    
    for op in pr_tradeoff['operating_points']:
        if 'target_recall' in op:
            logger.info(f"📊 At {op['target_recall']*100:.0f}% recall: precision = {op['precision_at_recall']*100:.1f}%")
        else:
            logger.info(f"📊 At {op['target_precision']*100:.0f}% precision: recall = {op['recall_at_precision']*100:.1f}%")
    
    logger.info(f"💾 PR tradeoff analysis saved to {eval_dir / 'pr_tradeoff_analysis.json'}")
    
    # Generate and save plots
    import matplotlib.pyplot as plt
    plots_dir = eval_dir / "plots"
    plots_dir.mkdir(exist_ok=True)
    
    # ROC curve plot
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {results["roc_auc"]:.4f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random Classifier')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curve - URL Phishing Detection')
    plt.legend(loc="lower right")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(plots_dir / "roc_curve.png", dpi=150)
    plt.close()
    logger.info(f"📊 ROC curve plot saved to {plots_dir / 'roc_curve.png'}")
    
    # PR curve plot
    plt.figure(figsize=(8, 6))
    plt.plot(recall_vals, precision_vals, color='darkblue', lw=2, label=f'PR curve (AP = {results["avg_precision"]:.4f})')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.title('Precision-Recall Curve - URL Phishing Detection')
    plt.legend(loc="best")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(plots_dir / "pr_curve.png", dpi=150)
    plt.close()
    logger.info(f"📊 PR curve plot saved to {plots_dir / 'pr_curve.png'}")
    
    # Confusion matrix plot
    cm = results['confusion_matrix']
    plt.figure(figsize=(8, 6))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix - URL Phishing Detection')
    plt.colorbar()
    tick_marks = np.arange(2)
    plt.xticks(tick_marks, ['Legitimate', 'Phishing'])
    plt.yticks(tick_marks, ['Legitimate', 'Phishing'])
    
    # Add text annotations
    for i in range(2):
        for j in range(2):
            plt.text(j, i, str(cm[i, j]), ha='center', va='center', color='white' if cm[i, j] > cm.max() / 2 else 'black', fontsize=14, fontweight='bold')
    
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(plots_dir / "confusion_matrix.png", dpi=150)
    plt.close()
    logger.info(f"📊 Confusion matrix plot saved to {plots_dir / 'confusion_matrix.png'}")
    
    # Evaluate baseline heuristic (for comparison) - Improvement #1
    logger.info("\n" + "="*70)
    logger.info("📋 BASELINE HEURISTIC EVALUATION")
    logger.info("="*70)
    
    try:
        from ml.heuristics import heuristic_score
        
        logger.info("Computing baseline heuristic predictions...")
        baseline_scores = []
        baseline_preds = []
        baseline_probs = []
        
        # Get URLs from test set
        df_full = pd.read_csv(latest_dataset)
        test_urls = df_full.iloc[len(X_train) + len(X_val):]['url'].values[:len(X_test)]
        
        for i, url in enumerate(test_urls):
            if i % 100 == 0:
                logger.info(f"Evaluated {i}/{len(test_urls)} baseline predictions...")
            try:
                # Use heuristic scoring
                heuristic_result = heuristic_score("", url)  # text="", url=url
                score = heuristic_result.get('score', 0)
                baseline_scores.append(score)
                
                # Normalize score to probability (heuristic scores are 0-100)
                prob = min(max(score / 100.0, 0.0), 1.0)
                baseline_probs.append(prob)
                baseline_preds.append(1 if prob >= 0.5 else 0)
            except Exception as e:
                logger.debug(f"Baseline evaluation error at index {i}: {e}")
                baseline_scores.append(0)
                baseline_probs.append(0.0)
                baseline_preds.append(0)
        
        baseline_probs = np.array(baseline_probs)
        baseline_preds = np.array(baseline_preds)
        
        # Compute baseline metrics
        if len(baseline_preds) == len(y_test):
            baseline_accuracy = accuracy_score(y_test, baseline_preds)
            baseline_precision = precision_score(y_test, baseline_preds, zero_division=0)
            baseline_recall = recall_score(y_test, baseline_preds, zero_division=0)
            baseline_f1 = f1_score(y_test, baseline_preds, zero_division=0)
            baseline_cm = cm_func(y_test, baseline_preds)
            
            # Compute ROC-AUC for baseline if possible
            try:
                baseline_roc_auc = roc_auc_score(y_test, baseline_probs)
            except:
                baseline_roc_auc = 0.0
            
            baseline_metrics = {
                'model_type': 'Baseline_Heuristic',
                'accuracy': float(baseline_accuracy),
                'precision': float(baseline_precision),
                'recall': float(baseline_recall),
                'f1': float(baseline_f1),
                'roc_auc': float(baseline_roc_auc),
                'confusion_matrix': baseline_cm.tolist(),
                'mean_score': float(np.mean(baseline_scores)),
                'std_score': float(np.std(baseline_scores)),
            }
            
            # Save baseline predictions
            np.save(eval_dir / "y_pred_baseline.npy", baseline_preds)
            np.save(eval_dir / "y_proba_baseline.npy", baseline_probs)
            
            with open(eval_dir / "baseline_metrics.json", "w") as f:
                json.dump(baseline_metrics, f, indent=2)
            
            logger.info(f"✅ Baseline Heuristic Metrics:")
            logger.info(f"   Accuracy:  {baseline_accuracy:.4f}")
            logger.info(f"   Precision: {baseline_precision:.4f}")
            logger.info(f"   Recall:    {baseline_recall:.4f}")
            logger.info(f"   F1:        {baseline_f1:.4f}")
            logger.info(f"   ROC-AUC:   {baseline_roc_auc:.4f}")
            logger.info(f"📊 ML vs Baseline Comparison:")
            logger.info(f"   ML Model ROC-AUC:      {results['roc_auc']:.4f}")
            logger.info(f"   Baseline ROC-AUC:      {baseline_roc_auc:.4f}")
            logger.info(f"   ML Model Accuracy:     {results['accuracy']:.4f}")
            logger.info(f"   Baseline Accuracy:     {baseline_accuracy:.4f}")
            logger.info(f"   Accuracy Improvement:  {(results['accuracy'] - baseline_accuracy)*100:.2f}%")
            logger.info(f"   ROC-AUC Improvement:   {(results['roc_auc'] - baseline_roc_auc)*100:.2f}%")
        else:
            logger.warning(f"Baseline evaluation incomplete: {len(baseline_preds)} != {len(y_test)}")
            
    except Exception as e:
        logger.warning(f"Baseline heuristic evaluation failed: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    
    # ===== NEW ANALYSIS #1: LEARNING CURVES =====
    logger.info("\n" + "="*70)
    logger.info("📈 Learning Curve Analysis")
    logger.info("="*70)
    
    try:
        from sklearn.model_selection import learning_curve as sklearn_learning_curve
        from sklearn.ensemble import RandomForestClassifier
        
        # Use best hyperparameters from grid search
        best_params = trainer.grid_search.best_params_ if hasattr(trainer, 'grid_search') else {}
        
        # Combine train and validation for learning curve
        X_train_full = np.vstack([X_train, X_val])
        y_train_full = np.concatenate([y_train, y_val])
        
        # Train sizes: 10%, 20%, 30%, ..., 100%
        train_sizes = np.linspace(0.1, 1.0, 10)
        
        logger.info(f"Computing learning curves with {len(train_sizes)} training sizes...")
        train_sizes_abs, train_scores, val_scores = sklearn_learning_curve(
            RandomForestClassifier(random_state=seed, n_jobs=-1, **best_params),
            X_train_full, y_train_full,
            train_sizes=train_sizes,
            cv=5,
            scoring='accuracy',
            n_jobs=-1,
            random_state=seed
        )
        
        # Compute mean and std
        train_mean = np.mean(train_scores, axis=1)
        train_std = np.std(train_scores, axis=1)
        val_mean = np.mean(val_scores, axis=1)
        val_std = np.std(val_scores, axis=1)
        
        learning_curve_data = {
            'train_sizes': train_sizes_abs.tolist(),
            'train_scores_mean': train_mean.tolist(),
            'train_scores_std': train_std.tolist(),
            'val_scores_mean': val_mean.tolist(),
            'val_scores_std': val_std.tolist(),
            'converged': bool(val_mean[-1] > val_mean[-2] - 0.01),  # Check if plateau reached
        }
        
        with open(eval_dir / "learning_curves.json", "w") as f:
            json.dump(learning_curve_data, f, indent=2)
        
        # Plot learning curves
        plots_dir = eval_dir / "plots"
        plots_dir.mkdir(exist_ok=True)
        
        plt.figure(figsize=(10, 6))
        plt.plot(train_sizes_abs, train_mean, 'o-', color='r', label='Training score')
        plt.fill_between(train_sizes_abs, train_mean - train_std, train_mean + train_std, alpha=0.1, color='r')
        plt.plot(train_sizes_abs, val_mean, 'o-', color='g', label='Cross-validation score')
        plt.fill_between(train_sizes_abs, val_mean - val_std, val_mean + val_std, alpha=0.1, color='g')
        plt.xlabel('Training Examples')
        plt.ylabel('Accuracy')
        plt.title('Learning Curves')
        plt.legend(loc='best')
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(plots_dir / "learning_curves.png", dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"✅ Learning curves saved")
        logger.info(f"   Final validation accuracy: {val_mean[-1]:.4f} ± {val_std[-1]:.4f}")
        logger.info(f"   Convergence status: {'Converged' if learning_curve_data['converged'] else 'May benefit from more data'}")
        
    except Exception as e:
        logger.warning(f"Learning curve analysis failed: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    
    # ===== NEW ANALYSIS #2: STATISTICAL SIGNIFICANCE TESTING =====
    logger.info("\n" + "="*70)
    logger.info("📊 Statistical Significance Testing")
    logger.info("="*70)
    
    try:
        from scipy.stats import chi2
        
        # McNemar's test: Compare RF vs Logistic Regression
        # Load model comparison results if available
        model_comparison_path = eval_dir / "model_comparison.json"
        
        if model_comparison_path.exists():
            with open(model_comparison_path, "r") as f:
                model_comparison = json.load(f)
            
            # Retrain Logistic Regression quickly to get predictions
            from sklearn.linear_model import LogisticRegression
            
            lr_model = LogisticRegression(random_state=seed, max_iter=1000, n_jobs=-1)
            lr_model.fit(X_train, y_train)
            y_pred_lr = lr_model.predict(X_test)
            
            # Create contingency table
            # [RF correct, LR wrong], [RF wrong, LR correct]
            rf_correct = (y_pred == y_test)
            lr_correct = (y_pred_lr == y_test)
            
            # McNemar table: [[both_correct, rf_correct_lr_wrong], [rf_wrong_lr_correct, both_wrong]]
            both_correct = np.sum(rf_correct & lr_correct)
            rf_correct_lr_wrong = np.sum(rf_correct & ~lr_correct)
            rf_wrong_lr_correct = np.sum(~rf_correct & lr_correct)
            both_wrong = np.sum(~rf_correct & ~lr_correct)
            
            # McNemar's test uses off-diagonal elements
            table = [[both_correct, rf_correct_lr_wrong],
                     [rf_wrong_lr_correct, both_wrong]]
            
            # Compute McNemar statistic with continuity correction
            numerator = abs(rf_correct_lr_wrong - rf_wrong_lr_correct)
            denominator = rf_correct_lr_wrong + rf_wrong_lr_correct
            
            if denominator > 0:
                mcnemar_statistic = (numerator - 1) ** 2 / denominator if numerator > 0 else 0
                p_value = 1 - chi2.cdf(mcnemar_statistic, df=1)
            else:
                mcnemar_statistic = 0.0
                p_value = 1.0
            
            statistical_tests = {
                'mcnemar_test': {
                    'description': 'Random Forest vs Logistic Regression',
                    'contingency_table': table,
                    'statistic': float(mcnemar_statistic),
                    'p_value': float(p_value),
                    'significant_at_0.05': bool(p_value < 0.05),
                    'significant_at_0.01': bool(p_value < 0.01),
                    'interpretation': 'RF significantly better than LR' if p_value < 0.05 else 'No significant difference'
                },
                'test_set_size': len(y_test),
                'rf_correct_count': int(np.sum(rf_correct)),
                'lr_correct_count': int(np.sum(lr_correct)),
            }
            
            with open(eval_dir / "statistical_tests.json", "w") as f:
                json.dump(statistical_tests, f, indent=2)
            
            logger.info(f"✅ Statistical significance testing complete")
            logger.info(f"   McNemar's test statistic: {mcnemar_statistic:.4f}")
            logger.info(f"   p-value: {p_value:.6f}")
            logger.info(f"   Significant at α=0.05: {p_value < 0.05}")
            logger.info(f"   Interpretation: {statistical_tests['mcnemar_test']['interpretation']}")
        else:
            logger.warning("Model comparison not found, skipping statistical tests")
            
    except Exception as e:
        logger.warning(f"Statistical significance testing failed: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    
    # ===== NEW ANALYSIS #3: SHAP EXPLAINABILITY =====
    logger.info("\n" + "="*70)
    logger.info("🔍 SHAP Explainability Analysis")
    logger.info("="*70)
    
    try:
        import shap
        
        # Load error analysis to find top misclassifications
        error_analysis_path = eval_dir / "error_analysis.json"
        
        if error_analysis_path.exists():
            with open(error_analysis_path, "r") as f:
                error_analysis = json.load(f)
            
            # Initialize SHAP explainer
            logger.info("Initializing SHAP TreeExplainer...")
            explainer = shap.TreeExplainer(trainer.model)
            
            # Compute SHAP values for test set (sample if too large)
            sample_size = min(100, len(X_test))
            X_test_sample = X_test[:sample_size]
            
            logger.info(f"Computing SHAP values for {sample_size} samples...")
            shap_values = explainer.shap_values(X_test_sample)
            
            # SHAP returns [class_0_values, class_1_values] for binary classification
            if isinstance(shap_values, list):
                shap_values_phishing = shap_values[1]  # Class 1 (phishing)
            else:
                shap_values_phishing = shap_values
            
            # Compute mean absolute SHAP values per feature
            mean_shap = np.abs(shap_values_phishing).mean(axis=0)
            
            shap_importance = {
                'feature_names': trainer.feature_names,
                'mean_abs_shap_values': mean_shap.tolist(),
                'top_10_features': [
                    {'feature': trainer.feature_names[i], 'importance': float(mean_shap[i])}
                    for i in np.argsort(mean_shap)[-10:][::-1]
                ]
            }
            
            with open(eval_dir / "shap_importance.json", "w") as f:
                json.dump(shap_importance, f, indent=2)
            
            # Generate SHAP summary plot
            plt.figure(figsize=(12, 8))
            shap.summary_plot(shap_values_phishing, X_test_sample, 
                            feature_names=trainer.feature_names, 
                            show=False, max_display=20)
            plt.tight_layout()
            plt.savefig(plots_dir / "shap_summary.png", dpi=300, bbox_inches='tight')
            plt.close()
            
            # Generate SHAP for top false positives
            if len(error_analysis['false_positives']['indices']) > 0:
                fp_idx = error_analysis['false_positives']['indices'][0]  # Top FP
                
                if fp_idx < len(X_test):
                    plt.figure(figsize=(12, 6))
                    shap.waterfall_plot(
                        shap.Explanation(
                            values=shap_values_phishing[fp_idx] if fp_idx < sample_size else explainer.shap_values(X_test[fp_idx:fp_idx+1])[1][0],
                            base_values=explainer.expected_value[1] if isinstance(explainer.expected_value, list) else explainer.expected_value,
                            data=X_test[fp_idx],
                            feature_names=trainer.feature_names
                        ),
                        show=False,
                        max_display=15
                    )
                    plt.tight_layout()
                    plt.savefig(plots_dir / "shap_top_fp.png", dpi=300, bbox_inches='tight')
                    plt.close()
            
            logger.info(f"✅ SHAP analysis complete")
            logger.info(f"   Top 3 SHAP features: {', '.join([f['feature'] for f in shap_importance['top_10_features'][:3]])}")
            
        else:
            logger.warning("Error analysis not found, skipping SHAP analysis")
            
    except Exception as e:
        logger.warning(f"SHAP explainability analysis failed: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    
    # ===== NEW ANALYSIS #4: FEATURE SELECTION (RFE) =====
    logger.info("\n" + "="*70)
    logger.info("🎯 Feature Selection Analysis (RFE)")
    logger.info("="*70)
    
    try:
        from sklearn.feature_selection import RFECV
        from sklearn.ensemble import RandomForestClassifier
        
        # Use a smaller RF for speed
        rf_selector = RandomForestClassifier(n_estimators=50, random_state=seed, n_jobs=-1)
        
        logger.info("Running Recursive Feature Elimination with CV...")
        selector = RFECV(
            estimator=rf_selector,
            step=1,
            cv=5,
            scoring='accuracy',
            n_jobs=-1,
            min_features_to_select=5
        )
        
        selector.fit(X_train, y_train)
        
        # Get selected features
        selected_features = [trainer.feature_names[i] for i, selected in enumerate(selector.support_) if selected]
        
        feature_selection_data = {
            'optimal_feature_count': int(selector.n_features_),
            'total_features': len(trainer.feature_names),
            'selected_features': selected_features,
            'cv_scores': selector.cv_results_['mean_test_score'].tolist(),
            'cv_scores_std': selector.cv_results_['std_test_score'].tolist(),
            'feature_ranking': selector.ranking_.tolist(),
            'max_accuracy': float(np.max(selector.cv_results_['mean_test_score'])),
            'accuracy_at_optimal': float(selector.cv_results_['mean_test_score'][selector.n_features_ - selector.min_features_to_select])
        }
        
        with open(eval_dir / "feature_selection.json", "w") as f:
            json.dump(feature_selection_data, f, indent=2)
        
        # Plot feature selection curve
        plt.figure(figsize=(10, 6))
        plt.plot(range(selector.min_features_to_select, len(selector.cv_results_['mean_test_score']) + selector.min_features_to_select),
                selector.cv_results_['mean_test_score'], 'o-')
        plt.xlabel('Number of Features')
        plt.ylabel('CV Accuracy')
        plt.title('Feature Selection: Accuracy vs Number of Features')
        plt.axvline(x=selector.n_features_, color='r', linestyle='--', label=f'Optimal: {selector.n_features_} features')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(plots_dir / "feature_selection.png", dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"✅ Feature selection complete")
        logger.info(f"   Optimal features: {selector.n_features_} out of {len(trainer.feature_names)}")
        logger.info(f"   Max CV accuracy: {feature_selection_data['max_accuracy']:.4f}")
        
    except Exception as e:
        logger.warning(f"Feature selection analysis failed: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    
    # ===== NEW ANALYSIS #5: ENSEMBLE DIVERSITY =====
    logger.info("\n" + "="*70)
    logger.info("🌳 Ensemble Diversity Analysis")
    logger.info("="*70)
    
    try:
        # Get individual tree predictions
        n_trees = len(trainer.model.estimators_)
        tree_predictions = np.zeros((n_trees, len(X_test)))
        
        logger.info(f"Analyzing diversity across {n_trees} trees...")
        for i, tree in enumerate(trainer.model.estimators_):
            tree_predictions[i] = tree.predict(X_test)
        
        # Compute pairwise disagreement
        disagreements = []
        for i in range(n_trees):
            for j in range(i + 1, n_trees):
                disagreement = np.mean(tree_predictions[i] != tree_predictions[j])
                disagreements.append(disagreement)
        
        mean_disagreement = np.mean(disagreements)
        
        # Compute Q-statistic (measure of diversity)
        # Q = (N11*N00 - N01*N10) / (N11*N00 + N01*N10)
        q_statistics = []
        for i in range(min(n_trees, 50)):  # Sample pairs for efficiency
            for j in range(i + 1, min(n_trees, 50)):
                # Build contingency table
                both_correct = np.sum((tree_predictions[i] == y_test) & (tree_predictions[j] == y_test))
                both_wrong = np.sum((tree_predictions[i] != y_test) & (tree_predictions[j] != y_test))
                i_correct_j_wrong = np.sum((tree_predictions[i] == y_test) & (tree_predictions[j] != y_test))
                i_wrong_j_correct = np.sum((tree_predictions[i] != y_test) & (tree_predictions[j] == y_test))
                
                numerator = both_correct * both_wrong - i_correct_j_wrong * i_wrong_j_correct
                denominator = both_correct * both_wrong + i_correct_j_wrong * i_wrong_j_correct
                
                if denominator > 0:
                    q_stat = numerator / denominator
                    q_statistics.append(q_stat)
        
        mean_q_statistic = np.mean(q_statistics) if q_statistics else 0.0
        
        # Compute per-sample agreement variance
        sample_agreement = np.mean(tree_predictions, axis=0)  # Proportion of trees predicting 1
        agreement_variance = np.var(sample_agreement)
        
        ensemble_diversity = {
            'n_trees': n_trees,
            'mean_pairwise_disagreement': float(mean_disagreement),
            'mean_q_statistic': float(mean_q_statistic),
            'agreement_variance': float(agreement_variance),
            'interpretation': {
                'disagreement': 'High diversity (good)' if mean_disagreement > 0.1 else 'Low diversity (may overfit)',
                'q_statistic': 'Independent predictors' if abs(mean_q_statistic) < 0.3 else 'Correlated predictors',
            }
        }
        
        with open(eval_dir / "ensemble_diversity.json", "w") as f:
            json.dump(ensemble_diversity, f, indent=2)
        
        logger.info(f"✅ Ensemble diversity analysis complete")
        logger.info(f"   Mean pairwise disagreement: {mean_disagreement:.4f}")
        logger.info(f"   Mean Q-statistic: {mean_q_statistic:.4f}")
        logger.info(f"   Interpretation: {ensemble_diversity['interpretation']['disagreement']}")
        
    except Exception as e:
        logger.warning(f"Ensemble diversity analysis failed: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    
    # ===== NEW ANALYSIS #6: PERFORMANCE BENCHMARKING =====
    logger.info("\n" + "="*70)
    logger.info("⚡ Performance Benchmarking")
    logger.info("="*70)
    
    try:
        import time
        
        # Benchmark single predictions
        n_benchmark = 1000
        latencies = []
        
        logger.info(f"Running {n_benchmark} prediction benchmarks...")
        for i in range(min(n_benchmark, len(X_test))):
            start_time = time.perf_counter()
            _ = trainer.model.predict(X_test[i:i+1])
            end_time = time.perf_counter()
            latencies.append((end_time - start_time) * 1000)  # Convert to ms
        
        latencies = np.array(latencies)
        
        # Benchmark batch predictions
        batch_sizes = [1, 10, 100, 500]
        batch_benchmarks = {}
        
        for batch_size in batch_sizes:
            if batch_size <= len(X_test):
                batch_latencies = []
                for _ in range(10):
                    start_time = time.perf_counter()
                    _ = trainer.model.predict(X_test[:batch_size])
                    end_time = time.perf_counter()
                    batch_latencies.append((end_time - start_time) * 1000)
                
                batch_benchmarks[f'batch_{batch_size}'] = {
                    'mean_latency_ms': float(np.mean(batch_latencies)),
                    'p50_latency_ms': float(np.percentile(batch_latencies, 50)),
                    'p95_latency_ms': float(np.percentile(batch_latencies, 95)),
                    'throughput_per_sec': float(batch_size / (np.mean(batch_latencies) / 1000))
                }
        
        performance_benchmark = {
            'single_prediction': {
                'n_samples': len(latencies),
                'mean_latency_ms': float(np.mean(latencies)),
                'median_latency_ms': float(np.median(latencies)),
                'p50_latency_ms': float(np.percentile(latencies, 50)),
                'p95_latency_ms': float(np.percentile(latencies, 95)),
                'p99_latency_ms': float(np.percentile(latencies, 99)),
                'min_latency_ms': float(np.min(latencies)),
                'max_latency_ms': float(np.max(latencies)),
                'std_latency_ms': float(np.std(latencies)),
            },
            'batch_predictions': batch_benchmarks,
            'deployment_ready': bool(np.percentile(latencies, 95) < 100),  # p95 < 100ms
        }
        
        with open(eval_dir / "performance_benchmark.json", "w") as f:
            json.dump(performance_benchmark, f, indent=2)
        
        # Plot latency distribution
        plt.figure(figsize=(10, 6))
        plt.hist(latencies, bins=50, edgecolor='black', alpha=0.7)
        plt.axvline(np.percentile(latencies, 50), color='g', linestyle='--', label=f'p50: {np.percentile(latencies, 50):.2f}ms')
        plt.axvline(np.percentile(latencies, 95), color='orange', linestyle='--', label=f'p95: {np.percentile(latencies, 95):.2f}ms')
        plt.axvline(np.percentile(latencies, 99), color='r', linestyle='--', label=f'p99: {np.percentile(latencies, 99):.2f}ms')
        plt.xlabel('Latency (ms)')
        plt.ylabel('Frequency')
        plt.title('Prediction Latency Distribution')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(plots_dir / "latency_distribution.png", dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"✅ Performance benchmarking complete")
        logger.info(f"   Mean latency: {performance_benchmark['single_prediction']['mean_latency_ms']:.2f}ms")
        logger.info(f"   p95 latency: {performance_benchmark['single_prediction']['p95_latency_ms']:.2f}ms")
        logger.info(f"   p99 latency: {performance_benchmark['single_prediction']['p99_latency_ms']:.2f}ms")
        logger.info(f"   Deployment ready (<100ms p95): {performance_benchmark['deployment_ready']}")
        
    except Exception as e:
        logger.warning(f"Performance benchmarking failed: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    
    run_manifest = {
        'experiment_type': 'URL_Phishing_Detection_Binary_Classification',
        'run_id': run_id,
        'canonical_script': 'train_url_model.py',
        'entry_point': 'scripts/run_experiment.py',
        'random_seed': seed,
        'environment': env_info,
        'dataset': dataset_meta,
        'splits': split_info,
        'model': {
            'type': 'RandomForestClassifier',
            'n_features': len(trainer.feature_names),
            'feature_names': trainer.feature_names,
            'model_path': str(model_path),
        },
        'evaluation': {
            'metrics_path': str(eval_dir / 'metrics_summary.json'),
            'metrics': metrics_summary,
        },
        'artifacts': {
            'y_test': str(eval_dir / 'y_test.npy'),
            'y_pred': str(eval_dir / 'y_pred.npy'),
            'y_proba': str(eval_dir / 'y_proba.npy'),
            'confusion_matrix': str(eval_dir / 'confusion_matrix.npy'),
            'feature_importance': str(eval_dir / 'feature_importance.csv'),
            'roc_curve_json': str(eval_dir / 'roc_curve.json'),
            'pr_curve_json': str(eval_dir / 'pr_curve.json'),
            'hyperparameter_search': str(eval_dir / 'hyperparameter_search.json'),
            'cross_validation': str(eval_dir / 'cross_validation.json'),
            'error_analysis': str(eval_dir / 'error_analysis.json'),
            'threshold_optimization': str(eval_dir / 'threshold_optimization.json'),
            'pr_tradeoff_analysis': str(eval_dir / 'pr_tradeoff_analysis.json'),
            'baseline_metrics': str(eval_dir / 'baseline_metrics.json'),
            'model_comparison': str(eval_dir / 'model_comparison.json'),
            'learning_curves': str(eval_dir / 'learning_curves.json'),
            'statistical_tests': str(eval_dir / 'statistical_tests.json'),
            'shap_importance': str(eval_dir / 'shap_importance.json'),
            'feature_selection': str(eval_dir / 'feature_selection.json'),
            'ensemble_diversity': str(eval_dir / 'ensemble_diversity.json'),
            'performance_benchmark': str(eval_dir / 'performance_benchmark.json'),
            'y_pred_baseline': str(eval_dir / 'y_pred_baseline.npy'),
            'y_proba_baseline': str(eval_dir / 'y_proba_baseline.npy'),
            'plots': {
                'roc_curve_png': str(plots_dir / 'roc_curve.png'),
                'pr_curve_png': str(plots_dir / 'pr_curve.png'),
                'confusion_matrix_png': str(plots_dir / 'confusion_matrix.png'),
                'learning_curves_png': str(plots_dir / 'learning_curves.png'),
                'shap_summary_png': str(plots_dir / 'shap_summary.png'),
                'shap_top_fp_png': str(plots_dir / 'shap_top_fp.png'),
                'feature_selection_png': str(plots_dir / 'feature_selection.png'),
                'latency_distribution_png': str(plots_dir / 'latency_distribution.png'),
            }
        }
    }
    
    manifest_path = run_dir / "run_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(run_manifest, f, indent=2)
    logger.info(f"📋 Run manifest saved to {manifest_path}")
    
    # Final summary
    logger.info("\n" + "="*70)
    logger.info("✅ EXPERIMENT COMPLETE")
    logger.info("="*70)
    logger.info(f"Run ID: {run_id}")
    logger.info(f"Random Seed: {seed}")
    logger.info(f"Artifacts Location: {run_dir}")
    logger.info(f"Test ROC-AUC: {results['roc_auc']:.4f}")
    logger.info(f"Test Avg Precision: {results['avg_precision']:.4f}")
    logger.info("="*70)
    
    return run_manifest


def main():
    """Parse arguments and run experiment"""
    parser = argparse.ArgumentParser(
        description="Reproducible URL phishing detection experiment runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with default seed (42)
  python scripts/run_experiment.py

  # Run with specific seed
  python scripts/run_experiment.py --seed 123

  # Run with custom run ID and save dataset snapshot
  python scripts/run_experiment.py --seed 42 --run_id my_experiment_20260204 --save_dataset_snapshot

  # Auto-generated run ID with timestamp
  python scripts/run_experiment.py --seed 42
        """
    )
    
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed for reproducibility (default: 42)'
    )
    
    parser.add_argument(
        '--run_id',
        type=str,
        default=None,
        help='Unique run identifier. If not provided, auto-generated from timestamp + UUID'
    )
    
    parser.add_argument(
        '--save_dataset_snapshot',
        action='store_true',
        help='Save a copy of the training dataset to artifacts (for full reproducibility)'
    )
    
    args = parser.parse_args()
    
    # Auto-generate run_id if not provided
    if args.run_id is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        short_uuid = str(uuid.uuid4())[:8]
        args.run_id = f"experiment_{timestamp}_{short_uuid}"
    
    # Run experiment
    try:
        run_experiment(
            seed=args.seed,
            run_id=args.run_id,
            save_dataset_snapshot=args.save_dataset_snapshot
        )
        return 0
    except Exception as e:
        logger.error(f"❌ Experiment failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
