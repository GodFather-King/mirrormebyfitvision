import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureRefFromUrl } from "./lib/referralCapture";

// Capture referral code from URL before the app boots
captureRefFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
