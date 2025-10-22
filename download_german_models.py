#!/usr/bin/env python3
"""
Download und ONNX-Konvertierung deutscher Modelle für Hash
"""

import os
from pathlib import Path

def download_and_convert_model(model_name, output_dir, task_type='text-classification'):
    """
    Lädt Modell von HuggingFace und konvertiert zu ONNX
    """
    from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
    from optimum.onnxruntime import ORTModelForSequenceClassification, ORTModelForFeatureExtraction
    
    print(f"\n{'='*70}")
    print(f"📦 Downloading: {model_name}")
    print(f"{'='*70}")
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    try:
        # Download Tokenizer
        print("⬇️  Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokenizer.save_pretrained(output_path)
        print("✅ Tokenizer saved")
        
        # Download und konvertiere zu ONNX
        print("⬇️  Downloading model and converting to ONNX...")
        
        if task_type == 'text-classification':
            model = ORTModelForSequenceClassification.from_pretrained(
                model_name,
                export=True,
                provider="CPUExecutionProvider"
            )
        else:  # feature-extraction
            model = ORTModelForFeatureExtraction.from_pretrained(
                model_name,
                export=True,
                provider="CPUExecutionProvider"
            )
        
        model.save_pretrained(output_path)
        print("✅ Model converted and saved")
        
        # Check files
        onnx_path = output_path / "model.onnx"
        if onnx_path.exists():
            size_mb = onnx_path.stat().st_size / (1024 * 1024)
            print(f"📊 ONNX Model size: {size_mb:.2f} MB")
        
        print(f"✅ Complete: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    print("🚀 Downloading German Models for Hash Project")
    print("="*70)
    
    base_path = Path("public/models")
    
    # German Sentiment Model
    success_sentiment = download_and_convert_model(
        model_name="oliverguhr/german-sentiment-bert",
        output_dir=base_path / "sentiment_de",
        task_type="text-classification"
    )
    
    # German/Multilingual Embedding Model
    success_embedding = download_and_convert_model(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        output_dir=base_path / "embedding_de",
        task_type="feature-extraction"
    )
    
    print("\n" + "="*70)
    if success_sentiment and success_embedding:
        print("✅ ALL MODELS DOWNLOADED SUCCESSFULLY")
    else:
        print("⚠️  Some models failed - check errors above")
    print("="*70)


if __name__ == "__main__":
    try:
        import transformers
        import optimum.onnxruntime
    except ImportError:
        print("❌ Required packages missing!")
        print("\n📦 Install with:")
        print("pip install transformers optimum[onnxruntime] onnx")
        exit(1)
    
    main()