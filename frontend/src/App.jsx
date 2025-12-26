import AppRouter from "./router/AppRouter";
import "./styles/global.css";
import { ThemeProvider } from "./hooks/ThemeProvider";
import ConsentBanner from "./components/ConsentBanner";
import FloatingContact from "./components/FloatingContact/FloatingContact";

export default function App() {
  return (
    <ThemeProvider>
      <ConsentBanner />
      <FloatingContact />
      <AppRouter />
    </ThemeProvider>
  );
}
