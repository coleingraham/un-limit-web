/**
 * Audio engine powered by microsynth WASM running in an AudioWorklet.
 * Simplified for real-time voice-per-touch control (no scheduler/beat system).
 */
export class MicrosynthEngine {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private ready = false;
  private registeredDefs = new Set<string>();

  private voicePromises = new Map<number, (voiceId: number) => void>();
  private nextRequestId = 1;

  // Shared AudioContext, created & resumed from a native DOM gesture handler
  private static sharedCtx: AudioContext | null = null;
  private static unlockInstalled = false;

  /**
   * Must be called once (e.g. on mount). Registers native touchstart/click
   * listeners on `document` so the very first tap creates and resumes an
   * AudioContext directly inside the browser's user-activation window.
   */
  static installUnlock(): void {
    if (MicrosynthEngine.unlockInstalled) return;
    MicrosynthEngine.unlockInstalled = true;

    const unlock = () => {
      if (!MicrosynthEngine.sharedCtx) {
        MicrosynthEngine.sharedCtx = new AudioContext();
      }
      const ctx = MicrosynthEngine.sharedCtx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Also play a silent buffer — belt-and-suspenders for WebKit
      try {
        const b = ctx.createBuffer(1, 1, ctx.sampleRate);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(ctx.destination);
        s.start(0);
      } catch (_) { /* ignore */ }

      if (ctx.state === 'running') {
        document.removeEventListener('touchstart', unlock, true);
        document.removeEventListener('touchend', unlock, true);
        document.removeEventListener('click', unlock, true);
      }
    };

    // Use capture phase so we run before React synthetic events
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('touchend', unlock, true);
    document.addEventListener('click', unlock, true);
  }

  constructor() {
    // Use the shared context if the unlock handler already created one,
    // otherwise create a new one (desktop path where resume just works).
    this.ctx = MicrosynthEngine.sharedCtx ?? new AudioContext();
    MicrosynthEngine.sharedCtx = this.ctx;
  }

  private debugLog(msg: string) {
    console.log(`[MicrosynthEngine] ${msg}`);
    const setter = (globalThis as unknown as Record<string, unknown>).__setDebugMsg;
    if (typeof setter === 'function') (setter as (m: string) => void)(msg);
  }

  async init(): Promise<void> {
    if (this.ready) return;

    this.debugLog(`ctx state: ${this.ctx.state}`);

    // On desktop the context is usually already running. On mobile the
    // native unlock handler should have resumed it. If it's still
    // suspended, give it a moment — the unlock listener may fire on
    // touchend/click which comes slightly after touchstart.
    if (this.ctx.state !== 'running') {
      this.debugLog('waiting for ctx to run...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`AudioContext stuck in "${this.ctx.state}" state`)), 3000);
        const check = () => {
          if (this.ctx.state === 'running') {
            clearTimeout(timeout);
            resolve();
          }
        };
        this.ctx.addEventListener('statechange', check);
        check();
      });
    }
    this.debugLog(`ctx running, sr=${this.ctx.sampleRate}`);

    this.debugLog('fetching wasm...');
    const wasmResponse = await fetch('/wasm/microsynth_raw.wasm');
    const wasmBytes = await wasmResponse.arrayBuffer();
    this.debugLog(`wasm fetched (${wasmBytes.byteLength} bytes)`);

    this.debugLog('adding worklet module...');
    await this.ctx.audioWorklet.addModule('/processor.js');
    this.debugLog('worklet module added');

    this.workletNode = new AudioWorkletNode(this.ctx, 'microsynth-processor', {
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { wasmBytes },
    });

    this.workletNode.connect(this.ctx.destination);

    this.workletNode.port.onmessage = (e) => this.handleMessage(e.data);

    this.debugLog('waiting for wasm ready...');
    // Wait for WASM ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WASM init timeout')), 5000);
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          clearTimeout(timeout);
          this.workletNode!.port.removeEventListener('message', handler);
          resolve();
        }
      };
      this.workletNode!.port.addEventListener('message', handler);
    });
    this.debugLog('wasm ready');

    // Initialize with bus for multi-voice
    this.send({ type: 'initBus' });

    this.debugLog('waiting for bus...');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Bus init timeout')), 5000);
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'busReady') {
          clearTimeout(timeout);
          this.workletNode!.port.removeEventListener('message', handler);
          resolve();
        }
      };
      this.workletNode!.port.addEventListener('message', handler);
    });

    this.ready = true;
    this.debugLog('initialized');
  }

  private send(msg: Record<string, unknown>) {
    this.workletNode?.port.postMessage(msg);
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }) {
    switch (msg.type) {
      case 'voiceSpawned': {
        const resolver = this.voicePromises.get(msg.id as number);
        if (resolver) {
          resolver(msg.voiceId as number);
          this.voicePromises.delete(msg.id as number);
        }
        break;
      }
      case 'error':
        console.warn('[MicrosynthEngine]', msg.message);
        break;
      case 'defRegistered':
        console.log('[MicrosynthEngine] Registered:', msg.name);
        break;
    }
  }

  async registerDef(name: string, source: string): Promise<void> {
    if (this.registeredDefs.has(name)) return;
    this.send({ type: 'registerDef', name, source });
    this.registeredDefs.add(name);
    await new Promise((r) => setTimeout(r, 100));
  }

  clearRegisteredDefs(): void {
    this.registeredDefs.clear();
  }

  async spawnVoice(defName: string): Promise<number> {
    return new Promise((resolve) => {
      const id = this.nextRequestId++;
      const timeout = setTimeout(() => {
        this.voicePromises.delete(id);
        resolve(0);
      }, 200);
      this.voicePromises.set(id, (voiceId) => {
        clearTimeout(timeout);
        resolve(voiceId);
      });
      this.send({ type: 'spawnVoiceNamed', id, name: defName });
    });
  }

  setParam(voiceId: number, param: string, value: number): void {
    this.send({ type: 'voiceParam', voiceId, param, value });
  }

  setGate(voiceId: number, value: number): void {
    this.send({ type: 'voiceGate', voiceId, value });
  }

  freeVoice(voiceId: number): void {
    this.send({ type: 'freeVoice', voiceId });
  }

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      // Fire-and-forget — don't await, as it can hang on mobile
      this.ctx.resume().catch(() => {});
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getContext(): AudioContext {
    return this.ctx;
  }
}
