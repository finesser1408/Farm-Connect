# Farm Fresh Hub 🌿

An end-to-end e-commerce platform bridging local farmers directly with consumers, restaurants, and grocers. By eliminating intermediaries, Farm Fresh Hub guarantees fairer revenues for agricultural producers and farm-fresh, affordable produce for buyers.

---

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## 🌾 Project Overview

Traditional agricultural supply chains rely heavily on brokers and multiple layers of middlemen, resulting in reduced margins for farmers and inflated prices for consumers. **Farm Fresh Hub** solves this through a unified digital marketplace:
- **Farmers** gain direct market visibility, manage their inventory, set transparent pricing, and receive orders with immediate notifications.
- **Consumers & Businesses** get access to locally harvested, organic, and seasonal farm goods delivered straight from local fields to their doorsteps.

---

## ✨ Key Features

### 🛒 Customer Marketplace
- **Product Discovery**: Browse by categories (Vegetables, Fruits, Grains, Dairy & Eggs, Herbs & Spices, Honey & Preserves, Livestock).
- **Search & Filter**: Real-time search by keyword, price range, and category.
- **Shopping Cart & Checkout**: Seamless multi-item cart management, address details, and order submission.
- **Order Tracking**: Real-time progress updates from "Order Placed" to "Delivered".

### 👨‍🌾 Farmer Dashboard
- **Product Management**: List new harvest items with custom photos, stock counts, descriptions, and pricing.
- **Real-Time Order Processing**: Review incoming customer orders with the ability to accept or reject them.
- **Inventory Tracking**: Stock levels automatically adjust as orders are placed and processed.
- **Profile & Farm Information**: Customize farm location, contact details, and farm background.

### 🛡️ Administration & Moderation
- **Moderation Tools**: Monitor listings, approve or remove questionable products.
- **User Management**: Oversee registered farmers and customer accounts.
- **Platform Metrics**: Overview of active orders, registered farmers, and transaction volumes.

### ✉️ Email Notifications
- Automated email dispatch for order placement confirmations.
- Real-time email updates when order status changes (Accepted, Shipped, Delivered).
- Secure password reset via tokenized email links.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **State & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query) & [Axios](https://axios-http.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

### Backend
- **Framework**: [Django 4.2+](https://www.djangoproject.com/) & [Django REST Framework](https://www.django-rest-framework.org/)
- **Authentication**: JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
- **Database**: PostgreSQL (Production) / SQLite (Development)
- **CORS**: `django-cors-headers`
- **Email Service**: Python SMTP integration with HTML email templates

---

## 📁 Project Structure

```text
farm-fresh-hub/
├── backend/
│   ├── backend/             # Django project settings, ASGI/WSGI, routing, email services
│   ├── products/            # Product catalog, categories, inventory management
│   ├── orders/              # Carts, orders, checkout, farmer fulfillment
│   ├── users/               # Custom user model, farmer profiles, JWT auth
│   ├── manage.py            # Django management CLI
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── public/              # Static public assets, favicon, placeholder icons
│   ├── src/
│   │   ├── assets/          # Category banners and harvest imagery
│   │   ├── components/      # Reusable UI components (Navbar, Footer, ProductCard, etc.)
│   │   ├── hooks/           # Custom React hooks (toast, mobile detection)
│   │   ├── layouts/         # Layout wrappers (AdminLayout, FarmerLayout)
│   │   ├── lib/             # API client, contexts (Auth, Cart), service abstractions
│   │   ├── pages/           # Application views (Marketplace, Details, Dashboards, About)
│   │   ├── App.tsx          # Root router and providers
│   │   └── main.tsx         # React DOM entry point
│   ├── package.json         # Frontend dependencies and scripts
│   ├── tailwind.config.ts   # Design tokens & Tailwind theme configuration
│   └── vite.config.ts       # Vite build & development configuration
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**
- **Python**: v3.10 or higher
- **Git**

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Create a `.env` file inside `backend/`:
   ```env
   SECRET_KEY=your-django-secret-key
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   DATABASE_URL=sqlite:///db.sqlite3
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_HOST_USER=your-email@example.com
   EMAIL_HOST_PASSWORD=your-app-password
   EMAIL_USE_TLS=True
   ```

5. **Run database migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Create an admin superuser**:
   ```bash
   python manage.py createsuperuser
   ```

7. **Start the Django development server**:
   ```bash
   python manage.py runserver 8000
   ```
   The backend API will be available at `http://127.0.0.1:8000/`.

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file inside `frontend/`:
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The frontend will be running at `http://localhost:8080/`.

---

## 📡 API Endpoints

| Endpoint | Method | Description | Access |
|---|---|---|---|
| `/api/v1/auth/register/` | `POST` | Register customer or farmer | Public |
| `/api/v1/auth/login/` | `POST` | Authenticate & obtain JWT tokens | Public |
| `/api/v1/auth/token/refresh/` | `POST` | Refresh access token | Public |
| `/api/v1/auth/profile/` | `GET`, `PUT` | Retrieve or update user profile | Authenticated |
| `/api/v1/products/` | `GET` | List products (filtering, search, pagination) | Public |
| `/api/v1/products/` | `POST` | Create a new product listing (multipart supported) | Farmer / Admin |
| `/api/v1/products/<slug>/` | `GET`, `DELETE` | Retrieve or delete specific product | Public / Farmer |
| `/api/v1/products/categories/` | `GET` | List all product categories | Public |
| `/api/v1/cart/orders/` | `GET` | List current user's orders | Customer |
| `/api/v1/cart/orders/create/` | `POST` | Place a new order | Customer |
| `/api/v1/cart/orders/<id>/` | `GET` | Retrieve order details & tracking status | Customer |
| `/api/v1/cart/farmer/items/` | `GET` | View orders placed for farmer's products | Farmer |
| `/api/v1/cart/farmer/items/<id>/status/` | `PATCH` | Update item status (Accept / Reject) | Farmer |

---

## 📄 License
This project is licensed under the MIT License.
