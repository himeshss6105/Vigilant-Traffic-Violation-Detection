<div align="center">

# 🚦 Vigilant Traffic

### AI-Powered Real-Time Traffic Violation Detection System

*Making roads safer, one frame at a time.*

![YOLOv8](https://img.shields.io/badge/Model-YOLOv8-00FFFF?style=for-the-badge&logo=yolo)
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

**Vigilant Traffic** is a computer-vision-based traffic violation detection system built to identify common road safety violations in real time from video footage. It combines a **YOLOv8-powered detection pipeline** with a modern, responsive web interface — giving traffic authorities and researchers a fast, accurate way to flag violations without manual monitoring.

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
- YOLOv8 (object detection)
- Gemini Vision API (violation reasoning & classification support)

**Frontend**
- React
- TypeScript
- Tailwind CSS

**Other**
- Python (data & model pipeline)
- Node.js (API layer)

---

## 🏗️ System Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────┐
│   Video Input     │ ──▶  │  YOLOv8 Detection │ ──▶  │  Gemini Vision API   │
│ (CCTV / Uploaded) │      │     Pipeline      │      │  Violation Analysis  │
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

Create a `.env` file in the backend directory:

```env
GEMINI_API_KEY=your_api_key_here
```

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
- [ ] 📹 **Live CCTV feed integration** — connect directly to live camera streams for real-time monitoring, instead of relying only on uploaded video files
- [ ] 🔔 Real-time alert notifications for authorities
- [ ] 🚗 Number plate recognition for automatic violation ticketing
- [ ] ☁️ Cloud deployment for multi-camera, city-wide monitoring
- [ ] 📱 Mobile companion app for field officers

---

## 📸 Screenshots

> *Add dashboard screenshots or a demo GIF here to showcase the UI and detection in action.*

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
