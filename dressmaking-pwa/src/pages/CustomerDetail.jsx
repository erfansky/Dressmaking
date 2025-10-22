import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import Header from "../components/Header";
import "../App.css";

export default function CustomerDetail() {
  const { customerId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerProperties, setCustomerProperties] = useState([]);
  const [propertyValues, setPropertyValues] = useState({}); // {propertyId: value}

  useEffect(() => {
    fetchCustomer();
    fetchProducts();
  }, []);

  const fetchCustomer = async () => {
    try {
      const res = await api.get(`customers/${customerId}/`);
      setCustomer(res.data);
    } catch (err) {
      console.error("خطا در دریافت اطلاعات مشتری", err);
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

  const handleSelectProduct = async (product) => {
    setSelectedProduct(product);
    setCustomerProperties([]);
    setPropertyValues({});

    try {
      // Fetch all properties for the product
      const allPropsRes = await api.get(`properties/?product=${product.id}`);
      const allProps = allPropsRes.data.results || allPropsRes.data;

      // Filter: only customer-specific (ignore order-specific)
      const filteredProps = allProps.filter((p) => p.is_customer_specific && !p.is_order_specific);

      // Fetch existing customer-properties for this product and customer
      const customerPropsRes = await api.get(
        `customer-properties/?customer=${customerId}&property__product=${product.id}`
      );
      const existingCustomerProps = customerPropsRes.data.results || customerPropsRes.data;

      // Map existing values to propertyValues
      const values = {};
      filteredProps.forEach((prop) => {
        const existing = existingCustomerProps.find((p) => p.property === prop.id);
        if (prop.value_type === "dropdown") {
          values[prop.id] = existing?.value
            ? Array.isArray(existing.value)
              ? existing.value
              : existing.value.toString().split(",")
            : [];
        } else if (prop.value_type === "number") {
          values[prop.id] = existing?.value ?? 0;
        } else {
          values[prop.id] = existing?.value ?? "";
        }
      });

      setCustomerProperties(filteredProps);
      setPropertyValues(values);
    } catch (err) {
      console.error("خطا در دریافت ویژگی‌های مشتری", err);
    }
  };

  const handlePropertyValueChange = (property, value) => {
    setPropertyValues((prev) => ({
      ...prev,
      [property.id]: value,
    }));
  };

  const handleSaveProperties = async () => {
    if (!selectedProduct || !customer) return;

    try {
      // Fetch existing customer-properties for this customer & product
      const existsRes = await api.get(
        `customer-properties/?customer=${customerId}&property__product=${selectedProduct.id}`
      );
      const existingProps = existsRes.data.results || existsRes.data;

      for (const prop of customerProperties) {
        if (!prop.is_customer_specific || prop.is_order_specific) continue;

        let valueToSend = propertyValues[prop.id];

        if (prop.value_type === "number") valueToSend = Number(valueToSend) || 0;
        else if (prop.value_type === "text") valueToSend = valueToSend?.toString() || "";
        else if (prop.value_type === "dropdown") {
          // Send as comma-separated string if array
          if (Array.isArray(valueToSend)) valueToSend = valueToSend.join(",");
        }

        const payload = {
          customer: parseInt(customerId),
          property: prop.id,
          value: valueToSend,
        };

        // Update if exists, otherwise create
        const existing = existingProps.find((p) => p.property === prop.id);
        if (existing) {
          await api.put(`/customer-properties/${existing.id}/`, payload);
        } else {
          await api.post("/customer-properties/", payload);
        }
      }

      alert("ویژگی‌ها ذخیره شدند ✅");
    } catch (err) {
      console.error("خطا در ذخیره ویژگی‌ها", err.response?.data || err);
    }
  };

  if (!customer) return <div>در حال بارگذاری اطلاعات مشتری...</div>;

  return (
    <div>
      <Header />
      <div className="page-container">
        <h2>ویژگی‌های مشتری: {customer.first_name} {customer.last_name}</h2>

        <label>انتخاب محصول:</label>
        <select
          value={selectedProduct?.id || ""}
          onChange={(e) =>
            handleSelectProduct(
              products.find((p) => p.id === parseInt(e.target.value))
            )
          }
        >
          <option value="">انتخاب کنید</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {selectedProduct && customerProperties.length > 0 && (
          <div className="customer-properties-form">
            {customerProperties.map((prop) => (
              <div key={prop.id} className="property-input">
                <label>{prop.name}</label>
                {prop.value_type === "dropdown" ? (
                  prop.possible_values.map((val) => (
                    <label key={val}>
                      <input
                        type="checkbox"
                        checked={propertyValues[prop.id]?.includes(val)}
                        onChange={(e) => {
                          const arr = propertyValues[prop.id] || [];
                          if (e.target.checked) {
                            handlePropertyValueChange(prop, [...arr, val]);
                          } else {
                            handlePropertyValueChange(prop, arr.filter((v) => v !== val));
                          }
                        }}
                      />
                      {val}
                    </label>
                  ))
                ) : (
                  <input
                    type={prop.value_type === "number" ? "number" : "text"}
                    value={propertyValues[prop.id] || ""}
                    onChange={(e) => handlePropertyValueChange(prop, e.target.value)}
                  />
                )}
              </div>
            ))}
            <button onClick={handleSaveProperties}>ذخیره ویژگی‌ها</button>
          </div>
        )}
      </div>
    </div>
  );
}
