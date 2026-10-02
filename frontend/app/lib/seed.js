// Deterministic seed data for the FanOS demo.
// Records are hand-written where they matter for the demo story and
// procedurally generated (seeded PRNG) elsewhere so renders are stable.

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261002);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

export const DEFAULT_CREATOR = Object.freeze({
  id: 'creator_kunal',
  name: 'Kunal Kumar',
  firstName: 'Kunal',
  handle: '@kunal.builds',
  niche: 'AI, startups & building in public',
  platforms: [
    { name: 'Instagram', followers: 512000 },
    { name: 'YouTube', followers: 286000 },
    { name: 'X', followers: 94000 },
  ],
});

// Live creator profile. The store copies the saved profile into this object so every
// component (and the AI text generators) show the real creator’s name.
export const CREATOR = { ...DEFAULT_CREATOR };
export function applyCreator(profile) {
  if (!profile) return;
  Object.assign(CREATOR, DEFAULT_CREATOR, profile, { firstName: (profile.name || DEFAULT_CREATOR.name).split(' ')[0] });
}

export const CATEGORIES = ['AI', 'Technology', 'Marketing', 'Startup', 'Content', 'Design', 'Finance', 'Fitness'];
const COMMUNITY_CATEGORY = { 'ai-builders': 'AI', developers: 'Technology', marketing: 'Marketing', founders: 'Startup', creators: 'Content', finance: 'Finance', fitness: 'Fitness', designers: 'Design' };
export const categoryForCommunity = (id) => COMMUNITY_CATEGORY[id] || 'AI';

