import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../lib/supabaseClient";

// GA4 renvoie les dates au format "20260315" (AAAAMMJJ)
const formatDayLabel = (value) => `${value.slice(6, 8)}/${value.slice(4, 6)}`;

// GA4 renvoie les mois au format "202603" (AAAAMM)
const monthNames = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];
const formatMonthLabel = (value) => {
  const month = parseInt(value.slice(4, 6), 10) - 1;
  return `${monthNames[month]} ${value.slice(2, 4)}`;
};

const formatDuration = (seconds) => {
  const s = Math.round(Number(seconds) || 0);
  return `${Math.floor(s / 60)} min ${s % 60} s`;
};

const metricValue = (report, index = 0) =>
  report?.rows?.[0]?.metricValues?.[index]?.value ?? "—";

export default function Stats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (isFirstLoad) => {
      if (isFirstLoad) setLoading(true);
      setError(null);
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "ga-stats",
        { body: { range: "28daysAgo" } }
      );
      if (fnError) setError("Impossible de charger les statistiques.");
      else setData(result);
      if (isFirstLoad) setLoading(false);
    };

    load(true);
    // Rafraîchit automatiquement le compteur temps réel toutes les 30 secondes
    const interval = setInterval(() => load(false), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p>Chargement des statistiques...</p>;
  if (error) return <p className="stats__error">{error}</p>;
  if (!data) return null;

  const {
    overview,
    geo,
    languages,
    sources,
    pages,
    scroll,
    realtime,
    merchClicks,
    trafficByDay,
    trafficByMonth,
  } = data;

  const eventLabels = {
    select_merch_item: "Clic sur la vignette",
    click_acheter: "Clic sur Acheter",
  };

  const dayData =
    trafficByDay?.rows?.map((row) => ({
      label: formatDayLabel(row.dimensionValues[0].value),
      visiteurs: Number(row.metricValues[0].value),
      sessions: Number(row.metricValues[1].value),
    })) || [];

  const monthData =
    trafficByMonth?.rows?.map((row) => ({
      label: formatMonthLabel(row.dimensionValues[0].value),
      visiteurs: Number(row.metricValues[0].value),
      sessions: Number(row.metricValues[1].value),
    })) || [];

  return (
    <section className="stats-page">
      <h1>Stats</h1>

      <div className="stats__card stats__card--live">
        <span className="stats__label">
          <span className="stats__live-dot" aria-hidden="true" />
          En ce moment
        </span>
        <span className="stats__value">{metricValue(realtime, 0)}</span>
      </div>

      <p className="stats__period">28 derniers jours</p>

      <div className="stats__grid">
        <div className="stats__card">
          <span className="stats__label">Visiteurs</span>
          <span className="stats__value">{metricValue(overview, 0)}</span>
        </div>
        <div className="stats__card">
          <span className="stats__label">Sessions</span>
          <span className="stats__value">{metricValue(overview, 1)}</span>
        </div>
        <div className="stats__card">
          <span className="stats__label">Pages vues</span>
          <span className="stats__value">{metricValue(overview, 2)}</span>
        </div>
        <div className="stats__card">
          <span className="stats__label">Durée moyenne</span>
          <span className="stats__value">{formatDuration(metricValue(overview, 3))}</span>
        </div>
        <div className="stats__card">
          <span className="stats__label">Taux de rebond</span>
          <span className="stats__value">
            {Math.round((Number(metricValue(overview, 4)) || 0) * 100)}%
          </span>
        </div>
        <div className="stats__card">
          <span className="stats__label">Scroll (événements)</span>
          <span className="stats__value">{metricValue(scroll, 0)}</span>
        </div>
      </div>

      <div className="stats__charts">
        <div className="stats__chart-card">
          <h2>Trafic — 30 derniers jours</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dayData}>
              <CartesianGrid stroke="#27272f" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#999" fontSize={12} />
              <YAxis stroke="#999" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#1a1a22", border: "1px solid #333" }}
              />
              <Line type="monotone" dataKey="visiteurs" stroke="#6ee7a0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sessions" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="stats__chart-card">
          <h2>Trafic — 12 derniers mois</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthData}>
              <CartesianGrid stroke="#27272f" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#999" fontSize={12} />
              <YAxis stroke="#999" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#1a1a22", border: "1px solid #333" }}
              />
              <Line type="monotone" dataKey="visiteurs" stroke="#6ee7a0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sessions" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="stats__tables">
        <div className="stats__table">
          <h2>Pages les plus visitées</h2>
          <ul>
            {pages?.rows?.map((row) => (
              <li key={row.dimensionValues[0].value}>
                <span>{row.dimensionValues[0].value}</span>
                <strong>{row.metricValues[0].value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="stats__table">
          <h2>Pays / Ville</h2>
          <ul>
            {geo?.rows?.map((row, i) => (
              <li key={i}>
                <span>
                  {row.dimensionValues[0].value} — {row.dimensionValues[1].value}
                </span>
                <strong>{row.metricValues[0].value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="stats__table">
          <h2>Langues</h2>
          <ul>
            {languages?.rows?.map((row, i) => (
              <li key={i}>
                <span>{row.dimensionValues[0].value}</span>
                <strong>{row.metricValues[0].value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="stats__table">
          <h2>Source de trafic</h2>
          <ul>
            {sources?.rows?.map((row, i) => (
              <li key={i}>
                <span>
                  {row.dimensionValues[0].value} / {row.dimensionValues[1].value}
                </span>
                <strong>{row.metricValues[0].value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="stats__table">
          <h2>Clics sur le merch</h2>
          <ul>
            {merchClicks?.rows?.length ? (
              merchClicks.rows.map((row, i) => {
                const eventName = row.dimensionValues[0].value;
                const itemName = row.dimensionValues[1].value;
                const clicks = row.metricValues[0].value;
                const visitors = row.metricValues[1].value;
                return (
                  <li key={i}>
                    <span>
                      {itemName} — {eventLabels[eventName] || eventName}
                    </span>
                    <strong>
                      {visitors} visiteur{visitors > 1 ? "s" : ""} ({clicks} clic
                      {clicks > 1 ? "s" : ""})
                    </strong>
                  </li>
                );
              })
            ) : (
              <li>Aucun clic enregistré pour l'instant.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
