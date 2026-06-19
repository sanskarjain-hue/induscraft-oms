// Core app constants. Sample/seed data (orders, vendors, serviceJobs, replacements) has been
// removed from this file — it was unused leftover from early development (App.jsx loads real
// data from the API) and risked being confused with live data.
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

// Role labels only — do NOT hardcode person names here. Real names/initials come from the
// User records via the API (see api.js fetchUsers / App.jsx currentUser). A previous version
// of this file hardcoded names like 'Kishore' here, which silently drifted out of sync with
// the database (e.g. "Sanskar" vs "Sanskar Jain") and caused filtering bugs.
export const ROLES = {
  admin: { label: 'Admin' },
  sales: { label: 'Sales' },
  qc: { label: 'QC' },
  accountant: { label: 'Accountant' },
};
