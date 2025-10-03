#!/bin/bash

echo "🚀 Neural Bloom - Model Downloader"
echo "=================================="

# Erstelle Ordner
mkdir -p public/models/sentiment
mkdir -p public/models/embedding

# SENTIMENT MODEL
echo ""
echo "📊 Downloading Sentiment Model..."
cd public/models/sentiment

echo "  ↓ config.json"
curl -L -o config.json https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/config.json

echo "  ↓ tokenizer.json"
curl -L -o tokenizer.json https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/tokenizer.json

echo "  ↓ tokenizer_config.json"
curl -L -o tokenizer_config.json https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/tokenizer_config.json

echo "  ↓ vocab.txt"
curl -L -o vocab.txt https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/vocab.txt

echo "  ↓ model_quantized.onnx (260 MB - dauert etwas...)"
curl -L -o model_quantized.onnx https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx

cd ../../..

# EMBEDDING MODEL
echo ""
echo "🧠 Downloading Embedding Model..."
cd public/models/embedding

echo "  ↓ config.json"
curl -L -o config.json https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json

echo "  ↓ tokenizer.json"
curl -L -o tokenizer.json https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json

echo "  ↓ tokenizer_config.json"
curl -L -o tokenizer_config.json https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json

echo "  ↓ vocab.txt"
curl -L -o vocab.txt https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/vocab.txt

echo "  ↓ model_quantized.onnx (90 MB - dauert etwas...)"
curl -L -o model_quantized.onnx https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx

cd ../../..

echo ""
echo "✅ Download complete!"
echo ""
echo "📁 File structure:"
tree public/models/

echo ""
echo "🎉 Models ready! You can now run: npm run dev"