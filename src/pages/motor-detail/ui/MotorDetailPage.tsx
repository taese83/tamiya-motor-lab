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
      {/* [H] 화면 헤더 — [←] [h1 모터명] [수정][삭제] [ThemeToggle] */}
      <PageHeader
        onBack={handleBack}
        title={motor?.name ?? '모터 상세'}
        action={<ThemeToggle />}
        actions={
          motor !== null ? (
            <>
              <Button variant="outlined" onClick={openEditSheet} sx={{minHeight: '2.75rem'}}>
                수정
              </Button>
              <Button
                variant="outlined"
                disabled={deleteFlow.isCounting}
                onClick={requestDelete}
                sx={{minHeight: '2.75rem', color: 'error.main', borderColor: 'error.main'}}>
                삭제
              </Button>
            </>
          ) : undefined
        }
      />

      {corrupted ? (
        <Box sx={{px: 2, py: 2}}>
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
        <Typography color="text.secondary" sx={{px: 2, py: 2}}>
          불러오는 중…
        </Typography>
      ) : motorQuery.isError ? (
        <Box sx={{px: 2, py: 2}}>
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
        <EmptyState
          title="모터를 찾을 수 없습니다"
          description="삭제되었거나 잘못된 주소입니다"
          actionLabel="모터 목록으로"
          onAction={() => {
            void navigate('/motors', {replace: true})
          }}
        />
      ) : (
        <Box sx={{px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5}}>
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
            // 기록 0건 — 안내 텍스트 블록 (오류 위장 금지). v2.5: 하단 [측정]으로 유도
            <Typography variant="body2" sx={{color: 'text.secondary'}}>
              아직 기록 없음 — 아래 [측정]으로 첫 기록을 수집하세요
            </Typography>
          ) : (
            <>
              {/* 차트는 추세 보조(aria-hidden) — canonical 데이터는 아래 기록 리스트 텍스트 */}
              <PanoLineChart
                points={records.map(record => ({
                  id: record.id,
                  measuredAt: record.measuredAt,
                  panoHz: record.panoHz,
                }))}
              />
              {/* 기록 리스트 ≤10행 — 오래된 순 01부터(차트 X축과 정렬 일치, CD2-A1) */}
              <Box
                component="ol"
                sx={{listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.5}}>
                {records.map((record, index) => (
                  <Box
                    component="li"
                    key={record.id}
                    sx={{display: 'flex', alignItems: 'baseline', gap: 1}}>
                    <Typography
                      variant="overline"
                      component="span"
                      sx={{color: 'text.secondary', lineHeight: 1.5, minWidth: '1.5em'}}>
                      {String(index + 1).padStart(2, '0')}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{color: 'text.secondary'}}>
                      {formatDateTimeShort(record.measuredAt)}
                    </Typography>
                    <Typography component="span" sx={{...numericTypography.listValue, ml: 'auto'}}>
                      {formatFanoHz(record.panoHz)}
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{color: 'text.secondary', fontVariantNumeric: 'tabular-nums lining-nums'}}>
                      · {formatRpm(record.rpm)} rpm
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}

          {/*
            v2.5 하단 [측정] — 레이스 왕복과 동일 방식(S1 자동 확정 후 자동 복귀).
            기록 0건에서도 노출한다(첫 수집 진입점). primary contained 48px.
          */}
          <Box sx={{mt: `${layoutTokens.sectionGap}px`}}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleMeasure}
              sx={{minHeight: 48}}>
              측정
            </Button>
          </Box>
        </Box>
      )}

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
