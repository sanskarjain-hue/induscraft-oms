// Core app constants. Sample/seed data (orders, vendors, serviceJobs, replacements) has been
// removed from this file — it was unused leftover from early development (App.jsx loads real
// data from the API) and risked being confused with live data.
export const CHANNELS = ['Bangalore', 'Pune', 'Jodhpur', 'Website', 'Wholesale'];

// The channels a user may work in. A sales user is limited to the stores on their account; everyone
// else gets all of them. (A login saved before stores existed has no list, so it shows everything
// until the next sign-in — the server enforces the real limit either way.)
export function channelsFor(user) {
  if (user && user.role === 'sales' && Array.isArray(user.stores)) return CHANNELS.filter(c => user.stores.includes(c));
  return CHANNELS;
}

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

// Items marked "In stock" already exist, so they skip vendor/production (stages 0-3)
// and start at QC.
export const IN_STOCK_START_STAGE = 4;

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
