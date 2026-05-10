import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Baby,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ChevronRight,
  ArrowLeft,
  Star,
  Calendar,
} from "lucide-react-native";
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
  red: "#EF4444",
  redLight: "#FEF2F2",
  green: "#10B981",
  greenLight: "#ECFDF5",
  blue: "#3B82F6",
  gold: "#F59E0B",
};

const LATE_FEE = 7.0;

// Generate the next N service weeks starting from the most recent Monday
function generateServiceWeeks(count = 6) {
  const weeks = [];
  const now = new Date();
  // Find the start of the current week (Monday)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  for (let i = -1; i < count - 1; i++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday
    weeks.push({
      label: `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      start: weekStart,
      end: weekEnd,
      key: weekStart.toISOString(),
    });
  }
  return weeks;
}

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const serviceWeeks = generateServiceWeeks(6);

  const { data, isLoading } = useQuery({
    queryKey: ["parent-children"],
    queryFn: async () => {
      const res = await fetch("/api/children/parent");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: historyData } = useQuery({
    queryKey: ["payment-history"],
    queryFn: async () => {
      const res = await fetch("/api/payments/history");
      if (!res.ok) return { payments: [] };
      return res.json();
    },
    enabled: !!user,
  });

  const children = data?.children || [];
  const pastPayments = historyData?.payments || [];

  const toggleChild = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleWeek = (key) => {
    setSelectedWeeks(prev => prev.includes(key) ? prev.filter(w => w !== key) : [...prev, key]);
  };

  const selectedChildren = children.filter(c => selected.includes(c.id));
  const numWeeks = selectedWeeks.length || 1;
  const subtotal = selectedChildren.reduce((sum, c) => sum + parseFloat(c.weekly_rate) * numWeeks, 0);

  // Check if any selected child has a late fee flag
  const hasLateFee = selectedChildren.some(c => c.has_late_fee);
  const lateFeeTotal = hasLateFee ? LATE_FEE * selectedChildren.filter(c => c.has_late_fee).length : 0;
  const total = subtotal + lateFeeTotal;

  const handlePay = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          childIds: selected,
          serviceWeeks: selectedWeeks,
        }),
      });
      setTimeout(() => {
        setProcessing(false);
        setReceiptData({
          amount: total,
          date: new Date(),
          id: `LYON-${Date.now().toString().slice(-6)}`,
        });
        setStep(4);
      }, 1500);
    } catch (e) {
      setProcessing(false);
      Alert.alert("Error", "Payment failed. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.dark} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
      }}>
        {step > 1 && step < 4 ? (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={{ padding: 8, backgroundColor: C.surface, borderRadius: 12 }}>
            <ArrowLeft size={18} color={C.dark} />
          </TouchableOpacity>
        ) : <View style={{ width: 34 }} />}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark, textAlign: "center" }}>Payments</Text>
          {step < 4 && (
            <Text style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 2 }}>
              Step {step} of 3
            </Text>
          )}
        </View>
        <View style={{ width: 34 }} />
      </View>

      {/* Progress bar */}
      {step < 4 && (
        <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.card }}>
          {[1, 2, 3].map(s => (
            <View key={s} style={{ flex: 1, height: 3, borderRadius: 4, backgroundColor: s <= step ? C.dark : C.surface }} />
          ))}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
      >
        {/* ── STEP 1: Select children + service weeks ── */}
        {step === 1 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: "900", color: C.dark }}>Who are you paying for?</Text>
              <Text style={{ color: C.muted, marginTop: 6, fontSize: 15 }}>Select children and service weeks.</Text>
            </View>

            {/* Children selector */}
            {children.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Baby size={48} color={C.light} />
                <Text style={{ color: C.muted, marginTop: 12 }}>No children on your account</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>Select Children</Text>
                {children.map((child) => {
                  const isSelected = selected.includes(child.id);
                  return (
                    <TouchableOpacity
                      key={child.id}
                      onPress={() => toggleChild(child.id)}
                      style={{
                        flexDirection: "row", alignItems: "center", padding: 16,
                        borderRadius: 18, borderWidth: 2,
                        borderColor: isSelected ? C.dark : C.border,
                        backgroundColor: isSelected ? C.dark : C.card,
                      }}
                    >
                      <View style={{ width: 44, height: 44, backgroundColor: isSelected ? "rgba(255,255,255,0.15)" : C.surface, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                        <Baby size={22} color={isSelected ? "#fff" : C.mid} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontWeight: "800", color: isSelected ? "#fff" : C.dark, fontSize: 15 }}>{child.name}</Text>
                          {child.is_caps && <Star size={12} color={C.gold} fill={C.gold} />}
                        </View>
                        <Text style={{ color: isSelected ? "rgba(255,255,255,0.7)" : C.muted, fontSize: 13, marginTop: 2 }}>
                          ${child.weekly_rate}/week
                        </Text>
                      </View>
                      {isSelected && <CheckCircle2 size={22} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Service Week selector */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>Select Service Week(s)</Text>
              <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
                {serviceWeeks.map((week, i) => {
                  const isSelected = selectedWeeks.includes(week.key);
                  return (
                    <TouchableOpacity
                      key={week.key}
                      onPress={() => toggleWeek(week.key)}
                      style={{
                        flexDirection: "row", alignItems: "center", padding: 16,
                        borderBottomWidth: i < serviceWeeks.length - 1 ? 1 : 0,
                        borderBottomColor: C.surface,
                        backgroundColor: isSelected ? "#F0FDF4" : C.card,
                      }}
                    >
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? C.green : C.border, backgroundColor: isSelected ? C.green : "transparent", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                        {isSelected && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>✓</Text>}
                      </View>
                      <Calendar size={16} color={isSelected ? C.green : C.muted} style={{ marginRight: 10 }} />
                      <Text style={{ fontWeight: isSelected ? "700" : "500", color: isSelected ? C.dark : C.mid, fontSize: 14 }}>
                        {week.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              disabled={selected.length === 0 || selectedWeeks.length === 0}
              onPress={() => setStep(2)}
              style={{
                backgroundColor: selected.length === 0 || selectedWeeks.length === 0 ? C.light : C.dark,
                borderRadius: 18, paddingVertical: 18,
                alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Continue to Summary</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Summary ── */}
        {step === 2 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: "900", color: C.dark }}>Service Summary</Text>
              <Text style={{ color: C.muted, marginTop: 6, fontSize: 15 }}>Review before checkout.</Text>
            </View>

            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, gap: 14 }}>
              {/* Per-child breakdown */}
              {selectedChildren.map((child) => (
                <View key={child.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontWeight: "700", color: C.dark, fontSize: 15 }}>{child.name}</Text>
                      {child.is_caps && <Star size={12} color={C.gold} fill={C.gold} />}
                    </View>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      ${child.weekly_rate} × {numWeeks} week{numWeeks > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: "800", color: C.dark, fontSize: 17 }}>
                    ${(parseFloat(child.weekly_rate) * numWeeks).toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={{ height: 1, backgroundColor: C.surface }} />

              {/* Service weeks list */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 6 }}>Service Weeks</Text>
                {selectedWeeks.map((key) => {
                  const week = serviceWeeks.find(w => w.key === key);
                  return week ? (
                    <Text key={key} style={{ color: C.mid, fontSize: 13 }}>• {week.label}</Text>
                  ) : null;
                })}
              </View>

              <View style={{ height: 1, backgroundColor: C.surface }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: C.dark }}>Total</Text>
                <Text style={{ fontSize: 26, fontWeight: "900", color: C.dark }}>${subtotal.toFixed(2)}</Text>
              </View>

              {/* Next payment due */}
              <View style={{ backgroundColor: C.surface, borderRadius: 12, padding: 12 }}>
                <Text style={{ fontSize: 12, color: C.muted }}>
                  Next payment due: <Text style={{ fontWeight: "700", color: C.dark }}>
                    {(() => {
                      const next = new Date();
                      next.setDate(next.getDate() + 7);
                      return next.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    })()}
                  </Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setStep(3)}
              style={{ backgroundColor: C.dark, borderRadius: 18, paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Continue</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: Pay (with late fees if applicable) ── */}
        {step === 3 && (
          <View style={{ gap: 20 }}>
            {hasLateFee && (
              <View style={{ backgroundColor: C.redLight, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#FECACA", flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                <AlertCircle size={24} color={C.red} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#991B1B", fontSize: 15 }}>Attention — Added Fees</Text>
                  <Text style={{ color: "#B91C1C", marginTop: 4, fontSize: 13 }}>
                    You have {selectedChildren.filter(c => c.has_late_fee).length} late payment fee(s) added to this bill.
                  </Text>
                </View>
              </View>
            )}

            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, gap: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>Final Total</Text>

              {selectedChildren.map((child) => (
                <View key={child.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: C.muted, fontSize: 13 }}>{child.name} ×{numWeeks}</Text>
                    <Text style={{ fontWeight: "700", color: C.dark }}>
                      ${(parseFloat(child.weekly_rate) * numWeeks).toFixed(2)}
                    </Text>
                  </View>
                  {child.has_late_fee && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <Text style={{ color: C.red, fontSize: 13 }}>Late fee ×1</Text>
                      <Text style={{ fontWeight: "700", color: C.red }}>+${LATE_FEE.toFixed(2)}</Text>
                    </View>
                  )}
                </View>
              ))}

              <View style={{ height: 1, backgroundColor: C.surface }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>Grand Total</Text>
                <Text style={{ fontSize: 30, fontWeight: "900", color: C.dark }}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handlePay}
              disabled={processing}
              style={{ backgroundColor: C.blue, borderRadius: 20, paddingVertical: 20, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 }}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <CreditCard size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>PAY NOW</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 4: Receipt ── */}
        {step === 4 && receiptData && (
          <View style={{ alignItems: "center", gap: 20, paddingTop: 10 }}>
            <View style={{ width: 80, height: 80, backgroundColor: C.greenLight, borderRadius: 40, alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={40} color={C.green} />
            </View>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 26, fontWeight: "900", color: C.dark }}>Thank You for Your Payment!</Text>
              <Text style={{ color: C.muted, textAlign: "center", fontSize: 14 }}>Your receipt is saved below.</Text>
            </View>

            {/* Current receipt */}
            <View style={{ width: "100%", backgroundColor: C.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "800", color: C.dark, fontSize: 15 }}>Receipt</Text>
                <Text style={{ color: C.light, fontSize: 12 }}>#{receiptData.id}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: C.surface }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: C.muted }}>Date</Text>
                <Text style={{ fontWeight: "700", color: C.dark }}>{receiptData.date.toLocaleDateString()}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: C.muted }}>Amount Paid</Text>
                <Text style={{ fontWeight: "900", color: C.dark, fontSize: 22 }}>${receiptData.amount.toFixed(2)}</Text>
              </View>
              {selectedChildren.map(c => (
                <View key={c.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{c.name}</Text>
                  <Text style={{ fontWeight: "600", color: C.mid, fontSize: 13 }}>${(parseFloat(c.weekly_rate) * numWeeks).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            {/* Past payments */}
            {pastPayments.length > 0 && (
              <View style={{ width: "100%", gap: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: C.light, textTransform: "uppercase", letterSpacing: 1 }}>Past Payments</Text>
                <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
                  {pastPayments.slice(0, 4).map((p, i) => (
                    <View key={p.id || i} style={{
                      flexDirection: "row", alignItems: "center", padding: 14,
                      borderBottomWidth: i < Math.min(pastPayments.length, 4) - 1 ? 1 : 0,
                      borderBottomColor: C.surface,
                    }}>
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

            <TouchableOpacity
              onPress={() => { setStep(1); setSelected([]); setSelectedWeeks([]); setReceiptData(null); }}
              style={{ width: "100%", backgroundColor: C.dark, borderRadius: 18, paddingVertical: 18, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Make Another Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