// Aggregate counters that represent the full community at scale.
// The seeded records below are a representative sample of it.
export const SCALE = {
  members: 48291,
  membersThisWeek: 1204,
  ideasThisWeek: 384,
  discussions: 18429,
  activitiesAnalyzed: 2481,
  rawInbox: 2836,
  spamFiltered: 1312,
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

export const COMMUNITIES = [
  { id: 'ai-builders', name: 'AI Builders', emoji: '💻', members: 8430, growth: 18, interest: 'AI', description: 'Ship agents, automations and AI products together.' },
  { id: 'developers', name: 'Developers', emoji: '⚙️', members: 7140, growth: 9, interest: 'Developer', description: 'Code reviews, open source and build sessions.' },
  { id: 'marketing', name: 'Marketing', emoji: '📈', members: 6730, growth: 7, interest: 'Marketing', description: 'Growth experiments, distribution and brand.' },
  { id: 'founders', name: 'Startup Founders', emoji: '🚀', members: 4250, growth: 12, interest: 'Startups', description: 'Founders helping founders — launches, hiring, fundraising.' },
  { id: 'creators', name: 'Content Creators', emoji: '🎥', members: 3820, growth: 14, interest: 'Content Creation', description: 'Editing, scripting, monetization and audience growth.' },
  { id: 'finance', name: 'Finance & Investing', emoji: '💰', members: 3410, growth: 5, interest: 'Finance', description: 'Money basics, angel investing and creator finance.' },
  { id: 'fitness', name: 'Fitness & Focus', emoji: '🧘', members: 2960, growth: -2, interest: 'Fitness', description: 'Healthy habits for people who sit at desks all day.' },
  { id: 'designers', name: 'Designers', emoji: '🎨', members: 2180, growth: 11, interest: 'Design', description: 'Critiques, portfolios and design for community projects.' },
];

const INTEREST_TO_COMMUNITY = {
  AI: 'ai-builders', Automation: 'ai-builders', Technology: 'developers', Startups: 'founders', Marketing: 'marketing',
  Design: 'designers', Fitness: 'fitness', Finance: 'finance', 'Content Creation': 'creators', Productivity: 'creators',
};
export function communitiesForProfile(interests = [], role) {
  const ids = new Set(interests.map((i) => INTEREST_TO_COMMUNITY[i]).filter(Boolean));
  if (role === 'Developer') ids.add('developers');
  if (role === 'Designer') ids.add('designers');
  if (role === 'Founder') ids.add('founders');
  if (role === 'Video Editor' || role === 'Writer') ids.add('creators');
  return [...ids];
}

// ---------- Members ----------
const KEY_MEMBERS = [
  { id: 'm_rahul', name: 'Rahul Sharma', role: 'Developer', skills: ['React', 'Node.js', 'Next.js', 'LLMs'], interests: ['AI', 'Automation', 'Startups'], joinedDaysAgo: 210, socialFollowers: 12400, stats: { ideas: 12, helpful: 47, projects: 3, featured: 2 }, positive: 94, growth: 38, bio: 'Full-stack dev. I ship small AI tools every weekend.', city: 'Bengaluru' },
  { id: 'm_priya', name: 'Priya Sharma', role: 'Designer', skills: ['Figma', 'Branding', 'Illustration', 'UI Design'], interests: ['Design', 'Content Creation', 'AI'], joinedDaysAgo: 18, socialFollowers: 640, stats: { ideas: 4, helpful: 9, projects: 0, featured: 0 }, positive: 92, growth: 310, bio: 'Graphic designer. Brand systems & editorial illustration.', city: 'Pune' },
  { id: 'm_arjun', name: 'Arjun Mehta', role: 'Developer', skills: ['TypeScript', 'React', 'PostgreSQL', 'Python'], interests: ['AI', 'Startups'], joinedDaysAgo: 41, socialFollowers: 210, stats: { ideas: 3, helpful: 11, projects: 1, featured: 0 }, positive: 96, growth: 240, bio: 'Full-stack developer who likes helping people debug.', city: 'Delhi' },
  { id: 'm_ankit', name: 'Ankit Verma', role: 'Marketer', skills: ['Growth', 'Paid Ads', 'Analytics', 'Community'], interests: ['Marketing', 'Startups', 'AI'], joinedDaysAgo: 160, socialFollowers: 8300, stats: { ideas: 7, helpful: 31, projects: 2, featured: 1 }, positive: 90, growth: 22, bio: 'Growth marketer. Took two D2C brands from 0 → 1M.', city: 'Mumbai' },
  { id: 'm_akash', name: 'Akash Gupta', role: 'Founder', skills: ['Product', 'Strategy', 'Fundraising'], interests: ['Startups', 'AI', 'Automation'], joinedDaysAgo: 120, socialFollowers: 5100, stats: { ideas: 9, helpful: 18, projects: 1, featured: 1 }, positive: 88, growth: 54, bio: 'Founder @ a tiny automation studio. Proposed the 30-day challenge.', city: 'Hyderabad' },
  { id: 'm_zara', name: 'Zara Khan', role: 'Designer', skills: ['UI Design', 'UX Research', 'Figma', 'Motion Design'], interests: ['Design', 'AI'], joinedDaysAgo: 300, socialFollowers: 15800, stats: { ideas: 6, helpful: 22, projects: 2, featured: 1 }, positive: 93, growth: 12, bio: 'Product designer, design systems nerd.', city: 'Chennai' },
  { id: 'm_sneha', name: 'Sneha Iyer', role: 'Video Editor', skills: ['Premiere Pro', 'After Effects', 'Shorts', 'Storytelling'], interests: ['Content Creation', 'Marketing'], joinedDaysAgo: 95, socialFollowers: 3300, stats: { ideas: 5, helpful: 14, projects: 1, featured: 0 }, positive: 91, growth: 47, bio: 'Editor for 3 YouTube channels. Shorts specialist.', city: 'Kochi' },
  { id: 'm_meera', name: 'Meera Nair', role: 'Writer', skills: ['Scriptwriting', 'Copywriting', 'Newsletters'], interests: ['Content Creation', 'Productivity'], joinedDaysAgo: 230, socialFollowers: 2700, stats: { ideas: 8, helpful: 26, projects: 1, featured: 1 }, positive: 89, growth: 9, bio: 'Scriptwriter and newsletter operator.', city: 'Kolkata' },
  { id: 'm_vikram', name: 'Vikram Rao', role: 'Investor', skills: ['Angel Investing', 'Due Diligence', 'Finance'], interests: ['Startups', 'Finance'], joinedDaysAgo: 140, socialFollowers: 21000, stats: { ideas: 2, helpful: 15, projects: 0, featured: 0 }, positive: 87, growth: 6, bio: 'Angel investor, 30+ pre-seed checks.', city: 'Bengaluru' },
  { id: 'm_dev', name: 'Dev Patel', role: 'Developer', skills: ['Python', 'LLMs', 'PostgreSQL', 'Node.js'], interests: ['AI', 'Automation'], joinedDaysAgo: 75, socialFollowers: 1900, stats: { ideas: 5, helpful: 29, projects: 1, featured: 0 }, positive: 95, growth: 120, bio: 'ML engineer. Agents, evals and RAG.', city: 'Ahmedabad' },
  { id: 'm_ishaan', name: 'Ishaan Bose', role: 'Student', skills: ['Python', 'Research', 'Figma'], interests: ['AI', 'Design'], joinedDaysAgo: 22, socialFollowers: 180, stats: { ideas: 3, helpful: 6, projects: 0, featured: 0 }, positive: 90, growth: 180, bio: 'CS undergrad. Learning by building.', city: 'Jaipur' },
  { id: 'm_neha', name: 'Neha Kapoor', role: 'Marketer', skills: ['SEO', 'Copywriting', 'Community'], interests: ['Marketing', 'Content Creation'], joinedDaysAgo: 65, socialFollowers: 4200, stats: { ideas: 4, helpful: 17, projects: 0, featured: 0 }, positive: 86, growth: 33, bio: 'SEO + community-led growth.', city: 'Chandigarh' },
  { id: 'm_karan', name: 'Karan Malhotra', role: 'Founder', skills: ['Sales', 'Operations', 'Product'], interests: ['Startups', 'Finance'], joinedDaysAgo: 180, socialFollowers: 6900, stats: { ideas: 6, helpful: 12, projects: 1, featured: 0 }, positive: 84, growth: 15, bio: 'Bootstrapped SaaS founder.', city: 'Gurugram' },
];

const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Diya', 'Ananya', 'Kabir', 'Riya', 'Sara', 'Rohan', 'Tanvi', 'Nikhil', 'Pooja', 'Siddharth', 'Kavya', 'Yash', 'Aditi', 'Harsh', 'Nisha', 'Varun', 'Simran', 'Omar', 'Lena', 'Mateo', 'Chloe', 'Daniel', 'Aisha', 'Farhan', 'Isha', 'Manav', 'Shreya', 'Tara', 'Gaurav', 'Rhea', 'Aman', 'Leo', 'Maya', 'Noah', 'Emma', 'Ravi', 'Sonal'];
const LAST = ['Singh', 'Reddy', 'Joshi', 'Das', 'Menon', 'Chopra', 'Bhatt', 'Kulkarni', 'Pillai', 'Saxena', 'Agarwal', 'Shah', 'Fernandes', 'Thomas', 'Ali', 'Banerjee', 'Garcia', 'Kim', 'Chen', 'Silva'];
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Dubai', 'London', 'Singapore', 'Toronto'];
const ROLE_WEIGHTS = [['Developer', 26], ['Designer', 14], ['Founder', 12], ['Video Editor', 9], ['Writer', 8], ['Investor', 4], ['Student', 15], ['Marketer', 12]];
function weightedRole() {
  const total = ROLE_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [role, w] of ROLE_WEIGHTS) { if ((r -= w) < 0) return role; }
  return 'Developer';
}
const BIO = {
  Developer: ['Backend dev who loves automation.', 'Frontend engineer, React all day.', 'Indie hacker shipping side projects.', 'Building with LLMs after work.'],
  Designer: ['Product designer.', 'Brand & visual designer.', 'UX researcher turned designer.'],
  Founder: ['Building a B2B SaaS.', 'Second-time founder.', 'Pre-seed founder in creator tools.'],
  'Video Editor': ['Freelance editor.', 'Shorts & reels editor.', 'Documentary-style editor.'],
  Writer: ['Copywriter.', 'Newsletter writer.', 'Tech blogger.'],
  Investor: ['Angel investor.', 'Scout at an early-stage fund.'],
  Student: ['Engineering student.', 'Design student.', 'MBA student curious about AI.'],
  Marketer: ['Performance marketer.', 'Community manager.', 'Content marketer.'],
};

