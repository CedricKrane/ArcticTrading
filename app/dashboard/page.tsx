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
  type?: string;
  entry: number;
  exit: number;
  size?: number;
  stop?: number;
  pnl: number;
}

export default function DashboardPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [startingCapital, setStartingCapital] = useState<number>(10000);
  const [currentCapital, setCurrentCapital] = useState<number>(10000);
  const [newCapital, setNewCapital] = useState<string>("");
  const [winRate, setWinRate] = useState<number>(0);
  const [avgRR, setAvgRR] = useState<number>(0);

  const router = useRouter();

  // 🔹 Sjekk om bruker er logget inn
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // 🔹 Hent startkapital fra localStorage
  useEffect(() => {
    const savedCapital = localStorage.getItem("startingCapital");
    if (savedCapital) {
      const parsed = parseFloat(savedCapital);
      setStartingCapital(parsed);
      setCurrentCapital(parsed);
    }
  }, []);

  // 🔹 Hent trades for innlogget bruker
  useEffect(() => {
    const fetchTrades = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Feil ved henting av bruker:", userError);
        return;
      }
      if (!user) {
        console.warn("Ingen bruker er logget inn.");
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id) // 👈 Viktig! Henter kun brukerens trades
        .order("date", { ascending: false });

      if (error) {
        console.error("Feil ved henting av trades:", error);
        return;
      }

      if (!data) {
        setTrades([]);
        setWinRate(0);
        setAvgRR(0);
        setCurrentCapital(startingCapital);
        return;
      }

      setTrades(data);

      // 🔹 Beregn total PnL
      const totalPnl = data.reduce((acc, t) => acc + (t.pnl || 0), 0);
      setCurrentCapital(startingCapital + totalPnl);

      // 🔹 Beregn win rate
      const wins = data.filter((t) => t.pnl > 0).length;
      const losses = data.filter((t) => t.pnl < 0).length;
      const total = wins + losses;
      const rate = total > 0 ? (wins / total) * 100 : 0;
      setWinRate(rate);

      // 🔹 Beregn gjennomsnittlig Risk:Reward
      const rrValues = data
        .filter((t) => t.stop && t.stop !== t.entry)
        .map((t) => {
          const size = t.size || 1;
          const risk = Math.abs(t.entry - (t.stop ?? 0)) * size;
          const reward = Math.abs(t.exit - t.entry) * size;
          return risk > 0 ? reward / risk : 0;
        })
        .filter((v) => isFinite(v) && v > 0);

      const avg =
        rrValues.length > 0
          ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length
          : 0;
      setAvgRR(avg);
    };

    fetchTrades();
  }, [startingCapital]);

  // 🔹 Lagre ny kapital
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
  const pnlColor =
    totalPnl > 0 ? "text-green-500" : totalPnl < 0 ? "text-red-500" : "text-gray-700";
  const pctChange =
    startingCapital !== 0
      ? ((currentCapital - startingCapital) / startingCapital) * 100
      : 0;
  const pctColor =
    pctChange > 0 ? "text-green-500" : pctChange < 0 ? "text-red-500" : "text-gray-700";

  // 🔹 UI
  return (
    <div className="space-y-6 relative">
      {/* Overskrift med settings-knapp */}
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
              <Input
                type="number"
                placeholder="Skriv inn ny startkapital"
                value={newCapital}
                onChange={(e) => setNewCapital(e.target.value)}
              />
              <Button onClick={handleUpdateCapital} className="w-full">
                Lagre
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistikk-kort */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Nåværende kapital</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{currentCapital.toFixed(2)} USD</p>
            <p className={`${pctColor} text-sm`}>{pctChange.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Startkapital</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{startingCapital.toFixed(2)} USD</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-semibold ${pnlColor}`}>
              {totalPnl.toFixed(2)} USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{winRate.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gj.snittlig R:R</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{avgRR.toFixed(2)} R</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
