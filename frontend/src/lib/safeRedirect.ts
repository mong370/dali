/** Only same-site paths, so a crafted link cannot send customers elsewhere after sign-in. */
export function safeRedirect(from: unknown) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}
