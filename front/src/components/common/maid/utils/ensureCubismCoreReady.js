import resolveUrl from '@utils/resolveUrl';

export default async function ensureCubismCoreReady() {
  if (typeof window === 'undefined') return;
  if (window.Live2DCubismCore) return;
  const existing = document.getElementById('live2dcubismcore-script');
  if (existing) {
    await new Promise((resolve) => existing.addEventListener('load', resolve, { once: true }));
    return;
  }
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = resolveUrl('/live2dsrc/live2dcubismcore.min.js');
    s.async = true;
    s.id = 'live2dcubismcore-script';
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}
