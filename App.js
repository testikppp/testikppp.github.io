import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PingPongGame from "./components/PingPongGame";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PingPongGame />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;