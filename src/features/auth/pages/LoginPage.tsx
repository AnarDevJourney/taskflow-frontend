import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, Alert, Typography } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { authService, LoginDto } from "../services/authService";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { queryClient } from "@lib/queryClient";
import styles from "./AuthPage.module.css";

const { Title, Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data: currentUser } = useCurrentUser();
  useEffect(() => {
    if (currentUser) navigate("/workspaces", { replace: true });
  }, [currentUser, navigate]);

  const {
    mutate: login,
    isPending,
    error,
  } = useMutation({
    mutationFn: (dto: LoginDto) => authService.login(dto),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      navigate("/workspaces", { replace: true });
    },
  });

  const errorMessage = (() => {
    if (!error) return null;
    const axiosError = error as AxiosError<any>;
    const msg = axiosError?.response?.data?.error?.message;
    if (Array.isArray(msg)) return msg[0];
    return msg || "Something went wrong. Please try again.";
  })();

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <Title level={4} className={styles.appName}>
            TaskFlow
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            Sign in to your workspace
          </Text>
        </div>

        {/* Error */}
        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 6 }}
          />
        )}

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => login(values)}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please enter your password" }]}
            extra={
              <Link to="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            }
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={isPending} block>
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.footer}>
          <Text type="secondary">
            TaskFlow is invite-only. Contact your admin if you need access.
          </Text>
        </div>
      </div>
    </div>
  );
}
