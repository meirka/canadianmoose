---
title: "Community Topics"
permalink: /topics/
layout: single
classes: wide
description: "Propose topics and vote with 👍 — powered by GitHub Issues."
---

<a class="btn" href="https://github.com/meirka/canadianmoose/issues/new?template=topic.yml&labels=topic&title=%5BTopic%5D%20" target="_blank" rel="noopener">➕ Submit a topic</a>

<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0;">
  <input id="q" placeholder="Search topics…" style="padding:.6rem 0.8rem;min-width:220px;">
  <select id="sort" style="padding:.6rem 0.8rem;">
    <option value="hot">Sort: Most upvotes</option>
    <option value="new">Sort: Newest</option>
    <option value="recent">Sort: Recently active</option>
  </select>
</div>

<div id="topics-list"></div>
<p id="topics-empty" style="color:#6b7280;display:none;">No topics match your filter.</p>

{% raw %}
<script>
  // ====== CONFIG ======
  const OWNER = 'meirka';
  const REPO  = 'canadianmoose';
  // ====================

  const HEADERS = {
    // include reactions summary in the issue payload
    'Accept': 'application/vnd.github+json, application/vnd.github.squirrel-girl-preview+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  const state = { issues: [], filtered: [] };

  const upvotes = (i) => (i && i.reactions && typeof i.reactions["+1"] === "number") ? i.reactions["+1"] : 0;

  function shortBody(body) {
    if (!body) return '';
    const t = body.replace(/^#+\s.*$/gm,'').replace(/\r?\n+/g,' ').trim();
    return t.length > 220 ? t.slice(0,217) + '…' : t;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }

  function render() {
    const container = document.getElementById('topics-list');
    const empty = document.getElementById('topics-empty');
    container.innerHTML = '';
    if (!state.filtered.length) { empty.style.display='block'; return; }
    empty.style.display='none';

    state.filtered.forEach(i => {
      const badges = (i.labels || [])
        .filter(l => /^status:/i.test(l.name))
        .map(l => `<span style="display:inline-block;margin-right:.4rem;font-size:.75rem;padding:2px 8px;border:1px solid #e5e7eb;border-radius:999px;background:#fff;color:#6b7280">${l.name.replace(/^status:\s*/i,'')}</span>`)
        .join(' ');

      const card = document.createElement('article');
      card.style.border = '1px solid #e5e7eb';
      card.style.borderRadius = '14px';
      card.style.padding = '16px';
      card.style.margin = '12px 0';
      card.style.background = '#fff';
      card.innerHTML = `
        <h3 style="margin:0 0 6px;font-size:1.1rem;">${i.title.replace(/^\[Topic\]\s*/i,'')}</h3>
        ${badges ? `<p>${badges}</p>` : ''}
        <p style="margin:.4rem 0 .6rem;color:#374151">${shortBody(i.body)}</p>
        <p style="margin:.2rem 0;color:#6b7280;">👍 ${upvotes(i)} · 💬 ${i.comments} · Opened ${formatDate(i.created_at)} by ${i.user.login}</p>
        <p style="margin-top:.6rem;">
          <a class="btn" href="${i.html_url}" target="_blank" rel="noopener">Open & vote on GitHub</a>
        </p>
      `;
      container.appendChild(card);
    });
  }

  function applyFilterAndSort() {
    const q = document.getElementById('q').value.toLowerCase().trim();
    const sort = document.getElementById('sort').value;

    let arr = state.issues.slice();
    if (q) {
      arr = arr.filter(i =>
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.body && i.body.toLowerCase().includes(q))
      );
    }

    if (sort === 'new') {
      arr.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'recent') {
      arr.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    } else {
      arr.sort((a,b) => (upvotes(b) - upvotes(a)) || (new Date(b.created_at) - new Date(a.created_at)));
    }

    state.filtered = arr;
    render();
  }

  async function loadIssues() {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?labels=topic&state=open&per_page=100`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      document.getElementById('topics-empty').textContent = 'Failed to load topics from GitHub.';
      document.getElementById('topics-empty').style.display = 'block';
      return;
    }
    const issues = await res.json();
    state.issues = issues.filter(i => !i.pull_request);
    state.filtered = state.issues.slice();
    applyFilterAndSort();
  }

  document.getElementById('q').addEventListener('input', applyFilterAndSort);
  document.getElementById('sort').addEventListener('change', applyFilterAndSort);
  loadIssues();
</script>
{% endraw %}
