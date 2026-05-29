export const CHANNELS = ['Bangalore', 'Pune', 'Jodhpur', 'Website', 'Wholesale'];

export const STAGES = [
  'Looking for vendor',
  'Processing started',
  'Raw ready',
  'Finishing',
  'QC',
  'Packed',
  'Dispatched',
  'Delivered to warehouse',
  'Delivered to customer'
];

export const ROLES = {
  admin: { label: 'Admin', name: 'Yash Jain', initials: 'YJ' },
  sales: { label: 'Sales', name: 'Kishore', initials: 'KR' },
  qc: { label: 'QC', name: 'QC Team', initials: 'QC' },
  accountant: { label: 'Accountant', name: 'Archana Jain', initials: 'AJ' },
};

export const vendors = [
  { id: 'v1', name: 'Sharma Wood Works', initials: 'SW', color: 'purple', phone: '+91 94140 11234', location: 'Jodhpur', email: 'sharma.wood@gmail.com', orders: 18, onTimeRate: 72, flags: 6, totalBilled: 420000 },
  { id: 'v2', name: 'Rajput Furniture Co.', initials: 'RF', color: 'teal', phone: '+91 98290 55678', location: 'Jodhpur', email: 'rajput.furn@gmail.com', orders: 24, onTimeRate: 91, flags: 1, totalBilled: 780000 },
  { id: 'v3', name: 'Mehta Krafts', initials: 'MK', color: 'coral', phone: '+91 97994 33210', location: 'Jodhpur', email: 'mehta.krafts@gmail.com', orders: 9, onTimeRate: 55, flags: 11, totalBilled: 195000 },
  { id: 'v4', name: 'Jodhpur Wood House', initials: 'JW', color: 'blue', phone: '+91 94601 77890', location: 'Jodhpur', email: 'jwoodhouse@gmail.com', orders: 31, onTimeRate: 88, flags: 4, totalBilled: 1240000 },
];

