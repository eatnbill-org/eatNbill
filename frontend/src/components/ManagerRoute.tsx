import { Navigate } from "react-router-dom";

export default function ManagerRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('staff_token') || localStorage.getItem('waiter_token');
  const staffData = localStorage.getItem('staff_data') || localStorage.getItem('waiter_data');

  if (!token || !staffData) {
    return <Navigate to="/auth/login" replace />;
  }

  try {
    const staff = JSON.parse(staffData);
    if (staff?.role !== 'MANAGER') {
      return <Navigate to="/staff/orders" replace />;
    }
  } catch {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}
