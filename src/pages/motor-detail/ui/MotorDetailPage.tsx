import {useEffect, useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext, useParams} from 'react-router'

import {measureQueries} from '@entities/measure-record'
import {MotorKindChip, motorQueries} from '@entities/motor'
import {useDeleteMotorCascade, useUpdateMotor} from '@features/motor-management/api'
import {useMotorDeleteFlow} from '@features/motor-management/model'
import {MotorFormSheet, PanoLineChart} from '@features/motor-management/ui'
import {
  beginMotorMeasure,
  cancelRaceMeasure,
  peekRaceMeasure,
  useRaceMeasureSlot,
} from '@features/race-measure-handoff'
import {layoutTokens, numericTypography} from '@shared/config/design-tokens'
import {formatDateTimeShort, formatFanoHz, formatRpm} from '@shared/lib/format'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {SectionHeading} from '@shared/ui/section-heading'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {MotorKind} from '@shared/config/domain'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// 모터 상세 ('/motors/:motorId', 스택 push) — 버그 리포트 #2: 목록 인라인 확장을
// 상세 페이지로 전환. 조립 계약: PageHeader(←/모터명/[수정][삭제]/ThemeToggle) +
// MotorKindChip + PanoLineChart(measureQueries.byMotor asc ≤10) + 기록 리스트
// (canonical 텍스트 채널 — 차트는 추세 보조 aria-hidden) + 하단 [측정] +
// MotorFormSheet(edit) + useMotorDeleteFlow(cascade ConfirmDialog, 성공 시 '/motors' replace).
// 미존재 motorId는 라우트 404가 아니라 in-place EmptyState (layout-spec §2.2).
//
// v2.5 측정 왕복: 하단 [측정] → beginMotorMeasure + navigate('/') → S1이 수치 안정 시 자동
// 확정으로 이 모터에 MeasureRecord를 수집하고 navigate(-1)로 복귀한다(레이스 왕복 RV-1과 동일
// 경로·동일 가드). 복귀 시 mount effect가 자기 왕복만 소비해 결과를 고지한다 — 저장 성공은
// 토스트, 실패는 인라인 Alert(오류 Toast 금지 계약). 기록 반영(차트·리스트)은 수집 훅의
// invalidation 소관이라 이 페이지가 별도 갱신하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

// ── v2.8 고정 셸 레이아웃 (하단 [측정] 고정 + 기록 목록만 스크롤) ─────────────
//
// 페이지 전체를 뷰포트 높이에 고정하고 기록 목록에만 overflow를 준다. 헤더·차트·[측정]은
// 스크롤을 타지 않으므로 기록이 늘어도 [측정]이 화면 밖으로 밀리지 않는다.
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

/** 스크롤을 타지 않는 상단 블록 — 알림·종류 칩·차트 */
const fixedTopSx = {
  px: 2,
  pt: 2,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
} as const

