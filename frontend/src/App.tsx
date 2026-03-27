import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { MerchantPage } from "./pages/MerchantPage";
import { PayPage } from "./pages/PayPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/merchant" element={<MerchantPage />} />
      <Route path="/pay/:id" element={<PayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
