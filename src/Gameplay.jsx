import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import HUD from "./components/HUD";
import Inventory from "./components/Inventory";
import Shop from "./components/Shop";
import DebugColliders from "./components/DebugColliders";
import Cutscene from "./components/Cutscene";
import { clamp01, canInteractRect } from "./core/math";
import { DONATION_TARGET } from "./core/clinicData";
import { resolveMovement } from "./core/collision";
import {
  MAPS,
  initialPlayer,
  npcList,
  door,
  clinicDoor,
  doorOutside,
  clinicDoorOutside,
  shopFood,
  shopMed,
  shopFoodItems,
  shopMedItems,
  clinicSpawns,
  outsideTeleports,
  getNpcDialogue,
  GAME_CONST,
  DIALOGUE,
} from "./core/entities";
import useRafLoop from "./hooks/useRafLoop";
import useView from "./hooks/useView";
import useKeyboard from "./hooks/useKeyboard";
import HouseScene from "./scenes/HouseScene";
import OutsideScene from "./scenes/OutsideScene";
import ClinicScene from "./scenes/ClinicScene";

import doorOpen from "./assets/sfx/opendoor.mp3";
import footstepSfx from "./assets/sfx/footstep.mp3";

import down0 from "./assets/player/down_0.png";
import down1 from "./assets/player/down_1.png";
import up0 from "./assets/player/up_0.png";
import up1 from "./assets/player/up_1.png";
import left0 from "./assets/player/left_0.png";
import left1 from "./assets/player/left_1.png";
import right0 from "./assets/player/right_0.png";
import right1 from "./assets/player/right_1.png";

const SPRITES = {
  down: [down0, down1],
  up: [up0, up1],
  left: [left0, left1],
  right: [right0, right1],
};

// normalisasi rectangle dari entitas (punya x,y,w,h)
const rectOf = (r) => ({ x: r.x, y: r.y, w: r.w ?? 1, h: r.h ?? 1 });

// helper interaksi: pusat player vs rect dgn radius
const canInteract = (player, rectLike, maxDist = 1.0) =>
  canInteractRect(player, rectOf(rectLike), maxDist);

