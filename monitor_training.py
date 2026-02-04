#!/usr/bin/env python3
"""
Monitor training progress
"""
import time
import subprocess

print("🔍 Training Progress Monitor")
print("=" * 70)

# Check if process is running
result = subprocess.run(
    ["ps", "aux"], 
    capture_output=True, 
    text=True
)

if "train_url_model.py" in result.stdout:
    print("✅ Training process is running")
    
    # Show last few lines of log
    log_result = subprocess.run(
        ["tail", "-50", "training_log.txt"],
        capture_output=True,
        text=True,
        cwd="/workspaces/Phish-Guard-Academy-"
    )
    
    print("\n📋 Last 50 lines of training log:")
    print("-" * 70)
    print(log_result.stdout)
    print("-" * 70)
    
    # Estimate progress
    lines = log_result.stdout.split('\n')
    processed_lines = [l for l in lines if "Processed" in l]
    if processed_lines:
        last_progress = processed_lines[-1]
        print(f"\n📊 Latest progress: {last_progress}")
        
        # Extract numbers
        if "/" in last_progress:
            try:
                parts = last_progress.split("Processed")[1].split("URLs")[0]
                current, total = parts.split("/")
                current = int(current.strip())
                total = int(total.strip())
                percent = (current / total) * 100
                print(f"   Progress: {percent:.1f}%")
                
                if current > 0:
                    # Estimate time remaining (rough)
                    elapsed = 120  # seconds since start (approximate)
                    rate = current / elapsed
                    remaining = total - current
                    eta = remaining / rate if rate > 0 else 0
                    print(f"   Estimated time remaining: {eta/60:.1f} minutes")
            except:
                pass
    
    print("\n💡 Training with speed optimizations:")
    print("   - WHOIS lookups: DISABLED")
    print("   - Page scraping: DISABLED")
    print("   - Redirect analysis: DISABLED")
    print("   - HTTP timeout: 1 second")
    print("\n   Expected completion: 5-15 minutes")
    
else:
    print("⚠️  Training process not found")
    print("\nTo start training:")
    print("  cd /workspaces/Phish-Guard-Academy-")
    print("  nohup python train_url_model.py > training_log.txt 2>&1 &")

print("\n" + "=" * 70)
print("To monitor in real-time: tail -f training_log.txt")
