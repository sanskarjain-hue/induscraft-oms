import { useState } from "react";
import { STAGES } from "./data";

const CHANNEL_HEADERS = {
  Bangalore: "INDUSCRAFT — BANGALORE",
  Pune: "INDUSCRAFT — PUNE",
  Jodhpur: "INDUSCRAFT — JODHPUR",
  Website: "INDUSCRAFT",
  Wholesale: "INDUSCRAFT",
};

const DEFAULT_CHECKLISTS = {
  bed: [
    "Joints are tight — no wobble",
    "Headboard surface: no scratches or dents",
    "Polish is even — no patchy areas",
    "Slat gaps are uniform",
    "All hardware is secure",
    "Dimensions match order specs",
    "No termite marks or wood damage",
    "Legs are level",
    "Packaging area: no damage risk",
  ],
  sofa: [
    "Frame is sturdy — no creaks",
    "Upholstery is aligned and even",
    "No loose threads or fraying",
    "Polish is even on all exposed wood",
    "Cushion zips are working",
    "Legs are level and secure",
    "Armrests are at correct height",
    "Fabric matches order code",
    "No stains or marks on fabric",
    "Packaging area: no damage risk",
  ],
  "dining table": [
    "Surface is level — no warping",
    "No scratches on tabletop",
    "Polish is even on all surfaces",
    "All joints are tight",
    "Hardware is secure",
    "Dimensions match order specs",
    "Legs are level",
    "Packaging area: no damage risk",
  ],
  chair: [
    "Frame is sturdy — no wobble",
    "Upholstery aligned and even",
    "No loose threads",
    "Polish even on exposed wood",
    "Legs are level",
    "Seat height matches order",
    "Packaging area: no damage risk",
  ],
  cabinet: [
    "Doors are aligned — open/close smoothly",
    "Hinges are working correctly",
    "Locks are functioning",
    "Interior finish is clean",
    "Dimensions match order specs",
    "No scratches on exterior",
    "Polish is even",
    "Hardware is secure",
    "Packaging area: no damage risk",
  ],
  bookshelf: [
    "Shelves are level",
    "No warping on any shelf",
    "Polish is even",
    "All joints are tight",
    "Dimensions match order specs",
    "Wall brackets included if applicable",
    "Packaging area: no damage risk",
  ],
  default: [
    "No scratches or surface damage",
    "Polish is even on all surfaces",
    "All joints are tight",
    "Hardware is secure and functional",
    "Dimensions match order specs",
    "Finish matches order specifications",
    "Packaging area: no damage risk",
    "Item matches customer order details",
  ],
};

function getChecklist(itemName) {
  const name = itemName.toLowerCase();
  if (name.includes("bed")) return DEFAULT_CHECKLISTS.bed;
  if (name.includes("sofa") || name.includes("couch")) return DEFAULT_CHECKLISTS.sofa;
  if (name.includes("dining") || name.includes("table")) return DEFAULT_CHECKLISTS["dining table"];
  if (name.includes("chair")) return DEFAULT_CHECKLISTS.chair;
  if (name.includes("cabinet") || name.includes("almirah") || name.includes("wardrobe")) return DEFAULT_CHECKLISTS.cabinet;
  if (name.includes("bookshelf") || name.includes("shelf")) return DEFAULT_CHECKLISTS.bookshelf;
  return DEFAULT_CHECKLISTS.default;
}

