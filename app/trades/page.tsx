"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default function TradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [symbol, setSymbol] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [size, setSize] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [tradeType, setTradeType] = useState<"long" | "short">("long");

  // 🔹 Hent trades for innlogget bruker
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

  // 🔹 Legg til ny trade (med støtte for long/short og automatisk PnL)
  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Du må være logget inn for å legge til trades!");
      return;
    }

    // Valider input
    if (!symbol || !entryPrice || !exitPrice || !size) {
      alert("Fyll inn symbol, entry, exit og size.");
      return;
    }

    const entryNum = parseFloat(entryPrice);
    const exitNum = parseFloat(exitPrice);
    const sizeNum = parseFloat(size);
    const type = tradeType || "long";

    // 🔹 Kalkuler PnL
    let pnlUsd = 0;
    let pnlPercent = 0;

    if (type === "long") {
      pnlUsd = (exitNum - entryNum) * sizeNum;
      pnlPercent = ((exitNum - entryNum) / entryNum) * 100;
    } else {
      pnlUsd = (entryNum - exitNum) * sizeNum;
      pnlPercent = ((entryNum - exitNum) / entryNum) * 100;
    }

    // 🔹 Send til Supabase
    const { error } = await supabase.from("trades").insert([
      {
        user_id: user.id,
        symbol,
        trade_type: type,
        entry_price: entryNum,
        exit_price: exitNum,
        size: sizeNum,
        pnl_usd: pnlUsd,
        pnl_percent: pnlPercent,
        date,
      },
    ]);

    if (error) {
      console.error("Feil ved lagring av trade:", error);
      alert("Kunne ikke lagre trade.");
      return;
    }

    // Nullstill inputs
    setSymbol("");
    setEntryPrice("");
    setExitPrice("");
    setSize("");
    setDate(new Date().toISOString().split("T")[0]);

    // Hent oppdatert liste
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    setTrades(data || []);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trades</h1>

      {/* 🔹 Liste over trades */}
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
                <TableHead>Type</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>PnL (USD)</TableHead>
                <TableHead>PnL (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.length > 0 ? (
                trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{trade.date}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell className="capitalize">
                      {trade.trade_type}
                    </TableCell>
                    <TableCell>{trade.entry_price}</TableCell>
                    <TableCell>{trade.exit_price}</TableCell>
                    <TableCell>{trade.size}</TableCell>
                    <TableCell
                      className={
                        trade.pnl_usd >= 0 ? "text-green-500" : "text-red-500"
                      }
                    >
                      {trade.pnl_usd >= 0 ? "+" : ""}
                      {trade.pnl_usd.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={
                        trade.pnl_percent >= 0 ? "text-green-500" : "text-red-500"
                      }
                    >
                      {trade.pnl_percent >= 0 ? "+" : ""}
                      {trade.pnl_percent.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-500"
                  >
                    Ingen trades funnet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 🔹 Skjema for å legge til ny trade */}
      <Card>
        <CardHeader>
          <CardTitle>Legg til ny trade</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTrade} className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Symbol</Label>
              <Input
                placeholder="Eks: BTCUSD"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Type</Label>
              <select
                value={tradeType}
                onChange={(e) =>
                  setTradeType(e.target.value as "long" | "short")
                }
                className="w-full p-2 border rounded"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            <div>
              <Label>Entry Price</Label>
              <Input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Exit Price</Label>
              <Input
                type="number"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Size</Label>
              <Input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
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
