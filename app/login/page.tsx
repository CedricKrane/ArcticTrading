"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔐 Send til dashboard hvis allerede logget inn
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/dashboard");
      }
    };
    checkSession();
  }, [router]);

  // 📧 Login med e-post
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage("Sjekk e-posten din for magisk lenke ✉️");
  };

  // 📱 Login med telefon (SMS)
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage("Sjekk SMS-en din 📱");
  };

  // 🍎 Login med Apple
  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) setMessage(error.message);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md p-4">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Logg inn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* E-post */}
          <form onSubmit={handleEmailLogin} className="space-y-2">
            <Input
              type="email"
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button className="w-full" disabled={loading} type="submit">
              Logg inn med e-post
            </Button>
          </form>

          {/* Telefon */}
          <form onSubmit={handlePhoneLogin} className="space-y-2">
            <Input
              type="tel"
              placeholder="Telefonnummer (eks: +4791234567)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button className="w-full" disabled={loading} type="submit">
              Logg inn med telefon
            </Button>
          </form>

          {/* Apple */}
          <div className="pt-4">
            <Button onClick={handleAppleLogin} className="w-full" variant="secondary">
              🍎 Logg inn med Apple
            </Button>
          </div>

          {/* Meldinger */}
          {message && (
            <p className="text-center text-sm text-gray-600 pt-4">{message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


