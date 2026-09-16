import React, { useState } from "react";

export function CreateAccount({
    error = "",
    loading = false,
    onCreateAccount = () => {},
    onSwitchToLogin = () => {},
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [touched, setTouched] = useState({});
    const [clientErrors, setClientErrors] = useState({});

    const validate = (currentValues = { name, email, password, confirmPassword }) => {
        const errors = {};
        if (!currentValues.name.trim()) {
            errors.name = "Full name is required.";
        } else if (currentValues.name.trim().length > 120) {
            errors.name = "Name must be 120 characters or less.";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!currentValues.email.trim()) {
            errors.email = "Email address is required.";
        } else if (!emailRegex.test(currentValues.email.trim())) {
            errors.email = "Please enter a valid email address.";
        }

        if (!currentValues.password) {
            errors.password = "Password is required.";
        } else if (currentValues.password.length < 8) {
            errors.password = "Password must be at least 8 characters.";
        }

        if (!currentValues.confirmPassword) {
            errors.confirmPassword = "Confirm password is required.";
        } else if (currentValues.confirmPassword !== currentValues.password) {
            errors.confirmPassword = "Passwords do not match.";
        }

        return errors;
    };

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const errors = validate();
        setClientErrors(errors);
    };

    const handleChange = (field, value) => {
        if (field === "name") setName(value);
        if (field === "email") setEmail(value);
        if (field === "password") setPassword(value);
        if (field === "confirmPassword") setConfirmPassword(value);

        if (touched[field]) {
            const nextValues = {
                name: field === "name" ? value : name,
                email: field === "email" ? value : email,
                password: field === "password" ? value : password,
                confirmPassword: field === "confirmPassword" ? value : confirmPassword,
            };
            setClientErrors(validate(nextValues));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setTouched({
            name: true,
            email: true,
            password: true,
            confirmPassword: true,
        });
        const errors = validate();
        setClientErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }
        onCreateAccount({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
        });
    };

    return (
        <main className="workspace-login-page">
            <section className="workspace-login-card create-account-card" aria-labelledby="create-account-title">
                <div className="workspace-login-mark">
                    <span className="postman-logo-icon" style={{ width: 44, height: 44, fontSize: 22 }}>
                        R
                    </span>
                </div>
                <h1 id="create-account-title">Create Account</h1>
                <p className="workspace-login-subtitle">to start building & testing APIs with Requestly</p>

                <form onSubmit={handleSubmit} noValidate>
                    {/* Full Name */}
                    <div className="auth-field-group">
                        <div className={`outlined-input ${touched.name && clientErrors.name ? "has-error" : ""}`}>
                            <input
                                autoComplete="name"
                                data-testid="register-name-input"
                                disabled={loading}
                                id="create-account-name"
                                placeholder=" "
                                required
                                type="text"
                                value={name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                onBlur={() => handleBlur("name")}
                            />
                            <label htmlFor="create-account-name">Full name</label>
                        </div>
                        {touched.name && clientErrors.name && (
                            <span className="field-error-msg">{clientErrors.name}</span>
                        )}
                    </div>

                    {/* Email */}
                    <div className="auth-field-group">
                        <div className={`outlined-input ${touched.email && clientErrors.email ? "has-error" : ""}`}>
                            <input
                                autoComplete="email"
                                data-testid="register-email-input"
                                disabled={loading}
                                id="create-account-email"
                                inputMode="email"
                                placeholder=" "
                                required
                                type="email"
                                value={email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                onBlur={() => handleBlur("email")}
                            />
                            <label htmlFor="create-account-email">Email address</label>
                        </div>
                        {touched.email && clientErrors.email && (
                            <span className="field-error-msg">{clientErrors.email}</span>
                        )}
                    </div>

                    {/* Password */}
                    <div className="auth-field-group">
                        <div className={`outlined-input password-input-container ${touched.password && clientErrors.password ? "has-error" : ""}`}>
                            <input
                                autoComplete="new-password"
                                data-testid="register-password-input"
                                disabled={loading}
                                id="create-account-password"
                                placeholder=" "
                                required
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => handleChange("password", e.target.value)}
                                onBlur={() => handleBlur("password")}
                            />
                            <label htmlFor="create-account-password">Password (min. 8 characters)</label>
                            <button
                                type="button"
                                className="password-visibility-btn"
                                onClick={() => setShowPassword((prev) => !prev)}
                                title={showPassword ? "Hide password" : "Show password"}
                                tabIndex={-1}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        {touched.password && clientErrors.password && (
                            <span className="field-error-msg">{clientErrors.password}</span>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="auth-field-group">
                        <div className={`outlined-input password-input-container ${touched.confirmPassword && clientErrors.confirmPassword ? "has-error" : ""}`}>
                            <input
                                autoComplete="new-password"
                                data-testid="register-confirm-password-input"
                                disabled={loading}
                                id="create-account-confirm-password"
                                placeholder=" "
                                required
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                onBlur={() => handleBlur("confirmPassword")}
                            />
                            <label htmlFor="create-account-confirm-password">Confirm password</label>
                        </div>
                        {touched.confirmPassword && clientErrors.confirmPassword && (
                            <span className="field-error-msg">{clientErrors.confirmPassword}</span>
                        )}
                    </div>

                    {/* Server Error Banner */}
                    {error && (
                        <div className="workspace-auth-error-banner" role="alert">
                            <span className="error-badge-icon">!</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="workspace-login-actions auth-actions-split">
                        <button
                            type="button"
                            className="text-link-button"
                            onClick={onSwitchToLogin}
                            disabled={loading}
                        >
                            Already have an account? Sign in
                        </button>
                        <button
                            className="primary-button create-account-submit-btn"
                            disabled={loading}
                            type="submit"
                        >
                            {loading ? "Creating account…" : "Create Account"}
                        </button>
                    </div>
                </form>
            </section>

            <footer className="workspace-login-footer">
                <span>English (United States)</span>
                <span>Privacy</span>
                <span>Terms</span>
            </footer>
        </main>
    );
}
