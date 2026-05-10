import { useState } from "react";
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
  ArrowLeft,
  CreditCard,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
} from "lucide-react-native";
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
};

export default function AdminPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: alertsData } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/alerts");
      if (!res.ok) return { alerts: [] };
      return res.json();
    },
  });

  const payments = data?.payments || [];
  const alerts = alertsData?.alerts || [];
  const totalCollected = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0,
  );
  const totalLost = alerts.reduce(
    (sum, a) => sum + parseFloat(a.total_fees || 0),
    0,
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: C.card,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8, backgroundColor: C.surface, borderRadius: 12 }}
        >
          <ArrowLeft size={18} color={C.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>
            Payment Records
          </Text>
          <Text style={{ fontSize: 12, color: C.muted }}>
            {payments.length} transactions
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
          gap: 16,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: C.greenLight,
              borderRadius: 18,
              padding: 16,
              gap: 4,
            }}
          >
            <DollarSign size={20} color={C.green} />
            <Text style={{ fontSize: 22, fontWeight: "900", color: C.dark }}>
              ${totalCollected.toFixed(0)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: C.muted,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Collected
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: C.redLight,
              borderRadius: 18,
              padding: 16,
              gap: 4,
            }}
          >
            <TrendingUp size={20} color={C.red} />
            <Text style={{ fontSize: 22, fontWeight: "900", color: C.red }}>
              ${totalLost.toFixed(0)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: C.muted,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Outstanding
            </Text>
          </View>
        </View>

        {/* Outstanding Fees */}
        {alerts.length > 0 && (
          <View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: C.light,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              Outstanding Fees
            </Text>
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: C.border,
                overflow: "hidden",
              }}
            >
              {alerts.map((a, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderBottomWidth: i < alerts.length - 1 ? 1 : 0,
                    borderBottomColor: C.surface,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: C.redLight,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Clock size={18} color={C.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.dark }}>
                      {a.parent_name}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      Unpaid fees
                    </Text>
                  </View>
                  <Text
                    style={{ fontWeight: "900", color: C.red, fontSize: 16 }}
                  >
                    ${parseFloat(a.total_fees).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Transaction History */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            color: C.light,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Transaction History
        </Text>
        {isLoading ? (
          <ActivityIndicator color={C.dark} />
        ) : payments.length === 0 ? (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 20,
              padding: 40,
              alignItems: "center",
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <CreditCard size={40} color={C.light} />
            <Text style={{ color: C.muted, marginTop: 12 }}>
              No payments yet
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.border,
              overflow: "hidden",
            }}
          >
            {payments.map((p, i) => (
              <View
                key={p.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: i < payments.length - 1 ? 1 : 0,
                  borderBottomColor: C.surface,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    backgroundColor: C.greenLight,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <CheckCircle2 size={20} color={C.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: C.dark }}>
                    {p.parent_name || "Parent"}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {p.payment_date
                      ? new Date(p.payment_date).toLocaleDateString()
                      : "Unknown date"}
                    {p.service_week_start
                      ? ` · Week of ${new Date(p.service_week_start).toLocaleDateString()}`
                      : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{ fontWeight: "800", color: C.dark, fontSize: 16 }}
                  >
                    ${parseFloat(p.amount).toFixed(2)}
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        p.status === "paid" ? C.greenLight : "#FEF3C7",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: p.status === "paid" ? C.green : C.gold,
                        fontSize: 10,
                        fontWeight: "700",
                        textTransform: "capitalize",
                      }}
                    >
                      {p.status || "Paid"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
