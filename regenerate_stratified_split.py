import pandas as pd
from sklearn.model_selection import train_test_split
import sys

# Config
INPUT = "data/training/url_dataset.csv"
TRAIN_OUT = "data/training/url_train_set.csv"
TEST_OUT = "data/training/url_test_set.csv"
MIN_PER_CLASS = 20
TEST_SIZE = 0.2
RANDOM_STATE = 42

# Load data
try:
    df = pd.read_csv(INPUT)
except Exception as e:
    print(f"ERROR: Could not read {INPUT}: {e}")
    sys.exit(1)

if 'label' not in df.columns:
    print("ERROR: 'label' column not found in dataset.")
    sys.exit(1)

# Check class counts
counts = df['label'].value_counts().to_dict()
if min(counts.values()) < 2 * MIN_PER_CLASS:
    print(f"ERROR: Not enough samples per class to guarantee {MIN_PER_CLASS} in test set. Class counts: {counts}")
    sys.exit(1)

# Try stratified split until both classes have enough in test set
for attempt in range(100):
    train, test = train_test_split(df, test_size=TEST_SIZE, stratify=df['label'], random_state=RANDOM_STATE+attempt)
    test_counts = test['label'].value_counts().to_dict()
    if all(test_counts.get(cls,0) >= MIN_PER_CLASS for cls in counts):
        train.to_csv(TRAIN_OUT, index=False)
        test.to_csv(TEST_OUT, index=False)
        print(f"SUCCESS: Stratified split complete. Test set class counts: {test_counts}")
        sys.exit(0)
print(f"ERROR: Could not create test set with at least {MIN_PER_CLASS} samples per class after 100 attempts. Last test set counts: {test_counts}")
sys.exit(1)
