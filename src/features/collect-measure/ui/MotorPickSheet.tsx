import {Alert, Button, List, ListItemButton, Typography} from '@mui/material'
import {MotorKindChip} from '@entities/motor'
import {numericTypography} from '@shared/config/design-tokens'
import {formatFanoHz, formatRpm} from '@shared/lib/format'
import {BottomSheet} from '@shared/ui/bottom-sheet'
import {EmptyState} from '@shared/ui/empty-state'

import type {MotorKind} from '@shared/config/domain'

export interface MotorPickItem {
  /** stable UUID — 행 이벤트는 렌더 index가 아니라 이 id로만 (Non-Negotiable) */
  id: string
  name: string
  kind: MotorKind
  /** MotorSummary.lastMeasure 파생 — null → "기록 없음" (중립, 오류 위장 금지) */
  lastPanoHz: number | null
}

export interface MotorPickSheetProps {
  open: boolean
  /** [기록] 탭 시점 고정 스냅샷(SC2-A3·MR-2) — 시트 열림 중 측정이 계속돼도 이 값이 기록된다 */
  snapshot: {panoHz: number; rpm: number} | null
  /** sortOrder 순 — 정렬은 데이터 계층(listMotorSummaries) 소유, 여기서 재정렬 금지 */
  motors: ReadonlyArray<MotorPickItem>
  /** 수집 중 행 — 비null이면 전 행 탭 차단(single-flight), 해당 행은 "기록 중…" 라벨 */
  pendingMotorId: string | null
  /** 수집 실패 — 시트 유지 + role="alert" 배너 + 행 재탭 가능 (오류 토스트 금지 계약) */
  errorMessage: string | null
  onSelect: (motorId: string) => void
  /** 모터 0개 — MotorFormSheet로 "닫고 열기 교체"(§3.2, 오케스트레이션은 useCollectFlow) */
  onRequestRegister: () => void
  onClose: () => void
}

/**
 * 모터 선택 시트 (component-spec §4.2 — M-6). BottomSheet 소비 — 시트 위 시트 금지.
 * 스냅샷 표시 행 = 실제 기록될 값(표시-기록 일치 계약). 행은 native button(ListItemButton),
 * accessible name은 자연 텍스트(이름 + 종류 라벨 + 최신 파노)로 구성된다.
 * 상태 전수: populated / empty(등록 유도) / pending / error / closed.
 */
export function MotorPickSheet({
  open,
  snapshot,
  motors,
  pendingMotorId,
  errorMessage,
  onSelect,
  onRequestRegister,
  onClose,
}: MotorPickSheetProps) {
  const pending = pendingMotorId !== null
  return (
    <BottomSheet open={open} title="기록할 모터" onClose={onClose}>
      {snapshot !== null && (
        <Typography component="p" sx={{...numericTypography.listValue, mb: 1.5}}>
          {formatFanoHz(snapshot.panoHz)} · {formatRpm(snapshot.rpm)} rpm
        </Typography>
      )}
      {errorMessage !== null && (
        <Alert severity="error" role="alert" sx={{mb: 1.5}}>
          {errorMessage}
        </Alert>
      )}
      {motors.length === 0 ? (
        <EmptyState
          title="등록된 모터가 없습니다"
          actionLabel="모터 등록"
          onAction={onRequestRegister}
        />
      ) : (
        <>
          <List disablePadding>
            {motors.map(motor => (
              <ListItemButton
                key={motor.id}
                disabled={pending}
                onClick={() => onSelect(motor.id)}
                sx={{minHeight: '3.5rem', gap: 1, px: 1.5}}>
                <Typography variant="body1" noWrap sx={{fontWeight: 600, flex: 1, minWidth: 0}}>
                  {motor.name}
                </Typography>
                <MotorKindChip kind={motor.kind} />
                <Typography
                  component="span"
                  sx={{...numericTypography.listValue, color: 'text.secondary'}}>
                  {motor.id === pendingMotorId
                    ? '기록 중…'
                    : motor.lastPanoHz !== null
                      ? formatFanoHz(motor.lastPanoHz)
                      : '기록 없음'}
                </Typography>
              </ListItemButton>
            ))}
          </List>
          {/*
          v2.23(사용자): 모터 리스트가 있어도 그 아래에 [새 모터 추가]를 노출한다. 이전에는
          모터 0개일 때만 등록 유도가 있어, 측정값을 새 모터로 기록하려면 화면을 나갔다 와야 했다.
          onRequestRegister는 empty 상태와 동일 오케스트레이션(useCollectFlow가 시트 교체)을 쓴다 —
          등록 성공 시 그 모터로 즉시 이 스냅샷을 수집한다.
        */}
          <Button
            fullWidth
            variant="outlined"
            onClick={onRequestRegister}
            disabled={pending}
            sx={{mt: 1.5, minHeight: 48}}>
            + 새 모터 추가
          </Button>
        </>
      )}
    </BottomSheet>
  )
}
