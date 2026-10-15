# SafeChat AI Jury — Machine Learning Training Documentation

This directory contains the training pipeline and evaluation benchmarks for the **AI Jury Scam Detection Engine**.

## Architecture & Juror Ensemble

The scam detection engine utilizes a multi-model voting ensemble trained on TF-IDF vectors of real SMS and messaging scam/phishing datasets:

1. **TF-IDF Vectorizer**: Sublinear term-frequency inverse-document-frequency extraction (600 features, unigrams & bigrams, English stopword filtration).
2. **Juror 1: Decision Tree (`DecisionTreeClassifier`)**: Rule-based hierarchical splitting on discriminative urgency & phishing keywords.
3. **Juror 2: Naive Bayes (`MultinomialNB`)**: Probabilistic classification modeling word conditional log-likelihoods.
4. **Juror 3: k-Nearest Neighbors (`KNeighborsClassifier`)**: Instance-based cosine-similarity metric matching against validated threat exemplars.
5. **Juror 4: Artificial Neural Network (`MLPClassifier`)**: Multilayer perceptron with hidden layers (32, 16) and ReLU activations for non-linear pattern interactions.

## Ensemble Classification Logic
- **SAFE**: 0 juror flags, or strong non-suspicious confidence.
- **SCAM**: $\ge 2$ jurors flag scam, or critical high-confidence threat triggers.
- **UNCERTAIN**: Exactly 1 juror flag or marginal border confidence, prompting caution and manual scrutiny without false reassurance.

## Evaluation Benchmark Results (Test Split)

| Model | Accuracy | Precision | Recall | F1 Score |
| :--- | :--- | :--- | :--- | :--- |
| **Decision Tree** | 95.17% | 90.08% | 72.19% | 80.15% |
| **Naive Bayes** | 97.77% | 96.32% | 86.75% | 91.29% |
| **k-Nearest Neighbors** | 96.87% | 96.77% | 79.47% | 87.27% |
| **Artificial Neural Network (ANN)** | 98.39% | 98.54% | 89.40% | 93.75% |
| **Voting Ensemble (AI Jury)** | **98.30%** | **97.83%** | **89.40%** | **93.43%** |

## How to Re-train
```bash
pip install -r requirements.txt
python train_models.py
```
Outputs are exported directly to `public/models/ai_jury_model.json` for client-side, privacy-preserving in-browser inference without sending message content to third-party APIs.
