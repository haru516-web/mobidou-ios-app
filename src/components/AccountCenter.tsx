import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WashiInput } from './WashiInput';
import { PagedBody } from './PagedBody';
import { BRUSH, Button, C, Icon, SERIF, Section } from '../components';
import { getPilgrimage } from '../data/pilgrimages';
import { getPetCharacter, type PetId } from '../petCatalog';
import { WashiArt } from './Washi';

export type AccountPage = 'welcome' | 'manage' | 'login' | 'transfer';
export type AccountTransferSummary = {
  petId: PetId;
  routeId: string | null;
  rewardCount: number;
  totalSteps: number;
};

type Props = {
  page: AccountPage;
  isFirstLaunch?: boolean;
  localSummary: AccountTransferSummary;
  onNavigate: (page: AccountPage) => void;
  onBack: () => void;
  onStart: () => void;
  onExport: () => Promise<string>;
  onPreviewTransfer: (value: string) => AccountTransferSummary;
  onImportTransfer: (value: string) => Promise<void>;
  onFinishImport: () => void;
};

export function AccountCenter({
  page,
  isFirstLaunch = false,
  localSummary,
  onNavigate,
  onBack,
  onStart,
  onExport,
  onPreviewTransfer,
  onImportTransfer,
  onFinishImport,
}: Props) {
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [preview, setPreview] = useState<AccountTransferSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    setError('');
    setPreview(null);
    setConfirmReplace(false);
    setImported(false);
  }, [page]);

  const makeExportCode = async () => {
    setBusy(true);
    setError('');
    try {
      setExportCode(await onExport());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '引き継ぎコードを作成できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const reviewImportCode = () => {
    setError('');
    setConfirmReplace(false);
    try {
      setPreview(onPreviewTransfer(importCode));
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : '引き継ぎコードを確認できませんでした。');
    }
  };

  const applyImportCode = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      await onImportTransfer(importCode);
      setImported(true);
      setConfirmReplace(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'データを引き継げませんでした。');
    } finally {
      setBusy(false);
    }
  };

  if (page === 'welcome') {
    return <PagedBody style={S.content} gap={12}>
      <View style={S.welcomeArt}><WashiArt legacy /><View style={S.welcomeIcon}><Icon name="footsteps-outline" size={26} color={C.red} /></View></View>
      <Text style={S.kicker}>MOBIDOU · はじめの一歩</Text>
      <Text style={S.title}>旅の始め方を{'\n'}選んでください</Text>
      <Text style={S.body}>アカウントなしでも、この端末ですぐに始められます。あとから設定でデータを引き継いだり、アカウントを確認できます。</Text>
      <Button title="はじめて使う" icon="arrow-forward" onPress={onStart} style={S.primary} />
      <Button title="データを引き継ぐ" icon="swap-horizontal-outline" secondary onPress={() => onNavigate('transfer')} style={S.secondaryButton} />
      <Button title="ログイン" icon="person-circle-outline" secondary onPress={() => onNavigate('login')} style={S.secondaryButton} />
      <Text style={S.footnote}>ログイン機能は認証サービスの接続後に利用できます。</Text>
    </PagedBody>;
  }

  if (page === 'login') {
    return <PagedBody style={S.content} gap={12}>
      <View style={S.statusCard}>
        <WashiArt />
        <View style={S.statusIcon}><Icon name="lock-closed-outline" size={22} color={C.red} /></View>
        <Text style={S.statusTitle}>ログイン機能は未接続です</Text>
        <Text style={S.body}>このアプリには現在、認証サーバーやクラウド保存先がありません。ログインと自動同期を使うには、認証サービスの設定が必要です。</Text>
      </View>
      <Section title="いま使える方法" />
      <Text style={S.body}>別の端末へ記録を移す場合は、引き継ぎコードを作成して、その端末で読み込んでください。</Text>
      <Button title="データ引き継ぎへ" icon="swap-horizontal-outline" onPress={() => onNavigate('transfer')} style={S.primary} />
      <Button title="アカウント画面へ戻る" secondary onPress={onBack} style={S.secondaryButton} />
    </PagedBody>;
  }

  if (page === 'transfer') {
    return <PagedBody style={S.content} gap={12}>
      {imported ? <>
        <View style={S.statusCard}>
          <WashiArt />
          <View style={[S.statusIcon, S.successIcon]}><Icon name="checkmark" size={22} color="#557B61" /></View>
          <Text style={S.statusTitle}>引き継ぎが完了しました</Text>
          <Text style={S.body}>この端末の記録を更新しました。歩数の読み取り権限は端末ごとの設定のため、必要に応じて設定から再連携してください。</Text>
        </View>
        <Button title={isFirstLaunch ? '旅をはじめる' : 'アカウント画面へ戻る'} icon="arrow-forward" onPress={onFinishImport} style={S.primary} />
      </> : <>
        <Text key="lead" style={S.body}>元の端末で作ったコードを新しい端末に貼り付けると、記録を移せます。引き継ぎを実行すると、この端末の記録はコードの内容に置き換わります。</Text>
        <View key="export" style={S.transferSection}>
          <Section title="この端末の記録を書き出す" />
          <Text style={S.small}>コードを作成し、すべて選択してコピーします。安全な方法で新しい端末へ渡してください。</Text>
          <View style={S.summaryLine}><Icon name="phone-portrait-outline" size={17} color={C.gold} /><Text style={S.summaryText}>{getPetCharacter(localSummary.petId).name} · 御朱印 {localSummary.rewardCount} 枚 · 累計 {localSummary.totalSteps.toLocaleString('ja-JP')} 歩</Text></View>
          <Button title={busy ? '作成中…' : '引き継ぎコードを作る'} icon="copy-outline" disabled={busy} onPress={() => void makeExportCode()} secondary />
          {!!exportCode && <WashiInput accessibilityLabel="引き継ぎコード。長押ししてすべて選択しコピー" value={exportCode} editable={false} multiline selectTextOnFocus textAlignVertical="top" style={S.codeOutput} />}
        </View>

        <View key="import" style={S.transferSection}>
          <Section title="別の端末の記録を読み込む" />
          <WashiInput
            accessibilityLabel="引き継ぎコードを貼り付け"
            placeholder="引き継ぎコードをここに貼り付け"
            placeholderTextColor="#A39A8D"
            value={importCode}
            onChangeText={value => { setImportCode(value); setPreview(null); setConfirmReplace(false); setError(''); }}
            multiline
            textAlignVertical="top"
            style={S.codeInput}
          />
          <Button title="コードの内容を確認する" icon="search-outline" disabled={!importCode.trim() || busy} onPress={reviewImportCode} secondary />
          {!!preview && <View style={S.previewCard}>
            <Text style={S.previewTitle}>この記録を引き継ぎます</Text>
            <Text style={S.previewText}>{getPetCharacter(preview.petId).name} · 御朱印 {preview.rewardCount} 枚 · 累計 {preview.totalSteps.toLocaleString('ja-JP')} 歩</Text>
            {!!preview.routeId && <Text style={S.previewText}>巡礼中: {getPilgrimage(preview.routeId)?.name ?? '巡礼コース'}</Text>}
            {confirmReplace
              ? <><Text style={S.replaceNote}>現在この端末にある記録を置き換えます。続けますか？</Text>
                <Button title={busy ? '引き継ぎ中…' : '置き換えて引き継ぐ'} disabled={busy} onPress={() => void applyImportCode()} style={S.dangerButton} />
                <Button title="戻る" secondary disabled={busy} onPress={() => setConfirmReplace(false)} style={S.secondaryButton} />
              </>
              : <Button title="引き継ぎを続ける" disabled={busy} onPress={() => setConfirmReplace(true)} style={S.primary} />}
          </View>}
        </View>
        {!!error && <Text key="error" accessibilityRole="alert" style={S.error}>{error}</Text>}
        <View key="tail" style={{ gap: 6 }}><Button title="アカウント画面へ戻る" secondary onPress={onBack} style={S.secondaryButton} /><Text style={S.footnote}>引き継ぎコードには歩数・御朱印・設定などの記録が含まれます。ログイン情報や位置情報は含まれません。</Text></View>
      </>}
    </PagedBody>;
  }

  return <PagedBody style={S.content} gap={12}>
    <View style={S.statusCard}>
      <WashiArt />
      <View style={S.statusIcon}><Icon name="phone-portrait-outline" size={22} color={C.red} /></View>
      <Text style={S.kicker}>アカウントの状態</Text>
      <Text style={S.statusTitle}>この端末で利用中</Text>
      <Text style={S.body}>記録はこの端末に保存されています。ログインやクラウド同期はまだ設定されていません。</Text>
      <View style={S.statsRow}>
        <View style={S.stat}><Text style={S.statValue}>{localSummary.rewardCount}</Text><Text style={S.statLabel}>御朱印</Text></View>
        <View style={S.statDivider} />
        <View style={S.stat}><Text style={S.statValue}>{localSummary.totalSteps.toLocaleString('ja-JP')}</Text><Text style={S.statLabel}>累計歩数</Text></View>
      </View>
    </View>
    <Section title="アカウントとデータ" />
    <Button title="ログイン" icon="person-circle-outline" secondary onPress={() => onNavigate('login')} />
    <Button title="データ引き継ぎ" icon="swap-horizontal-outline" secondary onPress={() => onNavigate('transfer')} style={S.secondaryButton} />
    <View style={S.petLine}><Icon name="paw-outline" size={18} color={C.gold} /><Text style={S.summaryText}>現在の相棒: {getPetCharacter(localSummary.petId).name}</Text></View>
    <Text style={S.footnote}>アカウントを連携すると、複数端末で記録を使えるようになります。連携機能は認証サービスの設定後に利用できます。</Text>
  </PagedBody>;
}

