import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { store } from "@store/index";
import { queryClient } from "@lib/queryClient";
import { router } from "@router/index";
import { lightTheme, darkTheme } from "@styles/theme";
import { useTheme } from "@lib/theme/ThemeProvider";

export default function App() {
  const { resolvedTheme } = useTheme();

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={resolvedTheme === "dark" ? darkTheme : lightTheme}>
          <RouterProvider router={router} />
          <ToastContainer
            position="top-right"
            autoClose={3500}
            hideProgressBar
            newestOnTop
            closeOnClick
            pauseOnHover
            theme={resolvedTheme}
          />
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  );
}
