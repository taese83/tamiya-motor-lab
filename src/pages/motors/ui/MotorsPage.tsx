import {useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext} from 'react-router'

import {motorQueries} from '@entities/motor'
import {AuthMenu, useSession} from '@features/auth'
import {useCreateMotor, useDeleteMotorCascade, useUpdateMotor} from '@features/motor-management/api'
import {
  useMotorDeleteFlow,
  useMotorKindFilter,
  useMotorSort,
} from '@features/motor-management/model'
import {MotorFormSheet, MotorKindFilter, MotorList} from '@features/motor-management/ui'
import {layoutTokens} from '@shared/config/design-tokens'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {SegmentControl} from '@shared/ui/segment-control'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {Motor} from '@entities/motor'
import type {MotorKind} from '@shared/config/domain'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S3 모터 목록 ('/motors') — 버그 리포트 #2: 인라인 확장을 상세 페이지로 전환.
// 조립 계약: PageHeader(+모터/ThemeToggle) + MotorKindFilter(종류 필터) + SegmentControl(정렬) +
// MotorList(행 탭 → 상세 진입, 스와이프 수정·삭제) + MotorFormSheet(create·edit) + EmptyState.
// corrupt면 본문 = RecoveryPanel. 차트·측정 기록 목록은 상세 페이지 소유.
//
// v2.16: 행 스와이프 트레이로 수정 시트·cascade 삭제 플로우를 이 페이지도 소유(상세와 훅 공유).
// v2.26(사용자): **DnD 수동 정렬 제거**, 정렬 3종(최근 등록순 기본·파노 높은순·이름순, 영속)으로 대체.
//   필터 → 정렬 순으로 뷰 계층에서 적용(데이터층 sortOrder 불변). 필터 0건은 EmptyState와 다른 경로.
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

/** 필터 훅 입력 안정 참조 — pending/error 시 매 렌더 새 배열을 만들지 않게 한다 */
const EMPTY_SUMMARIES: ReadonlyArray<never> = []

// ── R49 목록 컨트롤 고정 ─────────────────────────────────────────────────────
// 탭(MotorKindFilter=MUI scrollable Tabs)과 정렬 필터(SegmentControl)를 고정 헤더 바로
// 아래에 sticky로 붙인다 — 목록만 스크롤하고 컨트롤은 항상 보인다. 문서 스크롤 구조는
// 유지하고(PageHeader가 이미 쓰는 sticky top:0와 동일 메커니즘) 헤더 높이만큼 오프셋한다.
// 불투명 배경으로 스크롤되는 목록이 뒤로 비치지 않게 하고, z-index로 목록이 컨트롤 밑을
// 지나가게 한다. 내부 gap과 pb로 안정 흐름 시의 필터↔정렬↔목록 여백(각 12px)을 보존한다.
// RacePage에도 동일 상수를 둔다(loginGateSx처럼 화면별 로컬 — pages는 공유 모듈을 새로 만들지 않는다).
const stickyControlsSx = {
  position: 'sticky',
  top: 'calc(3.5rem + var(--mml-safe-top, 0px))',
  zIndex: (theme: {zIndex: {appBar: number}}) => theme.zIndex.appBar - 1,
  backgroundColor: 'background.default',
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
  pb: 1.5,
} as const

// v2.x(사용자) — 모터도 레이스와 동일하게 로그인 필수. 비로그인 시 본문 대체 중앙 게이트.
// RacePage.loginGateSx와 동일 규칙(콘텐츠 영역 높이 채워 세로 중앙 정렬).
const loginGateSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 1,
  px: 3,
  minHeight: `calc(100dvh - 3.5rem - ${layoutTokens.bottomNavHeight}px - ${layoutTokens.safeAreaBottom})`,
} as const

