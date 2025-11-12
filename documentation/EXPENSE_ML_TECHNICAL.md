# Expense Tracker ML System - Technical Documentation

**Version**: 1.0
**Date**: November 11, 2025
**Status**: Technical Specification

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Cold Start Problem](#the-cold-start-problem)
3. [ML Architecture Overview](#ml-architecture-overview)
4. [Phase-Based ML Approach](#phase-based-ml-approach)
5. [Model Types & Selection](#model-types--selection)
6. [Feature Engineering](#feature-engineering)
7. [Training Strategy](#training-strategy)
8. [Model Evaluation](#model-evaluation)
9. [Inference Pipeline](#inference-pipeline)
10. [Continuous Learning](#continuous-learning)
11. [Technical Implementation](#technical-implementation)

---

## Executive Summary

The expense tracker uses a **progressive multi-stage ML system** that adapts to data availability:

- **Stage 0** (0 samples): Pre-trained universal model + hard-coded rules
- **Stage 1** (1-9 samples): Enhanced rule-based system with pattern matching
- **Stage 2** (10-49 samples): Simple Decision Tree classifier
- **Stage 3** (50-199 samples): Random Forest ensemble
- **Stage 4** (200+ samples): Gradient Boosting or Neural Network

**Key Innovation**: The system doesn't require constant retraining. It uses:
1. **On-demand training** triggered by data thresholds
2. **Lazy evaluation** (train only when needed)
3. **Model caching** (load once, use many times)
4. **Weekly batch retraining** (not real-time)

---

## The Cold Start Problem

### Problem Statement

When a new company starts using the expense tracker, we face the **cold start problem**:

- **No historical data** to train a personalized ML model
- **No user patterns** to learn from
- **No account preferences** established
- **Zero feedback** on what's correct

### Traditional Solutions (Why They Don't Work Here)

❌ **Collaborative Filtering**: Requires many users with similar patterns
❌ **Content-Based**: Requires rich item metadata we don't have
❌ **Pre-trained Models**: Accounting practices vary too much by industry
❌ **Manual Rules**: Too rigid, doesn't improve over time

### Our Solution: Hybrid Progressive System

✅ **Stage 0 (Bootstrap)**: Use universal rules + small pre-trained model
✅ **Stage 1 (Few-Shot)**: Learn from 1-9 examples with pattern matching
✅ **Stage 2 (Learning)**: Train simple model with 10+ examples
✅ **Stage 3 (Mature)**: Train complex model with 50+ examples
✅ **Stage 4 (Advanced)**: Deep learning with 200+ examples

---

## ML Architecture Overview

### System Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESSIVE ML ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────┘

Input: Expense (date, amount, description, merchant, category)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  1. Data Availability Check                     │
│  Query: SELECT COUNT(*) FROM ml_training_data WHERE company_id  │
└────────────────────────────┬────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │  Training Samples  │
                    └─────────┬─────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
   [0 samples]          [1-9 samples]         [10+ samples]
        ↓                     ↓                     ↓
┌───────────────┐    ┌───────────────┐    ┌──────────────────┐
│   Stage 0     │    │   Stage 1     │    │   Stage 2-4      │
│  Bootstrap    │    │  Few-Shot     │    │  ML Models       │
│               │    │               │    │                  │
│ - Universal   │    │ - Pattern     │    │ - Decision Tree  │
│   Rules       │    │   Matching    │    │ - Random Forest  │
│ - Keyword     │    │ - Similarity  │    │ - Gradient Boost │
│   Mapping     │    │   Search      │    │ - Neural Net     │
│ - Category    │    │ - Rule++      │    │                  │
│   Defaults    │    │               │    │                  │
└───────┬───────┘    └───────┬───────┘    └────────┬─────────┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                              ↓
                ┌─────────────────────────┐
                │  Account Suggestions    │
                │  (debit_id, credit_id)  │
                │  + Confidence Score     │
                └─────────────────────────┘
```

### Key Design Principles

1. **No Background Jobs Initially**: Don't train models continuously
2. **Lazy Training**: Train only when threshold reached
3. **Cached Inference**: Load model once, reuse for all predictions
4. **Graceful Degradation**: Always have a fallback (Stage 0)
5. **Transparent Confidence**: User knows how suggestion was made

---

## Phase-Based ML Approach

### Stage 0: Bootstrap Phase (0 Training Samples)

**Objective**: Provide reasonable suggestions with zero data

#### Components

##### 1. Universal Rule Engine

```python
class UniversalRuleEngine:
    """
    Hard-coded rules based on common accounting practices.
    These work for 70% of common expenses without any training.
    """

    KEYWORD_MAPPINGS = {
        # Transportation
        ('uber', 'lyft', 'taxi', 'parking', 'gas', 'fuel'): {
            'debit_account': 'Travel & Transportation Expense',
            'credit_account': 'Credit Card',
            'confidence': 0.70
        },

        # Meals
        ('restaurant', 'lunch', 'dinner', 'breakfast', 'coffee', 'starbucks'): {
            'debit_account': 'Meals & Entertainment Expense',
            'credit_account': 'Credit Card',
            'confidence': 0.68
        },

        # Office
        ('office', 'supplies', 'staples', 'paper', 'pen', 'ink'): {
            'debit_account': 'Office Supplies Expense',
            'credit_account': 'Cash',
            'confidence': 0.72
        },

        # Software
        ('software', 'subscription', 'saas', 'adobe', 'microsoft', 'zoom'): {
            'debit_account': 'Software & Subscriptions Expense',
            'credit_account': 'Credit Card',
            'confidence': 0.75
        },

        # Utilities
        ('electric', 'water', 'internet', 'phone', 'utility'): {
            'debit_account': 'Utilities Expense',
            'credit_account': 'Bank Account',
            'confidence': 0.73
        },

        # Marketing
        ('advertising', 'marketing', 'ad', 'google ads', 'facebook ads'): {
            'debit_account': 'Marketing & Advertising Expense',
            'credit_account': 'Credit Card',
            'confidence': 0.71
        },

        # Professional Services
        ('lawyer', 'attorney', 'consultant', 'accounting', 'legal'): {
            'debit_account': 'Professional Services Expense',
            'credit_account': 'Bank Account',
            'confidence': 0.69
        },

        # Insurance
        ('insurance', 'premium', 'coverage'): {
            'debit_account': 'Insurance Expense',
            'credit_account': 'Bank Account',
            'confidence': 0.74
        },

        # Rent
        ('rent', 'lease', 'landlord'): {
            'debit_account': 'Rent Expense',
            'credit_account': 'Bank Account',
            'confidence': 0.80
        },
    }

    MERCHANT_PATTERNS = {
        'amazon': 'Office Supplies Expense',
        'aws': 'Software & Subscriptions Expense',
        'google': 'Marketing & Advertising Expense',
        'microsoft': 'Software & Subscriptions Expense',
        'staples': 'Office Supplies Expense',
        'fedex': 'Shipping & Delivery Expense',
        'ups': 'Shipping & Delivery Expense',
    }

    def suggest(self, expense: Expense) -> Suggestion:
        """
        Match expense against rules.

        Priority:
        1. Exact merchant match (highest confidence)
        2. Keyword in description
        3. Category default
        4. Amount-based heuristic
        """
```

##### 2. Category Default Mapping

When user selects a category, use its default accounts:

```python
DEFAULT_CATEGORY_MAPPINGS = {
    'Travel & Transportation': {
        'debit': 'Travel Expense',
        'credit': 'Credit Card',
        'confidence': 0.65
    },
    'Meals & Entertainment': {
        'debit': 'Meals Expense',
        'credit': 'Credit Card',
        'confidence': 0.65
    },
    # ... etc
}
```

##### 3. Amount-Based Heuristics

```python
def amount_heuristic(amount: Decimal, description: str) -> dict:
    """
    Use amount to infer payment method and confidence.

    Heuristics:
    - Small amounts (<$50): Likely cash or credit card
    - Medium amounts ($50-$500): Likely credit card
    - Large amounts (>$500): Likely bank transfer or check
    - Round numbers ($100, $500, $1000): Likely recurring/subscription
    """
    if amount < 50:
        payment_method = 'Credit Card' if 'restaurant' in description else 'Cash'
        confidence = 0.60
    elif amount < 500:
        payment_method = 'Credit Card'
        confidence = 0.62
    else:
        payment_method = 'Bank Account'
        confidence = 0.58

    return {
        'credit_account': payment_method,
        'confidence': confidence
    }
```

##### 4. Pre-trained Universal Model (Optional)

Train a lightweight model on **synthetic dataset** of common expenses:

```python
# Synthetic training data (1000 samples)
synthetic_data = [
    {'desc': 'Uber ride to airport', 'amount': 45, 'category': 'Travel',
     'debit': 'Travel Expense', 'credit': 'Credit Card'},
    {'desc': 'Lunch at cafe', 'amount': 25, 'category': 'Meals',
     'debit': 'Meals Expense', 'credit': 'Credit Card'},
    # ... 998 more common patterns
]

# Train universal model once, ship with application
universal_model = DecisionTreeClassifier()
universal_model.fit(synthetic_features, synthetic_labels)

# Confidence: 0.50-0.65 (lower than company-specific model)
```

**Why this works**: 80% of small business expenses fall into ~20 common categories

#### Stage 0 Performance

- **Accuracy**: 60-70% on first-time users
- **Confidence**: 0.50-0.75 depending on match quality
- **Latency**: <50ms (no ML inference, just rules)
- **Coverage**: 85% of expenses get a suggestion

---

### Stage 1: Few-Shot Learning (1-9 Training Samples)

**Objective**: Learn from minimal data without overfitting

#### Challenges

- **Too few samples** to train traditional ML models
- **High variance** risk (overfitting to 5 examples)
- **No pattern diversity** yet

#### Solution: Enhanced Pattern Matching

##### 1. Exact Match

If we've seen this exact expense before, reuse it:

```python
def exact_match(expense: Expense, training_data: List[TrainingData]) -> Optional[Suggestion]:
    """
    Check if we've seen identical expense before.

    Match criteria:
    - Same description (case-insensitive, fuzzy match >90%)
    - Same merchant (exact match)
    - Similar amount (±10%)
    """
    for sample in training_data:
        if (
            fuzzy_match(expense.description, sample.description) > 0.9 and
            expense.merchant == sample.merchant and
            abs(expense.amount - sample.amount) / sample.amount < 0.1
        ):
            return Suggestion(
                debit_account_id=sample.debit_account_id,
                credit_account_id=sample.credit_account_id,
                confidence=0.85,  # High confidence for exact match
                method='exact_match'
            )
    return None
```

##### 2. Similarity Search

Find most similar historical expense:

```python
def similarity_search(expense: Expense, training_data: List[TrainingData]) -> Suggestion:
    """
    Find most similar expense using combined similarity score.

    Similarity factors:
    - Description (TF-IDF cosine similarity): 50% weight
    - Merchant (exact or fuzzy match): 30% weight
    - Amount (normalized distance): 10% weight
    - Category (exact match bonus): 10% weight
    """

    similarities = []
    for sample in training_data:
        # Text similarity (TF-IDF)
        desc_sim = cosine_similarity(
            tfidf_vectorizer.transform([expense.description]),
            tfidf_vectorizer.transform([sample.description])
        )[0][0]

        # Merchant similarity
        merchant_sim = 1.0 if expense.merchant == sample.merchant else 0.5

        # Amount similarity (inverse distance, normalized)
        amount_diff = abs(expense.amount - sample.amount)
        max_amount = max(expense.amount, sample.amount)
        amount_sim = 1.0 - min(amount_diff / max_amount, 1.0)

        # Category similarity
        category_sim = 1.0 if expense.category_id == sample.category_id else 0.5

        # Combined score
        score = (
            0.5 * desc_sim +
            0.3 * merchant_sim +
            0.1 * amount_sim +
            0.1 * category_sim
        )

        similarities.append((score, sample))

    # Get best match
    best_score, best_sample = max(similarities, key=lambda x: x[0])

    # Confidence scales with similarity score
    confidence = 0.55 + (best_score * 0.25)  # Range: 0.55-0.80

    return Suggestion(
        debit_account_id=best_sample.debit_account_id,
        credit_account_id=best_sample.credit_account_id,
        confidence=confidence,
        method='similarity_search'
    )
```

##### 3. Frequency-Based Suggestion

If user consistently uses certain accounts, prefer them:

```python
def frequency_suggestion(training_data: List[TrainingData]) -> dict:
    """
    Find user's most common account choices.

    Useful for users with consistent patterns:
    - Always pay with same credit card
    - Always expense to same accounts
    """

    # Count account usage
    debit_counts = Counter(sample.debit_account_id for sample in training_data)
    credit_counts = Counter(sample.credit_account_id for sample in training_data)

    # Get most common
    most_common_debit = debit_counts.most_common(1)[0]
    most_common_credit = credit_counts.most_common(1)[0]

    # Calculate confidence based on frequency
    total_samples = len(training_data)
    debit_confidence = most_common_debit[1] / total_samples
    credit_confidence = most_common_credit[1] / total_samples

    return {
        'debit_account_id': most_common_debit[0],
        'credit_account_id': most_common_credit[0],
        'confidence': min(debit_confidence, credit_confidence) * 0.9,  # Cap at 0.9
        'method': 'frequency'
    }
```

#### Stage 1 Algorithm Flow

```python
def stage1_suggest(expense: Expense, training_data: List[TrainingData]) -> Suggestion:
    """
    Few-shot learning strategy.

    Priority:
    1. Exact match (if found) → 0.85 confidence
    2. High similarity (>0.8) → 0.70-0.80 confidence
    3. Frequency-based (if consistent pattern) → 0.60-0.70 confidence
    4. Fall back to Stage 0 rules → 0.50-0.65 confidence
    """

    # Try exact match
    exact = exact_match(expense, training_data)
    if exact:
        return exact

    # Try similarity search
    similar = similarity_search(expense, training_data)
    if similar.confidence > 0.75:
        return similar

    # Try frequency
    if len(training_data) >= 5:  # Need at least 5 samples for frequency
        freq = frequency_suggestion(training_data)
        if freq['confidence'] > similar.confidence:
            return Suggestion(**freq)

    # Return similarity result or fall back to Stage 0
    return similar if similar.confidence > 0.60 else stage0_suggest(expense)
```

#### Stage 1 Performance

- **Accuracy**: 70-75% (better than Stage 0)
- **Confidence**: 0.55-0.85 depending on match quality
- **Latency**: 50-100ms (TF-IDF + similarity calc)
- **Coverage**: 90% of expenses get suggestions

---

### Stage 2: Simple ML (10-49 Training Samples)

**Objective**: Train first real ML model with minimal data

#### Model Choice: Decision Tree Classifier

**Why Decision Trees?**

✅ **Interpretable**: Can visualize decision path
✅ **Low data requirements**: Works well with 10-50 samples
✅ **Fast training**: <1 second
✅ **No hyperparameter tuning**: Reasonable defaults
✅ **Handles categorical and numerical**: Mixed features
❌ **Prone to overfitting**: Mitigated with max_depth limit

#### Architecture

```python
from sklearn.tree import DecisionTreeClassifier
from sklearn.multioutput import MultiOutputClassifier

class Stage2Model:
    """
    Simple decision tree for 10-49 training samples.
    """

    def __init__(self):
        self.debit_classifier = DecisionTreeClassifier(
            max_depth=5,          # Prevent overfitting
            min_samples_split=3,  # Need at least 3 samples to split
            min_samples_leaf=2,   # Leaf must have 2+ samples
            random_state=42
        )
        self.credit_classifier = DecisionTreeClassifier(
            max_depth=5,
            min_samples_split=3,
            min_samples_leaf=2,
            random_state=42
        )

        self.vectorizer = TfidfVectorizer(
            max_features=50,      # Limit features with small data
            ngram_range=(1, 2),   # Unigrams and bigrams
            stop_words='english'
        )

    def train(self, training_data: List[TrainingData]):
        """
        Train two separate classifiers:
        1. Debit account classifier
        2. Credit account classifier
        """

        # Extract features
        X = self._extract_features(training_data)
        y_debit = [sample.debit_account_id for sample in training_data]
        y_credit = [sample.credit_account_id for sample in training_data]

        # Train classifiers
        self.debit_classifier.fit(X, y_debit)
        self.credit_classifier.fit(X, y_credit)

        # Evaluate
        debit_score = self.debit_classifier.score(X, y_debit)
        credit_score = self.credit_classifier.score(X, y_credit)

        return {
            'debit_accuracy': debit_score,
            'credit_accuracy': credit_score,
            'avg_accuracy': (debit_score + credit_score) / 2
        }

    def predict(self, expense: Expense) -> Suggestion:
        """
        Predict accounts with confidence scores.
        """

        X = self._extract_features([expense])

        # Get predictions
        debit_account = self.debit_classifier.predict(X)[0]
        credit_account = self.credit_classifier.predict(X)[0]

        # Get probabilities (confidence)
        debit_proba = self.debit_classifier.predict_proba(X)[0]
        credit_proba = self.credit_classifier.predict_proba(X)[0]

        # Max probability is confidence
        debit_confidence = max(debit_proba)
        credit_confidence = max(credit_proba)

        # Combined confidence (geometric mean)
        combined_confidence = (debit_confidence * credit_confidence) ** 0.5

        return Suggestion(
            debit_account_id=debit_account,
            credit_account_id=credit_account,
            confidence=combined_confidence,
            method='decision_tree'
        )

    def _extract_features(self, data: List[Union[TrainingData, Expense]]) -> np.ndarray:
        """
        Extract feature vector from expense.

        Features (in order):
        - TF-IDF of description (50 dims)
        - Amount (log-scaled)
        - Day of week (0-6)
        - Month (1-12)
        - Is weekend (0/1)
        - Category ID (one-hot encoded)
        - Merchant hash (one-hot encoded, top 10)
        - Payment method (one-hot encoded)

        Total: ~70 features
        """

        # Text features
        descriptions = [d.description for d in data]
        text_features = self.vectorizer.fit_transform(descriptions).toarray()

        # Numerical features
        numerical_features = []
        for d in data:
            features = [
                np.log1p(float(d.amount)),              # Log amount
                d.date.weekday(),                        # Day of week
                d.date.month,                            # Month
                1 if d.date.weekday() >= 5 else 0,      # Is weekend
            ]

            # Category (one-hot)
            category_vector = self._one_hot_category(d.category_id)
            features.extend(category_vector)

            # Merchant (hash)
            merchant_hash = hash(d.merchant or '') % 10
            merchant_vector = [1 if i == merchant_hash else 0 for i in range(10)]
            features.extend(merchant_vector)

            # Payment method (one-hot)
            payment_vector = self._one_hot_payment(d.payment_method)
            features.extend(payment_vector)

            numerical_features.append(features)

        # Combine
        numerical_features = np.array(numerical_features)
        combined = np.hstack([text_features, numerical_features])

        return combined
```

#### Training Trigger

```python
def should_train_stage2(company_id: UUID, db: Session) -> bool:
    """
    Train Stage 2 model when:
    1. Have 10+ training samples
    2. No active model exists, OR
    3. 10+ new samples since last training
    """

    total_samples = db.query(MLTrainingData).filter_by(company_id=company_id).count()

    if total_samples < 10:
        return False

    active_model = db.query(MLModel).filter_by(
        company_id=company_id,
        is_active=True
    ).first()

    if not active_model:
        return True

    # Check new samples since last training
    new_samples = db.query(MLTrainingData).filter(
        MLTrainingData.company_id == company_id,
        MLTrainingData.created_at > active_model.trained_at
    ).count()

    return new_samples >= 10
```

#### Stage 2 Performance

- **Accuracy**: 75-82% (trained on user's actual data)
- **Confidence**: 0.65-0.90 depending on prediction probability
- **Training Time**: 0.5-2 seconds
- **Inference Time**: 10-30ms
- **Model Size**: 50-200 KB
- **Coverage**: 95% of expenses get suggestions

---

### Stage 3: Ensemble ML (50-199 Training Samples)

**Objective**: Improve accuracy with ensemble methods

#### Model Choice: Random Forest Classifier

**Why Random Forest?**

✅ **Better generalization**: Multiple trees reduce overfitting
✅ **Feature importance**: Can rank which features matter most
✅ **Handles noise**: Robust to outliers
✅ **Non-linear patterns**: Captures complex relationships
❌ **Slower training**: 5-10 seconds
❌ **Larger model**: 1-5 MB

#### Architecture

```python
from sklearn.ensemble import RandomForestClassifier

class Stage3Model:
    """
    Random Forest ensemble for 50-199 samples.
    """

    def __init__(self):
        self.debit_classifier = RandomForestClassifier(
            n_estimators=50,      # 50 trees (balanced accuracy/speed)
            max_depth=10,         # Deeper than Stage 2
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',  # Randomize feature selection
            random_state=42,
            n_jobs=-1             # Use all CPU cores
        )
        self.credit_classifier = RandomForestClassifier(
            n_estimators=50,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=42,
            n_jobs=-1
        )

        self.vectorizer = TfidfVectorizer(
            max_features=100,     # More features than Stage 2
            ngram_range=(1, 3),   # Include trigrams
            stop_words='english'
        )

    def train(self, training_data: List[TrainingData]):
        """
        Train Random Forest with cross-validation.
        """

        X = self._extract_features(training_data)
        y_debit = [sample.debit_account_id for sample in training_data]
        y_credit = [sample.credit_account_id for sample in training_data]

        # Split train/test (80/20)
        X_train, X_test, y_debit_train, y_debit_test, y_credit_train, y_credit_test = \
            train_test_split(X, y_debit, y_credit, test_size=0.2, random_state=42)

        # Train
        self.debit_classifier.fit(X_train, y_debit_train)
        self.credit_classifier.fit(X_train, y_credit_train)

        # Evaluate on test set
        debit_score = self.debit_classifier.score(X_test, y_debit_test)
        credit_score = self.credit_classifier.score(X_test, y_credit_test)

        # Feature importance
        debit_importance = self.debit_classifier.feature_importances_
        credit_importance = self.credit_classifier.feature_importances_

        return {
            'debit_accuracy': debit_score,
            'credit_accuracy': credit_score,
            'avg_accuracy': (debit_score + credit_score) / 2,
            'feature_importance': {
                'debit': debit_importance.tolist(),
                'credit': credit_importance.tolist()
            }
        }
```

#### Stage 3 Performance

- **Accuracy**: 82-88%
- **Confidence**: 0.70-0.95
- **Training Time**: 5-10 seconds
- **Inference Time**: 20-50ms
- **Model Size**: 1-5 MB
- **Coverage**: 98% of expenses

---

### Stage 4: Advanced ML (200+ Training Samples)

**Objective**: Maximum accuracy with deep learning (optional)

#### Model Choice: Gradient Boosting or Neural Network

**Option A: Gradient Boosting (XGBoost/LightGBM)**

```python
from xgboost import XGBClassifier

class Stage4aModel:
    """
    Gradient Boosting for 200+ samples.
    """

    def __init__(self):
        self.debit_classifier = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        self.credit_classifier = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
```

**Option B: Neural Network (PyTorch)**

```python
import torch
import torch.nn as nn

class AccountClassifierNet(nn.Module):
    """
    Simple feedforward neural network.
    """

    def __init__(self, input_dim, num_debit_classes, num_credit_classes):
        super().__init__()

        # Shared layers (learn general expense patterns)
        self.shared = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
        )

        # Debit account head
        self.debit_head = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, num_debit_classes)
        )

        # Credit account head
        self.credit_head = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, num_credit_classes)
        )

    def forward(self, x):
        shared_features = self.shared(x)
        debit_logits = self.debit_head(shared_features)
        credit_logits = self.credit_head(shared_features)
        return debit_logits, credit_logits
```

#### Stage 4 Performance

- **Accuracy**: 88-95%
- **Confidence**: 0.75-0.98
- **Training Time**: 30-60 seconds
- **Inference Time**: 50-100ms
- **Model Size**: 5-50 MB
- **Coverage**: 99% of expenses

---

## Feature Engineering

### Feature Categories

#### 1. Text Features (Most Important)

```python
# Description TF-IDF
vectorizer = TfidfVectorizer(
    max_features=100,
    ngram_range=(1, 3),
    stop_words='english',
    lowercase=True,
    strip_accents='unicode'
)

# Extract tokens
description_features = vectorizer.fit_transform(descriptions)

# Result: 100-dimensional sparse vector
# Example: "Lunch at Starbucks" → [0, 0, 0.7, 0, 0.5, ...]
#                                    ^lunch  ^starbucks
```

#### 2. Numerical Features

```python
def extract_numerical_features(expense: Expense) -> List[float]:
    return [
        # Amount (log-scaled to reduce range)
        np.log1p(float(expense.amount)),

        # Amount bucket (categorical → numerical)
        amount_bucket(expense.amount),  # 0-4 for [0-50, 50-200, 200-1000, 1000+]

        # Date features
        expense.date.weekday(),          # 0-6 (Monday-Sunday)
        expense.date.month,              # 1-12
        expense.date.day,                # 1-31

        # Boolean features
        1 if expense.date.weekday() >= 5 else 0,  # Is weekend
        1 if expense.date.day <= 7 else 0,        # Is first week of month
        1 if expense.date.day >= 25 else 0,       # Is last week of month

        # Derived features
        expense.amount / 100,            # Amount in hundreds
        1 if expense.amount % 100 == 0 else 0,  # Is round number
    ]
```

#### 3. Categorical Features (One-Hot Encoded)

```python
def one_hot_category(category_id: Optional[UUID], all_categories: List[UUID]) -> List[int]:
    """
    Convert category to one-hot vector.

    Example:
    Categories: [cat1, cat2, cat3]
    category_id = cat2
    Result: [0, 1, 0]
    """
    if category_id is None:
        return [0] * len(all_categories)

    try:
        idx = all_categories.index(category_id)
        vector = [0] * len(all_categories)
        vector[idx] = 1
        return vector
    except ValueError:
        return [0] * len(all_categories)

# Similar for payment_method
PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'other']

def one_hot_payment(payment_method: Optional[str]) -> List[int]:
    if payment_method is None or payment_method not in PAYMENT_METHODS:
        return [0] * len(PAYMENT_METHODS)

    idx = PAYMENT_METHODS.index(payment_method)
    vector = [0] * len(PAYMENT_METHODS)
    vector[idx] = 1
    return vector
```

#### 4. Merchant Features

```python
def extract_merchant_features(merchant: Optional[str], training_data: List[TrainingData]) -> List[float]:
    """
    Merchant features:
    1. Merchant hash (bucket into 20 bins)
    2. Merchant frequency (how often seen)
    3. Merchant consistency (does it always map to same account?)
    """

    if not merchant:
        return [0] * 22

    # Hash merchant to bucket (0-19)
    merchant_hash = hash(merchant.lower()) % 20
    merchant_vector = [1 if i == merchant_hash else 0 for i in range(20)]

    # Frequency: How many times have we seen this merchant?
    merchant_count = sum(1 for sample in training_data if sample.merchant == merchant)
    frequency = min(merchant_count / 10, 1.0)  # Normalize to [0, 1]

    # Consistency: Do we always use same account for this merchant?
    if merchant_count > 0:
        accounts = [sample.debit_account_id for sample in training_data if sample.merchant == merchant]
        most_common_count = Counter(accounts).most_common(1)[0][1]
        consistency = most_common_count / merchant_count
    else:
        consistency = 0

    return merchant_vector + [frequency, consistency]
```

#### 5. Historical Features (Stage 3+)

```python
def extract_historical_features(expense: Expense, training_data: List[TrainingData]) -> List[float]:
    """
    Learn from user's historical patterns.

    Features:
    - User's most common debit account (frequency)
    - User's most common credit account (frequency)
    - Average expense amount
    - Typical payment method
    """

    if len(training_data) < 10:
        return [0] * 4

    # Most common accounts
    debit_counts = Counter(sample.debit_account_id for sample in training_data)
    credit_counts = Counter(sample.credit_account_id for sample in training_data)

    most_common_debit_freq = debit_counts.most_common(1)[0][1] / len(training_data)
    most_common_credit_freq = credit_counts.most_common(1)[0][1] / len(training_data)

    # Average amount (normalized by current amount)
    avg_amount = sum(float(sample.amount) for sample in training_data) / len(training_data)
    amount_ratio = float(expense.amount) / avg_amount if avg_amount > 0 else 1.0

    # Payment method frequency
    payment_counts = Counter(sample.payment_method for sample in training_data if sample.payment_method)
    most_common_payment_freq = payment_counts.most_common(1)[0][1] / len(training_data) if payment_counts else 0

    return [
        most_common_debit_freq,
        most_common_credit_freq,
        amount_ratio,
        most_common_payment_freq
    ]
```

### Complete Feature Vector

```python
def extract_complete_features(expense: Expense, training_data: List[TrainingData]) -> np.ndarray:
    """
    Extract complete feature vector.

    Feature dimensions:
    - Text (TF-IDF): 100
    - Numerical: 10
    - Category (one-hot): 10 (typical # of categories)
    - Payment (one-hot): 6
    - Merchant: 22
    - Historical: 4

    Total: ~152 features
    """

    text_features = extract_text_features(expense)          # 100
    numerical_features = extract_numerical_features(expense) # 10
    category_features = one_hot_category(expense.category_id) # 10
    payment_features = one_hot_payment(expense.payment_method) # 6
    merchant_features = extract_merchant_features(expense.merchant, training_data) # 22
    historical_features = extract_historical_features(expense, training_data) # 4

    # Concatenate
    all_features = np.concatenate([
        text_features,
        numerical_features,
        category_features,
        payment_features,
        merchant_features,
        historical_features
    ])

    return all_features
```

---

## Training Strategy

### When to Train

**NOT real-time!** Train only when necessary:

#### Trigger Conditions

```python
def should_retrain(company_id: UUID, db: Session) -> bool:
    """
    Retrain model if ANY of these conditions:

    1. No model exists and have enough data (10+ samples)
    2. 10+ new samples since last training
    3. Accuracy dropped below threshold (70%)
    4. Scheduled weekly retrain (Sundays)
    5. Manual trigger by admin
    """

    total_samples = db.query(MLTrainingData).filter_by(company_id=company_id).count()

    # Condition 1: No model, enough data
    active_model = db.query(MLModel).filter_by(
        company_id=company_id,
        is_active=True
    ).first()

    if not active_model and total_samples >= 10:
        return True

    if not active_model:
        return False

    # Condition 2: New samples threshold
    new_samples = db.query(MLTrainingData).filter(
        MLTrainingData.company_id == company_id,
        MLTrainingData.created_at > active_model.trained_at
    ).count()

    if new_samples >= 10:
        return True

    # Condition 3: Accuracy dropped (check recent predictions)
    recent_accuracy = calculate_recent_accuracy(company_id, db)
    if recent_accuracy < 0.70:
        return True

    # Condition 4: Weekly schedule
    last_trained = active_model.trained_at
    if (datetime.now() - last_trained).days >= 7:
        return True

    return False
```

### Training Pipeline

```python
async def train_model_pipeline(company_id: UUID, db: Session) -> MLModel:
    """
    Complete training pipeline.

    Steps:
    1. Fetch training data
    2. Validate data quality
    3. Select model stage based on sample count
    4. Train model
    5. Evaluate performance
    6. Save model if good enough
    7. Activate if better than current
    """

    # Step 1: Fetch data
    training_data = db.query(MLTrainingData).filter_by(
        company_id=company_id
    ).order_by(MLTrainingData.created_at.desc()).limit(1000).all()

    if len(training_data) < 10:
        raise ValueError("Insufficient training data (need at least 10 samples)")

    # Step 2: Validate data quality
    validate_training_data(training_data)

    # Step 3: Select model stage
    if len(training_data) >= 200:
        model = Stage4Model()
        model_type = 'gradient_boosting'
    elif len(training_data) >= 50:
        model = Stage3Model()
        model_type = 'random_forest'
    else:
        model = Stage2Model()
        model_type = 'decision_tree'

    # Step 4: Train
    logger.info(f"Training {model_type} with {len(training_data)} samples")
    start_time = time.time()

    metrics = model.train(training_data)

    training_time = time.time() - start_time
    logger.info(f"Training completed in {training_time:.2f}s, accuracy: {metrics['avg_accuracy']:.2%}")

    # Step 5: Evaluate
    if metrics['avg_accuracy'] < 0.65:
        logger.warning("Model accuracy too low, not saving")
        return None

    # Step 6: Save model
    import joblib
    model_bytes = joblib.dumps(model)

    new_model = MLModel(
        company_id=company_id,
        model_type=model_type,
        version=f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        model_data=model_bytes,
        accuracy=metrics['avg_accuracy'],
        training_samples=len(training_data),
        feature_importance=metrics.get('feature_importance'),
        is_active=False,
        trained_at=datetime.now()
    )

    db.add(new_model)
    db.commit()

    # Step 7: Activate if better
    current_model = db.query(MLModel).filter_by(
        company_id=company_id,
        is_active=True
    ).first()

    should_activate = (
        not current_model or
        new_model.accuracy > current_model.accuracy + 0.02  # 2% improvement threshold
    )

    if should_activate:
        # Deactivate old model
        if current_model:
            current_model.is_active = False

        # Activate new model
        new_model.is_active = True
        new_model.activated_at = datetime.now()

        db.commit()
        logger.info(f"Activated new model {new_model.version} (accuracy: {new_model.accuracy:.2%})")

    return new_model
```

### Data Validation

```python
def validate_training_data(training_data: List[MLTrainingData]) -> None:
    """
    Validate training data quality.

    Checks:
    1. Minimum sample size
    2. No duplicate entries
    3. Valid account IDs
    4. Reasonable amount ranges
    5. Non-empty descriptions
    6. Class balance (no single account >80%)
    """

    if len(training_data) < 10:
        raise ValueError("Need at least 10 training samples")

    # Check duplicates
    descriptions = [sample.description for sample in training_data]
    if len(descriptions) != len(set(descriptions)):
        logger.warning("Found duplicate descriptions in training data")

    # Check account distribution
    debit_accounts = [sample.debit_account_id for sample in training_data]
    credit_accounts = [sample.credit_account_id for sample in training_data]

    debit_counts = Counter(debit_accounts)
    credit_counts = Counter(credit_accounts)

    # Check if one account dominates (>80%)
    most_common_debit = debit_counts.most_common(1)[0][1]
    most_common_credit = credit_counts.most_common(1)[0][1]

    if most_common_debit / len(training_data) > 0.8:
        logger.warning("Debit account distribution is imbalanced")

    if most_common_credit / len(training_data) > 0.8:
        logger.warning("Credit account distribution is imbalanced")

    # Check amounts
    amounts = [float(sample.amount) for sample in training_data]
    if max(amounts) > 1000000:
        logger.warning("Found very large amount in training data")

    # Check descriptions
    for sample in training_data:
        if not sample.description or len(sample.description) < 3:
            raise ValueError(f"Invalid description in training sample {sample.id}")
```

---

## Model Evaluation

### Metrics

```python
def evaluate_model(model: BaseModel, test_data: List[TrainingData]) -> dict:
    """
    Evaluate model on test set.

    Metrics:
    - Accuracy: % of exact matches (both debit and credit correct)
    - Debit Accuracy: % of correct debit accounts
    - Credit Accuracy: % of correct credit accounts
    - Top-3 Accuracy: % where correct account is in top 3 predictions
    - Average Confidence: Mean confidence score
    - Precision/Recall per account
    """

    predictions = [model.predict(sample) for sample in test_data]
    actuals_debit = [sample.debit_account_id for sample in test_data]
    actuals_credit = [sample.credit_account_id for sample in test_data]

    # Exact match accuracy
    exact_matches = sum(
        1 for pred, actual_d, actual_c in zip(predictions, actuals_debit, actuals_credit)
        if pred.debit_account_id == actual_d and pred.credit_account_id == actual_c
    )
    accuracy = exact_matches / len(test_data)

    # Individual account accuracy
    debit_correct = sum(
        1 for pred, actual in zip(predictions, actuals_debit)
        if pred.debit_account_id == actual
    )
    debit_accuracy = debit_correct / len(test_data)

    credit_correct = sum(
        1 for pred, actual in zip(predictions, actuals_credit)
        if pred.credit_account_id == actual
    )
    credit_accuracy = credit_correct / len(test_data)

    # Average confidence
    avg_confidence = sum(pred.confidence for pred in predictions) / len(predictions)

    # Confusion matrix (for debit accounts)
    debit_confusion = confusion_matrix(
        actuals_debit,
        [pred.debit_account_id for pred in predictions]
    )

    return {
        'accuracy': accuracy,
        'debit_accuracy': debit_accuracy,
        'credit_accuracy': credit_accuracy,
        'avg_confidence': avg_confidence,
        'confusion_matrix': debit_confusion.tolist()
    }
```

### Monitoring

```python
def calculate_recent_accuracy(company_id: UUID, db: Session) -> float:
    """
    Calculate accuracy on recent expenses (last 30 days).

    This helps detect if model is degrading over time.
    """

    thirty_days_ago = datetime.now() - timedelta(days=30)

    # Get recent expenses that were approved
    recent_expenses = db.query(Expense).filter(
        Expense.company_id == company_id,
        Expense.status == 'posted',
        Expense.created_at >= thirty_days_ago,
        Expense.ml_confidence.isnot(None)  # Had ML suggestion
    ).all()

    if len(recent_expenses) < 10:
        return 1.0  # Not enough data, assume good

    # Check how many suggestions were accepted without modification
    accepted = 0
    for expense in recent_expenses:
        # Get the posted transaction
        transaction = db.query(Transaction).get(expense.draft_transaction_id)
        if not transaction:
            continue

        # Check if accounts match suggestion
        debit_line = next(l for l in transaction.lines if l.debit > 0)
        credit_line = next(l for l in transaction.lines if l.credit > 0)

        if (debit_line.account_id == expense.suggested_debit_account_id and
            credit_line.account_id == expense.suggested_credit_account_id):
            accepted += 1

    return accepted / len(recent_expenses)
```

---

## Inference Pipeline

### Lazy Loading

```python
class ModelCache:
    """
    Cache loaded models in memory to avoid repeated deserialization.
    """

    _cache: Dict[UUID, Tuple[BaseModel, datetime]] = {}
    _cache_duration = timedelta(hours=1)

    @classmethod
    def get_model(cls, company_id: UUID, db: Session) -> Optional[BaseModel]:
        """
        Get model from cache or load from database.
        """

        # Check cache
        if company_id in cls._cache:
            model, cached_at = cls._cache[company_id]
            if datetime.now() - cached_at < cls._cache_duration:
                return model

        # Load from database
        db_model = db.query(MLModel).filter_by(
            company_id=company_id,
            is_active=True
        ).first()

        if not db_model:
            return None

        # Deserialize
        import joblib
        model = joblib.loads(db_model.model_data)

        # Cache
        cls._cache[company_id] = (model, datetime.now())

        return model

    @classmethod
    def invalidate(cls, company_id: UUID):
        """Invalidate cache after retraining."""
        if company_id in cls._cache:
            del cls._cache[company_id]
```

### Suggestion Flow

```python
async def get_account_suggestions(
    expense: Expense,
    company_id: UUID,
    db: Session
) -> Suggestion:
    """
    Get account suggestions for an expense.

    Flow:
    1. Check data availability
    2. Select appropriate stage
    3. Get suggestion
    4. Validate suggestion
    5. Return with confidence
    """

    # Check training data count
    sample_count = db.query(MLTrainingData).filter_by(company_id=company_id).count()

    # Stage selection
    if sample_count == 0:
        # Stage 0: Bootstrap
        suggestion = stage0_suggest(expense, db, company_id)

    elif sample_count < 10:
        # Stage 1: Few-shot
        training_data = db.query(MLTrainingData).filter_by(company_id=company_id).all()
        suggestion = stage1_suggest(expense, training_data)

    else:
        # Stage 2-4: ML models
        model = ModelCache.get_model(company_id, db)

        if not model:
            # No model trained yet, trigger training (async)
            await trigger_training(company_id, db)
            # Fall back to Stage 1
            training_data = db.query(MLTrainingData).filter_by(company_id=company_id).all()
            suggestion = stage1_suggest(expense, training_data)
        else:
            # Use ML model
            suggestion = model.predict(expense)

    # Validate accounts exist
    debit_account = db.query(Account).get(suggestion.debit_account_id)
    credit_account = db.query(Account).get(suggestion.credit_account_id)

    if not debit_account or not credit_account:
        logger.error("Suggested accounts not found, falling back")
        suggestion = stage0_suggest(expense, db, company_id)

    return suggestion
```

---

## Continuous Learning

### Feedback Loop

```python
async def record_user_action(
    expense: Expense,
    transaction: Transaction,
    was_suggested: bool,
    was_edited: bool,
    db: Session
):
    """
    Record user's action to improve ML model.

    Called after:
    - User approves suggestion (was_edited=False)
    - User edits and approves (was_edited=True)
    - User rejects suggestion (not called)
    """

    # Extract actual accounts from posted transaction
    debit_line = next(l for l in transaction.lines if l.debit > 0)
    credit_line = next(l for l in transaction.lines if l.credit > 0)

    # Create training data record
    training_data = MLTrainingData(
        company_id=expense.company_id,
        description=expense.description,
        merchant=expense.merchant,
        amount=expense.amount,
        category_id=expense.category_id,
        day_of_week=expense.date.weekday(),
        month=expense.date.month,
        debit_account_id=debit_line.account_id,
        credit_account_id=credit_line.account_id,
        expense_id=expense.id,
        transaction_id=transaction.id,
        was_suggested=was_suggested,
        was_accepted=not was_edited,
        created_at=datetime.now()
    )

    db.add(training_data)
    db.commit()

    # Check if should trigger retraining
    if should_retrain(expense.company_id, db):
        await trigger_training(expense.company_id, db)
```

### Async Training Trigger

```python
from celery import Celery

celery_app = Celery('accounting')

@celery_app.task
def train_model_async(company_id: str):
    """
    Background task to train model.

    Triggered by:
    - User action adds 10th sample
    - Scheduled weekly job
    - Manual admin trigger
    """

    db = SessionLocal()
    try:
        company_uuid = UUID(company_id)
        train_model_pipeline(company_uuid, db)

        # Invalidate cache
        ModelCache.invalidate(company_uuid)

    except Exception as e:
        logger.error(f"Failed to train model for company {company_id}: {e}")
    finally:
        db.close()

# Schedule weekly retraining
@celery_app.task
def weekly_retrain():
    """
    Run every Sunday at 2 AM.
    """
    db = SessionLocal()
    try:
        # Get all companies with active users
        companies = db.query(Company).all()

        for company in companies:
            if should_retrain(company.id, db):
                train_model_async.delay(str(company.id))
    finally:
        db.close()
```

---

## Technical Implementation

### Dependencies

```python
# requirements.txt

# Core ML
scikit-learn==1.3.0
numpy==1.24.0
scipy==1.11.0

# Text processing
nltk==3.8.1

# Optional: Advanced models
xgboost==2.0.0        # For Stage 4
# torch==2.0.0        # For neural networks (optional)

# Model serialization
joblib==1.3.0

# Background tasks
celery==5.3.0
redis==4.6.0

# Monitoring
prometheus-client==0.17.0
```

### File Structure

```
backend/
├── app/
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py            # BaseModel interface
│   │   │   ├── stage0.py          # Rule-based engine
│   │   │   ├── stage1.py          # Few-shot learning
│   │   │   ├── stage2.py          # Decision Tree
│   │   │   ├── stage3.py          # Random Forest
│   │   │   └── stage4.py          # Gradient Boosting
│   │   ├── features/
│   │   │   ├── __init__.py
│   │   │   ├── text.py            # Text feature extraction
│   │   │   ├── numerical.py       # Numerical features
│   │   │   └── categorical.py     # Categorical features
│   │   ├── training/
│   │   │   ├── __init__.py
│   │   │   ├── pipeline.py        # Training pipeline
│   │   │   ├── evaluation.py      # Model evaluation
│   │   │   └── validation.py      # Data validation
│   │   └── inference/
│   │       ├── __init__.py
│   │       ├── cache.py           # Model caching
│   │       └── predictor.py       # Prediction logic
│   ├── services/
│   │   └── ml_suggestion_service.py
│   └── tasks/
│       └── ml_training.py         # Celery tasks
```

### Example Usage

```python
# In expense creation endpoint
@router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    company_id: UUID = Depends(get_company_id)
):
    # Create expense
    expense = Expense(**data.dict(), company_id=company_id, status='pending')
    db.add(expense)
    db.flush()

    # Get ML suggestion (async, fast)
    suggestion = await get_account_suggestions(expense, company_id, db)

    # Update expense with suggestion
    expense.suggested_debit_account_id = suggestion.debit_account_id
    expense.suggested_credit_account_id = suggestion.credit_account_id
    expense.ml_confidence = suggestion.confidence

    # Create draft transaction
    if suggestion.confidence > 0.50:  # Only draft if reasonable confidence
        draft_transaction = await create_draft_transaction(expense, suggestion, db)
        expense.draft_transaction_id = draft_transaction.id
        expense.status = 'drafted'

    db.commit()

    return ExpenseResponse.from_orm(expense)
```

---

## Summary

### Key Takeaways

1. **No Constant Training**: Model trains only when needed (thresholds, weekly batch)
2. **Progressive Stages**: Adapts to data availability (0 → 1-9 → 10-49 → 50+ samples)
3. **Always Available**: Falls back to rules when no model exists
4. **Fast Inference**: Cache models in memory, <100ms predictions
5. **Learns from Corrections**: Every edit improves the model
6. **Transparent Confidence**: User sees how suggestion was made

### Performance Expectations

| Stage | Samples | Accuracy | Latency | Training Time |
|-------|---------|----------|---------|---------------|
| Stage 0 | 0 | 60-70% | <50ms | N/A (pre-built) |
| Stage 1 | 1-9 | 70-75% | 50-100ms | N/A (no training) |
| Stage 2 | 10-49 | 75-82% | 10-30ms | 0.5-2s |
| Stage 3 | 50-199 | 82-88% | 20-50ms | 5-10s |
| Stage 4 | 200+ | 88-95% | 50-100ms | 30-60s |

### Implementation Timeline

- **Week 1**: Stage 0 (Rules) + Stage 1 (Few-shot)
- **Week 2**: Stage 2 (Decision Tree) + Feature engineering
- **Week 3**: Stage 3 (Random Forest) + Training pipeline
- **Week 4**: Evaluation, monitoring, optimization

This ML system provides intelligent suggestions from day one while continuously improving as users provide feedback, solving the cold start problem without requiring constant retraining.
