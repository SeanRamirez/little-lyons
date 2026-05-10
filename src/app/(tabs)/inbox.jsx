import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MessageSquare,
  Search,
  ChevronRight,
  ChevronDown,
  Bell,
  Megaphone,
  Send,
  X,
  Users,
  CheckCircle,
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
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
  green: "#10B981",
  greenLight: "#ECFDF5",
};

const MSG_ICON = {
  broadcast: (color) => <Megaphone size={20} color={color} />,
  alert:     (color) => <Bell size={20} color={color} />,
  system:    (color) => <MessageSquare size={20} color={color} />,
};

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const queryClient = useQueryClient();

  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("All");
  const [expanded, setExpanded] = useState(null);

  // Compose modal state
  const [showCompose,      setShowCompose]      = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [selectedParents,  setSelectedParents]  = useState([]);  // [] = all parents
  const [composeSubject,   setComposeSubject]   = useState("");
  const [composeBody,      setComposeBody]      = useState("");
  const [sendToAll,        setSendToAll]        = useState(true);
  const [sent,             setSent]             = useState(false);

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

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["inbox-messages"],
    queryFn: async () => {
      const res = await fetch("/api/inbox");
      if (!res.ok) return { messages: [] };
      return res.json();
    },
    enabled: profileData !== undefined,
  });

  const { data: parentsData } = useQuery({
    queryKey: ["parents-list-inbox"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parents");
      if (!res.ok) return { parents: [] };
      return res.json();
    },
    enabled: isAdmin,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setShowCompose(false);
        setComposeSubject("");
        setComposeBody("");
        setSelectedParents([]);
        setSendToAll(true);
      }, 1800);
    },
  });

  const messages = messagesData?.messages || [];
  const parents  = parentsData?.parents   || [];

  const filtered = messages.filter(m => {
    const matchSearch =
      m.subject?.toLowerCase().includes(search.toLowerCase()) ||
      m.preview?.toLowerCase().includes(search.toLowerCase()) ||
      m.sender?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "All" ||
      (filter === "Unread" && !m.read) ||
      (filter === "Alerts" && m.type === "alert");
    return matchSearch && matchFilter;
  });

  const unreadCount = messages.filter(m => !m.read).length;

  const toggleParent = (id) => {
    setSelectedParents(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const recipientLabel = () => {
    if (sendToAll) return "All Parents";
    if (selectedParents.length === 0) return "Select parents...";
    if (selectedParents.length === 1) {
      const p = parents.find(p => p.id === selectedParents[0]);
      return p?.name || "1 parent";
    }
    return `${selectedParents.length} parents selected`;
  };

  const canSend = composeSubject.trim() && composeBody.trim() && (sendToAll || selectedParents.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20, paddingVertical: 16,
        backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: C.dark }}>Inbox</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Center messages & alerts</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {unreadCount > 0 && (
              <View style={{ backgroundColor: C.blue, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{unreadCount} new</Text>
              </View>
            )}
            {isAdmin && (
              <TouchableOpacity
                onPress={() => setShowCompose(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.dark, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Send size={13} color="#fff" />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>New Message</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          {/* Search */}
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
            paddingHorizontal: 14, gap: 10,
          }}>
            <Search size={18} color={C.light} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search messages..."
              placeholderTextColor={C.light}
              style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: C.dark }}
            />
          </View>

          {/* Filter Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["All", "Unread", "Alerts"].map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: filter === f ? C.dark : C.card,
                    borderWidth: 1, borderColor: filter === f ? C.dark : C.border,
                  }}
                >
                  <Text style={{ color: filter === f ? "#fff" : C.muted, fontWeight: "700", fontSize: 13 }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Messages */}
          {isLoading ? (
            <ActivityIndicator color={C.dark} style={{ paddingVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <MessageSquare size={48} color={C.light} />
              <Text style={{ color: C.muted, marginTop: 12 }}>No messages found</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {filtered.map((msg, i) => {
                const iconFn    = MSG_ICON[msg.type] || MSG_ICON.system;
                const iconColor = !msg.read ? C.blue : C.light;
                const iconBg    = !msg.read ? C.blueBg : C.surface;
                const isOpen    = expanded === msg.id;
                return (
                  <TouchableOpacity
                    key={msg.id}
                    onPress={() => setExpanded(isOpen ? null : msg.id)}
                    style={{
                      borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                      borderBottomColor: C.surface,
                      backgroundColor: !msg.read ? "#FAFEFF" : C.card,
                    }}
                  >
                    {/* Unread accent bar */}
                    {!msg.read && (
                      <View style={{
                        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                        backgroundColor: C.blue, borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
                      }} />
                    )}

                    <View style={{ flexDirection: "row", alignItems: "flex-start", padding: 16 }}>
                      <View style={{
                        width: 44, height: 44, backgroundColor: iconBg, borderRadius: 13,
                        alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0,
                      }}>
                        {iconFn(iconColor)}
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontWeight: !msg.read ? "800" : "600", color: C.dark, fontSize: 14, flex: 1 }}>
                            {msg.sender}
                          </Text>
                          {!msg.read && (
                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.blue }} />
                          )}
                        </View>
                        <Text style={{ fontWeight: !msg.read ? "700" : "600", color: !msg.read ? C.dark : C.mid, fontSize: 14 }}>
                          {msg.subject}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={isOpen ? undefined : 1}>
                          {msg.preview}
                        </Text>
                        {isOpen && msg.body && (
                          <Text style={{ color: C.mid, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
                            {msg.body}
                          </Text>
                        )}
                        <Text style={{ color: C.light, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
                          {msg.time}
                        </Text>
                      </View>
                      {isOpen
                        ? <ChevronDown size={16} color={C.border} style={{ marginTop: 4 }} />
                        : <ChevronRight size={16} color={C.border} style={{ marginTop: 4 }} />
                      }
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={{
            textAlign: "center", color: C.light, fontSize: 10,
            fontWeight: "700", textTransform: "uppercase", letterSpacing: 1,
          }}>
            {isAdmin ? "One-way messaging — parents cannot reply" : "End of messages"}
          </Text>
        </View>
      </ScrollView>

      {/* Compose Modal */}
      <Modal visible={showCompose} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: insets.bottom + 20, maxHeight: "90%",
          }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark }}>Send New Message</Text>
                <TouchableOpacity onPress={() => { setShowCompose(false); setSent(false); }}>
                  <X size={22} color={C.muted} />
                </TouchableOpacity>
              </View>

              {/* Success state */}
              {sent ? (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <CheckCircle size={48} color={C.green} />
                  <Text style={{ fontSize: 18, fontWeight: "800", color: C.dark, marginTop: 12 }}>Message Sent!</Text>
                  <Text style={{ color: C.muted, marginTop: 6 }}>
                    Delivered to {sendToAll ? "all parents" : `${selectedParents.length} parent${selectedParents.length !== 1 ? "s" : ""}`}
                  </Text>
                </View>
              ) : (
                <>
                  {/* To / Recipients */}
                  <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 8 }}>To</Text>

                  {/* Send to all toggle */}
                  <TouchableOpacity
                    onPress={() => { setSendToAll(true); setSelectedParents([]); }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 10,
                      paddingVertical: 12, paddingHorizontal: 14,
                      backgroundColor: sendToAll ? C.dark : C.surface, borderRadius: 12, marginBottom: 8,
                    }}
                  >
                    <Users size={16} color={sendToAll ? "#fff" : C.muted} />
                    <Text style={{ fontWeight: "700", color: sendToAll ? "#fff" : C.mid, fontSize: 14 }}>All Parents</Text>
                    {sendToAll && <CheckCircle size={16} color="#fff" style={{ marginLeft: "auto" }} />}
                  </TouchableOpacity>

                  {/* Select specific parents */}
                  <TouchableOpacity
                    onPress={() => { setSendToAll(false); setShowParentPicker(true); }}
                    style={{
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      paddingVertical: 12, paddingHorizontal: 14,
                      backgroundColor: !sendToAll ? C.blueBg : C.surface,
                      borderRadius: 12, marginBottom: 16,
                      borderWidth: !sendToAll ? 1 : 0, borderColor: C.blue,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: !sendToAll ? C.blue : C.muted, fontSize: 14 }}>
                      {sendToAll ? "Select specific parents..." : recipientLabel()}
                    </Text>
                    <ChevronDown size={16} color={!sendToAll ? C.blue : C.light} />
                  </TouchableOpacity>

                  {/* Parent picker inline (when not sendToAll) */}
                  {!sendToAll && parents.length > 0 && (
                    <View style={{ backgroundColor: C.surface, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                      {parents.map((p, i) => (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => toggleParent(p.id)}
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 12,
                            padding: 14,
                            borderBottomWidth: i < parents.length - 1 ? 1 : 0,
                            borderBottomColor: C.border,
                            backgroundColor: selectedParents.includes(p.id) ? C.blueBg : "transparent",
                          }}
                        >
                          <View style={{
                            width: 32, height: 32, borderRadius: 10,
                            backgroundColor: selectedParents.includes(p.id) ? C.blue : C.border,
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <Text style={{ fontWeight: "800", fontSize: 12, color: selectedParents.includes(p.id) ? "#fff" : C.muted }}>
                              {p.name?.charAt(0) || "?"}
                            </Text>
                          </View>
                          <Text style={{ flex: 1, fontWeight: "600", color: C.dark, fontSize: 14 }}>{p.name}</Text>
                          {selectedParents.includes(p.id) && (
                            <CheckCircle size={18} color={C.blue} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Subject / Headline */}
                  <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 6 }}>
                    Subject / Headline
                  </Text>
                  <TextInput
                    value={composeSubject}
                    onChangeText={setComposeSubject}
                    placeholder="e.g. Spring Newsletter, Reminder: Closed Friday"
                    placeholderTextColor={C.light}
                    style={{
                      backgroundColor: C.surface, borderRadius: 12, padding: 14,
                      fontSize: 15, color: C.dark, marginBottom: 14,
                    }}
                  />

                  {/* Message Body */}
                  <Text style={{ fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", marginBottom: 6 }}>
                    Message
                  </Text>
                  <TextInput
                    value={composeBody}
                    onChangeText={setComposeBody}
                    placeholder="Write your message to parents here..."
                    placeholderTextColor={C.light}
                    multiline
                    numberOfLines={5}
                    style={{
                      backgroundColor: C.surface, borderRadius: 14, padding: 14,
                      fontSize: 15, color: C.dark, minHeight: 120, textAlignVertical: "top",
                      marginBottom: 20,
                    }}
                  />

                  {/* Send Button */}
                  <TouchableOpacity
                    onPress={() => canSend && sendMessageMutation.mutate({
                      subject: composeSubject.trim(),
                      body: composeBody.trim(),
                      recipients: sendToAll ? "all" : selectedParents,
                    })}
                    disabled={!canSend || sendMessageMutation.isPending}
                    style={{
                      backgroundColor: canSend ? C.dark : C.light,
                      borderRadius: 14, paddingVertical: 16,
                      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <Send size={16} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                      {sendMessageMutation.isPending
                        ? "Sending..."
                        : `Send to ${sendToAll ? "All Parents" : `${selectedParents.length} Parent${selectedParents.length !== 1 ? "s" : ""}`}`}
                    </Text>
                  </TouchableOpacity>

                  <Text style={{ textAlign: "center", color: C.light, fontSize: 11, marginTop: 12 }}>
                    Parents cannot reply to messages
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
