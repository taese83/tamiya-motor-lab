import {Box, Collapse, Typography} from '@mui/material'
import {darkColor, layoutTokens, measureStatusTokens} from '@shared/config/design-tokens'
import {formatPanoValue, formatRpm} from '@shared/lib/format'
import {BigNumber} from '@shared/ui/big-number'
import type {ReactNode} from 'react'
import {S1_SETTINGS_HELP_ID} from './constants'
import type {MeasureView} from './measure-view'
import {PanoGauge} from './PanoGauge'

export interface MeasureFiguresProps {
  view: MeasureView
}

/** 값 없음 placeholder — BigNumber(null)는 sr-only를 동반하므로 보조 행은 aria-hidden dash만 */
const EM_DASH = '—'

/**
 * view 8종 → measureStatusTokens 6키 매핑 (component-spec v2 §2.3과 동일 규칙):
 * starting·insecure·awaiting-gesture → idle / 나머지는 동명 키. `stable` 토큰 키는 소비처 0
 * (design-tokens 6키 구조는 불변 — 잔존 무해, DS 계약 유지).
 */
function statusTokenKey(view: MeasureView): keyof typeof measureStatusTokens {
  switch (view.status) {
    case 'starting':
    case 'insecure':
    case 'awaiting-gesture':
      return 'idle'
    default:
      return view.status
  }
}

/** 문구 슬롯(1줄 고정 — 없으면 빈 줄 유지) copy — layout-spec v2 §4.2 표와 1:1 */
function messageFor(view: MeasureView): string | null {
  switch (view.status) {
    case 'starting':
    case 'measuring':
      return null // 빈 줄 — 슬롯 높이는 유지
    case 'insecure':
      return 'HTTPS에서만 측정할 수 있습니다' // 권한 문구와 혼용 금지 (REQ-ST-002)
    case 'awaiting-gesture':
      return '탭하여 측정을 시작하세요' // 오류 어휘 금지 — 중립 톤 (M-1)
    case 'weak-signal':
      return '신호가 약합니다. 모터에 더 가까이 대세요'
    case 'no-permission':
      return view.permanent
        ? '브라우저 설정에서 마이크 권한을 허용해야 합니다'
        : '마이크 권한이 거부되었습니다'
    case 'suspended':
      return 'iOS 정책으로 오디오가 중지되었습니다'
  }
}

