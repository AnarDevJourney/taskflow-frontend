import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, Alert, Typography, Result } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { authService } from "../services/authService";
import LanguageSwitcher from "@components/ui/LanguageSwitcher";
import styles from "./AuthPage.module.css";

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: (dto: { email: string }) =>
      authService.forgotPassword({ ...dto, lang: i18n.resolvedLanguage }),
  });

  const errorMessage = (() => {
    if (!error) return null;
    const msg = (error as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || t("auth.forgotPassword.genericError");
  })();

  if (isSuccess) {
    return (
      <div className={styles.wrapper}>
        <LanguageSwitcher className={styles.languageSwitch} />
        <div className={styles.card}>
          <Result
            status="success"
            title={t("auth.forgotPassword.successTitle")}
            subTitle={t("auth.forgotPassword.successSubtitle")}
            extra={
              <Button type="primary" onClick={() => navigate("/login")}>
                {t("auth.forgotPassword.backToLogin")}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <LanguageSwitcher className={styles.languageSwitch} />
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
            {t("auth.forgotPassword.title")}
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            {t("auth.forgotPassword.subtitle")}
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
            name="email"
            label={t("auth.forgotPassword.emailLabel")}
            rules={[
              { required: true, message: t("auth.forgotPassword.emailRequired") },
              { type: "email", message: t("auth.forgotPassword.emailInvalid") },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "#8c8c8c" }} />}
              placeholder={t("auth.forgotPassword.emailPlaceholder")}
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={isPending} block>
              {isPending
                ? t("auth.forgotPassword.sending")
                : t("auth.forgotPassword.sendResetLink")}
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.backLink}>
            <ArrowLeftOutlined style={{ marginRight: 6 }} />
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
