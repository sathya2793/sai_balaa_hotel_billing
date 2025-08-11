"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import ContentLoader from "../../components/ContentLoader";
import { FiSearch, FiX } from "react-icons/fi";
import { showError } from "../../utils/notifications";

// Example incentive rate (2%)
const INCENTIVE_PERCENT = 2;

export default function ReportPage() {
  const [fromDate, setFromDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

  const [billWise, setBillWise] = useState([]);
  const [productWise, setProductWise] = useState([]);
  const [sectionWise, setSectionWise] = useState([]);
  const [captainWise, setCaptainWise] = useState([]);
  const [ingredientWise, setIngredientWise] = useState([]);
  const [gstReport, setGstReport] = useState([]);
  const [cancelledBills, setCancelledBills] = useState([]);
  const [viewBill, setViewBill] = useState(null);
  const [loading, setLoading] = useState(false);

  function resetFilters() {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
    setBillWise([]);
    setProductWise([]);
    setSectionWise([]);
    setCaptainWise([]);
    setIngredientWise([]);
    setGstReport([]);
    setCancelledBills([]);
  }

  async function generateReport() {
    if (!fromDate || !toDate) return showError("Select date range");
    setLoading(true);

    // Example structure: bills collection with fields:
    // { billNo, date, items: [{name, section, qty, price, gstPercent, captainName, ingredients:[]}] , totalAmount }
    const billsSnap = await getDocs(collection(db, "bills"));
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    const allBills = billsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filter by date
    const inRange = allBills.filter((b) => {
      const bd = new Date(b.date);
      return bd >= start && bd <= end;
    });

    // Paid bills
    const paid = inRange.filter((b) => b.status?.toLowerCase() === "paid");

    // Cancelled bills
    const cancelled = inRange.filter(
      (b) => b.status?.toLowerCase() === "cancelled"
    );

    setBillWise(paid);
    setCancelledBills(cancelled);

    // Product wise & Section wise
    const prodMap = {};
    const secMap = {};
    const capMap = {};
    const ingrMap = {};
    const gstMap = {};

    paid.forEach((bill) => {
      bill.items?.forEach((item) => {
        // Product total
        if (!prodMap[item.name]) {
          prodMap[item.name] = { qty: 0, amount: 0, section: item.section };
        }
        prodMap[item.name].qty += item.qty;
        prodMap[item.name].amount += item.qty * item.price;

        // Section total
        if (!secMap[item.section]) {
          secMap[item.section] = { qty: 0, amount: 0 };
        }
        secMap[item.section].qty += item.qty;
        secMap[item.section].amount += item.qty * item.price;

        // Captain/Supplier total with incentive
        if (!capMap[bill.captain.name]) {
          capMap[bill.captain.name] = { qty: 0, amount: 0 };
        }
        capMap[bill.captain.name].qty += item.qty;
        capMap[bill.captain.name].amount += item.qty * item.price;

        // Ingredient wise total
        item.ingredients?.forEach((ing) => {
          if (!ingrMap[ing]) {
            ingrMap[ing] = { qty: 0 };
          }
          ingrMap[ing].qty += item.qty;
        });

        // GST report
        if (item.gstPercent > 0) {
          if (!gstMap[item.gstPercent]) {
            gstMap[item.gstPercent] = { taxable: 0, gst: 0 };
          }
          gstMap[item.gstPercent].taxable += item.qty * item.price;
          gstMap[item.gstPercent].gst +=
            item.qty * item.price * (item.gstPercent / 100);
        }
      });
    });
    setProductWise(
      Object.entries(prodMap).map(([name, v]) => ({ name, ...v }))
    );
    setSectionWise(
      Object.entries(secMap).map(([section, v]) => ({ section, ...v }))
    );
    setCaptainWise(
      Object.entries(capMap).map(([name, v]) => ({
        name,
        ...v,
        incentive: (v.amount * INCENTIVE_PERCENT) / 100,
      }))
    );
    setIngredientWise(
      Object.entries(ingrMap).map(([name, v]) => ({ name, ...v }))
    );
    setGstReport(
      Object.entries(gstMap).map(([percent, v]) => ({ percent, ...v }))
    );

    setLoading(false);
  }

  if (loading) return <ContentLoader />;

  return (
    <div className="billing-report-page">
      <h1>Billing Reports</h1>

      {/* Filters */}
      <div className="filters">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
        <button onClick={generateReport} className="btn btn-primary">
          <FiSearch /> Generate
        </button>
        <button onClick={resetFilters} className="btn btn-secondary">
          <FiX /> Reset
        </button>
      </div>

      {/* Bill Wise Total */}
      <div className="report-section">
        <h2>Bill Wise Total</h2>
        <table>
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {billWise.length ? (
              billWise.map((b) => (
                <tr key={b.id}>
                  <td>{b.billNo}</td>
                  <td>{b.date}</td>
                  <td>₹{b.total}</td>
                  <td>
                    <button onClick={() => setViewBill(b)}>View</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Product Item Wise Total */}
      <div className="report-section">
        <h2>Product Item Wise Total</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Section</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {productWise.length ? (
              productWise.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td>{p.section}</td>
                  <td>{p.qty}</td>
                  <td>₹{p.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section Wise Total */}
      <div className="report-section">
        <h2>Section Wise Total</h2>
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sectionWise.length ? (
              sectionWise.map((s, i) => (
                <tr key={i}>
                  <td>{s.section}</td>
                  <td>{s.qty}</td>
                  <td>₹{s.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Captain Wise Total */}
      <div className="report-section">
        <h2>Captain/Supplier Wise Total</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Qty</th>
              <th>Amount</th>
              <th>Incentive ({INCENTIVE_PERCENT}%)</th>
            </tr>
          </thead>
          <tbody>
            {captainWise.length ? (
              captainWise.map((c, i) => (
                <tr key={i}>
                  <td>{c.name}</td>
                  <td>{c.qty}</td>
                  <td>₹{c.amount}</td>
                  <td>₹{c.incentive}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Ingredient Wise */}
      <div className="report-section">
        <h2>Principal Ingredient Wise Total</h2>
        <table>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {ingredientWise.length ? (
              ingredientWise.map((iRow, i) => (
                <tr key={i}>
                  <td>{iRow.name}</td>
                  <td>{iRow.qty}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" style={{ textAlign: "center" }}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* GST Report */}
      <div className="report-section">
        <h2>GST Report</h2>
        <table>
          <thead>
            <tr>
              <th>GST %</th>
              <th>Taxable Amount</th>
              <th>GST Collected</th>
            </tr>
          </thead>
          <tbody>
            {gstReport.length ? (
              gstReport.map((g, i) => (
                <tr key={i}>
                  <td>{g.percent}%</td>
                  <td>₹{g.taxable}</td>
                  <td>₹{g.gst}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cancelled Bills */}
      <div className="report-section">
        <h2>Cancelled Bills</h2>
        <table>
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {cancelledBills.length ? (
              cancelledBills.map((cb) => (
                <tr key={cb.id}>
                  <td>{cb.billNo}</td>
                  <td>{cb.date}</td>
                  <td>₹{cb.total}</td>
                  <td>{cb.cancelReason || "-"}</td>
                   <td>
                        <button onClick={() => setViewBill(cb)}>View</button>
                    </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  No cancelled bills in date range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {viewBill && (
  <div className="modal-overlay" onClick={() => setViewBill(null)}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <h3>Bill Details</h3>
      <p><b>Bill No:</b> {viewBill.billNo}</p>
      <p><b>Date:</b> {viewBill.date}</p>
      <p><b>Status:</b> {viewBill.status}</p>
      <p><b>Captain/Supplier:</b> {viewBill.captain?.name || "-"}</p>
      <p><b>Total Amount:</b> ₹{viewBill.total}</p>

      {viewBill.cashGiven !== undefined && (
        <p><b>Cash Given:</b> ₹{viewBill.cashGiven}</p>
      )}
      {viewBill.balance !== undefined && (
        <p><b>Balance:</b> ₹{viewBill.balance}</p>
      )}

      <h4>Items</h4>
      <table>
        <thead>
          <tr>
            <th>Product</th><th>Qty</th><th>Price</th>
            <th>Section</th><th>GST%</th><th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {viewBill.items?.map((it, idx) => (
            <tr key={idx}>
              <td>{it.name}</td>
              <td>{it.qty}</td>
              <td>₹{it.price}</td>
              <td>{it.section}</td>
              <td>{it.gstPercent || "-"}</td>
              <td>₹{(it.qty * it.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{marginTop:"1em", textAlign:"right"}}>
        <button onClick={() => setViewBill(null)}>Close</button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
