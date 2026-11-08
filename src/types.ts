export type BoundingBox = [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-1000 scale

export type VehicleClass = 'motorcycle' | 'car';

/** One row of the simulated vehicle registry (data/vehicles.csv). */
export interface RegisteredVehicle {
  plate: string;
  ownerName: string;
  phone: string; // full number; always masked before it leaves the server
  vehicleModel: string;
  vehicleLabel: string; // Car | Scooter | Bike
  vehicleClass: VehicleClass;
}

/** Registry row as sent to the browser (phone already masked). */
export interface RegisteredVehiclePublic {
  plate: string;
  ownerName: string;
  phoneMasked: string;
  vehicleModel: string;
  vehicleLabel: string;
  vehicleClass: VehicleClass;
}

/** Result of matching a detected plate against the registry. */
export interface RegistryMatch extends RegisteredVehiclePublic {
  matchType: 'exact' | 'corrected';
  readAs: string; // what OCR / the vision model read before matching
  distance: number;
}

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
  plateTextGuess?: string; // plate characters as read by the vision model
  plateTextRaw?: string; // reading before it was replaced by the registered plate
  registry?: RegistryMatch;
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
  plateTextGuess?: string;
  plateTextRaw?: string;
  registry?: RegistryMatch;
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
  // Owner details, filled from the registry when the plate matches a registered vehicle
  ownerName?: string;
  ownerPhone?: string;
  vehicleModel?: string;
  vehicleLabel?: string;
  registryMatch?: 'exact' | 'corrected';
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
