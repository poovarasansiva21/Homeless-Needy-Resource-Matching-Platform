import os
import json
import pickle
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models

def train():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(current_dir, "dataset.csv")
    model_save_path = os.path.join(current_dir, "resource_classifier.keras")
    label_map_path = os.path.join(current_dir, "label_map.json")
    tokenizer_save_path = os.path.join(current_dir, "tokenizer.pkl")

    print(f"Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)

    categories = sorted(df["category"].unique().tolist())
    label2idx = {cat: idx for idx, cat in enumerate(categories)}
    idx2label = {idx: cat for idx, cat in enumerate(categories)}

    print(f"Found {len(categories)} categories: {categories}")
    with open(label_map_path, "w", encoding="utf-8") as f:
        json.dump({"label2idx": label2idx, "idx2label": idx2label, "categories": categories}, f, indent=2)

    X_texts = df["text"].values
    y_labels = np.array([label2idx[c] for c in df["category"].values])

    # Text Vectorization Layer
    max_vocab_size = 3000
    max_seq_length = 50
    embedding_dim = 64

    vectorizer = layers.TextVectorization(
        max_tokens=max_vocab_size,
        output_mode="int",
        output_sequence_length=max_seq_length,
        standardize="lower_and_strip_punctuation",
        split="whitespace"
    )

    vectorizer.adapt(X_texts)
    vocab = vectorizer.get_vocabulary()
    print(f"Vocabulary size: {len(vocab)}")

    # Save tokenizer vocabulary / info
    with open(tokenizer_save_path, "wb") as f:
        pickle.dump({"vocab": vocab, "max_tokens": max_vocab_size, "seq_length": max_seq_length}, f)

    # Build End-to-End DNN Model (accepts raw text string input)
    text_input = tf.keras.Input(shape=(1,), dtype=tf.string, name="text_input")
    x = vectorizer(text_input)
    x = layers.Embedding(input_dim=max_vocab_size, output_dim=embedding_dim, mask_zero=True)(x)
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dense(64, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(32, activation="relu")(x)
    output = layers.Dense(len(categories), activation="softmax", name="prediction")(x)

    model = models.Model(inputs=text_input, outputs=output, name="Sahaayaa_Resource_Classifier")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.002),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    model.summary()

    # Train
    print("Training DNN Model...")
    history = model.fit(
        X_texts,
        y_labels,
        epochs=30,
        batch_size=16,
        validation_split=0.15,
        verbose=1
    )

    val_acc = history.history.get("val_accuracy", history.history["accuracy"])[-1]
    print(f"Training completed. Final validation accuracy: {val_acc:.4f}")

    # Save Keras model
    print(f"Saving model to {model_save_path}...")
    model.save(model_save_path)
    print("Model saved successfully!")

    # Test sample inference
    test_samples = [
        "I have two children and we have not had food since yesterday.",
        "Evicted from rented room, family sleeping in rain on the pavement tonight.",
        "Grandmother has high fever and chest congestion, urgent medicine needed.",
        "Slum hut caught fire, people trapped inside call rescue!",
        "Poor student needs books and notebooks for school.",
        "Unemployed carpenter seeking carpentry jobs to feed family."
    ]

    print("\n--- TEST INFERENCES ---")
    for sample in test_samples:
        pred_probs = model(tf.constant([sample])).numpy()[0]
        best_idx = int(np.argmax(pred_probs))
        confidence = float(pred_probs[best_idx])
        pred_cat = idx2label[str(best_idx)] if str(best_idx) in idx2label else idx2label[best_idx]
        print(f"Text: '{sample}'")
        print(f" -> Predicted: {pred_cat} ({confidence*100:.1f}% confidence)\n")

if __name__ == "__main__":
    train()
