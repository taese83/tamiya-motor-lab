# 파노(기본 주파수)·RPM 측정 알고리즘 사양 v2

작성: web-orchestrator. v1(comb scoring 단독)을 사용자 제안 파이프라인(pYIN → 고조파 점수 → variable projection → 추적)으로 대체·병합.
지위: Phase 1 requirements와 Phase 2 설계의 canonical 입력. 파라미터는 구현 중 측정 근거로만 조정 가능.

## 0. 신호 모델

- 대상: 130 브러시드 3극(3-slot, 2-brush) DC 모터, 무부하 공회전, 근접 측정.
- 회전 기본 주파수 f₀ = RPM/60 ≈ 170~620 Hz 탐색 대역 (≈ 10,000~37,000 RPM).
- 방사 소음: 회전 기본파 f₀와 배음 + 정류 성분 3·f₀, 6·f₀(지배적인 경우 많음) + 광대역 소음.
- **핵심 위험**: 최강 스펙트럼 성분이 3f₀/6f₀인 경우가 흔해 단순 max-bin은 RPM을 3·6배로 오판한다. 전 단계가 이 모호성 해소를 중심으로 설계됨.

## 1. 파이프라인 (사용자 제안 기반, 조정 사항 별표)

```
48 kHz 마이크 (echoCancellation/noiseSuppression/autoGainControl 모두 off, AudioWorklet 수집)
  ↓
대역통과 필터 120 Hz ~ 5 kHz (Butterworth IIR) 후 12 kHz로 데시메이션*   ← CPU 4× 절감, 6f₀max=3.7kHz < Nyquist
  ↓
200 ms 프레임 / 25 ms hop*                                            ← 10ms→25ms: 준정상 신호에 100Hz 갱신은 이득 없음
  ↓
pYIN 후보 추출: CMNDF 임계 분포로 상위 3~5 후보 + 확률
  · lag 탐색을 f₀ ∈ [170, 620] Hz 대역으로 제한
  · 강한 dip이 3f₀/6f₀에 맺히는 경우를 위해 후보 ÷3, ÷6 확장 포함*
  ↓
교정된 1·3·6차 고조파 점수: 각 후보 f에 대해 k∈{1,3,6} 위치의 log-magnitude
  가중 합산 − 비고조파 노이즈 플로어 페널티 (가중치는 물리 기반 고정값으로 시작,
  모터별 캘리브레이션 프로필은 후속 확장*)
  ↓
다중 고조파 variable-projection 정밀 추정: s(t)=Σₖ aₖcos(2πkf₀t)+bₖsin(2πkf₀t),
  k∈{1,3,6}. 선형 계수를 투영 소거하고 f₀ 1차원 잔차 최소화(golden-section,
  comb 승자 ±1 bin 범위) → CRLB 근접 정밀도, 서브 0.1 Hz
  ↓
고조파별 일치도 검사: 각 고조파 국소 피크/k가 f₀와 ±0.5% 내 일치하는지 확인,
  불일치 고조파(공진·환경음 오염)는 VP 재추정에서 제외
  ↓
신뢰 게이트*: 고조파 SNR ≥ 8 dB & 검출 고조파 ≥ 2 & pYIN voicing 확률 임계
  미달 시 수치 미표시, `weak-signal` 상태 반환 (오값 표시 금지)
  ↓
추적: 후보 격자 fixed-lag Viterbi(lag 5 프레임, 옥타브/고조파 점프 전이 페널티)
  → 상태 [f₀, ḟ₀] 상수속도 Kalman으로 표시값 평활*                    ← 둘의 역할 분리: Viterbi=이산 모호성, Kalman=연속 평활
  ↓
안정 판정: 최근 1.5 s 창 변동계수 < 1.5% → 중앙값을 확정값으로 잠금
  ↓
출력: 파노 = f₀ (Hz, 소수 1자리), RPM = f₀ × 60 (정수), confidence(0~1), status
```

status: `idle · measuring · stable · weak-signal · no-permission · suspended`

## 2. 캡처 계약

- `getUserMedia({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:1 } })` — 음성용 DSP가 배음을 제거하므로 필수.
- 실제 `AudioContext.sampleRate`를 읽어 모든 계산에 반영 (48 kHz 가정 금지).
- iOS: 사용자 탭 핸들러 내 `resume()`, `state !== 'running'`이면 측정 시작 금지.
- 분석 전체는 Web Worker에서 수행. 메인 스레드는 상태·수치 표시만.

## 3. 검증 fixture (합성 신호 — Vitest 단위 테스트)

| Fixture | 구성 | 합격 기준 |
|---|---|---|
| 순음 | 300 Hz 사인 | f₀ 오차 < 0.3 Hz |
| 배음 지배 | 약한 300 Hz + 강한 900/1800 Hz | f₀=300 채택 (3·6배 오판 금지) |
| 고조파 오염 | 배음 세트 + 1805 Hz 독립 톤 | 일치도 검사가 6차 제외, f₀ 유지 |
| 잡음 SNR 10 dB | 배음 세트 + pink noise | f₀ 오차 < 0.5 Hz, 게이트 통과 |
| 잡음 SNR 0 dB | 동일 | `weak-signal` (오값 표시 금지) |
| 무음 | 진폭 0 | `weak-signal`, 0 RPM 표시 금지 |
| 스핀업 chirp | 200→500 Hz / 2 s | 추적 지연 < 0.5 s, Viterbi 점프 오작동 없음 |
| 옥타브 유혹 | f₀와 2f₀ 진폭 반전 교차 | 추적 출력에 옥타브 점프 없음 |

VP 정밀도는 CRLB 대비 sanity 테스트(순음+백색잡음, 이론 분산의 3배 이내)로 확인.

## 4. 성능 예산

- 12 kHz 데시메이션 기준 프레임 2400 샘플: CMNDF O(N·maxLag≈70) + VP(계수 6개 LS × ~20 평가) + FFT 4096 zero-pad — 25 ms hop(40 Hz)에서 모바일 1코어 점유 20% 미만 목표.
- UI 업데이트 ≥ 10 Hz, 측정 시작→확정 3 s 이내.
- 10 ms hop은 성능 검증 후 선택 가능한 고급 옵션으로 남긴다 (기본 25 ms).

## 5. 구현 노트

- pYIN·VP·Viterbi는 외부 의존성 없이 직접 구현 (품질 보장된 JS 라이브러리 부재). 각 단계는 순수 함수로 분리해 fixture 단위 테스트.
- 분석 엔진은 `estimateFrame(pcm) → candidates`, `refine(candidate) → f₀`, `track(estimates) → display` 인터페이스로 계층화 — 단계별 교체·검증 가능.
- 상대 노력도 영향: 분석 엔진이 프로젝트 최대 작업 항목 (v1 대비 상승). 측정 품질이 제품 핵심이므로 정당.