function generateMembers(n) {
  const out = [];
  const used = new Set(KEY_MEMBERS.map((m) => m.name));
  let i = 0;
  while (out.length < n) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    if (used.has(name)) { i++; if (i > 5000) break; continue; }
    used.add(name);
    const role = weightedRole();
    const skills = pickN(ROLE_SKILLS[role], int(2, 4));
    // Many developers in an AI-focused audience know React — makes search demos meaningful.
    if (role === 'Developer' && rand() < 0.45 && !skills.includes('React')) skills.unshift('React');
    const interests = pickN(INTERESTS, int(2, 4));
    if (rand() < 0.55 && !interests.includes('AI')) interests.unshift('AI');
    const active = rand();
    out.push({
      id: `m_${out.length + 100}`,
      name, role, skills, interests,
      goals: pickN(GOALS, int(1, 3)),
      joinedDaysAgo: int(3, 420),
      socialFollowers: Math.round(Math.pow(rand(), 3) * 9000) + int(20, 400),
      stats: {
        ideas: active > 0.6 ? int(1, 6) : int(0, 1),
        helpful: active > 0.5 ? int(2, 24) : int(0, 3),
        projects: active > 0.85 ? int(1, 2) : 0,
        featured: active > 0.95 ? 1 : 0,
      },
      positive: int(70, 97),
      growth: int(-10, 90),
      lastActiveDaysAgo: active > 0.4 ? int(0, 14) : int(15, 90),
      bio: pick(BIO[role] || BIO.Developer),
      city: pick(CITIES),
    });
  }
  return out;
}

function finalizeMember(m) {
  const communities = communitiesForProfile(m.interests, m.role);
  return {
    goals: ['Collaborate', 'Share ideas'],
    lastActiveDaysAgo: 1,
    ...m,
    communities: m.communities || communities,
    handle: '@' + m.name.toLowerCase().replace(/[^a-z]+/g, '.'),
  };
}

export const MEMBERS = [...KEY_MEMBERS, ...generateMembers(230)].map(finalizeMember);
const byRole = (role) => MEMBERS.filter((m) => m.role === role).map((m) => m.id);

