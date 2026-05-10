import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  X,
  FileText,
  AlertCircle,
} from "lucide-react-native";
import useUser from "@/utils/auth/useUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
  gold: "#F59E0B",
  goldBg: "#FFFBEB",
  green: "#10B981",
  greenLight: "#ECFDF5",
};

const EVENT_COLORS = {
  holiday: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B", label: "Closed – Holiday" },
  closure: { bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444", label: "Center Closed" },
  early:   { bg: "#EFF6FF", text: "#1E40AF", dot: "#3B82F6", label: "Early Release" },
  event:   { bg: "#ECFDF5", text: "#065F46", dot: "#10B981", label: "Event" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const EVENT_TYPES = [
  { value: "holiday", label: "Closed – Holiday" },
  { value: "closure", label: "Center Closed" },
  { value: "early",   label: "Early Release" },
  { value: "event",   label: "General Event" },
];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const [year, setYear]   = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);
  const today = new Date();

  // Modals
  const [showAddEvent,  setShowAddEvent]  = useState(false);
  const [showAddUpdate, setShowAddUpdate] = useState(false);

  // Add Event form
  const [eventTitle, setEventTitle] = useState("");
  const [eventType,  setEventType]  = useState("event");
  const [eventDate,  setEventDate]  = useState("");

  // Add Update form
  const [updateText, setUpdateText] = useState("");

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });
  const isAdmin = profileData?.user?.role === "admin";

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const res = await fetch("/api/calendar");
      if (!res.ok) return { events: [], updates: [] };
      return res.json();
    },
  });

  const { data: updatesData } = useQuery({
    queryKey: ["calendar-updates"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/updates");
      if (!res.ok) return { updates: [] };
      return res.json();
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setEventTitle(""); setEventType("event"); setEventDate("");
      setShowAddEvent(false);
    },
  });

  const addUpdateMutation = useMutation({
    mutationFn: async (text) => {
      const res = await fetch("/api/calendar/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, date: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to add update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-updates"] });
      setUpdateText("");
      setShowAddUpdate(false);
    },
  });

  const events  = eventsData?.events  || [];
  const updates = updatesData?.updates || [];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const firstDay    = new Date(year, month, 1).getDay();
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
    day &&
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  const selectedEvents = selected ? getEventsForDay(selected) : [];

  const upcoming = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20, paddingVertical: 16,
        backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: C.dark }}>Calendar</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Center events & closures</Text>
          </View>
          {isAdmin && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowAddUpdate(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <FileText size={14} color={C.dark} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.dark }}>Add Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAddEvent(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.dark, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Plus size={14} color="#fff" />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Add Event</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Calendar Card */}
        <View style={{
          margin: 20, backgroundColor: C.card, borderRadius: 24,
          borderWidth: 1, borderColor: C.border, overflow: "hidden",
        }}>
          {/* Month Nav */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 }}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: 8, backgroundColor: C.surface, borderRadius: 10 }}>
              <ChevronLeft size={18} color={C.dark} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: "800", color: C.dark }}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 8, backgroundColor: C.surface, borderRadius: 10 }}>
              <ChevronRight size={18} color={C.dark} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={{ flexDirection: "row", paddingHorizontal: 12 }}>
            {DAYS.map(d => (
              <View key={d} style={{ flex: 1, alignItems: "center", paddingBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase" }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingBottom: 8 }}>
            {cells.map((day, idx) => {
              const dayEvents  = getEventsForDay(day);
              const isSelected = selected === day;
              const isTd       = isToday(day);
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => day && setSelected(isSelected ? null : day)}
                  disabled={!day}
                  style={{ width: `${100 / 7}%`, alignItems: "center", paddingVertical: 6 }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: isSelected ? C.dark : isTd ? C.surface : "transparent",
                  }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: isTd || isSelected ? "900" : "500",
                      color: isSelected ? "#fff" : isTd ? C.dark : day ? C.mid : "transparent",
                    }}>
                      {day || ""}
                    </Text>
                  </View>
                  {dayEvents.length > 0 && (
                    <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                      {dayEvents.slice(0, 2).map((e, i) => {
                        const dot = EVENT_COLORS[e.type]?.dot || C.green;
                        return <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dot }} />;
                      })}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{
            borderTopWidth: 1, borderTopColor: C.surface,
            marginHorizontal: 12, paddingVertical: 12, gap: 6,
          }}>
            <Text style={{ fontSize: 10, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Legend
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {Object.entries(EVENT_COLORS).map(([key, val]) => (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: val.dot }} />
                  <Text style={{ fontSize: 11, color: C.muted, fontWeight: "600" }}>{val.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Selected Day Events */}
        {selected && (
          <View style={{ marginHorizontal: 20, marginTop: -8, gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>
              {MONTHS[month]} {selected}
            </Text>
            {selectedEvents.length === 0 ? (
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, alignItems: "center" }}>
                <Text style={{ color: C.muted }}>No events this day</Text>
              </View>
            ) : (
              selectedEvents.map(ev => {
                const col = EVENT_COLORS[ev.type] || EVENT_COLORS.event;
                return (
                  <View key={ev.id} style={{ backgroundColor: col.bg, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col.dot }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: col.text }}>{ev.title}</Text>
                      <Text style={{ fontSize: 11, color: col.text, opacity: 0.7, textTransform: "capitalize" }}>{col.label}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Updates Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 8, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>
              Updates
            </Text>
            <Text style={{ fontSize: 10, color: C.light }}>Shown on parent home page</Text>
          </View>
          {updates.length === 0 ? (
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <AlertCircle size={28} color={C.light} />
              <Text style={{ color: C.muted, marginTop: 8, fontSize: 13 }}>No updates posted yet</Text>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setShowAddUpdate(true)}
                  style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.dark, borderRadius: 10 }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Post an Update</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {updates.map((upd, i) => {
                const d = upd.date ? new Date(upd.date) : null;
                return (
                  <View key={upd.id || i} style={{
                    padding: 16,
                    borderBottomWidth: i < updates.length - 1 ? 1 : 0,
                    borderBottomColor: C.surface,
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <View style={{ width: 28, height: 28, backgroundColor: C.goldBg, borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
                        <FileText size={13} color={C.gold} />
                      </View>
                      <Text style={{ fontSize: 10, color: C.light, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                      </Text>
                    </View>
                    <Text style={{ color: C.dark, fontSize: 14, lineHeight: 20 }}>{upd.text}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Upcoming Events */}
        <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>
            Upcoming Events
          </Text>
          {isLoading ? (
            <ActivityIndicator color={C.dark} />
          ) : upcoming.length === 0 ? (
            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <Calendar size={40} color={C.light} />
              <Text style={{ color: C.muted, marginTop: 12 }}>No upcoming events</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {upcoming.map((ev, i) => {
                const col = EVENT_COLORS[ev.type] || EVENT_COLORS.event;
                const d   = new Date(ev.date);
                return (
                  <View key={ev.id} style={{
                    flexDirection: "row", alignItems: "center", padding: 16,
                    borderBottomWidth: i < upcoming.length - 1 ? 1 : 0,
                    borderBottomColor: C.surface,
                  }}>
                    <View style={{
                      width: 44, height: 44, backgroundColor: col.bg, borderRadius: 13,
                      alignItems: "center", justifyContent: "center", marginRight: 14,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "900", color: col.text }}>
                        {MONTHS[d.getMonth()].slice(0, 3).toUpperCase()}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: col.text }}>
                        {d.getDate()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: C.dark }}>{ev.title}</Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>{col.label}</Text>
                    </View>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col.dot }} />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Date Event Modal */}
      <Modal visible={showAddEvent} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>Add Date Event</Text>
              <TouchableOpacity onPress={() => setShowAddEvent(false)}>
                <X size={22} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 6 }}>Event Title</Text>
            <TextInput
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="e.g. Closed – Memorial Day"
              placeholderTextColor={C.light}
              style={{ backgroundColor: C.surface, borderRadius: 12, padding: 14, fontSize: 15, color: C.dark, marginBottom: 14 }}
            />

            <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 6 }}>Date (YYYY-MM-DD)</Text>
            <TextInput
              value={eventDate}
              onChangeText={setEventDate}
              placeholder={`${year}-${String(month + 1).padStart(2, "0")}-01`}
              placeholderTextColor={C.light}
              style={{ backgroundColor: C.surface, borderRadius: 12, padding: 14, fontSize: 15, color: C.dark, marginBottom: 14 }}
            />

            <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 8 }}>Event Type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {EVENT_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setEventType(t.value)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: eventType === t.value ? C.dark : C.surface,
                  }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 13, color: eventType === t.value ? "#fff" : C.mid }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => eventTitle.trim() && eventDate.trim() && addEventMutation.mutate({ title: eventTitle.trim(), date: eventDate.trim(), type: eventType })}
              disabled={!eventTitle.trim() || !eventDate.trim() || addEventMutation.isPending}
              style={{ backgroundColor: eventTitle.trim() && eventDate.trim() ? C.dark : C.light, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                {addEventMutation.isPending ? "Saving..." : "Save Event"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Update Modal */}
      <Modal visible={showAddUpdate} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>Post an Update</Text>
              <TouchableOpacity onPress={() => setShowAddUpdate(false)}>
                <X size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
              This message will appear on the parent home page.
            </Text>
            <TextInput
              value={updateText}
              onChangeText={setUpdateText}
              placeholder="Write your update here..."
              placeholderTextColor={C.light}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: C.surface, borderRadius: 14, padding: 14,
                fontSize: 15, color: C.dark, minHeight: 100, textAlignVertical: "top",
                marginBottom: 16,
              }}
            />
            <TouchableOpacity
              onPress={() => updateText.trim() && addUpdateMutation.mutate(updateText.trim())}
              disabled={!updateText.trim() || addUpdateMutation.isPending}
              style={{ backgroundColor: updateText.trim() ? C.dark : C.light, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                {addUpdateMutation.isPending ? "Posting..." : "Post Update"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
