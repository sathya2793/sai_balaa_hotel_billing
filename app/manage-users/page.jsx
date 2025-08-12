"use client";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { db, auth } from "../../lib/firebase";
import {
  FiSearch,
  FiEdit,
  FiSave,
  FiTrash2,
  FiPlus,
  FiX,
  FiKey,
  FiEye, 
  FiEyeOff
} from "react-icons/fi";
import {
  showSuccess,
  showError,
  showDeleteConfirmation,
} from "../../utils/notifications";
import ContentLoader from "../../components/ContentLoader";
import { useRouter } from "next/navigation";

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const initialForm = {
    username: "",
    email: "",
    password: "",
    role: "cashier",
  };
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ username: "", role: "" });
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  function clearForm() {
    setForm(initialForm);
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
    } catch {
      showError("Error loading users");
    }
    setLoading(false);
  }
  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "admin") {
      localStorage.clear();
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    async function initLoad() {
      await Promise.all([fetchUsers()]);
      setLoadingPage(false);
    }
    initLoad();
  }, []);

  async function addUser(e) {
    e.preventDefault();

    // Trim inputs
    const username = form.username.toLowerCase().trim();
    const email = form.email.trim();
    const password = form.password;

    if (!username || !email || !password) {
      return showError("All fields are required");
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return showError(`Username "${username}" already exists`);
    }

    try {
      // Create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Add to Firestore
      await addDoc(collection(db, "users"), {
        username,
        email,
        role: form.role,
        uid: cred.user.uid,
      });

      showSuccess("User added successfully");

      // Reset form
      setForm({ username: "", email: "", password: "", role: "cashier" });

      // Reload table
      fetchUsers();
    } catch (err) {
      showError(err.message);
    }
  }

  function startEdit(user) {
    setEditId(user.id);
    setEditData({ username: user.username, role: user.role });
  }
  async function saveEdit(id) {
    try {
      await updateDoc(doc(db, "users", id), { ...editData });
      setEditId(null);
      showSuccess("User updated");
      fetchUsers();
    } catch {
      showError("Update failed");
    }
  }

  async function delUser(id, email) {
    const confirm = await showDeleteConfirmation(email, "user");
    if (!confirm.isConfirmed) return;
    try {
      await deleteDoc(doc(db, "users", id));
      showSuccess("User deleted");
      fetchUsers();
    } catch {
      showError("Delete failed");
    }
  }

  async function resetPwd(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      showSuccess("Reset email sent");
    } catch {
      showError("Failed to send reset email");
    }
  }

  // Filtered list
  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (typeof window !== "undefined") {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "admin") return null;
  }

  return (
    <>
      {loadingPage && <ContentLoader />}
      <section className="employees-page">
        {/* <h1 className="employees-title">Manage Users</h1> */}

        {/* Add form */}
        <form onSubmit={addUser} className="employees-form">
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "inherit",
                right: "2rem",
                top: "23%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#555",
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowPassword(!showPassword); }}
            >
              {showPassword ? <FiEye size={20} /> : <FiEyeOff size={20} />}
            </span>
            </div>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
          </select>
          <button type="submit" className="billing-btn primary">
            <FiPlus /> Add
          </button>
          <button
            type="button"
            className="billing-btn secondary"
            onClick={clearForm}
          >
            <FiX /> Clear
          </button>
        </form>

        {/* Search */}
        <div className="employees-search">
          <FiSearch />
          <input
            placeholder="Search by username or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="employees-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="4">No users found</td>
                </tr>
              )}
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    {editId === user.id ? (
                      <input
                        value={editData.username}
                        onChange={(e) =>
                          setEditData({ ...editData, username: e.target.value })
                        }
                      />
                    ) : (
                      user.username
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {editId === user.id ? (
                      <select
                        value={editData.role}
                        onChange={(e) =>
                          setEditData({ ...editData, role: e.target.value })
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="cashier">Cashier</option>
                      </select>
                    ) : (
                      user.role
                    )}
                  </td>
                  <td>
                    {editId === user.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(user.id)}
                          className="icon-btn success"
                        >
                          <FiSave />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="icon-btn"
                        >
                          <FiX />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(user)}
                          className="icon-btn"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => resetPwd(user.email)}
                          className="icon-btn success"
                        >
                          <FiKey />
                        </button>
                        <button
                          onClick={() => delUser(user.id, user.email)}
                          className="icon-btn danger"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
