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
- **Continuous Improvement**: Model updated with new threat data

### Model Architecture
- Random Forest ensemble with hyperparameter tuning
- GridSearchCV for optimal parameter selection
- Cross-validation for robust performance estimates
- Feature importance analysis for interpretability

---

## Design Philosophy

- **User-First**: Intuitive navigation and clear feedback
- **Interactive**: Engaging, game-like learning experience
- **Visual**: Modern design with gradients and animations
- **Accessible**: Works on all devices and screen sizes
- **Educational**: Every feature teaches something valuable

---

## Contributing

Contributions, issues, and feature requests are welcome! This is an academic project, but feedback is always appreciated.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

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
- Mobile application version
- Advanced deep learning models (CNN for screenshot analysis)
- Community-driven threat reporting
- API access for third-party integrations

---

**Disclaimer**: This application is for educational purposes only. While the machine learning models are trained on real data, always exercise caution with suspicious emails and websites in real-world scenarios.