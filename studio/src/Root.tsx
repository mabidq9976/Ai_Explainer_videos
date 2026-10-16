import React from "react";
import { Composition } from "remotion";
import { Episode } from "./Episode";
import { TestCard } from "./TestCard";
import { AvatarSheet, loadAvatarSheet, SHEET_W, SHEET_H } from "./AvatarSheet";
import { loadEpisode, totalSeconds } from "./load";
import type { EpisodeProps } from "./types";
import { W, H, FPS } from "./theme";

const empty: EpisodeProps = { scene: null, timing: null, mouth: null, manifest: {}, avatarSvg: null, rig: {}, music: null, musicDuration: null, sfx: {}, sfxDur: {}, hasAudio: false, estimated: true };

export const Root: React.FC = () => (
  <>
    <Composition
      id="Episode"
      component={Episode}
      width={W}
      height={H}
      fps={FPS}
      durationInFrames={FPS * 3}
      defaultProps={empty}
      calculateMetadata={async () => {
        const props = await loadEpisode();
        return { props, durationInFrames: Math.max(FPS, Math.ceil(totalSeconds(props) * FPS)) };
      }}
    />
    <Composition id="AvatarSheet" component={AvatarSheet} width={SHEET_W} height={SHEET_H} fps={FPS} durationInFrames={1} defaultProps={{ svg: null }}
      calculateMetadata={async () => ({ props: await loadAvatarSheet() })} />
    <Composition id="TestCard" component={TestCard} width={W} height={H} fps={FPS} durationInFrames={90} />
  </>
);
