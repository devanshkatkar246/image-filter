import os
import torch
import clip
from PIL import Image
import faiss
import numpy as np
from pathlib import Path

# Configuration
IMAGE_DIR = "./images"
INDEX_PATH = "./faiss_index.bin"
EMBEDDINGS_PATH = "./embeddings.npy"
IMAGE_PATHS_FILE = "./image_paths.txt"

def generate_embeddings():
    # Load CLIP model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = clip.load("ViT-B/32", device=device)

    # Find all image files
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    image_files = [
        f for f in Path(IMAGE_DIR).rglob('*') 
        if f.suffix.lower() in image_extensions
    ]

    if not image_files:
        print(f"No images found in {IMAGE_DIR}")
        return

    # Prepare for embedding
    embeddings = []
    image_paths = []

    print(f"Generating embeddings for {len(image_files)} images...")

    # Process each image
    for img_path in image_files:
        try:
            # Load and preprocess image
            image = preprocess(Image.open(img_path)).unsqueeze(0).to(device)
            
            # Generate embedding
            with torch.no_grad():
                image_features = model.encode_image(image)
                image_features /= image_features.norm(dim=-1, keepdim=True)
            
            # Convert to numpy and store
            embeddings.append(image_features.cpu().numpy().flatten())
            image_paths.append(str(img_path.relative_to(IMAGE_DIR)))
            
            print(f"Processed: {img_path}")
        
        except Exception as e:
            print(f"Error processing {img_path}: {e}")

    # Convert to numpy array
    embeddings = np.array(embeddings).astype('float32')

    # Create FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
    index.add(embeddings)

    # Save index and mappings
    faiss.write_index(index, INDEX_PATH)
    np.save(EMBEDDINGS_PATH, embeddings)
    
    with open(IMAGE_PATHS_FILE, 'w') as f:
        f.write('\n'.join(image_paths))

    print(f"Embeddings generated for {len(image_files)} images")
    print(f"Saved to {INDEX_PATH}, {EMBEDDINGS_PATH}, {IMAGE_PATHS_FILE}")

if __name__ == "__main__":
    generate_embeddings()
