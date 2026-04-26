# PhishGuard Academy

A Phishing Detection and Education Platform for my dissertation project, COMP3000 at the University of Plymouth.

PhishGuard Academy is a comprehensive, interactive web application designed to help users identify, analyze, and protect themselves from phishing attacks. Built with cutting-edge machine learning and an engaging gamified interface, it provides real-time threat analysis and hands-on cybersecurity education.

---

## Key Features

### Multi-Modal Threat Analysis
- **Screenshot Analysis**: Upload and analyze suspicious website screenshots using computer vision
- **Email Content Analysis**: Scan email text for phishing indicators and social engineering tactics
- **URL Verification**: Check URLs for typosquatting, suspicious domains, and malicious patterns
- **Real-time Risk Scoring**: Get instant threat assessments with detailed breakdowns
- **Analysis Macros**: Trigger one-tap phishing scenario templates in Analyze for rapid demos and repeatable checks (Alt+1/Alt+2/Alt+3)

### Interactive Learning Hub
- **7 Comprehensive Lessons** covering everything from phishing basics to incident response
- Topics include: 
  - Phishing 101: The Basics
  - Red Flags and Warning Signs
  - Advanced URL Analysis
  - Social Engineering Tactics
  - Email Security Best Practices
  - Mobile Phishing Defense
  - Phishing Incident Response
- Progress tracking with points and rewards
- Markdown-formatted content with examples and exercises

### Interactive Challenges
- **Phishing Basics** (Easy) - 3 questions, 50 points
- **URL Detective** (Medium) - 4 questions, 100 points
- **Social Engineering Tactics** (Medium) - 5 questions, 150 points
- **Email Header Analysis** (Hard) - 4 questions, 200 points
- **Real-World Scenarios** (Hard) - 6 questions, 250 points
- **Mobile Phishing** (Medium) - 3 questions, 120 points
- Timed challenges with detailed explanations
- Scoring system with passing thresholds
- Performance analytics and statistics

### Email Sandbox
- Safe environment to practice with realistic phishing examples
- 6 diverse email scenarios (legitimate and phishing)
- Interactive link hovering to reveal true destinations
- Real-time feedback with detailed explanations
- Red flag indicators and learning tips
- Track accuracy and improve skills

### Advanced Dashboard
- Personalized welcome with user level and experience points
- Daily streak tracking
- Quick action cards to key features
- Recent activity feed
- Achievement system with progress bars
- Recommended actions based on behavior
- Gradient cards with hover effects

### Analytics and Progress Tracking
- Comprehensive statistics on analyses performed
- Threat detection rates and trends
- Challenge completion tracking
- Lesson progress monitoring
- Visual charts and graphs
- Exportable reports (coming soon)

### Gamification System
- User leveling system (gain experience points from activities)
- Achievement badges for milestones
- Daily streak tracking
- Points rewards for completed tasks
- Leaderboards (coming soon)
- Unlockable content

### Modern, Responsive UI
- Glassmorphism design
- Smooth animations and transitions
- Gradient color schemes
- Mobile-responsive layout
- Dark mode optimized
- Accessible and intuitive interface

---

## Technology Stack

### Frontend
- React 18+ with TypeScript
- Vite for fast development and building
- React Router for navigation
- TailwindCSS for styling
- Lucide Icons for icon library
- Modern ES6+ JavaScript

### Backend
- FastAPI (Python) for REST API
- Scikit-learn for machine learning models
- Random Forest Classifier for phishing detection
- NLTK for text analysis
- Pillow for image processing

### Machine Learning
- Feature extraction from URLs, emails, and screenshots
- Trained on real phishing datasets
- Heuristic-based analysis
- Pattern recognition for visual phishing indicators

---

## Project Structure

