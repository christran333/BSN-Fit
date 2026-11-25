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
import { flowFor, sizeLabel, questionsFor, hasHeightOnFile } from './sizing.js';

export const shortLink = (p) => `fitcheck.team/r/${p.token}`;
export const qCount = (p) => questionsFor(p).length;

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

/** which follow-up the coach's "Notify" sends for this player right now */
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
const BASE_REPLIES = {
  intro: [{ id: 'go', label: "Let's go" }, { id: 'later', label: 'Remind me later' }],
  nudge: [{ id: 'go', label: 'Finish now' }, { id: 'tomorrow', label: 'Remind me tomorrow' }],
  partial: [{ id: 'go', label: 'Finish now' }, { id: 'later', label: 'Remind me later' }],
  reminder: [{ id: 'go', label: "Let's go" }, { id: 'later', label: 'Remind me later' }],
  late: [{ id: 'batch', label: 'Add me to next batch' }, { id: 'notnow', label: 'Not now' }],
};
export function repliesFor(msg, p) {
  const base = BASE_REPLIES[msg?.kind];
  if (!base) return null;
  // returning adults can confirm last year's size without opening the link
  if (msg.kind === 'late' && flowFor(p) === 'parent') {
    return [{ id: 'batch', label: `Add ${p.name.split(' ')[0]} to next batch` }, base[1]];
  }
  if (flowFor(p) === 'returning' && ['intro', 'nudge', 'reminder'].includes(msg.kind)) {
    return [{ id: 'same', label: `Same as last year (${p.lastSize})` }, { id: 'go', label: 'Check my fit' }];
  }
  return base;
}
export const ALL_REPLIES = Object.values(BASE_REPLIES).flat();

/** BSN's answer to each quick reply (null = no text back) */
export function ackFor(replyId, p, team) {
  const first = p.name.split(' ')[0];
  const parent = flowFor(p) === 'parent';
  switch (replyId) {
    case 'later': return "No problem! We'll text you tomorrow.";
    case 'tomorrow': return "You got it! Talk tomorrow.";
    case 'batch': return `Done! ${parent ? `${first}'s` : "You're"} on the list. We'll text you when it opens.`;
    case 'notnow': return `No worries! ${team.coach} can add ${parent ? first : 'you'} later.`;
    default: return null;
  }
}

/** the link preview card, written for whoever gets the text */
export function cardFor(p, team) {
  const first = p.name.split(' ')[0];
  const flow = flowFor(p);
  return {
    kicker: `${team.school} · ${team.program}`,
    title: {
      parent: `${first}'s uniform size`,
      returning: `${first}, same as last year?`,
      teen: `${first}'s ${team.season} fit check`,
      standard: `${first}'s ${team.season} fit check`,
    }[flow],
    foot: flow === 'returning' ? `Last order: ${sizeLabel(p.lastSize, p.cut)}` : `${qCount(p)} questions · due ${fmtDue(team)}`,
  };
}

/** returns { lead, link, after } so the link can be rendered as a link */
export function messageParts(p, team, msg) {
  const first = p.name.split(' ')[0];
  const parent = flowFor(p) === 'parent';
  // "Hey Jordan! You're…" / parents: "Hi! Mia's…"
  const hey = (rest) => `${parent ? 'Hi!' : `Hey ${first}!`} ${rest[0].toUpperCase()}${rest.slice(1)}`;
  const due = fmtDue(team);

  switch (msg.kind) {
    case 'reply':
    case 'ack':
      return { lead: msg.text, link: null, after: null };

    case 'intro': {
      const st = msg.stats;
      const proof = st && st.done > 0 ? ` ${st.done} teammates already did!` : '';
      const last = p.lastSize ? sizeLabel(p.lastSize, p.cut) : null;
      const taps = `${qCount(p)} quick taps`;
      const lead = {
        parent: hasHeightOnFile(p)
          ? `We have ${first}'s height from last season, so it's just ${taps} and we'll do the math.${proof} Ready?`
          : last
            ? `${first} wore ${last} last time, but kids grow fast! Just ${taps} to check.${proof} Ready?`
            : `Just ${taps}, about a minute.${proof} Ready?`,
        returning: `You wore ${last} last season. Same again? Tap below and you're done.`,
        teen: `You wore ${last} last season. Let's make sure it still fits. Just ${taps}.${proof} Ready?`,
        standard: `Just ${taps} to nail your size.${proof} Ready?`,
      }[flowFor(p)];
      return { lead, link: null, after: null };
    }

    case 'nudge': {
      const s = msg.stats;
      const d = msg.daysLeft ?? daysLeft(team);
      const left = `${num(d)} day${d === 1 ? '' : 's'} left`;
      // only say "one of the last" when it's actually true
      const lastFew = s && s.left <= Math.ceil((s.total + 1) / 2);
      const opener = lastFew
        ? hey(`${parent ? `${first}'s` : "you're"} one of the last few without a size.`)
        : hey(`${team.coach} still needs ${parent ? `${first}'s` : 'your'} size.`);
      const effort = flowFor(p) === 'returning' ? "It's one tap!" : 'Takes a minute!';
      return { lead: `${opener} Sizes lock ${due}, ${left}. ${effort}`, link: shortLink(p), after: null };
    }

    case 'partial': {
      const answered = msg.answered ?? p.answersCount ?? 3;
      const left = qCount(p) - answered;
      if (left <= 0) {
        return { lead: `${hey('your answers are saved.')} Just hit submit!`, link: shortLink(p), after: null };
      }
      return {
        lead: `${hey(`${parent ? `${first}'s` : "you're"} ${num(left)} question${left === 1 ? '' : 's'} from done.`)} Finish up?`,
        link: shortLink(p),
        after: null,
      };
    }

    case 'reminder':
      return {
        lead: `${hey(`here's your reminder${parent ? ` for ${first}'s size` : ''}.`)} ${flowFor(p) === 'returning' ? "It's one tap!" : 'Takes a minute!'}`,
        link: shortLink(p),
        after: null,
      };

    case 'late':
      return {
        lead: `${hey(`sizes closed ${due}, but we can add ${parent ? first : 'you'} to the next batch.`)} Want in?`,
        link: null,
        after: null,
      };

    case 'confirm':
      return {
        lead: parent
          ? `Thanks! ${first}'s all set in ${sizeLabel(msg.size, p.cut)}. 🙌`
          : `Got it, ${first}! You're all set in ${sizeLabel(msg.size, p.cut)}. 🙌`,
        link: null,
        after: null,
      };

    default: // invite
      return {
        lead: parent
          ? `Hi! 👋 ${team.coach} needs ${first}'s ${team.season} uniform size.`
          : `Hey ${first}! 👋 ${team.coach} needs your ${team.season} jersey size.`,
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
