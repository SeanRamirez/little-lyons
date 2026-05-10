import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Baby, Search, Star, ChevronRight, ChevronDown } from "lucide-react-native";
import useUser from "@/utils/auth/useUser";
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
  gold: "#F59E0B",
  green: "#10B981",
  greenLight: "#ECFDF5",
  red: "#EF4444",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
};

const SORT_OPTIONS = [
  { label: "All Classes", value: "All" },
  { label: "Infant", value: "Infant" },
  { label: "2-Year Class", value: "2-Year" },
  { label: "3-Year Class", value: "3-Year" },
  { label: "After School", value: "After School" },
  { label: "Alphabetically (A–Z)", value: "alpha" },
  { label: "By Age (Youngest)", value: "age-asc" },
  { label: "By Age (Oldest)", value: "age-desc" },
];

export default function ChildrenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("All");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["children-list", isAdmin],
    queryFn: async () => {
      const url = isAdmin ? "/api/children" : "/api/children/parent";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: profileData !== undefined,
  });

  const children = data?.children || [];

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortValue)?.label || "All Classes";

  // Filter and sort
  let filtered = children.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const classroomFilters = ["Infant", "2-Year", "3-Year", "After School"];
  if (classroomFilters.includes(sortValue)) {
    filtered = filtered.filter(c => c.classroom === sortValue);
  } else if (sortValue === "alpha") {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortValue === "age-asc") {
    filtered = [...filtered].sort((a, b) => {
      const da = a.dob ? new Date(a.dob).getTime() : 0;
      const db = b.dob ? new Date(b.dob).getTime() : 0;
      return db - da; // youngest = most recent DOB
    });
  } else if (sortValue === "age-desc") {
    filtered = [...filtered].sort((a, b) => {
      const da = a.dob ? new Date(a.dob).getTime() : 0;
      const db = b.dob ? new Date(b.dob).getTime() : 0;
      return da - db; // oldest = earliest DOB
    });
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const capsCount = children.filter(c => c.is_caps).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: C.dark }}>Children</Text>
        <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
          {children.length} enrolled{isAdmin && capsCount > 0 ? ` · ${capsCount} CAPS` : ""}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          {/* Search */}
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, gap: 10 }}>
            <Search size={18} color={C.light} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name..."
              placeholderTextColor={C.light}
              style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: C.dark }}
            />
          </View>

          {/* Sort/Filter Dropdown */}
          <View>
            <TouchableOpacity
              onPress={() => setShowSortDropdown(!showSortDropdown)}
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
                paddingHorizontal: 16, paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.dark }}>{sortLabel}</Text>
              <ChevronDown size={18} color={C.muted} />
            </TouchableOpacity>

            {showSortDropdown && (
              <View style={{
                backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
                overflow: "hidden", marginTop: 6, zIndex: 100,
              }}>
                {SORT_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => { setSortValue(opt.value); setShowSortDropdown(false); }}
                    style={{
                      paddingHorizontal: 18, paddingVertical: 14,
                      borderBottomWidth: i < SORT_OPTIONS.length - 1 ? 1 : 0,
                      borderBottomColor: C.surface,
                      backgroundColor: sortValue === opt.value ? C.surface : C.card,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: sortValue === opt.value ? "700" : "500", color: sortValue === opt.value ? C.dark : C.mid }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Stats (admin only) */}
          {isAdmin && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ backgroundColor: C.greenLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                <Text style={{ color: C.green, fontWeight: "700", fontSize: 13 }}>
                  {children.filter(c => c.status === "active").length} Active
                </Text>
              </View>
              <View style={{ backgroundColor: "#FFFBEB", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                <Text style={{ color: C.gold, fontWeight: "700", fontSize: 13 }}>
                  ★ {capsCount} CAPS
                </Text>
              </View>
              <View style={{ backgroundColor: C.blueBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                <Text style={{ color: C.blue, fontWeight: "700", fontSize: 13 }}>
                  {filtered.length} shown
                </Text>
              </View>
            </View>
          )}

          {/* List */}
          {isLoading ? (
            <ActivityIndicator color={C.dark} style={{ paddingVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Baby size={48} color={C.light} />
              <Text style={{ color: C.muted, marginTop: 12, fontSize: 15 }}>No children found</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {filtered.map((child, i) => {
                const dob = child.dob ? new Date(child.dob) : null;
                const age = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;
                return (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => router.push(`/child/${child.id}`)}
                    style={{
                      flexDirection: "row", alignItems: "center", padding: 16,
                      borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                      borderBottomColor: C.surface,
                    }}
                  >
                    <View style={{ width: 50, height: 50, backgroundColor: C.surface, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                      <Baby size={24} color={C.mid} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontWeight: "800", color: C.dark, fontSize: 16 }}>{child.name}</Text>
                        {child.is_caps && <Star size={13} color={C.gold} fill={C.gold} />}
                      </View>
                      <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
                        {child.classroom || "Unassigned"}
                        {dob && ` · DOB: ${dob.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}`}
                      </Text>
                      {child.allergies ? (
                        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: "#92400E", fontSize: 10, fontWeight: "700" }}>⚠ {child.allergies}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={{ fontWeight: "800", color: C.dark, fontSize: 14 }}>${child.weekly_rate}/wk</Text>
                      <ChevronRight size={16} color={C.border} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
