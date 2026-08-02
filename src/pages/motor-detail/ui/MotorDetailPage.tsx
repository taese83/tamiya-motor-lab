import {useEffect, useMemo, useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext, useParams} from 'react-router'

import {baselineFromBestCvs, computeStabilityBaseline, measureQueries} from '@entities/measure-record'
import {MotorKindChip, motorQueries} from '@entities/motor'
import {AuthMenu} from '@features/auth'
import {useDeleteMeasureRecord} from '@features/measure-management'
import {ConditionHelpDialog, ConditionSummary, LatestPanoHero, PanoLineChart} from '@features/motor-management/ui'
import {
  beginMotorMeasure,
  cancelRaceMeasure,
  peekRaceMeasure,
  useRaceMeasureSlot,
} from '@features/race-measure-handoff'
import {conditionLevelOf} from '@shared/config/domain'
import {layoutTokens, numericTypography} from '@shared/config/design-tokens'
import {formatDateTimeShort, formatFanoHz, formatRpm} from '@shared/lib/format'
import {EmptyState} from '@shared/ui/empty-state'
import {TrashIcon} from '@shared/ui/icons'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {SectionHeading} from '@shared/ui/section-heading'
import {SWIPE_ACTION_WIDTH, SwipeActionButton, SwipeActions, useSingleOpenRow} from '@shared/ui/swipe-actions'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// 모터 상세 ('/motors/:motorId', 스택 push) — 버그 리포트 #2: 목록 인라인 확장을
// 상세 페이지로 전환. 조립 계약: PageHeader(←/모터명/ThemeToggle/Avatar) +
// MotorKindChip + PanoLineChart(measureQueries.byMotor asc ≤20) + 기록 리스트
// (canonical 텍스트 채널 — 차트는 추세 보조 aria-hidden) + 하단 [측정].
// v2.45(사용자): 모터 수정·삭제는 이 화면에서 제거 — 진입점은 모터 목록 스와이프 1곳으로 단일화.
// 미존재 motorId는 라우트 404가 아니라 in-place EmptyState (layout-spec §2.2).
//
// v2.5 측정 왕복: 하단 [측정] → beginMotorMeasure + navigate('/') → S1이 수치 안정 시 자동
// 확정으로 이 모터에 MeasureRecord를 수집하고 navigate(-1)로 복귀한다(레이스 왕복 RV-1과 동일
// 경로·동일 가드). 복귀 시 mount effect가 자기 왕복만 소비해 결과를 고지한다 — 저장 성공은
// 토스트, 실패는 인라인 Alert(오류 Toast 금지 계약). 기록 반영(차트·리스트)은 수집 훅의
// invalidation 소관이라 이 페이지가 별도 갱신하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

// ── v2.8 고정 셸 레이아웃 (하단 [측정] 고정 + 기록 목록만 스크롤) (R18: 그래프도 스크롤) ──
//
// 페이지 전체를 뷰포트 높이에 고정하고 기록 목록에만 overflow를 준다. 헤더·상단 요약(칩·안정도·
// 최근 파노)·[측정]은 스크롤을 타지 않으므로 기록이 늘어도 [측정]이 화면 밖으로 밀리지 않는다.
//
// 높이 계산: <main>이 이미 탭 바 높이를 pb로 예약하므로 여기서 같은 값을 빼면 문서 스크롤이
// 생기지 않는다(S1 MeasurePage와 동일 관례). 전역 배너[G]가 떠 있는 동안에는 그 높이만큼
// 문서가 살짝 길어질 수 있는데, 이는 MeasurePage와 같은 기존 특성이고 목록 자체는 그대로
// 내부 스크롤된다.
const pageShellSx = {
  display: 'flex',
  flexDirection: 'column',
  height: `calc(100dvh - ${layoutTokens.bottomNavHeight}px - ${layoutTokens.safeAreaBottom})`,
} as const

/** 스크롤을 타지 않는 상단 블록 — 알림·종류 칩·안정도·최근 파노 (R18: 그래프는 스크롤 영역으로 이동) */
const fixedTopSx = {
  px: 2,
  pt: 2,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
} as const

/**
 * 유일한 스크롤 영역 — 파노 추세 그래프 + 기록 목록 (R18: 그래프를 이 영역으로 이동).
 * minHeight 0이 없으면 flex 자식이 콘텐츠 높이만큼 부풀어 overflow가 동작하지 않는다.
 * overscrollBehavior contain — 목록 끝에서 문서·상위로 스크롤이 연쇄되지 않게 한다.
 */
