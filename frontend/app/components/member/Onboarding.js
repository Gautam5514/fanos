'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useStore } from '../../lib/store';
import { CREATOR, GOALS, INTERESTS, ROLES, ROLE_SKILLS, communitiesForProfile } from '../../lib/seed';
import { Avatar, Button, cx } from '../ui';
import { PanelSteps, SplitShell } from '../chrome';

const INTEREST_EMOJI = { AI: '🤖', Startups: '🚀', Marketing: '📈', Design: '🎨', Fitness: '💪', Finance: '💰', 'Content Creation': '🎥', Automation: '⚡', Productivity: '🗂️' };
const ROLE_EMOJI = { Developer: '👨‍💻', Designer: '🎨', Founder: '🚀', 'Video Editor': '🎬', Writer: '✍️', Investor: '💰', Student: '🎓', Marketer: '📢', Other: '✨' };
const GOAL_EMOJI = { Learn: '📚', 'Share ideas': '💡', Collaborate: '🤝', 'Find opportunities': '🎯', 'Help projects': '🛠️', 'Meet people': '👋' };

function Pick({ options, emoji, value, onToggle, multi = true }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const on = multi ? value.includes(o) : value === o;
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onToggle(o)}
            className={cx('group flex items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition duration-200 active:scale-[.98]', on ? 'border-accent bg-accent-soft text-ink shadow-[0_8px_24px_-12px_rgba(91,61,245,.5)] ring-4 ring-accent/10' : 'border-line bg-white text-ink-2 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-card')}>
            <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg transition group-hover:scale-110', on ? 'bg-white' : 'bg-line-2')} aria-hidden="true">{emoji[o]}</span>
            <span className="flex-1">{o}</span>
            {on && <Check className="h-4 w-4 text-accent" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

// Shown to a signed-in member who has not joined any community yet (they signed up without
// an invite link). They paste a creator's invite link (or id) to join the right community.
function JoinCommunityGate() {
  const { dispatch, auth } = useStore();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Accept a full invite link (…/join/<id>) or a bare community id.
  const extractId = (raw) => {
    const s = raw.trim();
    const m = s.match(/\/join\/([^/?#]+)/i);
    return decodeURIComponent(m ? m[1] : s);
  };

  const submit = async (e) => {
    e.preventDefault();
    const id = extractId(value);
    if (!id) { setError('Paste the invite link your creator shared.'); return; }
    setError(''); setBusy(true);
    try { await auth.joinCommunity(id); }
    catch (err) { setError(err.status ? err.message : 'Could not join. Check the link and try again.'); }
    finally { setBusy(false); }
  };

  return (
    <SplitShell
      eyebrow="One step to go"
      panelTitle={<>Join a creator&rsquo;s <span className="ai-gradient-animated">community.</span></>}
      panel={(
        <div className="rounded-3xl border border-white/15 bg-white/[.07] p-6 text-white/80 backdrop-blur-xl">
          <p className="text-sm">Every community on FanOS belongs to a creator. Open the invite link your creator shared with you, or paste it here to join.</p>
        </div>
      )}
      topRight={<button onClick={() => auth.logout()} className="transition hover:text-ink">Log out</button>}
    >
      <form onSubmit={submit} className="animate-fade-up max-w-md">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Join a community</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">Paste your <span className="ai-gradient-animated">invite link</span></h1>
        <p className="mt-2 text-ink-2">You created an account, but you&rsquo;re not part of a community yet. Paste the invite link your creator gave you to join.</p>
        <label htmlFor="join-link" className="mt-7 block text-sm font-medium text-ink">Invite link</label>
        <input id="join-link" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" placeholder="https://…/join/…" className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" />
        {error && <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">{error}</p>}
        <Button type="submit" variant="accent" size="lg" className="mt-6 w-full" icon={ArrowRight} disabled={busy || !value.trim()}>{busy ? 'Joining…' : 'Join community'}</Button>
        <button type="button" onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })} className="mt-4 block text-sm text-muted transition hover:text-ink">Back to home</button>
      </form>
    </SplitShell>
  );
}

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const live = !!state.user; // onboarding only runs for a signed-in member

  // Live: the account already exists, so start at "interests" with the account name.
  const [step, setStep] = useState(live ? 1 : 0);
  const [name, setName] = useState(state.user?.name || '');
  const [interests, setInterests] = useState([]);
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [joined, setJoined] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toggle = (set) => (v) => set((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  const matched = useMemo(() => communitiesForProfile(interests, role, state.communities), [interests, role, state.communities]);
  const noCommunities = state.communities.length === 0;
  const communities = joined ?? matched;
  const steps = ['Join', 'Interests', 'Contribute', 'Goals', 'Communities'];
  const canNext = [name.trim().length >= 2, interests.length > 0 && name.trim().length >= 2, !!role, goals.length > 0, true][step]; // communities are optional: members can join them later

  const finish = () => dispatch({ type: 'ONBOARD', ...(state.user ? { memberId: `m_u_${state.user.id}` } : {}), profile: { name: name.trim().slice(0, 40), interests, role, skills, goals }, communities });
  // Submit once; the store routes to the member app on success. Guard against double taps.
  const handleFinish = () => { if (submitting) return; setSubmitting(true); finish(); };

  // A member who signed up without an invite link has no community yet. Gate onboarding
  // behind pasting a creator's invite link so they join the right community first.
  // (Declared after all hooks so hook order stays stable across renders.)
  if (live && state.needsCommunity) return <JoinCommunityGate />;

  const firstName = name.trim().split(' ')[0];
  const memberCard = (
    <div className="rounded-3xl border border-white/15 bg-white/[.07] p-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Avatar name={name.trim() || 'You'} size={44} />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-white">{name.trim() || 'Your name'}</p>
          <p className="text-xs text-white/60">{role ? `${ROLE_EMOJI[role]} ${role}` : 'Member'} · {CREATOR.firstName}’s community</p>
        </div>
      </div>
      {(skills.length > 0 || interests.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.map((x) => <span key={x} className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white">{x}</span>)}
          {interests.map((x) => <span key={x} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/80">{INTEREST_EMOJI[x] || '•'} {x}</span>)}
        </div>
      )}
      {goals.length > 0 && <p className="mt-3 text-xs text-white/60">Here to: {goals.join(' · ')}</p>}
      {step === 4 && <p className="mt-3 text-xs font-medium text-white/80">Joining {communities.length} communit{communities.length === 1 ? 'y' : 'ies'}</p>}
    </div>
  );

  return (
    <SplitShell
      wide
      eyebrow={`Step ${step + 1} of ${steps.length}`}
      panelTitle={<>Become more than <span className="ai-gradient-animated">a follower.</span></>}
      panel={<div className="space-y-6"><PanelSteps steps={steps} current={step} />{memberCard}</div>}
      panelFooter={state.members.length ? `${state.members.length.toLocaleString('en-US')} member${state.members.length === 1 ? ' has' : 's have'} already joined` : 'Be one of the first members to join'}
      topRight={live ? <span>Signed in as {state.user?.email}</span> : <button onClick={() => dispatch({ type: 'NAV', patch: { view: 'landing' } })} className="transition hover:text-ink">Exit</button>}
    >
      <div>
        <div className="mb-8 lg:hidden">
          <ol className="flex gap-1.5" aria-label="Progress">
            {steps.map((s, i) => <li key={s} className={cx('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-gradient-to-r from-accent to-coral' : 'bg-line')} aria-current={i === step ? 'step' : undefined}><span className="sr-only">{s}</span></li>)}
          </ol>
          <p className="mt-2 text-xs text-muted">Step {step + 1} of {steps.length} · {steps[step]}</p>
        </div>

        <div key={step} className="animate-fade-up">
          {step === 0 && (
            <>
              <div className="flex items-center gap-3"><Avatar name={CREATOR.name} size={48} /><div><p className="text-sm text-muted">You’re invited by</p><p className="font-semibold text-ink">{CREATOR.name} <span className="font-normal text-muted">{CREATOR.handle}</span></p></div></div>
              <h1 className="mt-6 font-display text-4xl font-semibold text-ink sm:text-5xl">Join <span className="ai-gradient-animated">{CREATOR.firstName}’s</span> community</h1>
              <p className="mt-2 text-ink-2">Share ideas, build projects and find collaborators. Become more than a follower.</p>
              <label htmlFor="ob-name" className="mt-8 block text-sm font-medium text-ink">Your name</label>
              <input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" placeholder="e.g. Aditi Rao" className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" />
              {name.trim().length > 0 && name.trim().length < 2 && <p className="mt-1.5 text-xs text-coral">Enter at least 2 characters.</p>}
              <div className="mt-4">
                <Button variant="primary" size="lg" className="w-full" disabled={!canNext} onClick={() => setStep(1)}>Continue</Button>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">What are you <span className="ai-gradient-animated">into</span>{firstName ? `, ${firstName}` : ''}?</h1>
              <p className="mb-6 mt-2 text-ink-2">Pick as many as you like. We’ll match you to the right communities.</p>
              {live && (
                <label className="mb-6 block max-w-sm">
                  <span className="text-sm font-medium text-ink">Display name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" placeholder="e.g. Aditi Rao"
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10" />
                  {name.trim().length > 0 && name.trim().length < 2 && <span className="mt-1 block text-xs text-coral">Enter at least 2 characters.</span>}
                </label>
              )}
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Interests</p>
                {interests.length > 0 && <span className="text-xs text-muted">{interests.length} selected</span>}
              </div>
              <Pick options={INTERESTS} emoji={INTEREST_EMOJI} value={interests} onToggle={toggle(setInterests)} />
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">What can you <span className="ai-gradient-animated">contribute?</span></h1>
              <p className="mb-6 mt-2 text-ink-2">{CREATOR.firstName} and other members can find you by your skills — not your follower count.</p>
              <Pick options={ROLES} emoji={ROLE_EMOJI} value={role} multi={false} onToggle={(r) => { setRole(r); setSkills([]); }} />
              {role && ROLE_SKILLS[role] && (
                <div className="mt-6 animate-fade-up">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">Your skills <span className="font-normal text-muted">(optional)</span></p>
                    {skills.length > 0 && <span className="text-xs text-muted">{skills.length} selected</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROLE_SKILLS[role].map((s) => {
                      const on = skills.includes(s);
                      return <button key={s} type="button" aria-pressed={on} onClick={() => toggle(setSkills)(s)} className={cx('rounded-full border px-3 py-1.5 text-sm transition', on ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink-2 hover:border-ink/25')}>{s}</button>;
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Why are you <span className="ai-gradient-animated">here?</span></h1>
              <p className="mb-6 mt-2 text-ink-2">This helps us show you the right ideas and people.</p>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Your goals</p>
                {goals.length > 0 && <span className="text-xs text-muted">{goals.length} selected</span>}
              </div>
              <Pick options={GOALS} emoji={GOAL_EMOJI} value={goals} onToggle={toggle(setGoals)} />
            </>
          )}
          {step === 4 && (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI matched</p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-4xl">Your <span className="ai-gradient-animated">communities</span></h1>
              <p className="mb-6 mt-2 text-ink-2">{noCommunities ? `${CREATOR.firstName === 'your creator' ? 'Your creator' : CREATOR.firstName} has not created any communities yet. You can join them later from the Communities page.` : `Based on your interests and skills, we picked ${matched.length} communit${matched.length === 1 ? 'y' : 'ies'}. Adjust anytime.`}</p>
              {!noCommunities && communities.length === 0 && <p className="-mt-4 mb-5 rounded-xl bg-amber-soft px-3 py-2 text-sm text-ink">None of these matched your interests. Tap one to join, or continue and join later from Communities.</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {state.communities.map((c) => {
                  const on = communities.includes(c.id);
                  return (
                    <button key={c.id} type="button" aria-pressed={on} onClick={() => setJoined(on ? communities.filter((x) => x !== c.id) : [...communities, c.id])}
                      className={cx('flex items-center gap-3 rounded-2xl border p-4 text-left transition', on ? 'border-accent bg-accent-soft ring-4 ring-accent/10' : 'border-line bg-white hover:border-ink/25')}>
                      <span className="text-2xl" aria-hidden="true">{c.emoji}</span>
                      <span className="min-w-0 flex-1"><span className="block font-medium text-ink">{c.name}</span><span className="text-xs text-muted">{c.members.toLocaleString('en-US')} members{matched.includes(c.id) ? ' • recommended' : ''}</span></span>
                      <span className={cx('flex h-5 w-5 items-center justify-center rounded-md border', on ? 'border-accent bg-accent text-white' : 'border-line')}>{on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {step > 0 && (
          <div className="mt-10 flex items-center justify-between">
            <Button variant="ghost" icon={ArrowLeft} disabled={live && step === 1} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 4
              ? <Button variant="primary" size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              : <Button variant="accent" size="lg" icon={Sparkles} disabled={!canNext || submitting} onClick={handleFinish}>{submitting ? 'Entering…' : 'Enter the community'}</Button>}
          </div>
        )}
      </div>
    </SplitShell>
  );
}