```
Phish-Guard-Academy/
├── phish-guard-academy/          # React frontend
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── layout/           # Layout components
│   │   │   └── ui/               # UI components (Button, Card, Badge, etc.)
│   │   ├── pages/                # Main application pages
│   │   │   ├── Home.tsx          # Landing page with interactive demo
│   │   │   ├── Dashboard.tsx     # Personalized user dashboard
│   │   │   ├── Analyze.tsx       # Threat analysis page
│   │   │   ├── Sandbox.tsx       # Email simulation sandbox
│   │   │   ├── Challenges.tsx    # Interactive challenges
│   │   │   ├── Learn.tsx         # Learning hub
│   │   │   ├── Analytics.tsx     # Statistics and analytics
│   │   │   └── Settings.tsx      # User settings
│   │   ├── hooks/                # Custom React hooks
│   │   ├── types/                # TypeScript type definitions
│   │   ├── utils/                # Utility functions and storage
│   │   └── App.tsx               # Main app component
│   └── package.json
├── ml/                           # Machine learning backend
│   ├── api.py                    # FastAPI endpoints
│   ├── engine.py                 # ML model engine
│   ├── heuristics.py             # Heuristic analysis
│   ├── challenges.py             # Challenge data (6 challenges)
│   ├── learning.py               # Lesson content (7 lessons)
│   ├── analytics.py              # Analytics engine
│   └── model/                    # Trained ML models
├── data/                         # Training data and user data
└── server/                       # Production server setup
```

---

## Installation and Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- pip package manager

### Quickstart (3 Commands)

```bash
pip install -r requirements.txt
npm install
npm run dev:backend
```

Then start frontend in another terminal:

```bash
npm run dev:frontend
```

### Frontend Setup

```bash
cd phish-guard-academy
npm install
npm run dev
```

Frontend will run on http://localhost:5173

### Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Train the ML model (if needed)
python train_model_advanced.py

# Start the API server
cd ml
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

Backend API will run on http://localhost:8000

### Quality-of-Life Commands

```bash
# Canonical reproducibility run with auto-generated run_id
npm run qol:run

# Smoke check a running API (health + analyze)
npm run qol:smoke

# Exact dependency snapshot for environment replay
python3 -m pip freeze > requirements-lock.txt
```

Deterministic demo text and URL samples are provided in `data/demo_inputs/`.

---

## Usage Guide

### 1. Start with the Dashboard
- View your statistics, streaks, and achievements
- Get personalized recommendations
- Quick access to all features

### 2. Analyze Threats
- Navigate to the Analyze page
- Upload screenshots, paste email content, or enter URLs
- Receive instant risk assessment with detailed breakdown
- Learn from AI-powered explanations

### 3. Practice in the Sandbox
- Visit the Sandbox page
- Analyze realistic phishing and legitimate emails
- Hover over links to reveal destinations
- Get immediate feedback on your decisions
- Track your accuracy over time

### 4. Take Challenges
- Choose from 6 difficulty-graded challenges
- Answer questions under time pressure
- Earn points and improve your score
- Learn from detailed explanations

### 5. Learn and Grow
- Read comprehensive lessons
- Complete courses to earn points
- Track your progress
- Unlock achievements

### 6. Monitor Progress
- Check Analytics for detailed statistics
- View your improvement over time
- Export reports (coming soon)

---

## Educational Content

### Lessons Covered
1. **Phishing 101** - Understanding the basics (50 points)
2. **Red Flags and Warning Signs** - Spotting indicators (75 points)
3. **Advanced URL Analysis** - Dissecting malicious URLs (100 points)
4. **Social Engineering Tactics** - Understanding manipulation (120 points)
5. **Email Security Best Practices** - Technical deep dive (150 points)
6. **Mobile Phishing Defense** - Smartphone security (100 points)
7. **Phishing Incident Response** - What to do when compromised (130 points)

### Challenge Topics
- Basic phishing identification
- URL analysis and typosquatting
- Social engineering recognition
- Email header forensics
- Real-world scenario response
- Mobile threat detection

---

## Security and Privacy

- **No data storage**: Analyses are performed in real-time and not stored on servers
- **Privacy-focused**: No user tracking or personal data collection
- **Safe sandbox**: Practice environment is completely isolated
- **Local storage only**: User progress saved locally in browser
- **No backend authentication required** for basic features

