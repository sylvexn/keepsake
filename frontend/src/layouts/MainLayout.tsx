import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Navbar } from "@heroui/navbar";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(true); // For demo, assume logged in
  
  // Navigation links
  const navItems = [
    { name: "Dashboard", href: "/", active: location.pathname === "/" },
    { name: "Photos", href: "/photos", active: location.pathname === "/photos" },
    { name: "Admin", href: "/admin", active: location.pathname === "/admin" },
  ];

  // If not logged in, show login instead
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-6 text-center">Keepsake Login</h1>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full p-2 border rounded"
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="button"
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                onClick={() => setIsLoggedIn(true)}
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-lg font-bold">
              Keepsake
            </Link>
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium ${
                    item.active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Logout
            </button>
          </div>
        </div>
      </Navbar>
      <main>{children}</main>
    </div>
  );
};

export default MainLayout; 