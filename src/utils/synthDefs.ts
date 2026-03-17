export const DEFAULT_INSTRUMENT_DEF = `synthdef unlimit freq=220.0 amp=0.3 gate=1.0 =
    let env = asr gate 0.01 0.3
    bowed freq 0.5 0.13 * amp * env`;

export const DEFAULT_MASTER_EFFECT_DEF = `synthdef master drive=1.0 =
    let sig = audioIn
    let od = overdrive sig drive 0.5 1.0
    gverb od 0.5 0.5 0.3 0.7`;
