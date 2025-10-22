#!/usr/bin/env python3
"""
ONNX Model Quantization Script for Hash Project
Quantifiziert die deutschen Modelle von FP32 auf INT8 für bessere Performance
"""

import os
from pathlib import Path
from onnxruntime.quantization import quantize_dynamic, QuantType

def quantize_model(input_path: str, output_path: str):
    """
    Quantifiziert ein ONNX Modell mit dynamic quantization
    
    Args:
        input_path: Pfad zum originalen model.onnx
        output_path: Pfad für model_quantized.onnx
    """
    print(f"\n🔄 Quantizing: {input_path}")
    print(f"   Output: {output_path}")
    
    # Erstelle Output-Verzeichnis falls nötig
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Dynamic Quantization (INT8)
    # Reduziert Modellgröße um ~75% und erhöht Inferenzgeschwindigkeit
    quantize_dynamic(
        model_input=input_path,
        model_output=output_path,
        weight_type=QuantType.QUInt8,  # 8-bit unsigned integers
    )
    
    # Dateigröße vergleichen
    original_size = os.path.getsize(input_path) / (1024 * 1024)
    quantized_size = os.path.getsize(output_path) / (1024 * 1024)
    reduction = ((original_size - quantized_size) / original_size) * 100
    
    print(f"   ✅ Completed!")
    print(f"   📊 Original:  {original_size:.2f} MB")
    print(f"   📊 Quantized: {quantized_size:.2f} MB")
    print(f"   💾 Reduction: {reduction:.1f}%")


def main():
    # Basis-Pfad zum public/models Verzeichnis
    # Passe diesen Pfad an deine Projektstruktur an
    base_path = Path("public/models")
    
    print("=" * 70)
    print("🚀 ONNX Model Quantization für Hash Project")
    print("=" * 70)
    
    # Zu quantifizierende Modelle
    models_to_quantize = [
        {
            "name": "German Embedding Model",
            "input": base_path / "embedding_de/onnx/model.onnx",
            "output": base_path / "embedding_de/onnx/model_quantized.onnx"
        },
        {
            "name": "German Sentiment Model",
            "input": base_path / "sentiment_de/onnx/model.onnx",
            "output": base_path / "sentiment_de/onnx/model_quantized.onnx"
        }
    ]
    
    # Quantifiziere jedes Modell
    for model_config in models_to_quantize:
        print(f"\n{'='*70}")
        print(f"📦 Processing: {model_config['name']}")
        print(f"{'='*70}")
        
        input_path = str(model_config['input'])
        output_path = str(model_config['output'])
        
        # Prüfe ob Input-Datei existiert
        if not os.path.exists(input_path):
            print(f"⚠️  SKIP: Input file not found: {input_path}")
            continue
        
        # Quantifiziere
        try:
            quantize_model(input_path, output_path)
        except Exception as e:
            print(f"❌ ERROR: {e}")
            continue
    
    print("\n" + "=" * 70)
    print("✅ Quantization Complete!")
    print("=" * 70)
    print("\n📝 Next Steps:")
    print("1. Fehlende tokenizer.json für sentiment_de hinzufügen")
    print("2. Fehlende vocab.txt für embedding_de hinzufügen")
    print("3. Model Switcher UI implementieren")


if __name__ == "__main__":
    # Installiere Dependencies falls nötig
    try:
        import onnxruntime
    except ImportError:
        print("❌ onnxruntime not found!")
        print("📦 Install with: pip install onnxruntime")
        exit(1)
    
    main()