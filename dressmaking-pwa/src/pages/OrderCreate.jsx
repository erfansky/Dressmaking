import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import Header from "../components/Header";

export default function OrderCreate() {
  const { customerId } = useParams();
  const [mainCustomer, setMainCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [price, setPrice] = useState(0);
  const [payed, setPayed] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomer();
    fetchProducts();
  }, []);

  const fetchCustomer = async () => {
    try {
      const res = await api.get(`customers/${customerId}/`);
      const main = res.data;
      setMainCustomer(main);
      setCustomers([
        {
          ...main,
          isMain: true,
          selectedProductId: "",
          items: [],
        },
      ]);
    } catch (err) {
      console.error("خطا در دریافت مشتری", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("products/");
      setProducts(res.data.results || res.data);
    } catch (err) {
      console.error("خطا در دریافت محصولات", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.get(`customers/?search=${searchQuery}`);
      setSearchResults(res.data.results || res.data);
    } catch (err) {
      console.error("خطا در جستجوی مشتری‌ها", err);
    }
  };

  const handleAddCustomer = (cust) => {
    if (customers.some((c) => c.id === cust.id)) return;
    setCustomers((prev) => [
      ...prev,
      {
        ...cust,
        isMain: false,
        selectedProductId: "",
        items: [],
      },
    ]);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleAddProduct = async (customerIndex) => {
    const customer = customers[customerIndex];
    if (!customer.selectedProductId) return;

    const product = products.find(
      (p) => p.id === parseInt(customer.selectedProductId)
    );
    if (!product) return;

    // Load customer-specific properties
    let customerProperties = [];
    try {
      const res = await api.get(
        `customer-properties/?customer=${customer.id}&product=${product.id}`
      );
      customerProperties = res.data.results || res.data;
    } catch (err) {
      console.error("خطا در دریافت ویژگی‌های مشتری", err);
    }

    // Load order-specific properties
    let orderPropertiesDefs = [];
    try {
      const res = await api.get(`properties/?product=${product.id}`);
      orderPropertiesDefs = (res.data.results || res.data).filter(
        (p) => !p.is_customer_specific
      );
    } catch (err) {
      console.error("خطا در دریافت ویژگی‌های محصول", err);
    }

    const orderProperties = {};
    orderPropertiesDefs.forEach((prop) => {
      orderProperties[prop.id] =
        prop.value_type === "dropdown" ? "" : "";
    });

    const newCustomers = [...customers];
    newCustomers[customerIndex].items.push({
      product,
      quantity: 1,
      note: "", // 🔹 new field for یادداشت
      customerProperties,
      orderPropertiesDefs,
      orderProperties,
    });
    newCustomers[customerIndex].selectedProductId = "";
    setCustomers(newCustomers);
  };

  const handleOrderPropertyChange = (custIndex, itemIndex, propId, value) => {
    const newCustomers = [...customers];
    newCustomers[custIndex].items[itemIndex].orderProperties[propId] = value;
    setCustomers(newCustomers);
  };

  const handleQuantityChange = (custIndex, itemIndex, value) => {
    const newCustomers = [...customers];
    newCustomers[custIndex].items[itemIndex].quantity = value;
    setCustomers(newCustomers);
  };

  const handleNoteChange = (custIndex, itemIndex, value) => {
    const newCustomers = [...customers];
    newCustomers[custIndex].items[itemIndex].note = value;
    setCustomers(newCustomers);
  };

  const handleRemoveItem = (custIndex, itemIndex) => {
    const newCustomers = [...customers];
    newCustomers[custIndex].items.splice(itemIndex, 1);
    setCustomers(newCustomers);
  };

  const handleSaveOrder = async () => {
    try {
      const orderRes = await api.post("orders/", {
        placed_by: mainCustomer.id,
        price,
        payed,
        status: "in_progress",
      });

      for (const cust of customers) {
        for (const item of cust.items) {
          const selectedProps = {};
          item.orderPropertiesDefs.forEach((prop) => {
            selectedProps[prop.id] = item.orderProperties[prop.id];
          });

          await api.post("order-items/", {
            order: orderRes.data.id,
            customer: cust.id,
            product: item.product.id,
            quantity: item.quantity,
            selected_properties: selectedProps,
            note: item.note || "", // 🔹 include note in backend
          });
        }
      }

      navigate(`/orders/${orderRes.data.id}`);
    } catch (err) {
      console.error("خطا در ذخیره سفارش", err.response?.data || err);
    }
  };

  return (
    <div>
      <Header />
      <div className="page-container">
        <h2>
          ایجاد سفارش برای {mainCustomer?.first_name} {mainCustomer?.last_name}
        </h2>

        {/* 🔹 Search and Add other customers */}
        <div style={{ marginBottom: "20px" }}>
          <h3>افزودن مشتری دیگر</h3>
          <input
            type="text"
            placeholder="جستجو بر اساس نام یا شماره"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={handleSearch}>جستجو</button>

          {searchResults.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              {searchResults.map((c) => (
                <div key={c.id}>
                  {c.first_name} {c.last_name} ({c.phone || "بدون شماره"})
                  <button onClick={() => handleAddCustomer(c)}>افزودن</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔹 Each customer block */}
        {customers.map((cust, custIndex) => (
          <div key={cust.id} className="customer-order-block">
            <h3>
              سفارش برای {cust.first_name} {cust.last_name}{" "}
              {cust.isMain && "(مشتری اصلی)"}
            </h3>

            <div>
              <h4>انتخاب محصول</h4>
              <select
                value={cust.selectedProductId}
                onChange={(e) => {
                  const newCustomers = [...customers];
                  newCustomers[custIndex].selectedProductId = e.target.value;
                  setCustomers(newCustomers);
                }}
              >
                <option value="">انتخاب محصول</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button onClick={() => handleAddProduct(custIndex)}>
                افزودن محصول
              </button>
            </div>

            {/* Items for this customer */}
            {cust.items.length > 0 && (
              <div>
                <h4>محصولات انتخاب‌شده</h4>
                {cust.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="order-item-box"
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      margin: "10px 0",
                    }}
                  >
                    <h5>{item.product.name}</h5>

                    {/* 🔸 Customer-specific properties (read-only) */}
                    {item.customerProperties.length > 0 && (
                      <div style={{ marginBottom: "10px" }}>
                        <h6>ویژگی‌های مشتری</h6>
                        {item.customerProperties.map((p) => (
                          <div key={p.id}>
                            <label>{p.property_name || p.name}: </label>
                            <input
                              type="text"
                              value={p.value}
                              readOnly
                              style={{
                                background: "#f3f3f3",
                                border: "1px solid #ccc",
                                padding: "2px 4px",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 🔹 Order-specific properties */}
                    {item.orderPropertiesDefs.length > 0 && (
                      <div>
                        <h6>ویژگی‌های سفارش</h6>
                        {item.orderPropertiesDefs.map((prop) => (
                          <div key={prop.id}>
                            <label>{prop.name}: </label>
                            {prop.value_type === "number" ? (
                              <input
                                type="number"
                                value={item.orderProperties[prop.id] || ""}
                                onChange={(e) =>
                                  handleOrderPropertyChange(
                                    custIndex,
                                    itemIndex,
                                    prop.id,
                                    parseFloat(e.target.value)
                                  )
                                }
                              />
                            ) : prop.value_type === "text" ? (
                              <input
                                type="text"
                                value={item.orderProperties[prop.id] || ""}
                                onChange={(e) =>
                                  handleOrderPropertyChange(
                                    custIndex,
                                    itemIndex,
                                    prop.id,
                                    e.target.value
                                  )
                                }
                              />
                            ) : prop.value_type === "dropdown" ? (
                              <div>
                                {prop.possible_values.map((option) => (
                                  <label
                                    key={option}
                                    style={{ marginRight: "10px" }}
                                  >
                                    <input
                                      type="radio"
                                      name={`orderProp-${custIndex}-${itemIndex}-${prop.id}`}
                                      value={option}
                                      checked={
                                        item.orderProperties[prop.id] === option
                                      }
                                      onChange={() =>
                                        handleOrderPropertyChange(
                                          custIndex,
                                          itemIndex,
                                          prop.id,
                                          option
                                        )
                                      }
                                    />{" "}
                                    {option}
                                  </label>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 🔹 Note field */}
                    <div style={{ marginTop: "10px" }}>
                      <label>یادداشت: </label>
                      <textarea
                        rows="2"
                        value={item.note || ""}
                        onChange={(e) =>
                          handleNoteChange(
                            custIndex,
                            itemIndex,
                            e.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          border: "1px solid #ccc",
                          padding: "5px",
                          resize: "vertical",
                        }}
                      />
                    </div>

                    <div style={{ marginTop: "10px" }}>
                      <label>تعداد: </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(
                            custIndex,
                            itemIndex,
                            parseInt(e.target.value)
                          )
                        }
                      />
                      <button
                        onClick={() => handleRemoveItem(custIndex, itemIndex)}
                        style={{ marginLeft: "10px" }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Total price and payed */}
        {customers.some((c) => c.items.length > 0) && (
          <div style={{ marginTop: "20px" }}>
            <label>قیمت کل: </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value))}
            />
            <br />
            <label>پرداخت شده: </label>
            <input
              type="number"
              value={payed}
              onChange={(e) => setPayed(parseInt(e.target.value))}
            />
            <br />
            <button onClick={handleSaveOrder}>ذخیره سفارش</button>
          </div>
        )}
      </div>
    </div>
  );
}