---

## Deployment

### Development
```bash
npm run dev          # Frontend development server
python -m uvicorn ml.api:app --reload  # Backend API
```

### Production Build
```bash
npm run build        # Build optimized frontend
# Deploy to Fly.io, Render, or any static hosting
```

### Deployment Platforms
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Backend**: Fly.io, Render, Railway, Heroku
- **Database**: PostgreSQL, MongoDB (for user accounts in future versions)

---

## Machine Learning Details

### Training Data Sources
- **PhishTank**: Verified phishing URLs from community-driven database
- **OpenPhish**: Real-time phishing intelligence feed
- **URLhaus**: Malware and phishing URL collection
- **Curated legitimate URLs**: From trusted domains and organizations

### Features Extracted
- URL length and complexity
- Domain reputation and age
- Suspicious keywords and patterns
- HTTPS usage and certificate validity
- Subdomain count and structure
- Special character ratio
- Shortened URL detection
- IP address usage in URLs
- Visual similarity patterns (screenshots)

### Model Performance
- **Training Dataset**: 1,775+ real-world phishing URLs balanced with legitimate samples
- **Expected Accuracy**: 95%+ on balanced test sets
- **Model Type**: Random Forest Classifier with 61 engineered features
- **False Positive Rate**: Target of less than 5%
- **Detection Capability**: Strong performance on common phishing patterns
- **Continuous Improvement (Planned)**: Manual retraining scripts exist, but automated continuous learning is not implemented yet

### Model Architecture
- Random Forest ensemble with hyperparameter tuning
- GridSearchCV for optimal parameter selection
- Cross-validation for robust performance estimates
- Feature importance analysis for interpretability

---

## Reproducibility and Dissertation Results

### Important: Continuous Learning Status

**This project does NOT implement automated continuous learning.**

-  **What exists**: Manual retraining scripts (`train_url_model.py`, `train_all_models.py`) that allow retraining the model on new data
-  **What does NOT exist**: Automated pipelines that continuously update the model in production
-  **No feedback loop**: User analyses are not automatically used to retrain the model
-  **No scheduled retraining**: Models are only retrained when manually invoked

All dissertation results and claimed performance metrics come from manual experimental runs documented in `artifacts/runs/`.

### Running the Canonical Experiment

The reproducibility framework provides a single entry point for all dissertation experiments:

```bash
# Default run (seed=42, auto-generated run_id)
python scripts/run_experiment.py

# Specific seed for reproducibility
python scripts/run_experiment.py --seed 42

# Custom run ID with dataset snapshot for full reproducibility
python scripts/run_experiment.py --seed 42 --run_id baseline_experiment --save_dataset_snapshot

# Help text
python scripts/run_experiment.py --help
```

For convenience, you can also run the QoL wrapper (same canonical training path, with a pointer file for the latest run):

```bash
python scripts/qol_run.py --seed 42
cat artifacts/runs/latest_qol_run.json
```

### Artifact Locations and Structure

All experimental results are saved to `artifacts/runs/<run_id>/` with the following structure:

```
artifacts/runs/<run_id>/
├── dataset/
│   ├── dataset.csv                 (optional: full dataset snapshot)
│   ├── dataset_meta.json           (sample counts, phishing/legitimate ratio, timestamp, seed)
│   └── splits.json                 (train/val/test split sizes, random seed, stratification info)
├── model/
│   └── url_phish_rf_model.joblib   (trained RandomForest + feature names)
├── eval/
│   ├── metrics_summary.json        (accuracy, precision, recall, F1, ROC-AUC, PR-AUC, confusion matrix)
│   ├── y_test.npy                  (true test set labels)
│   ├── y_pred.npy                  (model predictions on test set)
│   ├── y_proba.npy                 (phishing probability scores)
│   ├── confusion_matrix.npy        (2×2 confusion matrix)
│   ├── feature_importance.csv      (feature names with importance scores)
│   ├── roc_curve.json              (FPR, TPR, thresholds, AUC for ROC curve)
│   ├── pr_curve.json               (precision, recall, thresholds, AP for PR curve)
│   ├── baseline_metrics.json       (baseline heuristic performance for comparison)
│   └── plots/
│       ├── roc_curve.png           (ROC curve visualization)
│       ├── pr_curve.png            (Precision-Recall curve visualization)
│       └── confusion_matrix.png    (Confusion matrix heatmap)
├── env/
│   └── environment.json            (git SHA, Python version, OS, timestamp, random seed)
└── run_manifest.json               (comprehensive metadata: all hyperparameters, dataset info, model path, all artifact paths)
```

