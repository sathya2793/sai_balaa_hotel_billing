"use client";
import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { FiEdit, FiTrash2, FiSave, FiPlus, FiSearch, FiX } from "react-icons/fi";
import { showSuccess, showError, showDeleteConfirmation } from "../../utils/notifications";
import ContentLoader from "../../components/ContentLoader";
import { useRouter } from "next/navigation";
const initialFormState = { empId: "", name: "", role: "Supplier" };

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(initialFormState);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(true);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => { 
    async function initLoad() {
      await Promise.all([fetchEmployees()]);
      setLoadingPage(false);
    }
    initLoad();
 }, []);
  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "admin" && userRole !== "manager") {
      localStorage.clear();
      router.replace("/login");
    }
  }, [router]);

  function clearForm() {
    setForm(initialFormState);
    }

  async function fetchEmployees() {
    setLoading(true);
    try {
      const q = query(collection(db, "employees"), orderBy("empId"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(list);
    } catch {
      showError("Error loading employees");
    }
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.empId.trim() || !form.name.trim()) return showError("Employee ID and Name are required");

    // Unique check
    if (employees.some(emp => emp.empId.toLowerCase() === form.empId.toLowerCase())) {
      return showError("Employee ID already exists");
    }

    try {
      await addDoc(collection(db, "employees"), { ...form });
      setForm(initialFormState);
      fetchEmployees();
      showSuccess("Employee added");
    } catch {
      showError("Add failed");
    }
  }

  function startEdit(emp) {
    setEditId(emp.id);
    setEditForm({ empId: emp.empId, name: emp.name, role: emp.role });
  }

  async function saveEdit(id) {
    if (!editForm.empId.trim() || !editForm.name.trim()) return showError("ID and Name required");
    try {
      await updateDoc(doc(db, "employees", id), { ...editForm });
      setEditId(null);
      fetchEmployees();
      showSuccess("Employee updated");
    } catch {
      showError("Update failed");
    }
  }

  async function remove(id, name) {
    const confirm = await showDeleteConfirmation(name, "employee");
    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "employees", id));
        fetchEmployees();
        showSuccess("Employee deleted");
      } catch {
        showError("Delete failed");
      }
    }
  }

  // Search filter
  const filtered = employees.filter(e =>
    e.empId.toLowerCase().includes(search.toLowerCase()) ||
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / perPage);
  const indexLast = currentPage * perPage;
  const indexFirst = indexLast - perPage;
  const currentItems = filtered.slice(indexFirst, indexLast);

  if (typeof window !== "undefined") {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "admin" && userRole !== "manager") return null;
  }

  return (
    <>
    {loadingPage && <ContentLoader />}
    <section className="employees-page">
      {/* <h1 className="employees-title">Manage Employees</h1> */}

      {/* Add Form */}
      <form onSubmit={handleAdd} className="employees-form">
        <input
          placeholder="Employee ID*"
          value={form.empId}
          onChange={e => setForm({ ...form, empId: e.target.value })}
        />
        <input
          placeholder="Name*"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
        <select
          value={form.role}
          onChange={e => setForm({ ...form, role: e.target.value })}
        >
          <option value="Supplier">Supplier</option>
          <option value="Captain">Captain</option>
        </select>
        <button type="submit" className="billing-btn primary"><FiPlus /> Add</button>
        <button type="button" className="billing-btn secondary" onClick={clearForm}><FiX /> Clear</button>
      </form>

      {/* Search */}
      <div className="employees-search">
        <FiSearch />
        <input
          placeholder="Search by ID or Name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />
      </div>

      {/* Table */}
      {loading ? <p>Loading...</p> : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Role</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 && (
              <tr><td colSpan="4">No employees found</td></tr>
            )}
            {currentItems.map(emp => (
              <tr key={emp.id}>
                <td>
                  {editId === emp.id
                    ? <input value={editForm.empId} onChange={e => setEditForm({ ...editForm, empId: e.target.value })} />
                    : emp.empId}
                </td>
                <td>
                  {editId === emp.id
                    ? <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    : emp.name}
                </td>
                <td>
                  {editId === emp.id
                    ? (
                      <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                        <option value="Supplier">Supplier</option>
                        <option value="Captain">Captain</option>
                      </select>
                    )
                    : emp.role}
                </td>
                <td>
                  {editId === emp.id ? (
                    <>
                      <button onClick={() => saveEdit(emp.id)} className="icon-btn save"><FiSave /></button>
                      <button onClick={() => setEditId(null)} className="icon-btn cancel"><FiX /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(emp)} className="icon-btn"><FiEdit /></button>
                      <button onClick={() => remove(emp.id, emp.name)} className="icon-btn danger"><FiTrash2 /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-ui">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
        </div>
      )}
    </section>
    </>
  );
}
