# Decoration AI Search 🎨

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+

### Backend Setup
```bash
pip install -r requirements.txt
python backend.py
```

### Frontend Setup
```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## Features
- AI-powered image search
- Decoration-specific tagging
- Offline processing
- Category-based search
- Fully local AI

## Tech Stack
- React
- FastAPI
- CLIP (OpenAI)
- FAISS
- PyTorch

## Adding Images
1. Create `./images/` directory
2. Add your decoration photos
3. Restart backend to rebuild index

## Troubleshooting
- Ensure backend runs on localhost:8000
- Check Python & Node.js versions
- Verify image directory contains photos

## License
MIT

---

Powered by on-device AI 🤖