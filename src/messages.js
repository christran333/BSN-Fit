// The texts BSN sends. One place for the copy, so the Messages thread
// and the notification banner always say the same thing.
//
// Message kinds (BSN → athlete unless noted):
//   invite   first text: who's asking + link + rich preview card
//   intro    follow-up right after the invite: what to expect, "Let's go / Remind me later"
//   nudge    they ignored the invite
//   partial  they opened it and quit half-way
//   reminder they tapped "Remind me later", this is the later
//   late     the order closed before they answered
//   confirm  size received
//   reply    (athlete → BSN) a tapped quick reply, stored with its text
//   ack      BSN's short answer to a quick reply, stored with its text
import { flowFor, sizeLabel } from './sizing.js';

export const shortLink = (p) => `fitcheck.team/r/${p.token}`;
export const MINUTE = 'about a minute';
const QUESTIONS = 5;

export function messagesFor(p) {
  // older saved data had no message log: start with the invite
  return p.messages?.length ? p.messages : [{ kind: 'invite', at: p.sentAt || new Date().toISOString() }];
}

const fmtDue = (team) => {
  const d = new Date(team.dueDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
export const daysLeft = (team) => Math.max(0, Math.ceil((new Date(team.dueDate) - Date.now()) / 864e5));
export const isClosed = (team) => new Date(team.dueDate) <= Date.now();
const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const num = (n) => words[n] ?? String(n);

/** which follow-up the coach's "Nudge" sends for this player right now */
export function nudgeKindFor(p, team) {
  if (isClosed(team)) return 'late';
  if (p.answersCount > 0 && p.status === 'opened') return 'partial';
  return 'nudge';
}

/** snapshot of team progress, stored on a message so old texts don't change */
export function teamStats(players, p) {
  const mates = players.filter((x) => x.id !== p.id);
  const done = mates.filter((x) => x.status === 'ready' || x.status === 'review').length;
  return { done, total: mates.length, left: players.filter((x) => x.status === 'waiting' || x.status === 'opened').length };
}

/** quick-reply buttons under a BSN text (RCS suggested replies) */
export const REPLIES = {
  intro: [{ id: 'go', label: "Let's go" }, { id: 'later', label: 'Remind me later' }],
  nudge: [{ id: 'go', label: 'Finish now' }, { id: 'tomorrow', label: 'Remind me tomorrow' }],
  partial: [{ id: 'go', label: "Let's go" }, { id: 'later', label: 'Remind me later' }],
  reminder: [{ id: 'go', label: "Let's go" }, { id: 'later', label: 'Remind me later' }],
  late: [{ id: 'batch', label: 'Add me to next batch' }, { id: 'notnow', label: 'Not now' }],
};

/** BSN's answer to each quick reply (null = just open the link) */
export function ackFor(replyId, p, team) {
  const first = p.name.split(' ')[0];
  const parent = flowFor(p) === 'parent';
  switch (replyId) {
    case 'later': return "No problem. We'll text you again tomorrow.";
    case 'tomorrow': return `Got it. We'll text you tomorrow. Sizes still lock on ${fmtDue(team)}.`;
    case 'batch': return `Done. ${parent ? first + " is" : "You're"} on the list for the next batch. We'll text the link when it opens.`;
    case 'notnow': return `Okay. If you change your mind, ${team.coach} can add ${parent ? first : 'you'} later.`;
    default: return null;
  }
}

/** returns { lead, link, after } so the link can be rendered as a link */
export function messageParts(p, team, msg) {
  const first = p.name.split(' ')[0];
  const parent = flowFor(p) === 'parent';
  const hi = parent ? 'Hi' : `Hi ${first},`;
  const your = parent ? `${first}'s` : 'your';
  const due = fmtDue(team);

  switch (msg.kind) {
    case 'reply':
    case 'ack':
      return { lead: msg.text, link: null, after: null };

    case 'intro': {
      const s = msg.stats;
      const proof = s && s.done > 0 ? `, and ${s.done} of ${s.total} teammates already have` : '';
      return {
        lead: parent
          ? `Hi! ${first}'s ${team.short} jersey order is coming together. To get the size right, we'll ask ${QUESTIONS} quick questions. Most parents finish in under a minute${proof}. Ready?`
          : `${hi} your ${team.short} jersey order is coming together. To get your size right, we'll ask ${QUESTIONS} quick questions. Most players finish in under a minute${proof}. Ready?`,
        link: null,
        after: null,
      };
    }

    case 'nudge': {
      const s = msg.stats;
      const d = msg.daysLeft ?? daysLeft(team);
      // only say "one of the last" when it's actually true
      const last = s && s.left <= Math.ceil((s.total + 1) / 2);
      const opener = last
        ? `${hi} ${parent ? `${first} is` : "you're"} one of the last few players without a size.`
        : `${hi} ${team.coach} still needs ${your} size.`;
      return {
        lead: `${opener} Sizes lock on ${due}, ${num(d)} day${d === 1 ? '' : 's'} left. Want to finish now? It takes ${MINUTE}.`,
        link: shortLink(p),
        after: null,
      };
    }

    case 'partial': {
      const answered = msg.answered ?? p.answersCount ?? 3;
      const left = QUESTIONS - answered;
      const pct = Math.round((answered / QUESTIONS) * 100);
      return {
        lead: `${hi} we're still waiting for ${your} size. You're ${pct}% done, and the last ${num(left)} question${left === 1 ? '' : 's'} take${left === 1 ? 's' : ''} less than a minute. Want to finish now?`,
        link: shortLink(p),
        after: null,
      };
    }

    case 'reminder':
      return {
        lead: `${hi} just a reminder to send ${your} uniform size to ${team.coach} for ${team.season} ${team.program}. It only takes ${MINUTE}. Ready to start?`,
        link: shortLink(p),
        after: null,
      };

    case 'late':
      return {
        lead: `${hi} sizes for this order closed on ${due}. We can still add ${parent ? first : 'you'} to the next batch so ${parent ? "they're" : "you're"} covered. Want us to do that?`,
        link: null,
        after: null,
      };

    case 'confirm':
      return {
        lead: parent
          ? `Thanks! ${first}'s size (${sizeLabel(msg.size, p.cut)}) is in. ${team.coach} will see it with the team order.`
          : `Thanks, ${first}! Your size (${sizeLabel(msg.size, p.cut)}) is in. ${team.coach} will see it with the team order.`,
        link: null,
        after: null,
      };

    default: // invite
      return {
        lead: parent
          ? `${team.coach} is asking for ${first}'s ${team.season} uniform size for ${team.school} ${team.program}.`
          : `${team.coach} is asking for your ${team.season} uniform size for ${team.school} ${team.program}.`,
        link: shortLink(p),
        after: null,
      };
  }
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
  if (diff === -1) return `Tomorrow ${time}`;
  if (diff > 0 && diff < 7) return `${d.toLocaleDateString('en-US', { weekday: 'long' })} ${time}`;
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
}
