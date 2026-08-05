<div align="center">

# 🚦 Vigilant Traffic

### AI-Powered Real-Time Traffic Violation Detection System

*Making roads safer, one frame at a time.*

![YOLOv11](https://img.shields.io/badge/Model-YOLOv11-00FFFF?style=for-the-badge&logo=yolo)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript)
![Gemini API](https://img.shields.io/badge/AI-Gemini_API-8E75B2?style=for-the-badge&logo=googlegemini)
![Status](https://img.shields.io/badge/Status-Active_Development-brightgreen?style=for-the-badge)

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [Roadmap](#-roadmap)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🎯 About the Project

**Vigilant Traffic** is a computer-vision-based traffic violation detection system built to identify common road safety violations in real time from video footage. It combines a computer-vision detection pipeline with a modern, responsive web interface — giving traffic authorities and researchers a fast, accurate way to flag violations without manual monitoring.

This project was built as a final-year engineering initiative with a focus on practical deployability: clean detection logic on the backend, and an intuitive, data-rich dashboard on the frontend.

---

## ✨ Key Features

| Violation Type | Description |
|---|---|
| 🪖 **Helmet Detection** | Flags two-wheeler riders not wearing a helmet |
| 👥 **Triple Riding** | Detects more than two people on a two-wheeler |
| 🔒 **Seat Belt Detection** | Identifies drivers/passengers without a seat belt |
| 🪞 **Rearview Mirror Check** | Flags vehicles missing rearview mirrors |

**Plus:**
- ⚡ Real-time inference on video feeds
- 📊 Interactive dashboard with violation analytics
- 🖼️ Auto-captured evidence frames for each flagged violation
- 🌐 Clean, responsive UI built with React + TypeScript

---

## 🛠️ Tech Stack

**Detection Engine**
- Gemini Vision API (current production detection & reasoning engine)
- **YOLOv11** — custom-trained object detection model (merged dataset of 5,619 images across 6 violation classes, 100 training epochs). Trained and validated; not yet integrated into the live pipeline.

**Frontend**
- React
- TypeScript
- Tailwind CSS

**Other**
- Python (data & model pipeline)
- Node.js / Express (API layer)

---

## 🏗️ System Architecture

**Current (production):**

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────┐
│   Video Input     │ ──▶  │  Gemini Vision API │ ──▶  │  Violation Analysis  │
│ (CCTV / Uploaded) │      │   (current engine) │      │                      │
└─────────────────┘      └──────────────────┘      └────────────────────┘
                                                              │
                                                              ▼
                                                  ┌────────────────────────┐
                                                  │  React + TypeScript UI  │
                                                  │  Dashboard & Evidence   │
                                                  └────────────────────────┘
```

**Planned (post YOLOv11 integration):**

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────┐
│   Video Input     │ ──▶  │ YOLOv11 Detection │ ──▶  │   FastAPI Inference  │
│ (CCTV / Uploaded) │      │  (trained model)  │      │       Service        │
└─────────────────┘      └──────────────────┘      └────────────────────┘
                                                              │
                                                              ▼
                                                  ┌────────────────────────┐
                                                  │  React + TypeScript UI  │
                                                  │  Dashboard & Evidence   │
                                                  └────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- A Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/vigilant-traffic.git
cd vigilant-traffic

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
```

### Environment Setup

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

### Run the Project

```bash
# Start backend
python app.py

# Start frontend
cd frontend
npm run dev
```

---

## 💻 Usage

1. Upload a traffic video clip (or connect a live feed — see [Roadmap](#-roadmap))
2. The detection pipeline processes each frame for violations
3. Flagged violations appear on the dashboard with a snapshot, violation type, and timestamp
4. Export or review flagged evidence directly from the UI

---

## 🗺️ Roadmap

- [x] Helmet detection
- [x] Triple riding detection
- [x] Seat belt detection
- [x] Rearview mirror detection
- [x] React + TypeScript dashboard
- [x] Train custom **YOLOv11** model on merged dataset (Roboflow + PyTorch, 100 epochs, GTX 1650)
- [ ] 🔌 Build FastAPI inference service to serve `best.pt`
- [ ] 🔁 Integrate trained YOLOv11 model into the existing React/Express stack, replacing Gemini as the primary detector
- [ ] 📹 **Live CCTV feed integration** — connect directly to live camera streams for real-time monitoring, instead of relying only on uploaded video files
- [ ] 🔔 Real-time alert notifications for authorities
- [ ] 🚗 Number plate recognition for automatic violation ticketing
- [ ] ☁️ Cloud deployment for multi-camera, city-wide monitoring
- [ ] 📱 Mobile companion app for field officers

---

## 📸 Screenshots

> <img width="1267" height="900" alt="image" src="https://github.com/user-attachments/assets/73c8cbd1-f3ae-4654-a388-c2cef91c10cc" />

> <img width="1108" height="761" alt="image" src="https://github.com/user-attachments/assets/3e6f0688-d6ad-4df0-8798-e8f5c48ec9af" />

> <img width="1035" height="897" alt="image" src="https://github.com/user-attachments/assets/a36a0dd6-b3cd-4365-a7e8-f331b1e8465c" />

> <img width="1030" height="887" alt="image" src="https://github.com/user-attachments/assets/773c7603-d96e-48ff-9500-c699c6f78d2b" />

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

## 📬 Contact

**Himesh**
Final Year B.E. — Artificial Intelligence & Machine Learning
Jyothy Institute of Technology, Bangalore

<div align="center">

⭐ *If you found this project useful, consider giving it a star!* ⭐

</div>