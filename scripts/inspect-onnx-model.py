"""
inspect-onnx-model.py

Programmatically inspects an ONNX model file and outputs complete metadata:
- File size and SHA256 hash
- Opset version
- Number of graph nodes
- Number of initializers and parameter count
- Operator types and counts
- Input and output tensor names, types, and shapes
"""

import os
import sys
import hashlib
import onnx
from onnx import numpy_helper

def inspect_model(model_path):
    if not os.path.exists(model_path):
        print(f"Error: Model file {model_path} not found.")
        sys.exit(1)

    file_size_bytes = os.path.getsize(model_path)
    file_size_mb = file_size_bytes / (1024 * 1024)

    hasher = hashlib.sha256()
    with open(model_path, 'rb') as f:
        while chunk := f.read(1024 * 1024):
            hasher.update(chunk)
    sha256_hash = hasher.hexdigest()

    model = onnx.load(model_path)
    graph = model.graph

    opset_versions = [f"{op.domain or 'ai.onnx'} v{op.version}" for op in model.opset_import]
    node_count = len(graph.node)
    initializer_count = len(graph.initializer)

    total_params = 0
    for init in graph.initializer:
        arr = numpy_helper.to_array(init)
        total_params += arr.size

    op_counts = {}
    for node in graph.node:
        op_counts[node.op_type] = op_counts.get(node.op_type, 0) + 1

    def format_tensor_info(t_info):
        shape = [d.dim_value if d.dim_value > 0 else (d.dim_param or '?') for d in t_info.type.tensor_type.shape.dim]
        elem_type = onnx.TensorProto.DataType.Name(t_info.type.tensor_type.elem_type)
        return f"{t_info.name}: type={elem_type}, shape={shape}"

    inputs = [format_tensor_info(i) for i in graph.input if not any(init.name == i.name for init in graph.initializer)]
    outputs = [format_tensor_info(o) for o in graph.output]

    metadata = {prop.key: prop.value for prop in model.metadata_props}

    print("=" * 60)
    print("REAL ONNX MODEL TECHNICAL INSPECTION REPORT")
    print("=" * 60)
    print(f"Model Path:         {model_path}")
    print(f"File Size:          {file_size_bytes:,} bytes ({file_size_mb:.2f} MB)")
    print(f"SHA-256 Hash:       {sha256_hash}")
    print(f"IR Version:         v{model.ir_version}")
    print(f"Opset Imports:      {', '.join(opset_versions)}")
    print(f"Producer Name:      {model.producer_name or 'N/A'}")
    print(f"Graph Nodes:        {node_count}")
    print(f"Initializers:       {initializer_count}")
    print(f"Total Parameters:   {total_params:,} ({total_params / 1e6:.2f}M params)")
    print("\n--- Inputs ---")
    for inp in inputs:
        print(f"  {inp}")
    print("\n--- Outputs ---")
    for out in outputs:
        print(f"  {out}")
    print("\n--- Operator Breakdown ---")
    for op, cnt in sorted(op_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {op}: {cnt}")
    print("\n--- Embedded Metadata ---")
    for k, v in metadata.items():
        print(f"  {k}: {v}")
    print("=" * 60)

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'public/models/sally/wav2lip.onnx'
    inspect_model(path)
