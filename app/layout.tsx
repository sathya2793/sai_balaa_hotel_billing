"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import "../styles/globals.css";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (pathname.startsWith("/login")) return;
    const role = localStorage.getItem("userRole");
    const email = localStorage.getItem("userEmail");
    if (!email) router.push("/login");
    setUserRole(role);
    setUserEmail(email);
  }, [pathname, router]);

  // Hide sidebar/topbar on login page
  if (pathname.startsWith("/login")) {
    return (
      <html lang="en"><body>{children}</body></html>
    );
  }

  const menuItems = [
    { name: "Billing", href: "/billing" },
    { name: "Expenses", href: "/expenses" },
    { name: "Reports", href: "/reports" },
  ];
  if (userRole === "admin" || userRole === "manager") {
    menuItems.push({ name: "Products", href: "/products" });
    menuItems.push({ name: "Employees", href: "/employees" });
  }
  if (userRole === "admin") {
    menuItems.push({ name: "Manage Users", href: "/manage-users" });
  }

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <html lang="en">
      <body className="layout-body">
        <aside className="sidebar">
          <h1 className="sidebar-title">Billing App</h1>
          <p className="sidebar-user">User: {userEmail} ({userRole})</p>
          <nav>
            <ul className="sidebar-menu">
              {menuItems.map(item => (
                <li key={item.name}>
                  <Link href={item.href} className="sidebar-link">{item.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="main-area">
          <header className="topbar">
            <h2>{menuItems.find(m => m.href === pathname)?.name || "Dashboard"}</h2>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </header>
          <main className="page-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
