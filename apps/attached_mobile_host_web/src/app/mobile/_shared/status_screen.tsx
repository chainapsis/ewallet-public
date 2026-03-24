import styles from "./status_screen.module.css";

type StatusTone = "default" | "error";

export function StatusScreen({
  title,
  detail,
  tone = "default",
  showSpinner = tone !== "error",
}: {
  title: string;
  detail?: string;
  tone?: StatusTone;
  showSpinner?: boolean;
}) {
  const resolvedDetail =
    detail ??
    (tone === "error"
      ? "Please close this screen and try again."
      : "Please keep this screen open while we finish this step.");

  return (
    <div
      className={`${styles.screen} ${tone === "error" ? styles.error : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.content}>
        {showSpinner && <div className={styles.spinner} aria-hidden="true" />}
        <p className={styles.title}>{title}</p>
        <p className={styles.detail}>{resolvedDetail}</p>
      </div>
    </div>
  );
}
