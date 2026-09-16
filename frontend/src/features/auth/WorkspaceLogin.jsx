import React, { useState } from "react";

export function WorkspaceLogin({
    error = "",
    loading = false,
    onLogin = () => {},
    onSwitchToRegister = () => {},
}) {
    const [email, setEmail] = useState("alex.morgan@postman.com");
    const [password, setPassword] = useState("password123");

    const submit = (event) => {
        event.preventDefault();
        onLogin(email.trim(), password);
    };

    return (
        <main className="workspace-login-page">
            <section className="workspace-login-card" aria-labelledby="workspace-login-title">
                <div className="workspace-login-mark">
                    <span className="postman-logo-icon" style={{ width: 44, height: 44, fontSize: 22 }}>
                        R
                    </span>
                </div>
                <h1 id="workspace-login-title">Sign in</h1>
                <p className="workspace-login-subtitle">to continue to Requestly Workspace</p>
                <form onSubmit={submit}>
                    <div className="outlined-input">
                        <input
                            autoComplete="username"
                            data-testid="email-input"
                            disabled={loading}
                            id="workspace-email"
                            inputMode="email"
                            placeholder=" "
                            required
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                        <label htmlFor="workspace-email">Email</label>
                    </div>
                    <div className="outlined-input">
                        <input
                            autoComplete="current-password"
                            className="workspace-password-input"
                            data-testid="password-input"
                            disabled={loading}
                            id="workspace-password"
                            name="password"
                            placeholder=" "
                            required
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                        <label htmlFor="workspace-password">Password</label>
                    </div>
                    {error && (
                        <p className="workspace-login-error" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="workspace-login-actions auth-actions-split">
                        <button
                            type="button"
                            className="text-link-button"
                            onClick={onSwitchToRegister}
                            disabled={loading}
                        >
                            Create an account
                        </button>
                        <button className="primary-button" disabled={loading} type="submit">
                            {loading ? "Signing in…" : "Sign in"}
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: 20, padding: 10, background: "var(--surface-muted)", borderRadius: 8, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                    <span>Demo login: <strong>alex.morgan@postman.com</strong> / <strong>password123</strong></span>
                </div>
            </section>
            <footer className="workspace-login-footer">
                <span>English (United States)</span>
                <span>Privacy</span>
                <span>Terms</span>
            </footer>
        </main>
    );
}