// 내부 행 슬롯 높이 (rem/clamp — 200% text resize 시 비례 확장, layout-spec §10).
// v3: rpmValue 상향 동조 재클램프(DS-A16) — 파노 주지표가 rpmValue 토큰을 쓴다(M-4 역전).
const ROW_HEIGHTS = {
  pano: 'clamp(4rem, 22vw, 7.5rem)', // numericTypography.rpmValue fontSize × lineHeight 1
  unit: '1.5rem',
  rpm: 'clamp(1.65rem, 8.45vw, 2.3rem)', // fanoValue fontSize × lineHeight 1.3
  message: '1.5rem',
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

/** no-permission 영구 — 설정 경로 Collapse (Z2 내부 스크롤 수용, 존 높이 불변 — §2.2) */
function PermanentPermissionHelp({open, color}: {open: boolean; color: string}) {
  return (
    <Collapse in={open}>
      <Box id={S1_SETTINGS_HELP_ID} sx={{color, pb: 1}}>
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
  )
}

/**
 * S1 Z2 히어로 존 v2 (component-spec §2.5 / DS v3 §9.4 "계기판 한 장") —
 * 높이 고정 소유: `layoutTokens.measureValueMinHeight`(v3 재클램프), view 8종 전부 동일 —
 * 상태 전환으로 어떤 요소도 이동하지 않는다(layout-spec §4.1). 재계산은 resize/회전 시에만.
 *
 * - 히어로 프레임: 1px hairlineStrong 베젤 링(radius 4, 다크 — 라이트는 divider) + 상태 bg
 *   (`--mml-status-*-bg`) + `--mml-hero-vignette` overlay(absolute·aria-hidden·pointer-events none).
 * - 내부(위→아래 시각 구성): PanoGauge(장식 배경층, aria-hidden) → 파노 대형 수치(BigNumber
 *   size="rpm" — M-4 주/보조 역전, formatPanoValue) → 단위 overline "Hz" → rpm 보조(fanoValue
 *   스케일) → 문구 슬롯 1줄(없으면 빈 줄 유지).
 * - measuring: 연속 갱신 — 잠금·tint 전환 없음(stable UI 소멸, M-3). `isStable`은 렌더에
 *   관여하지 않는다(내부 신호 — view 계약 주석 참조).
 * - 토큰 소비: bg·valueFg만 — measureStatusTokens 소비자는 본 컴포넌트+MeasureStatusLabel 2곳.
 * - aria-live 없음 — 수치 갱신(≥10Hz) announce 금지(§2.6, 알림은 Z1 단일 채널).
 */
export function MeasureFigures({view}: MeasureFiguresProps) {
  const visual = measureStatusTokens[statusTokenKey(view)]
  const measuring = view.status === 'measuring'
  const scrollable = view.status === 'no-permission' && view.permanent
  const message = messageFor(view)
  return (
    <Box
      sx={theme => ({
        '--s1-figure-h': layoutTokens.measureValueMinHeight,
        height: 'var(--s1-figure-h)',
        minHeight: 'var(--s1-figure-h)',
        maxHeight: 'var(--s1-figure-h)',
        backgroundColor: visual.bg,
        // 히어로 베젤 링 — 장식(대비 요건 비대상). 라이트는 divider 헤어라인으로 대체(DS §1.2 주석)
        border: `1px solid ${(theme.vars ?? theme).palette.divider}`,
        ...theme.applyStyles('dark', {borderColor: darkColor.hairlineStrong}),
        borderRadius: '4px',
        position: 'relative',
        overflow: 'hidden',
      })}>
      {/* 파노 게이지 배경층 — 장식(aria-hidden), viewBox 고정이라 존 스케일에만 따라간다 */}
      <Box aria-hidden="true" sx={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <PanoGauge panoHz={measuring ? view.panoHz : null} />
      </Box>
      {/* 비네트 overlay — 장식(aria-hidden), 라이트 모드는 var가 none (DS §9.4) */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'var(--mml-hero-vignette)',
          zIndex: 2,
        }}
      />
      {/* 전경 콘텐츠층 — 스크린리더 canonical 수치 경로 (BigNumber 텍스트 노드) */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          // 영구 권한 안내(Collapse)가 열리면 위에서부터 흘러 내부 스크롤 (존 높이 불변 — §2.2)
          justifyContent: scrollable ? 'flex-start' : 'center',
          overflowY: scrollable ? 'auto' : 'hidden',
          px: 2,
        }}>
        <Row height={ROW_HEIGHTS.pano}>
          {/* 파노 주지표 — weak-signal 등 값 없음은 "—"(동일 rpmValue 타이포) + sr "측정값 없음" */}
          <BigNumber
            size="rpm"
            value={measuring ? formatPanoValue(view.panoHz) : null}
            valueColor={visual.valueFg}
          />
        </Row>
        <Row height={ROW_HEIGHTS.unit}>
          {measuring && (
            <Typography variant="overline" sx={{lineHeight: 1, color: 'text.secondary'}}>
              Hz
            </Typography>
          )}
        </Row>
        <Row height={ROW_HEIGHTS.rpm}>
          {measuring ? (
            <BigNumber size="fano" value={formatRpm(view.rpm)} unit="rpm" valueColor={visual.valueFg} />
          ) : (
            // rpm 보조 행도 "—" (§2.5) — sr 중복 방지: sr-only는 주지표 BigNumber가 1회 담당
            <Typography aria-hidden="true" sx={{color: visual.valueFg}}>
              {EM_DASH}
            </Typography>
          )}
        </Row>
        <Row height={ROW_HEIGHTS.message}>
          {message !== null && (
            <Typography
              variant="body2"
              sx={{
                color: visual.valueFg,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
              {message}
            </Typography>
          )}
        </Row>
        {scrollable && (
          <PermanentPermissionHelp open={view.settingsHelpOpen} color={visual.valueFg} />
        )}
      </Box>
    </Box>
  )
}