/**
 * 유일한 스크롤 영역 — 기록 목록.
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
  // measuredAt asc ≤10 (listMeasureRecordsByMotor 결과 그대로, 재정렬 금지)
  const recordsQuery = useQuery({...measureQueries.byMotor(motorId), enabled: !corrupted})
  const motor = motorQuery.data ?? null

  // ── 수정 시트 (edit 전용 — create는 목록 페이지 소관) ────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false)
  const updateMotor = useUpdateMotor()
  const openEditSheet = () => {
    updateMotor.reset()
    setSheetOpen(true)
  }
  const handleSheetSubmit = (values: {name: string; kind: MotorKind}) => {
    updateMotor.mutate({id: motorId, patch: values}, {onSuccess: () => setSheetOpen(false)})
  }

  // ── cascade 삭제 (CP-3) — count 실측 → ConfirmDialog → deleteMotorCascade ──
  const deleteMotorCascade = useDeleteMotorCascade()
  const deleteFlow = useMotorDeleteFlow({
    deleteMotor: async id => {
      await deleteMotorCascade.mutateAsync(id)
    },
    // 삭제 성공 — 상세의 대상이 소멸했으므로 목록으로 replace (스택에 잔존 금지)
    onDeleted: () => {
      void navigate('/motors', {replace: true})
    },
  })
  const requestDelete = () => {
    if (motor === null) return
    deleteFlow.requestDelete({id: motor.id, name: motor.name})
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
    if (onArrive?.origin === 'motor' && onArrive.motorId === motorId && onArrive.measured === null) {
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

  return (
    <>
      {/* v2.8 고정 셸 — 헤더·차트·[측정]은 고정, 기록 목록만 스크롤한다 */}
      <Box sx={pageShellSx}>
      {/* [H] 화면 헤더 — [←] [h1 모터명] [수정][삭제] [ThemeToggle] */}
      <PageHeader
        onBack={handleBack}
        title={motor?.name ?? '모터 상세'}
        action={<ThemeToggle />}
        actions={
          motor !== null ? (
            // v2.6 헤더 정리: 보조·파괴 액션은 테두리를 걷어 text 톤으로 낮춘다.
            // 이전에는 outlined 사각 2개(+빨간 테두리)가 56px 헤더에서 제목 폭을 잠식하고
            // 파괴 액션이 과하게 시선을 끌었다. 라벨은 유지한다(아이콘 단독 파괴 액션 금지) —
            // 실제 안전장치는 ConfirmDialog의 명시 고지다.
            <>
              {/* 중립 톤 — 라임은 주 행동([측정]) 전용이라 보조 액션이 같은 색을 쓰지 않는다 */}
              <Button
                variant="text"
                onClick={openEditSheet}
                sx={{minWidth: 44, minHeight: '2.75rem', color: 'text.primary'}}>
                수정
              </Button>
              <Button
                variant="text"
                color="error"
                disabled={deleteFlow.isCounting}
                onClick={requestDelete}
                sx={{minWidth: 44, minHeight: '2.75rem'}}>
                삭제
              </Button>
            </>
          ) : undefined
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
          {/* ── 고정 영역: 알림 · 종류 칩 · 차트 (스크롤 대상 아님) ── */}
          <Box sx={fixedTopSx}>
            {deleteFlow.countError !== null && (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={deleteFlow.retryCount}>
                    다시 시도
                  </Button>
                }>
                {deleteFlow.countError}
              </Alert>
            )}

            {/* 왕복 수집 실패 고지 (v2.5) — 성공 위장 금지. 닫기 = slot 파기(고지의 원천 제거) */}
            {measureFailed && (
              <Alert severity="error" onClose={cancelRaceMeasure}>
                측정값을 저장하지 못했습니다 — 다시 측정해 주세요
              </Alert>
            )}

            <Box>
              <MotorKindChip kind={motor.kind} />
            </Box>

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
          </Box>

          {/* ── 스크롤 영역: 기록 목록만 ──
              헤딩은 스크롤 안에 둔다 — 고정 영역에 두면 목록이 비었을 때도 남아
              "기록 없음" 안내와 중복된 층이 생긴다 */}
          <Box sx={scrollAreaSx}>
            {records !== undefined && records.length > 0 && (
              <Box sx={{mb: 0.5}}>
                <SectionHeading meta={`${records.length}건`}>측정 기록</SectionHeading>
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
                기록 리스트 ≤10행 — 오래된 순 01부터(차트 X축과 정렬 일치, CD2-A1).
                v2.14: 좌측(회차·일시) / 우측(파노 값·rpm) 2열로 맞춘다 — 모터 카드와 같은
                스캔 축이라 화면 간 읽는 방식이 일치한다. 이전에는 값과 rpm이 한 줄에 이어 붙어
                일시 길이에 따라 값의 x 위치가 행마다 흔들렸다.
                행마다 테두리를 두르지 않고 구분선으로 한 목록으로 묶는다(레퍼런스 목록 패턴).
              */
              <Box
                component="ol"
                sx={{listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column'}}>
                {records.map((record, index) => (
                  <Box
                    component="li"
                    key={record.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 1,
                      '&:not(:last-of-type)': {
                        borderBottom: '1px solid',
                        borderBottomColor: 'divider',
                      },
                    }}>
                    <Typography
                      variant="overline"
                      component="span"
                      sx={{color: 'text.secondary', lineHeight: 1, minWidth: '1.75em'}}>
                      {String(index + 1).padStart(2, '0')}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{color: 'text.secondary'}}>
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
                      </Typography>
                    </Box>
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
            <Button variant="contained" fullWidth onClick={handleMeasure} sx={{minHeight: 48}}>
              측정
            </Button>
          </Box>
        </>
      )}
      </Box>

      {/* 시트·다이얼로그는 portal 렌더 — 고정 셸 밖에 둬 높이 계산에 끼어들지 않게 한다 */}
      {/* 수정 시트 — 닫힘 = 폼 파기, pending 중 닫힘 차단(single-flight) */}
      {motor !== null && (
        <MotorFormSheet
          open={sheetOpen}
          mode="edit"
          initial={{name: motor.name, kind: motor.kind}}
          pending={updateMotor.isPending}
          errorMessage={updateMotor.isError ? updateMotor.error.message : null}
          onSubmit={handleSheetSubmit}
          onClose={() => {
            if (!updateMotor.isPending) setSheetOpen(false)
          }}
        />
      )}

      {/* cascade 삭제 confirm — copy·pending·오류는 flow가 소유 (§3.1 스프레드 계약) */}
      <ConfirmDialog {...deleteFlow.dialogProps} />
    </>
  )
}
