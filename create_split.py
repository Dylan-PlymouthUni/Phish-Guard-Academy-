#!/usr/bin/env python3
"""
Step 5: Create stratified train/test split
Ensures both classes have at least 20 samples in test set
"""
import pandas as pd
from sklearn.model_selection import train_test_split

def main():
    print("=" * 70)
    print("STEP 5: Creating Stratified Train/Test Split")
    print("=" * 70)
    
    # Load full dataset
    df = pd.read_csv("data/training/url_dataset_full.csv")
    print(f"\n📊 Loaded dataset: {len(df)} total URLs")
    print("\nClass distribution:")
    print(df['label'].value_counts())
    
    X = df[['url']]
    y = df['label']
    
    # Calculate test size to ensure at least 20 per class
    min_class_count = y.value_counts().min()
    print(f"\nSmallest class has {min_class_count} samples")
    
    # We need at least 20 in test set for smallest class
    # So test_size * min_class_count >= 20
    # test_size >= 20 / min_class_count
    min_test_ratio = 20 / min_class_count
    
    # Use 0.2 (20%) or higher if needed
    test_ratio = max(0.2, min_test_ratio + 0.01)  # Add small buffer
    
    if test_ratio > 0.2:
        print(f"⚠️  Adjusting test_size to {test_ratio:.3f} to ensure 20+ samples per class")
    else:
        print(f"✅ Using standard test_size of 0.2 (20%)")
        test_ratio = 0.2
    
    # Stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=test_ratio, 
        stratify=y, 
        random_state=42
    )
    
    # Combine back into DataFrames
    train_df = pd.concat([X_train.reset_index(drop=True), y_train.reset_index(drop=True)], axis=1)
    test_df = pd.concat([X_test.reset_index(drop=True), y_test.reset_index(drop=True)], axis=1)
    
    # Save
    train_df.to_csv("data/training/url_train_set.csv", index=False)
    test_df.to_csv("data/training/url_test_set.csv", index=False)
    
    print(f"\n✅ Train set created: {len(train_df)} samples")
    print("   Distribution:")
    train_counts = train_df['label'].value_counts().sort_index()
    for label, count in train_counts.items():
        label_name = "Legitimate" if label == 0 else "Phishing"
        print(f"      {label_name} (label={label}): {count}")
    
    print(f"\n✅ Test set created: {len(test_df)} samples")
    print("   Distribution:")
    test_counts = test_df['label'].value_counts().sort_index()
    for label, count in test_counts.items():
        label_name = "Legitimate" if label == 0 else "Phishing"
        print(f"      {label_name} (label={label}): {count}")
    
    # Safety check
    min_test_samples = test_df['label'].value_counts().min()
    if min_test_samples < 20:
        print(f"\n⚠️  WARNING: Test set has only {min_test_samples} samples for one class.")
        print("   This is below the recommended minimum of 20 samples.")
        print("   Consider gathering more data for better evaluation.")
        return False
    else:
        print(f"\n✅ Test set validation PASSED: Both classes have {min_test_samples}+ samples")
        return True

if __name__ == "__main__":
    success = main()
    print("\n" + "=" * 70)
    if success:
        print("Stratified split complete! Ready for training.")
    else:
        print("Split complete but with warnings. Proceeding anyway.")
    print("=" * 70)
