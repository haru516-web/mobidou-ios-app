import React, { useState } from 'react';
import { Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from './AppImage';
import { BRUSH, Button, C, Icon, Section } from '../components';
import { sourceLabel } from '../services/steps';
import type { useJourney } from '../services/useJourney';
import { WashiArt, WashiPressable } from './Washi';
import { tourPickerSections, type TourSelection } from '../data/featureTour';
import { WashiSwitch } from './WashiSwitch';
import { PagedBody } from './PagedBody';
import { Close, M, Meta } from './ModalParts';

const SETTINGS_BACKGROUND = require('../../assets/ui-washi/settings/settings-bg.webp');

type InfoKind = 'privacy' | 'about';

const INFO_TITLE: Record<InfoKind, string> = { privacy: 'プライバシーとデータ', about: 'もび道について' };

const INFO_BODY: Record<InfoKind, string> = {
  privacy: 'もび道は、今日の歩数・集めた御朱印・選んだモビー・ふれあい回数・設定を端末内に保存します。\n\nログイン、広告、アクセス解析、サーバー送信はありません。GPSも使用しません。歩数は御朱印の解放にのみ使用し、ヘルスケアへ書き込みません。\n\n端末を変更しても記録は自動では引き継がれません。設定のアカウント管理から引き継ぎコードを作成し、新しい端末で読み込んでください。アプリを削除すると記録は失われる場合があります。歩数アクセスはiPhoneの設定からいつでも変更できます。',
  about: 'もび道（もびどう）は、モビーと歩いて架空の御朱印を集めるアプリです。\n\n巡礼は、日常の場所から特別な場所へ移動し、道中の祈りや記録を経て日常へ戻る旅。もび道では、神域参詣・山岳修行・札所周回・観音巡礼・七願掛け・物語の聖地巡礼という6つの旅の型から選べます。\n\n各地点は社・宮・寺・観音堂などの参拝先として設計し、参拝後に境内の授与所で御朱印を授かります。登場する社・宮・地名・御朱印はすべて、もびの世界の創作です。実在の宗教施設や実際の参拝・授与品とは関係ありません。\n\n歩数は1日単位で、端末の現地時間に合わせて切り替わります。御朱印は順番に解放され、最後まで歩き切ると結願証・称号・専用の結願印を授かります。\n\n歩きながらの画面操作は立ち止まって。体調に合わせて、無理なく楽しんでください。',
};

type Props = {
  visible: boolean;
  /** True while the account sheet is on top; the settings state must survive it. */
  accountOpen: boolean;
  journey: ReturnType<typeof useJourney>;
  onShow: () => void;
  onDismiss: () => void;
  onClose: () => void;
  onOpenAccount: () => void;
  onEditHome: () => void;
  onToggleDemo: () => void;
  /** Whether the gacha tab is on the bar; its part of the tour is offered only then. */
  gacha: boolean;
  onStartTour: (selection: TourSelection) => void;
};

export function SettingsModal({ visible, accountOpen, journey, onShow, onDismiss, onClose, onOpenAccount, onEditHome, onToggleDemo, gacha, onStartTour }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const { data } = journey;
  const [info, setInfo] = useState<InfoKind | null>(null);
  const [tourPicker, setTourPicker] = useState(false);
  const [confirmDiscardBackup, setConfirmDiscardBackup] = useState(false);

  const close = () => { setInfo(null); setTourPicker(false); onClose(); };
  const startTour = (selection: TourSelection) => { setTourPicker(false); onStartTour(selection); };

  return <Modal visible={visible} onShow={onShow} onDismiss={() => { if (!accountOpen) { setInfo(null); onDismiss(); } }} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
    <SafeAreaView style={M.modal}>
      <Image accessible={false} source={SETTINGS_BACKGROUND} contentFit="cover" pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View style={M.modalHeader}><Text style={M.modalTitle}>設定</Text><Close onPress={close} /></View>
      {!!journey.error && <View style={M.error}><Text style={M.errorText}>{journey.error}</Text></View>}
      <ScrollView style={S.content} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
        {!!journey.corruptedBackup && <View key="backup">
          <Section title="読み込めなかった記録" />
          <View style={S.card}>
            <WashiArt />
            <Text style={M.settingHelp}>以前の記録を読み込めなかったため、端末内に退避しています。お問い合わせや手作業での復旧に使えるよう、内容を表示してコピーできます。</Text>
            <TextInput accessibilityLabel="退避した記録。長押ししてすべて選択しコピー" value={journey.corruptedBackup} editable={false} multiline selectTextOnFocus textAlignVertical="top" style={S.backupText} />
            {confirmDiscardBackup
              ? <>
                <Text style={M.settingHelp}>削除すると元に戻せません。削除しますか？</Text>
                <Button title="退避した記録を削除する" onPress={() => { void journey.discardCorruptedBackup(); setConfirmDiscardBackup(false); }} />
                <Button title="やめる" secondary onPress={() => setConfirmDiscardBackup(false)} style={{ marginTop: 10 }} />
              </>
              : <Button title="退避した記録を削除" secondary onPress={() => setConfirmDiscardBackup(true)} style={{ marginTop: 10 }} />}
          </View>
        </View>}
        <View key="account">
          <Section title="アカウント" />
          <View style={S.card}>
            <WashiArt />
            <Meta icon="person-circle-outline" text="未ログイン · この端末に保存" />
            <Text style={M.settingHelp}>ログインやクラウド同期は未設定です。アカウント画面からログイン状況を確認し、別の端末へ記録を引き継げます。</Text>
            <Button title="アカウント管理" icon="person-circle-outline" onPress={onOpenAccount} />
          </View>
        </View>
        <View key="steps">
          <Section title="歩数のつながり" />
          <View style={S.card}>
            <WashiArt />
            <Meta icon="footsteps-outline" text={sourceLabel[data.source]} />
            <Text style={M.settingHelp}>{data.source === 'healthkit' ? 'ヘルスケアの当日歩数を読み取ります。0歩のままの場合は、ヘルスケアの共有設定をご確認ください。読み取り権限の拒否はアプリから判別できません。' : data.source === 'motion' ? 'Expo Goではモーションとフィットネスから読み取ります。HealthKitはiOSの開発ビルドで利用できます。' : 'iPhoneで歩数を連携すると、今日の歩数で御朱印を集められます。'}</Text>
            <Button title="歩数を連携する" disabled={journey.busy} onPress={() => void journey.connect()} />
            {Platform.OS === 'ios' && <Button title="iPhoneの設定をひらく" secondary onPress={() => void Linking.openSettings().catch(() => {})} style={{ marginTop: 10 }} />}
          </View>
        </View>
        <View key="home">
          <Section title="ホーム" />
          <Text style={M.settingHelp}>ホームのカードは長押しでも編集できます。</Text>
          <Button title="ホームのカードを編集" icon="grid-outline" secondary onPress={onEditHome} />
        </View>
        <View key="haptics" style={S.row}>
          <View style={{ flex: 1 }}><Text style={S.label}>ふれあいの振動</Text><Text style={M.settingHelp}>なでたとき・御朱印を授かったとき</Text></View>
          <WashiSwitch accessibilityLabel="ふれあいの振動" value={data.haptics} onValueChange={journey.toggleHaptics} />
        </View>
        <View key="demo">
          <Section title="もび道を体験" />
          <Text style={M.settingHelp}>体験用の御朱印帳で、お散歩と授与演出を試せます。本番の記録には影響しません。</Text>
          <Button title={data.demo ? '体験を終えて実記録にもどる' : '体験モードをはじめる'} secondary onPress={onToggleDemo} />
        </View>
        <View key="tutorial">
          <Section title="チュートリアル" />
          <Text style={M.settingHelp}>各画面の使い方を、もう一度ゆっくり見られます。</Text>
          <Button title="チュートリアルを見る" icon="help-circle-outline" secondary onPress={() => setTourPicker(true)} />
        </View>
        <View key="about">
          <Section title="このアプリについて" />
          <Button title="プライバシーとデータ" secondary onPress={() => setInfo('privacy')} />
          <Button title="もび道について・利用上の案内" secondary onPress={() => setInfo('about')} style={{ marginTop: 10 }} />
          <Text style={S.footerNote}>{'もび道（もびどう） 1.0.0\n今日の一歩に、小さなご縁を。'}</Text>
        </View>
      </ScrollView>
      {tourPicker && <View style={S.infoBackdrop}>
        <View style={S.infoCard}>
          <WashiArt />
          <Text style={M.modalTitle}>チュートリアル</Text>
          <View style={S.tourList}>
            <WashiPressable artwork={false} accessibilityRole="button" accessibilityLabel="すべて。ホームから順に、すべての機能を見る" onPress={() => startTour('all')} style={S.tourRow}>
              <Icon name="sparkles-outline" size={24} color={C.red} />
              <View style={S.tourText}><Text style={S.tourName}>すべて</Text><Text style={S.tourSummary}>ホームから順に、すべての機能</Text></View>
              <Icon name="chevron-forward" size={18} color="#9A9081" />
            </WashiPressable>
            {tourPickerSections({ gacha }).map(section => <WashiPressable key={section.id} artwork={false} accessibilityRole="button" accessibilityLabel={`${section.title}。${section.summary}`} onPress={() => startTour(section.id)} style={S.tourRow}>
              <Icon name={section.icon as React.ComponentProps<typeof Icon>['name']} size={24} color={C.red} />
              <View style={S.tourText}><Text style={S.tourName}>{section.title}</Text><Text style={S.tourSummary}>{section.summary}</Text></View>
              <Icon name="chevron-forward" size={18} color="#9A9081" />
            </WashiPressable>)}
          </View>
          <Button title="とじる" secondary onPress={() => setTourPicker(false)} />
        </View>
      </View>}
      {!!info && <View style={S.infoBackdrop}>
        <View style={S.infoCard}>
          <WashiArt />
          <Text style={M.modalTitle}>{INFO_TITLE[info]}</Text>
          <View style={{ height: Math.min(430, windowHeight * .5) }}>
            <PagedBody gap={14}>{INFO_BODY[info].split('\n\n').map((paragraph, index) => <Text key={index} style={S.infoText}>{paragraph}</Text>)}</PagedBody>
          </View>
          <Button title="とじる" onPress={() => setInfo(null)} />
        </View>
      </View>}
    </SafeAreaView>
  </Modal>;
}

const S = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  scrollContent: { gap: 14, paddingBottom: 24 },
  card: { padding: 14 },
  backupText: { minHeight: 90, maxHeight: 160, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 15, color: C.ink, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, borderColor: C.line, paddingVertical: 12 },
  label: { color: C.ink, fontFamily: BRUSH, fontSize: 15 },
  footerNote: { marginTop: 25, textAlign: 'center', color: '#9A9081', fontSize: 12, lineHeight: 19 },
  infoBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2B241AB0', justifyContent: 'center', alignItems: 'center', padding: 24 },
  infoCard: { width: '100%', maxWidth: 420, padding: 28, gap: 20 },
  tourList: { gap: 4 },
  tourRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: C.line },
  tourText: { flex: 1 },
  tourName: { color: C.ink, fontFamily: BRUSH, fontSize: 16 },
  tourSummary: { color: '#726653', fontSize: 11.5, lineHeight: 17 },
  infoText: { fontSize: 13, lineHeight: 24, color: '#726653' },
});
