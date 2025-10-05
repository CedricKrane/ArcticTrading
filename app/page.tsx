'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient'; // ✅ Bruk riktig Supabase-klient
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// ✅ Registrer komponentene (dette fikser feilen)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Definer TypeScript-interface for en Trade
interface Trade {
  id: number;
  date: string;      // ISO-dato for når handelen skjedde
  symbol: string;
  type: 'long' | 'short';
  entry: number;
  exit: number;
  quantity: number;
  pnl: number;
}

export default function Page() {
  // State for alle trades hentet fra Supabase
  const [trades, setTrades] = useState<Trade[]>([]);
  // State for skjema-inputs (ny trade)
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'long' | 'short'>('long');
  const [entry, setEntry] = useState<number>(0);
  const [exitPrice, setExitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [date, setDate] = useState('');
  // State for filtrering
  const [filterType, setFilterType] = useState<'all' | 'long' | 'short'>('all');
  const [filterTime, setFilterTime] = useState<'all' | 'week' | 'month' | '3months' | '6months' | '12months'>('all');

  // Hent trades fra Supabase én gang ved innlasting
  useEffect(() => {
    async function fetchTrades() {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('date', { ascending: true });
      if (error) {
        console.error('Feil ved henting av trades:', error);
      } else if (data) {
        // Map data til Trade-objekter; antatt at Supabase-tabellen har samme felt
        setTrades(data as Trade[]);
      }
    }
    fetchTrades();
  }, []);

  // Legg til nytt trade i Supabase og state
  async function handleAddTrade(e: React.FormEvent) {
    e.preventDefault();
    // Kalkuler PnL: long: (exit - entry) * qty, short: (entry - exit) * qty
    const pnl = type === 'long'
      ? (exitPrice - entry) * quantity
      : (entry - exitPrice) * quantity;

    const newTrade: Omit<Trade, 'id'> = {
      date,
      symbol,
      type,
      entry,
      exit: exitPrice,
      quantity,
      pnl,
    };

    // Sett inn i Supabase
    const { data, error } = await supabase
      .from('trades')
      .insert(newTrade)
      .select(); // får tilbake de innlagte radene inkludert id
    if (error) {
      console.error('Feil ved innsending til databasen:', error);
    } else if (data) {
      // Legg til i lokal state
      setTrades(prev => [...prev, data[0] as Trade]);
      // Nullstill skjema
      setSymbol(''); setEntry(0); setExitPrice(0); setQuantity(0);
    }
  }

  // Funksjon for å beregne dato-start ut fra filterTime
  function getStartDate() {
    const now = new Date();
    switch (filterTime) {
      case 'week': {
        // Finn mandag denne uken (antatt mandag = dag 1)
        const day = now.getDay(); // 0 (søndag) til 6 (lørdag)
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
      }
      case 'month': {
        // Første dag i inneværende måned
        return new Date(now.getFullYear(), now.getMonth(), 1);
      }
      case '3months': {
        // Nøyaktig 3 måneder tilbake fra i dag
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        return d;
      }
      case '6months': {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        return d;
      }
      case '12months': {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        return d;
      }
      default:
        return null; // 'all' eller ukjent -> ingen tidsfilter
    }
  }

  // Bruk useMemo til å filtrere trades basert på type og tidsvalg
  const filteredTrades = useMemo(() => {
    let data = [...trades];
    // Filtrer long/short
    if (filterType !== 'all') {
      data = data.filter(t => t.type === filterType);
    }
    // Filtrer tidsperiode
    const startDate = getStartDate();
    if (startDate) {
      data = data.filter(t => new Date(t.date) >= startDate);
    }
    return data;
  }, [trades, filterType, filterTime]);

  // Dashbord: total PnL, winrate, antall trades (fra filtrerte data)
  const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalTrades = filteredTrades.length;
  const wins = filteredTrades.filter(t => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : '0.0';

  // Equity-graf: lag kumulativ PnL per trade (sortert etter dato)
  const chartData = useMemo(() => {
    // Sorter filtrerte trades etter dato (stigende)
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cum = 0;
    const labels: string[] = [];
    const dataPoints: number[] = [];
    sorted.forEach(t => {
      cum += t.pnl;
      labels.push(t.date);
      dataPoints.push(cum);
    });
    return {
      labels,
      datasets: [
        {
          label: 'Kumulativ PnL',
          data: dataPoints,
          fill: false,
          borderColor: '#3b82f6', // blå linje
          tension: 0.1,
        },
      ],
    };
  }, [filteredTrades]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Dashbord-seksjon */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-bold">Total PnL</h2>
          <p className="text-2xl">{totalPnL.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-bold">Winrate</h2>
          <p className="text-2xl">{winRate}%</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-bold">Antall Trades</h2>
          <p className="text-2xl">{totalTrades}</p>
        </div>
      </div>

      {/* Tids- og typefilter */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label>Type:</label>
          <select
            className="ml-2 p-1 border rounded"
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
          >
            <option value="all">Alle</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div>
          <label>Tidsperiode:</label>
          <select
            className="ml-2 p-1 border rounded"
            value={filterTime}
            onChange={e => setFilterTime(e.target.value as any)}
          >
            <option value="all">Hele perioden</option>
            <option value="week">Denne uken</option>
            <option value="month">Denne måneden</option>
            <option value="3months">Siste 3 måneder</option>
            <option value="6months">Siste 6 måneder</option>
            <option value="12months">Siste 12 måneder</option>
          </select>
        </div>
      </div>

      {/* Equity-graf */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-lg font-bold mb-2">Equity Curve</h2>
        <Line data={chartData} />
      </div>

      {/* Skjema for å legge til ny trade */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-lg font-bold mb-2">Legg til ny trade</h2>
        <form className="space-y-4" onSubmit={handleAddTrade}>
          <div className="flex flex-wrap gap-4">
            <div>
              <label>Dato:</label>
              <input
                type="date"
                className="ml-2 p-1 border rounded"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Symbol:</label>
              <input
                type="text"
                className="ml-2 p-1 border rounded"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Type:</label>
              <select
                className="ml-2 p-1 border rounded"
                value={type}
                onChange={e => setType(e.target.value as any)}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div>
              <label>Entry Price:</label>
              <input
                type="number"
                className="ml-2 p-1 border rounded w-24"
                value={entry}
                onChange={e => setEntry(parseFloat(e.target.value))}
                required
              />
            </div>
            <div>
              <label>Exit Price:</label>
              <input
                type="number"
                className="ml-2 p-1 border rounded w-24"
                value={exitPrice}
                onChange={e => setExitPrice(parseFloat(e.target.value))}
                required
              />
            </div>
            <div>
              <label>Antall:</label>
              <input
                type="number"
                className="ml-2 p-1 border rounded w-16"
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value))}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Legg til Trade
          </button>
        </form>
      </div>

      {/* Tabell med trades (valgfritt å vise symbol/dato) */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-lg font-bold mb-2">Trades</h2>
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-2 py-1">Dato</th>
              <th className="px-2 py-1">Symbol</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Entry</th>
              <th className="px-2 py-1">Exit</th>
              <th className="px-2 py-1">Qty</th>
              <th className="px-2 py-1">PnL</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map(trade => (
              <tr key={trade.id}>
                <td className="border px-2 py-1">{trade.date}</td>
                <td className="border px-2 py-1">{trade.symbol}</td>
                <td className="border px-2 py-1 capitalize">{trade.type}</td>
                <td className="border px-2 py-1">{trade.entry}</td>
                <td className="border px-2 py-1">{trade.exit}</td>
                <td className="border px-2 py-1">{trade.quantity}</td>
                <td className={`border px-2 py-1 ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trade.pnl.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
