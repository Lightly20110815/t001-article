import { marked } from 'marked';
import DOMPurify from 'dompurify';
import articleSource from 'virtual:article';
import attachments from './generated/attachments.json';
import './style.css';

const base = import.meta.env.BASE_URL;
const article = document.querySelector('#article');
const originalLines = articleSource.split(/\r?\n/);
const musicLine = originalLines.find((line) => line.trim().startsWith('（Music：'));

// Keep the original Markdown as the single source of the article.
// Only promote the existing section labels and separate photos for layout.
const markdown = originalLines
  .filter((line, index) => index !== 0 && line !== musicLine)
  .map((line) => {
    const text = line.trim();
    if (['引言', '正文', 'Thinking：'].includes(text)) return `\n## ${text}\n`;
    if (/^!\[.*\]\(.*\)$/.test(text)) return `\n${text}\n`;
    return line;
  })
  .join('\n');

article.innerHTML = DOMPurify.sanitize(marked.parse(markdown, { gfm: true }));

const sectionIds = ['introduction', 'story', 'thinking'];
let currentSection;
let sectionIndex = 0;
for (const node of [...article.childNodes]) {
  if (node.nodeName === 'H2') {
    currentSection = document.createElement('section');
    currentSection.id = sectionIds[sectionIndex++];
    currentSection.setAttribute('aria-labelledby', `${currentSection.id}-title`);
    node.id = `${currentSection.id}-title`;
    article.insertBefore(currentSection, node);
  }
  currentSection?.append(node);
}

article.querySelector('ul')?.classList.add('topic-list');
for (const paragraph of article.querySelectorAll('p')) {
  if (paragraph.textContent.trim() === '—END—') paragraph.classList.add('story-end');
}

const photos = [...article.querySelectorAll('img')];
const photoTotal = photos.length;

