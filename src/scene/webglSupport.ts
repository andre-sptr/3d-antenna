export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    if (!context) {
      return false;
    }
    const loseExt = context.getExtension('WEBGL_lose_context');
    loseExt?.loseContext();
    return true;
  } catch {
    return false;
  }
}
