import type { WasmEventLoop } from 'chip-8-emu'
import { create } from 'zustand'

type EventLoopState = {
  eventLoop: WasmEventLoop | null,
  getEventLoopLazy: () => Promise<WasmEventLoop>
}

const useEventLoop = create<EventLoopState>((set, get) => ({
  eventLoop: null as WasmEventLoop | null,
  getEventLoopLazy: async () => {
    let { WasmEventLoop } = await import('chip-8-emu');
    let eventLoop = get().eventLoop
    if (eventLoop == null) {
      eventLoop = new WasmEventLoop();
      set({ eventLoop });
      return eventLoop;
    }
    else {
      return eventLoop;
    }
  }
}));

export {
  useEventLoop
};