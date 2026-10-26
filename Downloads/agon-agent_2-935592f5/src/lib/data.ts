import type { Container, LspApplicant, Booking } from './types';

const now = new Date();
const addH = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString();
const addD = (d: number, h = 0) => new Date(now.getTime() + d * 86400_000 + h * 3600_000).toISOString();

export const SEED_CONTAINERS: Container[] = [
  {
    id: 'c-1001', containerRef: 'DRF-WGN-1042', mode: 'rail',
    lspId: 'lsp-1', lspCompany: 'Deccan Rail Freight', lspQuality: 92, lspRating: 4.8, lspReviews: 214,
    origin: 'Gandhidham (ICD)', originCode: 'IN-GIM', destination: 'Ludhiana (ICD)', destinationCode: 'IN-LDH',
    originLat: 23.08, originLng: 70.13, destinationLat: 30.90, destinationLng: 75.86,
    departure: addD(3, 6), arrival: addD(4, 20),
    totalCapacity: 1200, bookedCapacity: 780, unit: 'MT', ratePerUnit: 1450, minBookingQty: 10,
    cutoff: addD(2), cargoTypes: ['Agri', 'FMCG', 'Auto Parts'], status: 'active',
  },
  {
    id: 'c-1002', containerRef: 'DRF-WGN-2210', mode: 'rail',
    lspId: 'lsp-1', lspCompany: 'Deccan Rail Freight', lspQuality: 92, lspRating: 4.8, lspReviews: 214,
    origin: 'Secunderabad', originCode: 'IN-SC', destination: 'Gandhidham (ICD)', destinationCode: 'IN-GIM',
    originLat: 17.43, originLng: 78.50, destinationLat: 23.08, destinationLng: 70.13,
    departure: addD(5, 3), arrival: addD(6, 22),
    totalCapacity: 900, bookedCapacity: 150, unit: 'MT', ratePerUnit: 1320, minBookingQty: 5,
    cutoff: addD(4), cargoTypes: ['FMCG', 'Pharma', 'Agri'], status: 'active',
  },
  {
    id: 'c-1003', containerRef: 'SR-TRI-4477', mode: 'road',
    lspId: 'lsp-2', lspCompany: 'Singh Roadways', lspQuality: 85, lspRating: 4.5, lspReviews: 388,
    origin: 'Delhi NCR', originCode: 'IN-DEL', destination: 'Mumbai', destinationCode: 'IN-BOM',
    originLat: 28.61, originLng: 77.20, destinationLat: 19.07, destinationLng: 72.87,
    departure: addD(2, 2), arrival: addD(3, 8),
    totalCapacity: 25, bookedCapacity: 9, unit: 'MT', ratePerUnit: 8900, minBookingQty: 1,
    cutoff: addH(36), cargoTypes: ['FMCG', 'Pharma', 'Electronics'], status: 'active',
  },
  {
    id: 'c-1004', containerRef: 'SR-TRI-4488', mode: 'road',
    lspId: 'lsp-2', lspCompany: 'Singh Roadways', lspQuality: 85, lspRating: 4.5, lspReviews: 388,
    origin: 'Ahmedabad', originCode: 'IN-AMD', destination: 'Delhi NCR', destinationCode: 'IN-DEL',
    originLat: 23.02, originLng: 72.57, destinationLat: 28.61, destinationLng: 77.20,
    departure: addD(4, 5), arrival: addD(5, 11),
    totalCapacity: 22, bookedCapacity: 4, unit: 'MT', ratePerUnit: 8600, minBookingQty: 1,
    cutoff: addD(3, 6), cargoTypes: ['Agri', 'FMCG', 'Textiles'], status: 'active',
  },
  {
    id: 'c-1005', containerRef: 'CSC-VSL-MAA-07', mode: 'ship',
    lspId: 'lsp-3', lspCompany: 'Coastal Shipping Co', lspQuality: 88, lspRating: 4.6, lspReviews: 152,
    origin: 'Chennai (INMAA)', originCode: 'INMAA', destination: 'Colombo (LKCMB)', destinationCode: 'LKCMB',
    originLat: 13.08, originLng: 80.29, destinationLat: 6.93, destinationLng: 79.84,
    departure: addD(6), arrival: addD(9),
    totalCapacity: 600, bookedCapacity: 210, unit: 'TEU', ratePerUnit: 62000, minBookingQty: 1,
    cutoff: addD(4), cargoTypes: ['FMCG', 'Auto Parts', 'Chemicals'], status: 'active',
  },
  {
    id: 'c-1006', containerRef: 'CSC-VSL-MUN-03', mode: 'ship',
    lspId: 'lsp-3', lspCompany: 'Coastal Shipping Co', lspQuality: 88, lspRating: 4.6, lspReviews: 152,
    origin: 'Mundra (INMUN)', originCode: 'INMUN', destination: 'Colombo (LKCMB)', destinationCode: 'LKCMB',
    originLat: 22.74, originLng: 69.71, destinationLat: 6.93, destinationLng: 79.84,
    departure: addD(8, 4), arrival: addD(12),
    totalCapacity: 850, bookedCapacity: 520, unit: 'TEU', ratePerUnit: 58000, minBookingQty: 2,
    cutoff: addD(6), cargoTypes: ['Agri', 'FMCG', 'Textiles'], status: 'active',
  },
  {
    id: 'c-1007', containerRef: 'DRF-WGN-3301', mode: 'rail',
    lspId: 'lsp-1', lspCompany: 'Deccan Rail Freight', lspQuality: 92, lspRating: 4.8, lspReviews: 214,
    origin: 'Ludhiana (ICD)', originCode: 'IN-LDH', destination: 'Secunderabad', destinationCode: 'IN-SC',
    originLat: 30.90, originLng: 75.86, destinationLat: 17.43, destinationLng: 78.50,
    departure: addD(7), arrival: addD(9),
    totalCapacity: 1100, bookedCapacity: 110, unit: 'MT', ratePerUnit: 1500, minBookingQty: 10,
    cutoff: addD(6), cargoTypes: ['Textiles', 'Agri'], status: 'active',
  },
  {
    id: 'c-1008', containerRef: 'SR-RFR-1102', mode: 'road',
    lspId: 'lsp-2', lspCompany: 'Singh Roadways', lspQuality: 85, lspRating: 4.5, lspReviews: 388,
    origin: 'Mumbai', originCode: 'IN-BOM', destination: 'Ahmedabad', destinationCode: 'IN-AMD',
    originLat: 19.07, originLng: 72.87, destinationLat: 23.02, destinationLng: 72.57,
    departure: addH(30), arrival: addH(54),
    totalCapacity: 18, bookedCapacity: 2, unit: 'MT', ratePerUnit: 9200, minBookingQty: 1,
    cutoff: addH(20), cargoTypes: ['Pharma', 'FMCG'], status: 'active',
  },
];

