// Since site_assets is configured as publicDir in vite.config.js,
// files inside site_assets are served at the root path.
// site_assets/background/bg01.mp4 -> /background/bg01.mp4

const bg01 = '/background/bg01.mp4';
const bg02 = '/background/bg02.mp4';
const bg03 = '/background/bg03.mp4';
const bg04 = '/background/bg04.mp4';
const bg05 = '/background/bg05.mp4';
const bg06 = '/background/bg06.mp4';

const img01 = '/background/img01.png';
const img02 = '/background/img02.png';
const img03 = '/background/img03.png';
const img04 = '/background/img04.png';
const img05 = '/background/img05.png';
const img06 = '/background/img06.png';

export const BACKGROUND_DATA = [
  { id: 1, type: 'image', src: img01, preview: img01, title: 'Background 01' },
  { id: 2, type: 'image', src: img02, preview: img02, title: 'Background 02' },
  { id: 3, type: 'image', src: img03, preview: img03, title: 'Background 03' },
  { id: 4, type: 'image', src: img04, preview: img04, title: 'Background 04' },
  { id: 5, type: 'image', src: img05, preview: img05, title: 'Background 05' },
  { id: 6, type: 'image', src: img06, preview: img06, title: 'Background 06' },
];
