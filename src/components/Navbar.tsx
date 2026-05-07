"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const menuItems = [
  { href: "/", icon: "fa-chart-pie", label: "Dashboard" },
  { href: "/bod-1", icon: "fa-chart-bar", label: "BOD-1" },
  { href: "/bod-2", icon: "fa-chart-line", label: "BOD-2" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <header className="bg-[#1e3a5f] text-white shadow-md">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <i className="fas fa-chart-line text-[#1e3a5f]"></i>
          </div>
          <span className="text-xl font-bold">TalentHub</span>
        </div>

        {!isAuthPage && (
          <nav className="flex items-center gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <i className={`fas ${item.icon}`}></i>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors relative">
                <i className="fas fa-bell text-sm"></i>
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">3</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center font-semibold text-sm">
                  {getInitials(user.username)}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <i className="fas fa-sign-out-alt mr-1"></i>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <i className="fas fa-sign-in-alt mr-1"></i>
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
              >
                <i className="fas fa-user-plus mr-1"></i>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
