import { memo } from "react";
import { CheckPattern } from "./character";
import { BeanBag, BigPlant, BookStack, Candles, CatBed, Curtains, FairyLights, HangingPlant, Lamp, MoonLamp, Polaroids, Posters, RecordPlayer, Rug, SillPlants, TeaTray, Teddy } from "./decor";
import { Bed, BedPatterns, Bookshelf, Desk, Nightstand, WindowFrame, WindowSeat } from "./furniture";
import { SCENE_H, SCENE_W } from "./geometry";
import type { Shade } from "./palette";
import type { ObjectsState, RoomLook } from "./state";

/* -----------------------------------------------------------------------------
   Front layer: frame, curtains, furniture and decor, drawn back to front.
----------------------------------------------------------------------------- */

export type Transient = { musicOn: boolean; purring: boolean; rustle: number; brewing: boolean };

function RoomFrontImpl({ room, objects, shade, still, fx }: { room: RoomLook; objects: ObjectsState; shade: Shade; still: boolean; fx: Transient }) {
  const s = shade;
  const has = (id: string) => room.decor.includes(id as RoomLook["decor"][number]);
  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
      <defs>
        <BedPatterns s={s} room={room} />
        <CheckPattern />
        <linearGradient id="cz-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3f7a" />
          <stop offset="0.6" stopColor="#b77fa6" />
          <stop offset="1" stopColor="#f2b38a" />
        </linearGradient>
      </defs>

      {/* on the walls */}
      {has("posters") && <Posters s={s} />}
      {has("bookshelf") && <Bookshelf s={s} room={room} />}
      {has("moonLamp") && has("bookshelf") && <MoonLamp s={s} on={objects.moon} />}
      {has("polaroids") && <Polaroids s={s} />}
      {has("hangingPlant") && <HangingPlant s={s} still={still} />}

      <WindowFrame s={s} />
      {has("fairyLights") && <FairyLights s={s} on={objects.fairy} still={still} />}
      {has("curtains") && <Curtains s={s} room={room} drawn={objects.curtainsDrawn} />}

      {/* furniture */}
      <Bed s={s} room={room} />
      {has("teddy") && <Teddy s={s} />}
      <Nightstand s={s} room={room} />
      {has("lamp") && <Lamp s={s} on={objects.lamp} />}
      {has("candles") && <Candles s={s} lit={objects.candles} still={still} />}
      <WindowSeat s={s} room={room} />
      {has("teaTray") && <TeaTray s={s} still={still} brewing={fx.brewing} />}
      {has("bookStack") && <BookStack s={s} />}
      {has("sillPlants") && <SillPlants s={s} />}
      {has("desk") && <Desk s={s} room={room} laptopOn={objects.laptop} />}
      {has("recordPlayer") && <RecordPlayer s={s} playing={fx.musicOn} still={still} />}

      {/* on the floor */}
      {has("rug") && <Rug s={s} room={room} />}
      {has("catBed") && <CatBed s={s} still={still} purring={fx.purring} />}
      {has("beanBag") && <BeanBag s={s} room={room} />}
      {has("bigPlant") && <BigPlant s={s} still={still} rustle={fx.rustle} />}
    </svg>
  );
}

export const RoomFront = memo(RoomFrontImpl);
