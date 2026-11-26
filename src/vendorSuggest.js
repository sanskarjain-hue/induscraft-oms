// Suggests a vendor and cost for an item, based on past orders that contained the same product.
//
// "Same product" means, in order of strength:
//   - same website product handle AND same item name (title + variant)  -> exact
//   - same item name (case/space-insensitive)                           -> exact
//   - same website product handle only (a different variant)            -> similar
// Older orders have no handle (it was never saved), so they can only match on name.
//
// Cost is stored per line (unit x qty), so the past cost is converted to a unit cost and
// re-multiplied by the current item's qty.

const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const idOf = v => (v ? String(v.id || v._id || "") : "");

function dateValue(order) {
  const t = Date.parse(order.date || order.createdAt || "");
  return Number.isNaN(t) ? 0 : t;
}

export function suggestVendorForItem(item, currentOrderId, orders, vendors) {
  if (!item || !Array.isArray(orders)) return null;
  const name = norm(item.name);
  const handle = item.shopifyHandle || "";
  if (!name && !handle) return null;

  let best = null;
  for (const o of orders) {
    if (!o || o.id === currentOrderId) continue;
    for (const it of o.items || []) {
      if (!it || !it.vendorId) continue;
      const nameEq = !!name && norm(it.name) === name;
      const handleEq = !!handle && !!it.shopifyHandle && it.shopifyHandle === handle;
      const score = (nameEq ? 2 : 0) + (handleEq ? 1 : 0);
      if (score === 0) continue;
      const vendor = (vendors || []).find(v => idOf(v) === String(it.vendorId));
      if (!vendor) continue; // vendor was deleted or not loaded: nothing useful to suggest
      const when = dateValue(o);
      if (!best || score > best.score || (score === best.score && when > best.when)) {
        best = { score, when, order: o, past: it, vendor };
      }
    }
  }
  if (!best) return null;

  const pastQty = Number(best.past.qty) || 1;
  const pastCost = Number(best.past.vendorCost) || 0;
  const qty = Number(item.qty) || 1;
  return {
    vendor: best.vendor,
    vendorId: idOf(best.vendor),
    cost: pastCost > 0 ? Math.round((pastCost / pastQty) * qty) : null,
    fromOrderId: best.order.id,
    fromDate: best.order.date || "",
    similar: best.score === 1, // matched on website product only, not the exact variant
  };
}
