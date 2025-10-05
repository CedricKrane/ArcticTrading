"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [symbol, setSymbol] = useState("");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // 🔹 Hent trades fra Supabase (kun for innlogget bruker)
  useEffect(() => {
    const fetchTrades = async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        console.error("Feil ved henting av bruker:", userErr);
        setTrades([]);
        return;
      }

      const user = userData?.user;
      if (!user) {
        // Ikke innlogget - vis ingen trades
        setTrades([]);
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
      } else {
        setTrades(data || []);
      }
    };
    fetchTrades();
  }, []);

  // 🔹 Legg til ny trade
  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();

    // Hent innlogget bruker fra Supabase Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Du må være logget inn for å legge til trades!");
      return;
    }

    // Enkel validering
    if (!symbol || !entry || !exit || !qty) {
      alert("Fyll inn symbol, entry, exit og qty.");
      return;
    }

    const pnl = (parseFloat(exit) - parseFloat(entry)) * parseFloat(qty);

    const { error } = await supabase.from("trades").insert([
      {
        user_id: user.id,
        symbol,
        entry: parseFloat(entry),
        exit: parseFloat(exit),
        qty: parseFloat(qty),
        pnl,
        date,
      },
    ]);

    if (error) {
      console.error("Feil ved lagring av trade:", error);
      alert("Kunne ikke lagre trade. Sjekk konsollen for detaljer.");
    } else {
      // Nullstill inputfeltene etter lagring
      setSymbol("");
      setEntry("");
      setExit("");
      setQty("");
      setDate(new Date().toISOString().split("T")[0]);

      // Hent oppdatert liste med trades for brukeren
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      setTrades(data || []);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trades</h1>

      <Card>
        <CardHeader>
          <CardTitle>Historiske trades</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dato</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>PnL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.length > 0 ? (
                trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{trade.date}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>{trade.entry}</TableCell>
                    <TableCell>{trade.exit}</TableCell>
                    <TableCell>{trade.qty}</TableCell>
                    <TableCell
                      className={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}
                    >
                      {trade.pnl !== undefined && trade.pnl !== null ? (
                        <>
                          {trade.pnl >= 0 ? "+" : ""}
                          {trade.pnl.toFixed(2)}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Ingen trades funnet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legg til ny trade</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTrade} className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Symbol</Label>
              <Input
                placeholder="Eks: AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Entry</Label>
              <Input
                type="number"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Exit</Label>
              <Input
                type="number"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Qty</Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Dato</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="md:col-span-2">
              Legg til
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
