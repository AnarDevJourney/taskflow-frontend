import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, Alert, Typography, Result } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { authService } from "../services/authService";
import styles from "./AuthPage.module.css";

const { Title, Text } = Typography;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form] = Form.useForm();

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: (values: { password: string }) =>
      authService.resetPassword({ token, password: values.password }),
  });

  const errorMessage = (() => {
    if (!error) return null;
    const msg = (error as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || "Something went wrong.";
  })();

  if (!token) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <Result
            status="error"
            title="Invalid reset link"
            subTitle="This password reset link is missing a token. Please request a new one."
            extra={
              <Button
                type="primary"
                onClick={() => navigate("/forgot-password")}
              >
                Request new link
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <Result
            status="success"
            title="Password updated"
            subTitle="Your password has been changed successfully."
            extra={
              <Button type="primary" onClick={() => navigate("/login")}>
                Sign in
              </Button>
            }
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
            New password
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            Choose a strong password for your account
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
          onFinish={(values) => mutate(values)}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="password"
            label="New password"
            rules={[
              { required: true, message: "Please enter a password" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="••••••••"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="Confirm password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="••••••••"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={isPending} block>
              {isPending ? "Updating…" : "Update password"}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
