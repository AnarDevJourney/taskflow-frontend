import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, Alert, Typography, Result, Spin } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { authService } from "../services/authService";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { queryClient } from "@lib/queryClient";
import styles from "./AuthPage.module.css";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form] = Form.useForm();

  // redirect if already logged in
  const { data: currentUser } = useCurrentUser();
  useEffect(() => {
    if (currentUser) navigate("/workspaces", { replace: true });
  }, [currentUser, navigate]);

  // validate the invite token and get email
  const {
    data: invite,
    isLoading: inviteLoading,
    error: inviteError,
  } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => authService.validateInvite(token),
    enabled: !!token,
    retry: false,
  });

  const {
    mutate: register,
    isPending,
    error,
  } = useMutation({
    mutationFn: (values: { name: string; password: string }) =>
      authService.register({ ...values, token }),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      navigate("/workspaces", { replace: true });
    },
  });

  const errorMessage = (() => {
    if (!error) return null;
    const msg = (error as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || "Something went wrong.";
  })();

  // no token in URL
  if (!token) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <Result
            status="error"
            title="Invalid invite link"
            subTitle="This invite link is missing a token. Ask your admin to resend the invitation."
          />
        </div>
      </div>
    );
  }

  // validating invite
  if (inviteLoading) {
    return (
      <div className={styles.wrapper}>
        <div
          className={styles.card}
          style={{ textAlign: "center", padding: "60px 44px" }}
        >
          <Spin size="large" />
          <Text type="secondary" style={{ display: "block", marginTop: 16 }}>
            Validating invite…
          </Text>
        </div>
      </div>
    );
  }

  // invalid or expired invite
  if (inviteError || !invite) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <Result
            status="error"
            title="Invite link expired"
            subTitle="This invite link is invalid or has expired. Ask your admin to send a new one."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
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
            Create your account
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            You were invited as <strong>{invite.role}</strong>
          </Text>
        </div>

        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 6 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => register(values)}
          requiredMark={false}
          size="large"
        >
          <Form.Item label="Email">
            <Input value={invite.email} disabled />
          </Form.Item>

          <Form.Item
            name="name"
            label="Full name"
            rules={[
              { required: true, message: "Please enter your name" },
              { min: 2, message: "Name must be at least 2 characters" },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="John Doe"
              autoComplete="name"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Please choose a password" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={isPending} block>
              {isPending ? "Creating account…" : "Create account"}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