// ---------- Ideas ----------
// mentions = similar comments/DMs merged into this idea by the pipeline.
const IDEA_SEED = [
  // AI agent course cluster
  ['Beginner course on building AI agents', 'A practical, step-by-step course that shows how to build and deploy an AI agent from scratch — no PhD required. Start with one useful agent and end with it running in production.', 'ai-builders', ['AI Agents', 'Education'], ['Developer', 'Video Editor'], 'm_dev', 412, 64, 14, 3],
  ['Please teach AI automation for small businesses', 'I run a small agency and want to automate client onboarding with AI agents. A tutorial series focused on business automation would help thousands of us.', 'ai-builders', ['AI Agents', 'Automation', 'Education'], ['Feedback'], 'm_karan', 238, 41, 9, 5],
  ['Make an AI agent tutorial with real deployment', 'Most tutorials stop at a notebook. Show us how to deploy an agent that actually runs every day, with logs and costs.', 'developers', ['AI Agents', 'Education'], ['Developer'], 'm_120', 187, 29, 8, 2],
  ['We need a beginner agent course in Hindi', 'Lots of us learn better in Hindi. A beginner AI agent course in Hindi would open this up to a huge part of the community.', 'ai-builders', ['AI Agents', 'Education'], ['Video Editor', 'Writer'], 'm_131', 143, 22, 6, 4],
  ['Live workshop: build your first AI agent together', 'A 2-hour live workshop where everyone builds and deploys their first AI agent along with Kunal.', 'ai-builders', ['AI Agents', 'Live', 'Education'], ['Developer', 'Marketing'], 'm_ishaan', 296, 37, 7, 1],
  ['Tutorial: AI agents that repurpose content automatically', 'Teach us to build an agent that turns one long video into shorts, threads and a newsletter automatically.', 'creators', ['AI Agents', 'Automation', 'Content Creation'], ['Developer', 'Video Editor'], 'm_sneha', 121, 18, 5, 6],
  ['Series comparing AI agent frameworks', 'LangGraph vs CrewAI vs plain function calling — a series that compares agent frameworks with the same project.', 'developers', ['AI Agents', 'Education'], ['Developer', 'Writer'], 'm_142', 98, 16, 3, 8],

  // 30-day challenge cluster
  ['30-Day AI Builder Challenge', 'Every day for 30 days, members ship one small AI project and post their streak in the community. Kunal reviews the best builds weekly and features winners to the wider audience.', 'ai-builders', ['Challenge', 'Building', 'AI Tools'], ['Developer', 'Designer', 'Marketing'], 'm_akash', 428, 72, 12, 2],
  ['Monthly build sprint with a community demo day', 'Pick a theme every month, form small teams, and demo what we built on a live stream at the end.', 'developers', ['Challenge', 'Live', 'Building'], ['Developer', 'Designer'], 'm_rahul', 176, 24, 6, 9],
  ['Ship-in-public accountability challenge', 'Post one public update a day about what you are building. Leaderboard for streaks.', 'founders', ['Challenge', 'Building'], ['Developer', 'Marketing'], 'm_155', 134, 19, 5, 11],

  // Directory cluster
  ['Free AI tool directory curated by the community', 'A free, searchable directory of AI tools where members review what actually works, sorted by use case and price.', 'ai-builders', ['Directory', 'AI Tools'], ['Developer', 'Designer', 'Writer'], 'm_rahul', 386, 42, 9, 4],
  ['Community Startup Directory', 'A searchable directory of startups founded by people in this community, so we can support, hire and invest in each other.', 'founders', ['Directory', 'Startups'], ['Developer', 'Designer', 'Funding'], 'm_karan', 248, 33, 7, 6],
  ['Database of AI tools with honest reviews', 'No affiliate links, just real reviews from members who used the tools on real work.', 'ai-builders', ['Directory', 'AI Tools'], ['Writer', 'Feedback'], 'm_166', 112, 14, 3, 10],
  ['Showcase page for products built by followers', 'A page that lists products made by followers with a short demo for each.', 'founders', ['Directory', 'Startups', 'Building'], ['Developer', 'Designer'], 'm_arjun', 89, 11, 2, 12],

  // Visual notes cluster
  ['AI tool that converts YouTube videos into visual notes', 'Paste a YouTube link and get a one-page visual summary with diagrams and key quotes. Perfect for learning from long videos.', 'ai-builders', ['Creator Tools', 'AI Tools'], ['Developer', 'Designer'], 'm_ishaan', 201, 27, 6, 3],
  ['Turn long podcasts into mind maps automatically', 'Upload a podcast and get an interactive mind map of the ideas discussed.', 'creators', ['Creator Tools', 'AI Tools'], ['Developer', 'Designer'], 'm_177', 77, 9, 2, 13],
  ['Auto-generate study notes from Kunal’s videos', 'Visual notes for every video so we can revise quickly. Could be a community-built tool.', 'ai-builders', ['Creator Tools', 'Education'], ['Developer'], 'm_priya', 64, 8, 2, 5],

  // Live build sessions
  ['Weekly live build session with community devs', 'Every Friday Kunal builds something live with 3–4 community developers on stream.', 'developers', ['Live', 'Building'], ['Developer'], 'm_dev', 233, 31, 5, 3],
  ['Pair-programming streams where members join on call', 'Members join the stream on call and pair with Kunal on a real problem.', 'developers', ['Live', 'Building'], ['Developer'], 'm_188', 102, 13, 3, 14],
  ['Live code review of community projects', 'Submit your repo, get it reviewed live. Great for learning best practices.', 'developers', ['Live', 'Education'], ['Developer', 'Feedback'], 'm_arjun', 91, 12, 2, 7],

  // Monetization
  ['Playbook: how small creators land their first brand deal', 'A practical playbook with real numbers: pitching, pricing and contracts for creators under 10K.', 'creators', ['Monetization', 'Content Creation'], ['Writer', 'Marketing'], 'm_neha', 167, 26, 6, 2],
  ['Creator monetization workshop for under 10K followers', 'A workshop about monetization before you are big — digital products, consulting and community.', 'creators', ['Monetization', 'Education'], ['Marketing'], 'm_199', 145, 21, 5, 4],
  ['Template pack for media kits and rate cards', 'Free Figma templates for media kits and rate cards, made by community designers.', 'designers', ['Monetization', 'Design'], ['Designer'], 'm_zara', 96, 12, 3, 9],

  // Singletons
  ['Design critique Fridays', 'Every Friday designers post work and get structured critique from peers.', 'designers', ['Design', 'Feedback'], ['Designer'], 'm_priya', 118, 22, 1, 6],
  ['Mentorship matching between founders and students', 'Match students with founders in the community for a 4-week mentorship sprint.', 'founders', ['Mentorship', 'Startups'], ['Developer', 'Feedback'], 'm_vikram', 154, 19, 2, 8],
  ['Open-source the editing presets used in the videos', 'Release the colour grades and caption presets so editors in the community can learn from them.', 'creators', ['Content Creation', 'Open Source'], ['Video Editor'], 'm_sneha', 129, 17, 1, 15],
  ['Fitness accountability group for desk workers', 'Daily step and stretch check-ins for people who code all day.', 'fitness', ['Fitness', 'Habits'], ['Feedback'], 'm_210', 88, 15, 1, 5],
  ['Personal finance basics for young creators', 'Taxes, invoicing and saving for people with irregular creator income.', 'finance', ['Finance', 'Monetization', 'Education'], ['Writer', 'Feedback'], 'm_vikram', 76, 10, 2, 12],
  ['Members-only hackathon with sponsor prizes', 'A weekend hackathon with prizes from brands that want to reach this audience.', 'developers', ['Hackathon', 'Building'], ['Developer', 'Designer', 'Marketing', 'Funding'], 'm_221', 211, 28, 3, 7],
  ['Podcast episode featuring community founders', 'Monthly episode where 2 founders from the community share what they are building.', 'founders', ['Podcast', 'Startups'], ['Video Editor', 'Writer'], 'm_akash', 109, 14, 1, 10],
  ['Prompt library for marketers', 'A shared, tested prompt library for copy, ads, SEO briefs and reports.', 'marketing', ['AI Tools', 'Marketing'], ['Writer', 'Marketing'], 'm_ankit', 93, 13, 2, 6],
  ['Local city meetups organised by members', 'Monthly meetups in Bengaluru, Mumbai and Delhi run by volunteers.', 'marketing', ['Meetups', 'Community'], ['Marketing'], 'm_232', 72, 11, 2, 9],
  ['Brand identity makeover for community startups', 'Designers redo the brand identity of 5 community startups — before/after content for everyone.', 'designers', ['Design', 'Startups'], ['Designer'], 'm_zara', 67, 9, 1, 13],
  // Ideas that already became projects
  ['AI soundboard for podcasters', 'An AI soundboard that suggests and plays effects live based on the conversation.', 'creators', ['Creator Tools', 'AI Tools'], ['Developer', 'Designer', 'Marketing'], 'm_rahul', 302, 48, 4, 34],
  ['Notion OS template for content planning', 'A full content operating system in Notion: ideas → scripts → editing → publishing.', 'creators', ['Productivity', 'Content Creation'], ['Writer', 'Designer'], 'm_meera', 184, 23, 3, 28],
];

