import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { DealPage } from "./pages/DealPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/deals/:dealId" element={<DealPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
