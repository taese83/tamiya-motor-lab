import {Box, Collapse, Typography} from '@mui/material'
import {layoutTokens, measureStatusTokens, motionTokens} from '@shared/config/design-tokens'
import {formatFanoHz, formatRpm} from '@shared/lib/format'
import {BigNumber} from '@shared/ui/big-number'
import type {ReactNode} from 'react'
import {S1_SETTINGS_HELP_ID} from './constants'
import type {MeasureView} from './measure-view'
import {RpmGauge} from './RpmGauge'

export interface MeasureFiguresProps {
  view: MeasureView
}

// 내부 5행 슬롯 높이 (rem/clamp — 200% text resize 시 비례 확장, layout-spec §10)
const ROW_HEIGHTS = {
  rpm: 'clamp(3.5rem, 18vw, 6rem)', // numericTypography.rpmValue fontSize × lineHeight 1
  unit: '1.5rem',
  fano: 'clamp(1.65rem, 8.45vw, 2.3rem)', // fanoValue fontSize × lineHeight 1.3
  aux: '1.5rem',
} as const

function Row({height, children}: {height: string; children?: ReactNode}) {
  return (
    <Box
      sx={{
        height,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {children}
    </Box>
  )
}

/** 수치 5행 스캐폴드 — measuring·weak-signal·stable이 공유(D-9 왕복 시 흔들림 0) */
function FigureRows({
  rpmText,
  panoText,
  valueColor,
  auxText,
}: {
  rpmText: string | null
  panoText: string | null
  valueColor: string
  auxText?: string | undefined
}) {
  return (
    <>
      <Row height={ROW_HEIGHTS.rpm}>
        {/* weak-signal은 value=null → "—"(동일 rpmValue 타이포) + sr "측정값 없음" */}
        <BigNumber size="rpm" value={rpmText} valueColor={valueColor} />
      </Row>
      <Row height={ROW_HEIGHTS.unit}>
        {rpmText !== null && (
          <Typography variant="caption" color="text.secondary">
            RPM
          </Typography>
        )}
      </Row>
      <Row height={ROW_HEIGHTS.fano}>
        {panoText !== null && <BigNumber size="fano" value={panoText} valueColor={valueColor} />}
      </Row>
      <Row height={ROW_HEIGHTS.aux}>
        {auxText !== undefined && (
          <Typography variant="body2" sx={{color: valueColor, textAlign: 'center'}}>
            {auxText}
          </Typography>
        )}
      </Row>
      <Row height={ROW_HEIGHTS.aux} />
    </>
  )
}

function CenterMessage({color, children}: {color: string; children: ReactNode}) {
  return (
    <Typography variant="body1" sx={{m: 'auto', color, textAlign: 'center'}}>
      {children}
    </Typography>
  )
}

/** no-permission 영구 — 설정 경로 Collapse (Z2 내부 스크롤 수용, 존 높이 불변) */
function PermanentPermissionHelp({open, color}: {open: boolean; color: string}) {
  return (
    <Box
      sx={{
        m: 'auto',
        py: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}>
      <Typography variant="body1" sx={{color, textAlign: 'center'}}>
        브라우저 설정에서 마이크 권한을 허용해야 합니다
      </Typography>
      <Collapse in={open}>
        <Box id={S1_SETTINGS_HELP_ID} sx={{color}}>
          <Typography
            variant="body2"
            component="ul"
            sx={{m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5}}>
            <li>iOS Safari: 설정 → Safari(또는 앱 → Safari) → 마이크 허용</li>
            <li>Android Chrome: 주소창 자물쇠 아이콘 → 권한 → 마이크 허용</li>
            <li>매번 묻지 않게 하기 — iOS Safari: 주소창 ᴀA → 웹 사이트 설정 → 마이크 → 허용</li>
            <li>매번 묻지 않게 하기 — Chrome: 권한 요청에서 “방문할 때마다 허용” 선택</li>
            <li>변경 후 이 페이지를 새로고침하세요</li>
          </Typography>
        </Box>
      </Collapse>
    </Box>
  )
}

function figuresContent(view: MeasureView, valueFg: string): ReactNode {
  switch (view.status) {
    case 'idle':
      // 비HTTPS 안내는 권한 문구와 혼용 금지 (REQ-ST-002)
      return (
        <CenterMessage color={valueFg}>
          {view.secureContext
            ? '모터를 공회전시키고 폰을 가까이 대세요'
            : 'HTTPS에서만 측정할 수 있습니다'}
        </CenterMessage>
      )
    case 'measuring':
    case 'stable':
      return (
        <FigureRows
          rpmText={formatRpm(view.rpm)}
          panoText={formatFanoHz(view.panoHz)}
          valueColor={valueFg}
        />
      )
    case 'weak-signal':
      return (
        <FigureRows
          rpmText={null}
          panoText={null}
          valueColor={valueFg}
          auxText="신호가 약합니다. 모터에 더 가까이 대세요"
        />
      )
    case 'no-permission':
      return view.permanent ? (
        <PermanentPermissionHelp open={view.settingsHelpOpen} color={valueFg} />
      ) : (
        <CenterMessage color={valueFg}>마이크 권한이 거부되었습니다</CenterMessage>
      )
    case 'suspended':
      return <CenterMessage color={valueFg}>iOS 정책으로 오디오가 중지되었습니다</CenterMessage>
  }
}

/**
 * S1 Z2 수치 존 (component-spec §2.4) — `--s1-figure-h` 고정 높이 소유(min/max 동일).
 * 6-status 전부 동일 높이 — 상태 전환으로 어떤 요소도 이동하지 않는다(layout-spec §4.1).
 * measureStatusTokens 소비자는 MeasureStatusLabel·RpmGauge와 이 컴포넌트뿐(DS §9).
 * aria-live 없음 — 실시간 수치 갱신은 절대 announce하지 않는다(§2.6, 알림은 Z1 단일 채널).
 *
 * v2: RpmGauge(타코미터)는 존을 가득 채우는 배경 오버레이(absolute·aria-hidden)로 깔리고
 * 수치 5행/안내는 그 위 전경층에 그대로 얹힌다(DS §9 "게이지+수치 오버레이") —
 * §3.4 고정 높이 clamp는 무변경, 6-status 전환에도 레이아웃 불변.
 */
export function MeasureFigures({view}: MeasureFiguresProps) {
  const visual = measureStatusTokens[view.status]
  const scrollable = view.status === 'no-permission' && view.permanent
  return (
    <Box
      sx={{
        '--s1-figure-h': layoutTokens.measureValueMinHeight,
        height: 'var(--s1-figure-h)',
        minHeight: 'var(--s1-figure-h)',
        maxHeight: 'var(--s1-figure-h)',
        backgroundColor: visual.bg,
        // stable 진입 tint 1회(white→blue50) — 그 외 상태 전환은 즉시. reduced-motion은 전역 0ms
        transition:
          view.status === 'stable'
            ? `background-color ${motionTokens.stableTransitionMs}ms ease-out`
            : 'none',
        position: 'relative',
      }}>
      {/* 타코미터 배경층 — 장식(aria-hidden), viewBox 고정이라 존 스케일에만 따라간다(§9) */}
      <Box aria-hidden="true" sx={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <RpmGauge view={view} />
      </Box>
      {/* 전경 콘텐츠층 — 기존 5행 스캐폴드·안내(스크린리더 canonical 경로 무변경) */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: scrollable ? 'flex-start' : 'center',
          overflowY: scrollable ? 'auto' : 'hidden',
          px: 2,
        }}>
        {figuresContent(view, visual.valueFg)}
      </Box>
    </Box>
  )
}
