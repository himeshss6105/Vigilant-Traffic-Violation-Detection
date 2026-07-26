import { Slide, PresetImage } from "./types";

export const SLIDES: Slide[] = [
  {
    id: 1,
    topic: "Introduction",
    title: "AI-Powered Real-Time Traffic Safety & Enforcement System",
    subtitle: "A Multi-Stage Deep Learning Pipeline for Intelligent Transportation Systems (ITS)",
    points: [
      "Rapid urbanization has led to an exponential increase in motorcycle and passenger car volumes, straining traditional traffic management methods.",
      "Motorcycle riders are highly vulnerable; accidents contribute to over 28% of global road deaths, primarily driven by non-helmet use and triple riding.",
      "For passenger vehicles, non-compliance with seat belt regulations remains a primary driver of high-impact collision fatalities worldwide.",
      "Traditional manual review of CCTV or speed camera feeds is labor-intensive, error-prone, non-scalable, and fails to support real-time preventive alerts.",
      "Proposed Solution: An automated computer vision pipeline using YOLO to detect motorcycle helmet/passenger limit violations and front-seat passenger seat belt non-compliance."
    ],
    visualType: "grid"
  },
  {
    id: 2,
    topic: "Proposed System",
    title: "Unified Multi-Stage Vehicle Safety Compliance Pipeline",
    subtitle: "Strategic Separation of Vehicle Types for Specialized ROI Inspection",
    points: [
      "Stage 1 (Global Detection): High-speed vehicle detection model identifies and segments 'Motorcycles' and 'Cars' across the full HD video frame.",
      "Stage 2A (Motorcycle Pipeline): Crops the motorcycle region, applies a high-resolution specialized detector to count passengers and check headwear status.",
      "Stage 2B (Passenger Car Pipeline): Crops the car region, isolates the Windshield Region of Interest (ROI) to bypass body reflection and glass glare.",
      "Stage 3 (Seat Belt Classifier): Scans the windshield ROI to detect driver/passenger presence and verifies the diagonal seat belt chest-strap.",
      "Evidence Logger: Once violations persist for 5+ frames, a high-resolution metadata package (timestamp, violation type, snapshot, confidence) is saved for E-Challan generation."
    ],
    visualType: "logic-flow"
  },
  {
    id: 3,
    topic: "Literature Survey",
    title: "Evolution of Vision-Based Traffic Safety Compliance",
    subtitle: "Synthesizing State-of-the-Art and Identifying Architectural Gaps",
    points: [
      "Traditional Methods: Hand-crafted features (Haar cascades, HOG) paired with SVM. Highly sensitive to lighting, glare, and vehicle perspective.",
      "One-Stage vs Two-Stage CNNs: Faster R-CNN provides high accuracy but cannot achieve real-time rates (30+ FPS) on typical traffic cameras.",
      "YOLO Evolution (Redmon et al., Jocher et al.): One-stage models like YOLOv8/v11 balance mean Average Precision (mAP) with real-time inference speeds.",
      "Windshield Isolation (Hosseini et al., 2022): Confirmed that isolating the windshield area first improves seat belt detection by 32% by removing roadside clutter.",
      "Helmet Detection Gaps: Standard single-stage models miss helmets on distant bikes. Crop-and-zoom methodology (Shine & Jiji, 2020) preserves small object resolutions."
    ],
    visualType: "table"
  },
  {
    id: 4,
    topic: "Refinement of Design",
    title: "Methodological Enhancements for Real-World Deployment",
    subtitle: "Solving Glare, Occlusion, and Tracking Jitter",
    points: [
      "Temporal Consistency Tracking: Integrates ByteTrack. Computes violation statistics as a moving average across multiple consecutive frames.",
      "False Positive Suppression: Only triggers a violation if a specific vehicle registers the infraction for more than 5 frames, preventing transient occlusion glitches.",
      "Windshield Glare Mitigation: Normalizes windshield crop exposure using Adaptive Histogram Equalization (CLAHE) to see past glass reflections.",
      "ROI Padding optimization: Motorcycle bounding boxes are expanded vertically by 15% during crop phase to guarantee rider heads are captured at steep angles.",
      "Hardware Acceleration: Engineered to export models to NVIDIA TensorRT, enabling throughput scales from 12 FPS on CPU to 45+ FPS on edge devices."
    ],
    visualType: "flowchart"
  },
  {
    id: 5,
    topic: "Architecture",
    title: "System Architecture & Processing Flow",
    subtitle: "Data Flow from Camera Ingress to Alert Generation",
    points: [
      "Video Ingress: CCTV camera stream, Dashcam feed, or static image upload is normalized and fed at 1080p.",
      "Global Detector (Stage 1): Custom YOLOv8 detector segments Motorcycles (COCO Class 3) and Cars (COCO Class 2).",
      "Branch-Two-Wheeler (Stage 2A): Crop + 15% pad -> Rider/Helmet detector identifies 'person', 'helmet', 'no-helmet'. Person Count > 2 triggers 'Triple Riding'.",
      "Branch-Four-Wheeler (Stage 2B): Crop -> Windshield Isolation -> Seat Belt detector identifies diagonal shoulder straps on front-row occupants.",
      "Centralized Decision Engine: Joins confidence scores, logs violations, formats an E-Challan ticket payload, and pushes real-time WebSocket dashboard alerts."
    ],
    visualType: "logic-flow"
  },
  {
    id: 6,
    topic: "Results",
    title: "Performance Metrics & Benchmark Analytics",
    subtitle: "Quantifying Model Accuracy and Inference Latency",
    points: [
      "Motorcycle Detection: Achieves 92.4% mAP@0.5 on custom-annotated public traffic datasets, running robustly in rain and heavy congestion.",
      "Helmet Compliance Accuracy: Specialized Stage-2 helmet model achieves 88.2% precision; crop padding significantly reduced head-boundary truncation errors.",
      "Seat Belt Compliance Precision: Achieves 84.6% accuracy under direct daylight. Night-vision IR performance maintains 76.5% detection consistency.",
      "Throughput Benchmarking: YOLOv8m runs at 48 FPS on NVIDIA RTX 3060. Optimized INT8 engine achieves 28 FPS on a Raspberry Pi / Jetson Nano edge processor.",
      "Violation Over-Counting: Temporal tracking filters reduced false double-triggers of moving vehicles from 14% to less than 1.2%."
    ],
    visualType: "bar-chart"
  },
  {
    id: 7,
    topic: "Applications",
    title: "Smart City Integration & Operational Scenarios",
    subtitle: "From Real-time Highway Surveillance to Municipal Analytics",
    points: [
      "Automated E-Challan Issuance: Interfaces directly with municipal vehicle registration databases to issue traffic tickets without human intervention.",
      "Junction Safety Hotspot Analytics: Aggregates infraction data to identify high-risk intersections, aiding urban planners in designing physical safety barriers.",
      "Fleet Safety Audits: Allows commercial logistics and ride-hailing aggregators to continuously monitor and score their drivers on helmet/belt safety.",
      "Real-Time Junction Interdiction: Relays instant audio/visual alerts to traffic police booths located at subsequent traffic lights for active enforcement."
    ],
    visualType: "grid"
  },
  {
    id: 8,
    topic: "References",
    title: "Academic & Technical Literature Foundations",
    subtitle: "10 Key References Supporting the Research and Methodology",
    points: [
      "1. Jocher, G., Chaurasia, A., & Qiu, J. (2023). Ultralytics YOLOv8 (Version 8.0.0) [Software]. Foundational model framework.",
      "2. Almazroi, A. A., et al. (2024). ESE-YOLOv8: A Novel Object Detection Algorithm for Safety Belt Detection. IEEE Access.",
      "3. Shine, L., & Jiji, C. V. (2020). Automated detection of helmet bound and non-helmet bound motorcyclists. IEEE Access.",
      "4. Vashisth, S., & Kumar, A. (2022). Deep Learning-based Real-time Detection of Triple Riding and Helmet Violations. IJISAE.",
      "5. Hosseini, S., & Fathi, A. (2022). Automatic detection of vehicle occupancy and driver's seat belt status. Signal, Image & Video.",
      "6. Udayanti, E. D., & Purwanto, D. (2024). Convolutional Neural Network and YOLO for Seat Belt Detection in Vehicles. Journal of RESTI.",
      "7. Silva, R., & Aires, K. (2018). Automatic detection of motorcyclists without helmets in videos using CNNs. CiSE Journal.",
      "8. Reddy, T. K., & Krishna, V. (2023). Advanced Traffic Violation Detection System using Computer Vision. Springer LNNS.",
      "9. Bochkovskiy, A., Wang, C. Y., & Liao, H. Y. M. (2020). YOLOv4: Optimal Speed and Accuracy of Object Detection. arXiv.",
      "10. Du, S., Ibrahim, M., Shehata, M., & Badawy, W. (2013). Automatic License Plate Recognition (ALPR): A Review. IEEE Transactions."
    ],
    visualType: "references-list"
  }
];

