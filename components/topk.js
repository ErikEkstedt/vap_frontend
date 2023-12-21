import { Box, Flex, SimpleGrid } from '@chakra-ui/react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { idx2oh } from './idxToOnehot.js';

// Constants for projection window
const step = [0.2, 0.6, 1.2, 2];
const nStep = [2, 4, 6, 8];
const defaultMargin = { top: 5, right: 5, left: 5, bottom: 5 };

// Chart for top-k probabilities
const topkProbsChart = (topk, topkP, height) => {
  if (!topk || !topkP) return null;

  const data = topk.map((value, idx) => ({
    name: value.toString(),
    y: Number((topkP[idx] * 100).toFixed(1))
  }));

  return (
    <ResponsiveContainer height={height} width="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={defaultMargin}
        padding={defaultMargin}
      >
        <XAxis dataKey="y" type="number" domain={[0, 100]} reversed={true} />
        <YAxis dataKey="name" type="category" orientation="right" />
        <CartesianGrid stroke="#f5f5f5" />
        <Bar type="monotone" dataKey="y" fill="#E43828" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Chart for top-k samples
const topkSampleChart = (oneHot, key, height = 50, marginSize = 2) => {
  const margin = {
    top: marginSize,
    right: marginSize,
    left: marginSize,
    bottom: marginSize
  };

  let data = [];
  oneHot[0].forEach((value, idx) => {
    for (let jj = 0; jj < nStep[idx]; jj++) {
      data.push({
        x: Number(step[idx]),
        a: value,
        b: -oneHot[1][idx]
      });
    }
  });

  return (
    <ResponsiveContainer height={height} width="100%" key={key}>
      <AreaChart
        width="100%"
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

const TopkWindowCharts = (topk, height) => {
  if (!topk) return null;

  return topk.map((value, idx) => {
    let onehot = idx2oh[value];
    return topkSampleChart(onehot, idx, height);
  });
};

export default function Topk({ topk, topkP }) {
  const chartHeight = topk ? (topk.length + 1) * 50 : 500;

  if (!topk) return null;

  let topkProbs = topkProbsChart(topk, topkP, chartHeight);
  let topkProjWin = TopkWindowCharts(topk, 50 + 5);
  return (
    <Flex p={2} bg="white" minHeight="100px" width="1000px">
      <Box width="30%" height={`${chartHeight}px`}>
        {topkProbs}
      </Box>
      <Box width="70%" height={`${chartHeight}px`}>
        {topkProjWin}
      </Box>
    </Flex>
  );
}