### Using Results for Dissertation

**Official dissertation results must be sourced from `artifacts/runs/<run_id>/eval/metrics_summary.json`**

Example of metrics file:
```json
{
  "model_type": "RandomForest",
  "seed": 42,
  "test_set_size": 455,
  "accuracy": 0.9252747252747253,
  "precision": 0.9168831168831169,
  "recall": 0.9943661971830986,
  "f1": 0.9540540540540541,
  "roc_auc": 0.9874929577464788,
  "average_precision": 0.9964354838541492,
  "confusion_matrix": [[68, 32], [2, 353]]
}
```

### Reproducibility Guarantees

 **Deterministic execution**: All random processes seeded with explicit seed value
 **Full traceability**: Git commit SHA recorded in every run manifest
 **Auditable predictions**: All predictions, probabilities, and labels saved to `.npy` files
 **Verifiable metrics**: Every metric value computed from saved predictions
 **Publication-quality plots**: Consistent visualizations saved as PNG files
 **Complete metadata**: Run manifest includes all hyperparameters, environment info, and artifact paths

### Canonical Training Script

- **File**: `train_url_model.py`
- **Entry point**: `scripts/run_experiment.py` (recommended for full reproducibility)
- **Purpose**: Binary classification of phishing vs. legitimate URLs
- **Dataset**: `data/training/url_training_data_*.csv` (latest by timestamp)
- **Train/Val/Test split**: 60% / 20% / 20% (stratified by label)
- **Model**: Random Forest with GridSearchCV hyperparameter tuning
- **Features**: 61+ URL-derived features from `ml.advanced_url_features`

### Example: Reproducing Baseline Results

```bash
# Run with the default seed to reproduce baseline metrics
python scripts/run_experiment.py --seed 42 --run_id baseline_20260204

# After completion, view results
cat artifacts/runs/baseline_20260204/run_manifest.json
cat artifacts/runs/baseline_20260204/eval/metrics_summary.json

# Access all predictions for external validation
ls -lh artifacts/runs/baseline_20260204/eval/*.npy
```

---

## Design Philosophy

- **User-First**: Intuitive navigation and clear feedback
- **Interactive**: Engaging, game-like learning experience
- **Visual**: Modern design with gradients and animations
- **Accessible**: Works on all devices and screen sizes
- **Educational**: Every feature teaches something valuable
- **Reproducible**: All dissertation results fully auditable and reproducible via artifact persistence

---


## License

This project is part of a dissertation for COMP3000 at the University of Plymouth.

---

## Author

**Dylan** - [@Dylan-PlymouthUni](https://github.com/Dylan-PlymouthUni)

---

## Acknowledgments

- University of Plymouth COMP3000 Module
- FastAPI and React communities
- PhishTank, OpenPhish, and URLhaus for threat intelligence data
- Open-source phishing research community
- All contributors and testers

---

## Future Enhancements

- Real-time phishing feed integration
- Browser extension for on-the-fly URL checking
- Advanced deep learning models (CNN for screenshot analysis)
- Community-driven threat reporting
- API access for third-party integrations

---

**Disclaimer**: This application is for educational purposes only. While the machine learning models are trained on real data, always exercise caution with suspicious emails and websites in real-world scenarios.
