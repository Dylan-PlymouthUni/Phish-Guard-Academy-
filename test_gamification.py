#!/usr/bin/env python3
"""Test script to verify gamification data persistence and retrieval
This script performs a series of API calls to test the gamification features of the PhishGuard Academy platform.
 It verifies that user registration, login, analysis submission, challenge completion, lesson completion, profile retrieval, analytics retrieval, leaderboard access, and achievement retrieval are all functioning correctly and that the data is being persisted as expected. 
 The script prints out the results of each step for easy verification."""
import requests
import json

API_URL = "http://localhost:8000"

def test_workflow():
    """Test workflow."""
    print("=== PhishGuard Academy Gamification Test ===\n")
    
    # 1. Register a test user
    print("1. Registering test user...")
    register_data = {
        "email": "test@example.com",
        "password": "testpass123",
        "name": "Test User"
    }
    
    try:
        resp = requests.post(f"{API_URL}/api/auth/register", json=register_data)
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access_token")
            print(f"   ✓ Registered: {data.get('name')} (ID: {data.get('user_id')})")
            print(f"   Token: {token[:20]}...")
        else:
            # User might already exist, try login
            print("   User exists, logging in...")
            resp = requests.post(f"{API_URL}/api/auth/login", json={
                "email": register_data["email"],
                "password": register_data["password"]
            })
            data = resp.json()
            token = data.get("access_token")
            print(f"   ✓ Logged in: {data.get('name')}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Perform an analysis
    print("\n2. Performing phishing analysis...")
    analysis_data = {
        "text": "URGENT! Your account will be closed in 24 hours. Click here to verify: http://paypal-verify.suspicious.com",
        "url": "",
    }
    
    try:
        resp = requests.post(f"{API_URL}/api/analyze", data=analysis_data, headers=headers)
        if resp.status_code == 200:
            result = resp.json()
            print(f"   ✓ Analysis complete - Risk: {result.get('risk')}%")
            print(f"   Findings: {len(result.get('findings', []))} detected")
        else:
            print(f"   ✗ Failed: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # 3. Submit a challenge
    print("\n3. Submitting challenge...")
    challenge_data = {
        "challenge_id": "challenge_1",
        "answers": {
            "q1": "Email from 'paypa1.com' asking to verify account urgently",
            "q2": "The address does not match your bank's official domain",
            "q3": "Never click links in suspicious emails",
        }
    }
    
    try:
        resp = requests.post(f"{API_URL}/api/submit-challenge", json=challenge_data, headers=headers)
        if resp.status_code == 200:
            result = resp.json()
            print(f"   ✓ Challenge submitted - Score: {result.get('score')}%")
            print(f"   Passed: {result.get('passed')}, Points: {result.get('points_earned')}")
        else:
            print(f"   ✗ Failed: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # 4. Complete a lesson
    print("\n4. Completing lesson...")
    try:
        resp = requests.post(f"{API_URL}/api/complete-lesson/phishing_101", headers=headers)
        if resp.status_code == 200:
            result = resp.json()
            print(f"   ✓ Lesson completed - Points: {result.get('points_earned')}")
        else:
            print(f"   ✗ Failed: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # 5. Check profile
    print("\n5. Checking profile...")
    try:
        resp = requests.get(f"{API_URL}/api/auth/profile", headers=headers)
        if resp.status_code == 200:
            profile = resp.json()
            print(f"   ✓ Level: {profile.get('level')}, XP: {profile.get('xp')}, Streak: {profile.get('streak')}")
        else:
            print(f"   ✗ Failed: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # 6. Check analytics
    print("\n6. Checking analytics...")
    try:
        resp = requests.get(f"{API_URL}/api/analytics/summary", headers=headers)
        if resp.status_code == 200:
            analytics = resp.json()
            print(f"   ✓ Total analyses: {analytics.get('analyses', {}).get('total_analyses', 0)}")
            print(f"   Challenges passed: {analytics.get('challenges', {}).get('passed', 0)}")
            print(f"   Lessons completed: {analytics.get('lessons', {}).get('completed', 0)}")
        else:
            print(f"   ✗ Failed: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # 7. Check leaderboard
    print("\n7. Checking leaderboard...")
    try:
        resp = requests.get(f"{API_URL}/api/leaderboard", headers=headers)
        if resp.status_code == 200:
            lb = resp.json()
            print(f"   ✓ Leaderboard entries: {len(lb.get('leaderboard', []))}")
            print(f"   Your rank: {lb.get('current_user_rank')}")
            if lb.get('leaderboard'):
                top = lb['leaderboard'][0]
                print(f"   Top player: {top.get('name')} - {top.get('xp')} XP")
        else:
            print(f"   ✗ Failed: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # 8. Check achievements
    print("\n8. Checking achievements...")
    try:
        resp = requests.get(f"{API_URL}/api/auth/achievements", headers=headers)
        if resp.status_code == 200:
            achievements = resp.json()
            unlocked = [a for a in achievements.get('achievements', []) if a.get('unlocked')]
            print(f"   ✓ Unlocked: {len(unlocked)}/{achievements.get('total_achievements')}")
            for ach in unlocked:
                print(f"      • {ach.get('icon')} {ach.get('title')}")
        else:
            print(f"   ✗ Failed: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_workflow()
