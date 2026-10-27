"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: null });
  return (
    <div className="narrow tiny">
      <form action={action} className="card stack">
        <h1>Staff login</h1>
        <label className="field">
          <span>Admin password</span>
          <input name="password" type="password" autoComplete="current-password" required autoFocus />
        </label>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <button className="btn btn-primary btn-block" disabled={pending}>Sign in</button>
      </form>
    </div>
  );
}
