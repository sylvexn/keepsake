import { Route, Routes } from "react-router-dom";

import Dashboard from "@/pages/Dashboard";
import Photos from "@/pages/Photos";
import Admin from "@/pages/Admin";

function App() {
  return (
    <Routes>
      <Route element={<Dashboard />} path="/" />
      <Route element={<Photos />} path="/photos" />
      <Route element={<Admin />} path="/admin" />
    </Routes>
  );
}

export default App;