const VOLUNTEER_TARGETS = { '30-Day AI Builder Challenge': 31, 'Free AI tool directory curated by the community': 7, 'Community Startup Directory': 14, 'Beginner course on building AI agents': 18, 'Live workshop: build your first AI agent together': 11 };
const NEED_TO_ROLE = { Developer: 'Developer', Designer: 'Designer', Marketing: 'Marketer', 'Video Editor': 'Video Editor', Writer: 'Writer', Funding: 'Investor', Feedback: 'Student' };

function volunteersFor(title, needs, authorId) {
  const target = VOLUNTEER_TARGETS[title] ?? int(1, 6);
  const pools = needs.map((n) => byRole(NEED_TO_ROLE[n] || 'Developer'));
  const out = new Set();
  // Make sure the hand-crafted members appear on the story ideas.
  if (title === '30-Day AI Builder Challenge') ['m_rahul', 'm_priya', 'm_ankit', 'm_dev', 'm_arjun', 'm_zara', 'm_sneha'].forEach((id) => out.add(id));
  if (title === 'Free AI tool directory curated by the community') ['m_arjun', 'm_priya'].forEach((id) => out.add(id));
  let guard = 0;
  while (out.size < target && guard++ < 500) {
    const pool = pools.length ? pools[out.size % pools.length] : MEMBERS.map((m) => m.id);
    const id = pick(pool);
    if (id !== authorId) out.add(id);
  }
  return [...out].map((memberId) => {
    const m = MEMBERS.find((x) => x.id === memberId);
    return { memberId, role: m?.role || 'Other' };
  });
}

