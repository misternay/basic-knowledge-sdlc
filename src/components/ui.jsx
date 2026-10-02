export function Code({ children }) {
  if (!children) return null;
  return <pre className="code"><code>{children}</code></pre>;
}

export function Mark({ ok, children }) {
  return <span className={'mark ' + (ok ? 'mark-ok' : 'mark-bad')}>{children ?? (ok ? 'ถูก' : 'ผิด')}</span>;
}

export function Progress({ value }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div style={{ width: value + '%' }} />
    </div>
  );
}

export function Badge({ children, kind = 'code' }) {
  return <span className={'badge badge-' + kind}>{children}</span>;
}

export function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
