"use client";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
where
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  FiEdit,
  FiTrash2,
  FiSave,
  FiPlus,
  FiX,
  FiSearch,
  FiTag,
  FiBox,
  FiPercent,
  FiDollarSign,
} from "react-icons/fi";
import {
  showSuccess,
  showError,
  showDeleteConfirmation,
} from "../../utils/notifications";
import ContentLoader from "../../components/ContentLoader";
import { useRouter } from "next/navigation";

export default function ProductsPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  // Add/Edit Product state

  const initialFormState = {
    product_id: "",
    name: "",
    section: "",
    ingredients: "",
    priceAc: "",
    priceNonAc: "",
    priceParcel: "",
    gst: false,
    gstPercent: "",
    incentive: false,
    incentivePercent: "2",
    dynamicPrice: false,
  };

  const [form, setForm] = useState(initialFormState);
  function clearForm() {
    setForm(f => ({
        ...initialFormState,
        section: sections.length > 0 ? sections[0].name : ""
    }));
    }
  // For filter/search
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  // Sections edit
  const [editSectionId, setEditSectionId] = useState(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [newSection, setNewSection] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole") || "");
    setUserName(localStorage.getItem("userEmail") || "");
     async function initLoad() {
      await Promise.all([fetchSections(), fetchProducts()]);
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

  useEffect(() => {
  if (sections.length > 0 && !form.section) {
    setForm(f => ({ ...f, section: sections[0].name }));
  }
}, [sections]);

  // --- CRUD: Sections ---
  async function fetchSections() {
    const q = query(collection(db, "sections"), orderBy("name"));
    const snapshot = await getDocs(q);
    const secs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setSections(secs);

    if (secs.length && !form.section) {
      setForm((f) => ({ ...f, section: secs[0].name }));
    }
  }
  async function handleAddSection(e) {
    e.preventDefault();
    const trimmed = newSection.trim();
    if (!trimmed) return showError("Section cannot be empty.");
    if (sections.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      return showError("Section exists.");
    }
    try {
      await addDoc(collection(db, "sections"), { name: trimmed });
      setNewSection("");
      fetchSections();
      showSuccess(`Section "${trimmed}" added!`);
    } catch {
      showError("Could not add section.");
    }
  }
  function startEditSection(sec) {
    setEditSectionId(sec.id);
    setEditSectionName(sec.name);
  }
  async function saveEditSection(id) {
    const name = editSectionName.trim();
    if (!name) return showError("Section name required.");
    try {
      await updateDoc(doc(db, "sections", id), { name });
      showSuccess("Section updated.");
      setEditSectionId(null);
      fetchSections();
    } catch {
      showError("Update failed.");
    }
  }
  async function deleteSection(id, name) {
    const res = await showDeleteConfirmation(name, "section");
    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, "sections", id));
        showSuccess("Section deleted.");
        fetchSections();
      } catch {
        showError("Delete failed.");
      }
    }
  }

  // --- CRUD: Products ---
  async function fetchProducts() {
    setLoadingProducts(true);
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const prods = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProducts(prods);
    setLoadingProducts(false);
  }
  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "incentive" && checked ? { incentivePercent: "2" } : {}),
    }));
  }
 