const PROJECT_IDEAS = ['AI soundboard for podcasters', 'Notion OS template for content planning', 'Design critique Fridays', 'Prompt library for marketers', 'Open-source the editing presets used in the videos'];

const COMMENT_TEMPLATES = [
  'This is exactly what I needed. Happy to help test it.',
  'Would love this — I have been asking for something like this for months.',
  'I can contribute here. I have done something similar at work.',
  'Great idea. Can we keep the first version really small?',
  'Strong +1. This would also help people who are just starting out.',
  'I think we should start with a beginner-friendly version.',
  'If this happens I will share it with my whole team.',
];

export const IDEAS = IDEA_SEED.map(([title, description, communityId, tags, needs, authorId, supports, comments, mentions, daysAgo], idx) => {
  const id = `idea_${idx + 1}`;
  const status = PROJECT_IDEAS.includes(title) ? 'project' : 'open';
  const commentList = Array.from({ length: Math.min(4, Math.max(2, Math.round(comments / 15))) }, (_, k) => ({
    id: `${id}_c${k}`,
    memberId: pick(MEMBERS).id,
    text: COMMENT_TEMPLATES[(idx + k * 3) % COMMENT_TEMPLATES.length],
    daysAgo: Math.max(0, daysAgo - k),
  }));
  return {
    id, title, description, communityId, category: categoryForCommunity(communityId), tags, needs, authorId,
    supports, commentsCount: comments, mentions, daysAgo, status,
    featured: false,
    volunteers: volunteersFor(title, needs, authorId),
    comments: commentList,
  };
});

// ---------- Discussions (questions, feedback) ----------
// count = number of similar messages this week, prev = last week.
export const DISCUSSIONS = [
  { id: 'd1', type: 'question', text: 'How do I start learning AI with no coding background?', tags: ['AI', 'Education'], count: 96, prev: 58 },
  { id: 'd2', type: 'question', text: 'Which mic and camera do you use for your videos?', tags: ['Gear'], count: 71, prev: 69 },
  { id: 'd3', type: 'question', text: 'How did you get your first 10K followers?', tags: ['Growth', 'Content Creation'], count: 64, prev: 40 },
  { id: 'd4', type: 'question', text: 'What AI tools do you use daily for editing and scripting?', tags: ['AI Tools'], count: 58, prev: 31 },
  { id: 'd5', type: 'question', text: 'Can AI agents replace a virtual assistant for my small business?', tags: ['AI Agents', 'Automation'], count: 47, prev: 12 },
  { id: 'd6', type: 'feedback', text: 'Videos have become too long lately — please keep tutorials under 20 minutes.', tags: ['Content'], count: 23, prev: 9 },
  { id: 'd7', type: 'feedback', text: 'Audio was out of sync during the last livestream.', tags: ['Live'], count: 18, prev: 2 },
  { id: 'd8', type: 'feedback', text: 'Too many sponsored segments in recent videos.', tags: ['Sponsorship'], count: 14, prev: 11 },
  { id: 'd9', type: 'feedback', text: 'Want more beginner-level content, not only advanced builds.', tags: ['Education'], count: 31, prev: 17 },
  { id: 'd10', type: 'feedback', text: 'Love the new build-in-public format — more of this!', tags: ['Building'], count: 44, prev: 20, sentiment: 'positive' },
];

// Weekly topic activity across all posts, comments and ideas (aggregated).
export const TOPICS = [
  { topic: 'AI Agents', thisWeek: 412, lastWeek: 146, spark: [40, 52, 61, 70, 96, 132, 146, 412] },
  { topic: 'Creator Monetization', thisWeek: 228, lastWeek: 131, spark: [88, 90, 104, 110, 118, 125, 131, 228] },
  { topic: 'Automation', thisWeek: 306, lastWeek: 190, spark: [120, 131, 140, 150, 166, 180, 190, 306] },
  { topic: 'Live Building', thisWeek: 174, lastWeek: 121, spark: [60, 70, 82, 90, 104, 110, 121, 174] },
  { topic: 'Personal Finance', thisWeek: 120, lastWeek: 104, spark: [96, 99, 101, 98, 102, 100, 104, 120] },
  { topic: 'Design Systems', thisWeek: 98, lastWeek: 88, spark: [80, 82, 85, 90, 86, 87, 88, 98] },
  { topic: 'Fitness', thisWeek: 74, lastWeek: 81, spark: [92, 90, 88, 86, 84, 83, 81, 74] },
];

