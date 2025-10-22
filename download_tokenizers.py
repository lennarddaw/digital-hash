#!/usr/bin/env python3
"""Download fehlende Tokenizer-Dateien"""

from transformers import AutoTokenizer
from pathlib import Path
import shutil

print("📥 Downloading missing tokenizer files...\n")

# 1. Sentiment DE - tokenizer.json
print("1️⃣ oliverguhr/german-sentiment-bert")
sentiment_tokenizer = AutoTokenizer.from_pretrained("oliverguhr/german-sentiment-bert")
sentiment_dir = Path("public/models/sentiment_de")
sentiment_tokenizer.save_pretrained(sentiment_dir)
print(f"   ✅ Saved to {sentiment_dir}\n")

# 2. Embedding DE - vocab.txt
print("2️⃣ sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
embedding_tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
embedding_dir = Path("public/models/embedding_de")
embedding_tokenizer.save_pretrained(embedding_dir)
print(f"   ✅ Saved to {embedding_dir}\n")

print("✅ All tokenizer files downloaded!")
print("\n📋 Verify files exist:")
print(f"   - {sentiment_dir / 'tokenizer.json'}")
print(f"   - {embedding_dir / 'vocab.txt'}")