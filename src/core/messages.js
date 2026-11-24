// Messagerie et fil d'actualités.
export function addMsg(state, m) {
  m.id = 'i' + (state.nextId++).toString(36);
  m.day = state.day;
  m.read = false;
  m.prio = m.prio || 1;
  state.inbox.unshift(m);
  if (state.inbox.length > 160) {
    const keep = state.inbox.filter((x, i) => i < 120 || (x.act && !x.done));
    state.inbox = keep.slice(0, 160);
  }
  if (m.prio >= 2) state.flags.stop = true;
  return m;
}

export function addNews(state, text, kind = 'info', extra = {}) {
  state.news.unshift({ d: state.day, t: text, k: kind, ...extra });
  if (state.news.length > 220) state.news.length = 220;
}

export function unreadCount(state) {
  return state.inbox.filter((m) => !m.read).length;
}
