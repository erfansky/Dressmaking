import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import Header from "../components/Header";
import jalaali from "jalaali-js";

export default function OrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [price, setPrice] = useState(0);
  const [payed, setPayed] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
  try {
    // Fetch order
    const res = await api.get(`orders/${orderId}/`);
    const orderData = res.data;

    // Fetch customer info
    let customerName = orderData.placed_by;
    try {
      const customerRes = await api.get(`customers/${orderData.placed_by}/`);
      const customer = customerRes.data;
      customerName = `${customer.first_name} ${customer.last_name}`;
    } catch (err) {
      console.error("خطا در دریافت اطلاعات مشتری", err);
    }

    setOrder({ ...orderData, placed_by_name: customerName });
    setPrice(orderData.price ?? 0);
    setPayed(orderData.payed ?? 0);
    setStatus(orderData.status);

    // Fetch order items
    const itemsRes = await api.get(`order-items/?order=${orderId}`);
    const orderItems = itemsRes.data.results || itemsRes.data;

    // Map each order item
    const mappedItems = await Promise.all(
  orderItems.map(async (item) => {
    // Fetch product name
    const productRes = await api.get(`products/${item.product}/`);
    const productName = productRes.data.name;

    // Fetch customer info for this item
    let customerName = item.customer; // fallback
    if (item.customer) {
      try {
        const customerRes = await api.get(`customers/${item.customer}/`);
        const customer = customerRes.data;
        customerName = `${customer.first_name} ${customer.last_name}`;
      } catch (err) {
        console.error("خطا در دریافت اطلاعات مشتری محصول", err);
      }
    }

    // Fetch customer-specific properties
    const custPropsRes = await api.get(
      `customer-properties/?customer=${orderData.placed_by}&property__product=${item.product}`
    );
    const customerProperties = (custPropsRes.data.results || []).map((p) => ({
      id: p.id,
      name: p.property_name || p.property?.name || p.name,
      value: p.value ?? "",
    }));

    // Map order-specific properties
    const orderPropertiesDefs = [];
    for (const [propId, value] of Object.entries(item.selected_properties || {})) {
      try {
        const propRes = await api.get(`properties/${propId}/`);
        orderPropertiesDefs.push({
          id: propId,
          name: propRes.data.name,
          value,
        });
      } catch {
        orderPropertiesDefs.push({ id: propId, name: propId, value });
      }
    }

    return {
      ...item,
      productName,
      customerName,         
      customerProperties,
      orderPropertiesDefs,
    };
  })
);

    setItems(mappedItems);
  } catch (err) {
    console.error("خطا در دریافت سفارش", err);
  }
};

const toJalaliDate = (isoDate) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${jy}/${jm}/${jd} ${hh}:${mm}:${ss}`;
    };

  const handleUpdateOrder = async () => {
    try {
      await api.put(`orders/${orderId}/`, {
        price: parseFloat(price) || 0,
        payed: parseFloat(payed) || 0,
        status,
      });
      alert("سفارش با موفقیت بروزرسانی شد");
      fetchOrder();
    } catch (err) {
      console.error("خطا در بروزرسانی سفارش", err.response?.data || err);
    }
  };

  return (
    <div>
      <Header />
      <div className="page-container">
        <h2>گزارش سفارش</h2>
        {order ? (
          <div>
            <p><strong>شناسه سفارش:</strong> {order.id}</p>
            <p><strong>مشتری:</strong> {order.placed_by_name || order.placed_by}</p>
            <p><strong>تاریخ ایجاد:</strong> {toJalaliDate(order.created_at)}</p>

            <h3>محصولات سفارش</h3>
            {items.map((item, index) => (
              <div key={index} className="order-item-box">
                <p><strong>مشتری: </strong> {item.customerName}</p>
                <h4>{item.productName}</h4>
                <p><strong>تعداد:</strong> {item.quantity}</p>

                {/* Customer-specific properties */}
                {item.customerProperties.length > 0 && (
                  <div>
                    <h5>ویژگی‌های مشتری</h5>
                    {item.customerProperties.map((p) => (
                      <div key={p.id}>
                        <label>{p.name}: </label>
                        <input type="text" value={p.value ?? ""} readOnly />
                      </div>
                    ))}
                  </div>
                )}

                {/* Order-specific properties */}
                {item.orderPropertiesDefs.length > 0 && (
                  <div>
                    <h5>ویژگی‌های سفارش</h5>
                    {item.orderPropertiesDefs.map((prop) => (
                      <div key={prop.id}>
                        <label>{prop.name}: </label>
                        <input type="text" value={prop.value ?? ""} readOnly />
                      </div>
                    ))}
                  </div>
                )}
                {/* Note field */}
                {item.note && (
                  <div>
                    <h5>یادداشت</h5>
                    <textarea value={item.note} readOnly />
                  </div>
                )}
              </div>
            ))}

            <h3>جزئیات مالی و وضعیت سفارش</h3>
            <div>
              <label>قیمت کل: </label>
              <input
                type="number"
                value={price ?? ""}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label>پرداخت شده: </label>
              <input
                type="number"
                value={payed ?? ""}
                onChange={(e) => setPayed(e.target.value)}
              />
            </div>
            <div>
              <label>وضعیت: </label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="in_progress">در حال انجام</option>
                <option value="completed">تکمیل شده</option>
              </select>
            </div>

            <button onClick={handleUpdateOrder} style={{ marginTop: "10px" }}>
              بروزرسانی سفارش
            </button>
          </div>
        ) : (
          <p>در حال بارگذاری...</p>
        )}
      </div>
    </div>
  );
}
