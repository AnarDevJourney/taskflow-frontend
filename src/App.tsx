import { App as AntApp, ConfigProvider } from "antd";
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
          {/* AntD's App provider — gives hooks access to a theme-aware
              `notification` API (the static antd.notification renders
              outside ConfigProvider and ignores dark mode). Real-time
              notification toasts are opened through it, see
              useNotificationToast. */}
          <AntApp
            notification={{
              placement: "top",
              duration: 3,
              // three cards at once is plenty; older ones roll off
              maxCount: 3,
              // v6 collapses queued cards into a stack by default, which
              // clips the ones underneath — list them instead
              stack: false,
            }}
          >
            <RouterProvider router={router} />
          </AntApp>
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
