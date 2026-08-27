import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { BurndownDay } from "../services/sprintService";

interface Props {
  days: BurndownDay[];
}

export default function BurndownChart({ days }: Props) {
  const { t } = useTranslation();
  const data = days.map((d) => ({
    ...d,
    label: dayjs(d.date).format("MMM D"),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8c8c8c" }} />
        <YAxis tick={{ fontSize: 11, fill: "#8c8c8c" }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="ideal"
          name={t("sprintsPage.chart.ideal")}
          stroke="#d9d9d9"
          strokeDasharray="4 4"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name={t("sprintsPage.chart.actual")}
          stroke="#4a6cf7"
          dot={{ r: 3 }}
          strokeWidth={2}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
