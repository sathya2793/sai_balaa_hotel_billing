"use client";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { FiPlus, FiTrash2, FiPrinter, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import { showSuccess, showError } from "../../utils/notifications";

export default function BillingPage() {
  // Input form state:
  const initialForm = {
  tableNumber: "", captainSearch: "", captain: null, typeInput: "1",
  itemSearch: "", item: null, dynamicManualPrice: "", cartItems: []
};
const [form, setForm] = useState(initialForm);

function clearForm() { setForm(initialForm); }

  // Live search state
  const [captainResults, setCaptainResults] = useState([]);
  const [itemResults, setItemResults] = useState([]);

  // Local orders state (persisted via localStorage)
  const [tableOrders, setTableOrders] = useState({}); // {tableNo: { tableNumber, captain, typeInput, cartItems }}
  const [searchActive, setSearchActive] = useState("");
  const [editingTable, setEditingTable] = useState(""); // for "edit table" flow

  // Bills from DB
  const [printedBills, setPrintedBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);

  const [paymentModal, setPaymentModal] = useState(false);
  const [currentPayBill, setCurrentPayBill] = useState(null);

  const [cancelModal, setCancelModal] = useState(false);
  const [currentCancelBill, setCurrentCancelBill] = useState(null);
  const [payMode, setPayMode] = useState("Cash");
  const [payAmount, setPayAmount] = useState("");
  const [payReturn, setPayReturn] = useState(0);
  const [cancelReason, setCancelReason] = useState("");
  // ========== LocalStorage persistence ===========
  const LS_KEY = "billingTableOrdersV2";
  useEffect(() => {
    // On mount, load localStorage
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        setTableOrders(JSON.parse(saved));
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(tableOrders));
  }, [tableOrders]);

  // ========== Captain search ==========
  useEffect(() => {
    if (!form.captainSearch) return setCaptainResults([]);
    async function fetch() {
      let cap = [];
      const q1 = query(
        collection(db, "employees"),
        where("empId", ">=", form.captainSearch),
        where("empId", "<=", form.captainSearch + "\uf8ff")
      );
      const s1 = await getDocs(q1);
      s1.forEach((doc) => cap.push({ id: doc.id, ...doc.data() }));
      const q2 = query(
        collection(db, "employees"),
        where("name", ">=", form.captainSearch),
        where("name", "<=", form.captainSearch + "\uf8ff")
      );
      const s2 = await getDocs(q2);
      s2.forEach((doc) => cap.push({ id: doc.id, ...doc.data() }));
      setCaptainResults(
        Object.values(
          cap.reduce((a, v) => {
            a[v.id] = v;
            return a;
          }, {})
        )
      );
    }
    fetch();
  }, [form.captainSearch]);

  // ========== Item search ==========
  useEffect(() => {
    if (!form.itemSearch) return setItemResults([]);
    async function fetch() {
      let out = [];
      const q1 = query(
        collection(db, "products"),
        where("product_id", ">=", form.itemSearch),
        where("product_id", "<=", form.itemSearch + "\uf8ff")
      );
      const s1 = await getDocs(q1);
      s1.forEach((doc) => out.push({ id: doc.id, ...doc.data() }));
      const q2 = query(
        collection(db, "products"),
        where("name", ">=", form.itemSearch),
        where("name", "<=", form.itemSearch + "\uf8ff")
      );
      const s2 = await getDocs(q2);
      s2.forEach((doc) => out.push({ id: doc.id, ...doc.data() }));
      setItemResults(
        Object.values(
          out.reduce((a, v) => {
            a[v.product_id] = v;
            return a;
          }, {})
        )
      );
    }
    fetch();
  }, [form.itemSearch]);

  // ========== Add item ==========
  function addItem() {
    if (!form.item) return showError("Select item");
    let price = 0;
    if (form.item.dynamicPrice) {
      price = parseFloat(form.dynamicManualPrice) || 0;
      if (!price) return showError("Enter price");
    } else {
      price =
        form.typeInput === "1"
          ? form.item.priceNonAc
          : form.typeInput === "2"
          ? form.item.priceAc
          : form.item.priceParcel;
    }
    setForm((f) => ({
      ...f,
      cartItems: [
        ...f.cartItems,
        {
          ...form.item,
          type: form.typeInput,
          qty: 1,
          price,
          gst: form.item.gst || false,
          gstPercent: form.item.gstPercent || 0,
          incentive: form.item.incentive || false,
          incentivePercent: form.item.incentivePercent || 0,
        },
      ],
      item: null,
      itemSearch: "",
      dynamicManualPrice: "",
    }));
  }

  function removeItem(idx) {
    setForm((f) => ({
      ...f,
      cartItems: f.cartItems.filter((_, i) => i !== idx),
    }));
  }
  function changeQty(idx, q) {
    setForm((f) => ({
      ...f,
      cartItems: f.cartItems.map((item, i) =>
        i === idx ? { ...item, qty: Math.max(1, q) } : item
      ),
    }));
  }

  // ========== Save: Only on Save, table added to "Active Tables" (local) ==========
  function handleSave() {
    const tn = form.tableNumber.trim();
    if (!tn || isNaN(tn) || parseInt(tn) <= 0) {
      return showError("Please enter a valid (non-zero) Table Number");
    }
    if (tableOrders.hasOwnProperty(tn)) {
        return showError(`Table Number ${tn} is already active`);
    }
    if (!form.captain) return showError("Select a captain/supplier");
    if (!form.cartItems.length) return showError("Add items");

    setTableOrders({
      ...tableOrders,
      [tn]: {
        tableNumber: tn,
        captain: form.captain,
        typeInput: form.typeInput,
        cartItems: form.cartItems,
      },
    });
    setForm({
      tableNumber: "",
      captainSearch: "",
      captain: null,
      typeInput: "1",
      itemSearch: "",
      item: null,
      dynamicManualPrice: "",
      cartItems: [],
    });
    showSuccess(`Order for Table #${tn} saved`);
  }

  // ========== Edit Table ==========
  function startEdit(tn) {
    const order = tableOrders[tn];
    setEditingTable(tn);
    setForm({
      tableNumber: order.tableNumber,
      captainSearch: order.captain.empId + " - " + order.captain.name,
      captain: order.captain,
      typeInput: order.typeInput,
      itemSearch: "",
      item: null,
      dynamicManualPrice: "",
      cartItems: [...(order.cartItems || [])],
    });
  }
  function saveEdit() {
    if (!form.tableNumber) return showError("Enter table number");
    if (!form.captain) return showError("Select a captain/supplier");
    if (!form.cartItems.length) return showError("Add items");
    setTableOrders({
      ...tableOrders,
      [editingTable]: {
        tableNumber: form.tableNumber,
        captain: form.captain,
        typeInput: form.typeInput,
        cartItems: form.cartItems,
      },
    });
    setEditingTable("");
    setForm({
      tableNumber: "",
      captainSearch: "",
      captain: null,
      typeInput: "1",
      itemSearch: "",
      item: null,
      dynamicManualPrice: "",
      cartItems: [],
    });
    showSuccess(`Order for Table #${form.tableNumber} updated`);
  }

  function cancelEdit() {
    setEditingTable("");
    setForm({
      tableNumber: "",
      captainSearch: "",
      captain: null,
      typeInput: "1",
      itemSearch: "",
      item: null,
      dynamicManualPrice: "",
      cartItems: [],
    });
  }

  // ========== Subtotal/GST/Incentive ==========
  function calcTotals(items) {
    let subtotal = 0,
      gst = 0,
      incentive = 0;
    items.forEach((it) => {
      const base = it.qty * it.price;
      subtotal += base;
      if (it.gst) gst += (base * parseFloat(it.gstPercent)) / 100;
      if (it.incentive)
        incentive += (base * parseFloat(it.incentivePercent)) / 100;
    });
    return { subtotal, gst, incentive, grand: subtotal + gst + incentive };
  }

  // ========== Print (save as bill then remove from active) ==========
  async function handlePrint(tn) {
    const order = tableOrders[tn];
    if (!order || !order.cartItems.length) return showError("Order empty");
    const { subtotal, gst, incentive, grand } = calcTotals(order.cartItems);
    const billNo = "B" + Date.now();
    await addDoc(collection(db, "bills"), {
      billNo,
      tableNumber: tn,
      captain: order.captain,
      items: order.cartItems,
      subtotal,
      gst,
      incentive,
      total: grand,
      status: "printed",
      date: new Date().toISOString().split("T")[0],
      createdAt: serverTimestamp(),
    });
    // Remove from local state
    const updated = { ...tableOrders };
    delete updated[tn];
    setTableOrders(updated);
    showSuccess(`${billNo} generated`);
    loadPrintedBills();
  }

  // ========== Printed Bills - fetch from DB, remove paid/cancelled from UI ==========
  async function loadPrintedBills() {
    setBillsLoading(true);
    const q = query(collection(db, "bills"));
    const s = await getDocs(q);
    setPrintedBills(
      s.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((b) => b.status !== "cancelled" && b.status !== "paid")
        .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
    );
    setBillsLoading(false);
  }
  useEffect(() => {
    loadPrintedBills();
  }, []);

  // ========== Group active tables by captain name ==========
  function groupTablesByCaptain(orders) {
    const grouped = {};
    Object.values(orders).forEach((order) => {
      const cap = order.captain?.name || "Unknown";
      if (!grouped[cap]) grouped[cap] = [];
      grouped[cap].push(order);
    });
    return grouped;
  }

  // ========== Search Active Tables ==========
  const filteredTableOrders = Object.fromEntries(
    Object.entries(tableOrders).filter(
      ([tn, ord]) => !searchActive || tn.includes(searchActive.trim())
    )
  );

   async function confirmPayment() {
    if (!currentPayBill) return;
    try{    
      await updateDoc(doc(db, "bills", currentPayBill.id), {
      status: "paid",
      paidAt: serverTimestamp(),
      paymentMode: payMode,
      cashGiven: payMode === "Cash" ? parseFloat(payAmount) : null,
      cashBack: payMode === "Cash" ? payReturn : null,
    });
    showSuccess("Payment complete");
    closePayModal();
    loadPrintedBills();
    }
    catch(err){
        console.log("🚀 ~ confirmPayment ~ err:", err)
    }
  }

  function openCancelModal(bill) {
    setCurrentCancelBill(bill);
    setCancelModal(true);
    setCancelReason("");
  }

  function openPayModal(bill) {
    setCurrentPayBill(bill);
    setPaymentModal(true);
    setPayMode("Cash");
    setPayAmount("");
    setPayReturn(0);
  }
  function closePayModal() {
    setPaymentModal(false);
    setCurrentPayBill(null);
    setPayAmount("");
  }
  function closeCancelModal() {
    setCancelModal(false);
    setCurrentCancelBill(null);
    setCancelReason("");
  }
  async function confirmCancel() {
    if (!cancelReason.trim()) return showError("Enter reason");
    await updateDoc(doc(db, "bills", currentCancelBill.id), {
      status: "cancelled",
      cancelReason
    });
    showSuccess("Bill cancelled");
    closeCancelModal();
    loadPrintedBills();
  }

  function paymentCash(billAmount,currentValue){
    let total = currentValue - billAmount.toFixed(2);
    setPayAmount(currentValue);
    setPayReturn(total)
  }
  // ========== UI Render ==========

  
  return (
    <div className="billing-flex-layout">
      <main className="billing-main">
        {/* <h1>Billing</h1> */}

        <div className="billing-card">
          <div className="fields-row">
            <div>
              <label>Table #</label>
              <input
                value={form.tableNumber}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tableNumber: e.target.value.replace(/\D/g, ""),
                  }))
                }
                disabled={!!editingTable}
              />
            </div>
            <div className="auto-wrap">
              <label>Captain/Supplier</label>
              <input
                value={form.captainSearch}
                onChange={(e) =>
                  setForm((f) => ({ ...f, captainSearch: e.target.value }))
                }
              />
              {captainResults.length > 0 && (
                <ul className="autocomplete-list">
                  {captainResults.map((cap) => (
                    <li
                      key={cap.id}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          captain: cap,
                          captainSearch: cap.empId + " - " + cap.name,
                        }))
                      }
                    >
                      {cap.name} ({cap.empId})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label>Type (1=Non-AC, 2=AC, 3=Parcel)</label>
              <input
                type="number"
                min="1"
                max="3"
                value={form.typeInput}
                onChange={(e) =>
                  setForm((f) => ({ ...f, typeInput: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="add-item-bar">
            <div className="auto-wrap">
              <label>Item</label>
              <input
                value={form.itemSearch}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    itemSearch: e.target.value,
                  }))
                }
              />
              {itemResults.length > 0 && (
                <ul className="autocomplete-list">
                  {itemResults.map((it) => (
                    <li
                      key={it.id}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          item: it,
                          itemSearch: it.product_id + " - " + it.name,
                          dynamicManualPrice: "",
                        }))
                      }
                    >
                      {it.product_id} - {it.name} {it.dynamicPrice ? "(Dynamic)" : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {form.item?.dynamicPrice && (
              <div>
                <label>Enter Price</label>
                <input
                  type="number"
                  value={form.dynamicManualPrice}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dynamicManualPrice: e.target.value,
                    }))
                  }
                />
              </div>
            )}
            <button className="billing-btn primary" onClick={addItem}>
              <FiPlus /> Add
            </button>
            <button type="button" className="billing-btn secondary" onClick={clearForm}><FiX /> Clear</button>
          </div>

          {form.cartItems.length > 0 && (
            <>
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.cartItems.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.name}</td>
                      <td>₹{it.price}</td>
                      <td>
                        <input
                          type="number"
                          value={it.qty}
                          min="1"
                          onChange={(e) => changeQty(idx, +e.target.value)}
                        />
                      </td>
                      <td>₹{(it.qty * it.price).toFixed(2)}</td>
                      <td>
                        <button onClick={() => removeItem(idx)}>
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(() => {
                const { subtotal, gst, incentive, grand } = calcTotals(
                  form.cartItems
                );
                return (
                  <div className="totals">
                    Subtotal: ₹{subtotal.toFixed(2)} | GST: ₹{gst.toFixed(2)} |
                    Incentive: ₹{incentive.toFixed(2)} |{" "}
                    <b>Grand: ₹{grand.toFixed(2)}</b>
                  </div>
                );
              })()}
              <div className="actions">
                {!editingTable ? (
                  <button className="billing-btn success" onClick={handleSave}>
                    Save
                  </button>
                ) : (
                  <>
                    <button className="billing-btn success" onClick={saveEdit}>
                      Save Changes
                    </button>
                    <button
                      className="billing-btn secondary"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* ============ SEARCH + GROUPED TABLES =============== */}
        <section className="active-tables-section">
          <div
            className="flex-row"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <h2>Active Tables</h2>
            {Object.keys(filteredTableOrders).length > 0 && (
              <input
                className="search-input"
                style={{ maxWidth: 200 }}
                placeholder="Search by table #"
                value={searchActive}
                onChange={(e) => setSearchActive(e.target.value)}
              />
            )}
          </div>
          {Object.keys(filteredTableOrders).length === 0 ? (
            <div style={{ color: "#888" }}>No Active Tables.</div>
          ) : (
            Object.entries(groupTablesByCaptain(filteredTableOrders)).map(
              ([cap, orders]) => (
                <div key={cap} className="captain-section">
                  <div className="captain-title">{cap}</div>
                  <div className="tables-list">
                    {orders.map((order) => (
                      <div
                        key={order.tableNumber}
                        className="active-table-card"
                      >
                        <div className="flexbetween">
                          <strong>Table {order.tableNumber}</strong>
                          <span>
                            <button
                              className="billing-btn edit"
                              title="Edit"
                              onClick={() => startEdit(order.tableNumber)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="billing-btn primary"
                              onClick={() => handlePrint(order.tableNumber)}
                            >
                              <FiPrinter /> Print KOT
                            </button>
                          </span>
                        </div>
                        <table className="billing-table small">
                          <tbody>
                            {order.cartItems.map((it, idx) => (
                              <tr key={idx}>
                                <td>{it.name}</td>
                                <td>Qty: {it.qty}</td>
                                <td>₹{(it.qty * it.price).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="totals small">
                          Total: ₹{calcTotals(order.cartItems).grand.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </section>

        {/* ============ PRINTED BILLS ========== */}
        <section className="bills-section">
          <h2 style={{ marginBottom: "1em" }}>
            Printed Bills (Pending Payment/Cancel)
          </h2>
          {billsLoading && <div>Loading...</div>}
          <table className="bills-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Table</th>
                <th>Captain</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {printedBills.map((bill) => (
                <tr key={bill.id}>
                  <td>{bill.billNo}</td>
                  <td>{bill.tableNumber}</td>
                  <td>{bill.captain?.name || ""}</td>
                  <td>₹{(bill.total || 0).toFixed(2)}</td>
                  <td>
                    <button
                      className="billing-btn success"
                      onClick={() => openPayModal(bill)}
                      >
                      Pay
                    </button>
                    <button
                      className="billing-btn danger"
                      onClick={() => openCancelModal(bill)} 
                      >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        {/* Payment Modal */}
      {paymentModal && currentPayBill && (
        <div className="billing-modal-overlay" onClick={closePayModal}>
          <div className="billing-modal-content" onClick={e => e.stopPropagation()}>
            <h2>Pay Bill {currentPayBill.billNo}</h2>
            <p>Total: ₹{currentPayBill.total.toFixed(2)}</p>
            <label>Payment Mode</label>
            <select value={payMode} onChange={e => setPayMode(e.target.value)}>
              <option>Cash</option>
              <option>QR</option>
              <option>Card</option>
              <option>GPay</option>
            </select>
            {payMode === "Cash" && (
              <>
                <label>Amount Given</label>
                <input type="number" value={payAmount} min={currentPayBill.total}
                  onChange={e => paymentCash(currentPayBill.total,e.target.value)}
                />
                <div>Return: ₹{payReturn}</div>
              </>
            )}
            <div className="actions">
              <button onClick={confirmPayment} className="billing-btn success"><FiCheck /> Confirm</button>
              <button onClick={closePayModal} className="billing-btn secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && currentCancelBill && (
        <div className="billing-modal-overlay" onClick={closeCancelModal}>
          <div className="billing-modal-content" onClick={e => e.stopPropagation()}>
            <h2>Cancel Bill {currentCancelBill.billNo}</h2>
            <label>Reason</label>
            <input value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            <div className="actions">
              <button onClick={confirmCancel} className="billing-btn danger">Confirm Cancel</button>
              <button onClick={closeCancelModal} className="billing-btn secondary">Close</button>
            </div>
          </div>
        </div>
      )}
        </section>
      </main>
    </div>
  );
}
