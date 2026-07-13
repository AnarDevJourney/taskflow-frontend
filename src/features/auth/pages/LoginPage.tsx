import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Form, Input, Button, Alert, Typography, message } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { authService, LoginDto } from "../services/authService";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { queryClient } from "@lib/queryClient";
import LanguageSwitcher from "@components/ui/LanguageSwitcher";
import styles from "./AuthPage.module.css";

const { Title, Text } = Typography;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("inviteToken") || "";
  const [form] = Form.useForm();

  const goToWorkspace = () => {
    if (!inviteToken) {
      navigate("/workspaces", { replace: true });
      return;
    }
    authService
      .acceptInvite(inviteToken)
      .then(({ workspaceId }) => {
        message.success(t("auth.register.inviteAccepted"));
        navigate(`/workspaces/${workspaceId}/projects`, { replace: true });
      })
      .catch(() => navigate("/workspaces", { replace: true }));
  };

  const { data: currentUser } = useCurrentUser();
  useEffect(() => {
    if (currentUser) goToWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  const {
    mutate: login,
    isPending,
    error,
  } = useMutation({
    mutationFn: (dto: LoginDto) => authService.login(dto),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      message.success(t("auth.login.loginSuccess"));
      goToWorkspace();
    },
  });

  const errorMessage = (() => {
    if (!error) return null;
    const axiosError = error as AxiosError<any>;
    const msg = axiosError?.response?.data?.error?.message;
    const rawMsg = Array.isArray(msg) ? msg[0] : msg;
    if (rawMsg === "Invalid email or password") {
      return t("auth.login.invalidCredentials");
    }
    return rawMsg || t("auth.login.genericError");
  })();

  return (
    <div className={styles.wrapper}>
      <LanguageSwitcher className={styles.languageSwitch} />
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg
              width="26"
              height="26"
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
            {t("auth.login.appName")}
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            {t("auth.login.subtitle")}
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
            label={t("auth.login.emailLabel")}
            rules={[
              { required: true, message: t("auth.login.emailRequired") },
              { type: "email", message: t("auth.login.emailInvalid") },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "#8c8c8c" }} />}
              placeholder={t("auth.login.emailPlaceholder")}
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={t("auth.login.passwordLabel")}
            rules={[
              { required: true, message: t("auth.login.passwordRequired") },
            ]}
            extra={
              <Link to="/forgot-password" className={styles.forgotLink}>
                {t("auth.login.forgotPassword")}
              </Link>
            }
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder={t("auth.login.passwordPlaceholder")}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={isPending} block>
              {isPending ? t("auth.login.signingIn") : t("auth.login.signIn")}
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.footer}>
          <Text type="secondary">{t("auth.login.footer")}</Text>
        </div>
      </div>
    </div>
  );
}