export const SEED_LSP_APPLICANTS: LspApplicant[] = [
  {
    id: 'lsp-4', userId: 'u-lsp-4', companyName: 'SouthWind Cargo Air', applicantName: 'Arun Menon',
    email: 'arun@southwindair.in', phone: '+91 99000 04444', address: 'Bengaluru, Karnataka',
    mode: 'air', licenseNumber: 'BCAA-FSC-2024-112',
    licenseDocName: 'BCAA_FSC_2024_112.pdf', licenseDocType: 'pdf',
    fleetDetails: '2 × A300-600F freighters · 48 ULD positions · 42 MT payload each · cold-chain certified',
    fleetCount: 2, hubLocations: ['Bengaluru (BLR)', 'Delhi (DEL)'],
    bankName: 'Axis Bank', bankAccount: 'XXXXXXXX3301', ifsc: 'UTIB0002299',
    approvalStatus: 'under_review', appliedAt: addD(-2, -5),
    inspectionNotes: 'Documents received. Awaiting DGCA AOC verification call scheduled this week.',
  },
  {
    id: 'lsp-5', userId: 'u-lsp-5', companyName: 'Konkan Konkan Rail Movers', applicantName: 'Sunita Patil',
    email: 'sunita@konkanrail.in', phone: '+91 98765 11223', address: 'Ratnagiri, Maharashtra',
    mode: 'rail', licenseNumber: 'CONCOR-REG-2025-0081',
    licenseDocName: 'concor_registration.jpg', licenseDocType: 'image',
    fleetDetails: '18 covered wagons · 60 MT payload · rake-sharing agreement with Central Railway',
    fleetCount: 18, hubLocations: ['Ratnagiri', 'Nagpur', 'Pune'],
    bankName: 'Bank of Maharashtra', bankAccount: 'XXXXXXXX7782', ifsc: 'MAHB0001456',
    approvalStatus: 'pending', appliedAt: addD(-1, -2),
  },
  {
    id: 'lsp-6', userId: 'u-lsp-6', companyName: 'E-Way Logistics Solutions', applicantName: 'Manoj Gupta',
    email: 'manoj@ewaylogistics.in', phone: '+91 98111 55667', address: 'Sanand, Gujarat',
    mode: 'road', licenseNumber: 'MORTH/2023/GL-2201',
    licenseDocName: 'national_permit_2023.pdf', licenseDocType: 'pdf',
    fleetDetails: '45 trailers incl. 9 reefer units · GPS on 100% fleet · 2 axle rigids for FMCG',
    fleetCount: 45, hubLocations: ['Sanand', 'Delhi NCR', 'Chennai'],
    bankName: 'HDFC Bank', bankAccount: 'XXXXXXXX9012', ifsc: 'HDFC0008811', upi: 'ewaylogistics@hdfcbank',
    approvalStatus: 'pending', appliedAt: addD(-0.4),
  },
];

