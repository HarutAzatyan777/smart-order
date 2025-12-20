import AppRouter from "./router/AppRouter";
import "./styles/global.css";
import { ThemeProvider } from "./hooks/useTheme";

export default function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  );
}
