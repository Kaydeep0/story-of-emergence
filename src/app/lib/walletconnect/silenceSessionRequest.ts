// src/app/lib/walletconnect/silenceSessionRequest.ts
// Silences WalletConnect session_request warning by attaching a no-op listener

export function silenceWalletConnectSessionRequest() {
  if (typeof window === 'undefined') return;

  const w = window as any;
  if (w.__soeWcSessionRequestListenerAttached) return;

  const wc = w.walletConnect;
  const signClient =
    wc?.signClient ||
    wc?.core?.signClient ||
    w.__walletConnectSignClient;

  if (!signClient?.on) return;

  signClient.on('session_request', () => {
    // noop: consume event so WC does not warn about missing listeners
  });

  w.__soeWcSessionRequestListenerAttached = true;
}

