import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, Alert, Typography, Result, Spin } from "antd";
import { toast } from "@lib/toast";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { authService } from "../services/authService";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { queryClient } from "@lib/queryClient";
import LanguageSwitcher from "@components/ui/LanguageSwitcher";
import styles from "./AuthPage.module.css";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form] = Form.useForm();

  const { data: currentUser } = useCurrentUser();

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

  const sameUserLoggedIn =
    !!currentUser &&
    !!invite &&
    currentUser.email.toLowerCase() === invite.email.toLowerCase();

  // redirect away if already logged in as someone other than the invited user
  useEffect(() => {
    if (currentUser && !inviteLoading && !sameUserLoggedIn) {
      navigate("/workspaces", { replace: true });
    }
  }, [currentUser, inviteLoading, sameUserLoggedIn, navigate]);

  const {
    mutate: register,
    isPending,
    error,
  } = useMutation({
    mutationFn: (values: { name: string; password: string }) =>
      authService.register({ ...values, token }),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      toast.success(t("auth.register.registerSuccess"));
      navigate("/workspaces", { replace: true });
    },
  });

  const {
    mutate: acceptInvite,
    isPending: isAccepting,
    error: acceptError,
  } = useMutation({
    mutationFn: () => authService.acceptInvite(token),
    onSuccess: ({ workspaceId }) => {
      toast.success(t("auth.register.inviteAccepted"));
      navigate(`/workspaces/${workspaceId}/projects`, { replace: true });
    },
  });

  const errorMessage = (() => {
    if (!error) return null;
    const msg = (error as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || t("auth.register.genericError");
  })();

  const acceptErrorMessage = (() => {
    if (!acceptError) return null;
    const msg = (acceptError as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || t("auth.register.genericError");
  })();

  // no token in URL
  if (!token) {
    return (
      <div className={styles.wrapper}>
        <LanguageSwitcher className={styles.languageSwitch} />
        <div className={styles.card}>
          <Result
            status="error"
            title={t("auth.register.invalidInviteTitle")}
            subTitle={t("auth.register.invalidInviteSubtitle")}
          />
        </div>
      </div>
    );
  }

  // validating invite
  if (inviteLoading) {
    return (
      <div className={styles.wrapper}>
        <LanguageSwitcher className={styles.languageSwitch} />
        <div
          className={styles.card}
          style={{ textAlign: "center", padding: "60px 44px" }}
        >
          <Spin size="large" />
          <Text type="secondary" style={{ display: "block", marginTop: 16 }}>
            {t("auth.register.validatingInvite")}
          </Text>
        </div>
      </div>
    );
  }

  // invalid or expired invite
  if (inviteError || !invite) {
    return (
      <div className={styles.wrapper}>
        <LanguageSwitcher className={styles.languageSwitch} />
        <div className={styles.card}>
          <Result
            status="error"
            title={t("auth.register.expiredInviteTitle")}
            subTitle={t("auth.register.expiredInviteSubtitle")}
          />
        </div>
      </div>
    );
  }

  // invited user already has an account and is currently logged in as
  // that same account — just add them back to the workspace, no need
  // to register or re-enter a password
  if (sameUserLoggedIn) {
    return (
      <div className={styles.wrapper}>
        <LanguageSwitcher className={styles.languageSwitch} />
        <div className={styles.card}>
          {acceptErrorMessage && (
            <Alert
              message={acceptErrorMessage}
              type="error"
              showIcon
              style={{ marginBottom: 20, borderRadius: 6 }}
            />
          )}
          <Result
            status="info"
            title={t("auth.register.acceptInviteTitle")}
            subTitle={t("auth.register.acceptInviteSubtitle", {
              email: invite.email,
            })}
            extra={
              <Button
                type="primary"
                loading={isAccepting}
                onClick={() => acceptInvite()}
              >
                {t("auth.register.acceptInviteButton")}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // invited email already has an account, but no one is logged in —
  // send them to log in instead of registering a brand new account
  if (invite.userExists) {
    return (
      <div className={styles.wrapper}>
        <LanguageSwitcher className={styles.languageSwitch} />
        <div className={styles.card}>
          <Result
            status="info"
            title={t("auth.register.existingAccountTitle")}
            subTitle={t("auth.register.existingAccountSubtitle", {
              email: invite.email,
            })}
            extra={
              <Button
                type="primary"
                onClick={() =>
                  navigate(`/login?inviteToken=${encodeURIComponent(token)}`)
                }
              >
                {t("auth.register.existingAccountButton")}
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
            {t("auth.register.createAccount")}
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            {t("auth.register.invitedAs")} <strong>{invite.role}</strong>
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
          <Form.Item label={t("auth.register.emailLabel")}>
            <Input value={invite.email} disabled />
          </Form.Item>

          <Form.Item
            name="name"
            label={t("auth.register.nameLabel")}
            rules={[
              { required: true, message: t("auth.register.nameRequired") },
              { min: 2, message: t("auth.register.nameMinLength") },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
              placeholder={t("auth.register.namePlaceholder")}
              autoComplete="name"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={t("auth.register.passwordLabel")}
            rules={[
              { required: true, message: t("auth.register.passwordRequired") },
              { min: 8, message: t("auth.register.passwordMinLength") },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder={t("auth.register.passwordPlaceholder")}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={isPending} block>
              {isPending
                ? t("auth.register.creatingAccount")
                : t("auth.register.createAccountButton")}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
