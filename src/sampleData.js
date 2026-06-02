// ─────────────────────────────────────────────────────────────
//  SAMPLE DATA — for local testing only
//  To remove: delete this file + set USE_SAMPLE_DATA = false in App.jsx
// ─────────────────────────────────────────────────────────────

export const sampleVendors = [
  {
    id: 'v1', name: 'Sharma Wood Works', initials: 'SW', color: 'purple',
    phone: '+91 94140 11234', location: 'Jodhpur', email: 'sharma.wood@gmail.com',
    orders: 18, onTimeRate: 72, flags: 6, totalBilled: 420000,
  },
  {
    id: 'v2', name: 'Rajput Furniture Co.', initials: 'RF', color: 'teal',
    phone: '+91 98290 55678', location: 'Jodhpur', email: 'rajput.furn@gmail.com',
    orders: 24, onTimeRate: 91, flags: 1, totalBilled: 780000,
  },
  {
    id: 'v3', name: 'Mehta Krafts', initials: 'MK', color: 'coral',
    phone: '+91 97994 33210', location: 'Jodhpur', email: 'mehta.krafts@gmail.com',
    orders: 9, onTimeRate: 55, flags: 11, totalBilled: 195000,
  },
  {
    id: 'v4', name: 'Jodhpur Wood House', initials: 'JW', color: 'blue',
    phone: '+91 94601 77890', location: 'Jodhpur', email: 'jwoodhouse@gmail.com',
    orders: 31, onTimeRate: 88, flags: 4, totalBilled: 1240000,
  },
];