// ---------- Opportunities inbox ----------
// Category & priority are NOT seeded — the AI engine classifies the raw message.
export const OPPORTUNITIES = [
  { id: 'o1', channel: 'Email', hoursAgo: 3, from: { name: 'Rhea Kapoor', org: 'Flowdesk', title: 'Partnerships Lead', followers: 0, verified: true }, subject: '3-video sponsorship on AI productivity', message: 'Hi Kunal, I lead partnerships at Flowdesk. We would love to sponsor a 3-video series on AI productivity for founders. Budget is $12,000 for the campaign and we are flexible on creative.' },
  { id: 'o2', channel: 'Instagram DM', hoursAgo: 5, from: { name: 'Siddharth Rao', org: 'Build in Public Podcast', title: 'Host', followers: 80000, verified: true }, subject: 'Joint podcast episode?', message: 'Big fan! I host the Build in Public podcast (80K subscribers). Would you be up for a joint episode where we collab on a live build with both our audiences?' },
  { id: 'o3', channel: 'Email', hoursAgo: 9, from: { name: 'Anita Desai', org: 'TechSparks Summit', title: 'Programme Director', followers: 0, verified: true }, subject: 'Keynote invitation — creator economy panel', message: 'We would like to invite you to speak at TechSparks Bengaluru in November, as a keynote on the creator economy panel. Travel and stay covered.' },
  { id: 'o4', channel: 'Community', hoursAgo: 11, from: { name: 'Akash Gupta', org: 'Community member', title: 'Founder', followers: 5100, verified: false, memberId: 'm_akash' }, subject: 'Proposal: Hyderabad chapter', message: 'I would like to start a Hyderabad chapter of the community and organise monthly meetups with volunteers. 60 members already said they would join.' },
  { id: 'o5', channel: 'LinkedIn', hoursAgo: 14, from: { name: 'Marcus Lee', org: 'Northstar Ventures', title: 'Partner', followers: 12000, verified: true }, subject: 'Advisory role + investment', message: 'We are a seed-stage fund. Would you consider an advisory role with equity for one of our portfolio startups building AI notes? Happy to discuss an investment angle too.' },
  { id: 'o6', channel: 'Email', hoursAgo: 20, from: { name: 'Priyanka Shah', org: 'Lumen Labs', title: 'Head of Talent', followers: 0, verified: true }, subject: 'Hiring 4 AI engineers — share with your community?', message: 'We are hiring 4 AI engineers and a designer. Could you share the role with your community? We would love to hire from your audience.' },
  { id: 'o7', channel: 'YouTube comment', hoursAgo: 22, from: { name: 'GrowFast Media', org: '', title: '', followers: 0, verified: false }, subject: 'GROW 10K FOLLOWERS', message: '🔥🔥 GROW YOUR FOLLOWERS 10K IN 24 HRS!!! DM NOW http://bit.ly/grow-now 100% REAL 🔥🔥' },
  { id: 'o8', channel: 'X DM', hoursAgo: 26, from: { name: 'Nina Park', org: 'Cohere-ish AI', title: 'DevRel', followers: 23000, verified: true }, subject: 'Sponsor the 30-day challenge', message: 'Saw your community is discussing a 30-day AI builder challenge. We would like to sponsor prizes and API credits for participants — brand partnership if it fits.' },
  { id: 'o9', channel: 'Instagram DM', hoursAgo: 30, from: { name: 'cryptoking_99', org: '', title: '', followers: 12, verified: false }, subject: 'Free ETH', message: 'Crypto giveaway!! Send 0.1 ETH and get 1 ETH back guaranteed. Limited time, click http://eth-double.xyz' },
  { id: 'o10', channel: 'Email', hoursAgo: 34, from: { name: 'Daniel Moreno', org: 'Pixel & Co.', title: 'Founder', followers: 4100, verified: false }, subject: 'Collab on a design + AI video', message: 'We are a small design studio. Want to collab on a video showing how designers use AI in a real client project? We can bring the client case study.' },
  { id: 'o11', channel: 'Email', hoursAgo: 40, from: { name: 'Karthik N', org: 'IIT Madras E-Cell', title: 'Events Lead', followers: 0, verified: true }, subject: 'Guest talk at E-Summit', message: 'Would you join E-Summit as a speaker for a fireside chat on building in public? 4,000 students attend.' },
  { id: 'o12', channel: 'Community', hoursAgo: 46, from: { name: 'Rahul Sharma', org: 'Community member', title: 'Developer', followers: 12400, verified: false, memberId: 'm_rahul' }, subject: 'Volunteer team for the AI directory', message: 'I have a team of 5 developers and designers from the community ready to build the AI tool directory. Can we propose it as an official community project?' },
  { id: 'o13', channel: 'Email', hoursAgo: 52, from: { name: 'Olivia Brown', org: 'Notely', title: 'Marketing Manager', followers: 0, verified: true }, subject: 'Paid integration', message: 'Notely would like a 60-second paid integration in your next video. Our usual budget is $3,500. Let us know your rates.' },
  { id: 'o14', channel: 'X DM', hoursAgo: 60, from: { name: 'random_user_88', org: '', title: '', followers: 3, verified: false }, subject: 'follow back', message: 'follow for follow?? pls follow back' },
  { id: 'o15', channel: 'Email', hoursAgo: 70, from: { name: 'Sana Mirza', org: 'Acquire.fyi', title: 'M&A Associate', followers: 0, verified: false }, subject: 'Acquisition interest in your template business', message: 'A buyer is interested to acquire or license your Notion template business. Would you be open to an exploratory call?' },
  { id: 'o16', channel: 'Instagram DM', hoursAgo: 75, from: { name: 'Tara Fernandes', org: '', title: 'Video Editor', followers: 900, verified: false }, subject: 'Can I edit for you?', message: 'Hi! I am a video editor and would love to edit one of your shorts for free to show what I can do.' },
];

