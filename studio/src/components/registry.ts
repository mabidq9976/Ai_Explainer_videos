import type React from "react";
import { HookTitle } from "./HookTitle";
import { BigQuestion } from "./BigQuestion";
import { SerpVsAiAnswer } from "./SerpVsAiAnswer";
import { CitationCards } from "./CitationCards";
import { StatCounter } from "./StatCounter";
import { KeywordCloud } from "./KeywordCloud";
import { Checklist } from "./Checklist";
import { QuoteCard } from "./QuoteCard";
import { BrowserFrame } from "./BrowserFrame";
import { CTAEnd } from "./CTAEnd";
import { Diagram } from "./Diagram";
import { Toggle } from "./Toggle";
import { DeviceFrame } from "./DeviceFrame";
import { ProfileList } from "./ProfileList";
import { Waveform } from "./Waveform";
import { RedditFeed } from "./RedditFeed";
import { SearchBar3D } from "../three/SearchBar3D";
import { NodeNetwork3D } from "../three/NodeNetwork3D";

// Every name here must also be in catalog.json (validate.ts and the director skill read that file).
export const registry: Record<string, React.FC<any>> = {
  HookTitle,
  BigQuestion,
  SerpVsAiAnswer,
  CitationCards,
  StatCounter,
  KeywordCloud,
  Checklist,
  QuoteCard,
  BrowserFrame,
  CTAEnd,
  Diagram,
  Toggle,
  DeviceFrame,
  ProfileList,
  Waveform,
  RedditFeed,
  SearchBar3D,
  NodeNetwork3D,
};
