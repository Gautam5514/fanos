// Shared configuration: the allow-lists every write is validated against (categories,
// interests, roles, goals, needs, skills) and the live creator profile.
// There is NO sample data here — every member, idea, community, project and
// opportunity shown in the app comes from real users via the server.

// Blank profile until the creator completes setup (state.creator.claimed).
export const DEFAULT_CREATOR = Object.freeze({
  id: 'creator',
  name: '',
  firstName: '',
  handle: '',
  niche: '',
  platforms: [],
});

// Live creator profile. The store copies the saved profile into this object so every
// component (and the AI text generators) show the real creator's name.
// `firstName` falls back to "your creator" so copy like "Join …'s community" never breaks.
export const CREATOR = { ...DEFAULT_CREATOR, firstName: 'your creator' };
export function applyCreator(profile) {
  if (!profile) return;
  const name = (profile.name || '').trim();
  Object.assign(CREATOR, DEFAULT_CREATOR, profile, { name, firstName: name ? name.split(' ')[0] : 'your creator' });
}

export const CATEGORIES = ['AI', 'Technology', 'Marketing', 'Startup', 'Content', 'Design', 'Finance', 'Fitness'];
// Best-guess idea category from a community's name/description (used to pre-fill the form).
export const categoryForCommunity = (community) => {
  const text = `${community?.name || ''} ${community?.description || ''}`.toLowerCase();
  const hit = [['AI', /\bai\b|agent|automation|llm/], ['Technology', /dev|code|engineer|tech/], ['Marketing', /market|growth|brand/], ['Startup', /startup|founder/],
    ['Content', /content|creator|video|edit|podcast/], ['Design', /design|ui|ux/], ['Finance', /financ|invest|money/], ['Fitness', /fitness|health|gym/]]
    .find(([, re]) => re.test(text));
  return hit ? hit[0] : CATEGORIES[0];
};

export const INTERESTS = ['AI', 'Technology', 'Startups', 'Marketing', 'Design', 'Fitness', 'Finance', 'Content Creation', 'Automation', 'Productivity'];
export const ROLES = ['Developer', 'Designer', 'Founder', 'Video Editor', 'Writer', 'Investor', 'Student', 'Marketer', 'Other'];
export const GOALS = ['Learn', 'Share ideas', 'Collaborate', 'Find opportunities', 'Help projects', 'Meet people'];
export const NEEDS = ['Developer', 'Designer', 'Marketing', 'Video Editor', 'Writer', 'Funding', 'Feedback'];

export const ROLE_SKILLS = {
  Developer: ['React', 'Next.js', 'Node.js', 'Python', 'TypeScript', 'LLMs', 'PostgreSQL', 'Flutter'],
  Designer: ['Figma', 'UI Design', 'UX Research', 'Branding', 'Illustration', 'Motion Design', '3D'],
  Founder: ['Fundraising', 'Product', 'Strategy', 'Sales', 'Operations'],
  'Video Editor': ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Storytelling', 'Shorts'],
  Writer: ['Copywriting', 'Scriptwriting', 'Newsletters', 'SEO', 'Research'],
  Investor: ['Angel Investing', 'Venture Capital', 'Due Diligence', 'Finance'],
  Student: ['Python', 'Research', 'Content Creation', 'Figma'],
  Marketer: ['Growth', 'SEO', 'Paid Ads', 'Community', 'Analytics', 'Copywriting'],
  Other: ['Community', 'Research'],
};

// Keywords that link a member's interests/role to the creator's real communities.
const KEYWORDS = {
  AI: ['ai', 'agent', 'automation', 'llm'], Automation: ['automation', 'ai', 'workflow'], Technology: ['tech', 'dev', 'code', 'engineer'],
  Startups: ['startup', 'founder'], Marketing: ['marketing', 'growth', 'brand'], Design: ['design', 'ui', 'ux'],
  Fitness: ['fitness', 'health', 'gym'], Finance: ['finance', 'invest', 'money'], 'Content Creation': ['content', 'creator', 'video', 'edit'],
  Productivity: ['productivity', 'focus', 'habit'],
  Developer: ['dev', 'code', 'engineer'], Designer: ['design'], Founder: ['founder', 'startup'], 'Video Editor': ['video', 'edit', 'content'], Writer: ['writ', 'content'],
};

// Recommend the creator's real communities that match a member's interests and role.
export function communitiesForProfile(interests = [], role, communities = []) {
  const words = [...interests, role].flatMap((k) => KEYWORDS[k] || []);
  return communities
    .filter((c) => {
      const text = ` ${c.name} ${c.description || ''} ${c.interest || ''} `.toLowerCase();
      return interests.includes(c.interest) || words.some((w) => new RegExp(`\\b${w}`).test(text));
    })
    .map((c) => c.id);
}
