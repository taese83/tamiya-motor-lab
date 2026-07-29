// v2: ResultSegment(주행 결과 3택)·GradeSegment(등급 4택)는 도메인과 함께 제거 —
// 도메인 세그먼트는 각 feature가 generic SegmentControl로 조립한다.
export {SegmentControl} from './SegmentControl'
export type {SegmentControlProps, SegmentOption} from './SegmentControl'
