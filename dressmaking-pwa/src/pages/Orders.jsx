

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Header from "../components/Header";
import jalaali from "jalaali-js";
import "../App.css";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const navigate = useNavigate();

  const statusMap = {
    in_progress: "در حال انجام",
    completed: "تکمیل شده",
    cancelled: "لغو شده",
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toJalaliDate = (isoDate) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${jy}/${jm}/${jd}`;
  };

  const fetchOrders = async (url = "orders/") => {
    try {
      const res = await api.get(url, { params: search ? { search } : {} });
      const data = res.data;

      const ordersData = data.results || data;
      setNextPage(data.next);
      setPrevPage(data.previous);

      // Fetch customer names
      const ordersWithCustomerNames = await Promise.all(
        ordersData.map(async (order) => {
          let customerName = order.placed_by;
          try {
            const custRes = await api.get(`customers/${order.placed_by}/`);
            const cust = custRes.data;
            customerName = `${cust.first_name} ${cust.last_name}`;
          } catch (err) {
            console.error("خطا در دریافت اطلاعات مشتری", err);
          }
          return { ...order, placed_by_name: customerName };
        })
      );

      setOrders(ordersWithCustomerNames);
    } catch (err) {
      console.error("خطا در دریافت سفارش‌ها", err);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleSearchEnter = (e) => {
    if (e.key === "Enter") fetchOrders();
  };

  const handleNextPage = () => {
    if (nextPage) fetchOrders(nextPage.replace(api.defaults.baseURL, ""));
  };

  const handlePrevPage = () => {
    if (prevPage) fetchOrders(prevPage.replace(api.defaults.baseURL, ""));
  };

  return (
    <div>
      <Header />
      <div className="page-container">
        <h2>مدیریت سفارش‌ها</h2>
        <div className="search-container">
        <input
          type="text"
          placeholder="جستجو سفارش..."
          value={search}
          onChange={handleSearchChange}
          onKeyDown={handleSearchEnter}
          className="search-box"
        />
        </div>

        <table>
          <thead>
            <tr>
              <th>کد سفارش</th>
              <th>مشتری</th>
              <th>مبلغ</th>
              <th>پرداختی</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.placed_by_name}</td>
                <td>{o.price}</td>
                <td>{o.payed}</td>
                <td>{statusMap[o.status] || o.status}</td>
                <td>
                  <button onClick={() => navigate(`/orders/${o.id}`)}>
                    مشاهده و ویرایش
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination-buttons" style={{ marginTop: "10px" }}>
          {prevPage && <button onClick={handlePrevPage}>صفحه قبل</button>}
          {nextPage && <button onClick={handleNextPage}>صفحه بعد</button>}
        </div>
      </div>
    </div>
  );
}
