import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Header from "../components/Header";
import "../App.css";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (url = "customers/") => {
    try {
      const res = await api.get(url, { params: search ? { search } : {} });
      const data = res.data;
      setCustomers(data.results || []);
      setNextPage(data.next);
      setPrevPage(data.previous);
    } catch (err) {
      console.error("خطا در دریافت مشتریان", err);
    }
  };

  const handleCustomerChange = (e) => {
    setCustomerForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`customers/${editingCustomer.id}/`, customerForm);
      } else {
        await api.post("customers/", customerForm);
      }
      setCustomerForm({ first_name: "", last_name: "", phone: "" });
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      console.error("خطا در ذخیره مشتری", err);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone || "",
    });
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این مشتری را حذف کنید؟"))
      return;
    try {
      await api.delete(`customers/${id}/`);
      fetchCustomers();
    } catch (err) {
      console.error("خطا در حذف مشتری", err);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    fetchCustomers("customers/?search=" + e.target.value);
  };

  const handleNextPage = () => {
    if (nextPage) fetchCustomers(nextPage.replace(api.defaults.baseURL, ""));
  };
  const handlePrevPage = () => {
    if (prevPage) fetchCustomers(prevPage.replace(api.defaults.baseURL, ""));
  };

  const handleCreateOrder = (customerId) => {
    navigate(`/orders/create/${customerId}`);
  };

  return (
    <div>
      <Header />
      <div className="page-container">
        <h2>مدیریت مشتریان</h2>

        {/* Customer Form */}
        <form onSubmit={handleCustomerSubmit} className="form-box">
          <input
            type="text"
            name="first_name"
            placeholder="نام"
            value={customerForm.first_name}
            onChange={handleCustomerChange}
            required
          />
          <input
            type="text"
            name="last_name"
            placeholder="نام خانوادگی"
            value={customerForm.last_name}
            onChange={handleCustomerChange}
            required
          />
          <input
            type="text"
            name="phone"
            placeholder="شماره تلفن (اختیاری)"
            value={customerForm.phone}
            onChange={handleCustomerChange}
          />
          <button type="submit">
            {editingCustomer ? "ذخیره تغییرات" : "افزودن مشتری"}
          </button>
          {editingCustomer && (
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(null);
                setCustomerForm({ first_name: "", last_name: "", phone: "" });
              }}
              className="cancel-btn"
            >
              لغو
            </button>
          )}
        </form>

        {/* Search */}
        <input
          type="text"
          placeholder="جستجو..."
          value={search}
          onChange={handleSearchChange}
          className="search-box"
        />

        {/* Customer Table */}
        <table>
          <thead>
            <tr>
              <th>نام</th>
              <th>نام خانوادگی</th>
              <th>شماره تلفن</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.first_name}</td>
                <td>{c.last_name}</td>
                <td>{c.phone}</td>
                <td>
                  <button onClick={() => handleEditCustomer(c)}>ویرایش</button>
                  <button onClick={() => handleDeleteCustomer(c.id)}>حذف</button>
                  <button onClick={() => navigate(`/customer/${c.id}`)}>
                    مدیریت ویژگی‌ها
                  </button>
                  <button onClick={() => handleCreateOrder(c.id)}>
                    ایجاد سفارش
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination-buttons">
          {prevPage && <button onClick={handlePrevPage}>صفحه قبل</button>}
          {nextPage && <button onClick={handleNextPage}>صفحه بعد</button>}
        </div>
      </div>
    </div>
  );
}