const S = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  welcomeArt: { height: 92, width: 92, borderRadius: 46, alignSelf: 'center', backgroundColor: '#F1E7D8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 5 },
  welcomeIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF9EF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E4D3BD' },
  kicker: { color: C.gold, fontSize: 11, letterSpacing: 1.8, textAlign: 'center', marginTop: 8 },
  title: { fontFamily: BRUSH, fontSize: 26, lineHeight: 39, color: C.ink, textAlign: 'center', marginTop: 0 },
  body: { fontSize: 12, lineHeight: 22, color: '#746958', textAlign: 'center' },
  primary: { marginTop: 8 },
  secondaryButton: { marginTop: 2 },
  footnote: { color: '#958A79', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  statusCard: { padding: 19, alignItems: 'center', gap: 9, overflow: 'hidden' },
  statusIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F3E8DC', alignItems: 'center', justifyContent: 'center' },
  successIcon: { backgroundColor: '#E8F0E8' },
  statusTitle: { fontFamily: BRUSH, color: C.ink, fontSize: 19, textAlign: 'center' },
  transferSection: { padding: 15, gap: 9 },
  small: { color: C.muted, fontSize: 11, lineHeight: 19 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 },
  summaryText: { flex: 1, color: '#716654', fontSize: 11, lineHeight: 18 },
  codeOutput: { minHeight: 104, maxHeight: 170, borderRadius: 9, borderWidth: 1, borderColor: '#DDD1C0', backgroundColor: '#F7F2E9', color: '#766B5C', padding: 10, fontSize: 12, lineHeight: 14, fontFamily: 'monospace' },
  codeInput: { minHeight: 120, maxHeight: 220, borderRadius: 9, borderWidth: 1, borderColor: '#D9CBB8', backgroundColor: '#FFFDF8', color: C.ink, padding: 11, fontSize: 11, lineHeight: 18 },
  previewCard: { borderRadius: 11, padding: 12, backgroundColor: '#F2EBDD', gap: 7 },
  previewTitle: { fontFamily: BRUSH, fontSize: 14, color: C.ink },
  previewText: { color: '#716654', fontSize: 11, lineHeight: 18 },
  replaceNote: { color: '#8A483D', fontSize: 11, lineHeight: 19, marginTop: 4 },
  dangerButton: { backgroundColor: '#873F36' },
  error: { color: '#9B3C31', backgroundColor: '#F5E2DC', borderRadius: 9, padding: 11, fontSize: 11, lineHeight: 18 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 4, paddingTop: 13, borderTopWidth: 1, borderColor: C.line },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: SERIF, color: C.red, fontSize: 19 },
  statLabel: { color: C.muted, fontSize: 11 },
  statDivider: { height: 32, width: 1, backgroundColor: C.line },
  petLine: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 },
});
