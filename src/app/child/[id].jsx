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
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Baby,
  Star,
  AlertTriangle,
  Stethoscope,
  Edit2,
  FileText,
  Plus,
  X,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/auth/useUser";

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
  red: "#EF4444",
  redLight: "#FEF2F2",
  green: "#10B981",
  greenLight: "#ECFDF5",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.surface }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: C.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
        {label}
      </Text>
      <Text style={{ color: C.dark, fontSize: 14, fontWeight: "500" }}>{value}</Text>
    </View>
  );
}

export default function ChildDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState("");

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

  const { data, isLoading, error } = useQuery({
    queryKey: ["child", id],
    queryFn: async () => {
      const res = await fetch(`/api/children/${id}`);
      if (!res.ok) throw new Error("Failed to load child");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: incidentData, refetch: refetchIncidents } = useQuery({
    queryKey: ["incidents", id],
    queryFn: async () => {
      const res = await fetch(`/api/children/${id}/incidents`);
      if (!res.ok) return { incidents: [] };
      return res.json();
    },
    enabled: !!id,
  });

  const addIncidentMutation = useMutation({
    mutationFn: async (description) => {
      const res = await fetch(`/api/children/${id}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, date: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to add incident");
      return res.json();
    },
    onSuccess: () => {
      refetchIncidents();
      setReportText("");
      setShowReportModal(false);
    },
  });

  const child = data?.child;
  const incidents = incidentData?.incidents || [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={C.dark} size="large" />
      </View>
    );
  }

  if (error || !child) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <Baby size={48} color={C.light} />
        <Text style={{ color: C.muted, marginTop: 12, textAlign: "center" }}>Child not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.dark, borderRadius: 14 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dob = child.dob ? new Date(child.dob) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: C.surface, borderRadius: 12 }}>
          <ArrowLeft size={18} color={C.dark} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: C.dark }}>Little Lyons</Text>
        {isAdmin && (
          <TouchableOpacity style={{ padding: 8, backgroundColor: C.surface, borderRadius: 12 }}>
            <Edit2 size={16} color={C.dark} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Hero: Name + CAPS + Weekly Rate */}
        <View style={{
          backgroundColor: C.card, marginHorizontal: 20, marginTop: 20, borderRadius: 20,
          borderWidth: 1, borderColor: C.border, padding: 20,
        }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 44, height: 44, backgroundColor: C.surface, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                  <Baby size={22} color={C.mid} />
                </View>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: C.dark }}>{child.name}</Text>
                    {child.is_caps && <Star size={16} color={C.gold} fill={C.gold} />}
                  </View>
                  {child.is_caps && (
                    <View style={{ backgroundColor: "#FFFBEB", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start", marginTop: 2 }}>
                      <Text style={{ color: "#92400E", fontSize: 10, fontWeight: "700" }}>CAPS</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 24, fontWeight: "900", color: C.dark }}>${child.weekly_rate}</Text>
              <Text style={{ fontSize: 11, color: C.muted, fontWeight: "600" }}>per week</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: C.surface, marginVertical: 14 }} />

          {/* Program type pill */}
          {child.classroom && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ backgroundColor: C.blueBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ color: C.blue, fontWeight: "700", fontSize: 13 }}>{child.classroom}</Text>
              </View>
              {dob && <Text style={{ color: C.muted, fontSize: 13 }}>Age {age}</Text>}
            </View>
          )}
        </View>

        {/* Details Section */}
        <View style={{
          backgroundColor: C.card, marginHorizontal: 20, marginTop: 14, borderRadius: 20,
          borderWidth: 1, borderColor: C.border, padding: 20,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.dark, marginBottom: 4 }}>Child Information</Text>
          <InfoRow label="Date of Birth" value={dob ? dob.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null} />
          <InfoRow label="Address" value={child.address} />
          <InfoRow label="Emergency Contact" value={child.emergency_contact} />
          <InfoRow label="Notes" value={child.notes} />
        </View>

        {/* Medical Info */}
        {(child.allergies || child.medical_notes) && (
          <View style={{
            backgroundColor: C.card, marginHorizontal: 20, marginTop: 14, borderRadius: 20,
            borderWidth: 1, borderColor: "#FECACA", padding: 20,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Stethoscope size={16} color={C.red} />
              <Text style={{ fontSize: 12, fontWeight: "800", color: C.dark }}>Medical Info</Text>
            </View>
            {child.allergies && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 2 }}>Allergies</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={14} color={C.red} />
                  <Text style={{ color: C.red, fontWeight: "600", fontSize: 14 }}>{child.allergies}</Text>
                </View>
              </View>
            )}
            {child.medical_notes && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 2 }}>Medical Notes</Text>
                <Text style={{ color: C.mid, fontSize: 14 }}>{child.medical_notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Incident Reports */}
        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <FileText size={15} color={C.dark} />
              <Text style={{ fontSize: 13, fontWeight: "800", color: C.dark }}>Incident Reports</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => setShowReportModal(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.dark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
              >
                <Plus size={14} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Add Report</Text>
              </TouchableOpacity>
            )}
          </View>

          {incidents.length === 0 ? (
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <FileText size={32} color={C.light} />
              <Text style={{ color: C.muted, marginTop: 8, fontSize: 14 }}>No incident reports</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {incidents.map((incident, i) => {
                const date = incident.date ? new Date(incident.date) : null;
                return (
                  <View key={incident.id || i} style={{
                    padding: 16,
                    borderBottomWidth: i < incidents.length - 1 ? 1 : 0,
                    borderBottomColor: C.surface,
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />
                      <Text style={{ fontWeight: "700", color: C.dark, fontSize: 13 }}>
                        {date ? date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" }) : "Unknown Date"}
                      </Text>
                    </View>
                    <Text style={{ color: C.mid, fontSize: 13, lineHeight: 18, paddingLeft: 16 }}>
                      {incident.description}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Incident Report Modal */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>Add Incident Report</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
              {child.name} · {new Date().toLocaleDateString()}
            </Text>
            <TextInput
              value={reportText}
              onChangeText={setReportText}
              placeholder="Describe the incident..."
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
              onPress={() => reportText.trim() && addIncidentMutation.mutate(reportText.trim())}
              disabled={!reportText.trim() || addIncidentMutation.isPending}
              style={{
                backgroundColor: reportText.trim() ? C.dark : C.light,
                borderRadius: 14, paddingVertical: 16, alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                {addIncidentMutation.isPending ? "Saving..." : "Save Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