export const orders = [
  {
    id: 'BL-0084', channel: 'Bangalore', date: '24 May 2026', salesperson: 'Kishore',
    customer: { name: 'Priya Sharma', phone: '+91 98765 43210', address: '14, Indiranagar 1st Stage, Bangalore 560038' },
    value: 120000, advance: 50000,
    notes: 'Customer wants delivery strictly before 12 Jun — going on vacation after that. Preferred morning slot for installation.',
    items: [
      {
        id: 'i1', productId: 'PRD-0041', name: '3-seater sofa — custom', qty: 1, price: 75000,
        wood: 'Sheesham', woodColour: 'Walnut stain', fabricCode: 'SUP-GRY-442',
        hardware: ['Leg style', 'Cushion zip'],
        remarks: 'Seat depth 36" instead of standard 34". Armrest height to match customer\'s existing coffee table.',
        finishingSteps: ['Polish', 'Upholstery', 'Cane work'],
        vendorId: 'v1', vendorCost: 38000,
        committedDate: '3 Jun 2026', actualDate: '8 Jun 2026',
        stageIndex: 3,
        finishingProgress: { Polish: 'done', Upholstery: 'active', 'Cane work': 'pending' },
        originalDelivery: '5 Jun 2026', currentDelivery: '10 Jun 2026',
        flags: [{ type: 'QC defect', desc: 'Uneven polish on right arm — visible in raking light', stage: 'Finishing', date: '26 May 2026', photos: 3 }]
      },
      {
        id: 'i2', productId: 'PRD-0018', name: '6-seater dining table', qty: 1, price: 45000,
        wood: 'Mango wood', woodColour: 'Natural matt', fabricCode: null,
        hardware: ['Glass type'],
        remarks: 'Glass top 8mm toughened frosted. Customer arranging glass separately — we do frame only.',
        finishingSteps: ['Polish', 'Glass work'],
        vendorId: 'v2', vendorCost: 22000,
        committedDate: '28 May 2026', actualDate: '27 May 2026',
        stageIndex: 4,
        finishingProgress: { Polish: 'done', 'Glass work': 'done' },
        originalDelivery: '5 Jun 2026', currentDelivery: '5 Jun 2026',
        flags: []
      }
    ],
    payments: [
      { id: 'p1', date: '24 May 2026', amount: 30000, mode: 'UPI', ref: 'UTR: 324556781234', by: 'Kishore' },
      { id: 'p2', date: '27 May 2026', amount: 20000, mode: 'Bank transfer', ref: 'Ref: HDFC2705XXX', by: 'Archana' },
    ]
  },
  {
    id: 'JD-0083', channel: 'Jodhpur', date: '22 May 2026', salesperson: 'Yash',
    customer: { name: 'Rahul Mehta', phone: '+91 94140 22334', address: '7, Ratanada, Jodhpur 342001' },
    value: 340000, advance: 170000,
    notes: 'B2B order — hotel project.',
    items: [
      {
        id: 'i3', productId: 'PRD-0055', name: 'King bed frame × 4', qty: 4, price: 340000,
        wood: 'Sheesham', woodColour: 'Dark walnut', fabricCode: 'SUP-BLU-201',
        hardware: ['Headboard bracket'],
        remarks: 'Hotel standard — extra reinforcement on slats.',
        finishingSteps: ['Polish', 'Upholstery'],
        vendorId: 'v4', vendorCost: 180000,
        committedDate: '28 May 2026', actualDate: null,
        stageIndex: 4,
        finishingProgress: { Polish: 'done', Upholstery: 'done' },
        originalDelivery: '28 May 2026', currentDelivery: '28 May 2026',
        flags: []
      }
    ],
    payments: [
      { id: 'p3', date: '22 May 2026', amount: 170000, mode: 'Bank transfer', ref: 'Ref: ICICI2205XXX', by: 'Yash' },
    ]
  },
  {
    id: 'PU-0079', channel: 'Pune', date: '8 May 2026', salesperson: 'Ramesh',
    customer: { name: 'Sunita Agarwal', phone: '+91 98220 11223', address: '22, Koregaon Park, Pune 411001' },
    value: 85000, advance: 25000,
    notes: '',
    items: [
      {
        id: 'i4', productId: 'PRD-0022', name: 'Bookshelf — custom', qty: 1, price: 85000,
        wood: 'Sheesham', woodColour: 'Honey oak', fabricCode: null,
        hardware: [],
        remarks: '7 shelves, adjustable. Wall-mounted brackets included.',
        finishingSteps: ['Polish'],
        vendorId: 'v3', vendorCost: 42000,
        committedDate: '18 May 2026', actualDate: null,
        stageIndex: 2,
        finishingProgress: { Polish: 'pending' },
        originalDelivery: '20 May 2026', currentDelivery: '28 May 2026',
        flags: [{ type: 'Delay', desc: 'Vendor delayed raw product by 8 days', stage: 'Raw ready', date: '18 May 2026', photos: 0 }]
      }
    ],
    payments: [
      { id: 'p4', date: '8 May 2026', amount: 25000, mode: 'Cash', ref: '', by: 'Ramesh' },
    ]
  },
  {
    id: 'WB-0078', channel: 'Website', date: '6 May 2026', salesperson: 'Sanskar',
    customer: { name: 'Vikram Nair', phone: '+91 99450 33221', address: '5, Whitefield, Bangalore 560066' },
    value: 62000, advance: 62000,
    notes: 'Full payment received online.',
    items: [
      {
        id: 'i5', productId: 'PRD-0011', name: 'Coffee table', qty: 1, price: 62000,
        wood: 'Mango wood', woodColour: 'Natural', fabricCode: null,
        hardware: [],
        remarks: 'Standard product — no customisation.',
        finishingSteps: ['Polish'],
        vendorId: 'v2', vendorCost: 28000,
        committedDate: '20 May 2026', actualDate: '19 May 2026',
        stageIndex: 5,
        finishingProgress: { Polish: 'done' },
        originalDelivery: '30 May 2026', currentDelivery: '30 May 2026',
        flags: []
      }
    ],
    payments: [
      { id: 'p5', date: '6 May 2026', amount: 62000, mode: 'UPI', ref: 'UTR: 987654321', by: 'Sanskar' },
    ]
  },
  {
    id: 'WS-0075', channel: 'Wholesale', date: '1 May 2026', salesperson: 'Mukesh',
    customer: { name: 'Anita Desai', phone: '+91 98000 11234', address: 'Home Centre Warehouse, Mumbai' },
    value: 850000, advance: 425000,
    notes: 'Home Centre B2B order — 20 units mixed.',
    items: [
      {
        id: 'i6', productId: 'PRD-0033', name: 'Dining chair × 20', qty: 20, price: 850000,
        wood: 'Sheesham', woodColour: 'Teak', fabricCode: 'SUP-BEG-110',
        hardware: [],
        remarks: 'Home Centre standard spec. Stacking chairs.',
        finishingSteps: ['Polish', 'Upholstery'],
        vendorId: 'v4', vendorCost: 520000,
        committedDate: '25 May 2026', actualDate: null,
        stageIndex: 6,
        finishingProgress: { Polish: 'done', Upholstery: 'done' },
        originalDelivery: '25 May 2026', currentDelivery: '28 May 2026',
        flags: []
      }
    ],
    payments: [
      { id: 'p6', date: '1 May 2026', amount: 425000, mode: 'Bank transfer', ref: 'Ref: AXIS0105XXX', by: 'Mukesh' },
    ]
  }
];