async function handleAddProduct(e) {
  e.preventDefault();

  // Trim + validate ID
  const idValue = form.product_id.toString().trim();
  if (!idValue) return showError("Product ID is required.");
  if (isNaN(idValue) || parseInt(idValue) <= 0) {
    return showError("Product ID must be a positive number.");
  }
  const idNum = idValue;

  // Trim + validate name
  const nameTrimmed = form.name.trim();
  if (!nameTrimmed) return showError("Product name is required.");
  if (!form.section.trim()) return showError("Section is required.");

  // Check duplicates: ID and Name (case-insensitive)
  const productsRef = collection(db, "products");
  const qId = query(productsRef, where("id", "==", idNum));
  const qName = query(productsRef, where("name_lower", "==", nameTrimmed.toLowerCase()));

  const [snapId, snapName] = await Promise.all([getDocs(qId), getDocs(qName)]);
  if (!snapId.empty) return showError(`Product ID "${idNum}" already exists`);
  if (!snapName.empty) return showError(`Product name "${nameTrimmed}" already exists`);

  // GST validation
  if (form.gst && !form.gstPercent) {
    return showError("GST % is required when GST is checked.");
  }
  // Incentive validation
  if (form.incentive && !form.incentivePercent) {
    return showError("Incentive % is required when Incentive is checked.");
  }
  // Price validation
  if (!form.dynamicPrice) {
    if (!form.priceNonAc || !form.priceAc || !form.priceParcel) {
      return showError("All price fields are required when Dynamic Price is off.");
    }
  }

  // Prepare ingredients array
  const ingredientsArr = form.ingredients
    .split(",")
    .map(i => i.trim())
    .filter(Boolean);

  const newDoc = {
    product_id: idNum,
    name: nameTrimmed,
    name_lower: nameTrimmed.toLowerCase(),
    section: form.section,
    ingredients: ingredientsArr,
    priceAc: form.dynamicPrice ? 0 : parseFloat(form.priceAc),
    priceNonAc: form.dynamicPrice ? 0 : parseFloat(form.priceNonAc),
    priceParcel: form.dynamicPrice ? 0 : parseFloat(form.priceParcel),
    gst: form.gst,
    gstPercent: form.gst ? parseFloat(form.gstPercent) : 0,
    incentive: form.incentive,
    incentivePercent: form.incentive ? parseFloat(form.incentivePercent) : 0,
    dynamicPrice: form.dynamicPrice,
    createdAt: serverTimestamp(),
    createdBy: userName,
  };

  try {
    await addDoc(collection(db, "products"), newDoc);
    clearForm();
    fetchProducts();
    showSuccess("Product added!");
  } catch (error) {
    console.error(error);
    showError("Failed to add product");
  }
}



  // Product Edit/Delete
  function startEditProd(prod) {
    setEditId(prod.id);
    setEditForm({
      product_id: prod.product_id,
      name: prod.name,
      section: prod.section,
      ingredients: (prod.ingredients || []).join(", "),
      priceAc: prod.priceAc,
      priceNonAc: prod.priceNonAc,
      priceParcel: prod.priceParcel,
      gst: prod.gst,
      gstPercent: prod.gstPercent,
      incentive: prod.incentive,
      incentivePercent: prod.incentivePercent,
      dynamicPrice: prod.dynamicPrice,
      updatedAt: serverTimestamp(),
      updatedBy: userName,
    });
  }
  function handleEditProdChange(e) {
    const { name, value, type, checked } = e.target;
    setEditForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "incentive" && checked ? { incentivePercent: "2" } : {}),
    }));
  }
  async function saveEditProd(id) {
    if (!editForm.name.trim() || !editForm.section.trim())
      return showError("Name/Section required.");
    const ingredientsArr = editForm.ingredients
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);
    const updateFields = {
      ...editForm,
      product_id: editForm.product_id.trim(),
      name: editForm.name.trim(),
      section: editForm.section,
      ingredients: ingredientsArr,
      priceAc: editForm.dynamicPrice ? 0 : parseFloat(editForm.priceAc) || 0,
      priceNonAc: editForm.dynamicPrice
        ? 0
        : parseFloat(editForm.priceNonAc) || 0,
      priceParcel: editForm.dynamicPrice
        ? 0
        : parseFloat(editForm.priceParcel) || 0,
      gstPercent: editForm.gst ? parseFloat(editForm.gstPercent) || 0 : 0,
      incentivePercent: editForm.incentive
        ? parseFloat(editForm.incentivePercent) || 2
        : 0,
    };
    try {
      await updateDoc(doc(db, "products", id), updateFields);
      setEditId(null);
      fetchProducts();
      showSuccess("Product updated.");
    } catch {
      showError("Update failed.");
    }
  }
  async function deleteProduct(id, name) {
    console.log("🚀 ~ deleteProduct ~ id:", id)
    const docId = typeof id === "string" ? id : id.toString();
    console.log("🚀 ~ deleteProduct ~ docId:", docId)
    const res = await showDeleteConfirmation(name, "product");
    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, "products", docId));
        fetchProducts();
        showSuccess("Product deleted.");
      } catch {
        showError("Delete failed.");
      }
    }
  }

  // ---- RENDER ----
  const filtered = products.filter((p) =>
    p.product_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
 );

  const productsPerPage = 10;
  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / productsPerPage);

  function inputProps(name) {
    return {
      value: form[name],
      onChange: handleFormChange,
      className: "input",
    };
  }

  if (typeof window !== "undefined") {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "admin" && userRole !== "manager") return null;
  }

  return (
    <>
    {loadingPage && <ContentLoader />}
    <div className="products-ui-root" aria-label="Products Management">
      {/* Add Product Box */}
      <section className="products-ui-card">
        <form className="products-ui-form" onSubmit={handleAddProduct}>
            <div className="products-ui-container">
            <div className="products-ui-row">
            <label htmlFor="prod-id" className="products-ui-label">Product Id*</label>
            <input
                id="prod-id"
                name="product_id"
                type="text"
                {...inputProps("product_id")}
                required
            />
            </div>
            {/* Product Name */}
            <div className="products-ui-row">
            <FiBox />
            <label htmlFor="prod-name" className="products-ui-label">Product Name*</label>
            <input
                id="prod-name"
                name="name"
                type="text"
                {...inputProps("name")}
                required
            />
            </div>

            {/* Section */}
            <div className="products-ui-row">
            <FiTag />
            <label htmlFor="prod-section" className="products-ui-label">Section*</label>
            <select
                id="prod-section"
                name="section"
                 value={form.section}
                {...inputProps("section")}
                required
            >
                {sections.map((sec) => (
                <option key={sec.id} value={sec.name}>
                    {sec.name}
                </option>
                ))}
            </select>
            </div>

            {/* Ingredients */}
            <div className="products-ui-row">
            <label htmlFor="prod-ingredients" className="products-ui-label">
                Ingredients (comma-separated)
            </label>
            <input
                id="prod-ingredients"
                name="ingredients"
                type="text"
                {...inputProps("ingredients")}
            />
            </div>

            {/* GST & Incentive */}
            <div className="products-ui-row-compact">
            <label htmlFor="prod-gst" className="products-ui-checkbox-label">
                <input
                id="prod-gst"
                type="checkbox"
                name="gst"
                checked={form.gst}
                onChange={handleFormChange}
                />{" "}
                GST
            </label>

            {form.gst && (
                <>
                <label htmlFor="prod-gstPercent" className="products-ui-label">GST % *</label>
                <input
                    id="prod-gstPercent"
                    name="gstPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required={form.gst} 
                    {...inputProps("gstPercent")}
                    className="products-ui-input-xs"
                />
                </>
            )}

            <label htmlFor="prod-incentive" className="products-ui-checkbox-label">
                <input
                id="prod-incentive"
                type="checkbox"
                name="incentive"
                checked={form.incentive}
                onChange={handleFormChange}
                />{" "}
                Incentive
            </label>

            {form.incentive && (
                <>
                <label htmlFor="prod-incentivePercent" className="products-ui-label">Incentive % *</label>
                <input
                    id="prod-incentivePercent"
                    name="incentivePercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required={form.incentive}
                    {...inputProps("incentivePercent")}
                    className="products-ui-input-xs"
                />
                </>
            )}
            </div>

            {/* Dynamic Price & Prices */}
            <div className="products-ui-row-compact">
            <label htmlFor="prod-dynamicPrice" className="products-ui-checkbox-label">
                <input
                id="prod-dynamicPrice"
                type="checkbox"
                name="dynamicPrice"
                checked={form.dynamicPrice}
                onChange={handleFormChange}
                />{" "}
                Dynamic Price (allows price entry during billing, e.g., Today’s Special)
            </label>
            
            {!form.dynamicPrice && (
                <>
                <div className="products-ui-row-block"> 
                <label htmlFor="prod-priceNonAc" className="products-ui-label">Price (Non-AC) *</label>
                <input
                    id="prod-priceNonAc"
                    name="priceNonAc"
                    type="number"
                    min="0"
                    step="1"
                    required={!form.dynamicPrice} 
                    {...inputProps("priceNonAc")}
                    className="products-ui-input-sm"
                />

                <label htmlFor="prod-priceAc" className="products-ui-label">Price (AC) *</label>
                <input
                    id="prod-priceAc"
                    name="priceAc"
                    type="number"
                    min="0"
                    step="1"
                    required={!form.dynamicPrice} 
                    {...inputProps("priceAc")}
                    className="products-ui-input-sm"
                />

                <label htmlFor="prod-priceParcel" className="products-ui-label">Price (Parcel) *</label>
                <input
                    id="prod-priceParcel"
                    name="priceParcel"
                    type="number"
                    min="0"
                    step="1"
                    required={!form.dynamicPrice} 
                    {...inputProps("priceParcel")}
                    className="products-ui-input-sm"
                />
                </div>
                </>
            )}
            </div>
            </div>
            {/* Submit */}
            <div className="products-ui-actions">
            <button type="submit" className="products-ui-btn products-ui-btn-primary  products-btn-bottom">
            <FiPlus /> Add Product
            </button>
            <button type="button" className="billing-btn secondary products-btn-bottom" onClick={clearForm}><FiX /> Clear</button>
            </div>
        </form>
        </section>


      {/* Section List, Edit, Add */}
      <section className="products-ui-card">
        <div className="products-ui-section-header">
          <FiTag />
          <h2>Sections</h2>
        </div>
        <ul className="products-ui-section-list">
          {sections.map((sec) => (
             <li key={sec.id} className="prod-section-item">
              {editSectionId === sec.id ? (
                <>
                  <input
                    value={editSectionName}
                    onChange={(e) => setEditSectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditSection(sec.id);
                      if (e.key === "Escape") setEditSectionId(null);
                    }}
                    onBlur={() => saveEditSection(sec.id)}
                    autoFocus
                    className="prod-input prod-section-edit-input"
                    aria-label={`Edit section name for ${sec.name}`}
                  />
                  <button
                    onClick={() => saveEditSection(sec.id)}
                    aria-label="Save Section"
                    className="products-ui-icon-btn icon-btn save-icon"
                  >
                    <FiSave />
                  </button>
                </>
              ) : (
                <>
                  <span>{sec.name}</span>
                  <button
                    onClick={() => startEditSection(sec)}
                    aria-label="Edit Section"
                    className="products-ui-icon-btn icon-btn edit-icon"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => deleteSection(sec.id, sec.name)}
                    aria-label="Delete Section"
                    className="products-ui-icon-btn icon-btn danger"
                  >
                    <FiTrash2 />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {userRole === "admin" && (
          <form className="products-ui-section-add" onSubmit={handleAddSection}>
            <input
              value={newSection}
              placeholder="Add section"
              onChange={(e) => setNewSection(e.target.value)}
              className="products-ui-input-xs"
            />
            <button
              type="submit"
              className="products-ui-icon-btn products-ui-btn-primary"
            >
              <FiPlus />
            </button>
          </form>
        )}
      </section>

      {/* Search & Table */}
      <section className="products-ui-card">
        {(filtered.length > 0 ) && (
            <div className="products-ui-search-bar">
            <FiSearch />
            <input
            value={search}
            onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // reset to first page after search
            }}
            placeholder="Search products by id or name..."
            aria-label="Search products by id or name"
            className="products-ui-input-search"
            />
            </div>
        )}
        <table className="products-ui-table" aria-label="Product list">
          <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
              <th>Section</th>
              <th>Ingredients</th>
              <th>Non-AC</th>
              <th>AC</th>
              <th>Parcel</th>
              <th>GST</th>
              <th>Incentive</th>
              <th>Dynamic</th>
              {userRole === "admin" && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((prod) =>
              editId === prod.id ? (
                <tr key={prod.id}>
                  <td>
                    <input
                      value={editForm.product_id}
                      name="id"
                      onChange={handleEditProdChange}
                      className="products-ui-input-xs"
                    />
                  </td>
                  <td>
                    <input
                      value={editForm.name}
                      name="name"
                      onChange={handleEditProdChange}
                      className="products-ui-input-xs"
                    />
                  </td>
                  <td>
                    <select
                      name="section"
                      value={editForm.section}
                      onChange={handleEditProdChange}
                      className="products-ui-input-xs"
                    >
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.name}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={editForm.ingredients}
                      name="ingredients"
                      className="products-ui-input-xs"
                      onChange={handleEditProdChange}
                    />
                  </td>
                  <td>
                    <input
                      value={editForm.priceNonAc}
                      name="priceNonAc"
                      className="products-ui-input-xxs"
                      onChange={handleEditProdChange}
                      disabled={editForm.dynamicPrice}
                    />
                  </td>
                  <td>
                    <input
                      value={editForm.priceAc}
                      name="priceAc"
                      className="products-ui-input-xxs"
                      onChange={handleEditProdChange}
                      disabled={editForm.dynamicPrice}
                    />
                  </td>
                  <td>
                    <input
                      value={editForm.priceParcel}
                      name="priceParcel"
                      className="products-ui-input-xxs"
                      onChange={handleEditProdChange}
                      disabled={editForm.dynamicPrice}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      name="gst"
                      checked={!!editForm.gst}
                      onChange={handleEditProdChange}
                    />
                    {editForm.gst && (
                      <input
                        type="number"
                        name="gstPercent"
                        value={editForm.gstPercent}
                        className="products-ui-input-xxs"
                        onChange={handleEditProdChange}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      name="incentive"
                      checked={!!editForm.incentive}
                      onChange={handleEditProdChange}
                    />
                    {editForm.incentive && (
                      <input
                        type="number"
                        name="incentivePercent"
                        value={editForm.incentivePercent}
                        className="products-ui-input-xxs"
                        onChange={handleEditProdChange}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      name="dynamicPrice"
                      checked={!!editForm.dynamicPrice}
                      onChange={handleEditProdChange}
                    />
                  </td>
                  <td>
                    <button
                      className="products-ui-icon-btn"
                      onClick={() => saveEditProd(prod.id)}
                      title="Save"
                    >
                      <FiSave />
                    </button>
                    <button
                      className="products-ui-icon-btn danger"
                      onClick={() => setEditId(null)}
                      title="Cancel"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={prod.id}>
                  <td>{prod.product_id}</td>
                  <td>{prod.name}</td>
                  <td>{prod.section}</td>
                  <td>
                    {(prod.ingredients || []).map((i, idx) => (
                      <span key={i + idx} className="products-ui-chip">
                        {i}
                      </span>
                    ))}
                  </td>
                  <td>{prod.dynamicPrice ? "-" : "₹" + prod.priceNonAc}</td>
                  <td>{prod.dynamicPrice ? "-" : "₹" + prod.priceAc}</td>
                  <td>{prod.dynamicPrice ? "-" : "₹" + prod.priceParcel}</td>
                  <td>{prod.gst ? prod.gstPercent + "%" : "-"}</td>
                  <td>{prod.incentive ? prod.incentivePercent + "%" : "-"}</td>
                  <td>{prod.dynamicPrice ? "✔" : ""}</td>
                  {userRole === "admin" && (
                    <td>
                      <button
                        className="products-ui-icon-btn"
                        onClick={() => startEditProd(prod)}
                        title="Edit"
                      >
                        <FiEdit />
                      </button>
                      <button
                        className="products-ui-icon-btn danger"
                        onClick={() => deleteProduct(prod.id, prod.name)}
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  )}
                </tr>
              )
            )}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={userRole === "admin" ? 10 : 9}
                  style={{ textAlign: "center" }}
                >
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="pagination-ui">
        <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
        >
            Previous
        </button>
        <span>
            Page {currentPage} of {totalPages || 1}
        </span>
        <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
        >
            Next
        </button>
        </div>

      </section>
    </div>
    </>
  );
}
