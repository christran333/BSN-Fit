// The texts BSN sends. One place for the copy, so the Messages thread
// and the notification banner always say the same thing.
import { flowFor, sizeLabel } from './sizing.js';

export const shortLink = (p) => `fitcheck.team/r/${p.token}`;

export function messagesFor(p) {
  // older saved data had no message log: start with the invite
  return p.messages?.length ? p.messages : [{ kind: 'invite', at: p.sentAt || new Date().toISOString() }];
}

/** returns { lead, link, after } so the link can be rendered as a link */
export function messageParts(p, team, msg) {
  const first = p.name.split(' ')[0];
  const parent = flowFor(p) === 'parent';
  const due = new Date(team.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (msg.kind === 'nudge') {
    return {
      lead: parent
        ? `Reminder: ${team.coach} still needs ${first}'s uniform size. Order closes ${due}:`
        : `Reminder: your coach still needs your size. Order closes ${due}:`,
      link: shortLink(p),
      after: 'Takes about 30 seconds.',
    };
  }
  if (msg.kind === 'confirm') {
    return {
      lead: parent
        ? `Thanks! ${first}'s size (${sizeLabel(msg.size, p.cut)}) is in. ${team.coach} will see it with the team order.`
        : `Thanks! Your size (${sizeLabel(msg.size, p.cut)}) is in. Your coach will see it with the team order.`,
      link: null,
      after: null,
    };
  }
  return {
    lead: parent ? `${team.coach} is asking for ${first}'s uniform size:` : 'Your coach is asking for your size:',
    link: shortLink(p),
    after: `${team.name} · ${team.order}. Five taps, about 30 seconds.`,
  };
}

export function messageText(p, team, msg) {
  const { lead, link, after } = messageParts(p, team, msg);
  return [lead, link, after].filter(Boolean).join(' ');
}

/** iOS-style thread timestamp: "Today 9:41 AM", "Yesterday 3:02 PM", "Mon 8:15 AM" */
export function threadTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Yesterday ${time}`;
  if (diff < 7) return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}
