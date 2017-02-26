import * as d3 from 'd3'

let g = 0

const gateSpec = {
  AND: () => ({
    type: 'AND',
    inputs: ['a', 'b'],
    outputs: ['out'],
    apply: (a, b) => ({ out: a && b })
  }),
  XOR: () => ({
    type: 'XOR',
    inputs: ['a', 'b'],
    outputs: ['out'],
    apply: (a, b) => ({ out: a ^ b })
  }),
  NOT: () => ({
    type: 'NOT',
    inputs: ['in'],
    outputs: ['out'],
    apply: (i) => ({ out: !i })
  }),
  INPUT: () => {
    let state = 0
    const period = ++g
    return {
      type: 'INPUT',
      inputs: [],
      outputs: ['out'],
      apply: () => ({ out: Math.floor(state++ / (10 * period)) % 2 == 0})
    }
  },
  OUTPUT: () => ({
    type: 'OUTPUT',
    inputs: ['in'],
    outputs: [],
    apply: () => ({})
  })
}

const spec = {
  nodes: [
    'INPUT',
    'INPUT',
    'AND',
    'XOR',
    'OUTPUT',
    'OUTPUT'
  ],
  wires: [
    { from: '0.out', to: '2.a' },
    { from: '1.out', to: '2.b' },
    { from: '0.out', to: '3.a' },
    { from: '1.out', to: '3.b' },
    { from: '2.out', to: '4.in' },
    { from: '3.out', to: '5.in' }
  ]
}

const body = d3.select('body')
  .append('svg')
  .classed('main', true)
  .attr('width', 600)
  .attr('height', 600)

const wireSel = body.append('g');
const gateSel = body.append('g');

const gatePosX = [100, 120, 200, 200, 300, 300]
const gatePosY = [100, 200, 100, 200, 100, 200]

let global_gates = spec.nodes.map((type, i) => ({ ...gateSpec[type](), x: gatePosX[i], y: gatePosY[i] }))
let global_wires = spec.wires.map(wire => ({ ...wire, high: false, last: false}))

const gateSize = 40;

const renderGates = gates => {
  gateSel
    .selectAll('rect')
    .data(gates)
    .enter()
    .append('rect')
    .attr('width', gateSize)
    .attr('height', gateSize)
    .attr('x', d => d.x - gateSize / 2)
    .attr('y', d => d.y - gateSize / 2)
    .attr('fill', 'blue')
}

const gateIndex = wireSpec => parseInt(wireSpec.split('.')[0])
const gatePort = wireSpec => wireSpec.split('.')[1]

const renderWires = (gates, wires) => {

  const computePath = ({from, to}) => {
      const a = gates[gateIndex(from)]
      const b = gates[gateIndex(to)]

      const aIndex = a.outputs.indexOf(gatePort(from))
      const bIndex = b.inputs.indexOf(gatePort(to))

      const aOffset = 30 * ((a.outputs.length - 1) / 2 - aIndex)
      const bOffset = 30 * ((b.inputs.length - 1) / 2 - bIndex)

      const line = d3.line()
        .curve(d3.curveStep)
        .x(d => d.x)
        .y(d => d.y)

      // Using -offset instead of +offset because canvas y=0 is at the top, which is backwards wrt the inputs and outputs array
      return line([{ x: a.x, y: a.y - aOffset }, { x: b.x, y: b.y - bOffset }])
  }

  wireSel
    .selectAll('path.background')
    .data(wires)
    .enter().append('path')
    .classed('background', true)
    .attr('d', computePath)
    .attr('stroke', 'grey')
    .attr('fill', 'none')

  wireSel
    .selectAll('path.foreground')
    .data(wires)
    .enter().append('path')
    .classed('foreground', true)
    .attr('d', computePath)
    .attr('stroke-dasharray', function() {
      const length = this.getTotalLength()
      return `0 ${length} ${length} ${length}`
    })
    .attr('stroke', 'red')
    .attr('fill', 'none')

  wireSel
    .selectAll('path.foreground')
    .transition()
    .ease(d3.easeLinear)
    .duration(1000)
    .attr('stroke-dasharray', function({ high, last }, i) {
      if(i == 0) console.log('tra', high, last);
      if (!high && last) {
        const length = this.getTotalLength()
        return `0 ${length} ${length} ${length}`
      } else if (high && !last) {
        const length = this.getTotalLength()
        return `${length} ${length} ${length} ${length}`
      }
      return this.attributes['stroke-dasharray'].value
    })
    .on('end', function({high, last}, i) {
      if(i == 0) console.log('set', high, last);
      if(!high && last) {
        const length = this.getTotalLength();
        d3.select(this).attr('stroke-dasharray', `0 0 ${length} ${length}`)
      }
    })

}

const update = (wires, gates) => {

  const activePorts = {}
  wires.filter(({high}) => high).forEach(({ to }) => {
    activePorts[gateIndex(to)] = activePorts[gateIndex(to)] || {};
    activePorts[gateIndex(to)][gatePort(to)] = true;
  })

  const newPorts = {}
  gates.forEach((gate, i) => {
    const params = gate.inputs.map(input => !!(activePorts[i] && activePorts[i][input]))
    const outputs = gate.apply(...params)
    Object.keys(outputs).forEach(output => {
      newPorts[i] = newPorts[i] || {}
      newPorts[i][output] = outputs[output]
    })
  })

  return wires.map(({ from, to, high }) => {
    const gate = newPorts[gateIndex(from)]
    const newHigh = gate && gate[gatePort(from)]
    const last = high
    return { from, to, high: newHigh, last }
  })
}

const updateAndRender = () => {
  global_wires = update(global_wires, global_gates)
  renderWires(global_gates, global_wires)
  renderGates(global_gates)
}

setInterval(updateAndRender, 1000);