import { useEffect, useState } from "react";
import { API_ORIGINS, api } from "../lib/api";
import { renderOAuthPopup, type OAuthMessage } from "../lib/oauth";
import type { AccountRole, PendingAuthConnection } from "../lib/types";

const EMPTY_CONNECT_TOKENS: Record<AccountRole, string> = {
  source: "",
  destination: "",
};
const EMPTY_CONNECT_ERRORS: Record<AccountRole, string | null> = {
  source: null,
  destination: null,
};
const EMPTY_PENDING_CONNECTIONS: Record<AccountRole, PendingAuthConnection | null> =
  {
    source: null,
    destination: null,
  };

export interface AccountConnectionsInput {
  setStatus: (status: string) => void;
  refreshWorkspace: () => Promise<void>;
  resetPlanningStateForAccountChange: (accountId?: string | null) => void;
}

export function useAccountConnections({
  setStatus,
  refreshWorkspace,
  resetPlanningStateForAccountChange,
}: AccountConnectionsInput) {
  const [openConnectRole, setOpenConnectRole] = useState<AccountRole | null>(
    null,
  );
  const [connectTokenByRole, setConnectTokenByRole] =
    useState<Record<AccountRole, string>>(EMPTY_CONNECT_TOKENS);
  const [connectErrorByRole, setConnectErrorByRole] =
    useState<Record<AccountRole, string | null>>(EMPTY_CONNECT_ERRORS);
  const [pendingConnectionByRole, setPendingConnectionByRole] = useState<
    Record<AccountRole, PendingAuthConnection | null>
  >(EMPTY_PENDING_CONNECTIONS);
  const [connectBusyRole, setConnectBusyRole] = useState<AccountRole | null>(
    null,
  );

  useEffect(() => {
    function handleOAuthMessage(event: MessageEvent<OAuthMessage>) {
      if (!API_ORIGINS.includes(event.origin)) return;
      if (!event.data?.type) return;
      if (event.data.type === "discogs-auth-verification-ready") {
        const verification = event.data.verification;
        if (!verification) return;
        setOpenConnectRole(verification.role);
        setPendingConnectionByRole((current) => ({
          ...current,
          [verification.role]: verification,
        }));
        setConnectErrorByRole((current) => ({
          ...current,
          [verification.role]: null,
        }));
        setStatus(
          `Verified ${verification.username}. Confirm replacing the current ${verification.role} account.`,
        );
        return;
      }
      if (event.data.type !== "discogs-oauth-complete") return;
      const role = event.data.account?.role;
      if (role) {
        clearConnectPanel(role);
      }
      void refreshWorkspace();
      setStatus(
        role
          ? `${role[0].toUpperCase()}${role.slice(1)} account connected.`
          : "Discogs account connected.",
      );
    }
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearConnectPanel(role: AccountRole) {
    setOpenConnectRole((current) => (current === role ? null : current));
    setConnectTokenByRole((current) => ({ ...current, [role]: "" }));
    setConnectErrorByRole((current) => ({ ...current, [role]: null }));
    setPendingConnectionByRole((current) => ({ ...current, [role]: null }));
    setConnectBusyRole((current) => (current === role ? null : current));
  }

  function openConnectPanel(role: AccountRole) {
    setOpenConnectRole(role);
    setConnectErrorByRole((current) => ({ ...current, [role]: null }));
  }

  function updateConnectToken(role: AccountRole, value: string) {
    setConnectTokenByRole((current) => ({ ...current, [role]: value }));
  }

  async function finalizePendingConnection(
    role: AccountRole,
    verification: PendingAuthConnection,
    confirmReplace: boolean,
  ) {
    const roleLabel = role === "source" ? "Source" : "Destination";
    setConnectBusyRole(role);
    setConnectErrorByRole((current) => ({ ...current, [role]: null }));
    try {
      const account = await api.connectVerifiedDiscogsAuth({
        verification_id: verification.verification_id,
        confirm_replace: confirmReplace,
      });
      resetPlanningStateForAccountChange(verification.existing_account?.id);
      await refreshWorkspace();
      clearConnectPanel(role);
      setStatus(`${roleLabel} account connected as ${account.username}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Account connection failed.";
      setConnectErrorByRole((current) => ({ ...current, [role]: message }));
      setStatus(message);
    } finally {
      setConnectBusyRole((current) => (current === role ? null : current));
    }
  }

  async function handleVerifyToken(role: AccountRole) {
    const userToken = connectTokenByRole[role].trim();
    if (!userToken) {
      const message = "Paste a Discogs user token first.";
      setConnectErrorByRole((current) => ({ ...current, [role]: message }));
      setStatus(message);
      return;
    }
    setConnectBusyRole(role);
    setConnectErrorByRole((current) => ({ ...current, [role]: null }));
    try {
      const verification = await api.verifyDiscogsToken({
        role,
        user_token: userToken,
      });
      setPendingConnectionByRole((current) => ({
        ...current,
        [role]: verification,
      }));
      if (verification.requires_replacement_confirmation) {
        setStatus(
          `Verified ${verification.username}. Confirm replacing the current ${role} account.`,
        );
        setConnectTokenByRole((current) => ({ ...current, [role]: "" }));
        return;
      }
      await finalizePendingConnection(role, verification, false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Discogs token verification failed.";
      setConnectErrorByRole((current) => ({ ...current, [role]: message }));
      setStatus(message);
    } finally {
      setConnectBusyRole((current) => (current === role ? null : current));
    }
  }

  async function handleConfirmPendingConnection(role: AccountRole) {
    const verification = pendingConnectionByRole[role];
    if (!verification) return;
    await finalizePendingConnection(role, verification, true);
  }

  function handleCancelPendingConnection(role: AccountRole) {
    setPendingConnectionByRole((current) => ({ ...current, [role]: null }));
    setConnectErrorByRole((current) => ({ ...current, [role]: null }));
    setStatus("Account replacement cancelled.");
  }

  async function handleStartOAuth(role: AccountRole) {
    const roleLabel = role === "source" ? "Source" : "Destination";
    const popup = window.open(
      "",
      `discogs-oauth-${role}`,
      "popup=yes,width=960,height=720",
    );
    if (!popup) {
      setStatus("Popup blocked. Allow popups for this app and try again.");
      return;
    }
    renderOAuthPopup(
      popup,
      "Connecting to Discogs",
      "Starting Discogs OAuth. This window will redirect when the backend responds.",
    );
    try {
      const response = await api.startOAuth(role);
      popup.location.replace(response.authorization_url);
      setStatus(
        `${roleLabel} sign-in window opened. Finish connecting that account there.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OAuth start failed.";
      renderOAuthPopup(
        popup,
        "Could not start Discogs OAuth",
        "The app could not begin the account connection flow.",
        message,
      );
      setStatus(message);
    }
  }

  return {
    openConnectRole,
    connectBusyRole,
    connectTokenByRole,
    connectErrorByRole,
    pendingConnectionByRole,
    openConnectPanel,
    clearConnectPanel,
    updateConnectToken,
    handleVerifyToken,
    handleConfirmPendingConnection,
    handleCancelPendingConnection,
    handleStartOAuth,
  };
}