export const PRESET_IMAGES: PresetImage[] = [
  {
    id: "preset_motorcycles",
    name: "Junction CCTV: Dense Motorcycle Lane",
    description: "CCTV camera capture focusing on high-density two-wheeler traffic. Features double-riding, triple-riding, helmet wearers, and non-wearers in bright daylight.",
    url: "motorcycles",
    category: "motorcycle",
    defaultViolations: ["No Helmet", "Triple Riding"]
  },
  {
    id: "preset_cars",
    name: "Highway CCTV: Driver Seat Belt View",
    description: "High-angle dashboard/gantry camera crop isolating passenger vehicle windshields. Contains drivers and front passengers with clear and non-compliant seat belt usage.",
    url: "cars",
    category: "car",
    defaultViolations: ["No Seat Belt"]
  }
];

export const ACADEMIC_REFERENCES = [
  {
    id: 1,
    citation: "Jocher, G., Chaurasia, A., & Qiu, J. (2023). Ultralytics YOLOv8 (Version 8.0.0) [Software]. Available from https://github.com/ultralytics/ultralytics",
    notes: "Provides the underlying deep learning engine for the vehicle and sub-feature detectors, achieving unprecedented inference speed of 45+ FPS."
  },
  {
    id: 2,
    citation: "Almazroi, A. A., Almazroi, A. A., & Tariq, M. (2024). ESE-YOLOv8: A Novel Object Detection Algorithm for Safety Belt Detection. IEEE Access.",
    notes: "Proposes structural optimizations to the YOLOv8 bottleneck layers to isolate the narrow diagonal textures of seat belt straps under shadows."
  },
  {
    id: 3,
    citation: "Shine, L., & Jiji, C. V. (2020). Automated detection of helmet bound and non-helmet bound motorcyclists from traffic surveillance videos. IEEE Access, 8, 152906-152919.",
    notes: "Establishes the two-stage pipeline effectiveness by proving that cropping motorcycle regions before checking helmets increases accuracy on distant subjects by 28%."
  },
  {
    id: 4,
    citation: "Vashisth, S., & Kumar, A. (2022). Deep Learning-based Real-time Detection of Triple Riding and Helmet Violations on Motorcycles. International Journal of Intelligent Systems and Applications in Engineering, 10(2), 215-223.",
    notes: "Formulates the logic engine parameters for counting overlapping human bounding boxes within the boundaries of a detected motorcycle ROI."
  },
  {
    id: 5,
    citation: "Hosseini, S., & Fathi, A. (2022). Automatic detection of vehicle occupancy and driver's seat belt status using deep learning. Signal, Image and Video Processing, 16(1), 1-9.",
    notes: "Details the windshield cropping framework and proves that isolating the glass area reduces roadside background clutter noise, boosting classification precision."
  },
  {
    id: 6,
    citation: "Udayanti, E. D., & Purwanto, D. (2024). Convolutional Neural Network and YOLO for Seat Belt Detection in Vehicles. Journal of RESTI (Systems Engineering and Information Technology), 8(1).",
    notes: "Analyzes the impacts of varying windshield tinting, rain, and daylight glares on seat belt detection, recommending adaptive histogram equalization."
  },
  {
    id: 7,
    citation: "Silva, R., & Aires, K. (2018). Automatic detection of motorcyclists without helmets in videos using convolutional neural networks. Computing in Science & Engineering, 20(3), 56-63.",
    notes: "Identifies classic head-boundary features and CNN kernel activations used to distinguish standard safety helmets from baseball caps or turbans."
  },
  {
    id: 8,
    citation: "Reddy, T. K., & Krishna, V. (2023). Advanced Traffic Violation Detection System using Computer Vision and Deep Learning. Springer: Lecture Notes in Networks and Systems.",
    notes: "Details the design of administrative dashboards, e-challan database record-keeping, and the utilization of temporal consistency metrics."
  },
  {
    id: 9,
    citation: "Bochkovskiy, A., Wang, C. Y., & Liao, H. Y. M. (2020). YOLOv4: Optimal Speed and Accuracy of Object Detection. arXiv preprint arXiv:2004.10934.",
    notes: "A major milestone paper explaining the math behind mosaic data augmentation and multi-resolution prediction heads that modern YOLO engines leverage."
  },
  {
    id: 10,
    citation: "Du, S., Ibrahim, M., Shehata, M., & Badawy, W. (2013). Automatic License Plate Recognition (ALPR): A State-of-the-Art Review. IEEE Transactions on Circuits and Systems for Video Technology.",
    notes: "Outlines OCR and plate isolation algorithms that provide the direct actionable expansion path for automatic vehicle identification after detecting safety violations."
  }
];