export default function Gameplay({ soundOn, volume = 1, onExit }) {
  // ===== State utama
  const [player, setPlayer] = useState(initialPlayer);
  const [direction, setDirection] = useState("down");
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState("house");
  const [zoom, setZoom] = useState(1.5);
  const [inventory, setInventory] = useState(Array(15).fill(null));
  const [shopMessage, setShopMessage] = useState("");
  const [showHotbar, setShowHotbar] = useState(false);
  const [fade, setFade] = useState(1);
  const [inputLocked, setInputLocked] = useState(false);
  const [editorOn, setEditorOn] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogText, setDialogText] = useState("");
  const [showShop, setShowShop] = useState(false);
  const [whichShop, setWhichShop] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [clinicOpen, setClinicOpen] = useState(false);
  const [activeNpc, setActiveNpc] = useState(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [dialogLines, setDialogLines] = useState([]);
  const [activeNpcName, setActiveNpcName] = useState(null);
  const [donationTarget, setDonationTarget] = useState(DONATION_TARGET);
  const [donationProgress, setDonationProgress] = useState(0);
  const [showDonationPanel, setShowDonationPanel] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [lastSleepAt, setLastSleepAt] = useState(0);

  // Status di bar
  const [money, setMoney] = useState(9999);
  const [health, setHealth] = useState(100);
  const [hunger, setHunger] = useState(100);
  const [thirst, setThirst] = useState(100);
  const [stamina, setStamina] = useState(100);

  // ===== Refs
  const gameAreaRef = useRef(null);
  const movingRef = useRef({ w: false, a: false, s: false, d: false });
  const playerRef = useRef(player);
  const locationRef = useRef(location); // <— tambah ini
  const walkTimerRef = useRef(0);
  const consumeLockRef = useRef(0);
  const inputLockedRef = useRef(false);
  const doorSfxRef = useRef(null);
  const footstepPoolRef = useRef([]); // beberapa Audio biar ga ketimpa
  const footstepIdxRef = useRef(0);
  const lastStepPlayRef = useRef(0); // optional cooldown
  const lastPosRef = useRef({ x: initialPlayer.x, y: initialPlayer.y });
  const distAccumRef = useRef(0);
  const dialogLockRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = window.__vetroOutsideBgm;
    if (location !== "outside" && a) {
      try {
        a.pause();
        a.src = "";
        a.load?.();
      } catch {}
      window.__vetroOutsideBgm = null;
    }
  }, [location]);

  useEffect(() => {
    const onBlur = () => {
      movingRef.current = { w: false, a: false, s: false, d: false };
      setStep(0);
      distAccumRef.current = 0;
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  const donationProgressRef = useRef(donationProgress);
  useEffect(() => {
    donationProgressRef.current = donationProgress;
  }, [donationProgress]);

  const donationTargetRef = useRef(donationTarget);
  useEffect(() => {
    donationTargetRef.current = donationTarget;
  }, [donationTarget]);

  const directionRef = useRef(direction);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const playerRORef = useRef(player);
  useEffect(() => {
    playerRORef.current = player;
  }, [player]);

  const moneyRef = useRef(money);
  useEffect(() => {
    moneyRef.current = money;
  }, [money]);

  const inventoryRef = useRef(inventory);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  const showShopRef = useRef(showShop);
  useEffect(() => {
    showShopRef.current = showShop;
  }, [showShop]);

  const showDonationPanelRef = useRef(false);
  useEffect(() => {
    showDonationPanelRef.current = showDonationPanel;
  }, [showDonationPanel]);

  const clinicOpenRef = useRef(clinicOpen);
  useEffect(() => {
    clinicOpenRef.current = clinicOpen;
  }, [clinicOpen]);

  const hungerLiveRef = useRef(hunger);
  useEffect(() => {
    hungerLiveRef.current = hunger;
  }, [hunger]);

  const thirstLiveRef = useRef(thirst);
  useEffect(() => {
    thirstLiveRef.current = thirst;
  }, [thirst]);

  const editorOnRef = useRef(editorOn);
  useEffect(() => {
    editorOnRef.current = editorOn;
  }, [editorOn]);

  useEffect(() => {
    const v = sessionStorage.getItem("lastSleepAt");
    if (!v) return;
    const n = Number(v);
    if (Number.isFinite(n) && n > 1e12) setLastSleepAt(n);
  }, []);

  useEffect(() => {
    if (lastSleepAt) sessionStorage.setItem("lastSleepAt", String(lastSleepAt));
  }, [lastSleepAt]);

  // ===== View/grid helper
  const view = useView(location) ?? {
    cell: 16,
    offsetX: 0,
    offsetY: 0,
  };
  const { cell, offsetX, offsetY } = view;

  let SPRITE_SCALE = location === "outside" ? 1.5 : 2.5;

  // ukuran asli sprite (px) dari asset
  const BASE_W = 32;
  const BASE_H = 48;

  // hasil akhir (px di layar)
  const VISUAL_W = BASE_W * SPRITE_SCALE;
  const VISUAL_H = BASE_H * SPRITE_SCALE;

  // ===== Utils
  const canConsumeNow = () =>
    performance.now() - consumeLockRef.current > GAME_CONST.CONSUME_COOLDOWN_MS;

  const lockConsume = () => {
    consumeLockRef.current = performance.now();
  };

  const canSleep = () =>
    Date.now() - lastSleepAt >= (GAME_CONST.SLEEP_COOLDOWN_MS ?? 0);

  const sleepRemainMs = () =>
    Math.max(
      0,
      (GAME_CONST.SLEEP_COOLDOWN_MS ?? 0) - (Date.now() - lastSleepAt)
    );

  const sleepSecLeft = Math.min(
    Math.ceil((GAME_CONST.SLEEP_COOLDOWN_MS ?? 0) / 1000),
    Math.max(0, Math.ceil(sleepRemainMs() / 1000))
  );

  const normalizeLines = (raw) =>
    (raw ?? []).map((l) => {
      if (l && l.choice) return l;
      return {
        ...l,
        name: l?.name ?? activeNpcName ?? "???",
        text: l?.text ?? l?.content ?? "",
      };
    });

  const fadeTeleport = async (nextLocation, nextPos) => {
    setInputLocked(true);
    clearMovementKeys();
    setFade(0);
    await wait(GAME_CONST.FADE_OUT_MS);
    if (nextLocation) setLocation(nextLocation);
    if (nextPos) setPlayer(nextPos);
    distAccumRef.current = 0;
    lastPosRef.current = nextPos ?? lastPosRef.current;
    await wait(GAME_CONST.FADE_IN_DELAY_MS);
    setFade(1);
    await wait(GAME_CONST.INPUT_RESTORE_MS);
    setInputLocked(false);
    requestAnimationFrame(() => gameAreaRef.current?.focus());
  };

  // Posisi absolut helper
  const clearMovementKeys = () => {
    movingRef.current = { w: false, a: false, s: false, d: false };
    setStep(0);
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const toPxX = (gx) => offsetX + gx * cell;
  const toPxY = (gy) => offsetY + gy * cell;

  const AbsCenter = ({ cx, cy, w, h, style = {}, children, title }) => (
    <div
      title={title}
      style={{
        position: "absolute",
        transform: `translate3d(${toPxX(cx)}px, ${toPxY(
          cy
        )}px, 0) translate(-50%, -50%)`,
        width: w != null ? w : undefined,
        height: h != null ? h : undefined,
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );

  function safeSetDirection(next) {
    if (directionRef.current !== next) setDirection(next);
  }
  function safeSetStep(next) {
    if (stepRef.current !== next) setStep(next);
  }

  // ===== Movement loop
  function updatePlayerPosition(delta) {
    if (showShopRef.current) {
      movingRef.current = { w: false, a: false, s: false, d: false };
      if (stepRef.current !== 0) safeSetStep(0);
      distAccumRef.current = 0;
      return;
    }
    if (inputLockedRef.current) return;
    if (dialogLockRef.current || isDialogueOpen) {
      movingRef.current = { w: false, a: false, s: false, d: false };
      if (stepRef.current !== 0) safeSetStep(0);
      distAccumRef.current = 0;
      return;
    }
    const SPEED = 6.0;
    const m = movingRef.current;

    if (m.w) safeSetDirection("up");
    else if (m.s) safeSetDirection("down");
    else if (m.a) safeSetDirection("left");
    else if (m.d) safeSetDirection("right");

    if (m.w || m.s || m.a || m.d) {
      walkTimerRef.current += delta;
      if (walkTimerRef.current >= 0.18) {
        safeSetStep(stepRef.current === 0 ? 1 : 0);
        walkTimerRef.current = 0;
      }
    } else {
      walkTimerRef.current = 0;
      if (stepRef.current !== 0) safeSetStep(0);
    }

    const next = resolveMovement(
      { x: playerRef.current.x, y: playerRef.current.y },
      m,
      delta,
      locationRef.current,
      SPEED
    );
    let nx = Math.max(
      0,
      Math.min(MAPS[locationRef.current].GRID_X - 1, next.x)
    );
    let ny = Math.max(
      0,
      Math.min(MAPS[locationRef.current].GRID_Y - 1, next.y)
    );

    const wasWalking = m.w || m.a || m.s || m.d;
    if (wasWalking) {
      const dx = nx - playerRef.current.x;
      const dy = ny - playerRef.current.y;
      const d = Math.max(Math.abs(dx), Math.abs(dy));

      if (d > 0 && !inputLockedRef.current && !showShopRef.current) {
        distAccumRef.current += d;

        // bunyikan setiap melampaui 1 stride; pakai while untuk kejar delta besar
        while (distAccumRef.current >= GAME_CONST.STRIDE_TILES_PER_STEP) {
          playFootstep();
          distAccumRef.current -= GAME_CONST.STRIDE_TILES_PER_STEP;
        }
      }
    } else {
      // tidak berjalan → reset akumulasi (biar tidak tiba-tiba bunyi saat mulai lagi)
      distAccumRef.current = 0;
    }
    // === END NEW ===

    if (nx !== playerRef.current.x || ny !== playerRef.current.y) {
      setPlayer((prev) => {
        if (prev.x === nx && prev.y === ny) return prev;
        const nextPos = { x: nx, y: ny };
        playerRef.current = nextPos;
        return nextPos;
      });
    }
    lastPosRef.current = { x: nx, y: ny };
  }

  const tick = useCallback((dt) => {
    updatePlayerPosition(dt);
  }, []);
  const rafOpts = useMemo(() => ({ enabled: true, clampDelta: 0.05 }), []);
  useRafLoop(tick, rafOpts);

  // ===== Effects
  useEffect(() => {
    inputLockedRef.current = inputLocked;
  }, [inputLocked]);

  useLayoutEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // setelah const gameAreaRef = useRef(null);
  useEffect(() => {
    gameAreaRef.current?.focus();
  }, []);

  useEffect(() => {
    // bikin 4 channel audio biar overlap aman
    footstepPoolRef.current = new Array(4).fill(0).map(() => {
      const a = new Audio(footstepSfx);
      a.preload = "auto";
      a.volume = soundOn ? (volume ?? 1) * 0.4 : 0; // 40% dari master
      return a;
    });

    return () => {
      footstepPoolRef.current.forEach((a) => a.pause());
    };
  }, []);

  useEffect(() => {
    footstepPoolRef.current.forEach(
      (a) => (a.volume = soundOn ? (volume ?? 1) * 0.4 : 0)
    );
  }, [soundOn, volume]);

  useEffect(() => {
    if (showShop) {
      movingRef.current = { w: false, a: false, s: false, d: false };
      setStep(0);
      inputLockedRef.current = true;
      requestAnimationFrame(() => {
        inputLockedRef.current = false;
      });
    } else {
      gameAreaRef.current?.focus();
    }
  }, [showShop]);

  // hunger/thirst decay
  useEffect(() => {
    const id = setInterval(() => {
      setHunger((h) => clamp01(h - 0.33));
      setThirst((t) => clamp01(t - 0.42));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // hp decay/regen
  useEffect(() => {
    const id = setInterval(() => {
      setHealth((hp) => {
        const h = hungerLiveRef.current;
        const t = thirstLiveRef.current;
        if (h <= 0 || t <= 0) return clamp01(hp - GAME_CONST.HP_DECAY_PER_SEC);
        if (hp < 100) return clamp01(hp + GAME_CONST.HP_REGEN_PER_SEC);
        return hp;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // ← sekali pasang

  // respawn jika mati
  useEffect(() => {
    if (health <= 0) {
      const cause =
        hunger <= 0 && thirst <= 0
          ? "kelaparan & kehausan"
          : hunger <= 0
          ? "kelaparan"
          : "kehausan";
      setLocation("house");
      setPlayer(initialPlayer);
      setHealth(50);
      setHunger((h) => (h <= 0 ? 15 : h));
      setThirst((t) => (t <= 0 ? 20 : t));
      showDialogMsg(`Anda pingsan karena ${cause}.`);
      setShowDonationPanel(false);
      closeDialogue();
    }
  }, [health, hunger, thirst]);

  useEffect(
    () => () => {
      if (dialogTimerRef.current) clearTimeout(dialogTimerRef.current);
    },
    []
  );

  useEffect(() => {
    doorSfxRef.current = new Audio(doorOpen);
    doorSfxRef.current.preload = "auto";
    doorSfxRef.current.volume = soundOn ? volume ?? 1 : 0;
    return () => doorSfxRef.current?.pause();
  }, []);

  useEffect(() => {
    if (doorSfxRef.current) {
      doorSfxRef.current.volume = soundOn ? volume ?? 1 : 0;
    }
  }, [soundOn, volume]);

  const playDoor = () => {
    const a = doorSfxRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play();
    } catch {}
  };

  const playFootstep = () => {
    const now = performance.now();
    // Cooldown opsional (hindari double-trigger aneh)
    if (now - lastStepPlayRef.current < 80) return;
    lastStepPlayRef.current = now;

    const pool = footstepPoolRef.current;
    if (!pool?.length) return;

    const i = footstepIdxRef.current % pool.length;
    const a = pool[i];
    footstepIdxRef.current++;

    try {
      a.currentTime = 0;
      a.play();
    } catch {}
  };

  const isTypingTarget = (e) => {
    const t = e.target;
    if (!t) return false;
    const tag = t.tagName?.toUpperCase?.();
    return (
      tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable === true
    );
  };

  const dialogTimerRef = useRef(null);
  const showDialogMsg = (text) => {
    setDialogText(text);
    setShowDialog(true);
    if (dialogTimerRef.current) clearTimeout(dialogTimerRef.current);
    dialogTimerRef.current = setTimeout(() => {
      setShowDialog(false);
      dialogTimerRef.current = null;
    }, 3000);
  };

  function openDialogue(npc) {
    dialogLockRef.current = true;
    movingRef.current = { w: false, a: false, s: false, d: false };
    setStep(0);
    distAccumRef.current = 0;
    setActiveNpc(npc);
    setActiveNpcName(npc.name ?? null);
    let raw = getNpcDialogue(npc.id);
    if (
      npc.id === 1 &&
      donationProgressRef.current >= donationTargetRef.current
    ) {
      raw = [
        { name: "Pak Rudi", text: "Ventra, donasi sudah terkumpul semua!" },
        {
          choice: true,
          options: [
            { text: "Donasikan", action: "ending" },
            { text: "Nanti saja", action: "smalltalk" },
          ],
        },
      ];
    }

    const lines = normalizeLines(raw);
    if (!lines.length || !lines[0].text) {
      setDialogLines([{ name: npc.name ?? "???", text: "..." }]);
    } else {
      setDialogLines(lines);
    }
    setLineIdx(0);
  }

  function closeDialogue() {
    setActiveNpc(null);
    setActiveNpcName(null);
    setDialogLines([]);
    setLineIdx(0);
    dialogLockRef.current = false;
    requestAnimationFrame(() => gameAreaRef.current?.focus());
  }

  const lines = dialogLines;
  const curLine = lines[lineIdx];
  const isDialogueOpen = !!activeNpc;

  useEffect(() => {
    if (isDialogueOpen) {
      movingRef.current = { w: false, a: false, s: false, d: false };
      setStep(0);
    }
  }, [isDialogueOpen]);

  const onKeyDown = useCallback(
    async (e) => {
      if (showEnding) return;
      if (e.repeat) return;
      if (isTypingTarget(e)) return;
      if (inputLockedRef.current) return;
      const k = e.key;
      if (showShopRef.current) {
        const kk = k.toLowerCase?.() || "";
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "tab",
            "e",
            "f",
            "g",
            "1",
            "2",
            "3",
            "4",
            "5",
            "l",
            "o",
          ].includes(kk)
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
        return; // biar Shop yang handle inputnya
      }
      if (k === "Escape") {
        if (showDonationPanelRef.current) {
          e.preventDefault();
          setShowDonationPanel(false);
          requestAnimationFrame(() => gameAreaRef.current?.focus());
          return;
        }
        if (showShopRef.current) {
          e.preventDefault();
          setShowShop(false);
          setWhichShop(null);
          setShopMessage("");
          requestAnimationFrame(() => gameAreaRef.current?.focus());
          return;
        }
        if (isDialogueOpen) {
          e.preventDefault();
          closeDialogue();
          return;
        }
        e.preventDefault();
        setShowDonationPanel(false);
        if (isDialogueOpen) {
          closeDialogue();
          return;
        }
        setInputLocked(true);
        clearMovementKeys();
        setFade(0);
        setTimeout(() => onExit?.(), GAME_CONST.FADE_OUT_MS);
        return;
      }
      if (dialogLockRef.current || isDialogueOpen) {
        const k = e.key?.toLowerCase();
        if (k === "w" || k === "a" || k === "s" || k === "d") {
          e.preventDefault();
          movingRef.current = { w: false, a: false, s: false, d: false };
          setStep(0);
        }
        e.preventDefault();
        return;
      }

      if (!editorOnRef.current) {
        if (k === "w" || k === "W") movingRef.current.w = true;
        if (k === "s" || k === "S") movingRef.current.s = true;
        if (k === "a" || k === "A") movingRef.current.a = true;
        if (k === "d" || k === "D") movingRef.current.d = true;
      }

      if (e.ctrlKey && (k === "e" || k === "E")) {
        e.preventDefault();
        setEditorOn((v) => !v);
        return;
      }

      if (k === "Tab") {
        e.preventDefault();
        setShowHotbar((p) => !p);
      }

      if (k === "l" || k === "L") {
        const p = playerRORef.current;
        showDialogMsg(`pos: (${Math.round(p.x)}, ${Math.round(p.y)})`);
        console.log("pos:", p);
      }

      // Toggle Klinik dengan O (hanya saat di klinik)
      if ((k === "o" || k === "O") && locationRef.current === "clinic") {
        setClinicOpen((prev) => {
          const next = !prev;
          showDialogMsg(`Klinik ${next ? "Buka" : "Tutup"}.`);
          return next;
        });
        return;
      }

      // E: interaksi (toko, npc, pintu)
      if (k === "e" || k === "E") {
        const loc = locationRef.current;
        const pl = playerRORef.current;

        // buka warung
        if (
          loc === "outside" &&
          canInteract(pl, shopFood, GAME_CONST.RADIUS.shop)
        ) {
          setWhichShop("food");
          setShowShop(true);
          return;
        }

        // buka apotek
        if (
          loc === "outside" &&
          canInteract(pl, shopMed, GAME_CONST.RADIUS.shop)
        ) {
          setWhichShop("med");
          setShowShop(true);
          return;
        }

        // NPC
        const nearNpc = npcList.find(
          (n) => loc === "outside" && canInteract(pl, n, GAME_CONST.RADIUS.npc)
        );
        if (nearNpc) {
          openDialogue(nearNpc); // <— ini bikin karakter langsung diam
          return;
        }

        // house -> outside
        if (loc === "house" && canInteract(pl, door, GAME_CONST.RADIUS.door)) {
          playDoor();
          await fadeTeleport("outside", {
            x: doorOutside.x,
            y: doorOutside.y + 1,
          });
          showDialogMsg("Kamu keluar rumah.");
          return;
        }
        // outside -> house
        if (
          loc === "outside" &&
          canInteract(pl, doorOutside, GAME_CONST.RADIUS.door)
        ) {
          playDoor();
          await fadeTeleport("house", { x: door.x, y: door.y - 1 });
          showDialogMsg("Kamu masuk rumah.");
          return;
        }
        // outside -> clinic
        if (
          loc === "outside" &&
          canInteract(pl, clinicDoorOutside, GAME_CONST.RADIUS.door)
        ) {
          playDoor();
          await fadeTeleport("clinic", { ...clinicSpawns.patientSpawn });
          showDialogMsg("Kamu masuk klinik.");
          return;
        }
        // clinic -> outside
        if (
          loc === "clinic" &&
          canInteract(pl, clinicDoor, GAME_CONST.RADIUS.door)
        ) {
          playDoor();
          await fadeTeleport("outside", {
            x: clinicDoorOutside.x,
            y: clinicDoorOutside.y + 1,
          });
          showDialogMsg("Kamu keluar klinik.");
          return;
        }
        if (loc !== "clinic") {
          showDialogMsg("Tidak ada yang bisa diinteraksi di sini.");
        }
      }
      if (/^[1-5]$/.test(k)) {
        const idx = parseInt(k, 10) - 1;
        consumeAt(idx);
      }
      if (k === "f" || k === "F") eatFood();
      if (k === "g" || k === "G") drinkBeverage();
    },
    [onExit, showEnding]
  );

  const onKeyUp = useCallback(
    (e) => {
      if (isTypingTarget(e)) return;
      if (inputLockedRef.current) return;
      if (showShopRef.current) return;
      const k = e.key?.toLowerCase();
      if (k === "w") movingRef.current.w = false;
      if (k === "a") movingRef.current.a = false;
      if (k === "s") movingRef.current.s = false;
      if (k === "d") movingRef.current.d = false;

      if (dialogLockRef.current || isDialogueOpen) return;
      if (!showShopRef.current && !editorOnRef.current) {
      }
    },
    [isDialogueOpen]
  );

  useKeyboard({
    enabled: !showEnding,
    onDown: onKeyDown,
    onUp: onKeyUp,
  });

  // ===== Inventory consume
  const consumeFirst = (predicate, kindLabel) => {
    if (!canConsumeNow()) return null;
    let usedItem = null;

    setInventory((prev) => {
      const idx = prev.findIndex((it) => it && predicate(it));
      if (idx === -1) return prev;
      const it = prev[idx];
      usedItem = it;

      setHunger((h) => clamp01(h + (it.restoreHunger || 0)));
      setThirst((t) => clamp01(t + (it.restoreThirst || 0)));
      setStamina((s) => clamp01(s + (it.restoreStamina || 0)));

      const next = [...prev];
      next[idx] = null;
      showDialogMsg(`Kamu ${kindLabel} ${it.name}`);
      lockConsume();
      return next;
    });

    return usedItem;
  };

  const eatFood = () => {
    const used = consumeFirst((it) => (it.restoreHunger || 0) > 0, "makan");
    if (!used) showDialogMsg("Tidak ada makanan di inventory.");
  };

  const drinkBeverage = () => {
    const used = consumeFirst((it) => (it.restoreThirst || 0) > 0, "minum");
    if (!used) showDialogMsg("Tidak ada minuman di inventory.");
  };

  const consumeAt = (index) => {
    if (!canConsumeNow()) return false;
    let used = false;

    setInventory((prev) => {
      const it = prev[index];
      if (!it || (!it.restoreHunger && !it.restoreThirst && !it.restoreStamina))
        return prev;

      setHunger((h) => clamp01(h + (it.restoreHunger || 0)));
      setThirst((t) => clamp01(t + (it.restoreThirst || 0)));
      setStamina((s) => clamp01(s + (it.restoreStamina || 0)));

      const next = [...prev];
      next[index] = null;
      used = true;
      showDialogMsg(`Kamu menggunakan ${it.name}`);
      lockConsume();
      return next;
    });

    return used;
  };

  // ===== Shop & transaction
  const handleBuy = (item) => {
    // cari slot kosong
    let emptyIdx = inventory.findIndex((s) => !s);
    if (emptyIdx === -1) {
      if (showShop) setShopMessage("Inventory penuh.");
      else showDialogMsg("Inventory penuh.");
      return;
    }

    // cek saldo
    if (money < item.price) {
      if (showShop) setShopMessage("Uang tidak cukup.");
      else showDialogMsg("Uang tidak cukup.");
      return;
    }

    // potong saldo
    setMoney((m) => m - item.price);

    // masukin item
    setInventory((prev) => {
      const next = [...prev];
      next[emptyIdx] = {
        id: Date.now(),
        name: item.name,
        emoji: item.emoji,
        restoreHunger: item.restoreHunger || 0,
        restoreThirst: item.restoreThirst || 0,
        restoreStamina: item.restoreStamina || 0,
        price: item.price,
      };
      return next;
    });

    if (showShop) setShopMessage(`Beli ${item.name} berhasil!`);
    else showDialogMsg(`Beli ${item.name} berhasil!`);
  };

  return (
    <>
      {/* Fade overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          opacity: 1 - fade,
          transition: "opacity 0.4s ease",
          zIndex: 999,
          pointerEvents: "none",
        }}
      />

      {/* Game Area */}
      <div
        tabIndex={0}
        ref={gameAreaRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: "#222",
          fontFamily: "sans-serif",
        }}
      >
        {/* Player */}
        {location !== "outside" && (
          <AbsCenter
            cx={player.x}
            cy={player.y}
            w={VISUAL_W}
            h={VISUAL_H}
            style={{ zIndex: 10 }}
          >
            <img
              src={SPRITES[direction][step]}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                imageRendering: "pixelated",
              }}
            />
          </AbsCenter>
        )}

        {location === "clinic" && (
          <div style={{ position: "fixed", right: 12, top: 12, zIndex: 60 }}>
            <button
              onClick={() => {
                setClinicOpen((prev) => {
                  const next = !prev;
                  showDialogMsg(`Klinik ${next ? "Buka" : "Tutup"}.`);
                  return next;
                });
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "2px solid #333",
                background: clinicOpen ? "#43a047" : "#b71c1c",
                color: "#fff",
                fontWeight: 800,
                boxShadow: "0 2px 6px rgba(0,0,0,.35)",
                cursor: "pointer",
              }}
            >
              {clinicOpen ? "Klinik Buka" : "Klinik Tutup"}
            </button>
          </div>
        )}

        {editorOn && <DebugColliders location={location} />}

        {/* Entities */}
        <div style={{ position: "absolute", inset: 0 }}>
          {/* Scene */}
          {location === "house" && (
            <HouseScene
              player={player}
              ranges={{ door: GAME_CONST.RADIUS.door }}
              sleepCooldownSecLeft={sleepSecLeft}
              onSleep={async () => {
                if (!canSleep()) return;
                await fadeTeleport();
                setStamina(100);
                setLastSleepAt(Date.now());
                showDialogMsg("Anda tidur.");
              }}
            />
          )}
          {location === "outside" && (
            <OutsideScene
              player={player}
              zoom={zoom}
              spriteSrc={SPRITES[direction][step]}
              visualW={VISUAL_W}
              visualH={VISUAL_H}
              teleports={outsideTeleports}
              onTeleport={async ({ to }) => {
                setInputLocked(true);
                clearMovementKeys();
                setFade(0);
                await wait(420);
                setPlayer((p) => ({ ...p, x: to.x, y: to.y }));
                distAccumRef.current = 0;
                lastPosRef.current = { x: to.x, y: to.y };
                await wait(60);
                setFade(1);
                await wait(100);
                setInputLocked(false);
                requestAnimationFrame(() => gameAreaRef.current?.focus());
              }}
              disableTeleports={inputLocked}
              ranges={{
                door: GAME_CONST.RADIUS.door,
                shop: GAME_CONST.RADIUS.shop,
                npc: GAME_CONST.RADIUS.npc,
              }}
              bgmVolume={Math.max(0, Math.min(1, volume ?? 1))}
              soundOn={!!soundOn}
            />
          )}
          {location === "clinic" && (
            <ClinicScene
              clinicOpen={clinicOpen}
              editorOn={editorOn}
              onMoney={(d) => setMoney((m) => m + d)}
              inventory={inventory}
              setInventory={setInventory}
              toast={showDialogMsg}
              player={{ x: player.x, y: player.y }}
              onOpenDonation={() => setShowDonationPanel(true)}
              onToggleClinic={() =>
                setClinicOpen((prev) => {
                  const next = !prev;
                  showDialogMsg(`Klinik ${next ? "Buka" : "Tutup"}.`);
                  return next;
                })
              }
              stamina={stamina}
              onAfterServePatient={() => {
                setStamina((s) =>
                  Math.max(
                    0,
                    Math.min(100, s - GAME_CONST.STAMINA_DECAY_ON_SERVICE)
                  )
                );
                if (stamina - 10 <= 0) showDialogMsg("Anda lelah");
              }}
            />
          )}
          {/* Dialog */}
          {showDialog && !showEnding && (
            <div
              style={{
                position: "fixed",
                left: "50%",
                bottom: 100,
                transform: "translateX(-50%)",
                zIndex: 40,
                color: "#fff",
                fontWeight: 800,
                fontSize: 20,
                textAlign: "center",
                textShadow:
                  "0 2px 4px rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.4)",
                pointerEvents: "none",
                padding: "0 12px",
                maxWidth: "90vw",
                lineHeight: 1.25,
              }}
            >
              {dialogText}
            </div>
          )}
          {/* HUD */}
          {!showEnding && (
            <HUD
              money={money}
              health={health}
              hunger={hunger}
              thirst={thirst}
              stamina={stamina}
              inventory={inventory}
              showHotbar={showHotbar}
              dialogue={
                showDonationPanel
                  ? { show: false }
                  : curLine
                  ? curLine.choice
                    ? { choice: true, options: curLine.options } // tampilkan pilihan
                    : { show: true, ...curLine }
                  : { show: false }
              }
              onDialogueNext={(force = false, action = null) => {
                if (action) {
                  if (action === "ending") {
                    setShowEnding(true);
                    setInputLocked(true);
                    closeDialogue();
                    return;
                  }
                  if (action === "smalltalk") {
                    const hasNext = lineIdx < lines.length - 1;
                    if (hasNext) {
                      setLineIdx((i) => i + 1);
                    } else {
                      setDialogLines([
                        {
                          name: "Pak Rudi",
                          text: "Baik, nanti saja ya. Kalau sudah siap, kabari saya.",
                        },
                      ]);
                      setLineIdx(0);
                    }
                    return;
                  }
                }
                if (curLine?.choice && !force) return;
                if (lineIdx < lines.length - 1) setLineIdx((i) => i + 1);
                else closeDialogue();
              }}
              onDialogueSkip={() => {
                setActiveNpc(null);
                setLineIdx(0);
                closeDialogue();
              }}
              showDonationPanel={showDonationPanel}
              donationProgress={donationProgress}
              donationTarget={donationTarget}
              onCloseDonationPanel={() => setShowDonationPanel(false)}
              onDonate={(amount) => {
                if (amount <= 0) return;
                const remaining = Math.max(
                  0,
                  donationTarget - donationProgress
                );
                const capped = Math.min(
                  amount,
                  remaining,
                  moneyRef.current ?? money
                );
                if (capped <= 0) return;

                setMoney((m) => m - capped);
                setDonationProgress((p) => {
                  const wasFull = p >= donationTarget;
                  const next = Math.min(donationTarget, p + capped);
                  const nowFull = next >= donationTarget;
                  closeDialogue();
                  dialogLockRef.current = true;
                  if (!wasFull && nowFull) {
                    setDialogLines([
                      {
                        name: "Pak Rudi",
                        text: "Donasi telah terkumpul! Temui aku lagi untuk mendonasikannya.",
                      },
                    ]);
                  } else {
                    const sisa = Math.max(0, donationTarget - next);
                    setDialogLines([
                      {
                        name: "Pak Rudi",
                        text: `Terima kasih! Setoran ${capped} koin. Sisa target: ${sisa}.`,
                      },
                    ]);
                  }
                  setLineIdx(0);
                  return next;
                });
              }}
            />
          )}

          {/* Shop Popup */}
          {showShop && !showEnding && (
            <Shop
              title={whichShop === "med" ? "Toko Obat" : "Warung"}
              money={money}
              shopItems={whichShop === "med" ? shopMedItems : shopFoodItems}
              onBuy={handleBuy}
              onClose={() => {
                setShowShop(false);
                setWhichShop(null);
                setShopMessage(""); // reset pesan shop pas ditutup
                setTimeout(() => {
                  gameAreaRef.current?.focus();
                }, 0);
              }}
              message={shopMessage}
            />
          )}

          {/* Inventory panel */}
          {!showEnding && (
            <Inventory
              show={showHotbar}
              inventory={inventory}
              setInventory={setInventory}
              selectedIndex={selectedIndex}
              setSelectedIndex={setSelectedIndex}
              onToast={showDialogMsg}
            />
          )}
        </div>
        {showEnding && (
          <Cutscene
            slides={DIALOGUE.ending}
            onComplete={() => {
              setShowEnding(false);
              setInputLocked(false);
              onExit?.();
            }}
          />
        )}
      </div>
    </>
  );
}