const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: fixed; left: 0; top: 0; width: 100%; }
    .no-print { display: none !important; }
  }
  .print-area {
    font-family: Arial, sans-serif;
    color: #1a1a1a;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  .page-break { page-break-after: always; }
  .slip-header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 14px; }
  .slip-title { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
  .slip-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .slip-table td { padding: 6px 8px; border: 0.5px solid #ccc; font-size: 13px; }
  .slip-table td:first-child { font-weight: 600; width: 140px; background: #f9f9f9; }
  .slip-img { width: 100%; max-height: 200px; object-fit: contain; border: 0.5px solid #ccc; margin-bottom: 8px; }
  .slip-img-row { display: flex; gap: 8px; margin-bottom: 12px; }
  .slip-img-row img { flex: 1; max-height: 160px; object-fit: contain; border: 0.5px solid #ccc; }
  .checklist-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .checklist-box { width: 14px; height: 14px; border: 1px solid #333; flex-shrink: 0; margin-top: 1px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #1a1a1a; color: white; padding: 4px 8px; margin: 10px 0 6px; }
  .finishing-tag { display: inline-block; border: 0.5px solid #333; padding: 2px 8px; margin: 2px; font-size: 11px; border-radius: 3px; }
`;

// ── PACKING SLIP ──────────────────────────────────────────
function PackingSlips({ order }) {
  const header = CHANNEL_HEADERS[order.channel] || "INDUSCRAFT";
  const slips = [];

  order.items.forEach(item => {
    const count = item.packetCount || 1;
    for (let p = 1; p <= count; p++) {
      slips.push({ item, packetNum: p, totalPackets: count });
    }
  });

  if (slips.length === 0) {
    order.items.forEach(item => {
      slips.push({ item, packetNum: 1, totalPackets: 1 });
    });
  }

  return (
    <div>
      {slips.map(({ item, packetNum, totalPackets }, idx) => {
        const firstImg = item.images && item.images.length > 0 && item.images[0].data ? item.images[0] : null;
        return (
          <div key={idx} className={idx < slips.length - 1 ? "page-break" : ""} style={{ marginBottom: 40 }}>
            <div className="slip-header">
              <div className="slip-title">{header}</div>
              <div style={{ fontSize: 11, color: "#555" }}>Packing Slip</div>
            </div>
            <table className="slip-table">
              <tbody>
                <tr><td>Customer Name</td><td>{order.customer.name}</td></tr>
                <tr><td>Total Pkt</td><td>{totalPackets} &nbsp;&nbsp;&nbsp; <strong>Pkt Serial No</strong> &nbsp;&nbsp; {packetNum}/{totalPackets}</td></tr>
                <tr><td>Delivery Address</td><td>{order.customer.address}</td></tr>
                <tr><td>Item</td><td style={{ fontWeight: 700, fontSize: 15 }}>{item.name.toUpperCase()}</td></tr>
                <tr><td>Order No</td><td>{order.id}</td></tr>
                <tr><td>SKU</td><td>{item.productId}</td></tr>
                {item.wood && <tr><td>Wood</td><td>{item.wood} — {item.woodColour}</td></tr>}
                {item.qty > 1 && <tr><td>Qty</td><td>{item.qty}</td></tr>}
              </tbody>
            </table>
            {firstImg && (
              <div style={{ textAlign: "center" }}>
                <img src={firstImg.data} alt={item.name} className="slip-img" />
                <div style={{ fontSize: 10, color: "#888" }}>Picture</div>
              </div>
            )}
            {!firstImg && (
              <div style={{ border: "0.5px solid #ccc", height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 12, marginBottom: 8 }}>
                No product photo uploaded
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── VENDOR PRINT ──────────────────────────────────────────
function VendorPrint({ order, vendors }) {
  const header = CHANNEL_HEADERS[order.channel] || "INDUSCRAFT";

  return (
    <div>
      {order.items.map((item, idx) => {
        const vendor = vendors.find(v => v.id === item.vendorId);
        const images = item.images || [];
        const measurePhotos = item.measurementPhotos || [];
        const hardware = item.hardware || [];

        return (
          <div key={idx} className={idx < order.items.length - 1 ? "page-break" : ""} style={{ marginBottom: 40 }}>
            <div className="slip-header">
              <div className="slip-title">{header}</div>
              <div style={{ fontSize: 11, color: "#555" }}>Vendor Purchase Order</div>
            </div>

            <div className="section-title">Order Details</div>
            <table className="slip-table">
              <tbody>
                <tr><td>Order No</td><td>{order.id}</td></tr>
                <tr><td>Order Date</td><td>{order.date}</td></tr>
                <tr><td>Salesperson</td><td>{order.salesperson}</td></tr>
              </tbody>
            </table>

            <div className="section-title">Vendor Details</div>
            <table className="slip-table">
              <tbody>
                <tr><td>Vendor Name</td><td>{vendor?.name || "—"}</td></tr>
                <tr><td>Phone</td><td>{vendor?.phone || "—"}</td></tr>
                <tr><td>Location</td><td>{vendor?.location || "—"}</td></tr>
                <tr><td>Committed Date</td><td style={{ fontWeight: 700, color: "#C0392B" }}>{item.committedDate || "—"}</td></tr>
              </tbody>
            </table>

            <div className="section-title">Item Specifications</div>
            <table className="slip-table">
              <tbody>
                <tr><td>Item Name</td><td style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</td></tr>
                <tr><td>SKU</td><td>{item.productId}</td></tr>
                <tr><td>Quantity</td><td>{item.qty}</td></tr>
                <tr><td>Wood</td><td>{item.wood || "—"}</td></tr>
                <tr><td>Wood Colour</td><td>{item.woodColour || "—"}</td></tr>
                {item.fabricCode && <tr><td>Fabric Code</td><td>{item.fabricCode}</td></tr>}
                {item.remarks && <tr><td>Remarks</td><td>{item.remarks}</td></tr>}
              </tbody>
            </table>

            {images.length > 0 && (
              <>
                <div className="section-title">Product Photos</div>
                <div className="slip-img-row">
                  {images.slice(0, 3).map((img, i) => {
                    const src = img.url || img.data;
                    return src ? <img key={i} src={src} alt={`Product ${i + 1}`} /> : null;
                  })}
                </div>
              </>
            )}

            {measurePhotos.length > 0 && (
              <>
                <div className="section-title">Measurement Drawing</div>
                <div className="slip-img-row">
                  {measurePhotos.slice(0, 2).map((img, i) => {
                    const src = img.url || img.data;
                    return src ? <img key={i} src={src} alt={`Measurement ${i + 1}`} /> : null;
                  })}
                </div>
              </>
            )}

            {hardware.length > 0 && (
              <>
                <div className="section-title">Hardware References</div>
                <div style={{ fontSize: 12, padding: "6px 8px" }}>{hardware.join(", ")}</div>
              </>
            )}

            <div style={{ marginTop: 30, borderTop: "1px solid #ccc", paddingTop: 10, fontSize: 11, color: "#555" }}>
              Prepared by Induscraft &nbsp;|&nbsp; {new Date().toLocaleDateString("en-GB")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── QC PRINT ─────────────────────────────────────────────
function QCPrint({ order, vendors }) {
  const [checklists, setChecklists] = useState(
    Object.fromEntries(order.items.map(item => [item.id, getChecklist(item.name)]))
  );

  const header = CHANNEL_HEADERS[order.channel] || "INDUSCRAFT";
  const maxDelivery = order.items.reduce((a, i) => i.currentDelivery > a ? i.currentDelivery : a, "");

  return (
    <div>
      {order.items.map((item, idx) => {
        const vendor = vendors.find(v => v.id === item.vendorId);
        const images = item.images || [];
        const measurePhotos = item.measurementPhotos || [];
        const itemChecklist = checklists[item.id] || [];

        return (
          <div key={idx} className={idx < order.items.length - 1 ? "page-break" : ""} style={{ marginBottom: 40 }}>
            <div className="slip-header">
              <div className="slip-title">{header}</div>
              <div style={{ fontSize: 11, color: "#555" }}>QC Inspection Sheet</div>
            </div>

            <div className="section-title">Order & Customer</div>
            <table className="slip-table">
              <tbody>
                <tr><td>Order No</td><td>{order.id}</td></tr>
                <tr><td>Customer</td><td>{order.customer.name}</td></tr>
                <tr><td>Dispatch Deadline</td><td style={{ fontWeight: 700, color: "#C0392B" }}>{maxDelivery || "—"}</td></tr>
                <tr><td>Salesperson</td><td>{order.salesperson}</td></tr>
              </tbody>
            </table>

            <div className="section-title">Vendor Details</div>
            <table className="slip-table">
              <tbody>
                <tr><td>Vendor</td><td>{vendor?.name || "—"}</td></tr>
                <tr><td>Phone</td><td>{vendor?.phone || "—"}</td></tr>
                <tr><td>Committed Date</td><td style={{ fontWeight: 700 }}>{item.committedDate || "—"}</td></tr>
              </tbody>
            </table>

            <div className="section-title">Item Details</div>
            <table className="slip-table">
              <tbody>
                <tr><td>Item Name</td><td style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</td></tr>
                <tr><td>SKU</td><td>{item.productId}</td></tr>
                <tr><td>Qty</td><td>{item.qty}</td></tr>
                <tr><td>Wood</td><td>{item.wood} — {item.woodColour}</td></tr>
                {item.fabricCode && <tr><td>Fabric Code</td><td>{item.fabricCode}</td></tr>}
                {item.remarks && <tr><td>Remarks</td><td>{item.remarks}</td></tr>}
              </tbody>
            </table>

            {images.length > 0 && (
              <>
                <div className="section-title">Product Photos</div>
                <div className="slip-img-row">
                  {images.slice(0, 3).map((img, i) => (
                    img.data ? <img key={i} src={img.data} alt={`Product ${i + 1}`} /> : null
                  ))}
                </div>
              </>
            )}

            {measurePhotos.length > 0 && (
              <>
                <div className="section-title">Measurement Drawing</div>
                <div className="slip-img-row">
                  {measurePhotos.slice(0, 2).map((img, i) => (
                    img.data ? <img key={i} src={img.data} alt={`Measurement ${i + 1}`} /> : null
                  ))}
                </div>
              </>
            )}

            <div className="section-title">Finishing Requirements</div>
            <div style={{ padding: "6px 8px" }}>
              {item.finishingSteps && item.finishingSteps.map(step => (
                <span key={step} className="finishing-tag">{step}</span>
              ))}
            </div>

            <div className="section-title">QC Checklist</div>
            <div style={{ padding: "6px 8px" }}>
              {itemChecklist.map((check, i) => (
                <div key={i} className="checklist-item">
                  <div className="checklist-box" />
                  <span>{check}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: "8px", border: "0.5px solid #ccc", fontSize: 12 }}>
              <strong>QC Result:</strong> &nbsp;&nbsp;&nbsp;
              ☐ PASSED &nbsp;&nbsp;&nbsp;&nbsp; ☐ FAILED
              <br /><br />
              <strong>Checked by:</strong> _________________________ &nbsp;&nbsp;
              <strong>Date:</strong> _________________
              <br /><br />
              <strong>Comments:</strong><br />
              <div style={{ borderBottom: "0.5px solid #ccc", marginTop: 20 }} />
              <div style={{ borderBottom: "0.5px solid #ccc", marginTop: 16 }} />
            </div>

            <div style={{ marginTop: 20, borderTop: "1px solid #ccc", paddingTop: 10, fontSize: 11, color: "#555" }}>
              Induscraft QC Sheet &nbsp;|&nbsp; {new Date().toLocaleDateString("en-GB")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN PRINT VIEW ───────────────────────────────────────
export default function PrintView({ order, vendors, onClose }) {
  const [printType, setPrintType] = useState("packing");

  function handlePrint() {
    window.print();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", flexDirection: "column" }}>
      <style>{PRINT_STYLE}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: "#1a1a1a", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "white", marginRight: 8 }}>Print</div>
        {[
          { id: "packing", label: "Packing Slip" },
          { id: "vendor", label: "Vendor Print" },
          { id: "qc", label: "QC Sheet" },
        ].map(t => (
          <button key={t.id} onClick={() => setPrintType(t.id)} style={{
            fontSize: 12, padding: "6px 14px", borderRadius: 7, cursor: "pointer",
            border: "none", fontFamily: "inherit",
            background: printType === t.id ? "#C0392B" : "#333",
            color: "white", fontWeight: printType === t.id ? 600 : 400,
          }}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handlePrint} style={{ fontSize: 13, padding: "7px 18px", borderRadius: 8, border: "none", background: "#27500A", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-printer" style={{ fontSize: 15 }} /> Print
        </button>
        <button onClick={onClose} style={{ fontSize: 13, padding: "7px 14px", borderRadius: 8, border: "0.5px solid #555", background: "transparent", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
          Close
        </button>
      </div>

      {/* Preview area */}
      <div style={{ flex: 1, overflowY: "auto", background: "#e0e0e0", padding: 24 }}>
        <div className="print-area" style={{ background: "white", borderRadius: 8, padding: 32, maxWidth: 800, margin: "0 auto", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {printType === "packing" && <PackingSlips order={order} />}
          {printType === "vendor" && <VendorPrint order={order} vendors={vendors} />}
          {printType === "qc" && <QCPrint order={order} vendors={vendors} />}
        </div>
      </div>
    </div>
  );
}
