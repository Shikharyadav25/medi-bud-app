import json
import os
import random
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, f1_score

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "intent_dataset.json")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "data", "split_manifest.json")
MODEL_OUT_PATH = os.path.join(os.path.dirname(__file__), "intent_pipeline.joblib")
METRICS_OUT_PATH = os.path.join(os.path.dirname(__file__), "metrics.json")
CONFUSION_OUT_PATH = os.path.join(os.path.dirname(__file__), "confusion_matrix.json")

def load_and_split_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Group examples by (intent, paraphrase_group_id)
    intent_groups = {}
    for item in data:
        intent = item["intent"]
        gid = item["paraphrase_group_id"]
        if intent not in intent_groups:
            intent_groups[intent] = {}
        if gid not in intent_groups[intent]:
            intent_groups[intent][gid] = []
        intent_groups[intent][gid].append(item)

    train_data = []
    val_data = []
    test_data = []

    # For each intent, split 12 groups into: 8 train (66.7%), 2 val (16.7%), 2 test (16.7%)
    for intent, groups in intent_groups.items():
        gids = sorted(list(groups.keys()))
        random.shuffle(gids)
        train_gids = gids[:8]
        val_gids = gids[8:10]
        test_gids = gids[10:]

        for gid in train_gids:
            train_data.extend(groups[gid])
        for gid in val_gids:
            val_data.extend(groups[gid])
        for gid in test_gids:
            test_data.extend(groups[gid])

    manifest = {
        "seed": SEED,
        "train_count": len(train_data),
        "val_count": len(val_data),
        "test_count": len(test_data),
        "total_count": len(data),
        "splits": {
            "train_ids": [x["id"] for x in train_data],
            "val_ids": [x["id"] for x in val_data],
            "test_ids": [x["id"] for x in test_data]
        }
    }
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return train_data, val_data, test_data

def train_and_evaluate():
    train_data, val_data, test_data = load_and_split_data()

    X_train = [x["text"] for x in train_data]
    y_train = [x["intent"] for x in train_data]

    X_val = [x["text"] for x in val_data]
    y_val = [x["intent"] for x in val_data]

    X_test = [x["text"] for x in test_data]
    y_test = [x["intent"] for x in test_data]

    # Create TF-IDF + Logistic Regression pipeline
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
            strip_accents="unicode",
            lowercase=True
        )),
        ("clf", LogisticRegression(
            C=3.0,
            max_iter=1000,
            random_state=SEED,
            class_weight="balanced"
        ))
    ])

    # Fit features strictly on training data
    pipeline.fit(X_train, y_train)

    # Evaluate validation probabilities to tune clarification threshold
    val_probs = pipeline.predict_proba(X_val)
    max_val_probs = np.max(val_probs, axis=1)
    val_preds = pipeline.predict(X_val)
    
    # Bounded threshold: minimum probability before requesting clarification
    clarification_threshold = float(np.percentile(max_val_probs[val_preds == y_val], 10))
    # Cap threshold safely between 0.35 and 0.50
    clarification_threshold = max(0.35, min(0.50, clarification_threshold))

    # Evaluate on held-out test data
    test_preds = pipeline.predict(X_test)
    test_probs = pipeline.predict_proba(X_test)

    labels = sorted(list(set(y_train)))
    macro_f1 = float(f1_score(y_test, test_preds, average="macro"))
    rep = classification_report(y_test, test_preds, target_names=labels, output_dict=True)
    cm = confusion_matrix(y_test, test_preds, labels=labels).tolist()

    metrics = {
        "macro_f1": round(macro_f1, 4),
        "target_gate": 0.80,
        "gate_passed": bool(macro_f1 >= 0.80),
        "clarification_threshold": round(clarification_threshold, 4),
        "classification_report": rep,
        "labels": labels
    }

    confusion_payload = {
        "labels": labels,
        "matrix": cm
    }

    joblib.dump(pipeline, MODEL_OUT_PATH)
    with open(METRICS_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    with open(CONFUSION_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(confusion_payload, f, indent=2)

    print(f"Training Complete! Held-out Macro-F1: {macro_f1:.4f} (Gate >= 0.80: {macro_f1 >= 0.80})")
    print(f"Clarification Threshold: {clarification_threshold:.4f}")
    print(f"Saved artifacts to {MODEL_OUT_PATH}, {METRICS_OUT_PATH}, {CONFUSION_OUT_PATH}")

if __name__ == "__main__":
    train_and_evaluate()
