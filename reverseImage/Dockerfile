# RunPod Serverless Dockerfile for Qwen2.5-VL Dish Recognition
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the model during build (optional but speeds up cold starts)
# Uncomment the following lines to include model in the image
# RUN python -c "from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor; \
#     Qwen2_5_VLForConditionalGeneration.from_pretrained('Qwen/Qwen2.5-VL-7B-Instruct', trust_remote_code=True); \
#     AutoProcessor.from_pretrained('Qwen/Qwen2.5-VL-7B-Instruct', trust_remote_code=True)"

# Copy the handler
COPY handler.py .

# Set the entrypoint
CMD ["python", "-u", "handler.py"]
