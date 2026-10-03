import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "ga-stats",
        { body: { range: "28daysAgo" } }
      );
      if (fnError) setError("Impossible de charger les statistiques.");
      else setData(result);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p>Chargement des statistiques...</p>;
  if (error) return <p className="stats__error">{error}</p>;
  if (!data) return null;

  const { overview, geo, languages, sources, pages, scroll } = data;

  return (
    <section className="stats-page">
      <h1>Stats</h1>
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
      </div>
    </section>
  );
}
