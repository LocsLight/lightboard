import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const DEVICE_LABELS = { mobile: "Mobile", desktop: "Ordinateur", tablet: "Tablette" };

const cell = { padding: "0.55rem 0.75rem", textAlign: "left", whiteSpace: "nowrap" };
const head = { ...cell, opacity: 0.6, fontWeight: 500, fontSize: "0.8rem" };

function place(row) {
  return [row.city, row.country].filter(Boolean).join(", ") || "—";
}

function deviceName(row) {
  const kind = DEVICE_LABELS[row.device] || row.device || "—";
  return row.model ? `${kind} · ${row.model}` : kind;
}

export default function RecentDevices() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("ga-devices");
    if (error || data?.error) {
      setError("Impossible de charger les appareils.");
    } else {
      setData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <section style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Derniers appareils</h3>
        <button type="button" onClick={load} disabled={loading}>
          {loading ? "Chargement..." : "Actualiser"}
        </button>
      </div>

      {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

      {data && (
        <>
          <h4 style={{ marginBottom: "0.25rem" }}>En direct (30 dernières minutes)</h4>
          {data.live.length === 0 ? (
            <p style={{ opacity: 0.6 }}>Personne sur le site en ce moment.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={head}>Il y a</th>
                    <th style={head}>Appareil</th>
                    <th style={head}>Système</th>
                    <th style={head}>Navigateur</th>
                    <th style={head}>Lieu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.live.map((r, i) => (
                    <tr key={i}>
                      <td style={cell}>{r.minutesAgo === 0 ? "à l'instant" : `${r.minutesAgo} min`}</td>
                      <td style={cell}>{DEVICE_LABELS[r.device] || r.device || "—"}</td>
                      <td style={cell}>{r.os || "—"}</td>
                      <td style={cell}>{r.browser || "—"}</td>
                      <td style={cell}>{place(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4 style={{ marginBottom: "0.25rem" }}>Dernières visites</h4>
          {data.recent.length === 0 ? (
            <p style={{ opacity: 0.6 }}>Aucune visite récente enregistrée.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={head}>Date</th>
                    <th style={head}>Appareil</th>
                    <th style={head}>Système</th>
                    <th style={head}>Navigateur</th>
                    <th style={head}>Lieu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr key={i}>
                      <td style={cell}>{r.time}</td>
                      <td style={cell}>{deviceName(r)}</td>
                      <td style={cell}>{r.os || "—"}</td>
                      <td style={cell}>{r.browser || "—"}</td>
                      <td style={cell}>{place(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ opacity: 0.5, fontSize: "0.8rem" }}>
            Google Analytics ne donne pas d'identité ni d'adresse IP : seulement le type
            d'appareil, le système, le navigateur et la ville. Seuls les visiteurs qui ont
            accepté les cookies apparaissent. Les « dernières visites » peuvent avoir
            quelques heures de retard.
          </p>
        </>
      )}
    </section>
  );
}
