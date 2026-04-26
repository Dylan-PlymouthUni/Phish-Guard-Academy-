"""
Behavioral Analysis System
Track user patterns and detect anomalies
This module defines the BehaviorAnalyzer class, which provides methods to log user activities, compute statistics, detect anomalies, and calculate risk scores based on user behavior patterns. 
The system is designed to monitor user interactions with the PhishGuard Academy platform, identify unusual activity that may indicate security risks or abuse, and provide insights into user engagement and progress.
 The BehaviorAnalyzer class uses in-memory storage for simplicity, but it can be extended to use a persistent database for production use.
  The global instance of BehaviorAnalyzer allows for easy integration with other parts of the application to log activities and analyze user behavior in real-time.
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import json
import logging

logger = logging.getLogger(__name__)

class BehaviorAnalyzer:
    """Analyze user behavior patterns and detect anomalies"""
    
    def __init__(self):
        # In-memory storage (in production, use database)
        """Initialize class state and store required dependencies."""
        self.user_activities: Dict[str, List[Dict]] = defaultdict(list)
        self.user_baselines: Dict[str, Dict] = {}
        
    def log_activity(self, username: str, activity_type: str, metadata: Dict = None):
        """
        Log a user activity
        
        Args:
            username: User identifier
            activity_type: Type of activity (analysis, login, challenge, etc.)
            metadata: Additional context about the activity
        """
        activity = {
            'type': activity_type,
            'timestamp': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        self.user_activities[username].append(activity)
        
        # Keep only last 1000 activities per user
        if len(self.user_activities[username]) > 1000:
            self.user_activities[username] = self.user_activities[username][-1000:]
    
    def get_user_stats(self, username: str, days: int = 7) -> Dict:
        """Get user activity statistics"""
        cutoff = datetime.now() - timedelta(days=days)
        recent_activities = [
            a for a in self.user_activities.get(username, [])
            if datetime.fromisoformat(a['timestamp']) > cutoff
        ]
        
        # Count activities by type
        activity_counts = defaultdict(int)
        for activity in recent_activities:
            activity_counts[activity['type']] += 1
        
        # Calculate average daily activity
        avg_daily = len(recent_activities) / days if days > 0 else 0
        
        return {
            'total_activities': len(recent_activities),
            'activity_by_type': dict(activity_counts),
            'avg_daily_activities': round(avg_daily, 2),
            'period_days': days
        }
    
    def detect_anomalies(self, username: str) -> List[Dict]:
        """
        Detect unusual behavior patterns
        
        Returns list of anomalies with severity levels
        """
        anomalies = []
        
        # Get recent activity
        last_hour = datetime.now() - timedelta(hours=1)
        recent = [
            a for a in self.user_activities.get(username, [])
            if datetime.fromisoformat(a['timestamp']) > last_hour
        ]
        
        if not recent:
            return anomalies
        
        # Check for rapid-fire activity (possible automation)
        if len(recent) > 50:
            anomalies.append({
                'type': 'rapid_activity',
                'severity': 'high',
                'description': f'{len(recent)} activities in last hour (possible bot)',
                'recommendation': 'Verify account security'
            })
        
        # Check for unusual login patterns
        login_attempts = [a for a in recent if a['type'] == 'login']
        if len(login_attempts) > 10:
            anomalies.append({
                'type': 'excessive_logins',
                'severity': 'medium',
                'description': f'{len(login_attempts)} login attempts in last hour',
                'recommendation': 'Check for credential stuffing'
            })
        
        # Check for analysis spam
        analysis_count = len([a for a in recent if a['type'] == 'analysis'])
        if analysis_count > 30:
            anomalies.append({
                'type': 'analysis_spam',
                'severity': 'medium',
                'description': f'{analysis_count} analyses in last hour',
                'recommendation': 'Rate limit may be needed'
            })
        
        # Check for baseline deviation
        baseline = self.user_baselines.get(username)
        if baseline:
            current_hourly = len(recent)
            expected_hourly = baseline.get('avg_hourly_activities', 5)
            
            if current_hourly > expected_hourly * 3:
                anomalies.append({
                    'type': 'baseline_deviation',
                    'severity': 'low',
                    'description': f'Activity {int(current_hourly/expected_hourly)}x normal baseline',
                    'recommendation': 'Monitor for suspicious patterns'
                })
        
        return anomalies
    
    def update_baseline(self, username: str):
        """Update user's behavioral baseline"""
        # Use last 30 days of data
        cutoff = datetime.now() - timedelta(days=30)
        activities = [
            a for a in self.user_activities.get(username, [])
            if datetime.fromisoformat(a['timestamp']) > cutoff
        ]
        
        if len(activities) < 10:
            # Not enough data for baseline
            return
        
        # Calculate baseline metrics
        total_hours = 30 * 24
        avg_hourly = len(activities) / total_hours
        
        activity_types = defaultdict(int)
        for activity in activities:
            activity_types[activity['type']] += 1
        
        self.user_baselines[username] = {
            'created_at': datetime.now().isoformat(),
            'avg_hourly_activities': avg_hourly,
            'total_activities': len(activities),
            'common_activities': dict(activity_types),
            'sample_size': len(activities)
        }
    
    def get_risk_score(self, username: str) -> Dict:
        """
        Calculate user risk score based on behavior
        
        Returns score (0-100) and contributing factors
        """
        anomalies = self.detect_anomalies(username)
        
        # Base risk score
        risk_score = 0
        factors = []
        
        for anomaly in anomalies:
            if anomaly['severity'] == 'high':
                risk_score += 40
                factors.append(anomaly['description'])
            elif anomaly['severity'] == 'medium':
                risk_score += 20
                factors.append(anomaly['description'])
            elif anomaly['severity'] == 'low':
                risk_score += 10
                factors.append(anomaly['description'])
        
        # Cap at 100
        risk_score = min(risk_score, 100)
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = 'critical'
        elif risk_score >= 50:
            risk_level = 'high'
        elif risk_score >= 30:
            risk_level = 'medium'
        elif risk_score >= 10:
            risk_level = 'low'
        else:
            risk_level = 'minimal'
        
        return {
            'score': risk_score,
            'level': risk_level,
            'factors': factors,
            'anomaly_count': len(anomalies)
        }
    
    def get_activity_timeline(self, username: str, hours: int = 24) -> List[Dict]:
        """Get user activity timeline for visualization"""
        cutoff = datetime.now() - timedelta(hours=hours)
        activities = [
            a for a in self.user_activities.get(username, [])
            if datetime.fromisoformat(a['timestamp']) > cutoff
        ]
        
        return sorted(activities, key=lambda x: x['timestamp'], reverse=True)[:50]


# Global instance
behavior_analyzer = BehaviorAnalyzer()
