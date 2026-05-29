import { useState } from "react";
import { formatCurrency } from "./ui";

const COST_FIELDS = [
  { key: "rawMaterial", label: "Raw material" },
  { key: "labour", label: "Labour charge" },
  { key: "polish", label: "Polish" },
  { key: "hardware", label: "Hardware" },
  { key: "fabric", label: "Fabric / Upholstery" },
  { key: "caneWork", label: "Cane work" },
  { key: "packing", label: "Packing" },
  { key: "shipping", label: "Shipping" },
  { key: "gst", label: "GST" },
  { key: "misc", label: "Miscellaneous" },
];

const MINIMUM_MARGIN = 30;

export default function CostApproval({ order, role, onUpdate }) {
  const costs = order.costs || {};
  const [editing, setEditing] = useState(false);
  const [localCosts, setLocalCosts] = useState(costs);

  const totalCost = COST_FIELDS.reduce((s, f) => s + (parseFloat(localCosts[f.key] || 0)), 0);
  const margin = order.value > 0 ? ((order.value - totalCost) / order.value) * 100 : 0;
  const belowMinimum = margin < MINIMUM_MARGIN;
  const costsEntered = totalCost > 0;

  function saveCosts() {
    const updated = { ...order, costs: localCosts, costApproved: false };
    onUpdate(updated);
    setEditing(false);
  }

  function approveCosts() {
    const updated = { ...order, costs: localCosts, costApproved: true };
    onUpdate(updated);
  }

  function overrideApprove() {
    const updated = { ...order, costs: localCosts, costApproved: true, marginOverride: true };
    onUpdate(updated);
  }

  if (role !== "admin") return null;

  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Order costs & margin approval</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>Minimum margin required: {MINIMUM_MARGIN}%</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {order.costApproved && (
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 7, background: "#EAF3DE", color: "#27500A", fontWeight: 500 }}>
              <i className="ti ti-check" style={{ fontSize: 12, marginRight: 4 }} />Approved
            </span>
          )}
          {order.marginOverride && (
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 7, background: "#FAEEDA", color: "#633806", fontWeight: 500 }}>
              Margin override
            </span>
          )}
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: "inherit" }}>
              {costsEntered ? "Edit costs" : "Enter costs"}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {editing ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {COST_FIELDS.map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{f.label} (₹)</div>
                  <input
                    type="number"
                    min="0"
                    value={localCosts[f.key] || ""}
                    onChange={e => setLocalCosts(c => ({ ...c, [f.key]: e.target.value }))}
                    placeholder="0"
                    style={{ width: "100%", fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}
                  />
                </div>
              ))}
            </div>

            {/* Live margin preview */}
            <div style={{ padding: "10px 14px", borderRadius: 10, background: belowMinimum ? "#FCEBEB" : "#EAF3DE", border: `0.5px solid ${belowMinimum ? "#F09595" : "#97C459"}`, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Total cost</span>
                <span style={{ fontWeight: 500 }}>{formatCurrency(totalCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Selling price</span>
                <span style={{ fontWeight: 500 }}>{formatCurrency(order.value)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600, marginTop: 8, paddingTop: 8, borderTop: "0.5px solid rgba(0,0,0,0.1)" }}>
                <span>Margin</span>
                <span style={{ color: belowMinimum ? "#791F1F" : "#27500A" }}>{margin.toFixed(1)}%</span>
              </div>
              {belowMinimum && (
                <div style={{ fontSize: 12, color: "#791F1F", marginTop: 6 }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 13, marginRight: 4 }} />
                  Below minimum {MINIMUM_MARGIN}% — Yash must override to approve
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditing(false)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveCosts} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: "#0C447C", color: "white", cursor: "pointer", fontFamily: "inherit" }}>Save costs</button>
              {!belowMinimum && (
                <button onClick={() => { saveCosts(); approveCosts(); }} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: "#27500A", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
                  Save & approve
                </button>
              )}
              {belowMinimum && (
                <button onClick={() => { saveCosts(); overrideApprove(); }} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
                  Override & approve
                </button>
              )}
            </div>
          </>
        ) : costsEntered ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
              {COST_FIELDS.filter(f => parseFloat(costs[f.key] || 0) > 0).map(f => (
                <div key={f.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>{f.label}</span>
                  <span style={{ fontWeight: 500 }}>{formatCurrency(parseFloat(costs[f.key] || 0))}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 10, background: margin < MINIMUM_MARGIN ? "#FCEBEB" : "#EAF3DE", border: `0.5px solid ${margin < MINIMUM_MARGIN ? "#F09595" : "#97C459"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>Total cost</span><span style={{ fontWeight: 500 }}>{formatCurrency(totalCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600, marginTop: 6 }}>
                <span>Margin</span>
                <span style={{ color: margin < MINIMUM_MARGIN ? "#791F1F" : "#27500A" }}>{margin.toFixed(1)}%</span>
              </div>
            </div>
            {!order.costApproved && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {margin >= MINIMUM_MARGIN ? (
                  <button onClick={approveCosts} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: "#27500A", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
                    Approve order
                  </button>
                ) : (
                  <button onClick={overrideApprove} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
                    Override & approve (below 30%)
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "8px 0" }}>
            No costs entered yet. Click "Enter costs" to add cost breakdown for this order.
          </div>
        )}
      </div>
    </div>
  );
}
