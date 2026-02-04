#!/usr/bin/env python3
"""
⚠️  LEGACY/EXPERIMENTAL — not used for dissertation results.
Use scripts/run_experiment.py for reproducible dissertation results.

BERT Text Classifier Training Script
Trains a transformer model on phishing vs legitimate emails/text
"""
import sys
import logging
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from ml.text_classifier import TextPhishingClassifier, create_training_dataset

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Sample phishing emails (expand this with real data)
PHISHING_SAMPLES = [
    "URGENT: Your PayPal account has been limited! Click here to restore access immediately.",
    "Your Amazon order #12345 has failed. Update your payment information now to avoid cancellation.",
    "We've detected suspicious activity on your account. Verify your identity within 24 hours.",
    "Congratulations! You've won $1,000,000 in the lottery! Click to claim your prize.",
    "Your bank account will be locked unless you confirm your details immediately.",
    "Final notice: Your account will be suspended. Click here to verify now.",
    "Security Alert: Someone tried to access your account from Nigeria. Reset your password immediately.",
    "Your package delivery failed. Click to reschedule: http://fedex-tracking.tk",
    "Apple ID suspended due to unusual activity. Verify here: http://appleid-verify.xyz",
    "Your Microsoft Office subscription expired. Renew now to avoid data loss.",
    "IRS Tax Refund: You're eligible for $2,500 refund. Claim within 48 hours.",
    "Netflix: Your payment method was declined. Update billing to continue service.",
    "LinkedIn: Someone viewed your profile 15 times! See who: http://linkedin-views.ml",
    "Instagram: Your account has been reported. Verify identity to avoid deletion.",
    "WhatsApp: Your verification code is 12345. Share this to restore your account.",
]

LEGITIMATE_SAMPLES = [
    "Hi team, the meeting has been rescheduled to 3pm tomorrow. Please confirm your attendance.",
    "Your order has shipped! Track your package using the link in your account dashboard.",
    "Thank you for your recent purchase. Your receipt is attached.",
    "Reminder: Project deadline is next Friday. Let me know if you need any help.",
    "Your flight is confirmed for December 25th. Check-in opens 24 hours before departure.",
    "Monthly newsletter: Here's what's new this month in our community.",
    "Your subscription renewal is coming up. No action needed - we'll charge your card on file.",
    "Team lunch on Thursday at the usual place. See you there!",
    "Thanks for reaching out. I'll get back to you by end of week.",
    "Your password was successfully changed. If this wasn't you, contact support.",
    "Meeting notes from today's standup are available in the shared folder.",
    "Welcome to our service! Here's a quick guide to get started.",
    "Your report has been generated and is ready to download from your dashboard.",
    "Congratulations on completing the course! Your certificate is attached.",
    "System maintenance scheduled for this weekend. Expect brief downtime.",
]


def collect_more_data():
    """
    Instructions for collecting real training data
    """
    logger.info("=" * 60)
    logger.info("TO IMPROVE MODEL ACCURACY:")
    logger.info("=" * 60)
    logger.info("")
    logger.info("1. Collect real phishing emails from:")
    logger.info("   - PhishTank email corpus")
    logger.info("   - Your spam folder (anonymized)")
    logger.info("   - Public phishing datasets")
    logger.info("")
    logger.info("2. Collect legitimate emails from:")
    logger.info("   - Enron email dataset")
    logger.info("   - Your own inbox (anonymized)")
    logger.info("   - Public email corpuses")
    logger.info("")
    logger.info("3. Aim for at least 1,000 examples of each class")
    logger.info("")
    logger.info("4. Add them to this script's PHISHING_SAMPLES and LEGITIMATE_SAMPLES")
    logger.info("")
    logger.info("=" * 60)


def main():
    logger.info("=" * 60)
    logger.info("BERT Text Classifier Training")
    logger.info("=" * 60)
    
    # Check if we have enough data
    if len(PHISHING_SAMPLES) < 100 or len(LEGITIMATE_SAMPLES) < 100:
        logger.warning("")
        logger.warning("⚠️  WARNING: Training with minimal data!")
        logger.warning(f"   Phishing samples: {len(PHISHING_SAMPLES)}")
        logger.warning(f"   Legitimate samples: {len(LEGITIMATE_SAMPLES)}")
        logger.warning("")
        collect_more_data()
        response = input("\nContinue anyway? (y/N): ")
        if response.lower() != 'y':
            logger.info("Exiting. Collect more data and try again.")
            return
    
    # Create dataset
    logger.info(f"\nCreating training dataset...")
    logger.info(f"Phishing samples: {len(PHISHING_SAMPLES)}")
    logger.info(f"Legitimate samples: {len(LEGITIMATE_SAMPLES)}")
    
    texts, labels = create_training_dataset(LEGITIMATE_SAMPLES, PHISHING_SAMPLES)
    
    # Split train/validation (80/20)
    split_idx = int(len(texts) * 0.8)
    train_texts = texts[:split_idx]
    train_labels = labels[:split_idx]
    val_texts = texts[split_idx:]
    val_labels = labels[split_idx:]
    
    logger.info(f"Train size: {len(train_texts)}")
    logger.info(f"Validation size: {len(val_texts)}")
    
    # Initialize classifier
    logger.info("\nInitializing text classifier...")
    classifier = TextPhishingClassifier(model_name="distilbert-base-uncased", use_gpu=True)
    
    # Train
    output_dir = Path("ml/model/text_classifier")
    
    logger.info(f"\n{'='*60}")
    logger.info("Choose training method:")
    logger.info("1. BERT (slow, high accuracy, requires GPU)")
    logger.info("2. TF-IDF + Logistic Regression (fast, good accuracy)")
    logger.info("="*60)
    
    choice = input("Enter choice (1 or 2, default=2): ").strip() or "2"
    
    use_bert = choice == "1"
    
    if use_bert:
        logger.info("\n🚀 Training BERT model (this will take ~10-30 minutes)...")
        logger.info("💡 Tip: Use GPU for faster training (check torch.cuda.is_available())")
    else:
        logger.info("\n🚀 Training TF-IDF model (should take <1 minute)...")
    
    classifier.train(
        train_texts=train_texts,
        train_labels=train_labels,
        val_texts=val_texts,
        val_labels=val_labels,
        output_dir=output_dir,
        epochs=3 if use_bert else 1,
        batch_size=16,
        use_bert=use_bert
    )
    
    logger.info(f"\n✅ Model saved to: {output_dir}")
    logger.info("\n" + "="*60)
    logger.info("Next steps:")
    logger.info("1. Test the model: python test_text_model.py")
    logger.info("2. Update ensemble.py to load this model")
    logger.info("3. Restart backend: cd server && python -m uvicorn app:app --reload")
    logger.info("="*60)


if __name__ == "__main__":
    main()