photos.forEach((image, index) => {
  const source = image.getAttribute('src');
  const asset = attachments[source];
  if (!asset) throw new Error(`Missing article photo: ${source}`);
  image.src = `${base}${asset.src}`;
  image.srcset = `${base}${asset.small} ${asset.smallWidth}w, ${base}${asset.src} ${asset.width}w`;
  image.sizes = '(max-width: 740px) calc(100vw - 48px), 688px';
  image.width = asset.width;
  image.height = asset.height;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.alt = !image.alt || ['图像', '〈'].includes(image.alt) ? `原文照片 ${index + 1}` : image.alt;

  const figure = document.createElement('figure');
  figure.className = 'article-photo';
  if (asset.height / asset.width > 1.5) figure.classList.add('narrow-photo');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'photo-button';
  button.setAttribute('aria-label', `放大查看${image.alt}`);
  button.setAttribute('aria-haspopup', 'dialog');

  const caption = document.createElement('figcaption');
  const description = document.createElement('span');
  description.textContent = image.alt === '精讲册' ? image.alt : '照片';
  const counter = document.createElement('span');
  counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(photoTotal).padStart(2, '0')}`;
  caption.append(description, counter);
  const paragraph = image.closest('p');
  const isStandalonePhoto = paragraph && [...paragraph.childNodes].every((node) =>
    node === image || node.nodeName === 'BR' || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()),
  );
  image.replaceWith(figure);
  button.append(image);
  figure.append(button, caption);
  if (isStandalonePhoto) paragraph.replaceWith(figure);
  button.addEventListener('click', () => openPhoto(index));
});

const dialog = document.querySelector('#photo-dialog');
const expandedPhoto = document.querySelector('#expanded-photo');
let selectedPhoto = 0;

function showPhoto(index) {
  selectedPhoto = (index + photoTotal) % photoTotal;
  const photo = photos[selectedPhoto];
  expandedPhoto.src = photo.src;
  expandedPhoto.alt = photo.alt;
  document.querySelector('#photo-dialog-count').textContent = `${String(selectedPhoto + 1).padStart(2, '0')} / ${String(photoTotal).padStart(2, '0')}`;
}

function openPhoto(index) {
  showPhoto(index);
  document.body.classList.add('is-photo-open');
  dialog.showModal();
}

document.querySelector('#close-photo').addEventListener('click', () => dialog.close());
document.querySelector('#previous-photo').addEventListener('click', () => showPhoto(selectedPhoto - 1));
document.querySelector('#next-photo').addEventListener('click', () => showPhoto(selectedPhoto + 1));
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => document.body.classList.remove('is-photo-open'));
dialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(selectedPhoto + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});

const progressBar = document.querySelector('#reading-progress');
const progressLabel = document.querySelector('#progress-label');
const sections = sectionIds.map((id) => document.getElementById(id));
const navigation = [...document.querySelectorAll('.article-nav a')];
let scrollQueued = false;

function updateReadingPosition() {
  const start = article.offsetTop;
  const end = article.offsetTop + article.offsetHeight - window.innerHeight;
  const progress = Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start)));
  progressBar.style.transform = `scaleX(${progress})`;
  progressLabel.textContent = String(Math.round(progress * 100));
  let activeIndex = 0;
  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= window.innerHeight * 0.3) activeIndex = index;
  });
  navigation.forEach((link, index) => {
    if (index === activeIndex) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollQueued = false;
}

function queueReadingUpdate() {
  if (!scrollQueued) {
    scrollQueued = true;
    requestAnimationFrame(updateReadingPosition);
  }
}

window.addEventListener('scroll', queueReadingUpdate, { passive: true });
window.addEventListener('resize', queueReadingUpdate);
new ResizeObserver(queueReadingUpdate).observe(article);
updateReadingPosition();

const audio = document.querySelector('#background-music');
const player = document.querySelector('#music-player');
const musicToggle = document.querySelector('#music-toggle');
const musicStatus = document.querySelector('#music-status');
const musicProgress = document.querySelector('#music-progress');
const volumeToggle = document.querySelector('#volume-toggle');
let userPaused = false;
let needsGesture = true;
let playAttempt = null;

audio.volume = 0.35;
audio.src = `${base}audio/bad-ending.mp3`;

function syncMusic() {
  const playing = !audio.paused && !audio.error;
  player.classList.toggle('is-playing', playing);
  musicToggle.setAttribute('aria-pressed', String(playing));
  musicToggle.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
  if (playing) musicStatus.textContent = '音乐正在播放';
  else if (userPaused) musicStatus.textContent = '已暂停';
}

function requestPlayback() {
  if (playAttempt) return playAttempt;
  playAttempt = audio.play()
    .then(() => {
      needsGesture = false;
      syncMusic();
    })
    .catch((error) => {
      if (error.name === 'NotAllowedError') {
        needsGesture = true;
        musicStatus.textContent = '';
      } else if (error.name !== 'AbortError') {
        musicStatus.textContent = '音乐暂时无法播放';
      }
      syncMusic();
    })
    .finally(() => { playAttempt = null; });
  return playAttempt;
}

musicToggle.addEventListener('click', () => {
  if (audio.paused) {
    userPaused = false;
    if (audio.error) audio.load();
    requestPlayback();
  } else {
    userPaused = true;
    needsGesture = false;
    audio.pause();
    syncMusic();
  }
});

volumeToggle.addEventListener('click', () => {
  audio.muted = !audio.muted;
});
audio.addEventListener('volumechange', () => {
  player.classList.toggle('is-muted', audio.muted);
  volumeToggle.setAttribute('aria-label', audio.muted ? '取消静音' : '静音');
  volumeToggle.setAttribute('aria-pressed', String(audio.muted));
});
audio.addEventListener('play', () => {
  needsGesture = false;
  syncMusic();
});
audio.addEventListener('pause', syncMusic);
audio.addEventListener('error', () => {
  musicStatus.textContent = '音乐加载失败';
  syncMusic();
});
audio.addEventListener('waiting', () => {
  if (!audio.paused) musicStatus.textContent = '音乐缓冲中';
});
audio.addEventListener('playing', syncMusic);
audio.addEventListener('timeupdate', () => {
  const progress = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
  musicProgress.style.transform = `scaleX(${progress})`;
});

// A real user gesture is the fallback when the browser rejects audible autoplay.
function unlockMusic(event) {
  if (needsGesture && !userPaused && !player.contains(event.target) && event.isTrusted) {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    requestPlayback();
  }
}
document.addEventListener('click', unlockMusic);
document.addEventListener('keydown', unlockMusic);
requestPlayback();

if (import.meta.hot) {
  import.meta.hot.dispose(() => audio.pause());
}
