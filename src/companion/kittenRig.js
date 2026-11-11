// Quadruped companion skeleton (reusable for any small four-legged companion). World-aligned rest pose, faces +Z, +X = left.
export const KITTEN_JOINTS = [
  ['root', null, [0, 0.140, -0.09]],
  ['spine', 'root', [0, 0.148, -0.01]],
  ['chest', 'spine', [0, 0.152, 0.065]],
  ['neck', 'chest', [0, 0.165, 0.115]],
  ['head', 'neck', [0, 0.195, 0.14]],
  ...['L', 'R'].flatMap((S) => {
    const s = S === 'L' ? 1 : -1
    return [
      ['ear' + S, 'head', [0.036 * s, 0.248, 0.13]],
      ['lid' + S, 'head', [0.026 * s, 0.212, 0.184]],
      ['fUp' + S, 'chest', [0.040 * s, 0.135, 0.075]],
      ['fLow' + S, 'fUp' + S, [0.040 * s, 0.078, 0.07]],
      ['fPaw' + S, 'fLow' + S, [0.040 * s, 0.026, 0.082]],
      ['hUp' + S, 'root', [0.048 * s, 0.125, -0.105]],
      ['hLow' + S, 'hUp' + S, [0.050 * s, 0.075, -0.09]],
      ['hPaw' + S, 'hLow' + S, [0.048 * s, 0.026, -0.105]],
    ]
  }),
  ['tail0', 'root', [0, 0.158, -0.135]], ['tail1', 'tail0', [0, 0.17, -0.185]], ['tail2', 'tail1', [0, 0.20, -0.225]],
  ['tail3', 'tail2', [0, 0.245, -0.245]], ['tail4', 'tail3', [0, 0.29, -0.245]],
]
export const KITTEN_SOLES = ['fL', 'fR', 'hL', 'hR'].map((p) => ({ S: p, pts: [[p[0] + 'Paw' + p[1], [0, -0.022, 0.004]], [p[0] + 'Paw' + p[1], [0, -0.022, 0.026]]] }))
export const KITTEN_REQUIRED = KITTEN_JOINTS.map((j) => j[0])
