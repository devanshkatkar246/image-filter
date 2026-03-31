"""
FastAPI Backend for Offline AI Photo Organizer
Uses CLIP for embeddings and FAISS for similarity search

Requirements:
pip install fastapi uvicorn pillow torch torchvision transformers faiss-cpu

Usage:
python backend.py

API Endpoints:
- POST /search - Search images by text query
- GET /tag?path=<image_path> - Get AI-generated tags for an image
- GET /images/<filename> - Serve image files
"""

import os
from typing import List
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
import numpy as np
import faiss

# Initialize FastAPI
app = FastAPI(title="Offline AI Photo Organizer")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
IMAGE_DIR = "./images"  # Directory containing your images
INDEX_PATH = "./faiss_index.bin"  # FAISS index file
EMBEDDINGS_PATH = "./embeddings.npy"  # Cached embeddings
IMAGE_PATHS_FILE = "./image_paths.txt"  # Image paths mapping

# Load CLIP model (runs offline after first download)
print("Loading CLIP model...")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
print(f"CLIP model loaded on {device}")

# Global variables for FAISS index
index = None
image_paths = []


# Request/Response models
class SearchRequest(BaseModel):
    text: str


class SearchResponse(BaseModel):
    results: List[str]


class TagResponse(BaseModel):
    tags: List[str]
    path: str


def build_index():
    """Build FAISS index from images in IMAGE_DIR"""
    global index, image_paths
    
    print("Building FAISS index...")
    
    # Get all image files
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    image_files = [
        f for f in Path(IMAGE_DIR).rglob('*')
        if f.suffix.lower() in image_extensions
    ]
    
    if not image_files:
        raise ValueError(f"No images found in {IMAGE_DIR}")
    
    print(f"Found {len(image_files)} images")
    
    # Compute embeddings for all images
    embeddings = []
    image_paths = []
    
    for i, img_path in enumerate(image_files):
        try:
            # Load and process image
            image = Image.open(img_path).convert('RGB')
            inputs = processor(images=image, return_tensors="pt").to(device)
            
            # Get image embedding
            with torch.no_grad():
                image_features = model.get_image_features(**inputs)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            embeddings.append(image_features.cpu().numpy())
            image_paths.append(img_path.relative_to(IMAGE_DIR).as_posix())
            
            if (i + 1) % 10 == 0:
                print(f"Processed {i + 1}/{len(image_files)} images")
        
        except Exception as e:
            print(f"Error processing {img_path}: {e}")
            continue
    
    # Convert to numpy array
    embeddings = np.vstack(embeddings).astype('float32')
    
    # Create FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
    index.add(embeddings)
    
    # Save index and mappings
    faiss.write_index(index, INDEX_PATH)
    np.save(EMBEDDINGS_PATH, embeddings)
    with open(IMAGE_PATHS_FILE, 'w') as f:
        f.write('\n'.join(image_paths))
    
    print(f"Index built with {len(image_paths)} images")


def load_index():
    """Load existing FAISS index"""
    global index, image_paths
    
    if not os.path.exists(INDEX_PATH):
        build_index()
        return
    
    print("Loading FAISS index...")
    index = faiss.read_index(INDEX_PATH)
    
    with open(IMAGE_PATHS_FILE, 'r') as f:
        image_paths = [line.strip() for line in f]
    
    print(f"Loaded index with {len(image_paths)} images")


# Initialize on startup
@app.on_event("startup")
async def startup_event():
    """Initialize FAISS index on startup"""
    if not os.path.exists(IMAGE_DIR):
        os.makedirs(IMAGE_DIR)
        print(f"Created image directory: {IMAGE_DIR}")
        print("Please add images to this directory and restart the server")
    else:
        load_index()


import re

def normalize_path_string(path: str) -> str:
    """Normalize file path for strict keyword matching: lowercase, no spaces or special chars"""
    return re.sub(r'[^a-z0-9]', '', path.lower())

def detect_search_category(query_lower: str) -> str:
    """Detect the intent category from the search query"""
    if "baby" in query_lower:
        return "baby"
    if "birthday" in query_lower:
        return "birthday"
    if "wedding" in query_lower or "mandap" in query_lower:
        return "wedding"
    if "mehendi" in query_lower:
        return "mehendi"
    return "other"

