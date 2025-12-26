import AppRouter from "./router/AppRouter";
import "./styles/global.css";
import { ThemeProvider } from "./hooks/ThemeProvider";
import ConsentBanner from "./components/ConsentBanner";

export default function App() {
  return (
    <ThemeProvider>
      <ConsentBanner />
      <AppRouter />
    </ThemeProvider>
  );
}
