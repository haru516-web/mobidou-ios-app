import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WashiInput } from './WashiInput';
import { BRUSH, Button, C, Icon, SERIF, Section } from '../components';
import { getPilgrimage } from '../data/pilgrimages';
import { getPetCharacter, type PetId } from '../petCatalog';
import { WashiArt } from './Washi';
import { appleMessages, type AppleOutcome } from '../services/appleOutcome';
import { DELETE_CONFIRMATION_WORD, type DeletionResult } from '../services/accountDeletion';

export type AccountPage = 'welcome' | 'manage' | 'login' | 'transfer' | 'delete';
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
  /** Whether this device's account is tied to an Apple ID (null while unknown). */
  appleLinked?: boolean | null;
  /** Ask the app to read the Apple link state again (called when the screen opens). */
  onAppleStatus?: () => void;
  /** Tie this device's account to the Apple ID. */
  onAppleLink: () => Promise<AppleOutcome>;
  /** On a new device: take over the account tied to the Apple ID. */
  onAppleRestore: () => Promise<AppleOutcome>;
  /** 木札 held (free and bought), shown at the second step of deleting the account. */
  tickets?: number;
  /** Delete the account on the server. The device is erased by `onAccountDeleted` afterwards. */
  onDeleteAccount: () => Promise<DeletionResult>;
  /** The account is gone: erase this device and go back to the first screen. */
  onAccountDeleted: () => void;
};

