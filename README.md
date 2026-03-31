# 🎨 Decoration AI Search (Offline)

An AI-powered image search system that works completely offline using CLIP and FAISS.

---

## 🚀 Features

* 🔍 **Semantic Search**

  * Search images using natural language (e.g., "baby shower decoration")

* 🧠 **CLIP Embeddings**

  * Understands visual + text relationships

* ⚡ **Fast Retrieval**

  * Uses FAISS for high-speed similarity search

* 📴 **Fully Offline**

  * No internet required

* 🎯 **Category-Aware Filtering**

  * Accurate separation between:

    * Baby Shower
    * Birthday
    * Wedding / Mandap
    * Mehendi

---

## 🛠️ Tech Stack

| Layer    | Technology       |
| -------- | ---------------- |
| Frontend | React + Vite     |
| Backend  | FastAPI (Python) |
| AI Model | CLIP             |
| Search   | FAISS            |

---

## 📂 Project Structure

```
image-filter/
│
├── images/              # Dataset
├── backend.py           # FastAPI backend
├── embeddings.npy       # Image embeddings
├── faiss_index.bin      # FAISS index
├── image_paths.txt      # Image mapping
│
└── src/
    ├── components/
    │    ├── DecorationSearch.tsx
    │    └── ImageSearch.tsx
    ├── App.tsx
    └── main.tsx
```

---

## ⚙️ Setup Instructions

### 1️⃣ Backend

```bash
pip install -r requirements.txt
python backend.py
```

Runs on:

```
http://localhost:8000
```

---

### 2️⃣ Frontend

```bash
npm install
npm run dev
```

Runs on:

```
http://localhost:5173
```

---

## 🔍 Example Queries

* "baby shower decoration"
* "mandap decoration"
* "birthday balloon setup"

---

## 🎯 How It Works

1. Images are converted into embeddings using CLIP
2. Stored in FAISS index
3. User query → converted into embedding
4. Similar images retrieved using vector search
5. Category filtering improves accuracy

---

## 🚀 Future Improvements

* Similar image recommendations
* Smart ranking system
* Better tag generation
* Mobile app version

---

## 🤝 Contributing

Feel free to fork and improve 🚀

---

## ⭐ If you like this project, give it a star!
