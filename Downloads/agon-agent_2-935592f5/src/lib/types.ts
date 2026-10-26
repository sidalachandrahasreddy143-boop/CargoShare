export type Role = 'trader' | 'lsp' | 'admin';
export type TransportMode = 'rail' | 'road' | 'ship' | 'air';
export type LspApproval = 'pending' | 'under_review' | 'approved' | 'rejected';
export type ContainerStatus = 'active' | 'full' | 'paused' | 'departed';
export type BookingStatus = 'payment_pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'created' | 'captured' | 'failed' | 'refunded';

export interface Container {
  id: string;
  containerRef: string;
  mode: TransportMode;
  lspId: string;
  lspCompany: string;
  lspQuality: number; // data-quality score 0–100 (admin-assigned)
  lspRating: number;
  lspReviews: number;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departure: string; // ISO
  arrival: string; // ISO
  totalCapacity: number;
  bookedCapacity: number; // mutates live via BroadcastChannel + interval drift
  unit: string;
  ratePerUnit: number; // ₹
  minBookingQty: number;
  cutoff: string;
  cargoTypes: string[];
  status: ContainerStatus;
}

export interface CargoDetails {
  commodity: string;
  packages: number;
  weight: number;
  notes?: string;
}

export interface Booking {
  id: string;
  bookingRef: string;
  containerId: string;
  traderId: string;
  traderName: string;
  lspId: string;
  lspCompany: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  departure: string;
  cargoDetails: CargoDetails;
  qtyBooked: number;
  unit: string;
  ratePerUnit: number;
  totalPrice: number;
  platformFee: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  invoiceNo: string;
  createdAt: string;
  lockExpiresAt?: string;
  disputeId?: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string; // user id or 'lsp'
  senderRole: 'trader' | 'lsp' | 'admin';
  text: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  attachmentSize?: number;
  timestamp: string;
  read: boolean;
}

export interface ChatThread {
  bookingId: string;
  unread: number;
  lastMessage?: string;
  lastAt?: string;
}

export interface LspApplicant {
  id: string;
  userId: string;
  companyName: string;
  applicantName: string;
  email: string;
  phone: string;
  address: string;
  mode: TransportMode;
  licenseNumber: string;
  licenseDocName: string;
  licenseDocType: string;
  fleetDetails: string;
  fleetCount: number;
  hubLocations: string[];
  bankName: string;
  bankAccount: string;
  ifsc: string;
  upi?: string;
  approvalStatus: LspApproval;
  rejectionReason?: string;
  inspectionNotes?: string;
  dataQualityScore?: number;
  appliedAt: string;
  reviewedAt?: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export interface Dispute {
  id: string;
  bookingId: string;
  bookingRef: string;
  raisedBy: string;
  reason: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  resolution?: string;
  createdAt: string;
}

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info' | 'lock';
  title: string;
  message?: string;
}
