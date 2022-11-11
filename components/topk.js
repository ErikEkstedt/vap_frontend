import { Box, SimpleGrid } from '@chakra-ui/react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { idx2oh } from './idxToOnehot.js';

// Projection window
const step = [0.2, 0.6, 1.2, 2];
const nStep = [2, 4, 6, 8];

const topkProbsChart = (topk, topkP, height) => {
  if (!(topk && topkP)) {
    return;
  }
  const margin = { top: 5, right: 5, left: 5, bottom: 5 };
  const padding = { top: 5, right: 5, left: 5, bottom: 5 };

  let data = [];
  for (let ii = 0; ii < topk.length; ii++) {
    data.push({
      name: topk[ii].toString(),
      y: Number((topkP[ii] * 100).toFixed(1)),
    });
  }

  return (
    <ResponsiveContainer height={height} width="100%">
      <BarChart layout="vertical" data={data} margin={margin} padding={padding}>
        <XAxis dataKey="y" type="number" domain={[0, 100]} reversed={true} />
        <YAxis dataKey="name" type="category" orientation="right" />
        <CartesianGrid stroke="#f5f5f5" />
        <Bar type="monotone" dataKey="y" fill="#E43828" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const topkSampleChart = (oneHot, key, h = 50, m = 2) => {
  const margin = { top: m, right: m, left: m, bottom: m };

  let data = [];
  for (let ii = 0; ii < oneHot[0].length; ii++) {
    for (let jj = 0; jj < nStep[ii]; jj++) {
      data.push({
        x: Number(step[ii]),
        a: oneHot[0][ii],
        b: -oneHot[1][ii],
      });
    }
  }

  return (
    <ResponsiveContainer height={h} key={key}>
      <AreaChart
        margin={margin}
        data={data}
        baseValue={Number}
        isAnimationActive={false}
      >
        <YAxis hide={true} domain={[-1, 1]} />
        <Area
          isAnimationActive={false}
          type="stepAfter"
          dataKey="a"
          fill="#286FE4"
        />
        <Area
          isAnimationActive={false}
          type="stepAfter"
          dataKey="b"
          fill="#E48E28"
        />
        <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
        <ReferenceLine y={-1} stroke="#000" strokeWidth={2} />
        <ReferenceLine y={1} stroke="#000" strokeWidth={2} />
        <ReferenceLine x={0} stroke="#000" strokeWidth={2} />
        <ReferenceLine x={2} stroke="#000" strokeWidth={2} />
        <ReferenceLine x={6} stroke="#000" strokeWidth={2} />
        <ReferenceLine x={12} stroke="#000" strokeWidth={2} />
        <ReferenceLine x={19} stroke="#000" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const TopkWindowCharts = (topk, height, margin = 2) => {
  if (!topk) {
    return;
  }

  let samples = [];
  for (let ii = 0; ii < topk.length; ii++) {
    let onehot = idx2oh[topk[ii]];
    samples.push(topkSampleChart(onehot, ii, height, margin));
  }
  return samples;
};

export default function Topk(props) {
  const chartH = 50;
  const chartHeight = props.topk
    ? (props.topk.length + 1) * chartH
    : chartH * 10;

  let topkProbs = topkProbsChart(props.topk, props.topkP, chartHeight);
  let topkProjWin = TopkWindowCharts(props.topk, chartH);

  return (
    <SimpleGrid
      borderRadius={10}
      m={2}
      p={2}
      columns={2}
      spacing={5}
      bg="white"
    >
      <Box p={2} height={`${chartHeight}px`}>
        {topkProbs}
      </Box>
      <Box p={2} height={`${chartHeight}px`}>
        {topkProjWin}
      </Box>
    </SimpleGrid>
  );
}