export const sampleOrders = [
  // ── BL-0084 | Bangalore | Stage: Finishing (delayed) ──────────────────
  {
    id: 'BL-0084', channel: 'Bangalore', date: '24 May 2026', salesperson: 'Kishore',
    customer: { name: 'Priya Sharma', phone: '+91 98765 43210', address: '14, Indiranagar 1st Stage, Bangalore 560038' },
    value: 120000, advance: 50000,
    notes: 'Customer wants delivery strictly before 12 Jun — going on vacation after that.',
    costs: { rawMaterial: 35000, labour: 12000, polish: 4000, hardware: 2000, fabric: 8000, caneWork: 3000, packing: 1500, shipping: 4000, gst: 6000, misc: 500 },
    costApproved: true,
    items: [
      {
        id: 'i1', name: '3-seater sofa', qty: 1, price: 75000,
        wood: 'Sheesham', woodColour: 'Walnut stain', fabricCode: 'SUP-GRY-442',
        remarks: 'Seat depth 36" instead of standard 34".',
        finishingSteps: ['Polish', 'Upholstery', 'Cane work'],
        vendorId: 'v1', vendorCost: 38000,
        committedDate: '3 Jun 2026', actualDate: null,
        stageIndex: 3,
        finishingProgress: { Polish: 'done', Upholstery: 'active', 'Cane work': 'pending' },
        originalDelivery: '5 Jun 2026', currentDelivery: '10 Jun 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: null, packetCount: null,
        flags: [{ type: 'Delay', desc: 'Upholstery delayed — fabric arrived late', stage: 'Finishing', date: '28 May 2026', photos: 0 }],
      },
      {
        id: 'i2', name: '6-seater dining table', qty: 1, price: 45000,
        wood: 'Mango wood', woodColour: 'Natural matt', fabricCode: null,
        remarks: 'Glass top 8mm toughened frosted. Customer arranging glass separately.',
        finishingSteps: ['Polish'],
        vendorId: 'v2', vendorCost: 22000,
        committedDate: '28 May 2026', actualDate: '27 May 2026',
        stageIndex: 4,
        finishingProgress: { Polish: 'done' },
        originalDelivery: '5 Jun 2026', currentDelivery: '5 Jun 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: 'pass', packetCount: null,
        flags: [],
      },
    ],
    payments: [
      { id: 'p1', date: '24 May 2026', amount: 30000, mode: 'UPI', ref: 'UTR: 324556781234', by: 'Kishore' },
      { id: 'p2', date: '27 May 2026', amount: 20000, mode: 'Bank transfer', ref: 'Ref: HDFC2705XXX', by: 'Archana' },
    ],
  },

  // ── BL-0081 | Bangalore | Stage: Looking for vendor ───────────────────
  {
    id: 'BL-0081', channel: 'Bangalore', date: '29 May 2026', salesperson: 'Rajveer',
    customer: { name: 'Deepa Menon', phone: '+91 99801 55432', address: '8, Koramangala 5th Block, Bangalore 560034' },
    value: 68000, advance: 20000,
    notes: 'New customer — referral from Priya Sharma. Wants sheesham only.',
    costs: {},
    costApproved: false,
    items: [
      {
        id: 'i7', name: 'Queen bed with storage', qty: 1, price: 68000,
        wood: 'Sheesham', woodColour: 'Natural polish', fabricCode: null,
        remarks: 'Hydraulic storage. Standard queen 60×78.',
        finishingSteps: ['Polish'],
        vendorId: null, vendorCost: null,
        committedDate: null, actualDate: null,
        stageIndex: 0,
        finishingProgress: {},
        originalDelivery: '25 Jun 2026', currentDelivery: '25 Jun 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: null, packetCount: null,
        flags: [],
      },
    ],
    payments: [
      { id: 'p9', date: '29 May 2026', amount: 20000, mode: 'UPI', ref: 'UTR: 556677889900', by: 'Rajveer' },
    ],
  },

  // ── JD-0083 | Jodhpur | Stage: QC ─────────────────────────────────────
  {
    id: 'JD-0083', channel: 'Jodhpur', date: '22 May 2026', salesperson: 'Yash',
    customer: { name: 'Rahul Mehta', phone: '+91 94140 22334', address: '7, Ratanada, Jodhpur 342001' },
    value: 340000, advance: 170000,
    notes: 'B2B hotel project — 4 king beds.',
    costs: { rawMaterial: 90000, labour: 30000, polish: 12000, hardware: 8000, fabric: 25000, caneWork: 0, packing: 5000, shipping: 12000, gst: 18000, misc: 2000 },
    costApproved: true,
    items: [
      {
        id: 'i3', name: 'King bed frame × 4', qty: 4, price: 340000,
        wood: 'Sheesham', woodColour: 'Dark walnut', fabricCode: 'SUP-BLU-201',
        remarks: 'Hotel standard — extra reinforcement on slats.',
        finishingSteps: ['Polish', 'Upholstery'],
        vendorId: 'v4', vendorCost: 180000,
        committedDate: '28 May 2026', actualDate: '27 May 2026',
        stageIndex: 4,
        finishingProgress: { Polish: 'done', Upholstery: 'done' },
        originalDelivery: '2 Jun 2026', currentDelivery: '2 Jun 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: null, packetCount: null,
        flags: [],
      },
    ],
    payments: [
      { id: 'p3', date: '22 May 2026', amount: 170000, mode: 'Bank transfer', ref: 'Ref: ICICI2205XXX', by: 'Yash' },
    ],
  },

  // ── JD-0079 | Jodhpur | Stage: Packed ─────────────────────────────────
  {
    id: 'JD-0079', channel: 'Jodhpur', date: '10 May 2026', salesperson: 'Mukesh',
    customer: { name: 'Rajan Singhvi', phone: '+91 94600 33221', address: 'Hotel Aarya Lords, Rajkot' },
    value: 480000, advance: 240000,
    notes: 'Repeat client. Dining set for hotel banquet room.',
    costs: { rawMaterial: 140000, labour: 45000, polish: 18000, hardware: 5000, fabric: 30000, caneWork: 0, packing: 8000, shipping: 20000, gst: 25000, misc: 3000 },
    costApproved: true,
    items: [
      {
        id: 'i8', name: '10-seater dining table', qty: 1, price: 180000,
        wood: 'Sheesham', woodColour: 'Teak finish', fabricCode: null,
        remarks: 'Boat-shaped top. No glass.',
        finishingSteps: ['Polish'],
        vendorId: 'v4', vendorCost: 85000,
        committedDate: '25 May 2026', actualDate: '24 May 2026',
        stageIndex: 5,
        finishingProgress: { Polish: 'done' },
        originalDelivery: '1 Jun 2026', currentDelivery: '1 Jun 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: 'pass', packetCount: 3,
        flags: [],
      },
      {
        id: 'i9', name: 'Dining chair × 10', qty: 10, price: 300000,
        wood: 'Sheesham', woodColour: 'Teak finish', fabricCode: 'SUP-BRN-305',
        remarks: 'Upholstered seat pad matching fabric code.',
        finishingSteps: ['Polish', 'Upholstery'],
        vendorId: 'v4', vendorCost: 145000,
        committedDate: '25 May 2026', actualDate: '24 May 2026',
        stageIndex: 5,
        finishingProgress: { Polish: 'done', Upholstery: 'done' },
        originalDelivery: '1 Jun 2026', currentDelivery: '1 Jun 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: 'pass', packetCount: 5,
        flags: [],
      },
    ],
    payments: [
      { id: 'p10', date: '10 May 2026', amount: 240000, mode: 'Bank transfer', ref: 'Ref: SBI1005XXX', by: 'Mukesh' },
    ],
  },

  // ── PU-0080 | Pune | Stage: Raw ready (overdue) ───────────────────────
  {
    id: 'PU-0080', channel: 'Pune', date: '8 May 2026', salesperson: 'Ramesh',
    customer: { name: 'Sunita Agarwal', phone: '+91 98220 11223', address: '22, Koregaon Park, Pune 411001' },
    value: 85000, advance: 25000,
    notes: 'Vendor delayed. Customer has been informed once.',
    costs: { rawMaterial: 28000, labour: 10000, polish: 3500, hardware: 0, fabric: 0, caneWork: 0, packing: 1200, shipping: 3500, gst: 4500, misc: 500 },
    costApproved: true,
    items: [
      {
        id: 'i4', name: 'Bookshelf — 7 shelf', qty: 1, price: 85000,
        wood: 'Sheesham', woodColour: 'Honey oak', fabricCode: null,
        remarks: 'Adjustable shelves. Wall-mounted brackets included.',
        finishingSteps: ['Polish'],
        vendorId: 'v3', vendorCost: 42000,
        committedDate: '18 May 2026', actualDate: null,
        stageIndex: 2,
        finishingProgress: { Polish: 'pending' },
        originalDelivery: '20 May 2026', currentDelivery: '10 Jun 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: null, packetCount: null,
        flags: [{ type: 'Delay', desc: 'Vendor delayed raw product by 8 days', stage: 'Raw ready', date: '18 May 2026', photos: 0 }],
      },
    ],
    payments: [
      { id: 'p4', date: '8 May 2026', amount: 25000, mode: 'Cash', ref: '', by: 'Ramesh' },
    ],
  },

  // ── WB-0078 | Website | Stage: Dispatched ─────────────────────────────
  {
    id: 'WB-0078', channel: 'Website', date: '6 May 2026', salesperson: 'Sanskar',
    customer: { name: 'Vikram Nair', phone: '+91 99450 33221', address: '5, Whitefield, Bangalore 560066' },
    value: 62000, advance: 62000,
    notes: 'Full payment received online. Standard product.',
    costs: { rawMaterial: 18000, labour: 6000, polish: 2500, hardware: 0, fabric: 0, caneWork: 0, packing: 800, shipping: 3500, gst: 3200, misc: 0 },
    costApproved: true,
    dispatchDetails: { courier: 'V-Trans Logistics', trackingNo: 'VT-2026-884432', dispatchDate: '20 May 2026' },
    items: [
      {
        id: 'i5', name: 'Coffee table', qty: 1, price: 62000,
        wood: 'Mango wood', woodColour: 'Natural', fabricCode: null,
        remarks: 'Standard product — no customisation.',
        finishingSteps: ['Polish'],
        vendorId: 'v2', vendorCost: 28000,
        committedDate: '20 May 2026', actualDate: '19 May 2026',
        stageIndex: 6,
        finishingProgress: { Polish: 'done' },
        originalDelivery: '30 May 2026', currentDelivery: '30 May 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: 'pass', packetCount: 1,
        flags: [],
      },
    ],
    payments: [
      { id: 'p5', date: '6 May 2026', amount: 62000, mode: 'UPI', ref: 'UTR: 987654321', by: 'Sanskar' },
    ],
  },

  // ── WS-0075 | Wholesale | Stage: Delivered to warehouse ───────────────
  {
    id: 'WS-0075', channel: 'Wholesale', date: '1 May 2026', salesperson: 'Mukesh',
    customer: { name: 'Home Centre — Mumbai WH', phone: '+91 98000 11234', address: 'Home Centre Warehouse, Bhiwandi, Mumbai' },
    value: 850000, advance: 425000,
    notes: 'Home Centre B2B — 20 dining chairs. Awaiting customer confirmation to release from warehouse.',
    costs: { rawMaterial: 280000, labour: 80000, polish: 30000, hardware: 10000, fabric: 60000, caneWork: 0, packing: 15000, shipping: 35000, gst: 45000, misc: 5000 },
    costApproved: true,
    dispatchDetails: { courier: 'Mahavir Transport', trackingNo: 'MHV-2026-44321', dispatchDate: '26 May 2026' },
    items: [
      {
        id: 'i6', name: 'Dining chair × 20', qty: 20, price: 850000,
        wood: 'Sheesham', woodColour: 'Teak', fabricCode: 'SUP-BEG-110',
        remarks: 'Home Centre standard spec. Stacking chairs.',
        finishingSteps: ['Polish', 'Upholstery'],
        vendorId: 'v4', vendorCost: 520000,
        committedDate: '25 May 2026', actualDate: '25 May 2026',
        stageIndex: 7,
        finishingProgress: { Polish: 'done', Upholstery: 'done' },
        originalDelivery: '31 May 2026', currentDelivery: '31 May 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: 'pass', packetCount: 8,
        flags: [],
      },
    ],
    payments: [
      { id: 'p6', date: '1 May 2026', amount: 425000, mode: 'Bank transfer', ref: 'Ref: AXIS0105XXX', by: 'Mukesh' },
    ],
  },

  // ── BL-0071 | Bangalore | Stage: Delivered to customer ────────────────
  {
    id: 'BL-0071', channel: 'Bangalore', date: '10 Apr 2026', salesperson: 'Kishore',
    customer: { name: 'Arun Mehta', phone: '+91 98110 44332', address: '3, HSR Layout Sector 4, Bangalore 560102' },
    value: 95000, advance: 95000,
    notes: 'Completed. After-sales issue raised separately.',
    costs: { rawMaterial: 30000, labour: 10000, polish: 4000, hardware: 3000, fabric: 10000, caneWork: 0, packing: 1500, shipping: 4000, gst: 5000, misc: 500 },
    costApproved: true,
    dispatchDetails: { courier: 'In-house', trackingNo: '', dispatchDate: '5 May 2026' },
    deliveryConfirmed: true,
    items: [
      {
        id: 'i10', name: 'King bed frame', qty: 1, price: 95000,
        wood: 'Sheesham', woodColour: 'Dark walnut', fabricCode: 'SUP-BEG-110',
        remarks: 'Standard king 72×78. Upholstered headboard.',
        finishingSteps: ['Polish', 'Upholstery'],
        vendorId: 'v2', vendorCost: 52000,
        committedDate: '3 May 2026', actualDate: '4 May 2026',
        stageIndex: 8,
        finishingProgress: { Polish: 'done', Upholstery: 'done' },
        originalDelivery: '8 May 2026', currentDelivery: '8 May 2026',
        images: [], measurementPhotos: [], rawPhotos: [],
        qcStatus: 'pass', packetCount: 2,
        flags: [],
      },
    ],
    payments: [
      { id: 'p7', date: '10 Apr 2026', amount: 50000, mode: 'UPI', ref: 'UTR: 112233445566', by: 'Kishore' },
      { id: 'p8', date: '8 May 2026', amount: 45000, mode: 'Cash', ref: '', by: 'Kishore' },
    ],
  },
];

