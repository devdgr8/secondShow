"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "title" | "playing" | "over";
type Result = { label: string; detail: string; good: boolean; at: number };
type Decoy = { at: number; x: number; y: number };
type Reel = {
  number: number;
  film: number;
  cue1: number;
  cue2: number;
  target: number;
  dim: number;
  decoys: Decoy[];
  result: Result | null;
};

const W = 960;
const H = 600;
const SCREEN = { x: 40, y: 22, w: 880, h: 495 };
const CUE = { x: SCREEN.x + SCREEN.w - 72, y: SCREEN.y + 62, r: 24 };
const CUE_MS = 170;
const RAN_OUT_MS = 260;
const NEXT_REEL_MS = 1200;
const TOTAL_SEATS = 12;
const BEST_KEY = "second-show-changeover-best";
const MUTE_KEY = "second-show-changeover-muted";

/** Late or early by up to `ms`: label, points, seats lost. */
const GRADES = [
  { ms: 35, label: "Invisible", points: 100, seats: 0 },
  { ms: 80, label: "Clean", points: 60, seats: 0 },
  { ms: 160, label: "A little bump", points: 30, seats: 0 },
  { ms: RAN_OUT_MS, label: "Rough cut", points: 10, seats: 1 },
];
const MISS_SEATS = 4;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const FILMS: { title: string; draw: (c: CanvasRenderingContext2D, drift: number) => void }[] = [
  {
    title: "The Last Train",
    draw(c, drift) {
      c.fillStyle = "#e6d3a4";
      c.beginPath();
      c.arc(690, 130, 46, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#1c130d";
      c.fillRect(0, 370, W, 150);
      const x = 700 - drift * 70;
      c.fillRect(x, 300, 150, 72);
      c.fillRect(x + 165, 315, 150, 57);
      c.fillRect(x + 330, 315, 150, 57);
      c.fillRect(x + 22, 262, 26, 40);
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(x + 48 + i * 40, 372, 18, 0, Math.PI * 2);
        c.fill();
      }
    },
  },
  {
    title: "A Lamp at Harbour Street",
    draw(c, drift) {
      c.fillStyle = "#1c130d";
      c.fillRect(0, 410, W, 110);
      c.fillRect(250, 165, 9, 250);
      c.fillRect(250, 165, 70, 9);
      c.fillRect(620 - drift * 40, 320, 38, 92);
      c.beginPath();
      c.arc(639 - drift * 40, 302, 20, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(240, 220, 170, 0.35)";
      c.beginPath();
      c.moveTo(312, 174);
      c.lineTo(190, 412);
      c.lineTo(440, 412);
      c.fill();
    },
  },
  {
    title: "Rooftops After Midnight",
    draw(c, drift) {
      c.fillStyle = "#1c130d";
      [90, 170, 110, 220, 140, 190, 120].forEach((height, index) => {
        c.fillRect(30 + index * 130 - drift * 24, 520 - height, 116, height);
      });
      c.fillStyle = "#e6d3a4";
      for (let i = 0; i < 16; i++) {
        c.fillRect(60 + ((i * 113) % 860) - drift * 24, 370 + ((i * 47) % 110), 11, 15);
      }
    },
  },
  {
    title: "The Woman Who Stayed",
    draw(c, drift) {
      c.fillStyle = "#c9b283";
      c.fillRect(330, 92, 300, 330);
      c.fillStyle = "#1c130d";
      c.fillRect(476, 92, 8, 330);
      c.fillRect(330, 250, 300, 8);
      c.fillRect(0, 420, W, 100);
      c.beginPath();
      c.arc(400 + drift * 16, 268, 34, 0, Math.PI * 2);
      c.fill();
      c.fillRect(358 + drift * 16, 300, 84, 124);
    },
  },
];

function drawFrame(
  c: CanvasRenderingContext2D,
  now: number,
  reel: Reel | null,
  seats: number,
  calm: boolean,
  fonts: { display: string; stub: string },
) {
  c.fillStyle = "#0a0706";
  c.fillRect(0, 0, W, H);

  c.save();
  c.beginPath();
  c.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  c.clip();
  const film = FILMS[(reel?.film ?? 0) % FILMS.length];
  const drift = reel ? (now - reel.cue1) / 4000 + 1 : now / 4000;
  const ranOut = reel?.result?.label === "The reel ran out";

  if (ranOut) {
    // Leader running through the gate after the picture has ended.
    c.fillStyle = "#b9ab8a";
    c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  } else {
    const glow = c.createLinearGradient(0, SCREEN.y, 0, SCREEN.y + SCREEN.h);
    glow.addColorStop(0, "#8c7a57");
    glow.addColorStop(1, "#4b3d29");
    c.fillStyle = glow;
    c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
    film.draw(c, drift % 3);
    c.fillStyle = "#f6e9c9";
    c.font = `30px ${fonts.display}`;
    c.textAlign = "left";
    c.fillText(film.title, SCREEN.x + 28, SCREEN.y + SCREEN.h - 28);
  }

  if (!calm) {
    c.fillStyle = "rgba(255, 245, 218, 0.1)";
    for (let i = 0; i < 90; i++) {
      c.fillRect(SCREEN.x + Math.random() * SCREEN.w, SCREEN.y + Math.random() * SCREEN.h, 2, 2);
    }
    c.fillStyle = "rgba(20, 12, 8, 0.22)";
    c.fillRect(SCREEN.x + Math.random() * SCREEN.w, SCREEN.y, 1.5, SCREEN.h);
  }

  if (reel && !reel.result) {
    const lit = [reel.cue1, reel.cue2].some((at) => now >= at && now < at + CUE_MS);
    if (lit) drawCue(c, CUE.x, CUE.y, reel.dim);
    for (const decoy of reel.decoys) {
      if (now >= decoy.at && now < decoy.at + CUE_MS) drawCue(c, decoy.x, decoy.y, reel.dim * 0.8);
    }
  }
  c.restore();

  c.fillStyle = "#17100c";
  for (let seat = 0; seat < TOTAL_SEATS; seat++) {
    const x = 92 + seat * 70;
    c.fillRect(x - 28, 560, 56, 40);
    if (seat < seats) {
      c.fillStyle = "#040302";
      c.beginPath();
      c.arc(x, 548, 17, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x - 24, 562, 48, 38);
      c.fillStyle = "#17100c";
    }
  }
}

function drawCue(c: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = "#fffdf4";
  c.strokeStyle = "#140d09";
  c.lineWidth = 5;
  c.beginPath();
  c.ellipse(x, y, CUE.r * 1.15, CUE.r, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
}

/** The projector's clatter, a soft tick on each cue, and the clunk of the switch. */
function createSound() {
  const context = new AudioContext();
  const output = context.createGain();
  output.gain.value = 0.5;
  output.connect(context.destination);

  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let frame = 0; frame < 24; frame++) {
    const start = Math.floor((frame / 24) * context.sampleRate);
    for (let i = 0; i < 500; i++) samples[start + i] = (Math.random() - 0.5) * (1 - i / 500);
  }
  const clatter = context.createBufferSource();
  clatter.buffer = buffer;
  clatter.loop = true;
  const clatterLevel = context.createGain();
  clatterLevel.gain.value = 0.1;
  clatter.connect(clatterLevel).connect(output);
  clatter.start();

  const tone = (frequency: number, seconds: number, level: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(level, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds);
    oscillator.connect(gain).connect(output);
    oscillator.start();
    oscillator.stop(context.currentTime + seconds);
  };

  return {
    tick: () => tone(1320, 0.05, 0.12),
    clunk: () => tone(110, 0.14, 0.5),
    setMuted: (muted: boolean) => output.gain.setValueAtTime(muted ? 0 : 0.5, context.currentTime),
    close: () => context.close(),
  };
}

const readStored = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

export function Changeover() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("title");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seats, setSeats] = useState(TOTAL_SEATS);
  const [reelNumber, setReelNumber] = useState(0);
  const [projector, setProjector] = useState<"A" | "B">("A");
  const [result, setResult] = useState<Result | null>(null);
  const [muted, setMuted] = useState(false);

  const game = useRef({
    phase: "title" as Phase,
    reel: null as Reel | null,
    score: 0,
    streak: 0,
    seats: TOTAL_SEATS,
    best: 0,
    played: 0,
    ticked: [false, false],
  });
  const sound = useRef<ReturnType<typeof createSound> | null>(null);
  const mutedRef = useRef(false);

  useEffect(() => {
    const savedBest = Number(readStored(BEST_KEY)) || 0;
    const savedMute = readStored(MUTE_KEY) === "1";
    game.current.best = savedBest;
    mutedRef.current = savedMute;
    setBest(savedBest);
    setMuted(savedMute);
  }, []);

  const nextReel = (now: number) => {
    const g = game.current;
    g.played += 1;
    const level = Math.floor((g.played - 1) / 3);
    const centre = Math.max(560, 1100 - level * 70);
    const spread = Math.min(320, 120 + level * 40);
    const interval = rand(centre - spread / 2, centre + spread / 2);
    const cue1 = now + rand(1500, 2800);
    const cue2 = cue1 + interval;
    const target = cue2 + interval;

    // Scratches on an old print look like cue marks, so later reels add them in other corners.
    const decoys: Decoy[] = [];
    if (g.played >= 6) {
      const corners = [
        [SCREEN.x + 72, SCREEN.y + 62],
        [SCREEN.x + 72, SCREEN.y + SCREEN.h - 62],
        [CUE.x, SCREEN.y + SCREEN.h - 62],
      ];
      for (let i = 0; i < Math.min(3, level); i++) {
        const [x, y] = corners[Math.floor(Math.random() * corners.length)];
        decoys.push({ at: rand(now + 500, target - 200), x, y });
      }
    }

    g.ticked = [false, false];
    g.reel = {
      number: g.played,
      film: g.played - 1,
      cue1,
      cue2,
      target,
      dim: Math.max(0.6, 1 - level * 0.06),
      decoys,
      result: null,
    };
    setReelNumber(g.played);
    setResult(null);
  };

  const resolve = (reel: Reel, at: number, outcome: Omit<Result, "at">, points: number, lost: number) => {
    const g = game.current;
    reel.result = { ...outcome, at };
    g.streak = outcome.good ? g.streak + 1 : 0;
    g.score += Math.round(points * (1 + Math.max(0, g.streak - 1) * 0.1));
    g.seats = Math.max(0, g.seats - lost);
    setScore(g.score);
    setStreak(g.streak);
    setSeats(g.seats);
    setResult(reel.result);
  };

  const press = (at: number) => {
    const g = game.current;
    const reel = g.reel;
    if (g.phase !== "playing" || !reel || reel.result || at < reel.cue1 - 1000) return;
    sound.current?.clunk();
    setProjector((current) => (current === "A" ? "B" : "A"));

    if (at < reel.cue2) {
      resolve(reel, at, { label: "Too early", detail: "Wait for the second cue.", good: false }, 0, MISS_SEATS);
      return;
    }
    const error = at - reel.target;
    const grade = GRADES.find((entry) => Math.abs(error) <= entry.ms);
    if (!grade) {
      const detail = `${Math.abs(Math.round(error))} ms ${error < 0 ? "early" : "late"}`;
      resolve(reel, at, { label: "Missed it", detail, good: false }, 0, MISS_SEATS);
      return;
    }
    const detail = `${Math.abs(Math.round(error))} ms ${error < 0 ? "early" : "late"}`;
    resolve(reel, at, { label: grade.label, detail, good: grade.seats === 0 }, grade.points, grade.seats);
  };

  const pressRef = useRef(press);
  pressRef.current = press;
  const nextReelRef = useRef(nextReel);
  nextReelRef.current = nextReel;
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;

    const styles = getComputedStyle(document.documentElement);
    const fonts = {
      display: styles.getPropertyValue("--font-display") || "serif",
      stub: styles.getPropertyValue("--font-stub") || "monospace",
    };
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    element.width = W * scale;
    element.height = H * scale;
    context.scale(scale, scale);

    let frame = 0;
    const loop = (now: number) => {
      const g = game.current;
      const reel = g.reel;
      if (g.phase === "playing" && reel) {
        if (!reel.result) {
          [reel.cue1, reel.cue2].forEach((at, index) => {
            if (now >= at && !g.ticked[index]) {
              g.ticked[index] = true;
              sound.current?.tick();
            }
          });
          if (now > reel.target + RAN_OUT_MS) {
            resolveRef.current(
              reel,
              now,
              { label: "The reel ran out", detail: "The audience saw the tail of the film.", good: false },
              0,
              MISS_SEATS,
            );
          }
        } else if (now > reel.result.at + NEXT_REEL_MS) {
          if (g.seats <= 0) {
            g.phase = "over";
            if (g.score > g.best) {
              g.best = g.score;
              setBest(g.score);
              store(BEST_KEY, String(g.score));
            }
            setPhase("over");
            sound.current?.close();
            sound.current = null;
          } else {
            nextReelRef.current(now);
          }
        }
      }
      drawFrame(context, now, g.reel, g.seats, calm, fonts);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || game.current.phase !== "playing") return;
      event.preventDefault();
      if (!event.repeat) pressRef.current(event.timeStamp);
    };
    // A reel that ran while the tab was hidden could not be played fairly, so it restarts.
    const onVisibility = () => {
      const g = game.current;
      if (document.hidden || g.phase !== "playing" || g.reel?.result) return;
      g.played -= 1;
      nextReelRef.current(performance.now());
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      sound.current?.close();
      sound.current = null;
    };
  }, []);

  const start = () => {
    const g = game.current;
    Object.assign(g, { phase: "playing", score: 0, streak: 0, seats: TOTAL_SEATS, played: 0 });
    setScore(0);
    setStreak(0);
    setSeats(TOTAL_SEATS);
    setProjector("A");
    setPhase("playing");
    try {
      sound.current = createSound();
      sound.current.setMuted(mutedRef.current);
    } catch {
      sound.current = null;
    }
    nextReel(performance.now());
  };

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    store(MUTE_KEY, next ? "1" : "0");
    sound.current?.setMuted(next);
  };

  const newBest = phase === "over" && score > 0 && score === best;

  return (
    <div className="game">
      <dl className="game-hud">
        <div>
          <dt>Score</dt>
          <dd>{score}</dd>
        </div>
        <div>
          <dt>Run</dt>
          <dd>{streak}</dd>
        </div>
        <div>
          <dt>Seats</dt>
          <dd>
            {seats}/{TOTAL_SEATS}
          </dd>
        </div>
        <div>
          <dt>Reel</dt>
          <dd>{reelNumber}</dd>
        </div>
        <div>
          <dt>Best</dt>
          <dd>{best}</dd>
        </div>
      </dl>

      <div
        className="game-stage"
        onPointerDown={(event) => {
          if (phase === "playing") {
            event.preventDefault();
            press(event.timeStamp);
          }
        }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label="A cinema screen showing a film, with an audience below it. Cue dots flash in the top right corner."
        />
        <p className="game-projector">Projector {projector}</p>
        {phase === "playing" && result && (
          <p className={result.good ? "game-result" : "game-result game-result-bad"} aria-live="polite">
            <strong>{result.label}</strong>
            <span>{result.detail}</span>
          </p>
        )}
        {phase !== "playing" && (
          <div className="game-overlay">
            {phase === "title" ? (
              <>
                <h2>Two dots. Then you.</h2>
                <p>
                  Watch the top right corner. Two cue dots flash with a gap between them. Wait one
                  more gap, then switch projectors before the reel runs out.
                </p>
              </>
            ) : (
              <>
                <h2>{newBest ? "A new house record." : "The house is empty."}</h2>
                <p>
                  You scored {score} and lasted {reelNumber} reels.
                </p>
              </>
            )}
            <button className="button" onClick={start} autoFocus={phase === "over"}>
              {phase === "title" ? "Start the show" : "Run it again"}
            </button>
          </div>
        )}
      </div>

      <div className="game-controls">
        <button
          className="button game-switch"
          disabled={phase !== "playing"}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            press(event.timeStamp);
          }}
        >
          Changeover
        </button>
        <p className="hint">Press Space, or tap the screen or this button.</p>
        <button className="button-quiet" onClick={toggleMute} aria-pressed={muted}>
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>
    </div>
  );
}
