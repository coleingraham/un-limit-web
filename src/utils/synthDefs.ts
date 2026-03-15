export const DEFAULT_INSTRUMENT_DEF = `synthdef unlimit freq=220.0 amp=0.3 gate=1.0 cutoff=2000.0 =
    let env = asr gate 0.01 0.3
    let sig = saw freq
    let h2 = sinOsc (freq * 2.0) 0.0 * 0.3
    let mix = sig + h2
    lpf mix cutoff 2.0 * amp * env`;

export const DEFAULT_MASTER_EFFECT_DEF = `synthdef master amp=0.5 =
    let sig = input
    sig * amp`;
