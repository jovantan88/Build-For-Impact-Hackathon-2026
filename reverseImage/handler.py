"""
RunPod Serverless Handler for Dish Recognition
Uses Qwen2.5-VL-7B-Instruct for vision-language processing
"""

import runpod
import torch
import base64
import json
import re
from io import BytesIO
from PIL import Image
from transformers import Qwen3VLForConditionalGeneration, AutoProcessor

# default: Load the model on the available device(s)
model = Qwen3VLForConditionalGeneration.from_pretrained(
    "aisingapore/Qwen-SEA-LION-v4-8B-VL", dtype="auto", device_map="auto"
)

# We recommend enabling flash_attention_2 for better acceleration and memory saving, especially in multi-image and video scenarios.
# model = Qwen3VLForConditionalGeneration.from_pretrained(
#     "aisingapore/Qwen-SEA-LION-v4-8B-VL",
#     dtype=torch.bfloat16,
#     attn_implementation="flash_attention_2",
#     device_map="auto",
# )

processor = AutoProcessor.from_pretrained("aisingapore/Qwen-SEA-LION-v4-8B-VL")

messages = [
    {
        "role": "system",
        "content": [{"type": "text", "text": "You are a helpful assistant."}]
    },
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "Write a poem on southeast asian countries in Indonesian."}
        ],
    }
]

# Preparation for inference
inputs = processor.apply_chat_template(
    messages,
    tokenize=True,
    add_generation_prompt=True,
    return_dict=True,
    return_tensors="pt"
)
inputs = inputs.to(model.device)

# Inference: Generation of the output
generated_ids = model.generate(**inputs, max_new_tokens=128)
generated_ids_trimmed = [
    out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
]
output_text = processor.batch_decode(
    generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
)
print(output_text)

# Global model and processor (loaded once on cold start)
model = None
processor = None


def load_model():
    """Load the Qwen2.5-VL model and processor"""
    global model, processor

    if model is None:
        print("Loading Qwen2.5-VL-7B-Instruct model...")

        model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            "Qwen/Qwen2.5-VL-7B-Instruct",
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True,
        )

        processor = AutoProcessor.from_pretrained(
            "Qwen/Qwen2.5-VL-7B-Instruct",
            trust_remote_code=True,
        )

        print("Model loaded successfully!")

    return model, processor


def decode_base64_image(base64_string: str) -> Image.Image:
    """Decode a base64 string to a PIL Image"""
    # Remove data URL prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]

    image_data = base64.b64decode(base64_string)
    image = Image.open(BytesIO(image_data))

    # Convert to RGB if necessary
    if image.mode != "RGB":
        image = image.convert("RGB")

    return image


def analyze_dish(image: Image.Image) -> dict:
    """
    Analyze a dish image and return structured information about:
    - Dish name and description
    - Required ingredients
    - Recipe instructions
    """
    model, processor = load_model()

    # Create the prompt for dish analysis
    prompt = """You are a culinary expert specializing in Southeast Asian cuisine. Analyze this food image and provide detailed information.

Return your response as a valid JSON object with this exact structure:
{
    "dish": {
        "name": "Name of the dish",
        "description": "A brief description of the dish, its origin, and flavor profile",
        "cuisine": ["Array", "of", "cuisine", "styles"]
    },
    "ingredients": [
        {"name": "ingredient name", "quantity": "amount needed"},
        ...
    ],
    "recipe": {
        "prepTime": "preparation time",
        "cookTime": "cooking time",
        "servings": number,
        "instructions": [
            "Step 1: instruction",
            "Step 2: instruction",
            ...
        ],
        "tips": "Any helpful cooking tips"
    }
}

Be specific about quantities. Include all ingredients needed, including common ones like oil, salt, etc.
Provide detailed step-by-step instructions (at least 6 steps).
Only return the JSON object, no additional text."""

    # Prepare the message with image
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt},
            ],
        }
    ]

    # Process the input
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(
        text=[text],
        images=[image],
        padding=True,
        return_tensors="pt",
    ).to(model.device)

    # Generate response
    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=2048,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
        )

    # Decode the response
    generated_ids_trimmed = [
        out_ids[len(in_ids):]
        for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    response = processor.batch_decode(
        generated_ids_trimmed,
        skip_special_tokens=True
    )[0]

    # Parse JSON from response
    try:
        # Try to extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(response)
    except json.JSONDecodeError:
        # If parsing fails, return raw response with error flag
        result = {
            "error": "Failed to parse response",
            "raw_response": response,
            "dish": {
                "name": "Unknown Dish",
                "description": "Could not identify the dish",
                "cuisine": []
            },
            "ingredients": [],
            "recipe": {
                "prepTime": "",
                "cookTime": "",
                "servings": 0,
                "instructions": [],
                "tips": ""
            }
        }

    return result


def handler(job):
    """
    RunPod serverless handler function

    Expected input:
    {
        "input": {
            "image": "base64_encoded_image_string"
        }
    }

    Returns:
    {
        "dish": {...},
        "ingredients": [...],
        "recipe": {...}
    }
    """
    job_input = job.get("input", {})

    # Validate input
    if "image" not in job_input:
        return {"error": "No image provided. Please include 'image' field with base64-encoded image."}

    try:
        # Decode the image
        image = decode_base64_image(job_input["image"])

        # Analyze the dish
        result = analyze_dish(image)

        return result

    except Exception as e:
        return {"error": f"Failed to process image: {str(e)}"}


# Start the serverless worker
runpod.serverless.start({"handler": handler})
