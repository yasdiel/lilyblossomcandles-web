import AdminApp from "./admin/AdminApp";
import Storefront from "./Storefront";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const isAdmin = path === "/admin" || path.endsWith("/admin");

  return isAdmin ? <AdminApp /> : <Storefront />;
}
