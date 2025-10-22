# Dressmaking PWA

A **Progressive Web Application (PWA)** for managing a small dressmaking workshop — built with **Django REST Framework (backend)** and **React + Vite (frontend)**.

This project provides a secure API for customers, products, orders, and properties, and a simple PWA frontend optimized for Persian users.

---

## 🚀 Features

### 🖥 Backend (Django + DRF)
- JWT authentication with access & refresh tokens  
- CRUD APIs for:
  - Customers
  - Products
  - Product properties
  - Customer-specific properties
  - Orders and order items
- Custom validation for dynamic product properties
- Django admin panel for management
- Supports filtering, ordering, and search

### 📱 Frontend (React + PWA)
- Persian RTL user interface
- JWT-based login and automatic token refresh
- View, create, and edit products, customers, and orders
- Responsive design for mobile and desktop
- Installable as an offline-capable PWA

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| Backend | Django 5, Django REST Framework |
| Auth | JWT (SimpleJWT) |
| Frontend | React + Vite |
| Styling | Pure CSS |
| Database | SQLite / PostgreSQL |
| Deployment | Local network (Raspberry Pi / Laptop) |

---

## ⚙️ Installation

### 1️⃣ Backend Setup

```bash
# Clone repo
git clone https://github.com/yourusername/dressmaking-pwa.git
cd dressmaking-pwa/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add values for SECRET_KEY, DATABASE, and DEBUG

# Run migrations and server
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
