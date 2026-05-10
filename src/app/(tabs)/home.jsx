import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Baby,
  Star,
  CreditCard,
  ChevronRight,
  Users,
  DollarSign,
  LogOut,
  AlertCircle,
  ChevronLeft,
} from "lucide-react-native";
import useUser from "@/utils/auth/useUser";
import { useAuth } from "@/utils/auth/useAuth";
import { useQuery } from "@tanstack/react-query";

const C = {
  bg: "#FAFAF8",
  card: "#FFFFFF",
  dark: "#1F2937",
  mid: "#374151",
  muted: "#6B7280",
  light: "#9CA3AF",
  border: "#E5E7EB",
  surface: "#F3F4F6",
  red: "#EF4444",
  redLight: "#FEF2F2",
  green: "#10B981",
  greenLight: "#ECFDF5",
  gold: "#F59E0B",
  blue: "#3B82F6",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_SHORT = ["S","M","T","W","T","F","S"];

function MiniCalendar({ events = [] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const today = new Date();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date && e.date.startsWith(dateStr));
  };

  const isToday = (day) =>
    day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <TouchableOpacity onPress={prevMonth} style={{ padding: 6, backgroundColor: C.surface, borderRadius: 8 }}>
          <ChevronLeft size={16} color={C.dark} />
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontWeight: "800", color: C.dark }}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 6, backgroundColor: C.surface, borderRadius: 8 }}>
          <ChevronRight size={16} color={C.dark} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", paddingHorizontal: 8, paddingBottom: 4 }}>
        {DAYS_SHORT.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: C.light }}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, paddingBottom: 12 }}>
        {cells.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isTd = isToday(day);
          return (
            <View key={idx} style={{ width: `${100/7}%`, alignItems: "center", paddingVertical: 3 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 8,
                alignItems: "center", justifyContent: "center",
                backgroundColor: isTd ? C.dark : "transparent",
              }}>
                <Text style={{ fontSize: 12, fontWeight: isTd ? "900" : "500", color: isTd ? "#fff" : day ? C.mid : "transparent" }}>
                  {day || ""}
                </Text>
              </View>
              {dayEvents.length > 0 && (
                <View style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
                  {dayEvents.slice(0, 2).map((e, i) => (
                    <Star key={i} size={8} color={C.gold} fill={C.gold} />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Star size={10} color={C.gold} fill={C.gold} />
        <Text style={{ fontSize: 10, color: C.muted, fontWeight: "600" }}>Closed / Holiday / Early Release</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user, loading: userLoading } = useUser();
  const { signOut, signIn } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const profile = profileData?.user;
  const isAdmin = profile?.role === "admin";

  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/alerts");
      if (!res.ok) return { alerts: [] };
      return res.json();
    },
    enabled: !!isAdmin,
  });

  const { data: childrenData, refetch: refetchChildren } = useQuery({
    queryKey: ["children", isAdmin],
    queryFn: async () => {
      const url = isAdmin ? "/api/children" : "/api/children/parent";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: profile !== undefined,
  });

  const { data: eventsData, refetch: refetchEvents } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const res = await fetch("/api/calendar");
      if (!res.ok) return { events: [] };
      return res.json();
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchAlerts(), refetchChildren(), refetchEvents()]);
    setRefreshing(false);
  }, [refetchProfile, refetchAlerts, refetchChildren, refetchEvents]);

  const alerts = alertsData?.alerts || [];
  const children = childrenData?.children || [];
  const events = eventsData?.events || [];

  const today = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  const upcomingBirthdays = children
    .filter(c => c.dob)
    .map(c => {
      const dob = new Date(c.dob);
      const thisYear = today.getFullYear();
      const nextBday = new Date(thisYear, dob.getMonth(), dob.getDate());
      if (nextBday < today) nextBday.setFullYear(thisYear + 1);
      const daysUntil = Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24));
      return { ...c, nextBday, daysUntil };
    })
    .filter(c => c.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);

  if (userLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.dark} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg, padding: 32, paddingTop: insets.top }}>
        <View style={{ width: 72, height: 72, backgroundColor: C.dark, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
          <Baby size={36} color="#fff" />
        </View>
        <Text style={{ fontSize: 26, fontWeight: "900", color: C.dark, marginTop: 20 }}>Little Lyons</Text>
        <Text style={{ color: C.muted, marginTop: 8, textAlign: "center", fontSize: 15 }}>
          Daycare management made simple
        </Text>
        <TouchableOpacity
          onPress={() => signIn()}
          style={{ marginTop: 32, backgroundColor: C.dark, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 18 }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 38, height: 38, backgroundColor: C.dark, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
            <Baby size={20} color="#fff" />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: C.dark }}>Little Lyons</Text>
            <Text style={{ fontSize: 10, color: C.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isAdmin ? "Admin Portal" : "Parent Portal"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => signOut()} style={{ padding: 8, backgroundColor: C.surface, borderRadius: 12 }}>
          <LogOut size={18} color={C.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isAdmin ? (
          <AdminHomeView
            alerts={alerts}
            children={children}
            events={events}
            upcomingBirthdays={upcomingBirthdays}
            upcomingEvents={upcomingEvents}
            router={router}
          />
        ) : (
          <ParentHomeView
            profile={profile}
            children={children}
            events={events}
            upcomingEvents={upcomingEvents}
            router={router}
          />
        )}
      </ScrollView>
    </View>
  );
}

