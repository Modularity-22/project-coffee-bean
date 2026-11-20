// A small robots.txt reader (RFC 9309): groups of user agents, Allow and
// Disallow rules, `*` wildcards and `$` end anchors, longest match wins.

export const BOT_NAME = 'ProjectCoffeeBeanBot';

interface Rule {
  allow: boolean;
  pattern: RegExp;
  length: number;
}

function toRegex(path: string): RegExp {
  const anchored = path.endsWith('$');
  const body = (anchored ? path.slice(0, -1) : path)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

/** The rules that apply to `agent`: its own group if there is one, otherwise `*`. */
function rulesFor(robots: string, agent: string): Rule[] {
  const groups: Array<{ agents: string[]; rules: Rule[] }> = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      // Consecutive user-agent lines share one group.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      lastWasAgent = false;
      // An empty Disallow allows everything; it adds no rule.
      if (value)
        current.rules.push({
          allow: key === 'allow',
          pattern: toRegex(value),
          length: value.length,
        });
    } else {
      lastWasAgent = false;
    }
  }
  const name = agent.toLowerCase();
  const own = groups.filter((g) => g.agents.some((a) => a !== '*' && a !== '' && name.includes(a)));
  const chosen = own.length ? own : groups.filter((g) => g.agents.includes('*'));
  return chosen.flatMap((g) => g.rules);
}

/** True when robots.txt forbids `path` for our crawler. */
export function disallowed(robots: string, path: string, agent = BOT_NAME): boolean {
  let best: Rule | undefined;
  for (const rule of rulesFor(robots, agent)) {
    if (!rule.pattern.test(path)) continue;
    // The most specific (longest) rule wins; on a tie, Allow wins.
    if (!best || rule.length > best.length || (rule.length === best.length && rule.allow))
      best = rule;
  }
  return best ? !best.allow : false;
}
