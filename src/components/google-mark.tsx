/** The Google "G" in its brand colors. */
export function GoogleMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.21-2.35H12v4.45h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.72z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3A7.17 7.17 0 0 1 12 19.2a7.2 7.2 0 0 1-6.76-4.97H1.24v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.24 14.23a7.2 7.2 0 0 1 0-4.6v-3.1H1.24a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.76 0 3.34.6 4.58 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.24 6.53l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
    </svg>
  );
}
