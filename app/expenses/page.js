"use client";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  showSuccess,
  showError,
  showDeleteConfirmation,
} from "../../utils/notifications";
import ContentLoader from "../../components/ContentLoader";
import {
  FiTrash2,
  FiPlus,
  FiEdit,
  FiSave,
  FiX,
  FiSearch,
} from "react-icons/fi";

export default function ExpensesPage() {
  const [tab, setTab] = useState("expenses");
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Expense states
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [expenseList, setExpenseList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  // Salary states
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeResults, setEmployeeResults] = useState([]);
  const [employeeName, setEmployeeName] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryDate, setSalaryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [salaryList, setSalaryList] = useState([]);

  // Report states
  const [fromDate, setFromDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportExpenses, setReportExpenses] = useState([]);
  const [reportSalaries, setReportSalaries] = useState([]);
  const [pageReportExpenses, setPageReportExpenses] = useState(1);
  const [pageReportSalaries, setPageReportSalaries] = useState(1);
  const rowsPerPage = 10;
  function newPaginateData(data, page) {
    const start = (page - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }

  // Pagination states
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole") || "");
    setUserEmail(localStorage.getItem("userEmail") || "unknown@system.local");
    Promise.all([fetchExpenseTypes(), fetchExpenses(), fetchSalaries()]).then(
      () => setLoading(false)
    );
  }, []);

  // ===== Expenses =====
  async function fetchExpenseTypes() {
    const snap = await getDocs(collection(db, "expense_types"));
    setExpenseTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  async function fetchExpenses() {
    const snap = await getDocs(
      query(collection(db, "expenses"), orderBy("createdAt", "desc"))
    );
    setExpenseList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  async function addExpense(e) {
    e.preventDefault();
    if (!expenseName || !expenseAmount)
      return showError("Enter expense name and amount");

    let typeName = expenseType.trim() || "Misc";
    if (
      !expenseTypes.find((t) => t.name.toLowerCase() === typeName.toLowerCase())
    ) {
      await addDoc(collection(db, "expense_types"), { name: typeName });
      fetchExpenseTypes();
    }

    await addDoc(collection(db, "expenses"), {
      name: expenseName,
      amount: parseFloat(expenseAmount),
      type: typeName,
      date: new Date().toISOString().split("T")[0],
      createdAt: serverTimestamp(),
      createdBy: userEmail,
    });
    clearExpenseForm();
    fetchExpenses();
    showSuccess("Expense added");
  }
  async function updateExpense(id) {
    await updateDoc(doc(db, "expenses", id), {
      ...editData,
      updateBy: userEmail,
    });
    setEditId(null);
    fetchExpenses();
    showSuccess("Expense updated");
  }
  async function deleteExpense(id) {
    const res = await showDeleteConfirmation("this expense", "expense");
    if (!res.isConfirmed) return;
    await deleteDoc(doc(db, "expenses", id));
    showSuccess("Expense deleted");
    fetchExpenses();
  }
  function clearExpenseForm() {
    setExpenseName("");
    setExpenseAmount("");
    setExpenseType("");
  }

  // ===== Salaries =====
  async function fetchSalaries() {
    const snap = await getDocs(
      query(collection(db, "salaries"), orderBy("createdAt", "desc"))
    );
    setSalaryList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  async function addSalary(e) {
    e.preventDefault();
    if (!employeeName || !salaryAmount)
      return showError("Enter employee name and amount");

    // Validation: check for duplicate salary in month
    const salaryMonth = salaryDate.substring(0, 7); // "YYYY-MM"
    const q = query(
      collection(db, "salaries"),
      where("employeeName", "==", employeeName),
      where("date", ">=", salaryMonth + "-01"),
      where("date", "<=", salaryMonth + "-31")
    );
    const snap = await getDocs(q);
    const alreadyPaid = snap.docs.some((doc) => {
      const dateStr = doc.data().date;
      return dateStr && dateStr.substring(0, 7) === salaryMonth;
    });
    if (alreadyPaid)
      return showError(
        `${employeeName} has already received salary for this month`
      );

    await addDoc(collection(db, "salaries"), {
      employeeName,
      amount: parseFloat(salaryAmount),
      date: salaryDate,
      paymentMode,
      createdAt: serverTimestamp(),
      createdBy: userEmail,
    });
    clearSalaryForm();
    fetchSalaries();
    showSuccess("Salary added");
  }

  async function deleteSalary(id) {
    const res = await showDeleteConfirmation("this salary", "salary");
    if (!res.isConfirmed) return;
    await deleteDoc(doc(db, "salaries", id));
    showSuccess("Salary deleted");
    fetchSalaries();
  }
  function clearSalaryForm() {
    setEmployeeName("");
    setSalaryAmount("");
    if (userRole === "admin")
      setSalaryDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("Cash");
    setEmployeeSearch("");
    setEmployeeResults([]);
  }

  // ===== Search employee by ID/Name like Billing =====
  useEffect(() => {
    if (!employeeSearch) return setEmployeeResults([]);
    async function searchEmp() {
      const results = [];

      const q1 = query(
        collection(db, "employees"),
        where("empId", ">=", employeeSearch),
        where("empId", "<=", employeeSearch + "\uf8ff")
      );
      const s1 = await getDocs(q1);
      s1.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));

      const q2 = query(
        collection(db, "employees"),
        where("name", ">=", employeeSearch),
        where("name", "<=", employeeSearch + "\uf8ff")
      );
      const s2 = await getDocs(q2);
      s2.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));

      const unique = Object.values(
        results.reduce((acc, cur) => {
          acc[cur.id] = cur;
          return acc;
        }, {})
      );

      setEmployeeResults(unique);

      if (unique.length === 1) {
        setEmployeeName(unique[0].name);
        setEmployeeSearch(unique[0].name);
        setEmployeeResults([]);
      }
    }

    searchEmp();
  }, [employeeSearch]);

  // ===== Pagination Helpers =====
  function paginateData(data) {
    const start = (page - 1) * perPage;
    return data.slice(start, start + perPage);
  }

  // ===== Tables =====

  async function generateReport() {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    // fetch all expenses
    const expSnap = await getDocs(collection(db, "expenses"));
    const expData = expSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const expFiltered = expData.filter((e) => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    // fetch all salaries
    const salSnap = await getDocs(collection(db, "salaries"));
    const salData = salSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const salFiltered = salData.filter((s) => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    setReportExpenses(expFiltered);
    setReportSalaries(salFiltered);
  }

  function ExpenseTable() {
    const data = paginateData(expenseList);
    if (!data.length) return <div>No expenses found</div>;
    return (
      <>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id}>
                <td>
                  {editId === e.id ? (
                    <input
                      value={editData.name}
                      onChange={(ev) =>
                        setEditData((f) => ({ ...f, name: ev.target.value }))
                      }
                    />
                  ) : (
                    e.name
                  )}
                </td>
                <td>
                  {editId === e.id ? (
                    <input
                      type="number"
                      value={editData.amount}
                      onChange={(ev) =>
                        setEditData((f) => ({ ...f, amount: ev.target.value }))
                      }
                    />
                  ) : (
                    "₹" + e.amount
                  )}
                </td>
                <td>{e.type}</td>
                <td>{e.date}</td>
                <td>
                  {editId === e.id ? (
                    <>
                      <button onClick={() => updateExpense(e.id)}>
                        <FiSave />
                      </button>
                      <button onClick={() => setEditId(null)}>
                        <FiX />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditId(e.id);
                          setEditData(e);
                        }}
                      >
                        <FiEdit />
                      </button>
                      <button onClick={() => deleteExpense(e.id)}>
                        <FiTrash2 />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* ✅ Pagination */}
        <div className="pagination-ui">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>
            {" "}
            Page {page} of {Math.ceil(expenseList.length / perPage) || 1}{" "}
          </span>
          <button
            disabled={page >= Math.ceil(expenseList.length / perPage)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </>
    );
  }
  function SalaryTable() {
    const data = paginateData(salaryList);
    if (!data.length) return <div>No salaries found</div>;
    return (
      <>
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Mode</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id}>
                <td>{s.employeeName}</td>
                <td>₹{s.amount}</td>
                <td>{s.date}</td>
                <td>{s.paymentMode}</td>
                <td>
                  <button onClick={() => deleteSalary(s.id)}>
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* ✅ Pagination */}
        <div className="pagination-ui">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>
            {" "}
            Page {page} of {Math.ceil(salaryList.length / perPage) || 1}{" "}
          </span>
          <button
            disabled={page >= Math.ceil(salaryList.length / perPage)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </>
    );
  }

  // ===== Reset Report =====
  function resetReport() {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
    setReportExpenses([]);
    setReportSalaries([]);
    setPageReportExpenses(1);
    setPageReportSalaries(1);
  }

  // ===== Auto-reset when selecting Reports tab =====
  useEffect(() => {
    if (tab === "reports") {
      resetReport();
    }
  }, [tab]);

  // Reset pagination when reportExpenses changes
  useEffect(() => {
    setPageReportExpenses(1);
  }, [reportExpenses]);

  // Reset pagination when reportSalaries changes
  useEffect(() => {
    setPageReportSalaries(1);
  }, [reportSalaries]);

  if (loading) return <ContentLoader />;

  return (
    <div className="expenses-page">
      {/* Tabs */}
      <div className="tabs">
        <button
          className={tab === "expenses" ? "active" : ""}
          onClick={() => setTab("expenses")}
        >
          Expenses
        </button>
        <button
          className={tab === "salaries" ? "active" : ""}
          onClick={() => setTab("salaries")}
        >
          Salaries
        </button>
        <button
          className={tab === "reports" ? "active" : ""}
          onClick={() => setTab("reports")}
        >
          Reports
        </button>
      </div>

      {tab === "expenses" && (
        <>
          <form onSubmit={addExpense} className="form-inline">
            <input
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              placeholder="Name"
            />
            <input
              type="number"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="Amount"
            />
            <input
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              placeholder="Type"
              list="typeList"
            />
            <datalist id="typeList">
              {expenseTypes.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
            <button type="submit" className="billing-btn success">
              <FiPlus /> Add
            </button>
            <button type="button" onClick={clearExpenseForm}>
              <FiX /> Clear
            </button>{" "}
            {/* ✅ clear */}
          </form>
          <ExpenseTable />
        </>
      )}

      {tab === "salaries" && (
        <>
          <form onSubmit={addSalary} className="form-inline">
            <input
              value={employeeSearch}
              className="searchBy"
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Search Employee by ID or name"
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === "Tab") &&
                  employeeResults.length > 0
                ) {
                  e.preventDefault();
                  setEmployeeName(employeeResults[0].name);
                  setEmployeeSearch(employeeResults[0].name);
                  setEmployeeResults([]);
                }
              }}
            />
            {employeeResults.length > 0 && (
              <ul className="autocomplete-list">
                {employeeResults.map((emp) => (
                  <li
                    key={emp.id}
                    onClick={() => {
                      setEmployeeName(emp.name);
                      setEmployeeSearch(emp.name);
                      setEmployeeResults([]);
                    }}
                  >
                    ({emp.empId}) - {emp.name}
                  </li>
                ))}
              </ul>
            )}
            <input
              type="number"
              value={salaryAmount}
              onChange={(e) => setSalaryAmount(e.target.value)}
              placeholder="Amount"
            />
            <input
              type="date"
              value={salaryDate}
              onChange={(e) =>
                userRole === "admin" && setSalaryDate(e.target.value)
              }
            />
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="GPay">GPay</option>
            </select>
            <button type="submit" className="billing-btn success">
              <FiPlus /> Add
            </button>
            <button type="button" onClick={clearSalaryForm}>
              <FiX /> Clear
            </button>
          </form>
          <SalaryTable />
        </>
      )}

      {tab === "reports" && (
        <section>
          <h2>Expense Report</h2>
          <div className="form-inline">
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
            <button onClick={generateReport} className="billing-btn success">
              <FiSearch /> Generate
            </button>
            <button
              type="button"
              onClick={resetReport}
              className="billing-btn danger"
            >
              <FiX /> Reset
            </button>
          </div>

          <h3>Expenses</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {reportExpenses.length > 0 ? (
                newPaginateData(reportExpenses, pageReportExpenses).map((e) => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>₹{e.amount}</td>
                    <td>{e.type}</td>
                    <td>{e.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No expenses found in date range</td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Pagination controls */}
          <div className="pagination-ui">
            <button
              disabled={pageReportExpenses === 1}
              onClick={() => setPageReportExpenses((p) => p - 1)}
            >
              Prev
            </button>
            <span>
              Page {pageReportExpenses} of{" "}
              {Math.ceil(reportExpenses.length / rowsPerPage) || 1}
            </span>
            <button
              disabled={
                pageReportExpenses >=
                Math.ceil(reportExpenses.length / rowsPerPage)
              }
              onClick={() => setPageReportExpenses((p) => p + 1)}
            >
              Next
            </button>
          </div>
          <p className="report-total">
            <b>Total Expenses:</b> ₹
            {reportExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)}
          </p>

          <h3>Salaries</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {reportSalaries.length > 0 ? (
                newPaginateData(reportSalaries, pageReportSalaries).map((s) => (
                  <tr key={s.id}>
                    <td>{s.employeeName}</td>
                    <td>₹{s.amount}</td>
                    <td>{s.date}</td>
                    <td>{s.paymentMode}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No salaries found in date range</td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Pagination controls */}
          <div className="pagination-ui">
            <button
              disabled={pageReportSalaries === 1}
              onClick={() => setPageReportSalaries((p) => p - 1)}
            >
              Prev
            </button>
            <span>
              Page {pageReportSalaries} of{" "}
              {Math.ceil(reportSalaries.length / rowsPerPage) || 1}
            </span>
            <button
              disabled={
                pageReportSalaries >=
                Math.ceil(reportSalaries.length / rowsPerPage)
              }
              onClick={() => setPageReportSalaries((p) => p + 1)}
            >
              Next
            </button>
          </div>
          <p className="report-total">
            <b>Total Salaries:</b> ₹
            {reportSalaries.reduce((sum, s) => sum + Number(s.amount || 0), 0)}
          </p>
        </section>
      )}
    </div>
  );
}
