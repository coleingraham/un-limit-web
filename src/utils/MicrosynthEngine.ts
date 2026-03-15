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

  constructor() {
    this.ctx = new AudioContext();
  }

  private debugLog(msg: string) {
    console.log(`[MicrosynthEngine] ${msg}`);
    const setter = (globalThis as unknown as Record<string, unknown>).__setDebugMsg;
    if (typeof setter === 'function') (setter as (m: string) => void)(msg);
  }

  async init(): Promise<void> {
    if (this.ready) return;

    this.debugLog('resuming ctx...');
    await this.resume();
    this.debugLog(`ctx state: ${this.ctx.state}`);

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
      await this.ctx.resume();
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getContext(): AudioContext {
    return this.ctx;
  }
}
