import { useState, useRef, useEffect, useCallback } from "react";
import { CHANNELS, STAGES } from "./data";
import { fetchNextOrderId } from "./api";
import { formatCurrency } from "./ui";

const CHANNEL_PREFIXES = {
  Bangalore: "BL", Pune: "PU", Jodhpur: "JD", Website: "WB", Wholesale: "WS"
};

const FINISHING_OPTIONS = ["Polish", "Upholstery", "Cane work", "Glass work", "Brass work", "Other"];

const POLISH_OPTIONS = ["Natural", "Honey", "Dark Teak", "Rosewood", "Espresso Brown"];

const DRAFT_KEY = "induscraft_order_draft";

const INPUT = {
  width: "100%", fontSize: 13, padding: "8px 10px",
  borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-secondary)",
  color: "var(--color-text-primary)", fontFamily: "inherit", outline: "none",
};

const LABEL = {
  fontSize: 11, color: "var(--color-text-secondary)",
  display: "block", marginBottom: 5, fontWeight: 500,
};

function Field({ label, children, style = {} }) {
  return (
    <div style={{ ...style }}>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function emptyItem() {
  return {
    _id: Date.now() + Math.random(),
    productId: "",
    shopifyHandle: "",
    name: "",
    qty: 1,
    price: "",
    wood: "",
    woodColour: "",
    fabricCode: "",
    hardware: [],
    images: [],
    measurementPhotos: [],
    remarks: "",
    finishingSteps: ["Polish"],
    vendorId: "",
    vendorCost: "",
    committedDate: "",
    actualDate: null,
    stageIndex: 0,
    finishingProgress: {},
    originalDelivery: "",
    currentDelivery: "",
    packetCount: 0,
    flags: [],
  };
}

function FileUploadArea({ label, accept, multiple = false, files, onAdd, hint }) {
  const ref = useRef();

  function readFiles(fileList) {
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileObj = { name: file.name, type: file.type, data: e.target.result };
        onAdd(multiple ? [...files, fileObj] : [fileObj]);
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFiles(e) {
    readFiles(e.target.files);
    e.target.value = "";
  }

  const isImage = (f) => f.type && f.type.startsWith("image/");

  return (
    <div>
      <div style={LABEL}>{label}</div>
      <div
        onClick={() => ref.current.click()}
        style={{
          border: "0.5px dashed var(--color-border-secondary)",
          borderRadius: 10, padding: "18px 16px", textAlign: "center",
          cursor: "pointer", background: "var(--color-background-secondary)",
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); readFiles(e.dataTransfer.files); }}
      >
        <i className="ti ti-upload" style={{ fontSize: 22, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }} />
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Click or drag to upload</div>
        {hint && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{hint}</div>}
      </div>
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: "none" }} onChange={handleFiles} />
      {files.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative" }}>
              {isImage(f) ? (
                <img src={f.data} alt={f.name}
                  style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", display: "block" }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <i className="ti ti-file" style={{ fontSize: 20, color: "var(--color-text-secondary)" }} />
                  <div style={{ fontSize: 8, color: "var(--color-text-secondary)", textAlign: "center", padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 60 }}>{f.name}</div>
                </div>
              )}
              <button onClick={() => onAdd(files.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#C0392B", border: "none", cursor: "pointer", color: "white", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SHOPIFY PRODUCT LOADER ────────────────────────────────
function ShopifyLoader({ idx, item, updateItem, fetchShopifyProduct }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setProduct(null);
    setSelectedVariantId(null);
    const result = await fetchShopifyProduct(idx, url.trim());
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setProduct(result);
    // If only one variant, auto-select it
    if (result.product.variants.length === 1) {
      applyVariant(result, result.product.variants[0].id, result);
    }
  }

  function applyVariant(result, variantId, baseResult) {
    const r = result || baseResult;
    const variant = r.product.variants.find(v => v.id === variantId);
    if (!variant) return;
    setSelectedVariantId(variantId);

    // Build name from product title + variant title (skip "Default Title")
    const variantLabel = variant.title !== "Default Title" ? ` — ${variant.title}` : "";
    const fullName = `${r.product.title}${variantLabel}`;

    // Extract wood colour from option1 (usually Color/Finish)
    const colourVal = variant.option1 || "";
    const knownFinishes = ["Honey", "Dark", "Rosewood", "Espresso", "Natural"];
    const woodColour = knownFinishes.find(f => colourVal.toLowerCase().includes(f.toLowerCase())) || colourVal;

    updateItem(idx, "name", fullName);
    updateItem(idx, "wood", r.wood);
    updateItem(idx, "woodColour", woodColour);
    updateItem(idx, "price", parseFloat(variant.price));
    updateItem(idx, "shopifyHandle", r.handle);
    updateItem(idx, "images", r.images);
    setOpen(false);
    setUrl("");
    setProduct(null);
    setSelectedVariantId(null);
  }

  // Group options for display
  const options = product ? product.product.options : [];
  const variants = product ? product.product.variants : [];

  return (
    <div style={{ marginBottom: 10 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          fontSize: 12, padding: "5px 12px", borderRadius: 7,
          border: "0.5px solid #C0392B", background: "#FCEBEB",
          color: "#C0392B", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <i className="ti ti-world" style={{ fontSize: 13 }} /> Load from website
        </button>
      ) : (
        <div style={{ border: "0.5px solid #e5e5e0", borderRadius: 10, padding: 14, background: "#fafaf8" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a", marginBottom: 8 }}>
            Load product from Induscraft website
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://induscraft.com/products/product-name"
              style={{ flex: 1, fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "0.5px solid #cccccc", background: "white", color: "#1a1a1a", fontFamily: "inherit" }}
              onKeyDown={e => e.key === "Enter" && handleFetch()}
            />
            <button onClick={handleFetch} disabled={loading} style={{
              fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none",
              background: loading ? "#999" : "#C0392B", color: "white",
              cursor: loading ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>
              {loading ? "Loading..." : "Fetch"}
            </button>
            <button onClick={() => { setOpen(false); setUrl(""); setError(""); setProduct(null); }} style={{
              fontSize: 12, padding: "7px 12px", borderRadius: 8,
              border: "0.5px solid #cccccc", background: "transparent",
              color: "#666660", cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
          </div>

          {error && <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 8 }}>{error}</div>}

          {product && (
            <div>
              {/* Product preview */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12, padding: 10, background: "white", borderRadius: 8, border: "0.5px solid #e5e5e0" }}>
                {product.images[0] && (
                  <img src={product.images[0].url} alt={product.product.title}
                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 3 }}>{product.product.title}</div>
                  <div style={{ fontSize: 11, color: "#666660" }}>{product.product.product_type} · {product.wood}</div>
                  <div style={{ fontSize: 11, color: "#666660" }}>{variants.length} variant{variants.length !== 1 ? "s" : ""}</div>
                </div>
              </div>

              {/* Variant selection — only if multiple variants */}
              {variants.length > 1 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "#666660", marginBottom: 6, fontWeight: 500 }}>Select variant</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                    {variants.map(v => (
                      <button key={v.id} onClick={() => applyVariant(product, v.id)}
                        style={{
                          textAlign: "left", fontSize: 12, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                          border: `0.5px solid ${selectedVariantId === v.id ? "#C0392B" : "#e5e5e0"}`,
                          background: selectedVariantId === v.id ? "#FCEBEB" : "white",
                          color: selectedVariantId === v.id ? "#C0392B" : "#1a1a1a",
                          fontFamily: "inherit", display: "flex", justifyContent: "space-between",
                        }}>
                        <span>{v.title}</span>
                        <span style={{ fontWeight: 600 }}>₹{parseFloat(v.price).toLocaleString("en-IN")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewOrderForm({ vendors = [], onSave, onCancel, currentUser, existingOrders }) {
  const [step, setStep] = useState(1);

  // Step 1 — Channel & basics
  const [channel, setChannel] = useState("");
  const [customOrderId, setCustomOrderId] = useState("");
  const [salesperson, setSalesperson] = useState(currentUser?.name || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // stored as YYYY-MM-DD, displayed as-is

  // Step 2 — Customer
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");

  // Step 4 — Line items
  const [items, setItems] = useState([emptyItem()]);

  // Step 5 — Notes & delivery
  const [notes, setNotes] = useState("");
  const [originalDelivery, setOriginalDelivery] = useState("");

  const [errors, setErrors] = useState({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setHasDraft(true);
    } catch {}
  }, []);

  // Auto-save draft whenever any field changes
  const saveDraft = useCallback(() => {
    try {
      const draft = { step, channel, customOrderId, salesperson, date, custName, custPhone, custAddress, items, notes, originalDelivery };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [step, channel, customOrderId, salesperson, date, custName, custPhone, custAddress, items, notes, originalDelivery]);

  useEffect(() => {
    // Only auto-save if the form has been started (channel selected)
    if (channel) saveDraft();
  }, [channel, customOrderId, salesperson, date, custName, custPhone, custAddress, items, notes, originalDelivery]);

  function restoreDraft() {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const d = JSON.parse(saved);
      if (d.step) setStep(d.step);
      if (d.channel) setChannel(d.channel);
      if (d.customOrderId) setCustomOrderId(d.customOrderId);
      if (d.salesperson) setSalesperson(d.salesperson);
      if (d.date) setDate(d.date);
      if (d.custName) setCustName(d.custName);
      if (d.custPhone) setCustPhone(d.custPhone);
      if (d.custAddress) setCustAddress(d.custAddress);
      if (d.items) setItems(d.items);
      if (d.notes) setNotes(d.notes);
      if (d.originalDelivery) setOriginalDelivery(d.originalDelivery);
      setHasDraft(false);
      setDraftRestored(true);
    } catch {}
  }

  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setHasDraft(false);
  }

  function clearDraftOnSave() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  const STEPS = ["Channel & basics", "Customer", "Line items", "Delivery & notes"];
  const TOTAL_STEPS = 4;

  async function handleChannelChange(c) {
    setChannel(c);
    try {
      const { id } = await fetchNextOrderId(c);
      setCustomOrderId(id);
    } catch {
      // fallback: generate locally if API fails
      const prefix = CHANNEL_PREFIXES[c] || "XX";
      const existing = (existingOrders || [])
        .filter(o => o.id.startsWith(prefix))
        .map(o => parseInt(o.id.replace(prefix + "-", "")) || 0)
        .filter(n => !isNaN(n));
      const max = existing.length > 0 ? Math.max(...existing) : 0;
      setCustomOrderId(`${prefix}-${String(max + 1).padStart(4, "0")}`);
    }
  }

  function validateStep(s) {
    const e = {};
    if (s === 1) {
      if (!channel) e.channel = "Select a channel";
      if (!salesperson.trim()) e.salesperson = "Enter salesperson name";
    }
    if (s === 2) {
      if (!custName.trim()) e.custName = "Customer name required";
      if (!custPhone.trim()) e.custPhone = "Phone number required";
      // address is optional — can be added later from order detail
    }
    if (s === 3) {
      items.forEach((item, idx) => {
        if (!item.name.trim()) e[`item_${idx}_name`] = "Item name required";
        if (!item.price || isNaN(item.price)) e[`item_${idx}_price`] = "Valid price required";
        if (!item.wood.trim()) e[`item_${idx}_wood`] = "Wood type required";
      });
    }
    if (s === 4) {
      if (!originalDelivery) e.originalDelivery = "Delivery date required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (validateStep(step)) setStep(s => s + 1);
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "finishingSteps") {
        const fp = {};
        value.forEach(s => { fp[s] = "pending"; });
        updated.finishingProgress = fp;
      }
      return updated;
    }));
  }

  function toggleFinishing(idx, stepName) {
    const item = items[idx];
    if (stepName === "Polish") return;
    const has = item.finishingSteps.includes(stepName);
    const newSteps = has
      ? item.finishingSteps.filter(s => s !== stepName)
      : [...item.finishingSteps, stepName];
    updateItem(idx, "finishingSteps", newSteps);
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()]);
  }

  function removeItem(idx) {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function fetchShopifyProduct(idx, rawUrl) {
    try {
      // Extract handle from URL
      const match = rawUrl.match(/products\/([^/?#]+)/);
      if (!match) return { error: "Invalid Shopify product URL" };
      const handle = match[1];
      const res = await fetch(`https://induscraft.com/products/${handle}.json`);
      if (!res.ok) return { error: "Product not found" };
      const { product } = await res.json();

      // Extract wood from title or body
      const titleLower = product.title.toLowerCase();
      const wood = titleLower.includes("sheesham") ? "Sheesham" :
                   titleLower.includes("mango") ? "Mango wood" :
                   titleLower.includes("acacia") ? "Acacia" : "Sheesham";

      // Images (first 3)
      const images = (product.images || []).slice(0, 3).map(img => ({
        url: img.src, name: img.alt || product.title, type: "image/webp"
      }));

      return { product, wood, images, handle };
    } catch (err) {
      return { error: "Could not fetch product. Check the URL." };
    }
  }

  function handleSave() {
    if (!validateStep(5)) return;
    const orderId = customOrderId;
    const totalValue = items.reduce((s, i) => s + (parseFloat(i.price) * parseInt(i.qty || 1)), 0);
    const newOrder = {
      id: orderId,
      channel,
      date,
      salesperson,
      customer: { name: custName, phone: custPhone, address: custAddress },
      value: totalValue,
      advance: 0,
      notes,
      dispatchDetails: null,
      items: items.map((item, idx) => ({
        id: `i_${orderId}_${idx}`,
        productId: item.productId || `PRD-NEW-${idx + 1}`,
        name: item.name,
        qty: parseInt(item.qty) || 1,
        price: parseFloat(item.price) * (parseInt(item.qty) || 1),
        wood: item.wood,
        woodColour: item.woodColour,
        fabricCode: item.fabricCode || null,
        hardware: item.hardware,
        images: item.images || [],
        measurementPhotos: item.measurementPhotos || [],
        remarks: item.remarks,
        finishingSteps: item.finishingSteps,
        vendorId: null,
        vendorCost: 0,
        committedDate: null,
        actualDate: null,
        stageIndex: 0,
        finishingProgress: Object.fromEntries(item.finishingSteps.map(s => [s, "pending"])),
        originalDelivery,
        currentDelivery: originalDelivery,
        packetCount: 0,
        flags: [],
        qcNotes: "",
        qcStatus: null,
      })),
      payments: [],
    };
    onSave(newOrder);
  }

  const totalValue = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1), 0);

  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: "rgba(0,0,0,0.75)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        borderRadius: 16, width: "100%", maxWidth: 700,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        position: "relative", zIndex: 1001,
      }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "0.5px solid #e5e5e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>New order</div>
            <div style={{ fontSize: 12, color: "#666660", marginTop: 2 }}>Step {step} of {TOTAL_STEPS} — {STEPS[step - 1]}</div>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#666660", fontSize: 20 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Draft restore banner */}
        {hasDraft && !draftRestored && (
          <div style={{ padding: "10px 24px", background: "#FAEEDA", borderBottom: "0.5px solid #EF9F27", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 12, color: "#633806" }}>
              <i className="ti ti-clock" style={{ fontSize: 13, marginRight: 5 }} />
              You have an unsaved draft from a previous session
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={discardDraft} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid #BA7517", background: "transparent", color: "#633806", cursor: "pointer", fontFamily: "inherit" }}>Discard</button>
              <button onClick={restoreDraft} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 7, border: "none", background: "#BA7517", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Restore draft</button>
            </div>
          </div>
        )}
        {draftRestored && (
          <div style={{ padding: "8px 24px", background: "#EAF3DE", borderBottom: "0.5px solid #97C459", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-check" style={{ fontSize: 13, color: "#27500A" }} />
            <span style={{ fontSize: 12, color: "#27500A" }}>Draft restored — continue where you left off</span>
          </div>
        )}

        {/* Step indicator */}
        <div style={{ display: "flex", padding: "14px 24px 0", gap: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ height: 3, width: "100%", borderRadius: 2, background: i < step ? "#C0392B" : "#e5e5e0", transition: "background 0.3s" }} />
              <div style={{ fontSize: 9, color: i < step ? "#C0392B" : "#999", fontWeight: i + 1 === step ? 600 : 400, textAlign: "center" }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* STEP 1 — Channel & basics */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Channel *">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CHANNELS.map(c => (
                    <button key={c} onClick={() => handleChannelChange(c)} style={{
                      fontSize: 13, padding: "7px 16px", borderRadius: 8, cursor: "pointer",
                      border: `0.5px solid ${channel === c ? "#C0392B" : "#cccccc"}`,
                      background: channel === c ? "#FCEBEB" : "#f5f5f3",
                      color: channel === c ? "#C0392B" : "#666660",
                      fontWeight: channel === c ? 600 : 400, fontFamily: "inherit",
                    }}>{c}</button>
                  ))}
                </div>
                {errors.channel && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>{errors.channel}</div>}
              </Field>

              <Field label="Salesperson *">
                <input value={salesperson} onChange={e => setSalesperson(e.target.value)}
                  style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} placeholder="Name of salesperson" />
                {errors.salesperson && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>{errors.salesperson}</div>}
              </Field>

              <Field label="Order date">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} />
              </Field>

              {channel && (
                <div>
                  <label style={{ fontSize: 11, color: "#666660", display: "block", marginBottom: 5, fontWeight: 500 }}>Order ID</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      value={customOrderId}
                      onChange={e => setCustomOrderId(e.target.value)}
                      style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a", fontWeight: 500, maxWidth: 200 }}
                      placeholder="e.g. BL-0001"
                    />
                    <span style={{ fontSize: 11, color: "#999" }}>Edit if needed — future IDs in this channel will continue from here</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Customer */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Customer name *">
                <input value={custName} onChange={e => setCustName(e.target.value)}
                  style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} placeholder="Full name" />
                {errors.custName && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>{errors.custName}</div>}
              </Field>
              <Field label="Phone *">
                <input value={custPhone} onChange={e => setCustPhone(e.target.value)}
                  style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} placeholder="+91 XXXXX XXXXX" />
                {errors.custPhone && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>{errors.custPhone}</div>}
              </Field>
              <Field label="Address (optional)">
                <textarea value={custAddress} onChange={e => setCustAddress(e.target.value)}
                  style={{ ...INPUT, minHeight: 80, resize: "vertical", background: "#f5f5f3", color: "#1a1a1a" }} placeholder="Full delivery address" />

              </Field>
            </div>
          )}

          {/* STEP 3 — Line items */}
          {step === 3 && (
            <div>
              {items.map((item, idx) => (
                <div key={item._id} style={{ border: "0.5px solid #e5e5e0", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f5f5f3", borderBottom: "0.5px solid #e5e5e0" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>Item {idx + 1}{item.name ? ` — ${item.name}` : ""}</div>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 16 }}>
                        <i className="ti ti-trash" />
                      </button>
                    )}
                  </div>
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                    <ShopifyLoader idx={idx} item={item} updateItem={updateItem} fetchShopifyProduct={fetchShopifyProduct} />

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                      <Field label="Item name *">
                        <input value={item.name} onChange={e => updateItem(idx, "name", e.target.value)}
                          style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} placeholder="e.g. 3-seater sofa" />
                        {errors[`item_${idx}_name`] && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>{errors[`item_${idx}_name`]}</div>}
                      </Field>
                      <Field label="Qty">
                        <input type="number" min="1" value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)}
                          style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} />
                      </Field>
                      <Field label="Price (₹) *">
                        <input type="number" value={item.price} onChange={e => updateItem(idx, "price", e.target.value)}
                          style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} placeholder="Per unit" />
                        {errors[`item_${idx}_price`] && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>{errors[`item_${idx}_price`]}</div>}
                      </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="Wood *">
                        <input value={item.wood} onChange={e => updateItem(idx, "wood", e.target.value)}
                          style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} placeholder="e.g. Sheesham, Mango" />
                        {errors[`item_${idx}_wood`] && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>{errors[`item_${idx}_wood`]}</div>}
                      </Field>
                      <Field label="Polish / Finish">
                        <select value={item.woodColour} onChange={e => updateItem(idx, "woodColour", e.target.value)}
                          style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }}>
                          <option value="">Select finish</option>
                          {POLISH_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </Field>
                    </div>

                    <Field label="Fabric code (if upholstery)">
                      <input value={item.fabricCode} onChange={e => updateItem(idx, "fabricCode", e.target.value)}
                        style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} placeholder="e.g. SUP-GRY-442" />
                    </Field>

                    <Field label="Work required">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                        {FINISHING_OPTIONS.map(f => {
                          const active = item.finishingSteps.includes(f);
                          const mandatory = f === "Polish";
                          return (
                            <button key={f} onClick={() => toggleFinishing(idx, f)} style={{
                              fontSize: 12, padding: "5px 12px", borderRadius: 7,
                              cursor: mandatory ? "default" : "pointer",
                              border: `0.5px solid ${mandatory ? "#AFA9EC" : active ? "#5DCAA5" : "#cccccc"}`,
                              background: mandatory ? "#EEEDFE" : active ? "#E1F5EE" : "#f5f5f3",
                              color: mandatory ? "#3C3489" : active ? "#085041" : "#666660",
                              fontWeight: active || mandatory ? 500 : 400, fontFamily: "inherit",
                            }}>
                              {mandatory && <i className="ti ti-lock" style={{ fontSize: 11, marginRight: 4 }} />}
                              {f}
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    {/* Product images */}
                    <FileUploadArea
                      label="Product images (front, back, reference photos)"
                      accept="image/*,.pdf"
                      multiple={true}
                      files={item.images || []}
                      onAdd={val => updateItem(idx, "images", val)}
                      hint="JPG, PNG, PDF"
                    />

                    {/* Measurement photos */}
                    <FileUploadArea
                      label="Measurement drawing / sketch"
                      accept="image/*,.pdf"
                      multiple={true}
                      files={item.measurementPhotos || []}
                      onAdd={val => updateItem(idx, "measurementPhotos", val)}
                      hint="Upload measurement drawing or sketch"
                    />

                    <Field label="Remarks">
                      <textarea value={item.remarks} onChange={e => updateItem(idx, "remarks", e.target.value)}
                        style={{ ...INPUT, minHeight: 60, resize: "vertical", background: "#f5f5f3", color: "#1a1a1a" }}
                        placeholder="Any special instructions for this item" />
                    </Field>
                  </div>
                </div>
              ))}

              <button onClick={addItem} style={{
                width: "100%", padding: 10, borderRadius: 10,
                border: "0.5px dashed #cccccc", background: "transparent",
                color: "#666660", cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit",
              }}>
                <i className="ti ti-plus" style={{ fontSize: 15 }} /> Add another item
              </button>

              {totalValue > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px", background: "#f5f5f3", borderRadius: 8, fontSize: 13, marginTop: 8 }}>
                  <span style={{ color: "#666660", marginRight: 12 }}>Total order value</span>
                  <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{formatCurrency(totalValue)}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Delivery & notes */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Recommended delivery date *">
                <input type="date" value={originalDelivery} onChange={e => setOriginalDelivery(e.target.value)}
                  style={{ ...INPUT, background: "#f5f5f3", color: "#1a1a1a" }} />
                {errors.originalDelivery && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>{errors.originalDelivery}</div>}
                <div style={{ fontSize: 11, color: "#666660", marginTop: 5 }}>
                  <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 4 }} />
                  This is your recommended date. Yash/Admin will confirm the final delivery date.
                </div>
              </Field>

              <Field label="Notes (internal)">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ ...INPUT, minHeight: 100, resize: "vertical", background: "#f5f5f3", color: "#1a1a1a" }}
                  placeholder="Special requirements, delivery instructions, etc." />
              </Field>

              {/* Summary */}
              <div style={{ background: "#f5f5f3", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a", marginBottom: 10 }}>Order summary</div>
                {[
                  ["Channel", channel],
                  ["Customer", custName],
                  ["Phone", custPhone],
                  ["Salesperson", salesperson],
                  ["Items", items.length],
                  ["Total value", formatCurrency(totalValue)],
                  ["Expected delivery", originalDelivery || "—"],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "0.5px solid #e5e5e0" }}>
                    <span style={{ color: "#666660" }}>{l}</span>
                    <span style={{ fontWeight: 500, color: "#1a1a1a" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "0.5px solid #e5e5e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={step === 1 ? onCancel : () => setStep(s => s - 1)} style={{
            fontSize: 13, padding: "8px 18px", borderRadius: 8,
            border: "0.5px solid #cccccc", background: "transparent",
            color: "#666660", cursor: "pointer", fontFamily: "inherit",
          }}>
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          {step < TOTAL_STEPS ? (
            <button onClick={nextStep} style={{
              fontSize: 13, padding: "8px 22px", borderRadius: 8, border: "none",
              background: "#C0392B", color: "white", cursor: "pointer",
              fontWeight: 500, fontFamily: "inherit",
            }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSave} style={{
              fontSize: 13, padding: "8px 22px", borderRadius: 8, border: "none",
              background: "#27500A", color: "white", cursor: "pointer",
              fontWeight: 500, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
            }}>
              <i className="ti ti-check" style={{ fontSize: 14 }} /> Create order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}