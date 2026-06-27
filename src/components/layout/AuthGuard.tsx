import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { Navigate } from "react-router-dom";
import { Spin } from "antd";

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