const scrollAreaSx = {
  px: 2,
  py: 1.5,
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehaviorY: 'contain',
} as const

/** 하단 고정 액션 — 목록이 밑으로 지나가므로 헤어라인으로 면을 분리한다 */
const footerSx = {
  px: 2,
  py: 1.5,
  flexShrink: 0,
  borderTop: '1px solid',
  borderTopColor: 'divider',
} as const

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

export function MotorDetailPage() {
  const {motorId = ''} = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // 부재는 정상 도메인 결과(null) — in-place not-found로 분기 (layout-spec §2.2)
  const motorQuery = useQuery({...motorQueries.detail(motorId), enabled: !corrupted})
  // measuredAt asc ≤20 (listMeasureRecordsByMotor 결과 그대로 — 표시 시 목록만 역순)
  const recordsQuery = useQuery({...measureQueries.byMotor(motorId), enabled: !corrupted})
  const motor = motorQuery.data ?? null

  // v2.45(사용자): 모터 수정·삭제는 이 화면에서 제거했다 — 진입점은 모터 목록(MotorsPage)의
  // 행 스와이프 [수정]/[삭제] 1곳으로 단일화한다(상세 헤더가 붐비지 않게). cascade 삭제·수정 폼
  // 훅/시트/ConfirmDialog는 목록 페이지가 그대로 소유한다.

  // ── v2.38 파노 기록 개별 삭제 — 밀어서 삭제(스와이프 트레이 [삭제] 탭, 다이얼로그 없음, 사용자) ──
  // 개별만 제공(일괄 없음). 제스처(스와이프)+탭이 의도 게이트 — 탭 즉시 삭제 + 성공 토스트.
  const deleteMeasure = useDeleteMeasureRecord(motorId)
  const measureSwipe = useSingleOpenRow()
  const handleDeleteMeasure = (id: string) => {
    if (deleteMeasure.isPending) return
    deleteMeasure.mutate(id, {
      onSuccess: () => {
        measureSwipe.closeAll()
        toast.showSuccess('측정 기록이 삭제되었습니다')
      },
    })
  }

  // ── v2.5 측정 왕복 ────────────────────────────────────────────────────────
  // 복귀 결과는 로컬 state로 복사하지 않고 slot에서 직접 파생한다 — 값이 mount 전에 이미
  // 도착해 있어 구독 콜백으로 받을 수 없고, effect에서 setState로 옮기면 cascading render가
  // 된다(react-hooks/set-state-in-effect). slot을 단일 원천으로 두면 사본 동기화가 사라진다.
  const measureSlot = useRaceMeasureSlot()
  const myMeasure =
    measureSlot !== null && measureSlot.origin === 'motor' && measureSlot.motorId === motorId
      ? measureSlot
      : null
  // 실패 고지 — ToastApi는 성공 전용이라 인라인 Alert로 표면화한다(성공 위장 금지)
  const measureFailed = myMeasure?.measured?.save === 'failed'

  // 저장 성공 도착 시 1회 토스트 + slot 파기 (외부 시스템 갱신만 — 로컬 setState 없음)
  useEffect(() => {
    if (myMeasure?.measured?.save === 'saved') {
      toast.showSuccess('기록됨')
      cancelRaceMeasure()
    }
  }, [myMeasure, toast])

  // 잔여 slot 회수 — 안 지우면 S1이 왕복 모드에 갇혀 일반 [기록] 진입점이 사라진다(INV-21).
  // peek(비반응)와 deps [motorId]로 **mount/unmount 시점에만** 판정한다: 반응 구독으로 지우면
  // [측정] 직후 navigate 전 리렌더에서 방금 만든 slot을 스스로 파기해버린다.
  // - 도착 시 measured===null: 수집 없이 [모터로 돌아가기]로 복귀 = 왕복 포기 → 파기
  // - 떠날 때 measured!==null: 결과 고지가 끝났거나 화면을 벗어남 → 파기
  //   (measured===null은 보존 — [측정]으로 S1에 가는 정상 경로가 바로 이 경우다)
  useEffect(() => {
    const onArrive = peekRaceMeasure()
    if (
      onArrive?.origin === 'motor' &&
      onArrive.motorId === motorId &&
      onArrive.measured === null
    ) {
      cancelRaceMeasure()
    }
    return () => {
      const onLeave = peekRaceMeasure()
      if (onLeave?.origin === 'motor' && onLeave.motorId === motorId && onLeave.measured !== null) {
        cancelRaceMeasure()
      }
    }
  }, [motorId])

  // [측정] — slot 적재 후 S1로 이동. 복귀는 S1의 navigate(-1)이 담당한다
  const handleMeasure = () => {
    if (motor === null) return
    beginMotorMeasure({motorId: motor.id, motorName: motor.name})
    void navigate('/')
  }

  // 스택 pop. history 스택이 없는 딥링크 최초 진입이면 목록(/motors)으로 replace.
  const handleBack = () => {
    const historyIndex = (window.history.state as {idx?: number} | null)?.idx ?? 0
    if (historyIndex > 0) void navigate(-1)
    else void navigate('/motors', {replace: true})
  }

  const notFound = !corrupted && motorQuery.isSuccess && motor === null
  const records = recordsQuery.data
  // R17 — 가장 최근 측정(measuredAt asc 배열의 마지막 원소). 히어로 강조용 파생.
  const latestRecord = records !== undefined && records.length > 0 ? records[records.length - 1] : undefined

  // 컨디션 기준선 (v2.x 개정 3 — 최상 컨디션 영속): 모터 행의 역대 최상 CV 3건 중앙값이 정본
  // (rolling eviction과 무관 — 사용자 확정). 아직 영속 표본이 없는 모터(지표 도입 직후)만
  // 보관 기록에서 파생 계산으로 fallback.
  const stabilityBaseline = useMemo(
    () =>
      baselineFromBestCvs(motor?.stabilityBestCvs) ??
      (records !== undefined ? computeStabilityBaseline(records) : null),
    [motor, records],
  )
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <>
      {/* v2.8 고정 셸 — 헤더·상단 요약·[측정]은 고정, 그래프+기록 목록이 스크롤한다(R18) */}
      <Box sx={pageShellSx}>
        {/* [H] 화면 헤더 — [←] [h1 모터명] [ThemeToggle] [Avatar]
            v2.45(사용자): 수정·삭제 버튼 제거 — 모터 관리는 목록 화면 스와이프에서 수행한다. */}
        <PageHeader
          onBack={handleBack}
          title={motor?.name ?? '모터 상세'}
          actions={
            <>
              <ThemeToggle />
              <AuthMenu />
            </>
          }
        />

        {corrupted ? (
          <Box sx={scrollAreaSx}>
            <RecoveryPanel
              onRetry={shell.retryPersistence}
              retryPending={shell.persistenceRetryPending}
              onResetAllData={async () => {
                const ok = await shell.resetPersistedData()
                if (ok) toast.showSuccess('초기화되었습니다')
                return ok
              }}
            />
          </Box>
        ) : motorQuery.isPending ? (
          <Box sx={scrollAreaSx}>
            <Typography color="text.secondary">불러오는 중…</Typography>
          </Box>
        ) : motorQuery.isError ? (
          <Box sx={scrollAreaSx}>
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void motorQuery.refetch()
                  }}>
                  다시 시도
                </Button>
              }>
              모터 정보를 불러오지 못했습니다
            </Alert>
          </Box>
        ) : notFound || motor === null ? (
          // in-place not-found — URL 보존, 라우트 404 금지 (layout-spec §2.2)
          <Box sx={scrollAreaSx}>
            <EmptyState
              title="모터를 찾을 수 없습니다"
              description="삭제되었거나 잘못된 주소입니다"
              actionLabel="모터 목록으로"
              onAction={() => {
                void navigate('/motors', {replace: true})
              }}
            />
          </Box>
        ) : (
          <>
            {/* ── 고정 영역: 알림 · 종류 칩 · 안정도 · 최근 파노 (스크롤 대상 아님 — R18: 차트는 스크롤 영역으로) ── */}
            <Box sx={fixedTopSx}>
              {/* 왕복 수집 실패 고지 (v2.5) — 성공 위장 금지. 닫기 = slot 파기(고지의 원천 제거) */}
              {measureFailed && (
                <Alert severity="error" onClose={cancelRaceMeasure}>
                  측정값을 저장하지 못했습니다 — 다시 측정해 주세요
                </Alert>
              )}

              <Box>
                <MotorKindChip kind={motor.kind} />
              </Box>

              {/* R19(프로토타입, 미커밋 — 사용자 검토용): 히어로 영역을 가로 2단으로 나눠
                  좌=최근 파노 히어로(R17), 우 끝=안정도 요약(ConditionSummary)로 배치한다.
                  컴포넌트 내용·로직은 그대로 두고 **위치만** 이동(space-between). 원배치는
                  안정도 줄(위) → 히어로(아래) 세로 스택이었다. 컨디션 요약 근거는 아래 ConditionSummary 참조. */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1.5,
                }}>
                {/* 좌: 최근 파노 히어로 — 대형 수치 유지(축소 금지) */}
                <Box sx={{flexShrink: 0}}>
                  {latestRecord !== undefined && (
                    <LatestPanoHero
                      panoHz={latestRecord.panoHz}
                      measuredAt={latestRecord.measuredAt}
                      rpm={latestRecord.rpm}
                    />
                  )}
                </Box>
                {/* 우 끝: 안정도 요약 — 좁은 폭에서 줄바꿈 허용(minWidth 0) */}
                {records !== undefined && records.length > 0 && (
                  <Box sx={{minWidth: 0, flexShrink: 1}}>
                    <ConditionSummary
                      records={records}
                      baseline={stabilityBaseline}
                      onOpenHelp={() => setHelpOpen(true)}
                    />
                  </Box>
                )}
              </Box>
            </Box>

            {/* ── 스크롤 영역: 파노 추세 그래프 + 기록 목록 (R18) ──
              헤딩은 스크롤 안에 둔다 — 고정 영역에 두면 목록이 비었을 때도 남아
              "기록 없음" 안내와 중복된 층이 생긴다 */}
            <Box sx={scrollAreaSx}>
              {/* R18(사용자): 그래프를 고정영역→스크롤영역으로 이동 — 그래프도 스크롤된다 */}
              {/* v2.14 섹션 구분 — 차트와 기록 목록이 서로 다른 덩어리임을 명시한다.
                차트는 추세 보조(aria-hidden)라 헤딩은 장식(span) — 스크린리더 목차를 오염시키지 않고
                canonical 데이터는 아래 기록 목록 텍스트가 담당한다. */}
              {records !== undefined && records.length > 0 && (
                <>
                  <SectionHeading as="span">파노 추세</SectionHeading>
                  <PanoLineChart
                    points={records.map(record => ({
                      id: record.id,
                      measuredAt: record.measuredAt,
                      panoHz: record.panoHz,
                    }))}
                  />
                </>
              )}
              {records !== undefined && records.length > 0 && (
                <Box sx={{mt: 2, mb: 0.5}}>
                  {/* R41→R42(사용자): 레이스 진입점을 이 섹션 헤딩 우측 "Show All" 자리로 이동 —
                      측정 기록 타이틀과 같은 라인 오른쪽 끝, 언더라인 텍스트 버튼(navigate /race/:motorId). */}
                  <SectionHeading
                    meta={`${records.length}건`}
                    action={
                      <Button
                        variant="text"
                        onClick={() => void navigate(`/race/${motor.id}`)}
                        sx={{
                          minWidth: 0,
                          p: 0,
                          textTransform: 'none',
                          textDecoration: 'underline',
                          '&:hover': {backgroundColor: 'transparent', textDecoration: 'underline'},
                        }}>
                        레이스 기록 보기
                      </Button>
                    }>
                    측정 기록
                  </SectionHeading>
                </Box>
              )}
              {recordsQuery.isPending ? (
                <Typography variant="body2" sx={{color: 'text.secondary'}}>
                  기록 불러오는 중…
                </Typography>
              ) : recordsQuery.isError ? (
                // D-10: 읽기 실패는 오류로 표면화 — 빈 목록 위장 금지
                <Alert
                  severity="error"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => {
                        void recordsQuery.refetch()
                      }}>
                      다시 시도
                    </Button>
                  }>
                  기록을 불러오지 못했습니다
                </Alert>
              ) : records === undefined || records.length === 0 ? (
                // 기록 0건 — 안내 텍스트 블록 (오류 위장 금지). 하단 고정 [측정]으로 유도
                <Typography variant="body2" sx={{color: 'text.secondary'}}>
                  아직 기록 없음 — 아래 [측정]으로 첫 기록을 수집하세요
                </Typography>
              ) : (
                /*
                기록 리스트 ≤20행 — v2.21(사용자): **최근이 위로**(내림차순). 회차 번호는
                오래된 것이 01, 최신이 총 건수 — 최신 행이 가장 큰 번호로 맨 위에 온다
                (RaceRecordRow와 동일 규칙). 차트 X축은 여전히 오래된→최신(왼→오른)이라
                목록과 방향이 반대다: 목록은 "최근 먼저 훑기", 차트는 "시간 흐름"으로 관심사가 다르다.
                데이터층(measuredAt asc)은 재정렬하지 않고 표시 시점에만 뒤집는다.
                v2.14: 좌측(회차·일시) / 우측(파노 값·rpm) 2열 — 모터 카드와 같은 스캔 축.
              */
                <Box
                  component="ol"
                  sx={{listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column'}}>
                  {records
                    .map((record, ascIndex) => ({record, seq: ascIndex + 1}))
                    .reverse()
                    .map(({record, seq}) => (
                      <Box
                        component="li"
                        key={record.id}
                        sx={{
                          '&:not(:last-of-type)': {
                            borderBottom: '1px solid',
                            borderBottomColor: 'divider',
                          },
                        }}>
                        {/* v2.38 밀어서 삭제 — 스와이프 트레이 [삭제] 탭 즉시 삭제(다이얼로그 없음) */}
                        <SwipeActions
                          open={measureSwipe.openId === record.id}
                          onOpenChange={open => measureSwipe.setOpen(record.id, open)}
                          trayWidth={SWIPE_ACTION_WIDTH}
                          actions={
                            <SwipeActionButton
                              destructive
                              icon={<TrashIcon size={20} />}
                              label="삭제"
                              ariaLabel={`${formatDateTimeShort(record.measuredAt)} 측정 기록 삭제`}
                              onClick={() => handleDeleteMeasure(record.id)}
                              disabled={deleteMeasure.isPending}
                            />
                          }>
                          {/* 슬라이딩 표면 — 트레이를 덮도록 불투명 배경(페이지 배경) */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              py: 1,
                              bgcolor: 'background.default',
                            }}>
                            <Typography
                              variant="overline"
                              component="span"
                              sx={{color: 'text.secondary', lineHeight: 1, minWidth: '1.75em'}}>
                              {String(seq).padStart(2, '0')}
                            </Typography>
                            <Typography
                              variant="body2"
                              component="span"
                              sx={{color: 'text.secondary'}}>
                              {formatDateTimeShort(record.measuredAt)}
                            </Typography>
                            <Box
                              sx={{
                                ml: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: 0.25,
                              }}>
                              <Typography
                                component="span"
                                sx={{...numericTypography.listValue, lineHeight: 1.2}}>
                                {formatFanoHz(record.panoHz)}
                              </Typography>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{
                                  color: 'text.secondary',
                                  lineHeight: 1.2,
                                  fontVariantNumeric: 'tabular-nums lining-nums',
                                }}>
                                {formatRpm(record.rpm)} rpm
                                {/* 안정도(컨디션 지표, v2.x) — 지표 도입 전 기록은 필드 부재(미표시) */}
                                {record.stabilityCv !== undefined && (
                                  <Box
                                    component="span"
                                    sx={{
                                      ml: 0.75,
                                      // v2.x 개정: 절대 등급 폐기 — 기준선 대비 컨디션 색(기준선 미완성이면 중립)
                                      color: (() => {
                                        const level = conditionLevelOf(record.stabilityCv, stabilityBaseline)
                                        if (level === 'inspect') return 'error.main'
                                        if (level === 'watch') return 'warning.main'
                                        if (level === 'ok') return 'success.main'
                                        return 'text.secondary'
                                      })(),
                                    }}>
                                    ±{formatRpm(Math.max(1, Math.round(record.stabilityCv * record.rpm)))}
                                  </Box>
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        </SwipeActions>
                      </Box>
                    ))}
                </Box>
              )}
            </Box>

            {/*
            ── 하단 고정 [측정] (v2.8) — 기록이 늘어도 화면 밖으로 밀리지 않는다.
            레이스 왕복과 동일 방식(S1 자동 확정 후 자동 복귀).
            기록 0건에서도 노출한다(첫 수집 진입점). primary contained 48px.
          */}
            <Box sx={footerSx}>
              {/* 쓰기(기록 삭제) 진행 중에는 [측정] 비활성 — 왕복 진입이 in-flight 쓰기와 겹치지
                  않게(사용자 요청: 서버 요청 중 버튼 비활성). 삭제 완료 후 즉시 재활성. */}
              <Button
                variant="contained"
                fullWidth
                onClick={handleMeasure}
                disabled={deleteMeasure.isPending}
                sx={{minHeight: 48}}>
                측정
              </Button>
            </Box>
          </>
        )}
      </Box>

      {/* 컨디션 판단 가이드 (v2.x — 쉬운 언어 3규칙: 양호/주의/점검 권장) */}
      <ConditionHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