/** The account screens scroll up and down as one long page instead of being split into pages. */
function AccountBody({ children }: { children: React.ReactNode }) {
  return <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}

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
  appleLinked = null,
  onAppleStatus,
  onAppleLink,
  onAppleRestore,
  tickets = 0,
  onDeleteAccount,
  onAccountDeleted,
}: Props) {
  // Deleting takes three steps: what goes, what is lost, and typing the word.
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleMessage, setAppleMessage] = useState('');
  const [recordRestored, setRecordRestored] = useState(false);
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
    setAppleMessage('');
    setRecordRestored(false);
    setDeleteStep(1);
    setDeleteWord('');
    setDeleteMessage('');
    if (page === 'login' || page === 'manage') onAppleStatus?.();
  }, [page]);

  // First launch (a new device) takes the Apple ID's account over; later, the account here is tied to the Apple ID.
  const signInWithApple = async () => {
    setAppleBusy(true);
    setAppleMessage('');
    const outcome = await (isFirstLaunch ? onAppleRestore() : onAppleLink());
    setAppleBusy(false);
    setRecordRestored(outcome.ok && outcome.status === 'restored' && outcome.recordRestored === true);
    setAppleMessage(outcome.ok
      ? outcome.status === 'restored' ? (outcome.recordRestored ? '前の端末の記録（御朱印・歩数・モビー）と、木札・フレンド・プロフィールを呼び戻しました。' : '前の端末の木札・フレンド・プロフィールを呼び戻しました。保存された記録は見つかりませんでした。') : outcome.status === 'already_linked' ? 'すでにこのApple IDとつながっています。' : 'Apple IDとつながりました。機種変更のときも、このApple IDで木札を引き継げます。'
      : appleMessages[outcome.reason]);
  };

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
    return <AccountBody>
      <View style={S.welcomeArt}><WashiArt legacy /><View style={S.welcomeIcon}><Icon name="footsteps-outline" size={26} color={C.red} /></View></View>
      <Text style={S.kicker}>MOBIDOU · はじめの一歩</Text>
      <Text style={S.title}>旅の始め方を{'\n'}選んでください</Text>
      <Text style={S.body}>アカウントなしでも、この端末ですぐに始められます。あとから設定でデータを引き継いだり、アカウントを確認できます。</Text>
      <Button title="はじめて使う" icon="arrow-forward" onPress={onStart} style={S.primary} />
      <Button title="データを引き継ぐ" icon="swap-horizontal-outline" secondary onPress={() => onNavigate('transfer')} style={S.secondaryButton} />
      <Button title="Appleでサインイン" icon="logo-apple" secondary onPress={() => onNavigate('login')} style={S.secondaryButton} />
      <Text style={S.footnote}>機種変更のときは、前の端末でつないだApple IDでサインインすると、記録と木札・フレンド・プロフィールが戻ります。</Text>
    </AccountBody>;
  }

  if (page === 'login') {
    return <AccountBody>
      <View style={S.statusCard}>
        <WashiArt />
        <View style={S.statusIcon}><Icon name="logo-apple" size={22} color={C.red} /></View>
        <Text style={S.statusTitle}>Appleでサインイン</Text>
        <Text style={S.body}>{isFirstLaunch
          ? '前の端末でApple IDとつないでいれば、ここでサインインして、記録（御朱印・歩数・モビー）と木札・フレンド・プロフィールを呼び戻せます。'
          : appleLinked ? 'この端末のアカウントは、Apple IDとつながっています。機種変更のときは、新しい端末でサインインしてください。'
          : 'Apple IDとつなぐと、機種変更のときも、記録と木札・フレンド・プロフィールを引き継げます。名前やメールアドレスは、もび道には送りません。'}</Text>
      </View>
      {!!appleMessage && <Text accessibilityLiveRegion="polite" style={S.body}>{appleMessage}</Text>}
      {recordRestored && <Button title="旅をはじめる" icon="arrow-forward" onPress={onFinishImport} style={S.primary} />}
      {!recordRestored && (isFirstLaunch || !appleLinked) && <Button title={appleBusy ? 'サインイン中…' : isFirstLaunch ? 'Appleでサインインして引き継ぐ' : 'Apple IDとつなぐ'} icon="logo-apple" disabled={appleBusy} onPress={() => void signInWithApple()} style={S.primary} />}
      <Section title="記録の保存" />
      <Text style={S.body}>Apple IDとつなぐと、御朱印・歩数・集めたモビーの記録も、サーバーに自動で保存されます。つながなくても、最初に選んだモビー・モビーの所持記録・ガチャの結果は、サーバーに送ります。</Text>
      {appleLinked !== true && <Button title="データ引き継ぎへ" icon="swap-horizontal-outline" secondary onPress={() => onNavigate('transfer')} style={S.secondaryButton} />}
      <Button title="アカウント画面へ戻る" secondary onPress={onBack} style={S.secondaryButton} />
    </AccountBody>;
  }

  if (page === 'delete') {
    const deleteNow = async () => {
      setDeleteBusy(true);
      setDeleteMessage('');
      const result = await onDeleteAccount();
      setDeleteBusy(false);
      if (result === 'deleted') onAccountDeleted();
      else setDeleteMessage(result === 'signed_out' ? 'この端末の認証が切れています。別の端末でサインインした場合は、この端末でも「Appleでサインイン」をしてから、もう一度お試しください。削除は、まだ行われていません。解決しない場合は、サポートまでご連絡ください。' : result === 'apple_needed' ? 'Appleでのサインインが必要です。Apple IDとのつながりを解除するため、もう一度「Appleでサインイン」を確認してください。削除は、まだ行われていません。' : result === 'offline' ? 'サーバーにつながりませんでした。電波のよいところで、もう一度お試しください。削除は、まだ行われていません。' : '削除できませんでした。しばらくしてから、もう一度お試しください。削除は、まだ行われていません。');
    };
    return <AccountBody>
      <View style={S.statusCard}>
        <WashiArt />
        <View style={S.statusIcon}><Icon name="trash-outline" size={22} color={C.red} /></View>
        <Text style={S.kicker}>アカウントの削除 {deleteStep} / 3</Text>
        {deleteStep === 1 && <>
          <Text style={S.statusTitle}>アカウントを削除しますか？</Text>
          <Text style={S.body}>削除すると、次のものがすべて消えます。{'\n'}・この端末の記録（御朱印・歩数・集めたモビー・設定）{'\n'}・サーバーにあるデータ（プロフィール・フレンド・木札・ガチャの記録・保存された記録）{'\n'}・Apple IDとのつながり</Text>
        </>}
        {deleteStep === 2 && <>
          <Text style={S.statusTitle}>本当に削除しますか？</Text>
          <Text style={S.body}>{tickets > 0 ? `いま持っている木札 ${tickets} 枚も、消えます。購入した分も、返金や復元はできません。` : '消えたデータは、元に戻せません。'}{'\n'}Appleでの購入の履歴は、Appleに残ります。{'\n\n'}契約中のサブスクリプション（プラスプラン）は、アカウントを削除しても、自動では解約されません。請求を止めるには、Appleの「サブスクリプション」で解約してください。</Text>
          <Button title="Appleのサブスクリプションを開く" icon="open-outline" secondary onPress={() => void Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => undefined)} style={S.secondaryButton} />
        </>}
        {deleteStep === 3 && <>
          <Text style={S.statusTitle}>最後の確認です</Text>
          <Text style={S.body}>削除するには、下の欄に「{DELETE_CONFIRMATION_WORD}」と入力してください。入力すると、削除のボタンが押せます。</Text>
          <WashiInput value={deleteWord} onChangeText={setDeleteWord} placeholder={DELETE_CONFIRMATION_WORD} autoCorrect={false} accessibilityLabel="確認のため、削除と入力" style={S.deleteInput} />
        </>}
      </View>
      {!!deleteMessage && <Text accessibilityLiveRegion="polite" style={S.body}>{deleteMessage}</Text>}
      {deleteStep < 3
        ? <Button title={deleteStep === 1 ? '削除に進む' : '削除を続ける'} icon="arrow-forward" disabled={deleteBusy} onPress={() => setDeleteStep(deleteStep + 1)} style={S.dangerButton} />
        : <Button title={deleteBusy ? '削除しています…' : 'すべてを完全に削除する'} icon="trash-outline" disabled={deleteBusy || deleteWord.trim() !== DELETE_CONFIRMATION_WORD} onPress={() => void deleteNow()} style={S.dangerButton} />}
      <Button title="やめる" secondary disabled={deleteBusy} onPress={onBack} style={S.secondaryButton} />
    </AccountBody>;
  }

  if (page === 'transfer' && appleLinked === true) {
    return <AccountBody>
      <View style={S.statusCard}>
        <WashiArt />
        <View style={S.statusIcon}><Icon name="logo-apple" size={22} color={C.red} /></View>
        <Text style={S.statusTitle}>Apple IDで引き継ぎます</Text>
        <Text style={S.body}>Apple IDとつながっているので、引き継ぎコードは使いません。記録はサーバーに自動で保存されます。新しい端末で、はじめの画面から「Appleでサインイン」を選んでください。</Text>
      </View>
      <Button title="アカウント画面へ戻る" secondary onPress={onBack} style={S.secondaryButton} />
    </AccountBody>;
  }

  if (page === 'transfer') {
    return <AccountBody>
      {imported ? <>
        <View style={S.statusCard}>
          <WashiArt />
          <View style={[S.statusIcon, S.successIcon]}><Icon name="checkmark" size={22} color="#557B61" /></View>
          <Text style={S.statusTitle}>引き継ぎが完了しました</Text>
          <Text style={S.body}>この端末の記録を更新しました。歩数の読み取り権限は端末ごとの設定のため、必要に応じて設定から再連携してください。</Text>
        </View>
        <Button title={isFirstLaunch ? '旅をはじめる' : 'アカウント画面へ戻る'} icon="arrow-forward" onPress={onFinishImport} style={S.primary} />
      </> : <>
        <Text key="lead" style={S.body}>元の端末で作ったコードを新しい端末に貼り付けると、記録を移せます。引き継ぎを実行すると、この端末の記録はコードの内容に置き換わります。コードには、木札・フレンド・プロフィールは入りません。これらを移すには、Apple IDとつないで、新しい端末でサインインしてください。</Text>
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
    </AccountBody>;
  }

  return <AccountBody>
    <View style={S.statusCard}>
      <WashiArt />
      <View style={S.statusIcon}><Icon name="phone-portrait-outline" size={22} color={C.red} /></View>
      <Text style={S.kicker}>アカウントの状態</Text>
      <Text style={S.statusTitle}>この端末で利用中</Text>
      <Text style={S.body}>記録はこの端末に保存されています。{appleLinked ? 'Apple IDとつながっています。' : 'Apple IDとつなぐと、木札・フレンド・プロフィールを機種変更で引き継げます。'}</Text>
      <View style={S.statsRow}>
        <View style={S.stat}><Text style={S.statValue}>{localSummary.rewardCount}</Text><Text style={S.statLabel}>御朱印</Text></View>
        <View style={S.statDivider} />
        <View style={S.stat}><Text style={S.statValue}>{localSummary.totalSteps.toLocaleString('ja-JP')}</Text><Text style={S.statLabel}>累計歩数</Text></View>
      </View>
    </View>
    <Section title="アカウントとデータ" />
    <Button title={appleLinked ? 'Apple IDの連携状況' : 'Appleでサインイン'} icon="logo-apple" secondary onPress={() => onNavigate('login')} />
    {appleLinked !== true && <Button title="データ引き継ぎ" icon="swap-horizontal-outline" secondary onPress={() => onNavigate('transfer')} style={S.secondaryButton} />}
    <Section title="アカウントの削除" />
    <Button title="アカウントを削除する" icon="trash-outline" secondary onPress={() => onNavigate('delete')} style={S.secondaryButton} />
    <View style={S.petLine}><Icon name="paw-outline" size={18} color={C.gold} /><Text style={S.summaryText}>現在の相棒: {getPetCharacter(localSummary.petId).name}</Text></View>
    <Text style={S.footnote}>Apple IDとつなぐと、御朱印・歩数・モビーの記録と、木札・フレンド・プロフィールを、機種変更で引き継げます。</Text>
  </AccountBody>;
}

const S = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },
  deleteInput: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFFFFF', color: C.ink, fontSize: 18, marginTop: 10, textAlign: 'center' },
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