@app.post("/search", response_model=SearchResponse)
async def search_images(request: SearchRequest):
    """
    Search images with strict category-based filtering and path normalization
    """
    if index is None or len(image_paths) == 0:
        raise HTTPException(status_code=503, detail="Index not ready. Please add images and rebuild index.")
    
    query = request.text
    query_lower = query.lower()
    category = detect_search_category(query_lower)
    
    # 1. Intent-Based Query Enhancement
    enhanced_query = query
    if category == "baby":
        enhanced_query = f"{query} baby shower decoration pastel kids celebration"
    elif category == "birthday":
        enhanced_query = f"{query} birthday party decoration balloons cake celebration"
    elif category == "wedding":
        enhanced_query = f"{query} wedding stage mandap decoration floral elegant setup"
    elif category == "mehendi":
        enhanced_query = f"{query} mehendi ceremony decoration vibrant traditional backdrop"
    else:
        enhanced_query = f"{query} decoration party setup balloons event design"

    # Encode text query
    inputs = processor(text=enhanced_query, return_tensors="pt", padding=True).to(device)
    
    with torch.no_grad():
        text_features = model.get_text_features(**inputs)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
    
    # Search in FAISS index
    query_embedding = text_features.cpu().numpy().astype('float32')
    k = min(100, len(image_paths))  # Broad search for filtering
    distances, indices = index.search(query_embedding, k)
    
    # Get initial matching image paths
    initial_results = [image_paths[idx] for idx in indices[0] if idx < len(image_paths)]
    
    # 2. Strict Category Filtering
    filtered_results = []
    
    if category == "baby":
        # allow filenames containing "baby" OR "shower"
        filtered_results = [r for r in initial_results if any(t in normalize_path_string(r) for t in ["baby", "shower"])]
    elif category == "birthday":
        # allow filenames containing "birthday"
        filtered_results = [r for r in initial_results if "birthday" in normalize_path_string(r)]
    elif category == "wedding":
        # allow filenames containing "wedding" OR "mandap"
        filtered_results = [r for r in initial_results if any(t in normalize_path_string(r) for t in ["wedding", "mandap"])]
    elif category == "mehendi":
        # allow filenames containing "mehendi"
        filtered_results = [r for r in initial_results if "mehendi" in normalize_path_string(r)]
    else:
        # category "other" returns all top results
        filtered_results = initial_results
    
    # 3. Final Selection & Fallback
    # If filtered results are less than 5, return original FAISS results as fallback
    final_results = filtered_results[:24] if len(filtered_results) >= 5 else initial_results[:24]
    
    return SearchResponse(results=final_results)


@app.get("/tag", response_model=TagResponse)
async def tag_image(path: str):
    """
    Generate AI tags for an image using CLIP zero-shot classification 
    with improved decoration-specific labels.
    """
    image_path = Path(IMAGE_DIR) / path
    
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Domain-specific tag candidates for decorations
    tag_candidates = [
        "baby shower decoration",
        "birthday decoration",
        "anniversary decoration",
        "balloon arch",
        "cake table setup",
        "stage decoration",
        "pastel theme decoration",
        "luxury decoration",
        "mandap decoration",
        "mehendi ceremony setup",
        "romantic setup",
        "minimal decoration",
        "floral decoration",
        "reception hall setup",
        "party backdrop",
        "kids birthday theme",
        "balloon decoration",
        "engagement party decor",
        "outdoor celebration",
        "anniversary decoration"
    ]
    
    # Load and process image
    image = Image.open(image_path).convert('RGB')
    
    # Prepare text prompts
    text_prompts = [f"a photo of {tag}" for tag in tag_candidates]
    
    # Encode image and text
    inputs = processor(
        text=text_prompts,
        images=image,
        return_tensors="pt",
        padding=True
    ).to(device)
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)
    
    # Get top 5 tags
    top_probs, top_indices = torch.topk(probs[0], k=5)
    tags = [tag_candidates[idx] for idx in top_indices.cpu().numpy()]
    
    return TagResponse(tags=tags, path=path)


@app.get("/images/{filename:path}")
async def serve_image(filename: str):
    """
    Serve image files from IMAGE_DIR
    
    Args:
        filename: Relative path to image
    
    Returns:
        FileResponse with image
    """
    image_path = Path(IMAGE_DIR) / filename
    
    if not image_path.exists() or not image_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(image_path)


@app.post("/rebuild-index")
async def rebuild_index():
    """Rebuild FAISS index (useful after adding new images)"""
    try:
        build_index()
        return {"message": f"Index rebuilt with {len(image_paths)} images"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "images": len(image_paths),
        "model": "CLIP ViT-B/32",
        "device": device
    }


if __name__ == "__main__":
    import uvicorn
    
    print("Starting Offline AI Photo Organizer Backend")
    print(f"Image directory: {os.path.abspath(IMAGE_DIR)}")
    print("Access API docs at: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
