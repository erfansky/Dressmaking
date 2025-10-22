import { Link } from "react-router-dom";
import "../App.css";

export default function Header() {
  return (
    <header className="main-header">
      <h1>سیستم خیاطی</h1>
      <nav>
        <ul>
          <li><Link to="/customers">مشتریان</Link></li>
          <li><Link to="/products">محصولات</Link></li>
          <li><Link to="/orders">سفارش‌ها</Link></li>
          <li><Link to="/logout">خروج</Link></li>
        </ul>
      </nav>
    </header>
  );
}
