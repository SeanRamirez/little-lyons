import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Users,
  Search,
  ChevronRight,
  Phone,
  Mail,
  Baby,
  DollarSign,
  Star,
  X,
  Plus,
} from "lucide-react-native";
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
  green: "#10B981",
  greenLight: "#ECFDF5",
  gold: "#F59E0B",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
};

const FEE_TYPES = ["Late Fee", "Late Pickup", "Damage", "Other"];

export default function AdminParentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeType, setFeeType] = useState("Late Fee");
  const [feeMinutes, setFeeMinutes] = useState("");
  const [feeAmount, setFeeAmount] = useState("2.00");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-parents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parents");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addFeeMutation = useMutation({
    mutationFn: async ({ parentId, type, amount, minutes }) => {
      const res = await fetch(`/api/admin/parents/${parentId}/fees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: parseFloat(amount), minutes: parseInt(minutes) || 0 }),
      });
      if (!res.ok) throw new Error("Failed to add fee");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parents"] });
      setShowFeeModal(false);
      setFeeMinutes("");
    },
  });

  const parents = data?.parents || [];

  const filtered = parents.filter((p) => {
    const matchSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "All" ||
      (filter === "Active" && p.status === "active") ||
      (filter === "Inactive" && p.status !== "active");
    return matchSearch && matchFilter;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const feeTotal = feeType === "Late Pickup"
    ? (parseFloat(feeAmount) || 0) * (parseInt(feeMinutes) || 0)
    : (parseFloat(feeAmount) || 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: C.surface, borderRadius: 12 }}>
          <ArrowLeft size={18} color={C.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>Parent Directory</Text>
          <Text style={{ fontSize: 12, color: C.muted }}>{parents.length} parents registered</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          {/* Search */}
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, gap: 10 }}>
            <Search size={18} color={C.light} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search parents..."
              placeholderTextColor={C.light}
              style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: C.dark }}
            />
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["All", "Active", "Inactive"].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: filter === f ? C.dark : C.card, borderWidth: 1, borderColor: filter === f ? C.dark : C.border }}
                >
                  <Text style={{ color: filter === f ? "#fff" : C.muted, fontWeight: "700", fontSize: 13 }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Parent list */}
          {isLoading ? (
            <ActivityIndicator color={C.dark} style={{ paddingVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Users size={48} color={C.light} />
              <Text style={{ color: C.muted, marginTop: 12 }}>No parents found</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {filtered.map((parent, i) => (
                <TouchableOpacity
                  key={parent.id}
                  onPress={() => setSelectedParent(parent)}
                  style={{
                    padding: 16,
                    borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                    borderBottomColor: C.surface,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 46, height: 46, backgroundColor: C.surface, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 18, fontWeight: "900", color: C.dark }}>
                        {(parent.name || "U")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "800", color: C.dark, fontSize: 15 }}>{parent.name || "Unknown"}</Text>
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                        {parent.enroll_date && (
                          <Text style={{ fontSize: 11, color: C.muted }}>
                            Enrolled {new Date(parent.enroll_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </Text>
                        )}
                        {parent.children_count > 0 && (
                          <View style={{ backgroundColor: C.blueBg, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 }}>
                            <Text style={{ color: C.blue, fontSize: 10, fontWeight: "700" }}>
                              {parent.children_count} child{parent.children_count !== 1 ? "ren" : ""}
                            </Text>
                          </View>
                        )}
                        {parent.status === "active" ? (
                          <View style={{ backgroundColor: C.greenLight, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 }}>
                            <Text style={{ color: C.green, fontSize: 10, fontWeight: "700" }}>Active</Text>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: C.surface, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 }}>
                            <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700" }}>Inactive</Text>
                          </View>
                        )}
                      </View>
                      {(parent.email || parent.phone) && (
                        <View style={{ marginTop: 6, gap: 2 }}>
                          {parent.email && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Mail size={12} color={C.light} />
                              <Text style={{ color: C.muted, fontSize: 12 }}>{parent.email}</Text>
                            </View>
                          )}
                          {parent.phone && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Phone size={12} color={C.light} />
                              <Text style={{ color: C.muted, fontSize: 12 }}>{parent.phone}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    <ChevronRight size={16} color={C.border} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Parent Detail Modal */}
      <Modal visible={!!selectedParent} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%", paddingBottom: insets.bottom + 20 }}>
            {/* Modal Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>
                {selectedParent?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedParent(null)}>
                <X size={22} color={C.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* Parent info */}
              <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, gap: 8 }}>
                {selectedParent?.address && (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 2 }}>Address</Text>
                    <Text style={{ color: C.dark, fontSize: 14 }}>{selectedParent.address}</Text>
                  </View>
                )}
                {selectedParent?.phone && (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 2 }}>Phone</Text>
                    <Text style={{ color: C.dark, fontSize: 14 }}>{selectedParent.phone}</Text>
                  </View>
                )}
                {selectedParent?.email && (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 2 }}>Email</Text>
                    <Text style={{ color: C.dark, fontSize: 14 }}>{selectedParent.email}</Text>
                  </View>
                )}
                {selectedParent?.job && (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 2 }}>Job / Employer</Text>
                    <Text style={{ color: C.dark, fontSize: 14 }}>{selectedParent.job}</Text>
                  </View>
                )}
                {selectedParent?.income && (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 2 }}>Annual Income</Text>
                    <Text style={{ color: C.dark, fontSize: 14 }}>{selectedParent.income}</Text>
                  </View>
                )}
              </View>

              {/* Payment history */}
              {selectedParent?.payment_history?.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>Payment History</Text>
                  <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
                    {selectedParent.payment_history.slice(0, 4).map((p, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: i < Math.min(selectedParent.payment_history.length, 4) - 1 ? 1 : 0, borderBottomColor: C.surface }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.muted, fontSize: 12 }}>
                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: "700", color: C.dark }}>${parseFloat(p.amount).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Add Fee button */}
              <TouchableOpacity
                onPress={() => setShowFeeModal(true)}
                style={{ backgroundColor: C.dark, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Plus size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Add Fee to Next Bill</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Fee Modal */}
      <Modal visible={showFeeModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>Add Fee</Text>
              <TouchableOpacity onPress={() => setShowFeeModal(false)}>
                <X size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
              Add a fee to {selectedParent?.name}'s next bill.
            </Text>

            {/* Fee type selector */}
            <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 8 }}>Fee Type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {FEE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setFeeType(t)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: feeType === t ? C.dark : C.surface, borderWidth: 1, borderColor: feeType === t ? C.dark : C.border }}
                >
                  <Text style={{ color: feeType === t ? "#fff" : C.dark, fontWeight: "700", fontSize: 13 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Late Pickup: rate × minutes */}
            {feeType === "Late Pickup" ? (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 6 }}>Rate ($/min)</Text>
                  <TextInput
                    value={feeAmount}
                    onChangeText={setFeeAmount}
                    keyboardType="decimal-pad"
                    style={{ backgroundColor: C.surface, borderRadius: 12, padding: 12, fontSize: 16, color: C.dark }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 6 }}>Minutes Late</Text>
                  <TextInput
                    value={feeMinutes}
                    onChangeText={setFeeMinutes}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={C.light}
                    style={{ backgroundColor: C.surface, borderRadius: 12, padding: 12, fontSize: 16, color: C.dark }}
                  />
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 6 }}>Amount ($)</Text>
                <TextInput
                  value={feeAmount}
                  onChangeText={setFeeAmount}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: C.surface, borderRadius: 12, padding: 12, fontSize: 18, color: C.dark, fontWeight: "700" }}
                />
              </View>
            )}

            {feeTotal > 0 && (
              <View style={{ backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: C.muted }}>Total fee to add</Text>
                <Text style={{ fontWeight: "900", color: C.dark, fontSize: 18 }}>${feeTotal.toFixed(2)}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => addFeeMutation.mutate({ parentId: selectedParent?.id, type: feeType, amount: feeTotal, minutes: feeMinutes })}
              disabled={feeTotal <= 0 || addFeeMutation.isPending}
              style={{ backgroundColor: feeTotal > 0 ? C.dark : C.light, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                {addFeeMutation.isPending ? "Adding..." : `Add $${feeTotal.toFixed(2)} to ${selectedParent?.name?.split(" ")[0]}'s Bill`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
