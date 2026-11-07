/**
 * GBECHE — Hôte des feedbacks de victoire (XP / niveau).
 * Branché sur le store UI + profil de gamification réel.
 */

import React from 'react';

import { useRepoQuery } from '../../db/useRepoQuery';
import {
  getWarriorProfile,
  levelProgress,
  rankForLevel,
} from '../../services/gamification.service';
import { useAppStore } from '../../store/useAppStore';
import { LevelUpModal, XPModal } from './AchievementToast';

export function FeedbackHost() {
  const xpFeedback = useAppStore((s) => s.xpFeedback);
  const clearXpFeedback = useAppStore((s) => s.clearXpFeedback);

  const { data: profile } = useRepoQuery(() => getWarriorProfile(), []);
  const progress = profile ? levelProgress(profile) : { percent: 0 };

  if (!xpFeedback) return null;

  if (xpFeedback.leveledUp && profile) {
    return (
      <LevelUpModal
        visible
        newLevel={profile.level}
        newRank={rankForLevel(profile.level)}
        onClose={clearXpFeedback}
      />
    );
  }

  return (
    <XPModal
      visible
      xpGained={xpFeedback.xpGained}
      multiplier={xpFeedback.multiplier}
      comboText={xpFeedback.combo >= 2 ? `Combo ×${xpFeedback.combo}` : undefined}
      xpProgress={progress.percent / 100}
      onClose={clearXpFeedback}
    />
  );
}
