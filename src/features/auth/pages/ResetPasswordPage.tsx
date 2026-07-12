import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, Alert, Typography, Result } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { authService } from "../services/authService";
import LanguageSwitcher from "@components/ui/LanguageSwitcher";
import styles from "./AuthPage.module.css";

const { Title, Text } = Typography;

export default function ResetPasswordPage() {
  const { t } = useTranslation();
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
    return Array.isArray(msg) ? msg[0] : msg || t("auth.resetPassword.genericError");
  })();

  if (!token) {
    return (
      <div className={styles.wrapper}>
        <LanguageSwitcher className={styles.languageSwitch} />
        <div className={styles.card}>
          <Result
            status="error"
            title={t("auth.resetPassword.invalidLinkTitle")}
            subTitle={t("auth.resetPassword.invalidLinkSubtitle")}
            extra={
              <Button
                type="primary"
                onClick={() => navigate("/forgot-password")}
              >
                {t("auth.resetPassword.requestNewLink")}
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
        <LanguageSwitcher className={styles.languageSwitch} />
        <div className={styles.card}>
          <Result
            status="success"
            title={t("auth.resetPassword.successTitle")}
            subTitle={t("auth.resetPassword.successSubtitle")}
            extra={
              <Button type="primary" onClick={() => navigate("/login")}>
                {t("auth.resetPassword.signIn")}
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
            {t("auth.resetPassword.title")}
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            {t("auth.resetPassword.subtitle")}
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
            label={t("auth.resetPassword.passwordLabel")}
            rules={[
              { required: true, message: t("auth.resetPassword.passwordRequired") },
              { min: 8, message: t("auth.resetPassword.passwordMinLength") },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder={t("auth.resetPassword.passwordPlaceholder")}
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            label={t("auth.resetPassword.confirmLabel")}
            dependencies={["password"]}
            rules={[
              { required: true, message: t("auth.resetPassword.confirmRequired") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(t("auth.resetPassword.confirmMismatch")),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder={t("auth.resetPassword.passwordPlaceholder")}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={isPending} block>
              {isPending
                ? t("auth.resetPassword.updating")
                : t("auth.resetPassword.updatePassword")}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
