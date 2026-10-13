// Icon sets used by the onboarding screens (instead of emoji, which render differently — or not at
// all — on different devices). Community "emoji" values stay in the data; screens show an icon.
import { createElement } from 'react';
import {
  BookOpen, Bot, Boxes, Briefcase, Clapperboard, CodeXml, Cpu, Dumbbell, Gamepad2, GraduationCap, Handshake, Landmark,
  Lightbulb, ListChecks, Megaphone, MessageCircle, Palette, PenLine, PenTool, Rocket, Sparkles, Target, TrendingUp, Users,
  Video, Wallet, Wrench, Zap,
} from 'lucide-react';

export const INTEREST_ICON = { AI: Bot, Technology: Cpu, Startups: Rocket, Marketing: TrendingUp, Design: Palette, Fitness: Dumbbell, Finance: Wallet, 'Content Creation': Video, Automation: Zap, Productivity: ListChecks };
export const ROLE_ICON = { Developer: CodeXml, Designer: PenTool, Founder: Rocket, 'Video Editor': Clapperboard, Writer: PenLine, Investor: Landmark, Student: GraduationCap, Marketer: Megaphone, Other: Sparkles };
export const NEED_ICON = { Developer: CodeXml, Designer: PenTool, Marketing: Megaphone, 'Video Editor': Clapperboard, Writer: PenLine, Funding: Wallet, Feedback: MessageCircle };
export const GOAL_ICON = { Learn: BookOpen, 'Share ideas': Lightbulb, Collaborate: Handshake, 'Find opportunities': Target, 'Help projects': Wrench, 'Meet people': Users };

// Best icon for a space/community from its name.
const SPACE_RULES = [
  [/general|hangout|chat/i, MessageCircle], [/\bai\b|automation|agent|llm/i, Bot], [/startup|founder|business/i, Rocket],
  [/dev|code|engineer|software|tech/i, CodeXml], [/design|creative|art|ui|ux/i, Palette], [/content|creator|video|edit|podcast/i, Video],
  [/market|growth|brand|sales/i, TrendingUp], [/financ|invest|money|crypto/i, Wallet], [/fitness|health|gym|yoga/i, Dumbbell],
  [/product|focus|habit/i, ListChecks], [/learn|study|educat|course/i, GraduationCap], [/gam|stream|esport/i, Gamepad2],
  [/work|career|job/i, Briefcase],
];
export const spaceIconFor = (name = '') => SPACE_RULES.find(([re]) => re.test(name))?.[1] || Boxes;

export function SpaceIcon({ name, className = 'h-4 w-4' }) {
  return createElement(spaceIconFor(name), { className, 'aria-hidden': true });
}

// FanOS AI icon: a chat bubble with a spark inside. Used wherever a feature is "AI", so it is
// instantly recognisable (the plain sparkle is kept for decoration). Accepts lucide-style props.
export function AiIcon({ className = 'h-4 w-4', strokeWidth = 1.9, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v7.5A2.5 2.5 0 0 1 18 17h-5.2L8.6 20.2a.6.6 0 0 1-1-.5V17H6a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 6 4.5Z" />
      <path d="M12 7.6l.95 2.45 2.45.95-2.45.95L12 14.4l-.95-2.45L8.6 11l2.45-.95L12 7.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
