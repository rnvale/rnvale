import { writeFile } from 'node:fs/promises';

const username = 'rnvale';
const headers = { 'User-Agent': 'rnvale-profile-stats', Accept: 'application/vnd.github+json' };

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}

function shell({ title, subtitle, body, footer }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 208" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(subtitle)}</desc><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0B0E14"/><stop offset="1" stop-color="#171118"/></linearGradient><linearGradient id="bar" x1="0" x2="1"><stop stop-color="#C0392B"/><stop offset="1" stop-color="#E7B84B"/></linearGradient></defs><rect x="2" y="2" width="756" height="204" rx="12" fill="url(#bg)" stroke="#C0392B" stroke-width="3"/><path d="M24 48H736M24 174H736" stroke="#E7B84B" stroke-opacity=".22"/><text x="28" y="31" fill="#E7B84B" font-family="JetBrains Mono,Consolas,monospace" font-size="14" letter-spacing="2">${escapeXml(title)}</text><text x="732" y="31" text-anchor="end" fill="#9CA3AF" font-family="JetBrains Mono,Consolas,monospace" font-size="10">AUTO-REFRESHED</text>${body}<text x="28" y="194" fill="#9CA3AF" font-family="JetBrains Mono,Consolas,monospace" font-size="10">${escapeXml(footer)}</text><text x="732" y="194" text-anchor="end" fill="#C0392B" font-family="JetBrains Mono,Consolas,monospace" font-size="10">JARVIS LINK ESTABLISHED</text></svg>`;
}

const user = await getJson(`https://api.github.com/users/${username}`);
const repos = await getJson(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
const stars = repos.reduce((total, repo) => total + repo.stargazers_count, 0);
const forks = repos.reduce((total, repo) => total + repo.forks_count, 0);
const languages = new Map();
for (const repo of repos) if (repo.language) languages.set(repo.language, (languages.get(repo.language) ?? 0) + 1);
const ranked = [...languages.entries()].sort((a, b) => b[1] - a[1]);
const totalLanguages = ranked.reduce((sum, [, count]) => sum + count, 0) || 1;
const top = ranked.slice(0, 4).map(([name, count]) => ({ name, percent: Math.round((count / totalLanguages) * 100) }));
const other = Math.max(0, 100 - top.reduce((sum, item) => sum + item.percent, 0));
if (other) top.push({ name: 'Other', percent: other });
const stat = (label, value, icon, x, color) => `<g transform="translate(${x} 75)"><circle cx="16" cy="16" r="14" fill="${color}" fill-opacity=".16" stroke="${color}"/><text x="16" y="21" text-anchor="middle" fill="#E7B84B" font-size="14">${icon}</text><text x="48" y="14" fill="#9CA3AF" font-size="11">${label}</text><text x="48" y="47" fill="#F3F5F7" font-size="28" font-weight="700">${value}</text></g>`;
const statsBody = `<g font-family="JetBrains Mono,Consolas,monospace">${stat('PUBLIC REPOS', user.public_repos, '▦', 42, '#C0392B')}${stat('TOTAL STARS', stars, '★', 224, '#E7B84B')}${stat('FOLLOWERS', user.followers, '◎', 406, '#C0392B')}${stat('TOTAL FORKS', forks, '⑂', 588, '#E7B84B')}</g>`;
const languageRows = top.map((item, index) => { const y = 72 + index * 28; const width = Math.max(8, Math.round(item.percent * 5.6)); return `<text x="30" y="${y + 7}" fill="#F3F5F7">${escapeXml(item.name)}</text><text x="730" y="${y + 7}" text-anchor="end" fill="#E7B84B">${item.percent}%</text><rect x="108" y="${y - 3}" width="560" height="12" rx="6" fill="#27212A"/><rect x="108" y="${y - 3}" width="${width}" height="12" rx="6" fill="url(#bar)"/>`; }).join('');
const languageBody = `<g font-family="JetBrains Mono,Consolas,monospace" font-size="12">${languageRows}</g>`;
await writeFile('assets/github-stats.svg', shell({ title: 'GITHUB // OVERVIEW', subtitle: 'GitHub overview statistics refreshed by GitHub Actions.', body: statsBody, footer: `PROFILE: ${username.toUpperCase()} / ${new Date().toISOString().slice(0, 10)}` }));
await writeFile('assets/language-matrix.svg', shell({ title: 'LANGUAGE // MATRIX', subtitle: 'Primary language distribution refreshed by GitHub Actions.', body: languageBody, footer: `PRIMARY LANGUAGES / ${repos.length} PUBLIC REPOSITORIES` }));
