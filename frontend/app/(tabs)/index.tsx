import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, Easing, ActivityIndicator, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { curriculumData } from '../../data/curriculum';
import { API_BASE_URL, API_TIMEOUT } from '../../constants/config';

const AVAILABLE_LANGUAGES = Object.keys(curriculumData);
const BASE_LANGUAGES = ['Tiếng Việt', 'Tiếng Anh', 'Tiếng Trung', 'Tiếng Tây Ban Nha'];

type Message = { id: string; text: string; sender: 'user' | 'ai'; languageMismatch?: boolean };
type ChatMode = 'tutor' | 'conversation';
type ChatSession = { id: string; title: string; updatedAt: number; messages: Message[]; mode: ChatMode };

export default function VoiceChatScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  // State quản lý phiên chat
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'tutor' | 'conversation' | 'learning'>('tutor');
  const [language, setLanguage] = useState('Tiếng Anh');
  const [baseLanguage, setBaseLanguage] = useState('Tiếng Việt');
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [lessonStep, setLessonStep] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState<number>(-1);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [quizCache, setQuizCache] = useState<Record<string, { options: string[]; correctIndex: number }>>({});
  const [textInput, setTextInput] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Lấy messages của session hiện tại
  const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];
  // Chỉ hiện session thuộc mode tutor/conversation (không phải learning)
  const chatSessions = sessions.filter(s => s.mode === 'tutor' || s.mode === 'conversation');
  const currentModeSessions = chatSessions.filter(s => s.mode === mode);
  const otherModeSessions = chatSessions.filter(s => s.mode !== mode);

  // 1. Tải toàn bộ lịch sử khi mở app
  useEffect(() => {
    const loadAllHistory = async () => {
      try {
        const savedData = await AsyncStorage.getItem('polyglot_sessions');
        if (savedData !== null) {
          const parsedSessions: ChatSession[] = JSON.parse(savedData);
          setSessions(parsedSessions);
          // Tìm session gần nhất của mode hiện tại
          const lastModeSession = parsedSessions.filter(s => s.mode === mode).sort((a, b) => b.updatedAt - a.updatedAt)[0];
          if (lastModeSession) {
            setCurrentSessionId(lastModeSession.id);
          } else {
            createNewSession(mode === 'learning' ? 'tutor' : mode);
          }
        } else {
          // Migration: dữ liệu cũ không có mode → gán mode mặc định
          const oldMessages = await AsyncStorage.getItem('polyglot_chat_history');
          if (oldMessages) {
            const parsedOldMsgs = JSON.parse(oldMessages);
            const migratedSession: ChatSession = {
                id: Date.now().toString(),
                title: `Chat cũ (${new Date().toLocaleDateString()})`,
                updatedAt: Date.now(),
                messages: parsedOldMsgs,
                mode: 'tutor',
            };
            setSessions([migratedSession]);
            setCurrentSessionId(migratedSession.id);
            AsyncStorage.removeItem('polyglot_chat_history');
          } else {
            createNewSession(mode === 'learning' ? 'tutor' : mode);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải lịch sử:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadAllHistory();
  }, []);

  // Khi đổi mode (tutor/conversation) → chuyển session phù hợp
  useEffect(() => {
    if (!isLoaded || mode === 'learning') return;
    const chatMode = mode as ChatMode;
    const modeSessions = sessions.filter(s => s.mode === chatMode).sort((a, b) => b.updatedAt - a.updatedAt);
    if (modeSessions.length > 0 && modeSessions[0].id !== currentSessionId) {
      setCurrentSessionId(modeSessions[0].id);
    } else if (modeSessions.length === 0) {
      createNewSession(chatMode);
    }
  }, [mode]);

  // 2. Lưu lại mỗi khi sessions thay đổi
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('polyglot_sessions', JSON.stringify(sessions))
        .catch(err => console.error('Lỗi khi lưu sessions:', err));
    }
  }, [sessions, isLoaded]);

  // Hiệu ứng Pulse
  useEffect(() => {
    if (recording) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseAnim.setValue(1);
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
    }
  }, [recording]);

  const createNewSession = (chatMode?: 'tutor' | 'conversation') => {
    const m = chatMode || (mode === 'learning' ? 'tutor' : mode as ChatMode);
    const modeLabel = m === 'tutor' ? 'Giáo viên' : 'Trò chuyện';
    const greeting = m === 'tutor' 
      ? 'Chào bạn! Tôi là giáo viên AI. Hãy nói hoặc nhập câu hỏi để tôi giúp bạn học nhé.'
      : 'Hello! I am your AI conversation partner. Feel free to talk or type!';
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `${modeLabel} (${new Date().toLocaleTimeString()})`,
      updatedAt: Date.now(),
      messages: [{ id: '1', text: greeting, sender: 'ai' }],
      mode: m,
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setShowHistoryModal(false);
  };

  const updateCurrentSessionMessages = (updater: (prevMsgs: Message[]) => Message[]) => {
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return { ...session, messages: updater(session.messages), updatedAt: Date.now() };
      }
      return session;
    }).sort((a, b) => b.updatedAt - a.updatedAt)); // Sắp xếp theo tg cập nhật mới nhất
  };

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    if (uri) sendAudioToBackend(uri);
  }

  const sendAudioToBackend = async (uri: string) => {
    setIsProcessing(true);
    const tempId = Date.now().toString();
    updateCurrentSessionMessages(prev => [...prev, { id: tempId, text: '(Audio sent...)', sender: 'user' }]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const formData = new FormData();
      formData.append('audio', { uri, name: 'audio.m4a', type: 'audio/m4a' } as any);
      formData.append('mode', mode);
      formData.append('language', language);
      formData.append('baseLanguage', baseLanguage);

      const response = await fetch(`${API_BASE_URL}/api/v1/ai/voice-chat`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 429) {
          throw new Error('QUOTA_EXHAUSTED::' + (errorData.error || 'Hết quota Gemini'));
        }
        throw new Error(errorData.error || `Server error (${status})`);
      }

      const data = await response.json();
      
      if (data.aiText) {
        updateCurrentSessionMessages(prev => [
            ...prev.filter(m => m.id !== tempId),
            { id: tempId, text: data.userText || '(Voice Message)', sender: 'user' },
            { id: Date.now().toString() + 'ai', text: data.aiText, sender: 'ai', languageMismatch: data.languageMismatch || false }
        ]);
      } else {
        updateCurrentSessionMessages(prev => [
             ...prev.filter(m => m.id !== tempId),
             { id: Date.now().toString(), text: '⚠️ Không nhận được phản hồi từ AI.', sender: 'ai' }
        ]);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Error sending audio:', error);
      let errorMsg = '⚠️ Lỗi kết nối đến máy chủ.';
      if (error.name === 'AbortError') {
        errorMsg = '⏱️ Yêu cầu quá thời gian. Vui lòng thử lại.';
      } else if (error.message?.startsWith('QUOTA_EXHAUSTED')) {
        errorMsg = '🪫 Hết quota Gemini hôm nay. Dùng chat văn bản bên dưới nhé! (DeepSeek vẫn hoạt động)';
      } else if (error.message?.includes('Network')) {
        errorMsg = '📡 Không thể kết nối đến máy chủ. Kiểm tra mạng và địa chỉ backend.';
      } else if (error.message?.includes('Server error')) {
        errorMsg = `⚠️ ${error.message}`;
      }
      updateCurrentSessionMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: Date.now().toString(), text: errorMsg, sender: 'ai' }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendTextToBackend = async (text: string) => {
    if (!text.trim()) return;
    setTextInput('');
    setIsProcessing(true);
    const tempId = Date.now().toString();
    updateCurrentSessionMessages(prev => [...prev, { id: tempId, text: text.trim(), sender: 'user' }]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), mode, language, baseLanguage }),
      });
      const data = await res.json();
      if (data.aiText) {
        updateCurrentSessionMessages(prev => [
          ...prev,
          { id: Date.now().toString() + 'ai', text: data.aiText, sender: 'ai' }
        ]);
      } else {
        updateCurrentSessionMessages(prev => [
          ...prev,
          { id: Date.now().toString(), text: '⚠️ ' + (data.error || 'Không có phản hồi'), sender: 'ai' }
        ]);
      }
    } catch (err) {
      updateCurrentSessionMessages(prev => [
        ...prev,
        { id: Date.now().toString(), text: '⚠️ Lỗi kết nối text chat.', sender: 'ai' }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderLearningPath = () => {
    const levels = curriculumData[language] || curriculumData['Tiếng Anh'];

    const max_y = Math.max(...levels.map(l => l.coords_y));
    const rows = [];
    for (let i = 1; i <= max_y; i++) {
        rows.push(levels.filter(l => l.coords_y === i));
    }

    return (
      <ScrollView style={styles.learningContainer} contentContainerStyle={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={styles.learningHeader}>Lộ trình {language}</Text>
        
        {rows.map((rowLevels, rowIndex) => (
            <View key={`row-${rowIndex}`} style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 30, width: '100%' }}>
                {rowLevels.map((level) => {
                    // Dịch vị trí dựa trên coords_x (Duolingo: 1 trái, 2 giữa, 3 phải)
                    const isOffsetLeft = level.coords_x === 1;
                    const isOffsetRight = level.coords_x === 3;
                    
                    return (
                        <View key={level.id} style={{ alignItems: 'center', marginHorizontal: 15, marginLeft: isOffsetRight ? 80 : 0, marginRight: isOffsetLeft ? 80 : 0 }}>
                          <TouchableOpacity 
                            style={[
                              styles.levelCircle, 
                              level.completed && styles.levelCompleted,
                              level.current && styles.levelCurrent,
                              level.locked && styles.levelLocked
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                                if (level.locked) {
                                    alert('Bài học này đang bị khóa!');
                                } else {
                                    setActiveLesson(level);
                                    setLessonStep(0);
                                    setQuizOptions([]);
                                    setQuizCorrectIndex(-1);
                                    setSelectedOption(null);
                                    setScore({ correct: 0, total: 0 });
                                    setQuizCache({});
                                }
                            }}
                          >
                            <Ionicons 
                              name={level.locked ? "lock-closed" : (level.completed ? "checkmark" : level.icon as any)} 
                              size={32} 
                              color={level.completed ? "#fff" : (level.current ? "#fff" : "rgba(255,255,255,0.4)")} 
                            />
                          </TouchableOpacity>
                          <Text style={[styles.levelTitle, level.current && { color: '#e94560', fontWeight: 'bold' }]}>
                            {level.short}
                          </Text>
                        </View>
                    );
                })}
            </View>
        ))}
      </ScrollView>
    );
  };

  const fetchAllQuizzes = async (words: string[]) => {
    setQuizLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words, language, baseLanguage }),
      });
      if (!res.ok) throw new Error('Batch quiz API error');
      const data = await res.json();
      setQuizCache(data.quizMap || {});
    } catch (err) {
      console.error('Batch quiz fetch error:', err);
      const fallback: Record<string, { options: string[]; correctIndex: number }> = {};
      for (const word of words) {
        fallback[word] = generateFallbackOptions(word, words);
      }
      setQuizCache(fallback);
    } finally {
      setQuizLoading(false);
    }
  };

  // Fallback offline: tự sinh đáp án từ danh sách
  const generateFallbackOptions = (word: string, allWords: string[]) => {
    const others = allWords.filter(w => w !== word);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    const wrongOptions = shuffled.slice(0, 3).map(w => `[?] ${w}`);
    const options = [word, ...wrongOptions];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { options, correctIndex: options.indexOf(word) };
  };

  const handleOptionPress = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    setScore(prev => ({
      correct: prev.correct + (index === quizCorrectIndex ? 1 : 0),
      total: prev.total + 1,
    }));
    setTimeout(() => {
      setLessonStep(prev => prev + 1);
    }, 1200);
  };

  // Khi activeLesson hoặc language thay đổi → fetch batch quiz
  useEffect(() => {
    if (activeLesson) {
      const words: string[] = activeLesson.words || [];
      if (words.length > 0) {
        setQuizCache({});
        fetchAllQuizzes(words);
      }
    }
  }, [activeLesson, language]);

  // Khi lessonStep thay đổi → lấy quiz từ cache
  useEffect(() => {
    if (activeLesson && lessonStep < (activeLesson.words || []).length) {
      const word = activeLesson.words[lessonStep];
      const cached = quizCache[word];
      if (cached) {
        setQuizOptions(cached.options);
        setQuizCorrectIndex(cached.correctIndex);
        setSelectedOption(null);
      }
    }
  }, [lessonStep, quizCache, activeLesson]);

  const renderLessonPractice = () => {
    if (!activeLesson) return null;
    const words: string[] = activeLesson.words || [];
    const totalSteps = words.length;
    
    if (lessonStep >= totalSteps) {
      return (
        <Modal visible={true} animationType="slide">
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#16213e' }]}>
             <Ionicons name="trophy" size={100} color="#FFD700" />
             <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20 }}>Hoàn thành bài học!</Text>
             <Text style={{ fontSize: 16, color: '#a0aab5', marginTop: 10 }}>
               Đúng {score.correct}/{score.total} từ
             </Text>
             <TouchableOpacity 
               style={{ backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 20, marginTop: 30, shadowColor: '#4CAF50', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 }} 
               onPress={() => { setActiveLesson(null); setLessonStep(0); setScore({correct: 0, total: 0}); }}
             >
               <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>TIẾP TỤC</Text>
             </TouchableOpacity>
          </View>
        </Modal>
      );
    }

    const currentWord = words[lessonStep];
    const progressPercent = ((lessonStep) / totalSteps) * 100;

    return (
      <Modal visible={true} animationType="slide">
        <View style={[styles.container, { backgroundColor: '#16213e', paddingTop: 50 }]}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => { setActiveLesson(null); setLessonStep(0); setScore({correct: 0, total: 0}); }}>
              <Ionicons name="close" size={36} color="#a0aab5" />
            </TouchableOpacity>
            <View style={{ flex: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, marginLeft: 15, overflow: 'hidden' }}>
              <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#4CAF50', borderRadius: 10 }} />
            </View>
            <Text style={{ color: '#a0aab5', marginLeft: 10, fontSize: 13 }}>
              {lessonStep + 1}/{totalSteps}
            </Text>
          </View>

          {/* Score */}
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#4CAF50', fontSize: 14, fontWeight: '600' }}>
              ✅ {score.correct} / {score.total}
            </Text>
          </View>

          {/* Content */}
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 16, color: '#a0aab5', marginBottom: 10, textAlign: 'center' }}>
              Dịch từ sau sang {baseLanguage}
            </Text>
            
            <View style={{ alignItems: 'center', marginBottom: 40, paddingVertical: 25, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
               <Text style={{ fontSize: 40, fontWeight: 'bold', color: '#e94560' }}>{currentWord}</Text>
               {language !== 'Tiếng Anh' && currentWord.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uac00-\ud7af]/) && (
                 <Text style={{ color: '#a0aab5', fontSize: 13, marginTop: 6 }}>({language})</Text>
               )}
            </View>

            {/* Options */}
            {quizLoading ? (
              <ActivityIndicator size="large" color="#e94560" style={{ marginTop: 30 }} />
            ) : (
              quizOptions.map((opt, index) => {
                const isSelected = selectedOption === index;
                const isCorrect = index === quizCorrectIndex;
                let borderColor = 'rgba(255,255,255,0.2)';
                let bgColor = 'rgba(0,0,0,0.2)';
                if (selectedOption !== null) {
                  if (isCorrect) { borderColor = '#4CAF50'; bgColor = 'rgba(76,175,80,0.2)'; }
                  else if (isSelected) { borderColor = '#e94560'; bgColor = 'rgba(233,69,96,0.2)'; }
                }

                return (
                  <TouchableOpacity 
                    key={index}
                    style={{ borderWidth: 2, borderColor, padding: 20, borderRadius: 15, marginBottom: 12, backgroundColor: bgColor }}
                    onPress={() => handleOptionPress(index)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '500', flex: 1 }}>
                        {opt}
                      </Text>
                      {selectedOption !== null && isCorrect && (
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      )}
                      {selectedOption !== null && isSelected && !isCorrect && (
                        <Ionicons name="close-circle" size={24} color="#e94560" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => setShowHistoryModal(true)} style={styles.historyButton}>
            <Ionicons name="menu-outline" size={32} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.headerTitle}>PolyglotAI</Text>
            <Text style={styles.headerSubtitle}>Your AI Language Tutor</Text>
          </View>
        </View>
      </View>

      {mode === 'learning' ? (
        renderLearningPath()
      ) : (
        <>
          <ScrollView style={styles.chatContainer} contentContainerStyle={{ paddingBottom: 20 }}>
            {currentMessages.map((msg) => (
              <View key={msg.id} style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
                msg.languageMismatch && styles.mismatchBubble,
              ]}>
                {msg.languageMismatch && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="warning" size={18} color="#FFD700" />
                    <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 13, marginLeft: 6 }}>Cảnh báo ngôn ngữ</Text>
                  </View>
                )}
                <Text style={[styles.messageText, msg.languageMismatch && { color: '#FFE0B2' }]}>{msg.text}</Text>
              </View>
            ))}
            {isProcessing && (
              <View style={[styles.messageBubble, styles.aiBubble, { width: 60, alignItems: 'center' }]}>
                 <ActivityIndicator color="#fff" size="small" />
              </View>
            )}
          </ScrollView>

          {/* Bottom Bar: Text Input + Mic */}
          <View style={styles.bottomBar}>
            <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording} activeOpacity={0.8}>
              <Animated.View style={[styles.micButtonSmall, { transform: [{ scale: pulseAnim }] }, recording && styles.micButtonRecording]}>
                <Ionicons name={recording ? "mic" : "mic-outline"} size={22} color="#fff" />
              </Animated.View>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder={recording ? "Đang thu âm..." : "Nhập tin nhắn... (DeepSeek)"}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={() => sendTextToBackend(textInput)}
              returnKeyType="send"
              editable={!isProcessing && !recording}
            />
            <TouchableOpacity
              style={[styles.sendButton, !textInput.trim() && { opacity: 0.4 }]}
              onPress={() => sendTextToBackend(textInput)}
              disabled={!textInput.trim() || isProcessing}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Sidebar Modal */}
      <Modal visible={showHistoryModal} animationType="fade" transparent={true} onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowHistoryModal(false)} />
          <View style={styles.sidebarContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Chế độ</Text>
            <View style={styles.modeSelector}>
              <TouchableOpacity style={[styles.modeButton, mode === 'tutor' && styles.modeButtonActive]} onPress={() => setMode('tutor')} activeOpacity={0.8}>
                <Text style={[styles.modeText, mode === 'tutor' && styles.modeTextActive]}>Giáo viên</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeButton, mode === 'conversation' && styles.modeButtonActive]} onPress={() => setMode('conversation')} activeOpacity={0.8}>
                <Text style={[styles.modeText, mode === 'conversation' && styles.modeTextActive]}>Trò chuyện</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeButton, mode === 'learning' && styles.modeButtonActive]} onPress={() => setMode('learning')} activeOpacity={0.8}>
                <Text style={[styles.modeText, mode === 'learning' && styles.modeTextActive]}>Học tập</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Ngôn ngữ học</Text>
            <View style={styles.languageContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageSelector}>
                {AVAILABLE_LANGUAGES.map(lang => (
                  <TouchableOpacity 
                    key={lang} 
                    style={[styles.langButton, language === lang && styles.langButtonActive]} 
                    onPress={() => setLanguage(lang)}
                  >
                    <Text style={[styles.langText, language === lang && styles.langTextActive]}>{lang}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.sectionTitle}>Ngôn ngữ giải thích</Text>
            <View style={styles.languageContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageSelector}>
                {BASE_LANGUAGES.map(lang => (
                  <TouchableOpacity 
                    key={lang} 
                    style={[styles.langButton, baseLanguage === lang && styles.langButtonActive]} 
                    onPress={() => setBaseLanguage(lang)}
                  >
                    <Text style={[styles.langText, baseLanguage === lang && styles.langTextActive]}>{lang}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Lịch sử Giáo viên */}
            <View style={styles.historyHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="school-outline" size={14} color="#e94560" />
                <Text style={[styles.sectionTitle, { marginBottom: 0, color: '#e94560' }]}>Giáo viên</Text>
              </View>
              <TouchableOpacity style={styles.newChatSmallBtn} onPress={() => createNewSession('tutor')}>
                <Ionicons name="add" size={18} color="#e94560" />
                <Text style={styles.newChatSmallText}>Tạo mới</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={sessions.filter(s => s.mode === 'tutor')}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, paddingVertical: 8 }}>Chưa có cuộc trò chuyện</Text>}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={[styles.sessionItem, item.id === currentSessionId && styles.sessionItemActive]}
                  onPress={() => { setCurrentSessionId(item.id); setMode('tutor'); setShowHistoryModal(false); }}
                >
                  <Ionicons name="school-outline" size={18} color={item.id === currentSessionId ? "#fff" : "#a0aab5"} />
                  <View style={styles.sessionItemTextContainer}>
                    <Text style={[styles.sessionTitle, item.id === currentSessionId && {color: '#fff'}]} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.sessionDate}>{new Date(item.updatedAt).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />

            {/* Lịch sử Trò chuyện */}
            <View style={[styles.historyHeader, { marginTop: 15 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="chatbubbles-outline" size={14} color="#4FC3F7" />
                <Text style={[styles.sectionTitle, { marginBottom: 0, color: '#4FC3F7' }]}>Trò chuyện</Text>
              </View>
              <TouchableOpacity style={[styles.newChatSmallBtn, { backgroundColor: 'rgba(79,195,247,0.15)' }]} onPress={() => createNewSession('conversation')}>
                <Ionicons name="add" size={18} color="#4FC3F7" />
                <Text style={[styles.newChatSmallText, { color: '#4FC3F7' }]}>Tạo mới</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={sessions.filter(s => s.mode === 'conversation')}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, paddingVertical: 8 }}>Chưa có cuộc trò chuyện</Text>}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={[styles.sessionItem, item.id === currentSessionId && styles.sessionItemActive]}
                  onPress={() => { setCurrentSessionId(item.id); setMode('conversation'); setShowHistoryModal(false); }}
                >
                  <Ionicons name="chatbubbles-outline" size={18} color={item.id === currentSessionId ? "#fff" : "#a0aab5"} />
                  <View style={styles.sessionItemTextContainer}>
                    <Text style={[styles.sessionTitle, item.id === currentSessionId && {color: '#fff'}]} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.sessionDate}>{new Date(item.updatedAt).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Lesson Practice Modal */}
      {renderLessonPractice()}
    </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  headerSubtitle: { fontSize: 14, color: '#a0aab5', marginTop: 4 },
  historyButton: { padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
  modeSelector: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, marginBottom: 25, padding: 4 },
  modeButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 16, alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#0f3460' },
  modeText: { color: '#a0aab5', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  modeTextActive: { color: '#fff' },
  languageContainer: { marginBottom: 20 },
  languageSelector: { flexDirection: 'row', paddingBottom: 5 },
  langButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.2)', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  langButtonActive: { backgroundColor: 'rgba(233,69,96,0.2)', borderColor: '#e94560' },
  langText: { color: '#a0aab5', fontSize: 13, fontWeight: '500' },
  langTextActive: { color: '#fff', fontWeight: 'bold' },
  chatContainer: { flex: 1, padding: 20 },
  messageBubble: { maxWidth: '80%', padding: 15, borderRadius: 20, marginBottom: 15 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0f3460', borderBottomRightRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', borderBottomLeftRadius: 5 },
  mismatchBubble: { backgroundColor: 'rgba(255,152,0,0.2)', borderColor: '#FF9800', borderWidth: 1.5, borderBottomLeftRadius: 5 },
  messageText: { color: '#fff', fontSize: 16, lineHeight: 24 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 30, paddingTop: 8, gap: 8 },
  micButtonSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center' },
  micButtonRecording: { backgroundColor: '#ff2e4d' },
  modalOverlay: { flex: 1, flexDirection: 'row' },
  modalBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sidebarContent: { width: '80%', height: '100%', backgroundColor: '#16213e', padding: 20, paddingTop: 50, zIndex: 2, shadowColor: '#000', shadowOffset: {width: 2, height: 0}, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#a0aab5', marginBottom: 12 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  newChatSmallBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(233,69,96,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  newChatSmallText: { color: '#e94560', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  sessionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, marginBottom: 10 },
  sessionItemActive: { backgroundColor: 'rgba(15,52,96, 0.8)', borderColor: '#e94560', borderWidth: 1 },
  sessionItemTextContainer: { marginLeft: 15, flex: 1 },
  sessionTitle: { color: '#a0aab5', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  sessionDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  learningContainer: { flex: 1, width: '100%' },
  learningHeader: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 40, textAlign: 'center' },
  levelCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)' },
  levelCompleted: { backgroundColor: '#4CAF50', borderColor: '#388E3C' },
  levelCurrent: { backgroundColor: '#e94560', borderColor: '#ff2e4d', shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  levelLocked: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  levelTitle: { color: '#a0aab5', marginTop: 10, fontSize: 16, fontWeight: '600' }
});
