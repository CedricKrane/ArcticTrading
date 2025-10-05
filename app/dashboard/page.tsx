// app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface Trade {
  id: number;
  user_id?: string;
  date: string;
  symbol: string;
  trade_type?: "long" | "short";
  entry_price?: number;
  exit_price?: number;
  size?: number;
  stop?: number; // valgfritt (ikke i DB nå med mindre du legger til)
  pnl?: number;
}

export default function DashboardPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [startingCapital, setStartingCapital] = useState<number>(10000);
  const [currentCapital, setCurrentCapital] = useState<number>(10000);
  const [newCapital, setNewCapital] = useState<string>("");
  const [winRate, setWinRate] = useState<number>(0);
  const [avgRR, setAvgRR] = useState<number>(0);

  const router = useRouter();

  // Sjekk auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Load starting capital
  useEffect(() => {
    const savedCapital = localStorage.getItem("startingCapital");
    if (savedCapital) {
      const parsed = parseFloat(savedCapital);
      setStartingCapital(parsed);
      setCurrentCapital(parsed);
    }
  }, []);

  // Hent trades for innlogget bruker
  useEffect(() => {
    const fetchTrades = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setTrades([]);
        setWinRate(0);
        setAvgRR(0);
        setCurrentCapital(startingCapital);
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) {
        console.error("Feil ved henting av trades:", error);
        setTrades([]);
        return;
      }

      if (!data) {
        setTrades([]);
        setWinRate(0);
        setAvgRR(0);
        setCurrentCapital(startingCapital);
        return;
      }

      // Mapp til typed Trade (noen felter kan mangle)
      const tArr = data.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        date: r.date,
        symbol: r.symbol,
        trade_type: r.trade_type,
        entry_price: r.entry_price,
        exit_price: r.exit_price,
        size: r.size,
        stop: r.stop, // hvis ikke finnes - undefined
        pnl: r.pnl,
      })) as Trade[];

      setTrades(tArr);

      const totalPnl = tArr.reduce((acc, t) => acc + (t.pnl || 0), 0);
      setCurrentCapital(startingCapital + totalPnl);

      // Win rate
      const wins = tArr.filter((t) => (t.pnl || 0) > 0).length;
      const losses = tArr.filter((t) => (t.pnl || 0) < 0).length;
      const total = wins + losses;
      const rate = total > 0 ? (wins / total) * 100 : 0;
      setWinRate(rate);

      // Gjennomsnittlig R:R (krever stop i raden)
      const rrValues = tArr
        .filter((t) => t.stop !== undefined && t.entry_price !== undefined)
        .map((t) => {
          const size = t.size || 1;
          const risk = Math.abs((t.entry_price || 0) - (t.stop || 0)) * size;
          const reward = Math.abs((t.exit_price || 0) - (t.entry_price || 0)) * size;
          return risk > 0 ? reward / risk : 0;
        })
        .filter((v) => isFinite(v) && v > 0);

      const avg = rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0;
      setAvgRR(avg);
    };

    fetchTrades();
  }, [startingCapital]);

  // Oppdater startkapital
  const handleUpdateCapital = () => {
    const parsed = parseFloat(newCapital);
    if (!isNaN(parsed)) {
      setStartingCapital(parsed);
      setCurrentCapital(parsed);
      localStorage.setItem("startingCapital", parsed.toString());
      setNewCapital("");
    }
  };

  const totalPnl = currentCapital - startingCapital;
  const pnlColor = totalPnl > 0 ? "text-green-500" : totalPnl < 0 ? "text-red-500" : "text-gray-700";
  const pctChange = startingCapital !== 0 ? ((currentCapital - startingCapital) / startingCapital) * 100 : 0;
  const pctColor = pctChange > 0 ? "text-green-500" : pctChange < 0 ? "text-red-500" : "text-gray-700";

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>⚙️ Endre startkapital</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input type="number" placeholder="Skriv inn ny startkapital" value={newCapital} onChange={(e) => setNewCapital(e.target.value)} />
              <Button onClick={handleUpdateCapital} className="w-full">Lagre</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistikk-kort */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Nåværende kapital</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{currentCapital.toFixed(2)} USD</p>
            <p className={`${pctColor} text-sm`}>{pctChange.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Startkapital</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold">{startingCapital.toFixed(2)} USD</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Total PnL</CardTitle></CardHeader>
          <CardContent><p className={`text-xl font-semibold ${pnlColor}`}>{totalPnl.toFixed(2)} USD</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Win rate</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold">{winRate.toFixed(2)}%</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Gj.snittlig R:R</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold">{avgRR > 0 ? `${avgRR.toFixed(2)} R` : "—"}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
