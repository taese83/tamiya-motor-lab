import {Box} from '@mui/material'
import {useCreateMotor} from '@features/motor-management/api'
import {MotorFormSheet} from '@features/motor-management/ui'
import type {MotorFormValues} from '@features/motor-management/ui'
import {takeConfirmedMeasurement} from '@entities/measurement'
import type {Measurement} from '@entities/measurement'
import {RecordEntryForm} from '@features/record-entry/ui'
import {PageHeader} from '@shared/ui/page-header'
import {useToast} from '@shared/ui/toast'
import {useState} from 'react'
import {useLoaderData, useNavigate} from 'react-router'

// ─────────────────────────────────────────────────────────────────────────────
// S2 기록 입력 ('/record/new', 스택·작업) — layout-spec §5.
// handle.hideTabBar로 탭 바 없음 — 하단 도크는 RecordEntryForm이 소유한다.
// 조립 계약 (component-spec §1.4): PageHeader(←) + RecordEntryForm.
// 모터 0개 인라인 등록 flow: feature 간 직접 import 금지라 MotorFormSheet는 page가 연다.
// ─────────────────────────────────────────────────────────────────────────────

// 진입 시 확정 측정값을 정확히 1회 소비 (H-5) — loader는 내비게이션당 1회 실행이라
// StrictMode 이중 렌더·파괴적 single-slot take 충돌이 없다. 빈 slot(직접 입력·
// 새로고침 소실)이면 null — "측정값 없음" 모드로 정상 렌더 (D2, 오류 아님).
export function loader(): {measurement: Measurement | null} {
  return {measurement: takeConfirmedMeasurement()}
}

export function RecordNewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const {measurement: initialMeasurement} = useLoaderData<typeof loader>()

  // 뒤로가기 = 폼 파기, confirm 없음 (LO-2 baseline). history 스택이 없는 딥링크
  // 최초 진입이면 /motors로 replace (layout-spec §2.2).
  const handleBack = () => {
    const historyIndex = (window.history.state as {idx?: number} | null)?.idx ?? 0
    if (historyIndex > 0) void navigate(-1)
    else void navigate('/motors', {replace: true})
  }

  // 저장 성공 (§5.2): pop(+딥링크 replace) + 성공 토스트 — 실패 처리는 폼 소유(REQ-ST-005)
  const handleSaved = () => {
    toast.showSuccess('저장됨')
    handleBack()
  }

  // 모터 0개 인라인 등록 flow — 생성 성공 시 autoSelectMotorId 주입으로 자동 선택 (§5.2)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [autoSelectMotorId, setAutoSelectMotorId] = useState<string | null>(null)
  const createMotor = useCreateMotor()
  const handleRegisterSubmit = (values: MotorFormValues) => {
    createMotor.mutate(
      {
        name: values.name,
        statusGrade: values.grade,
        ...(values.memo === '' ? {} : {statusMemo: values.memo}),
      },
      {
        onSuccess: motor => {
          setAutoSelectMotorId(motor.id)
          setSheetOpen(false)
        },
      },
    )
  }

  return (
    <>
      {/* [H] 스택 헤더 — 이탈 수단은 [←]와 브라우저 뒤로가기뿐 (탭 바 숨김) */}
      <PageHeader title="기록 입력" onBack={handleBack} />

      {/* [M]+[D] 폼 5항목 + 하단 고정 [저장] 도크 — 전부 RecordEntryForm 소유 (도크 중복 금지) */}
      <Box sx={{px: 2, py: 2}}>
        <RecordEntryForm
          initialMeasurement={initialMeasurement}
          onSaved={handleSaved}
          onRegisterMotor={() => setSheetOpen(true)}
          autoSelectMotorId={autoSelectMotorId}
        />
      </Box>

      <MotorFormSheet
        open={sheetOpen}
        mode="create"
        pending={createMotor.isPending}
        errorMessage={createMotor.error?.message ?? null}
        onSubmit={handleRegisterSubmit}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}
