import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { curriculumData } from '@/data/curriculum';
import { Fonts } from '@/constants/theme';

const LANGUAGES = Object.keys(curriculumData);
const CJK_LANGS = ['Tiếng Trung', 'Tiếng Nhật'];

export default function ExploreScreen() {
  const [selectedLang, setSelectedLang] = useState<string>(LANGUAGES[0]);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  const levels = curriculumData[selectedLang] || [];
  const completedCount = levels.filter(l => l.completed).length;
  const progressPercent = levels.length > 0 ? Math.round((completedCount / levels.length) * 100) : 0;
  const isCJK = CJK_LANGS.includes(selectedLang);

  const handleLessonPress = (level: any) => {
    if (level.locked) {
      alert('🔒 Bài học này đang bị khóa! Hoàn thành bài trước để mở khóa.');
      return;
    }
    setExpandedLesson(expandedLesson === level.id ? null : level.id);
  };

  const openStrokeOrder = (char: string) => {
    router.push({
      pathname: '/stroke-order',
      params: { char, lang: selectedLang },
    });
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lộ trình học</Text>
        <Text style={styles.headerSubtitle}>Chọn ngôn ngữ và bài học</Text>
      </View>

      {/* Language Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll} contentContainerStyle={styles.langScrollContent}>
        {LANGUAGES.map(lang => {
          const langLevels = curriculumData[lang] || [];
          const langDone = langLevels.filter(l => l.completed).length;
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.langCard, selectedLang === lang && styles.langCardActive]}
              onPress={() => { setSelectedLang(lang); setExpandedLesson(null); }}
              activeOpacity={0.7}
            >
              <Ionicons name="flag" size={28} color={selectedLang === lang ? '#e94560' : '#a0aab5'} />
              <Text style={[styles.langName, selectedLang === lang && styles.langNameActive]}>
                {lang.replace('Tiếng ', '')}
              </Text>
              <Text style={styles.langProgress}>{langDone}/{langLevels.length}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>{completedCount}/{levels.length} bài hoàn thành ({progressPercent}%)</Text>
      </View>

      {/* Lesson List */}
      <ScrollView style={styles.lessonList} contentContainerStyle={styles.lessonListContent}>
        {levels.map((level, index) => (
          <View key={level.id}>
            <TouchableOpacity
              style={[
                styles.lessonCard,
                level.completed && styles.lessonCompleted,
                level.current && styles.lessonCurrent,
                level.locked && styles.lessonLocked,
              ]}
              activeOpacity={0.7}
              onPress={() => handleLessonPress(level)}
            >
              <View style={styles.lessonLeft}>
                <View style={[
                  styles.lessonIconWrap,
                  level.completed && styles.lessonIconCompleted,
                  level.current && styles.lessonIconCurrent,
                ]}>
                  <Ionicons
                    name={level.locked ? 'lock-closed' : level.completed ? 'checkmark' : (level.icon as any) || 'book'}
                    size={24}
                    color={level.completed ? '#fff' : level.current ? '#fff' : '#a0aab5'}
                  />
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={[styles.lessonTitle, level.current && styles.lessonTitleCurrent]}>
                    {index + 1}. {level.title}
                  </Text>
                  <Text style={styles.lessonWordCount}>{level.words?.length || 0} từ vựng</Text>
                </View>
              </View>
              <View style={styles.lessonRight}>
                {level.completed ? (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                ) : level.current ? (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>ĐANG HỌC</Text>
                  </View>
                ) : level.locked ? (
                  <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.3)" />
                ) : (
                  <Ionicons
                    name={expandedLesson === level.id ? 'chevron-up' : 'chevron-down'}
                    size={20} color="rgba(255,255,255,0.6)"
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Expanded word list */}
            {expandedLesson === level.id && !level.locked && (
              <View style={styles.wordListContainer}>
                <View style={styles.wordListHeader}>
                  <Ionicons name="book-outline" size={16} color="#e94560" />
                  <Text style={styles.wordListHeaderText}>Từ vựng bài học</Text>
                  {isCJK && (
                    <View style={styles.strokeHint}>
                      <Ionicons name="brush" size={14} color="#ffd700" />
                      <Text style={styles.strokeHintText}>Chạm để xem nét</Text>
                    </View>
                  )}
                </View>
                <View style={styles.wordGrid}>
                  {(level.words || []).map((word: string, wi: number) => (
                    <View key={wi} style={styles.wordItem}>
                      {isCJK ? (
                        // CJK: mỗi ký tự có thể chạm để xem nét
                        <View style={styles.cjkCharRow}>
                          {word.split('').map((char, ci) => (
                            <TouchableOpacity
                              key={ci}
                              style={styles.cjkCharBtn}
                              onPress={() => openStrokeOrder(char)}
                              activeOpacity={0.6}
                            >
                              <Text style={styles.cjkCharText}>{char}</Text>
                              <View style={styles.cjkCharDot} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.wordText}>{word}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  headerSubtitle: { fontSize: 14, color: '#a0aab5', marginTop: 4 },
  langScroll: { maxHeight: 110, marginBottom: 10 },
  langScrollContent: { paddingHorizontal: 15, gap: 12, alignItems: 'center' },
  langCard: {
    width: 80, height: 90, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', padding: 8,
  },
  langCardActive: { backgroundColor: 'rgba(233,69,96,0.15)', borderColor: '#e94560' },
  langName: { color: '#a0aab5', fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  langNameActive: { color: '#fff' },
  langProgress: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 },
  progressSection: { paddingHorizontal: 20, marginBottom: 15 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#e94560', borderRadius: 4 },
  progressText: { color: '#a0aab5', fontSize: 12, textAlign: 'right' },
  lessonList: { flex: 1 },
  lessonListContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  lessonCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  lessonCompleted: { borderColor: 'rgba(76,175,80,0.4)', backgroundColor: 'rgba(76,175,80,0.08)' },
  lessonCurrent: { borderColor: '#e94560', backgroundColor: 'rgba(233,69,96,0.1)' },
  lessonLocked: { opacity: 0.5 },
  lessonLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  lessonIconWrap: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 14,
  },
  lessonIconCompleted: { backgroundColor: '#4CAF50' },
  lessonIconCurrent: { backgroundColor: '#e94560' },
  lessonInfo: { flex: 1 },
  lessonTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 3 },
  lessonTitleCurrent: { color: '#e94560' },
  lessonWordCount: { color: '#a0aab5', fontSize: 13 },
  lessonRight: { marginLeft: 10 },
  currentBadge: {
    backgroundColor: 'rgba(233,69,96,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, borderColor: '#e94560',
  },
  currentBadgeText: { color: '#e94560', fontSize: 11, fontWeight: 'bold' },
  // Word list expanded
  wordListContainer: {
    marginTop: 8, marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  wordListHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  wordListHeaderText: { color: '#e94560', fontSize: 13, fontWeight: '600' },
  strokeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto',
  },
  strokeHintText: { color: '#ffd700', fontSize: 11 },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordItem: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  wordText: { color: '#fff', fontSize: 15 },
  cjkCharRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  cjkCharBtn: {
    width: 42, height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(233,69,96,0.12)',
    borderWidth: 1, borderColor: 'rgba(233,69,96,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  cjkCharText: { color: '#fff', fontSize: 20, fontWeight: '500' },
  cjkCharDot: {
    position: 'absolute', bottom: 3, right: 3,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#ffd700',
  },
});
