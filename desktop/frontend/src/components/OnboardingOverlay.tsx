import { useCallback, useRef, useState } from "react";
import logo from "../assets/logo.svg";
import { useT } from "../lib/i18n";
import { app, openExternal } from "../lib/bridge";

// Full-window first-run gate: validate a pasted key via Go, then onComplete
// unmounts us so the rebuilt controller's main UI takes over.
export function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const t = useT();
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-5-mini");
  const [state, setState] = useState<"idle" | "validating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const baseUrlRef = useRef<HTMLInputElement>(null);
  const apiKeyRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    const url = baseUrl.trim();
    const key = apiKey.trim();
    const selectedModel = model.trim() || "gpt-5-mini";
    if (!url) {
      setError(t("onboarding.error.emptyUrl"));
      setState("error");
      baseUrlRef.current?.focus();
      return;
    }
    if (!key) {
      setError(t("onboarding.error.empty"));
      setState("error");
      apiKeyRef.current?.focus();
      return;
    }
    setState("validating");
    setError(null);
    try {
      await app.ConnectKey({ baseUrl: url, apiKey: key, model: selectedModel });
      onComplete();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/status\s*401|status\s*403|invalid/i.test(msg)) {
        setError(t("onboarding.error.invalid"));
      } else if (/network|unreachable|timeout|dial/i.test(msg)) {
        setError(t("onboarding.error.network"));
      } else if (/base url/i.test(msg)) {
        setError(t("onboarding.error.url"));
      } else {
        setError(msg || t("onboarding.error.unknown"));
      }
      setState("error");
      apiKeyRef.current?.focus();
      apiKeyRef.current?.select();
    }
  }, [apiKey, baseUrl, model, onComplete, t]);

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <img src={logo} className="onboarding__logo" alt="Quantara" draggable={false} />
        <div className="onboarding__title">{t("onboarding.title")}</div>
        <div className="onboarding__tag">{t("onboarding.tagline")}</div>

        <label className="onboarding__label" htmlFor="onboarding-url">
          {t("onboarding.urlLabel")}
        </label>
        <input
          id="onboarding-url"
          ref={baseUrlRef}
          className="onboarding__input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("onboarding.urlPlaceholder")}
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value);
            if (state === "error") setState("idle");
          }}
          disabled={state === "validating"}
        />

        <label className="onboarding__label" htmlFor="onboarding-key">
          {t("onboarding.inputLabel")}
        </label>
        <input
          id="onboarding-key"
          ref={apiKeyRef}
          className="onboarding__input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("onboarding.inputPlaceholder")}
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            if (state === "error") setState("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && state !== "validating") {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={state === "validating"}
        />

        <label className="onboarding__label" htmlFor="onboarding-model">
          {t("onboarding.modelLabel")}
        </label>
        <input
          id="onboarding-model"
          className="onboarding__input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("onboarding.modelPlaceholder")}
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            if (state === "error") setState("idle");
          }}
          disabled={state === "validating"}
        />

        {state === "error" && error && (
          <div className="onboarding__error" role="alert">
            {error}
          </div>
        )}

        <button
          className="onboarding__submit"
          onClick={() => void submit()}
          disabled={state === "validating"}
        >
          {state === "validating" ? (
            <>
              <span className="onboarding__spinner" />
              {t("onboarding.validating")}
            </>
          ) : (
            t("onboarding.submit")
          )}
        </button>

        <div className="onboarding__links">
          <button
            type="button"
            className="onboarding__link"
            onClick={() => openExternal("https://platform.openai.com/api-keys")}
          >
            {t("onboarding.getKey")}
          </button>
          <span className="onboarding__sep">·</span>
          <span className="onboarding__privacy">{t("onboarding.privacy")}</span>
        </div>

        <button
          type="button"
          className="onboarding__skip"
          onClick={onComplete}
          disabled={state === "validating"}
        >
          {t("onboarding.skip")}
        </button>
      </div>
    </div>
  );
}
