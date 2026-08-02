import {Box, Typography} from '@mui/material'
import {layoutTokens, measureStatusTokens} from '@shared/config/design-tokens'
import {formatPanoValue, formatRpm} from '@shared/lib/format'
import {BigNumber} from '@shared/ui/big-number'
import type {ReactNode} from 'react'
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
      // R45(사용자): "더 가까이 대주세요"를 제거하고 안정도 하단 **신호 세기 미터**로 통일한다
      // (Z1 "신호 약함"과 이중 표시였음). 게이지 dim + "—"가 약신호를 전달하고, 세기·유도는 미터가 담당.
      return null
    case 'no-permission':
      return view.permanent
        ? '브라우저 설정에서 마이크 권한을 허용해야 합니다'
        : '마이크 권한이 거부되었습니다'
    case 'suspended':
      return 'iOS 정책으로 오디오가 중지되었습니다'
  }
}

// 내부 행 슬롯 높이 (rem/clamp — 200% text resize 시 비례 확장, layout-spec §10).
// v2.25: 게이지는 **크게(존 전체 오버레이) 유지**(사용자). 수치가 게이지를 덮던 원인은
// 파노가 rpmValue(최대 120px)로 **너무 커서** 아크 위로 넘친 것이었다 → guideValue(최대 56px)로
// 축소하면 눈금 라벨이 이미 아크 바깥(v2.21)이라 비어 있는 아크 내부에 들어앉는다. 색은 메인 라임.
const ROW_HEIGHTS = {
  pano: 'clamp(2.6rem, 13vw, 3.6rem)', // numericTypography.guideRange(clamp 40~56px) × lineHeight
  unit: '1.25rem',
  rpm: 'clamp(1.65rem, 8.45vw, 2.3rem)', // fanoValue fontSize × lineHeight 1.3
  message: '1.5rem',
} as const

// offsetY: 이 행만 추가로 아래로 내린다(transform이라 다른 행 레이아웃엔 무영향).
// v2.28: rpm을 바늘 축(hub)보다 더 아래로 — 파노/Hz는 그대로 두고 rpm 행만 이동(사용자).
function Row({height, children, offsetY}: {height: string; children?: ReactNode; offsetY?: string}) {
  return (
    <Box
      sx={{
        height,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(offsetY !== undefined && {transform: `translateY(${offsetY})`}),
      }}>
      {children}
    </Box>
  )
}

/**
 * S1 Z2 히어로 존 v2 (component-spec §2.5 / DS v3 §9.4 "계기판 한 장") —
 * 높이 고정 소유: `layoutTokens.measureValueMinHeight`(v3 재클램프), view 8종 전부 동일 —
 * 상태 전환으로 어떤 요소도 이동하지 않는다(layout-spec §4.1). 재계산은 resize/회전 시에만.
 *
 * - v2.25(사용자): 프레임 박스(bg·border·radius) 제거 + 게이지 full-bleed 확대. 게이지는
 *   full-bleed 오버레이(장식·aria-hidden), 그 위 중앙에 파노 주지표(size="guide", 메인 라임색) →
 *   "Hz" → rpm 보조(fanoValue, 중립색) → 문구 슬롯. 파노를 rpm(120px)→guide(56px)로 축소하고
 *   눈금 라벨이 아크 바깥(v2.21)이라, 수치가 게이지를 덮지 않는다(req1).
 * - measuring: 연속 갱신 — 잠금·tint 전환 없음(stable UI 소멸, M-3). `isStable`은 렌더에
 *   관여하지 않는다(내부 신호 — view 계약 주석 참조).
 * - 토큰 소비: bg·valueFg만 — measureStatusTokens 소비자는 본 컴포넌트+MeasureStatusLabel 2곳.
 * - aria-live 없음 — 수치 갱신(≥10Hz) announce 금지(§2.6, 알림은 Z1 단일 채널).
 */