function ParentHomeView({ profile, children, events, upcomingEvents, router }) {
  const firstName = profile?.name?.split(" ")[0] || "there";

  return (
    <View style={{ padding: 20, gap: 18 }}>
      <View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.dark }}>Welcome back, {firstName}!</Text>
        <Text style={{ color: C.muted, marginTop: 2, fontSize: 13 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Text>
      </View>

      {/* Calendar front-and-center */}
      <MiniCalendar events={events} />

      {/* Upcoming Events / Closures */}
      {upcomingEvents.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel title="Upcoming Closures & Events" />
          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
            {upcomingEvents.map((ev, i) => {
              const d = new Date(ev.date);
              return (
                <View key={ev.id || i} style={{
                  flexDirection: "row", alignItems: "center", padding: 14,
                  borderBottomWidth: i < upcomingEvents.length - 1 ? 1 : 0,
                  borderBottomColor: C.surface,
                }}>
                  <Star size={14} color={C.gold} fill={C.gold} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.dark, fontSize: 14 }}>{ev.title}</Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* My Children */}
      <View style={{ gap: 8 }}>
        <SectionLabel title="My Children" />
        {children.length === 0 ? (
          <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 28, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
            <Baby size={36} color={C.light} />
            <Text style={{ color: C.muted, marginTop: 10 }}>No children enrolled yet</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
            {children.map((child, i) => (
              <TouchableOpacity
                key={child.id}
                onPress={() => router.push(`/child/${child.id}`)}
                style={{
                  flexDirection: "row", alignItems: "center", padding: 16,
                  borderBottomWidth: i < children.length - 1 ? 1 : 0,
                  borderBottomColor: C.surface,
                }}
              >
                <View style={{ width: 44, height: 44, backgroundColor: C.surface, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <Baby size={22} color={C.mid} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontWeight: "700", color: C.dark, fontSize: 15 }}>{child.name}</Text>
                    {child.is_caps && <Star size={12} color={C.gold} fill={C.gold} />}
                  </View>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                    {child.classroom || "Classroom TBD"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={{ fontWeight: "800", color: C.dark, fontSize: 14 }}>${child.weekly_rate}/wk</Text>
                  <ChevronRight size={14} color={C.border} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Make Payment CTA */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/payments")}
        style={{ backgroundColor: C.dark, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}
      >
        <CreditCard size={18} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Make a Payment</Text>
      </TouchableOpacity>
    </View>
  );
}

function AdminHomeView({ alerts, children, events, upcomingBirthdays, upcomingEvents, router }) {
  const capsCount = children.filter(c => c.is_caps).length;

  return (
    <View style={{ padding: 20, gap: 18 }}>
      <View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.dark }}>Admin Dashboard</Text>
        <Text style={{ color: C.muted, marginTop: 2, fontSize: 13 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: "#EFF6FF", borderRadius: 14, padding: 14, gap: 4 }}>
          <Users size={18} color={C.blue} />
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.dark }}>{children.length}</Text>
          <Text style={{ fontSize: 10, color: C.muted, fontWeight: "700", textTransform: "uppercase" }}>Children</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#FFFBEB", borderRadius: 14, padding: 14, gap: 4 }}>
          <Star size={18} color={C.gold} fill={C.gold} />
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.dark }}>{capsCount}</Text>
          <Text style={{ fontSize: 10, color: C.muted, fontWeight: "700", textTransform: "uppercase" }}>CAPS</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: C.redLight, borderRadius: 14, padding: 14, gap: 4 }}>
          <AlertCircle size={18} color={C.red} />
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.red }}>{alerts.length}</Text>
          <Text style={{ fontSize: 10, color: C.muted, fontWeight: "700", textTransform: "uppercase" }}>Late</Text>
        </View>
      </View>

      {/* Late Payments */}
      {alerts.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel title="Late Payments" />
          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: "#FECACA", overflow: "hidden" }}>
            {alerts.slice(0, 4).map((alert, i) => (
              <View key={i} style={{
                flexDirection: "row", alignItems: "center", padding: 14,
                borderBottomWidth: i < Math.min(alerts.length, 4) - 1 ? 1 : 0,
                borderBottomColor: C.surface,
              }}>
                <View style={{ width: 36, height: 36, backgroundColor: C.redLight, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <AlertCircle size={18} color={C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: C.dark, fontSize: 14 }}>{alert.parent_name}</Text>
                  {alert.phone ? <Text style={{ color: C.muted, fontSize: 12 }}>{alert.phone}</Text> : null}
                </View>
                <Text style={{ fontWeight: "800", color: C.red, fontSize: 15 }}>
                  ${parseFloat(alert.total_fees).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Calendar */}
      <View style={{ gap: 8 }}>
        <SectionLabel title="Calendar" />
        <MiniCalendar events={events} />
      </View>

      {/* Upcoming Closures */}
      {upcomingEvents.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel title="Upcoming Closures" />
          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
            {upcomingEvents.map((ev, i) => {
              const d = new Date(ev.date);
              return (
                <View key={ev.id || i} style={{
                  flexDirection: "row", alignItems: "center", padding: 14,
                  borderBottomWidth: i < upcomingEvents.length - 1 ? 1 : 0,
                  borderBottomColor: C.surface,
                }}>
                  <Star size={14} color={C.gold} fill={C.gold} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.dark, fontSize: 14 }}>{ev.title}</Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Upcoming Birthdays */}
      {upcomingBirthdays.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel title="Upcoming Birthdays" />
          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
            {upcomingBirthdays.map((child, i) => (
              <View key={child.id} style={{
                flexDirection: "row", alignItems: "center", padding: 14,
                borderBottomWidth: i < upcomingBirthdays.length - 1 ? 1 : 0,
                borderBottomColor: C.surface,
              }}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>🎂</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: C.dark, fontSize: 14 }}>{child.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {child.nextBday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" · in "}{child.daysUntil} day{child.daysUntil !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={{ gap: 8 }}>
        <SectionLabel title="Quick Actions" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push("/admin/parents")}
            style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: "center", gap: 8 }}
          >
            <Users size={22} color={C.dark} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.dark }}>Parents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/children")}
            style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: "center", gap: 8 }}
          >
            <Baby size={22} color={C.dark} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.dark }}>Children</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/admin/payments")}
            style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: "center", gap: 8 }}
          >
            <DollarSign size={22} color={C.dark} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.dark }}>Payments</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SectionLabel({ title }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>
      {title}
    </Text>
  );
}
