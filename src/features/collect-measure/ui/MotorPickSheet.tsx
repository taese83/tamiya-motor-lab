import {Alert, Box, Button, List, ListItemButton, Tab, Tabs, Typography} from '@mui/material'
import {useState} from 'react'

import {MotorKindChip} from '@entities/motor'
import {numericTypography} from '@shared/config/design-tokens'
import {MOTOR_KINDS, MOTOR_KIND_LABELS} from '@shared/config/domain'
import {formatFanoHz, formatRpm} from '@shared/lib/format'
import {BottomSheet} from '@shared/ui/bottom-sheet'

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
  /** 새 모터 등록 — MotorFormSheet로 "닫고 열기 교체"(§3.2, 오케스트레이션은 useCollectFlow) */
  onRequestRegister: () => void
  onClose: () => void
}

/** [전체] 탭의 Tabs value — MotorKind와 충돌하지 않는 예약값 (MotorKindFilter와 동일 관례) */
const ALL_VALUE = '__all__'

/**
 * 모터 선택 시트 (component-spec §4.2 — M-6). BottomSheet 소비 — 시트 위 시트 금지.
 * 스냅샷 표시 행 = 실제 기록될 값(표시-기록 일치 계약). 행은 native button(ListItemButton),
 * accessible name은 자연 텍스트(이름 + 종류 라벨 + 최신 파노)로 구성된다.
 * 상태 전수: populated / empty(등록 유도) / pending / error / closed.
 *
 * R39(사용자 ②③): 종류별 탭 필터(존재 종류 ≥2일 때만) + [+ 새 모터 추가] 상시 하단 버튼.
 * feature 간 import 금지 계약으로 motor-management의 MotorKindFilter를 쓰지 않고
 * 같은 관례(단일 선택 Tabs·ALL sentinel)로 여기서 직접 렌더한다. 필터는 로컬 UI 상태 — 영속 금지.
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
  const [kindFilter, setKindFilter] = useState<MotorKind | null>(null)
  // 표시 순서는 MOTOR_KINDS(제품 라인업 순) — 목록에 존재하는 종류만 탭이 된다
  const presentKinds = MOTOR_KINDS.filter(kind => motors.some(motor => motor.kind === kind))
  // 선택 종류가 목록에서 사라져도(삭제 등) [전체]로 강등 — MUI Tabs invalid value 경고 방어
  const effectiveFilter =
    kindFilter !== null && presentKinds.includes(kindFilter) ? kindFilter : null
  const filtered =
    effectiveFilter === null ? motors : motors.filter(motor => motor.kind === effectiveFilter)
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
        // R39: 액션 있는 EmptyState 대신 중립 문구 — 등록 진입은 하단 상시 버튼 1곳으로 통일
        <Typography component="p" sx={{color: 'text.secondary'}}>
          등록된 모터가 없습니다 — 아래에서 추가하세요
        </Typography>
      ) : (
        <>
          {presentKinds.length >= 2 && (
            <Tabs
              value={effectiveFilter ?? ALL_VALUE}
              onChange={(_event, value: string) =>
                setKindFilter(value === ALL_VALUE ? null : (value as MotorKind))
              }
              variant="scrollable"
              scrollButtons={false}
              aria-label="모터 종류 필터"
              sx={{
                minHeight: 44,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {minHeight: 44, minWidth: 'auto', px: 1.5, textTransform: 'none'},
              }}>
              <Tab value={ALL_VALUE} label="전체" />
              {presentKinds.map(kind => (
                <Tab key={kind} value={kind} label={MOTOR_KIND_LABELS[kind]} />
              ))}
            </Tabs>
          )}
          <Box sx={{maxHeight: '50vh', overflowY: 'auto'}}>
            {filtered.length === 0 ? (
              // effectiveFilter 강등 계약상 정상 경로에선 도달하지 않는 방어선(렌더 프레임 간 잔상 대비)
              <Typography component="p" sx={{color: 'text.secondary', py: 1.5}}>
                이 종류의 모터가 없습니다
              </Typography>
            ) : (
              <List disablePadding>
                {filtered.map(motor => (
                  <ListItemButton
                    key={motor.id}
                    disabled={pending}
                    onClick={() => onSelect(motor.id)}
                    sx={{minHeight: '3.5rem', gap: 1, px: 1.5}}>
                    <Typography
                      variant="body1"
                      noWrap
                      sx={{fontWeight: 600, flex: 1, minWidth: 0}}>
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
            )}
          </Box>
        </>
      )}
      {/*
        v2.23(사용자) → R39(사용자 ③): 모터 유무와 무관하게 항상 노출한다. 이전엔 0개일 때
        EmptyState 액션에만 등록 진입이 있어 경로가 상태별로 갈라졌다 — 이제 이 버튼 1곳이다.
        onRequestRegister는 empty 상태와 동일 오케스트레이션(useCollectFlow가 시트 교체)을 쓴다 —
        등록 성공 시 그 모터로 즉시 이 스냅샷을 수집한다.
      */}
      <Button
        fullWidth
        variant="contained"
        onClick={onRequestRegister}
        disabled={pending}
        sx={{mt: 1.5, minHeight: 48}}>
        + 새 모터 추가
      </Button>
    </BottomSheet>
  )
}