// ---------- Projects ----------
const ideaByTitle = (t) => IDEAS.find((i) => i.title === t);
export const PROJECTS = [
  {
    id: 'p1', name: 'AI Soundboard for Podcasters', ideaId: ideaByTitle('AI soundboard for podcasters').id,
    description: 'An AI soundboard that suggests and plays effects live based on the conversation.',
    createdDaysAgo: 34, status: 'Building',
    contributors: [{ memberId: 'm_rahul', role: 'Developer' }, { memberId: 'm_dev', role: 'Developer' }, { memberId: 'm_zara', role: 'Designer' }, { memberId: 'm_ankit', role: 'Marketer' }],
    tasks: [
      { id: 't1', title: 'Prototype speech-to-intent pipeline', done: true, assignee: 'm_dev' },
      { id: 't2', title: 'Design the soundboard UI', done: true, assignee: 'm_zara' },
      { id: 't3', title: 'Build effect recommendation engine', done: true, assignee: 'm_rahul' },
      { id: 't4', title: 'Beta with 20 community podcasters', done: false, assignee: 'm_ankit' },
      { id: 't5', title: 'Launch video with Kunal', done: false, assignee: 'm_ankit' },
    ],
    updates: [
      { id: 'u1', memberId: 'm_rahul', text: 'Latency is now under 300ms. Ready for beta testers.', daysAgo: 2 },
      { id: 'u2', memberId: 'm_zara', text: 'Final UI is in Figma — dark mode included.', daysAgo: 6 },
    ],
  },
  {
    id: 'p2', name: 'Creator Notion OS', ideaId: ideaByTitle('Notion OS template for content planning').id,
    description: 'A full content operating system in Notion: ideas → scripts → editing → publishing.',
    createdDaysAgo: 28, status: 'Launching',
    contributors: [{ memberId: 'm_meera', role: 'Writer' }, { memberId: 'm_priya', role: 'Designer' }, { memberId: 'm_sneha', role: 'Video Editor' }],
    tasks: [
      { id: 't1', title: 'Map the content workflow', done: true, assignee: 'm_meera' },
      { id: 't2', title: 'Design template covers', done: true, assignee: 'm_priya' },
      { id: 't3', title: 'Record walkthrough video', done: true, assignee: 'm_sneha' },
      { id: 't4', title: 'Publish to community', done: false, assignee: 'm_meera' },
    ],
    updates: [{ id: 'u1', memberId: 'm_meera', text: 'Template is done. Publishing Monday.', daysAgo: 1 }],
  },
  {
    id: 'p3', name: 'Design Critique Fridays', ideaId: ideaByTitle('Design critique Fridays').id,
    description: 'A weekly structured critique session for community designers.', createdDaysAgo: 21, status: 'Active',
    contributors: [{ memberId: 'm_priya', role: 'Designer' }, { memberId: 'm_zara', role: 'Designer' }],
    tasks: [
      { id: 't1', title: 'Write the critique format & rules', done: true, assignee: 'm_zara' },
      { id: 't2', title: 'Host first 3 sessions', done: true, assignee: 'm_priya' },
      { id: 't3', title: 'Publish best-of gallery', done: false, assignee: 'm_priya' },
    ],
    updates: [{ id: 'u1', memberId: 'm_zara', text: '3 sessions done, 64 designers joined.', daysAgo: 3 }],
  },
  {
    id: 'p4', name: 'Marketer Prompt Library', ideaId: ideaByTitle('Prompt library for marketers').id,
    description: 'A shared, tested prompt library for copy, ads, SEO briefs and reports.', createdDaysAgo: 12, status: 'Active',
    contributors: [{ memberId: 'm_ankit', role: 'Marketer' }, { memberId: 'm_neha', role: 'Marketer' }, { memberId: 'm_meera', role: 'Writer' }],
    tasks: [
      { id: 't1', title: 'Collect 50 prompts from members', done: true, assignee: 'm_neha' },
      { id: 't2', title: 'Test & rate each prompt', done: false, assignee: 'm_ankit' },
      { id: 't3', title: 'Publish as a free template', done: false, assignee: 'm_meera' },
    ],
    updates: [{ id: 'u1', memberId: 'm_neha', text: '62 prompts collected so far.', daysAgo: 2 }],
  },
  {
    id: 'p5', name: 'Open-Source Editing Presets', ideaId: ideaByTitle('Open-source the editing presets used in the videos').id,
    description: 'Colour grades and caption presets released for community editors.', createdDaysAgo: 40, status: 'Shipped',
    contributors: [{ memberId: 'm_sneha', role: 'Video Editor' }],
    tasks: [
      { id: 't1', title: 'Package presets', done: true, assignee: 'm_sneha' },
      { id: 't2', title: 'Write install guide', done: true, assignee: 'm_sneha' },
    ],
    updates: [{ id: 'u1', memberId: 'm_sneha', text: 'Released! 1,900 downloads in the first week.', daysAgo: 9 }],
  },
];