export const SEED_BOOKINGS: Booking[] = [
  {
    id: 'b-9001', bookingRef: 'CS-8F3A21C4', containerId: 'c-1001',
    traderId: 'u-trader-1', traderName: 'Sharma Exports',
    lspId: 'lsp-1', lspCompany: 'Deccan Rail Freight',
    origin: 'Gandhidham (ICD)', destination: 'Ludhiana (ICD)', mode: 'rail', departure: addD(3, 6),
    cargoDetails: { commodity: 'Basmati Rice', packages: 320, weight: 40, notes: 'Palletised, moisture-proof wrap' },
    qtyBooked: 40, unit: 'MT', ratePerUnit: 1450, totalPrice: 58000, platformFee: 1450,
    bookingStatus: 'confirmed', paymentStatus: 'captured', paymentMethod: 'UPI •••• 2211',
    invoiceNo: 'INV-CS-8F3A21C4', createdAt: addD(-9, -3),
  },
  {
    id: 'b-9002', bookingRef: 'CS-2B7E9D10', containerId: 'c-1005',
    traderId: 'u-trader-1', traderName: 'Sharma Exports',
    lspId: 'lsp-3', lspCompany: 'Coastal Shipping Co',
    origin: 'Chennai (INMAA)', destination: 'Colombo (LKCMB)', mode: 'ship', departure: addD(6),
    cargoDetails: { commodity: 'Cotton Yarn Bales', packages: 180, weight: 24, notes: '40 TEU booked, stuff at CFS' },
    qtyBooked: 2, unit: 'TEU', ratePerUnit: 62000, totalPrice: 124000, platformFee: 3100,
    bookingStatus: 'confirmed', paymentStatus: 'captured', paymentMethod: 'Razorpay NetBanking',
    invoiceNo: 'INV-CS-2B7E9D10', createdAt: addD(-5, -6),
  },
  {
    id: 'b-9003', bookingRef: 'CS-55C1A0B8', containerId: 'c-1003',
    traderId: 'u-trader-1', traderName: 'Sharma Exports',
    lspId: 'lsp-2', lspCompany: 'Singh Roadways',
    origin: 'Delhi NCR', destination: 'Mumbai', mode: 'road', departure: addD(2, 2),
    cargoDetails: { commodity: 'Frozen Parathas', packages: 240, weight: 6, notes: 'Reefer at -18°C' },
    qtyBooked: 6, unit: 'MT', ratePerUnit: 8900, totalPrice: 53400, platformFee: 1335,
    bookingStatus: 'completed', paymentStatus: 'captured', paymentMethod: 'Card •••• 4410',
    invoiceNo: 'INV-CS-55C1A0B8', createdAt: addD(-21, -2),
  },
];

// 30-day analytics series for the admin dashboard (deterministic pseudo-random)
function seededSeries(): { day: string; gmv: number; bookings: number }[] {
  const out: { day: string; gmv: number; bookings: number }[] = [];
  let s = 42;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = weekend ? 0.45 : 1;
    const bookings = Math.round((6 + rand() * 14) * base);
    const gmv = Math.round(bookings * (52000 + rand() * 46000));
    out.push({ day: d.toISOString().slice(5, 10), gmv, bookings });
  }
  return out;
}
export const REVENUE_SERIES = seededSeries();

export const ROUTE_LEADERBOARD = [
  { route: 'IN-DEL → IN-BOM', bookings: 312, gmv: 18400000 },
  { route: 'IN-GIM → IN-LDH', bookings: 268, gmv: 15420000 },
  { route: 'INMAA → LKCMB', bookings: 190, gmv: 14160000 },
  { route: 'IN-AMD → IN-DEL', bookings: 171, gmv: 9770000 },
  { route: 'IN-SC → IN-GIM', bookings: 154, gmv: 8210000 },
  { route: 'IN-BOM → IN-AMD', bookings: 133, gmv: 6850000 },
  { route: 'INMUN → LKCMB', bookings: 121, gmv: 6720000 },
  { route: 'IN-LDH → IN-SC', bookings: 98, gmv: 5120000 },
];

export const FILL_RATE_BY_MODE = [
  { mode: 'Rail', fill: 78, listings: 412 },
  { mode: 'Road', fill: 64, listings: 638 },
  { mode: 'Ship', fill: 81, listings: 143 },
  { mode: 'Air', fill: 57, listings: 61 },
];

export const TOP_TRADERS = [
  { name: 'Sharma Exports', company: 'Surat, GJ', bookings: 46, gmv: 3120000 },
  { name: 'Mehta Agro Foods', company: 'Nashik, MH', bookings: 39, gmv: 2480000 },
  { name: 'Malabar Spices', company: 'Kochi, KL', bookings: 31, gmv: 1930000 },
  { name: 'Kutch Textile Mills', company: 'Bhuj, GJ', bookings: 28, gmv: 1710000 },
  { name: 'Doon Dry Fruits', company: 'Dehradun, UK', bookings: 22, gmv: 1240000 },
];
