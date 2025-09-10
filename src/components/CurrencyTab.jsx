import React, { useEffect, useState } from "react";

/**
 * CurrencyTab
 * - JPY <-> USD toggle
 * - Fetches latest rate and 7-day timeseries (exchangerate.host)
 * - Persists last amount & direction in localStorage
 * - Shows percent change vs previous day and a small history list
 */

const STORAGE_AMOUNT = "tb_currency_amount";
const STORAGE_DIR = "tb_currency_dir";

export default function CurrencyTab() {
    const [dir, setDir] = useState(() => localStorage.getItem(STORAGE_DIR) || "JPY->USD");
    const [amount, setAmount] = useState(() => {
        const v = localStorage.getItem(STORAGE_AMOUNT);
        return v !== null ? Number(v) : 1000;
    });
    const [rate, setRate] = useState(null);
    const [history, setHistory] = useState([]); // array of {date, rate}
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [convertedValue, setConvertedValue] = useState(null);
    const [copied, setCopied] = useState(false);

    // debug helper: log when convert is triggered
    async function handleConvert() {
        const amt = Number(amount || 0);
        if (isNaN(amt)) {
            console.warn("Invalid amount", amount);
            return;
        }

        // Use cached rate if available (no network)
        if (rate) {
            const val = Number((amt * rate).toFixed(2));
            setConvertedValue(val);
            const text = `${val} ${dir === "JPY->USD" ? "USD" : "JPY"}`;
            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            } catch (err) {
                console.error("clipboard write failed", err);
                alert(`Converted: ${text}`);
            }
            return;
        }

        const from = dir === "JPY->USD" ? "JPY" : "USD";
        const to = dir === "JPY->USD" ? "USD" : "JPY";

        // Try a sequence of providers until one returns a usable result.
        try {
            // 1) exchangerate.host convert (may be proxied/require key in some environments)
            try {
                const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=${amt}`;
                const res = await fetch(url);
                const json = await res.json();
                if (json && (json.result !== undefined || json.success === true)) {
                    const val = Number((json.result ?? (amt * (json.info?.rate || 0))).toFixed(2));
                    setConvertedValue(val);
                    // if provider gave an info.rate store as cached rate for future
                    if (json.info?.rate) setRate(json.info.rate);
                    const text = `${val} ${to}`;
                    try {
                        await navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    } catch {
                        alert(`Converted: ${text}`);
                    }
                    return;
                }
            } catch (e) {
                console.warn("convert endpoint failed", e);
            }

            // 2) exchangerate.host latest rates (base -> symbols)
            try {
                const latestUrl = `https://api.exchangerate.host/latest?base=${from}&symbols=${to}`;
                const latestRes = await fetch(latestUrl);
                const latestJson = await latestRes.json();
                if (latestJson && latestJson.rates && typeof latestJson.rates[to] === "number") {
                    const fallbackRate = latestJson.rates[to];
                    setRate(fallbackRate);
                    const val = Number((amt * fallbackRate).toFixed(2));
                    setConvertedValue(val);
                    const text = `${val} ${to}`;
                    try {
                        await navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    } catch {
                        alert(`Converted: ${text}`);
                    }
                    return;
                }
            } catch (e) {
                console.warn("latest endpoint failed", e);
            }

            // 3) Frankfurter (alternative free provider)
            try {
                const frankUrl = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;
                const fr = await fetch(frankUrl);
                const fj = await fr.json();
                if (fj && fj.rates && typeof fj.rates[to] === "number") {
                    const frRate = fj.rates[to];
                    setRate(frRate);
                    const val = Number((amt * frRate).toFixed(2));
                    setConvertedValue(val);
                    const text = `${val} ${to}`;
                    try {
                        await navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    } catch {
                        alert(`Converted: ${text}`);
                    }
                    return;
                }
            } catch (e) {
                console.warn("frankfurter failed", e);
            }

            // 4) Open Exchange Rates (public free endpoint alternative)
            try {
                const openUrl = `https://open.er-api.com/v6/latest/${from}`;
                const or = await fetch(openUrl);
                const oj = await or.json();
                if (oj && oj.rates && typeof oj.rates[to] === "number") {
                    const orRate = oj.rates[to];
                    setRate(orRate);
                    const val = Number((amt * orRate).toFixed(2));
                    setConvertedValue(val);
                    const text = `${val} ${to}`;
                    try {
                        await navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    } catch {
                        alert(`Converted: ${text}`);
                    }
                    return;
                }
            } catch (e) {
                console.warn("open.er-api failed", e);
            }

            // Nothing worked
            throw new Error("Conversion failed (no usable result from providers)");
        } catch (err) {
            console.error("convert fetch failed or fallback failed", err);
            alert("Conversion failed (network or provider error). Check console for details.");
        }
    }

    // helper: base and symbol depending on direction
    const base = dir === "JPY->USD" ? "JPY" : "USD";
    const symbol = dir === "JPY->USD" ? "USD" : "JPY";

    useEffect(() => {
        localStorage.setItem(STORAGE_DIR, dir);
    }, [dir]);

    useEffect(() => {
        localStorage.setItem(STORAGE_AMOUNT, String(amount));
    }, [amount]);

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            // latest rate
            const latestRes = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=${symbol}`);
            const latestJson = await latestRes.json();
            if (!latestJson || !latestJson.rates || typeof latestJson.rates[symbol] !== "number") {
                throw new Error("Latest rate not available");
            }
            const latestRate = latestJson.rates[symbol];
            setRate(latestRate);

            // timeseries for last 7 days
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 6); // 7 days total
            const fmt = (d) => d.toISOString().slice(0, 10);
            const tsRes = await fetch(
                `https://api.exchangerate.host/timeseries?start_date=${fmt(start)}&end_date=${fmt(end)}&base=${base}&symbols=${symbol}`
            );
            const tsJson = await tsRes.json();
            if (!tsJson || !tsJson.rates) {
                throw new Error("History not available");
            }
            // build ordered array of {date, rate}
            const dates = Object.keys(tsJson.rates).sort();
            const hist = dates.map((d) => ({ date: d, rate: tsJson.rates[d][symbol] }));
            setHistory(hist);
        } catch (err) {
            setError(err.message || "Network error");
            setRate(null);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        // refresh when direction changes
    }, [dir]);

    // compute conversion
    const converted = rate ? (Number(amount || 0) * rate) : convertedValue;

    // percent change vs previous day
    let pctChange = null;
    if (history.length >= 2) {
        const last = history[history.length - 1].rate;
        const prev = history[history.length - 2].rate;
        pctChange = prev ? ((last - prev) / prev) * 100 : null;
    }

    // percent change across period (first -> last)
    let periodChange = null;
    if (history.length >= 2) {
        const first = history[0].rate;
        const last = history[history.length - 1].rate;
        periodChange = first ? ((last - first) / first) * 100 : null;
    }

    function toggleDir() {
        setDir((d) => (d === "JPY->USD" ? "USD->JPY" : "JPY->USD"));
        // keep existing amount as-is; user can change
    }

    return (
        <section className="max-w-xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-4 text-black">Currency Converter</h2>

            <div className="bg-white/30 rounded-xl p-6 shadow-lg text-black">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <div className="text-xs text-zinc-600">Direction</div>
                        <div className="flex gap-2 items-center mt-1">
                            <button
                                onClick={() => setDir("JPY->USD")}
                                className={`px-3 py-1 rounded-md ${dir === "JPY->USD" ? "bg-indigo-600 text-white" : "bg-white/80 text-black"}`}
                            >
                                JPY → USD
                            </button>
                            <button
                                onClick={() => setDir("USD->JPY")}
                                className={`px-3 py-1 rounded-md ${dir === "USD->JPY" ? "bg-indigo-600 text-white" : "bg-white/80 text-black"}`}
                            >
                                USD → JPY
                            </button>
                            <button
                                onClick={toggleDir}
                                className="ml-2 px-2 py-1 rounded-md bg-zinc-200 text-black"
                                title="Toggle"
                            >
                                ↔
                            </button>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs text-zinc-600">Rate ({base} → {symbol})</div>
                        <div className="text-lg font-semibold">{loading ? "Loading…" : rate ? rate.toFixed(6) : "—"}</div>
                        {pctChange !== null && (
                            <div className={`text-sm ${pctChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {pctChange >= 0 ? "▲" : "▼"} {Math.abs(pctChange).toFixed(2)}% (24h)
                            </div>
                        )}
                        {periodChange !== null && (
                            <div className="text-xs text-zinc-600">7d {periodChange >= 0 ? "▲" : "▼"} {Math.abs(periodChange).toFixed(2)}%</div>
                        )}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">{dir === "JPY->USD" ? "JPY Amount" : "USD Amount"}</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleConvert(); } }}
                        className="w-full p-3 rounded-md border border-zinc-200 focus:outline-none"
                        min="0"
                    />
                </div>

                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <div className="text-xs text-zinc-600">Converted</div>
                        <div className="text-2xl font-bold">{converted !== null ? Number(converted).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"} {converted !== null ? symbol : ""}</div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs text-zinc-600">Actions</div>
                        <div className="flex gap-2 mt-1">
                            <button
                                onClick={fetchData}
                                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                disabled={loading}
                            >
                                Refresh
                            </button>
                            <button
                                onClick={handleConvert}
                                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                                disabled={loading}
                            >
                                Convert / Copy
                            </button>
                            <button
                                onClick={() => { setAmount(dir === "JPY->USD" ? 1000 : 10); }}
                                className="px-4 py-2 rounded-md bg-white/80 text-black hover:opacity-90"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => { setAmount(Number(amount || 0) * 2); }}
                                className="px-3 py-2 rounded-md bg-zinc-200 text-black"
                                title="Double"
                            >
                                x2
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-2">
                    <h3 className="text-sm font-medium mb-2">History (7 days)</h3>
                    <div className="grid grid-cols-7 gap-2">
                        {history.length ? history.map((h) => (
                            <div key={h.date} className="text-xs bg-white/80 rounded-md p-2 text-center">
                                <div className="font-semibold">{Number(h.rate).toFixed(4)}</div>
                                <div className="opacity-80">{new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                            </div>
                        )) : (
                            <div className="col-span-7 text-sm text-zinc-600">No history</div>
                        )}
                    </div>
                </div>

                {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
                {copied && <div className="mt-2 text-sm text-green-600">Copied to clipboard</div>}
                {!rate && !loading && !error && <div className="mt-2 text-sm text-zinc-600">Rate unavailable — try Refresh or Convert (fallback)</div>}
            </div>
        </section>
    );
}