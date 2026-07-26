export type BoundingBox = [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-1000 scale

export interface Rider {
  box: BoundingBox;
  hasHelmet: boolean;
  confidence?: number;
}

export interface Motorcycle {
  id: string;
  box: BoundingBox;
  confidence: number;
  riders: Rider[];
  hasRearviewMirror?: boolean;
  plateBox?: BoundingBox;
  plateText?: string;
  plateConfidence?: number;
}

export interface Occupant {
  box: BoundingBox;
  wearingSeatbelt: boolean;
  role: 'driver' | 'passenger';
  confidence?: number;
}

export interface Car {
  id: string;
  box: BoundingBox;
  confidence: number;
  windshieldBox?: BoundingBox;
  occupants: Occupant[];
  plateBox?: BoundingBox;
  plateText?: string;
  plateConfidence?: number;
}

export interface DetectionResult {
  motorcycles: Motorcycle[];
  cars: Car[];
  unassociatedPersons?: Array<{ box: BoundingBox; role: string }>;
}

export interface PresetImage {
  id: string;
  name: string;
  description: string;
  url: string; // Base64 or stock visual representation
  category: 'motorcycle' | 'car' | 'mixed';
  defaultViolations: string[];
}

export interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  topic: 'Introduction' | 'Proposed System' | 'Literature Survey' | 'Refinement of Design' | 'Architecture' | 'Results' | 'Applications' | 'References';
  points: string[];
  visualType: 'grid' | 'logic-flow' | 'table' | 'bar-chart' | 'flowchart' | 'references-list';
}

export interface FineRule {
  violation: string;
  fineAmount: number; // in INR
  section: string; // statutory reference shown on the challan
}

export type ChallanStatus = 'issued' | 'paid' | 'void';

export interface ChallanRequest {
  vehicleId: string;
  vehicleType: 'motorcycle' | 'car';
  plateText: string;
  violations: string[];
  evidenceImageBase64?: string; // optional snapshot, stored with the record
}

export interface ChallanRecord {
  challanId: string;
  vehicleId: string;
  vehicleType: 'motorcycle' | 'car';
  plateNumber: string;
  violations: string[];
  totalFine: number;
  timestamp: string; // creation time
  updatedAt: string;
  lineItems: FineRule[];
  status: ChallanStatus;
  evidenceImageBase64?: string;
}

export interface ChallanUpdateRequest {
  plateNumber?: string;
  violations?: string[]; // if provided, the fine is recomputed server-side
  status?: ChallanStatus;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  vehicleType: 'motorcycle' | 'car';
  violationType: 'No Violation' | 'No Helmet' | 'Triple Riding' | 'No Seat Belt' | 'Triple Riding + No Helmet' | 'No Rearview Mirror';
  details: string;
  confidence: number;
}
