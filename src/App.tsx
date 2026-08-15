import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { store } from "@store/index";
import { queryClient } from "@lib/queryClient";
import { router } from "@router/index";
import { lightTheme } from "@styles/theme";

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={lightTheme}>
          <RouterProvider router={router} />
          <ToastContainer
            position="top-right"
            autoClose={3500}
            hideProgressBar
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="light"
          />
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  );
}