export function MotorsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'
  // v2.x(사용자) — 로그인 게이트(레이스와 동일). 서버 세션 조회(로컬 정적 서버는 null=미로그인).
  const {user, isPending: sessionPending} = useSession()
  const loggedIn = user !== null

  // v2: 파생 join은 entity 데이터 계층 소유(listMotorSummaries) — 페이지 합성 제거.
  // 비로그인이면 본문을 렌더하지 않으므로 조회도 걸지 않는다(레이스와 동일).
  const summariesQuery = useQuery({...motorQueries.summaries(), enabled: !corrupted && loggedIn})

  // 행 탭 → 상세 페이지 push (v2.2 — 차트·기록·수정·삭제는 상세 소유)
  const openDetail = (motorId: string) => {
    void navigate(`/motors/${motorId}`)
  }

  // ── 등록·수정 시트 ─────────────────────────────────────────────────────────
  // v2.16: edit가 이 페이지에도 생겼다(행 스와이프 [수정]). create/edit를 boolean 2개로 두면
  // "둘 다 열림" 같은 불가능한 상태가 타입에 남으므로 판별 union 하나로 소유한다.
  const [sheet, setSheet] = useState<{mode: 'create'} | {mode: 'edit'; motor: Motor} | null>(null)
  const createMotor = useCreateMotor()
  const updateMotor = useUpdateMotor()
  const sheetPending = createMotor.isPending || updateMotor.isPending

  const openCreateSheet = () => {
    createMotor.reset()
    setSheet({mode: 'create'})
  }

  const openEditSheet = (motor: Motor) => {
    updateMotor.reset()
    setSheet({mode: 'edit', motor})
  }

  const handleSheetSubmit = (values: {name: string; kind: MotorKind}) => {
    if (sheet === null) return
    if (sheet.mode === 'create') {
      createMotor.mutate(values, {onSuccess: () => setSheet(null)})
      return
    }
    updateMotor.mutate({id: sheet.motor.id, patch: values}, {onSuccess: () => setSheet(null)})
  }

  // ── cascade 삭제 (CP-3) — count 실측 → ConfirmDialog → deleteMotorCascade ──
  // 스와이프는 이 플로우의 **트리거**만 담당한다. 제스처로 즉시 삭제되는 경로는 만들지 않는다:
  // 이 삭제는 측정·레이스 기록까지 함께 지우고(cascade), 그 건수는 목록 행에 보이지 않는다.
  const deleteMotorCascade = useDeleteMotorCascade()
  const deleteFlow = useMotorDeleteFlow({
    deleteMotor: async id => {
      await deleteMotorCascade.mutateAsync(id)
    },
    // 목록에 그대로 머문다(상세와 달리 이동할 곳이 없다) — 사라진 행을 무음으로 두지 않게 고지
    onDeleted: target => {
      toast.showSuccess(`'${target.name}' 삭제되었습니다`)
    },
  })

  const summaries = summariesQuery.data

  // v2.4 종류 필터(영속·모터+레이스 공유) → v2.26 정렬(최근/파노/이름, 영속). 둘 다 뷰 계층 —
  // 데이터층 순서(sortOrder)는 건드리지 않는다. 필터 먼저 걸고 그 결과를 정렬한다.
  const kindFilter = useMotorKindFilter(summaries ?? EMPTY_SUMMARIES)
  const motorSort = useMotorSort(kindFilter.filtered)

  return (
    <>
      {/* [H] 화면 헤더 — [h1 모터] [+ 모터] [ThemeToggle] [Avatar] (v2.43: 아바타 전역·오른쪽 끝) */}
      <PageHeader
        title="모터"
        actions={
          <>
            {/* v2.6: 화면의 주 행동이므로 시그니처 라임 contained(컷코너)로 위계를 명확히 한다.
                v2.x(사용자): 로그인 게이트와 정합 — 비로그인 시엔 생성 진입점도 숨긴다(게이트 취지). */}
            {loggedIn && (
              <Button variant="contained" onClick={openCreateSheet} sx={{minHeight: '2.75rem'}}>
                + 모터
              </Button>
            )}
            <ThemeToggle />
            <AuthMenu />
          </>
        }
      />

      {/* [M] 본문 — 로그인 게이트 / corrupt / loading / 읽기 오류(D-10) / empty / 목록 */}
      {sessionPending ? (
        // 세션 확인 중 — 콘텐츠/게이트 플래시 방지용 중립 안내
        <Typography color="text.secondary" sx={{px: 2, py: 2}}>
          확인 중…
        </Typography>
      ) : corrupted ? (
        // 저장소 손상 복구는 로그인 게이트보다 우선한다 — 로컬 IndexedDB 복구는 계정과 무관하므로
        // 미로그인 상태에서도 전역 배너 [복구 옵션] → 이 패널에 도달해야 한다(게이트가 가리면 데드엔드).
        <Box sx={{px: 2, py: 2}}>
          <RecoveryPanel
            onRetry={shell.retryPersistence}
            retryPending={shell.persistenceRetryPending}
            onResetAllData={async () => {
              // resetAllData 성공 시 queryClient.clear()는 셸(resetPersistedData) 계약 — 여기는 토스트만
              const ok = await shell.resetPersistedData()
              if (ok) toast.showSuccess('초기화되었습니다')
              return ok
            }}
          />
        </Box>
      ) : !loggedIn ? (
        // v2.x 로그인 게이트(레이스와 동일) — 모터 목록은 로그인 이후에만. 우상단 아바타로 로그인 진입.
        <Box sx={loginGateSx}>
          <Typography variant="h2" component="p">
            로그인 후에 사용하세요
          </Typography>
          <Typography variant="body2" color="text.secondary">
            오른쪽 위 프로필을 눌러 로그인하면 모터 목록을 볼 수 있습니다
          </Typography>
        </Box>
      ) : summariesQuery.isPending ? (
        <Typography color="text.secondary" sx={{px: 2, py: 2}}>
          불러오는 중…
        </Typography>
      ) : summariesQuery.isError ? (
        // D-10: 읽기 실패는 오류로 표면화 — 빈 목록 위장 금지, [다시 시도] = 명시 refetch
        <Box sx={{px: 2, py: 2}}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  void summariesQuery.refetch()
                }}>
                다시 시도
              </Button>
            }>
            모터 목록을 불러오지 못했습니다
            {/* R35: 원인 문구 표면화 — 기기에서 data-corrupt(데이터)와 storage(저장소) 실패를 구분해 진단 */}
            {summariesQuery.error instanceof Error && summariesQuery.error.message !== '' && (
              <Box component="span" sx={{display: 'block', mt: 0.5, typography: 'caption', opacity: 0.85}}>
                {summariesQuery.error.message}
              </Box>
            )}
          </Alert>
        </Box>
      ) : summaries === undefined || summaries.length === 0 ? (
        // E-1: 빈 상태 — 오류 위장 금지
        <EmptyState
          title="첫 모터를 등록하세요"
          description="모터를 등록하면 측정·레이스 기록을 남길 수 있습니다"
          actionLabel="+ 모터"
          onAction={openCreateSheet}
        />
      ) : (
        /* R49: 컨트롤(탭+정렬)은 sticky로 고정, 목록만 스크롤. 안정 흐름 여백은 sticky 블록의
           gap/pb가 소유하므로 바깥 Box의 gap은 제거한다(이중 여백 방지). */
        <Box sx={{px: 2, py: 2, display: 'flex', flexDirection: 'column'}}>
          {/* R49 고정 컨트롤 블록 — 헤더 아래 sticky. 종류 필터 탭 + 정렬 세그먼트. */}
          <Box sx={stickyControlsSx}>
            {/* 종류 필터 — 모터가 1건 이상일 때만 노출(빈 목록에 죽은 컨트롤 금지) */}
            <MotorKindFilter
              options={kindFilter.options}
              selectedKind={kindFilter.selectedKind}
              onSelect={kindFilter.select}
              onClear={kindFilter.clear}
            />

            {/* v2.26 정렬 — 최근 등록순(기본)·파노 높은순·이름순. 선택은 영속(재시작 유지).
                v2.27: rounded — 위 종류 필터 칩과 동일한 pill 톤으로 세그먼트 바깥 모서리를 라운딩 */}
            <SegmentControl
              aria-label="모터 정렬"
              rounded
              options={motorSort.options.map(o => ({value: o.key, label: o.label}))}
              value={motorSort.sort}
              onChange={next => {
                if (next !== null) motorSort.setSort(next)
              }}
            />
          </Box>

          {kindFilter.filtered.length === 0 ? (
            // 필터 결과 0건 — 전체 0건(EmptyState)과 다른 경로. 빠져나갈 액션을 반드시 제공한다
            <Box
              sx={{py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
              <Typography color="text.secondary">선택한 종류의 모터가 없습니다</Typography>
              <Button variant="outlined" onClick={kindFilter.clear} sx={{minHeight: 44}}>
                필터 해제
              </Button>
            </Box>
          ) : (
            <>
              {/*
                count 조회 실패 — dialog를 열지 않고 트리거 인근에 문구 + [다시 시도](§3.1).
                삭제 대상 건수를 모르는 채로 파괴 확인을 띄우지 않는다.
              */}
              {deleteFlow.countError !== null && (
                <Alert
                  severity="error"
                  role="alert"
                  // R49: 바깥 Box의 gap을 제거했으므로 목록과의 간격(12px)을 여기서 명시한다
                  sx={{mb: 1.5}}
                  action={
                    <Button color="inherit" size="small" onClick={deleteFlow.retryCount}>
                      다시 시도
                    </Button>
                  }>
                  {deleteFlow.countError}
                </Alert>
              )}
              {/* v2.26: 정렬(motorSort.sorted) 적용된 순서로 렌더. DnD 제거로 onReorder 없음 */}
              <MotorList
                summaries={motorSort.sorted}
                onSelect={openDetail}
                onEdit={openEditSheet}
                onDelete={motor => deleteFlow.requestDelete({id: motor.id, name: motor.name})}
                actionsPending={deleteFlow.isCounting}
              />
            </>
          )}
        </Box>
      )}

      {/* 등록·수정 시트 — 닫힘 = 폼 파기, pending 중 닫힘 차단(single-flight) */}
      <MotorFormSheet
        open={sheet !== null}
        mode={sheet?.mode ?? 'create'}
        {...(sheet?.mode === 'edit'
          ? {initial: {name: sheet.motor.name, kind: sheet.motor.kind}}
          : {})}
        pending={sheetPending}
        errorMessage={
          sheet?.mode === 'edit'
            ? updateMotor.isError
              ? updateMotor.error.message
              : null
            : createMotor.isError
              ? createMotor.error.message
              : null
        }
        onSubmit={handleSheetSubmit}
        onClose={() => {
          if (!sheetPending) setSheet(null)
        }}
      />

      {/* cascade 삭제 확인 — 실측 건수 고지는 useMotorDeleteFlow가 문구에 주입 */}
      <ConfirmDialog {...deleteFlow.dialogProps} />
    </>
  )
}