export const serviceJobs = [
  { id: 'sj1', date: '26 May', customer: 'Priya Sharma', orderRef: 'BL-0071', problem: 'Drawer not closing properly', assignedTo: 'Rajveer', appointment: '30 May 2026', status: 'Open', chargeable: null },
  { id: 'sj2', date: '24 May', customer: 'Arun Mehta', orderRef: 'BL-0065', problem: 'Termite spotted on bed base', assignedTo: 'Rajveer', appointment: '28 May 2026', status: 'In progress', chargeable: null },
  { id: 'sj3', date: '20 May', customer: 'Sunita Agarwal', orderRef: 'PU-0043', problem: 'Polish peeling on tabletop', assignedTo: 'Ramesh', appointment: '25 May 2026', status: 'In progress', chargeable: null },
  { id: 'sj4', date: '18 May', customer: 'Vikram Nair', orderRef: 'WB-0038', problem: 'Sofa leg wobbling', assignedTo: 'Kishore', appointment: '22 May 2026', status: 'Resolved', chargeable: 500 },
  { id: 'sj5', date: '15 May', customer: 'Deepa Iyer', orderRef: 'BL-0029', problem: 'Cabinet door hinge broken', assignedTo: 'Rajveer', appointment: '19 May 2026', status: 'Resolved', chargeable: null },
];

export const replacements = [
  {
    id: 'REP-0004', status: 'In progress',
    customer: 'Arun Mehta', originalOrderId: 'BL-0065', originalItem: 'King bed frame', originalDelivered: '10 Apr 2026',
    defect: 'Termite damage found on base', photos: 3,
    newOrderId: 'BL-0081', newStage: 'Processing started', expectedDelivery: '15 Jun 2026',
    oldItemStatus: 'Awaiting pickup from customer', collectionDate: '30 May 2026', assignedTo: 'Rajveer', loggedDate: '24 May 2026'
  },
  {
    id: 'REP-0002', status: 'Completed',
    customer: 'Sunita Agarwal', originalOrderId: 'PU-0031', originalItem: 'Dining chair set × 4', originalDelivered: '15 Mar 2026',
    defect: 'Chair joints cracking after 2 weeks', photos: 1,
    newOrderId: 'PU-0052', newStage: 'Delivered to customer', expectedDelivery: '28 Apr 2026',
    oldItemStatus: 'Returned to Jodhpur', collectionDate: '5 Apr 2026', assignedTo: 'Ramesh', loggedDate: '2 Apr 2026'
  },
];
