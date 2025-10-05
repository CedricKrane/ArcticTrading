// app/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Trade {
  id: number;
  date: string;
  symbol: string;
  trade_type: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  size: number;
  pnl: number;
}

export default function Page() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [symbol, setSymbol] = useState('');
  const [tradeType, setTradeType] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [exitPrice, setExitPrice] = useState<number>(0);
  const [size, setSize] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchTrades() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data, error } = await supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: true });
      if (error) {
        console.error('Feil ved henting av trades:', error);
      } else if (data) {
        setTrades(data as Trade[]);
      }
    }
    fetchTrades();
  }, []);

  async function handleAddTrade(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert("Du må være logget inn for å legge inn trades.");
      return;
    }

    // beregn pnl
    const pnl = tradeType === 'long' ? (exitPrice - entryPrice) * size : (entryPrice - exitPrice) * size;

    const newTrade = {
      date,
      symbol,
      trade_type: tradeType,
      entry_price: entryPrice,
      exit_price: exitPrice,
      size,
      pnl,
      user_id: user.id,
    };

    const { data, error } = await supabase.from('trades').insert(newTrade).select();
    if (error) {
      console.error('Feil ved innsending til databasen:', error);
      return;
    }
    if (data) {
      setTrades(prev => [...prev, data[0] as Trade]);
      // reset
      setSymbol('');
      setEntryPrice(0);
      setExitPrice(0);
      setSize(0);
      setDate(new Date().toISOString().split('T')[0]);
    }
  }

  // filtrering & statistikk som før (eksempel)
  const filteredTrades = trades; // du kan legge inn tidsfilter her

  const totalPnL = filteredTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const totalTrades = filteredTrades.length;
  const wins = filteredTrades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : '0.0';

  const chartData = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cum = 0;
    const labels: string[] = [];
    const dataPoints: number[] = [];
    sorted.forEach(t => {
      cum += t.pnl || 0;
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
          borderColor: '#3b82f6',
          tension: 0.1,
        },
      ],
    };
  }, [filteredTrades]);

  return (
    <div className="container mx-auto p-4 space-y-6">
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

      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-lg font-bold mb-2">Equity Curve</h2>
        <Line data={chartData} />
      </div>

      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-lg font-bold mb-2">Legg til ny trade</h2>
        <form className="space-y-4" onSubmit={handleAddTrade}>
          <div className="flex flex-wrap gap-4">
            <div>
              <label>Dato:</label>
              <input type="date" className="ml-2 p-1 border rounded" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label>Symbol:</label>
              <input type="text" className="ml-2 p-1 border rounded" value={symbol} onChange={e => setSymbol(e.target.value)} required />
            </div>
            <div>
              <label>Type:</label>
              <select className="ml-2 p-1 border rounded" value={tradeType} onChange={e => setTradeType(e.target.value as any)}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div>
              <label>Entry Price:</label>
              <input type="number" className="ml-2 p-1 border rounded w-24" value={entryPrice} onChange={e => setEntryPrice(parseFloat(e.target.value))} required />
            </div>
            <div>
              <label>Exit Price:</label>
              <input type="number" className="ml-2 p-1 border rounded w-24" value={exitPrice} onChange={e => setExitPrice(parseFloat(e.target.value))} required />
            </div>
            <div>
              <label>Size:</label>
              <input type="number" className="ml-2 p-1 border rounded w-16" value={size} onChange={e => setSize(parseFloat(e.target.value))} required />
            </div>
          </div>
          <button type="submit" className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Legg til Trade</button>
        </form>
      </div>
    </div>
  );
}
