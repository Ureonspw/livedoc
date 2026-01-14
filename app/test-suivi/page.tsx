"use client";

import { useState, useEffect } from "react";

export default function TestSuiviPage() {
  const [medecinId, setMedecinId] = useState("4");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/suivi-medical/test?medecin_id=${medecinId}`);
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testAPI();
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>Test Suivi Médical</h1>
      <div style={{ marginBottom: "20px" }}>
        <label>
          ID Médecin:{" "}
          <input
            type="number"
            value={medecinId}
            onChange={(e) => setMedecinId(e.target.value)}
            style={{ padding: "8px", marginLeft: "10px" }}
          />
        </label>
        <button
          onClick={testAPI}
          disabled={loading}
          style={{
            padding: "8px 16px",
            marginLeft: "10px",
            background: "#3c4f8a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {loading ? "Chargement..." : "Tester"}
        </button>
      </div>

      {result && (
        <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px" }}>
          <h2>Résultats:</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
