# 🚀 How to Run TaxSathi AI (Frontend & Backend)

Follow the simple commands below to start both the backend and frontend on your machine.

---

## 🖥️ Terminal 1 — Start the Backend (FastAPI)

Open a terminal (PowerShell), navigate to the backend folder, activate the virtual environment, and run the server:

```powershell
cd d:\T_APPLICATIONS\taxsathi-ai\backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

> **Direct One-Liner (PowerShell):**
> ```powershell
> cd d:\T_APPLICATIONS\taxsathi-ai\backend; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
> ```

* Backend runs at: **http://localhost:8000**
* Interactive Swagger Docs: **http://localhost:8000/docs**
* Health Check: **http://localhost:8000/health**

---

## 🌐 Terminal 2 — Start the Frontend (Vite + React)

Open a **second** terminal, navigate to the frontend folder, and start the development server:

```powershell
cd d:\T_APPLICATIONS\taxsathi-ai\frontend-web
npm run dev
```

* Frontend UI runs at: **http://localhost:5173**

---

## 🔑 Login Credentials

When prompted in the web application:
* **Admin Email:** `admin@taxsathi.ai`
* **Admin Password:** `admin123456`

---

## 🛑 How to Stop the Servers

In each terminal window, press:
```text
Ctrl + C
```

