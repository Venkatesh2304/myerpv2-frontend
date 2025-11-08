"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

// (Optional) Type helpers (can move to a types file if desired)
type SessionUser = { user: string; username: string; password: string };
type SessionsByKey = Record<string, SessionUser[]>;

export default function ConfigurationPage() {
  // --- Simple User Session Config (BEGIN) ---
  const [data, setData] = useState<SessionsByKey>({});
  const [keyVal, setKeyVal] = useState("");
  const [userVal, setUserVal] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const keys = Object.keys(data);
  const usersForKey = data[keyVal] || [];

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const res = await api.get("/usersession");
        const json = res.data as SessionsByKey;
        if (!mounted) return;
        setData(json);
        const firstKey = Object.keys(json)[0] || "";
        const firstUser = firstKey && json[firstKey][0]?.user ? json[firstKey][0].user : "";
        setKeyVal(firstKey);
        setUserVal(firstUser);
        if (firstKey && firstUser) {
          const u = json[firstKey].find(x => x.user === firstUser);
          setUsername(u?.username || "");
          setPassword(u?.password || "");
        }
      } catch {
        if (mounted) setMsg("Could not load sessions.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // When key changes, only set first user if current user is missing
    const list = usersForKey;
    if (!list.length) {
      setUserVal("");
      setUsername("");
      setPassword("");
      return;
    }
    if (!userVal || !list.some(x => x.user === userVal)) {
      const u0 = list[0];
      setUserVal(u0.user);
      setUsername(u0.username || "");
      setPassword(u0.password || "");
    }
  }, [keyVal, usersForKey]); // intentionally not depending on userVal

  useEffect(() => {
    // When user changes, fill fields
    if (userVal) {
      const u = usersForKey.find(x => x.user === userVal);
      setUsername(u?.username || "");
      setPassword(u?.password || "");
    } else {
      setUsername("");
      setPassword("");
    }
  }, [userVal, usersForKey]);

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      await api.post("/usersession", { key: keyVal, user: userVal, username, password });
      // Update local data to reflect saved values
      setData(prev => {
        const next = { ...prev };
        const list = next[keyVal] ? [...next[keyVal]] : [];
        const idx = list.findIndex(u => u.user === userVal);
        const updated = { user: userVal, username, password };
        if (idx >= 0) list[idx] = updated;
        else list.push(updated);
        next[keyVal] = list;
        return next;
      });
      setMsg("Saved.");
    } catch {
      setMsg("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = loading || saving || keys.length === 0;
  // --- Simple User Session Config (END) ---

  return (
		<div className="container mx-auto max-w-xl p-4">
    <Card className="max-w-xl mt-6">
        <CardContent className="space-y-4">
          {/* Row 1: Key + User */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <Label>Type</Label>
              <Select value={keyVal} onValueChange={setKeyVal} disabled={disabled || keys.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Select key"} />
                </SelectTrigger>
                <SelectContent>
                  {keys.map(k => (
                    <SelectItem key={k} value={k}>{k.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-2">
              <Label>User</Label>
              <Select value={userVal} onValueChange={setUserVal} disabled={disabled || usersForKey.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Select user"} />
                </SelectTrigger>
                <SelectContent>
                  {usersForKey.map(u => (
                    <SelectItem key={u.user} value={u.user}>{u.user}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Username */}
          <div className="flex flex-col space-y-2">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={disabled || !userVal}
              placeholder="Enter username"
            />
          </div>

          {/* Row 3: Password */}
          <div className="flex flex-col space-y-2">
            <Label>Password</Label>
            <Input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={disabled || !userVal}
              placeholder="Enter password"
            />
          </div>

          {/* Row 4: Save */}
          <div className="flex flex-col space-y-2 pt-2">
            <Button onClick={handleSave} disabled={disabled || !keyVal || !userVal}>
              {saving ? "Saving..." : "Save"}
            </Button>
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