export function MeasureFigures({view}: MeasureFiguresProps) {
  const visual = measureStatusTokens[statusTokenKey(view)]
  const measuring = view.status === 'measuring'
  const message = messageFor(view)
  return (
    // v2.25(사용자): 게이지 주변 박스 배경·테두리 제거 + 화면 폭까지 full-bleed로 확대.
    // mx:-2로 페이지 좌우 padding(px:2)을 상쇄해 게이지를 좌우 끝까지 키운다(더 크게).
    // 프레임 bg/border/radius 없음 — 게이지가 페이지 배경 위에 그대로 놓인다.
    <Box
      sx={{
        '--s1-figure-h': layoutTokens.measureValueMinHeight,
        height: 'var(--s1-figure-h)',
        minHeight: 'var(--s1-figure-h)',
        maxHeight: 'var(--s1-figure-h)',
        mx: -2,
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* 파노 게이지 — 장식(aria-hidden). full-bleed 오버레이(존 전체를 채워 크게 — 사용자 req) */}
      <Box aria-hidden="true" sx={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <PanoGauge panoHz={measuring ? view.panoHz : null} />
      </Box>
      {/* 수치 오버레이 — 게이지 위 중앙. 눈금 라벨이 아크 바깥(v2.21)이라 내부가 비어 겹치지 않는다.
          파노는 축소(guide)해 아크를 넘지 않고, canonical 텍스트는 BigNumber(스크린리더 경로).
          v2.28(사용자): 중앙 정렬 스택을 아래로 내려 파노를 아크 내부 중앙에, rpm을 **바늘 축(hub)**에
          맞춘다. hub는 게이지 viewBox상 존 높이의 0.711 지점(=존 h × 0.111만큼 아래로 이동하면
          rpm 중앙이 hub에 안착). 이동량을 존 높이 clamp(200~272px, 60vw)에 비례하도록 clamp로 둬
          뷰포트가 바뀌어도 rpm이 hub에 유지되게 한다(60vw×0.111≈6.6vw). 모든 view 동일 이동 —
          상태 전환 layout-shift 0 유지. */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'translateY(clamp(22px, 6.6vw, 30px))',
          overflowY: 'hidden',
        }}>
        <Row height={ROW_HEIGHTS.pano}>
          {/* 파노 주지표 — 메인 색(라임 visual.fg, 사용자 req). 값 없음은 "—" + sr "측정값 없음" */}
          <BigNumber
            size="guide"
            value={measuring ? formatPanoValue(view.panoHz) : null}
            valueColor={visual.fg}
          />
        </Row>
        <Row height={ROW_HEIGHTS.unit}>
          {measuring && (
            <Typography variant="overline" sx={{lineHeight: 1, color: 'text.secondary'}}>
              Hz
            </Typography>
          )}
        </Row>
        {/* v2.28(사용자): rpm을 바늘 축(hub)보다 더 아래로 — 파노/Hz는 그대로, rpm 행만 이동. */}
        <Row height={ROW_HEIGHTS.rpm} offsetY="clamp(44px, 12vw, 56px)">
          {measuring ? (
            // rpm 보조 — 고대비 중립색(text.primary). 파노=라임과 위계 구분
            <BigNumber
              size="fano"
              value={formatRpm(view.rpm)}
              unit="rpm"
              valueColor="text.primary"
            />
          ) : (
            // rpm 보조 행도 "—" (§2.5) — sr 중복 방지: sr-only는 주지표 BigNumber가 1회 담당
            <Typography aria-hidden="true" sx={{color: 'text.secondary'}}>
              {EM_DASH}
            </Typography>
          )}
        </Row>
        {/* 문구 슬롯 — 오류·안내 문구만(변동률은 v2.x부터 별도 StabilityGauge 소관). */}
        <Row height={ROW_HEIGHTS.message}>
          {message !== null && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
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
      </Box>
    </Box>
  )
}
