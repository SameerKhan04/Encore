import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/constants/theme';
import { appMatchInviteService } from '@/services/matchInvites';
import { isOnlineNow } from '@/services/presence';
import { useOnlineStore } from '@/store/onlineStore';
import { useProfileStore } from '@/store/profileStore';

export default function FriendsScreen() {
  const publicId = useProfileStore((s) => s.publicId);
  const friends = useProfileStore((s) => s.friends);
  const incomingRequests = useProfileStore((s) => s.incomingRequests);
  const outgoingRequests = useProfileStore((s) => s.outgoingRequests);
  const incomingInvites = useProfileStore((s) => s.incomingInvites);
  const sendFriendRequest = useProfileStore((s) => s.sendFriendRequest);
  const acceptFriendRequest = useProfileStore((s) => s.acceptFriendRequest);
  const declineFriendRequest = useProfileStore((s) => s.declineFriendRequest);
  const removeFriend = useProfileStore((s) => s.removeFriend);
  const sendMatchInvite = useProfileStore((s) => s.sendMatchInvite);
  const clearInvite = useProfileStore((s) => s.clearInvite);
  const refreshSocial = useProfileStore((s) => s.refreshSocial);

  const createRoom = useOnlineStore((s) => s.createRoom);
  const joinRoom = useOnlineStore((s) => s.joinRoom);

  const [friendId, setFriendId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Subscriptions live in root layout; only refresh when opening Friends.
  useEffect(() => {
    void refreshSocial();
  }, [refreshSocial]);

  const onSendRequest = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    const ok = await sendFriendRequest(friendId);
    setBusy(false);
    if (!ok) {
      setError('Could not send request. Check the Encore ID.');
      return;
    }
    setFriendId('');
    setInfo('Friend request sent.');
  };

  const onInvite = async (toId: string) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await createRoom();
      const online = useOnlineStore.getState();
      if (!online.matchId || !online.inviteCode || !publicId) {
        setError('Could not create a match room.');
        return;
      }
      const ok = await sendMatchInvite({
        toId,
        matchId: online.matchId,
        inviteCode: online.inviteCode,
      });
      if (!ok) {
        setError('Could not send match invite.');
        return;
      }
      setInfo('Invite sent — waiting in Online Match.');
      router.push('/online');
    } finally {
      setBusy(false);
    }
  };

  const onJoinInvite = async (inviteId: string, inviteCode: string) => {
    setBusy(true);
    setError(null);
    try {
      const latest = await appMatchInviteService.getInvite(inviteId);
      if (!latest || !appMatchInviteService.isJoinable(latest)) {
        clearInvite(inviteId);
        setError('That invite expired or was cancelled.');
        await refreshSocial();
        return;
      }
      await joinRoom(inviteCode);
      clearInvite(inviteId);
      router.push('/online');
    } catch {
      setError('Could not join that match.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Friends</Text>

      <View style={styles.block}>
        <Text style={styles.label}>My ID</Text>
        <Text style={styles.id}>{publicId ?? '—'}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (publicId) {
              void Share.share({ message: publicId });
            }
          }}
        >
          <Text style={styles.link}>Share my ID</Text>
        </Pressable>
      </View>

      {incomingInvites.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Match invites</Text>
          {incomingInvites.map((invite) => (
            <View key={invite.id} style={styles.friendRow}>
              <Text style={styles.friendName}>
                {`${invite.fromId} invited you`}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void onJoinInvite(invite.id, invite.inviteCode);
                }}
                disabled={busy}
              >
                <Text style={styles.link}>Join</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {incomingRequests.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Friend requests</Text>
          {incomingRequests.map((request) => (
            <View key={request.id} style={styles.friendRow}>
              <View>
                <Text style={styles.friendName}>
                  {request.fromDisplayName ?? request.fromId}
                </Text>
                <Text style={styles.friendId}>{request.fromId}</Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void acceptFriendRequest(request.id);
                  }}
                >
                  <Text style={styles.link}>Accept</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void declineFriendRequest(request.id);
                  }}
                >
                  <Text style={styles.link}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {outgoingRequests.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Sent — waiting</Text>
          {outgoingRequests.map((request) => (
            <View key={request.id} style={styles.friendRow}>
              <View>
                <Text style={styles.friendName}>
                  {request.toDisplayName ?? request.toId}
                </Text>
                <Text style={styles.friendId}>{request.toId}</Text>
              </View>
              <Text style={styles.caption}>Pending</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>Add by Encore ID</Text>
        <TextInput
          accessibilityLabel="Friend ID"
          autoCapitalize="characters"
          autoCorrect={false}
          value={friendId}
          onChangeText={setFriendId}
          placeholder="ENC-XXXXXXXX"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void onSendRequest();
          }}
          style={styles.primaryButton}
          disabled={busy || !friendId.trim()}
        >
          <Text style={styles.primaryButtonText}>Send request</Text>
        </Pressable>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Your friends</Text>
        {friends.length === 0 ? (
          <Text style={styles.caption}>
            No friends yet — send a request by ID.
          </Text>
        ) : (
          friends.map((friend) => (
            <View key={friend.publicId} style={styles.friendRow}>
              <View>
                <Text style={styles.friendName}>
                  {friend.displayName}
                  {isOnlineNow(friend.lastSeenAt) ? ' · Online' : ''}
                </Text>
                <Text style={styles.friendId}>{friend.publicId}</Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void onInvite(friend.publicId);
                  }}
                  disabled={busy}
                >
                  <Text style={styles.link}>Invite</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void removeFriend(friend.publicId);
                  }}
                >
                  <Text style={styles.link}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.pink,
  },
  block: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  id: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 1,
  },
  link: {
    color: colors.purple,
    fontWeight: '600',
  },
  caption: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    fontSize: typography.body,
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
  },
  info: {
    color: colors.gold,
    fontSize: typography.caption,
  },
  primaryButton: {
    backgroundColor: colors.pink,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  friendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  friendName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.body,
  },
  friendId: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
});
