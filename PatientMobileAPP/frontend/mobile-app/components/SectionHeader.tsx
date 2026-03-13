import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/Colors";
import { Typography } from "../constants/Typography";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  trailing?: React.ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  onActionPress,
  trailing,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {trailing ? trailing : null}

      {!trailing && actionLabel ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    ...Typography.micro,
    color: Colors.text.muted,
    textTransform: "uppercase",
  },
  title: {
    ...Typography.title,
    color: Colors.text.primary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  action: {
    ...Typography.caption,
    color: Colors.brand[600],
  },
});

export default SectionHeader;
