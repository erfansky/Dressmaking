import { useEffect, useState } from "react";
import api from "../api/api";
import Header from "../components/Header";
import "../App.css";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const [selectedProduct, setSelectedProduct] = useState(null); // for properties
  const [properties, setProperties] = useState([]);
  const [editingProperty, setEditingProperty] = useState(null);
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    value_type: "text",
    possible_values: [],
    is_customer_specific: false,
  });
  const [newOption, setNewOption] = useState(""); // for adding dropdown options

  useEffect(() => {
    fetchProducts();
  }, []);

  // --- PRODUCTS ---
  const fetchProducts = async () => {
    try {
      const res = await api.get("products/");
      setProducts(res.data.results || res.data);
    } catch (err) {
      console.error("خطا در دریافت محصولات", err);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`products/${editingProduct.id}/`, formData);
      } else {
        await api.post("products/", formData);
      }
      setFormData({ name: "", description: "" });
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("خطا در ذخیره محصول", err);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({ name: product.name, description: product.description });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این محصول را حذف کنید؟")) return;
    try {
      await api.delete(`products/${id}/`);
      if (selectedProduct?.id === id) setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("خطا در حذف محصول", err);
    }
  };

  // --- PRODUCT PROPERTIES ---
  const fetchProperties = async (productId) => {
    try {
      const res = await api.get(`properties/?product=${productId}`);
      setProperties(res.data.results || res.data);
    } catch (err) {
      console.error("خطا در دریافت ویژگی‌ها", err);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    fetchProperties(product.id);
    setEditingProperty(null);
    setPropertyForm({
      name: "",
      value_type: "text",
      possible_values: [],
      is_customer_specific: false,
    });
    setNewOption("");
  };

  const handlePropertyChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPropertyForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...propertyForm,
        product: selectedProduct.id,
      };

      if (editingProperty) {
        await api.put(`properties/${editingProperty.id}/`, payload);
      } else {
        await api.post("properties/", payload);
      }

      setEditingProperty(null);
      setPropertyForm({
        name: "",
        value_type: "text",
        possible_values: [],
        is_customer_specific: false,
      });
      setNewOption("");
      fetchProperties(selectedProduct.id);
    } catch (err) {
      console.error("خطا در ذخیره ویژگی", err);
    }
  };

  const handleEditProperty = (prop) => {
    setEditingProperty(prop);
    setPropertyForm({
      name: prop.name,
      value_type: prop.value_type,
      possible_values: prop.possible_values || [],
      is_customer_specific: prop.is_customer_specific,
    });
    setNewOption("");
  };

  const handleDeleteProperty = async (id) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این ویژگی را حذف کنید؟")) return;
    try {
      await api.delete(`properties/${id}/`);
      fetchProperties(selectedProduct.id);
    } catch (err) {
      console.error("خطا در حذف ویژگی", err);
    }
  };

  return (
    <div>
      <Header />
      <div className="page-container">
        <h2>مدیریت محصولات</h2>

        {/* Product Form */}
        <form onSubmit={handleSubmit} className="form-box">
          <input
            type="text"
            name="name"
            placeholder="نام محصول"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <textarea
            name="description"
            placeholder="توضیحات محصول"
            value={formData.description}
            onChange={handleChange}
          />
          <button type="submit">
            {editingProduct ? "ذخیره تغییرات" : "افزودن محصول"}
          </button>
          {editingProduct && (
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setFormData({ name: "", description: "" });
              }}
              className="cancel-btn"
            >
              لغو
            </button>
          )}
        </form>

        {/* Product List */}
        <ul className="card-list">
          {products.map((p) => (
            <li key={p.id} className="card">
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <div className="card-actions">
                <button onClick={() => handleEdit(p)}>ویرایش</button>
                <button onClick={() => handleDelete(p.id)}>حذف</button>
                <button onClick={() => handleSelectProduct(p)}>
                  ویژگی‌ها
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Product Properties */}
        {selectedProduct && (
          <div className="properties-section">
            <h3>ویژگی‌های محصول: {selectedProduct.name}</h3>

            {/* Property Form */}
            <form onSubmit={handlePropertySubmit} className="form-box">
              <input
                type="text"
                name="name"
                placeholder="نام ویژگی"
                value={propertyForm.name}
                onChange={handlePropertyChange}
                required
              />
              <select
                name="value_type"
                value={propertyForm.value_type}
                onChange={handlePropertyChange}
              >
                <option value="text">متن</option>
                <option value="number">شماره</option>
                <option value="dropdown">دسته</option>
              </select>

              {/* Dropdown options */}
              {propertyForm.value_type === "dropdown" && (
                <div className="dropdown-options-box">
                  <input
                    type="text"
                    placeholder="افزودن گزینه جدید"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newOption.trim()) {
                        setPropertyForm((prev) => ({
                          ...prev,
                          possible_values: [...prev.possible_values, newOption.trim()],
                        }));
                        setNewOption("");
                      }
                    }}
                  >
                    افزودن گزینه
                  </button>

                  <ul>
                    {propertyForm.possible_values.map((opt, idx) => (
                      <li key={idx}>
                        {opt}{" "}
                        <button
                          type="button"
                          onClick={() =>
                            setPropertyForm((prev) => ({
                              ...prev,
                              possible_values: prev.possible_values.filter(
                                (_, i) => i !== idx
                              ),
                            }))
                          }
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label>
                <input
                  type="checkbox"
                  name="is_customer_specific"
                  checked={propertyForm.is_customer_specific}
                  onChange={handlePropertyChange}
                />{" "}
                ویژگی اختصاصی مشتری
              </label>

              <button type="submit">
                {editingProperty ? "ذخیره تغییرات" : "افزودن ویژگی"}
              </button>
              {editingProperty && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    setPropertyForm({
                      name: "",
                      value_type: "text",
                      possible_values: [],
                      is_customer_specific: false,
                    });
                    setNewOption("");
                  }}
                  className="cancel-btn"
                >
                  لغو
                </button>
              )}
            </form>

            {/* Property List */}
            <ul className="card-list">
              {properties.map((prop) => (
                <li key={prop.id} className="card">
                  <h4>{prop.name}</h4>
                  <p>نوع: {prop.value_type}</p>
                  {prop.value_type === "dropdown" && (
                    <p>گزینه‌ها: {prop.possible_values.join(", ")}</p>
                  )}
                  <p>
                    اختصاصی مشتری:{" "}
                    {prop.is_customer_specific ? "✅" : "❌"}
                  </p>
                  <div className="card-actions">
                    <button onClick={() => handleEditProperty(prop)}>ویرایش</button>
                    <button onClick={() => handleDeleteProperty(prop.id)}>حذف</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

