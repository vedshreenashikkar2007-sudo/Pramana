import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const defaultWallet = "0x1234567890123456789012345678901234567890";

function App() {
  const [page, setPage] = useState("home");
  const [walletAddress, setWalletAddress] = useState(defaultWallet);
  const [did, setDid] = useState("did:polygonid:pramana-demo");
  const [token, setToken] = useState(
    localStorage.getItem("pramana_token") || ""
  );
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({
    asset_name: "Forensic Evidence Vault",
    purpose: "Authorized forensic case review",
    duration_minutes: 30,
    ipfs_cid: "bafy-demo-encrypted-evidence-cid",
  });
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/assets`)
      .then((response) => response.json())
      .then((data) => setAssets(data.assets || []))
      .catch(() => setMessage("Backend is not running. Start FastAPI first."));
  }, []);

  async function connectDemoWallet() {
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/wallet-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          did: did,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Wallet validation failed.");
      }

      localStorage.setItem("pramana_token", data.access_token);
      setToken(data.access_token);

      setMessage(
        `Wallet verified. JWT issued for ${data.expires_in_minutes} minutes.`
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submitAccessRequest(event) {
    event.preventDefault();
    setResult(null);
    setMessage("");

    if (!token) {
      setMessage("First click Verify Demo Wallet.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/access/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          did: did,
          asset_name: form.asset_name,
          purpose: form.purpose,
          duration_minutes: Number(form.duration_minutes),
          ipfs_cid: form.ipfs_cid || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to evaluate access request.");
      }

      setResult(data);
      setMessage("Access request recorded in the Pramana audit database.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAuditLogs() {
    setMessage("");

    if (!token) {
      setMessage("First click Verify Demo Wallet.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/audit/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load audit logs.");
      }

      setLogs(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function disconnect() {
    localStorage.removeItem("pramana_token");
    setToken("");
    setResult(null);
    setLogs([]);
    setMessage("Wallet session disconnected.");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Pramana</h1>
          <p>Never Trust · Always Verify · Always Record</p>
        </div>

        <div className="session-box">
          <span className={token ? "status online" : "status offline"}>
            {token ? "Verified session" : "No session"}
          </span>

          {token && (
            <button className="secondary-button" onClick={disconnect}>
              Disconnect
            </button>
          )}
        </div>
      </header>

      <nav className="nav">
        <button onClick={() => setPage("home")}>Home</button>
        <button onClick={() => setPage("about")}>About Us</button>
        <button onClick={() => setPage("how")}>How to Use</button>
        <button onClick={() => setPage("access")}>Request Access</button>
        <button
          onClick={() => {
            setPage("audit");
            loadAuditLogs();
          }}
        >
          Audit Logs
        </button>
      </nav>

      {message && <div className="message">{message}</div>}

      <main className="content">
        {page === "home" && (
          <section>
            <div className="hero-card">
              <p className="eyebrow">Zero-trust access prototype</p>
              <h2>We verify access for this moment, not forever.</h2>
              <p>
                Pramana validates a wallet-format identity, checks the requested
                asset, purpose, and duration, provides a temporary JWT session,
                and records every approval or denial in an audit log.
              </p>
              <button
                className="primary-button"
                onClick={() => setPage("access")}
              >
                Start Access Request
              </button>
            </div>

            <div className="card-grid">
              <article className="info-card">
                <h3>1. Verify Identity</h3>
                <p>
                  Validate an Ethereum/Polygon-format wallet and attach a
                  DID-ready identity reference.
                </p>
              </article>

              <article className="info-card">
                <h3>2. Decide Access</h3>
                <p>
                  Check the asset, purpose, and temporary access duration
                  against security rules.
                </p>
              </article>

              <article className="info-card">
                <h3>3. Record Activity</h3>
                <p>
                  Store every approval or denial in the Pramana audit database.
                </p>
              </article>
            </div>
          </section>
        )}

        {page === "about" && (
          <section className="page-card">
            <h2>About Pramana</h2>

            <p>
              <strong>Pramana</strong> is a zero-trust digital access-control
              prototype. It does not give permanent access just because a user
              has an account or wallet. It checks whether the user should access
              a specific asset for a specific purpose and time period.
            </p>

            <h3>Technology Stack</h3>

            <ul>
              <li>React.js provides the frontend interface.</li>
              <li>FastAPI provides backend APIs and security rules.</li>
              <li>SQLite stores prototype audit records.</li>
              <li>PostgreSQL can replace SQLite in the final deployment.</li>
              <li>JWT creates short-lived authenticated sessions.</li>
              <li>Web3.py validates EVM wallet address format.</li>
              <li>DID, Polygon ID, Polygon, Solidity, IPFS, and AES-256-GCM are planned integration layers.</li>
            </ul>
          </section>
        )}

        {page === "how" && (
          <section className="page-card">
            <h2>How to Use Pramana</h2>

            <ol>
              <li>Open the Request Access page.</li>
              <li>Keep the supplied demo wallet or enter a valid wallet address.</li>
              <li>Enter an optional DID or Polygon ID reference.</li>
              <li>Click Verify Demo Wallet to obtain a temporary JWT session.</li>
              <li>Select an approved digital asset.</li>
              <li>Write a meaningful access purpose.</li>
              <li>Choose a duration between 5 and 120 minutes.</li>
              <li>Click Evaluate Access Request.</li>
              <li>Open Audit Logs to view the stored request.</li>
            </ol>

            <h3>Prototype Rules</h3>

            <ul>
              <li>The wallet must be a valid Ethereum/Polygon address format.</li>
              <li>The asset must be in the approved demo list.</li>
              <li>The purpose must contain at least five characters.</li>
              <li>The access duration must be from 5 to 120 minutes.</li>
            </ul>
          </section>
        )}

        {page === "access" && (
          <section className="page-card">
            <h2>Request Temporary Access</h2>

            <div className="wallet-form">
              <label>
                Wallet Address
                <input
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                  placeholder="0x..."
                />
              </label>

              <label>
                DID / Polygon ID Reference
                <input
                  value={did}
                  onChange={(event) => setDid(event.target.value)}
                  placeholder="did:polygonid:..."
                />
              </label>

              <button className="primary-button" onClick={connectDemoWallet}>
                Verify Demo Wallet
              </button>
            </div>

            <hr />

            <form onSubmit={submitAccessRequest}>
              <label>
                Digital Asset
                <select
                  value={form.asset_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      asset_name: event.target.value,
                    })
                  }
                >
                  {assets.map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Purpose of Access
                <textarea
                  value={form.purpose}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      purpose: event.target.value,
                    })
                  }
                  placeholder="Example: Review evidence for Case 2026-001"
                />
              </label>

              <label>
                Requested Duration in Minutes
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={form.duration_minutes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      duration_minutes: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Encrypted IPFS CID, Optional
                <input
                  value={form.ipfs_cid}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      ipfs_cid: event.target.value,
                    })
                  }
                  placeholder="bafy..."
                />
              </label>

              <button className="primary-button" type="submit">
                Evaluate Access Request
              </button>
            </form>

            {result && (
              <div
                className={
                  result.decision === "APPROVED"
                    ? "result approved"
                    : "result denied"
                }
              >
                <h3>{result.decision}</h3>
                <p>{result.reason}</p>
                <p>
                  <strong>Request ID:</strong> {result.request_id}
                </p>
                <p>
                  <strong>Asset:</strong> {result.asset_name}
                </p>
                <p>
                  <strong>Duration:</strong> {result.duration_minutes} minutes
                </p>
                <p>
                  <strong>Blockchain Audit:</strong> {result.blockchain_audit}
                </p>
              </div>
            )}
          </section>
        )}

        {page === "audit" && (
          <section className="page-card">
            <div className="section-heading">
              <h2>Audit Logs</h2>

              <button className="secondary-button" onClick={loadAuditLogs}>
                Refresh
              </button>
            </div>

            {logs.length === 0 ? (
              <p>No audit logs loaded yet. Submit an access request first.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Wallet</th>
                      <th>Asset</th>
                      <th>Decision</th>
                      <th>Purpose</th>
                      <th>Time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>

                        <td>
                          {`${log.wallet_address.slice(0, 8)}...${log.wallet_address.slice(-4)}`}
                        </td>

                        <td>{log.asset_name}</td>

                        <td>
                          <span
                            className={
                              log.decision === "APPROVED"
                                ? "decision approved-pill"
                                : "decision denied-pill"
                            }
                          >
                            {log.decision}
                          </span>
                        </td>

                        <td>{log.purpose}</td>

                        <td>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;