export const sampleServiceJobs = [
  { id: 'sj1', date: '26 May', customer: 'Priya Sharma', orderRef: 'BL-0071', problem: 'Drawer not closing properly', assignedTo: 'Rajveer', appointment: '30 May 2026', status: 'Open', chargeable: null },
  { id: 'sj2', date: '24 May', customer: 'Arun Mehta', orderRef: 'BL-0071', problem: 'Termite spotted on bed base', assignedTo: 'Rajveer', appointment: '28 May 2026', status: 'In progress', chargeable: null },
  { id: 'sj3', date: '20 May', customer: 'Sunita Agarwal', orderRef: 'PU-0080', problem: 'Polish peeling on tabletop', assignedTo: 'Ramesh', appointment: '25 May 2026', status: 'In progress', chargeable: null },
  { id: 'sj4', date: '15 May', customer: 'Vikram Nair', orderRef: 'WB-0078', problem: 'Sofa leg wobbling', assignedTo: 'Kishore', appointment: '22 May 2026', status: 'Resolved', chargeable: 500 },
];

export const sampleReplacements = [
  {
    id: 'REP-0004', status: 'In progress',
    customer: 'Arun Mehta', originalOrderId: 'BL-0071', originalItem: 'King bed frame', originalDelivered: '8 May 2026',
    defect: 'Termite damage found on base', photos: 3,
    newOrderId: 'BL-0081', newStage: 'Processing started', expectedDelivery: '20 Jun 2026',
    oldItemStatus: 'Awaiting pickup from customer', collectionDate: '30 May 2026', assignedTo: 'Rajveer', loggedDate: '24 May 2026',
  },
  {
    id: 'REP-0002', status: 'Completed',
    customer: 'Sunita Agarwal', originalOrderId: 'PU-0080', originalItem: 'Dining chair set × 4', originalDelivered: '15 Mar 2026',
    defect: 'Chair joints cracking after 2 weeks', photos: 1,
    newOrderId: 'PU-0052', newStage: 'Delivered to customer', expectedDelivery: '28 Apr 2026',
    oldItemStatus: 'Returned to Jodhpur', collectionDate: '5 Apr 2026', assignedTo: 'Ramesh', loggedDate: '2 Apr 2026',
  },
];
