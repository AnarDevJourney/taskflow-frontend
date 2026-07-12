import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { VelocityPoint } from "../services/sprintService";

interface Props {
  data: VelocityPoint[];
}

export default function VelocityChart({ data }: Props) {
  const chartData = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8c8c8c" }} />
        <YAxis tick={{ fontSize: 10, fill: "#8c8c8c" }} width={24} />
        <Tooltip />
        <Bar dataKey="completedPoints" name="Points" fill="#4a6cf7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
